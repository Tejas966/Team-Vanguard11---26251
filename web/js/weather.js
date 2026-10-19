/* Weather layer: real Open-Meteo data -> post temperature, POL demand and flyable days.
   Uses the forecast when it covers the date, otherwise the 2023-2026 climatology for that calendar day. */
(function () {
  const W = FSI.WEATHER, RULE = FSI.POL_RULE, FLY = FSI.FLY_RULE, DAY = 86400000;
  const byId = Object.fromEntries(W.cells.map(c => [c.id, c]));
  const isoLocal = d => { const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return z.toISOString().slice(0, 10); };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dayIndex = (t0, d) => Math.round((new Date(isoLocal(new Date(today.getTime() + d * DAY)) + 'T00:00').getTime() - new Date(t0 + 'T00:00').getTime()) / DAY);

  // climatology: mean of the same calendar day (+/-3 days) across all years in the archive
  const climCache = {};
  function clim(cell, key, d) {
    const target = new Date(today.getTime() + d * DAY), md = (target.getMonth() + 1) * 100 + target.getDate(), ck = cell.id + key + md;
    if (ck in climCache) return climCache[ck];
    const h = cell.hist, t0 = new Date(h.t0 + 'T00:00'), vals = [];
    h[key].forEach((v, i) => { if (v == null) return; const dt = new Date(t0.getTime() + i * DAY); const diff = Math.abs(dt.getMonth() * 31 + dt.getDate() - (target.getMonth() * 31 + target.getDate())); if (diff <= 3 || diff >= 369) vals.push(v); });
    return (climCache[ck] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null);
  }
  // value for a cell on day offset d (0 = today); source tells the UI where it came from
  function get(cellId, key, d) {
    const c = byId[cellId], i = dayIndex(c.fc.t0, d);
    // demo control: a clearly labelled simulated storm overrides the real values
    const sm = FSI.state && FSI.state.wxStorm;
    if (sm && sm.cell === cellId && d >= sm.from && d <= sm.to) {
      const base = c.fc[key] && i >= 0 && i < c.fc[key].length ? c.fc[key][i] : clim(c, key, d);
      return { v: { snow: 25, prcp: 18, wind: 55, tmin: (base == null ? -10 : base) - 6, tmax: (base == null ? -2 : base) - 6 }[key], src: 'simulated' };
    }
    if (c.fc[key] && i >= 0 && i < c.fc[key].length && c.fc[key][i] != null) return { v: c.fc[key][i], src: 'forecast' };
    if (key === 'wind') return { v: null, src: 'none' };
    return { v: clim(c, key, d), src: 'climatology' };
  }
  const postTemp = (n, d) => { const c = byId[n.cell]; return get(n.cell, 'tmin', d).v - RULE.lapse * (n.alt * 0.3048 - c.elev) / 1000; };
  const polPerPerson = T => Math.min(RULE.cap, RULE.base + RULE.slope * Math.max(0, RULE.ref - T));
  // average SKO litres per person per day over the next `days` days
  function polRate(n, days) {
    days = days || FSI.CONFIG.horizon; let s = 0;
    for (let d = 0; d < days; d++) s += polPerPerson(postTemp(n, d));
    return s / days;
  }
  function flyable(cellId, d) {
    const sn = get(cellId, 'snow', d), pr = get(cellId, 'prcp', d), wi = get(cellId, 'wind', d);
    const ok = (sn.v == null || sn.v < FLY.snow) && (pr.v == null || pr.v < FLY.prcp) && (wi.v == null || wi.v < FLY.wind);
    return { ok, src: sn.src, snow: sn.v, prcp: pr.v, wind: wi.v };
  }
  function coverage() { // how many of the next 14 days the forecast covers
    const c = W.cells[0]; let n = 0; for (let d = 0; d < FSI.CONFIG.horizon; d++) { const i = dayIndex(c.fc.t0, d); if (i >= 0 && i < c.fc.tmin.length) n++; } return n;
  }
  function winters() { // per winter (Oct-May): total snow, first week with >=10 cm, coldest night
    return W.cells.map(c => {
      const h = c.hist, t0 = new Date(h.t0 + 'T00:00'), out = [];
      for (let y = t0.getFullYear(); y < 2026; y++) {
        let tot = 0, first = null, cold = Infinity, win = [];
        h.snow.forEach((v, i) => {
          const dt = new Date(t0.getTime() + i * DAY); if (dt < new Date(y, 9, 1) || dt >= new Date(y + 1, 5, 1)) return;
          tot += v || 0; win.push(v || 0); if (win.length > 7) win.shift();
          if (!first && win.reduce((a, b) => a + b, 0) >= 10) first = dt;
          const tm = h.tmin[i]; if (tm != null && tm < cold) cold = tm;
        });
        if (Number.isFinite(cold)) out.push({ y, tot, first, cold });
      }
      return { cell: c, rows: out };
    });
  }
  FSI.wx = { byId, get, postTemp, polPerPerson, polRate, flyable, coverage, winters, live: false, liveAt: null };

  // Try to refresh the forecast live (Open-Meteo allows browser requests). Silent fallback to the snapshot.
  FSI.wx.refresh = function (done) {
    const q = W.query, url = `${q.forecast}?latitude=${q.lat.join(',')}&longitude=${q.lon.join(',')}&daily=temperature_2m_min,temperature_2m_max,snowfall_sum,precipitation_sum,wind_speed_10m_max&forecast_days=16&timezone=${encodeURIComponent(q.timezone)}`;
    if (!window.fetch || location.protocol === 'file:' && !navigator.onLine) return;
    const ctl = window.AbortController ? new AbortController() : null, timer = setTimeout(() => ctl && ctl.abort(), 6000);
    fetch(url, ctl ? { signal: ctl.signal } : {}).then(r => r.ok ? r.json() : Promise.reject(r.status)).then(js => {
      clearTimeout(timer); if (!Array.isArray(js) || js.length !== W.cells.length) return;
      js.forEach((c, i) => { const d = c.daily, r = a => a.map(x => x == null ? null : Math.round(x * 10) / 10);
        W.cells[i].fc = { t0: d.time[0], tmin: r(d.temperature_2m_min), tmax: r(d.temperature_2m_max), snow: r(d.snowfall_sum), prcp: r(d.precipitation_sum), wind: r(d.wind_speed_10m_max) }; });
      FSI.wx.live = true; FSI.wx.liveAt = new Date(); done && done();
    }).catch(() => clearTimeout(timer));
  };
})();

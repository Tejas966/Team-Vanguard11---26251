/* Weather view + small weather panels reused on Overview and Winter. Real data: Open-Meteo (CC BY 4.0). */
(function () {
  const E = FSI.engine, ui = FSI.ui, wx = FSI.wx, W = FSI.WEATHER, { fmt, esc } = ui, H = FSI.CONFIG.horizon;
  const V = FSI.views;
  const cellOf = id => wx.byId[id];
  const dayLbl = d => ui.dayDate(d).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' });

  function sourceLine() {
    const cov = wx.coverage();
    return wx.live ? ui.tag('green', '●', 'LIVE FORECAST') + ` fetched ${wx.liveAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}`
      : cov >= H ? ui.tag('blue', 'i', 'CACHED FORECAST') + ` snapshot ${W.fetched.replace('T', ' ')}`
        : ui.tag('amber', '!', 'PARTLY CLIMATOLOGY') + ` forecast covers ${cov} of ${H} days; the rest uses the 2023–2026 average`;
  }
  // summary used by the overview strip
  FSI.weatherSummary = () => {
    const posts = E.POSTS.map(n => { let t = 0; for (let d = 0; d < 7; d++) t += wx.postTemp(n, d); t /= 7; return { n, t, pol: wx.polPerPerson(t) }; });
    const coldest = posts.reduce((a, b) => b.t < a.t ? b : a);
    const noFly = W.cells.map(c => ({ c, days: [...Array(7).keys()].map(i => i + 1).filter(d => !wx.flyable(c.id, d).ok) }));
    const snow = W.cells.map(c => ({ c, cm: [...Array(7).keys()].reduce((a, d) => a + (wx.get(c.id, 'snow', d).v || 0), 0) }));
    return { posts, coldest, noFly, snow };
  };
  FSI.weatherStrip = () => {
    const s = FSI.weatherSummary();
    return `<div class="panel" style="margin-bottom:12px"><div class="ph"><h3>Real weather · next 7 days</h3><span class="hint">${sourceLine()} · <a href="#/weather">details →</a></span></div>
      <div class="pb" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px 18px;font-size:13px">
        <div><b>Coldest post:</b> ${esc(s.coldest.n.name)} about <b>${fmt(s.coldest.t, 0)} °C</b> at night, so SKO need is ${fmt(s.coldest.pol, 1)} L per person per day</div>
        <div><b>Snow forecast:</b> ${s.snow.map(x => `${x.c.id} ${fmt(x.cm, 1)} cm`).join(' · ')}</div>
        <div><b>Not flyable for air maintenance:</b> ${s.noFly.map(x => `${x.c.id} ${x.days.length ? x.days.map(d => dayLbl(d).split(',')[0]).join(', ') : 'none'}`).join(' · ')}</div>
      </div></div>`;
  };
  FSI.snowHistoryPanel = () => {
    const w = wx.winters();
    return `<div class="panel" style="margin-top:12px"><div class="ph"><h3>Snow history · real data</h3><span class="hint">Open-Meteo ERA5 archive · Oct–May each winter</span></div><div class="pb scroll" style="padding-top:0">
      <table class="t"><thead><tr><th>Cell</th>${w[0].rows.map(r => `<th>Winter ${r.y}–${String(r.y + 1).slice(2)}</th>`).join('')}</tr></thead><tbody>
      ${w.map(x => `<tr><td><b>${x.cell.id}</b> ${esc(x.cell.label)}<br><span style="font-size:11.5px;color:var(--muted)">${fmt(x.cell.elev)} m</span></td>${x.rows.map(r => `<td style="font-size:12.5px">First week ≥ 10 cm: <b>${r.first ? r.first.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'none'}</b><br>Total snow ${fmt(r.tot)} cm · coldest night ${fmt(r.cold, 0)} °C</td>`).join('')}</tr>`).join('')}
      </tbody></table><p class="note">The first heavy snow moved by up to four months between winters. That is why the plan uses the <b>early</b> closure estimate. Real pass-closure dates are not used: we do not model any real route.</p></div></div>`;
  };

  V.weather = (root, st) => {
    const sel = st.wxCell || 'W1', c = cellOf(sel);
    const jan = id => { const cl = wx.byId[id]; const t0 = new Date(cl.hist.t0 + 'T00:00'); const v = cl.hist.tmin.filter((x, i) => x != null && new Date(t0.getTime() + i * 86400000).getMonth() === 0); return v.reduce((a, b) => a + b, 0) / v.length; };
    root.innerHTML = `
      <p class="intro">This is the one layer of <b>real data</b> in the prototype. Daily temperature, snow, rain and wind for three public grid points in the western Himalaya come from <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a>, which provides ERA5 reanalysis since 2023 and a 16-day forecast. Weather drives two things: <b>how much SKO each post burns</b>, and <b>which days air maintenance can fly</b>. The points are civilian grid points and are not linked to any military site.</p>
      <div class="panel" style="margin-bottom:12px"><div class="pb" style="display:flex;flex-wrap:wrap;gap:8px 18px;align-items:center;font-size:13px">${sourceLine()}
        <button type="button" class="btn sm" id="wxRefresh">Fetch latest forecast</button>
        <label class="check" style="margin-left:auto"><input type="checkbox" id="wxStorm" ${st.wxStorm ? 'checked' : ''}> <span><b>Demo: simulate a snowstorm</b> at W3 from day 1 to day 4 (25 cm/day, wind 55 km/h, 6 °C colder). <span class="est">SIMULATED</span></span></label><span class="note" style="margin:0">Data © Open-Meteo.com, CC BY 4.0 (free non-commercial tier).</span></div></div>
      <div class="panel"><div class="ph"><h3>Weather drives SKO demand</h3><span class="est">RULE ANCHORED ON PUBLIC FIGURES</span></div><div class="pb scroll" style="padding-top:0">
        <table class="t"><thead><tr><th>Post</th><th>Cell</th><th class="n">Altitude</th><th class="n">Night temp, next 7 d</th><th class="n">SKO L/person/day</th><th class="n">SKO L/day now</th><th class="n">Mid-January equivalent</th></tr></thead><tbody>
        ${E.POSTS.map(n => { let t = 0; for (let d = 0; d < 7; d++) t += wx.postTemp(n, d); t /= 7; const p = wx.polPerPerson(t);
          const tj = jan(n.cell) - FSI.POL_RULE.lapse * (n.alt * 0.3048 - cellOf(n.cell).elev) / 1000, pj = wx.polPerPerson(tj);
          return `<tr><td><b>${n.name}</b></td><td>${n.cell}</td><td class="n">${fmt(n.alt)} ft</td><td class="n">${fmt(t, 1)} °C</td><td class="n">${fmt(p, 2)}</td><td class="n">${fmt(p * n.troops)}</td><td class="n">${fmt(pj * n.troops)} L/day <span style="color:var(--muted)">(${fmt(tj, 0)} °C, ×${fmt(pj / p, 1)})</span></td></tr>`; }).join('')}
        </tbody></table><p class="note">Night temperature at the post = cell minimum − 6.5 °C per km of extra altitude. The January column shows why stock must go up before the pass closes: demand rises as it gets colder.</p></div></div>
      <div class="panel" style="margin-top:12px"><div class="ph"><h3>16-day forecast</h3>
        <div class="itabs" role="tablist" style="margin:0 0 0 auto">${W.cells.map(x => `<button type="button" role="tab" aria-selected="${x.id === sel}" data-c="${x.id}">${x.id} · ${esc(x.label)}</button>`).join('')}</div></div>
        <div class="pb scroll" style="padding-top:0"><table class="t"><thead><tr><th>Day</th><th class="n">Min °C</th><th class="n">Max °C</th><th class="n">Snow cm</th><th class="n">Rain mm</th><th class="n">Wind km/h</th><th>Air maintenance</th></tr></thead><tbody>
        ${[...Array(16).keys()].map(d => { const f = wx.flyable(sel, d), g = k => wx.get(sel, k, d);
          return `<tr><td>${d ? dayLbl(d) : 'Today'}${f.src === 'simulated' ? ' <span class="est">SIMULATED</span>' : f.src !== 'forecast' ? ' <span class="est">AVG</span>' : ''}</td><td class="n">${fmt(g('tmin').v, 1)}</td><td class="n">${fmt(g('tmax').v, 1)}</td><td class="n">${fmt(g('snow').v, 1)}</td><td class="n">${fmt(g('prcp').v, 1)}</td><td class="n">${f.wind == null ? '—' : fmt(f.wind, 0)}</td>
            <td>${f.ok ? ui.tag('green', '✓', 'FLYABLE') : ui.tag('red', '✕', 'NOT FLYABLE')}</td></tr>`; }).join('')}
        </tbody></table><p class="note">${esc(c.label)}: grid point ${c.lat}°N ${c.lon}°E, model elevation ${fmt(c.elev)} m. The flyable rule (snow &lt; 1 cm, rain &lt; 2 mm, wind &lt; 40 km/h) is ours. Real flying also depends on cloud, visibility and aircraft, which we do not model.</p></div></div>
      <div class="panel" style="margin-top:12px"><div class="ph"><h3>Night temperature, Jan 2023 – now · ${sel}</h3><span class="hint">Real ERA5 data</span></div><div class="pb">
        <div class="chart-wrap"><svg class="fluid" id="wxChart" viewBox="0 0 900 220" role="img" aria-label="Daily minimum temperature history"></svg><div class="tip" id="wxTip"></div></div></div></div>
      ${FSI.snowHistoryPanel()}`;
    root.querySelectorAll('[data-c]').forEach(b => b.onclick = () => FSI.set({ wxCell: b.dataset.c }));
    ui.$('#wxStorm').onchange = e => FSI.set({ wxStorm: e.target.checked ? { cell: 'W3', from: 1, to: 4 } : null });
    ui.$('#wxRefresh').onclick = e => { e.target.disabled = true; e.target.textContent = 'Fetching…'; FSI.wx.refresh(() => FSI.set({})); setTimeout(() => { if (!FSI.wx.live) { e.target.disabled = false; e.target.textContent = 'Could not reach Open-Meteo, using cached data'; } }, 7000); };
    // history chart
    const svg = ui.$('#wxChart'), h = c.hist, n = h.tmin.length, Wd = 900, Hh = 220, ml = 40, mr = 10, mt = 10, mb = 24;
    const vals = h.tmin.filter(v => v != null), lo = Math.floor(Math.min(...vals) / 5) * 5, hi = Math.ceil(Math.max(...vals) / 5) * 5;
    const X = i => ml + i / (n - 1) * (Wd - ml - mr), Y = v => mt + (Hh - mt - mb) * (hi - v) / (hi - lo), t0 = new Date(h.t0 + 'T00:00');
    for (let v = lo; v <= hi; v += 5) { ui.svg('line', { x1: ml, x2: Wd - mr, y1: Y(v), y2: Y(v), stroke: v === 0 ? '#9AA6B4' : '#E6EAF0' }, svg); ui.svg('text', { x: ml - 5, y: Y(v) + 4, 'text-anchor': 'end', 'font-size': 10, fill: '#6B7887', 'font-family': 'IBM Plex Mono' }, svg).textContent = v + '°'; }
    h.tmin.forEach((v, i) => { const dt = new Date(t0.getTime() + i * 86400000); if (dt.getDate() === 1 && dt.getMonth() % 3 === 0) { ui.svg('line', { x1: X(i), x2: X(i), y1: Hh - mb, y2: Hh - mb + 4, stroke: '#9AA6B4' }, svg); ui.svg('text', { x: X(i), y: Hh - 6, 'text-anchor': 'middle', 'font-size': 10, fill: '#6B7887', 'font-family': 'IBM Plex Mono' }, svg).textContent = dt.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }); } });
    let d = ''; h.tmin.forEach((v, i) => { if (v != null) d += (d ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1); });
    ui.svg('path', { d, fill: 'none', stroke: '#2A5687', 'stroke-width': 1.2 }, svg);
    const cross = ui.svg('line', { y1: mt, y2: Hh - mb, stroke: '#14202E', opacity: 0 }, svg), hit = ui.svg('rect', { x: ml, y: mt, width: Wd - ml - mr, height: Hh - mt - mb, fill: 'transparent' }, svg), tip = ui.$('#wxTip');
    hit.addEventListener('mousemove', e => { const r = svg.getBoundingClientRect(), i = Math.max(0, Math.min(n - 1, Math.round(((e.clientX - r.left) * Wd / r.width - ml) / (Wd - ml - mr) * (n - 1)))); const dt = new Date(t0.getTime() + i * 86400000);
      cross.setAttribute('x1', X(i)); cross.setAttribute('x2', X(i)); cross.setAttribute('opacity', 0.4); tip.style.display = 'block';
      tip.innerHTML = `${dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}<br>min ${fmt(h.tmin[i], 1)} °C · snow ${fmt(h.snow[i] || 0, 1)} cm`; const px = X(i) * r.width / Wd; tip.style.left = (px > r.width * 0.7 ? px - tip.offsetWidth - 10 : px + 10) + 'px'; tip.style.top = '10px'; });
    hit.addEventListener('mouseleave', () => { tip.style.display = 'none'; cross.setAttribute('opacity', 0); });
  };
})();

/* Calculation engine. Pure functions of (state) -> results, no DOM.
   Every rule here is documented on the Methods page. */
(function () {
  const { ITEMS, NODES, LATERAL, CONFIG } = FSI;
  const BYID = Object.fromEntries(NODES.map(n => [n.id, n]));
  const POSTS = NODES.filter(n => n.type === 'post');
  const H = CONFIG.horizon;
  const kids = id => NODES.filter(n => n.parent === id);

  function subtree(id) {
    const s = new Set([id]), st = [id];
    while (st.length) { const x = st.pop(); kids(x).forEach(k => { s.add(k.id); st.push(k.id); }); }
    return s;
  }
  function phi(x) { // standard normal CDF (Abramowitz–Stegun)
    const t = 1 / (1 + 0.2316419 * Math.abs(x)), d = 0.3989423 * Math.exp(-x * x / 2);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return x > 0 ? 1 - p : p;
  }
  const altMult = a => a < 9000 ? 1 : a < 12000 ? 1.1 : 1.2;

  // Daily use per post: strength x scale x altitude/cold factor. Depot = sum of what it supplies.
  function baseCons(n, it) {
    if (n.type === 'depot') return kids(n.id).reduce((a, k) => a + baseCons(k, it), 0);
    if (it === 'R') return n.troops * 2.5 * altMult(n.alt);
    if (it === 'F') return n.troops * 2.4 * (1 + (n.alt - 10000) / 20000);
    if (it === 'M') return n.troops * 0.02;
    return n.troops * 0.025;
  }
  const ovKey = (id, it) => id + '|' + it;
  function nodeVals(st, n, it) {
    it = it || st.item;
    const o = st.ovr[ovKey(n.id, it)] || {};
    const c0 = baseCons(n, it);
    const c = n.type === 'post' && o.c != null ? o.c : c0;
    const days = n.type === 'depot' ? n.stockDays : n.stock[it];
    return { s: o.s != null ? o.s : days * c0, c, L: o.L != null ? o.L : n.L, q: n.qtyDays * c };
  }
  // Older reports mean we trust the stock figure less.
  function stockSd(st, id) {
    const r = st.reports[id]; if (!r) return 0;
    return CONFIG.fresh.find(f => r.ageH < f.h).sd;
  }
  function freshness(st, id) {
    const r = st.reports[id]; if (!r) return 'none';
    return r.ageH < 24 ? 'fresh' : r.ageH < 72 ? 'ageing' : 'stale';
  }
  // P(stock runs out before day T) under normal demand with stock uncertainty.
  function pStockout(s, c, cv, sSd, T) {
    if (T <= 0) return s <= 0 ? 1 : 0;
    const sd = Math.hypot(cv * c * Math.sqrt(T), sSd * s) || 1e-9;
    return 1 - phi((s - c * T) / sd);
  }
  // Conservative stock-out day: the day by which stock is gone with 10% probability.
  // Solves s - cT - z*sqrt(cv^2 c^2 T + (sSd s)^2) = 0 by bisection.
  function safeDay(s, c, cv, sSd) {
    const z = CONFIG.z90, f = T => s - c * T - z * Math.sqrt(cv * cv * c * c * T + (sSd * s) ** 2);
    if (f(0) <= 0) return 0;
    let lo = 0, hi = s / c; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; f(m) > 0 ? lo = m : hi = m; }
    return lo;
  }

  /* ---- network simulation: one plan under the shared scenario ---- */
  function simulate(st, plan) {
    plan = plan || {};
    const it = st.item, sub = subtree(st.source), R = {};
    NODES.forEach(n => {
      const v = nodeVals(st, n), inS = sub.has(n.id);
      R[n.id] = { n, s: v.s * (inS ? 1 - st.inv / 100 : 1), c: v.c * (inS ? 1 + st.cons / 100 : 1), L: v.L, q: v.q,
        D: 0, F: 1, why: [], rerouted: false, extra: 0, extraWhy: '' };
    });
    const src = R[st.source];
    if (st.delay > 0) { src.D += st.delay; src.why.push(`${src.n.name}'s resupply delayed ${st.delay} d (arrives day ${src.L + st.delay}, was day ${src.L})`); }
    if (st.short > 0) { src.F *= 1 - st.short / 100; src.why.push(`${src.n.name}'s incoming load short by ${st.short}%`); }
    if (st.routeOut) { R.DB.D = Infinity; R.DB.why.push('Route-1 via Pass-1 closed: no road resupply to Depot-B within 14 days'); }
    if (plan.reroute) {
      const db = R.DB, alt = BYID.DB.alt;
      if (db.L + db.D > alt.L) { db.D = alt.L - db.L; db.F = Math.min(db.F, alt.cap); db.rerouted = true;
        db.why.push(`Plan: resupply rerouted via ${alt.route}, arrives day ${alt.L} at ${alt.cap * 100}% load`); }
    }
    // Each depot ships its children's scheduled loads in date order while stock lasts;
    // a load it cannot fill waits for the depot's own (possibly delayed) resupply.
    ['DA', 'DB', 'TH'].forEach(pid => {
      const p = R[pid], A = p.L + p.D, Q = p.q * p.F; let s = p.s, arrived = false; p.queue = [];
      kids(pid).map(k => R[k.id]).map(k => ({ k, t: Math.max(0, k.L - k.n.tr) })).sort((a, b) => a.t - b.t).forEach(({ k, t }) => {
        if (!arrived && A <= t) { s += Q; arrived = true; }
        const need = k.q;
        if (s >= need) { s -= need; p.queue.push({ id: k.n.id, t, ok: true }); return; }
        if (A <= H) {
          if (!arrived) { s += Q; arrived = true; }
          const send = Math.min(need, Math.max(0, s)); s -= send;
          const wait = Math.max(t, A) - t; k.D += wait; k.F *= send / need;
          if (wait > 0) k.why.push(`${p.n.name} could not fill ${k.n.name}'s load on day ${t}; it waits for ${p.n.name}'s resupply (day ${A}), so delivery moves to day ${k.L + k.D} (was day ${k.L})`);
          if (send < need) k.why.push(`${k.n.name} receives only ${Math.round(send / need * 100)}% of its load`);
          p.queue.push({ id: k.n.id, t, ok: false, wait });
        } else {
          const send = Math.min(need, Math.max(0, s)); s -= send;
          if (send > 0) { k.F *= send / need; k.why.push(`${p.n.name} sends its last stock: ${k.n.name} gets ${Math.round(send / need * 100)}% of its load and nothing more within 14 days`); }
          else { k.D = Infinity; k.F = 0; k.why.push(`${p.n.name} has no stock and no resupply within 14 days, so ${k.n.name} gets no delivery`); }
          p.queue.push({ id: k.n.id, t, ok: false, wait: Infinity });
        }
      });
      p.endStock = s;
    });
    (plan.extras || []).forEach(x => { const r = R[x.to]; r.extra += x.units; r.extraWhy = (r.extraWhy ? r.extraWhy + '; ' : '') + x.label; if (x.from) R[x.from].s -= x.units; });
    NODES.forEach(n => {
      const r = R[n.id], A = r.L + r.D; r.A = A;
      if (n.type === 'post') {
        const sSd = stockSd(st, n.id), cv = ITEMS[it].cv;
        const s = r.s + (r.extra > 0 && r.s / r.c >= 1 ? r.extra : 0);
        r.sEff = s; r.Y = s / r.c; r.Yc = safeDay(s, r.c, cv, sSd); r.sSd = sSd;
        const T = Math.min(A, H);
        r.short = Math.max(0, T - r.Y);
        r.margin = (!Number.isFinite(A) || A > H) ? r.Y - H : r.Y - A;
        r.cover = Number.isFinite(A) && A <= H ? (Math.max(0, s - r.c * A) + r.q * r.F) / r.c : 0;
        r.P = pStockout(s, r.c, cv, sSd, T);
        if (r.short > 0 || (r.F < 1 && r.cover < 2)) r.risk = 'red';
        else if (r.D > 0 || r.margin < 2 || r.cover < 5 || r.F < 1 || r.P >= 0.2) r.risk = 'amber';
        else r.risk = 'green';
      } else {
        r.lateKids = (r.queue || []).filter(q => !q.ok).length;
        r.risk = r.lateKids > 0 ? 'red' : (r.D > 0 || r.F < 1) ? 'amber' : 'green';
      }
    });
    return R;
  }

  function pathTo(id) { const p = []; let c = BYID[id]; while (c) { p.unshift(c.id); c = c.parent ? BYID[c.parent] : null; } return p; }
  function explain(st, R, id) {
    const parts = []; pathTo(id).forEach(pid => R[pid].why.forEach(w => parts.push(w)));
    const r = R[id], it = ITEMS[st.item];
    if (r.extraWhy) parts.push(r.extraWhy);
    if (r.n.type === 'post') {
      if (r.short > 0) parts.push(`stock lasts ${fmt(r.Y, 1)} d, which is before delivery: estimated shortage ${fmt(r.short, 1)} d (${fmt(r.short * r.c)} ${it.unit})`);
      else if (r.risk === 'amber') {
        if (r.D > 0 && Number.isFinite(r.D)) parts.push(`delivery moves to day ${r.A}; stock (${fmt(r.Y, 1)} d) still holds`);
        if (r.margin < 2) parts.push(`only ${fmt(r.margin, 1)} d of margin before delivery`);
        if (r.cover < 5 && Number.isFinite(r.A)) parts.push(`only ${fmt(r.cover, 1)} d of cover after delivery`);
        if (r.F < 1) parts.push(`load cut to ${Math.round(r.F * 100)}%`);
        if (r.sSd > 0) parts.push(`last report ${st.reports[id].ageH} h old, so the stock figure is uncertain`);
      }
    } else if (r.lateKids > 0) parts.push(`${r.n.name}'s buffer could not cover ${r.lateKids} scheduled dispatch${r.lateKids > 1 ? 'es' : ''}`);
    else if (r.D > 0) parts.push(`${r.n.name}'s buffer absorbed the delay; every dispatch left on time`);
    return parts;
  }

  /* ---- Decision Clock: latest time to act, per option ---- */
  // Options in order of preference (cheapest / least disruptive first).
  function decisionOptions(st, R, id) {
    const r = R[id], n = r.n, p = R[n.parent], it = ITEMS[st.item], opts = [];
    const lat = LATERAL.find(l => l.includes(id));
    if (lat) {
      const o = lat[0] === id ? lat[1] : lat[0], ro = R[o];
      const surplus = ro.s - ro.c * (Math.min(ro.A, H) + 3);
      opts.push({ key: 'lateral', label: `Transfer from ${BYID[o].name}`, lead: 1, cost: CONFIG.cost.transfer,
        ok: ro.risk === 'green' && surplus > r.c * 2, why: ro.risk !== 'green' ? `${BYID[o].name} is at risk itself` : surplus > r.c * 2 ? `surplus ≈ ${fmt(surplus)} ${it.unit}` : 'neighbour has no spare stock' });
    }
    // Depot stock not already committed to on-time scheduled loads
    const free = p.s - (p.queue || []).filter(q => q.ok).reduce((a, q) => a + R[q.id].q, 0);
    const waitDepot = free >= r.q * 0.5 ? 0 : (Number.isFinite(p.A) && p.A <= H ? p.A : null);
    opts.push({ key: 'expedite', label: `Rush convoy from ${p.n.name}`, lead: n.tr + 0.5, earliest: waitDepot || 0, cost: CONFIG.cost.expedite,
      ok: waitDepot != null, why: waitDepot == null ? `${p.n.name} has no free stock and no resupply within 14 days`
        : waitDepot === 0 ? `${n.tr} d on the track plus half a day to load` : `must wait for ${p.n.name}'s resupply (day ${p.A}), then ${n.tr} d on the track` });
    if (n.parent === 'DB') opts.push({ key: 'detour', label: 'Resupply via Route-2 (Pass-2)', lead: BYID.DB.alt.L + n.tr, cost: CONFIG.cost.reroute,
      ok: true, why: `${BYID.DB.alt.L} d to Depot-B at 60% load, plus ${n.tr} d to the post` });
    opts.push({ key: 'air', label: 'Airlift', lead: 1, cost: CONFIG.cost.sortie, ok: true,
      why: `1 d lead, flyable on about ${Math.round(CONFIG.airGo * 100)}% of winter days (assumption)` });
    opts.forEach(o => {
      o.earliest = o.earliest || 0; o.actBy = r.Yc - o.lead;
      if (o.ok && o.actBy < o.earliest) { o.ok = false; o.why += ' — too late to arrive before stock runs out'; }
    });
    return opts;
  }
  function decisionClock(st, item) {
    const s2 = Object.assign({}, st, { item }), R = simulate(s2, {});
    return POSTS.map(n => {
      const r = R[n.id], covered = Number.isFinite(r.A) && r.A <= r.Yc;
      const opts = decisionOptions(s2, R, n.id);
      const viable = opts.filter(o => o.ok && o.actBy > 0);
      const first = viable[0];                         // preferred option still open
      const last = viable.reduce((a, o) => (!a || o.actBy > a.actBy ? o : a), null); // the one open longest
      let status;
      if (covered) status = 'covered';
      else if (!viable.length) status = 'late';
      else status = first.actBy < 1 ? 'now' : first.actBy < 3 ? 'soon' : 'plan';
      return { item, n, r, covered, opts, first, last, status, actBy: covered ? Infinity : first ? first.actBy : 0, R };
    });
  }

  /* ---- plans for the stress test ---- */
  function urgentPosts(R) { return POSTS.map(p => R[p.id]).filter(r => r.risk === 'red').sort((a, b) => (b.n.prio * b.short) - (a.n.prio * a.short) || a.Y - b.Y); }
  function buildPlan(st, kind) {
    const plan = { reroute: false, extras: [], cost: 0, notes: [] }, it = ITEMS[st.item];
    if (kind === 'reroute' || kind === 'combo') {
      const affected = st.routeOut || (st.source === 'DB' && st.delay > BYID.DB.alt.L - BYID.DB.L) || (st.source === 'DA' && st.delay > 0);
      if (affected) { plan.reroute = true; plan.cost += CONFIG.cost.reroute; } else plan.notes.push('Reroute does not help: Route-1 is not the bottleneck here');
    }
    if (kind === 'air' || kind === 'combo') {
      const R0 = simulate(st, { reroute: plan.reroute }), u = urgentPosts(R0);
      u.slice(0, 2).forEach(r => { const units = Math.min(CONFIG.sortieKg / it.kg, 6 * r.c);
        plan.extras.push({ to: r.n.id, units, label: `airlift of ${fmt(units)} ${it.unit} lands day 1` }); plan.cost += CONFIG.cost.sortie; });
      if (!u.length) plan.notes.push('No red posts, so no airlift is needed');
    }
    if (kind === 'realloc') {
      const R0 = simulate(st, {});
      urgentPosts(R0).forEach(r => {
        const lat = LATERAL.find(l => l.includes(r.n.id)); if (!lat) return;
        const o = lat[0] === r.n.id ? lat[1] : lat[0], ro = R0[o]; if (ro.risk === 'red') return;
        const units = Math.max(0, Math.min(ro.s - ro.c * (Math.min(ro.A, H) + 3), r.short * r.c + 2 * r.c));
        if (units > 0) { plan.extras.push({ to: r.n.id, from: o, units, label: `${fmt(units)} ${it.unit} moved from ${BYID[o].name}, arrives day 1` }); plan.cost += CONFIG.cost.transfer; }
      });
      if (!plan.extras.length) plan.notes.push('No permitted lateral link has spare stock next to a red post');
    }
    return plan;
  }
  function metrics(R, cost) {
    const ps = POSTS.map(p => R[p.id]), shortPosts = ps.filter(r => r.short > 0), sumShort = ps.reduce((a, r) => a + r.short, 0);
    const avgArr = ps.map(r => r.extra > 0 ? 1 : Math.min(r.A, H + 1)).reduce((a, b) => a + b, 0) / ps.length;
    return { stockouts: shortPosts.length, sumShort, maxP: Math.max(...ps.map(r => r.P)), avgArr,
      minMargin: Math.min(...ps.map(r => r.margin)), shortUnits: ps.reduce((a, r) => a + r.short * r.c, 0), cost, risk: sumShort + 5 * shortPosts.length };
  }
  const WEIGHTS = { balanced: [0.6, 0.25, 0.15], risk: [0.8, 0.15, 0.05], cost: [0.4, 0.2, 0.4] };
  function score(st, ms) {
    const w = WEIGHTS[st.prio], mx = k => Math.max(...ms.map(m => m[k]), 1e-9);
    const mr = mx('risk'), mt = mx('avgArr'), mc = mx('cost');
    return ms.map(m => { const c = mc > 0 ? m.cost / mc : 0; return { total: w[0] * m.risk / mr + w[1] * m.avgArr / mt + w[2] * c }; });
  }
  function decide(st, a, b) {
    if (a.stockouts !== b.stockouts) return [a.stockouts < b.stockouts ? 'A' : 'B', 'hard rule: fewer posts run short'];
    const [sa, sb] = score(st, [a, b]);
    if (Math.abs(sa.total - sb.total) < 1e-6) return ['A', 'tie, so keep the current schedule (no extra cost)'];
    return [sa.total < sb.total ? 'A' : 'B', 'lower weighted score'];
  }

  /* ---- winter stocking ---- */
  function winterPlan(st) {
    const W = st.winterW, z = st.winterZ, early = CONFIG.winter.p10, rows = [];
    POSTS.filter(n => n.parent === 'DB').forEach(n => {
      let need = 0, have = 0; const by = {};
      Object.keys(ITEMS).forEach(k => {
        const it = ITEMS[k], v = nodeVals(st, n, k);
        const req = (v.c * (early + W) + z * Math.sqrt(W * 1.5) * v.c * it.cv) * it.kg / 1000, h = v.s * it.kg / 1000;
        need += req; have += h; by[k] = Math.max(0, req - h);
      });
      const gap = Math.max(0, need - have);
      rows.push({ n, need, have, gap, loads: Math.ceil(gap / CONFIG.truckT), by });
    });
    const totLoads = rows.reduce((a, r) => a + r.loads, 0), cap = Math.floor(early * CONFIG.loadsPerDay);
    // Greedy weekly push: each week, give convoy loads to the post with the largest
    // remaining deficit x priority. Simple, explainable, and easy to replace with an LP.
    const weeks = [], left = Object.fromEntries(rows.map(r => [r.n.id, r.loads]));
    for (let w = 0; w * 7 < early; w++) {
      const days = Math.min(7, early - w * 7); let slots = Math.floor(days * CONFIG.loadsPerDay); const alloc = {};
      while (slots > 0) {
        const pick = rows.filter(r => left[r.n.id] > 0).sort((a, b) => left[b.n.id] * b.n.prio - left[a.n.id] * a.n.prio)[0];
        if (!pick) break; left[pick.n.id]--; alloc[pick.n.id] = (alloc[pick.n.id] || 0) + 1; slots--;
      }
      weeks.push({ w: w + 1, from: w * 7, to: w * 7 + days, alloc, spare: slots });
    }
    return { rows, totLoads, cap, short: totLoads - cap, early, W, weeks, left };
  }

  /* ---- SITREP parser (low-bandwidth reports) ---- */
  const CODES = Object.fromEntries(NODES.map(n => [n.code, n]));
  function parseSitrep(text, st) {
    const t = String(text || '').trim().toUpperCase().replace(/\s+/g, ' ');
    const out = { raw: t, ok: false, errors: [], warns: [], values: {}, post: null, dtg: null, str: null };
    if (!t) { out.errors.push('Empty message'); return out; }
    const tok = t.split(' ');
    if (tok[0] !== 'SITREP') out.errors.push('Must start with SITREP');
    const n = CODES[tok[1]];
    if (!n) out.errors.push(`Unknown post code "${tok[1] || ''}"`); else if (n.type !== 'post') out.errors.push(`${tok[1]} is a depot, not a post`); else out.post = n;
    if (!/^\d{6}$/.test(tok[2] || '')) out.errors.push('Time must be DDHHMM, e.g. 190600');
    else { const d = +tok[2].slice(0, 2), h = +tok[2].slice(2, 4), m = +tok[2].slice(4); if (d < 1 || d > 31 || h > 23 || m > 59) out.errors.push('Time DDHHMM out of range'); else out.dtg = tok[2]; }
    tok.slice(3).forEach(x => {
      const m = /^([FRMS])(\d+(?:\.\d+)?)$/.exec(x), s = /^STR(\d+)$/.exec(x);
      if (m) { if (out.values[m[1]] != null) out.warns.push(`${m[1]} given twice; last value used`); out.values[m[1]] = +m[2]; }
      else if (s) out.str = +s[1];
      else out.errors.push(`Cannot read "${x}"`);
    });
    if (!Object.keys(out.values).length && !out.errors.length) out.errors.push('No stock values (use F, R, M, S followed by a number)');
    if (out.post && st) {
      Object.entries(out.values).forEach(([k, v]) => {
        const exp = nodeVals(st, out.post, k), it = ITEMS[k];
        const diff = v - exp.s, rel = Math.abs(diff) / exp.s;
        if (rel > 0.25 && Math.abs(diff) > 2 * exp.c) out.warns.push(`${it.name}: reported ${fmt(v)} ${it.unit}, expected about ${fmt(exp.s)} (${diff > 0 ? '+' : '−'}${fmt(rel * 100)}%). Check the count before acting`);
      });
      if (out.str != null && Math.abs(out.str - out.post.troops) / out.post.troops > 0.1) out.warns.push(`Strength ${out.str} differs from planned ${out.post.troops}; consumption will be rescaled`);
    }
    out.ok = !out.errors.length;
    return out;
  }

  function fmt(n, d) { d = d || 0; return Number.isFinite(n) ? n.toLocaleString('en-IN', { maximumFractionDigits: d, minimumFractionDigits: d }) : '—'; }

  FSI.engine = { BYID, POSTS, kids, subtree, baseCons, nodeVals, ovKey, stockSd, freshness, pStockout, safeDay, simulate, explain,
    decisionOptions, decisionClock, urgentPosts, buildPlan, metrics, score, decide, winterPlan, parseSitrep, fmt, phi };
})();

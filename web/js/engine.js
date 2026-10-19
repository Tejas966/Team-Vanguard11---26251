/* Calculation engine. Pure functions of (state) -> results, no DOM, no mutation of state.
   Every page reads its numbers from here. Every rule is documented on the "How it works" page. */
(function () {
  const { ITEMS, NODES, LATERAL, CONFIG } = FSI;
  const BYID = Object.fromEntries(NODES.map(n => [n.id, n]));
  const POSTS = NODES.filter(n => n.type === 'post');
  const H = CONFIG.horizon;
  const kids = id => NODES.filter(n => n.parent === id);
  const EPS = 1e-9;

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

  /* ---------- inputs ---------- */
  // Daily use per post: strength x scale x altitude/cold factor. Depot = sum of what it supplies.
  function baseCons(n, it, st) {
    if (n.type === 'depot') return kids(n.id).reduce((a, k) => a + baseCons(k, it, st), 0);
    const str = st && st.strength && st.strength[n.id] != null ? st.strength[n.id] : n.troops;
    if (it === 'R') return str * 2.5 * altMult(n.alt);
    if (it === 'F') return str * FSI.wx.polRate(n); // SKO: real weather, adjusted to post altitude
    if (it === 'M') return str * 0.02;
    return str * 0.025;
  }
  const ovKey = (id, it) => id + '|' + it;
  // Baseline figures for a node: stock now (s), daily use (c), next delivery day (L), load size (q).
  // `ovr` holds figures received in field reports; nothing else writes to it.
  function nodeVals(st, n, it) {
    it = it || st.item;
    const o = (st.ovr || {})[ovKey(n.id, it)] || {};
    const c = Math.max(0, baseCons(n, it, st));
    const days = n.type === 'depot' ? n.stockDays : n.stock[it];
    const c0 = Math.max(0, baseCons(n, it, null)); // stock days are defined against planned strength
    return { s: Math.max(0, o.s != null ? o.s : days * c0), c, L: Math.max(n.tr, n.L), q: n.qtyDays * c };
  }
  function stockSd(st, id) { const r = st.reports[id]; if (!r) return 0; return CONFIG.fresh.find(f => r.ageH < f.h).sd; }
  function freshness(st, id) { const r = st.reports[id]; if (!r) return 'none'; return r.ageH < 24 ? 'fresh' : r.ageH < 72 ? 'ageing' : 'stale'; }

  // Data-quality indicator. Kept separate from supply risk on purpose.
  function dataQuality(st, id) {
    const r = st.reports[id] || {}, reasons = []; let score = 3;
    const f = freshness(st, id);
    if (f === 'stale') { score -= 2; reasons.push(`last report ${r.ageH} h old`); } else if (f === 'ageing') { score -= 1; reasons.push(`last report ${r.ageH} h old`); }
    if (r.via === 'SITREP') reasons.push('manual count by text message'); else if (r.via === 'sensor') reasons.push('automatic sensor reading');
    const missing = r.items ? Object.keys(ITEMS).filter(k => !r.items.includes(k)) : [];
    if (missing.length) { score -= 1; reasons.push(`not in last report: ${missing.map(k => ITEMS[k].short).join(', ')}`); }
    if (r.flagged && r.flagged.length) { score -= 1; reasons.push(`count looked wrong for ${r.flagged.map(k => ITEMS[k].short).join(', ')}`); }
    return { level: score >= 3 ? 'good' : score === 2 ? 'fair' : 'poor', reasons };
  }

  /* ---------- shared stock maths ---------- */
  // Index of how likely stock runs out before day T, from an ASSUMED demand spread (CV) plus
  // report-age uncertainty. It is not calibrated on real data, so the UI shows it only as a
  // rule-based class (LOW / MEDIUM / HIGH), never as a probability.
  function riskIndex(s, c, cv, sSd, T) {
    if (c <= EPS) return 0;
    if (T <= 0) return s <= 0 ? 1 : 0;
    const sd = Math.hypot(cv * c * Math.sqrt(T), sSd * s) || EPS;
    return 1 - phi((s - c * T) / sd);
  }
  const riskClass = x => x >= 0.5 ? 'HIGH' : x >= 0.2 ? 'MEDIUM' : 'LOW';
  // Cautious stock-out day: solves s - cT - z*sqrt(cv^2 c^2 T + (sSd s)^2) = 0 (z = 1.28).
  function safeDay(s, c, cv, sSd) {
    if (c <= EPS) return Infinity;
    const z = CONFIG.z90, f = T => s - c * T - z * Math.sqrt(cv * cv * c * c * T + (sSd * s) ** 2);
    if (f(0) <= 0) return 0;
    let lo = 0, hi = s / c; for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; f(m) > 0 ? lo = m : hi = m; }
    return lo;
  }
  // Projects stock on hand from day 0 to day T with extra arrivals [{day, qty}].
  // Returns when it first runs out (Y, Infinity if never before T... or later) and how many days
  // within [0, T] the post has zero stock. Stock never goes below zero; unmet demand is lost.
  function project(s, c, arrivals, T) {
    if (c <= EPS) return { Y: Infinity, short: 0, end: s };
    const ev = (arrivals || []).filter(a => a.qty > 0).slice().sort((a, b) => a.day - b.day);
    let t = 0, stock = Math.max(0, s), short = 0, Y = Infinity;
    for (const a of ev.concat([{ day: Infinity, qty: 0 }])) {
      const until = Math.min(a.day, T);
      if (until > t) {
        const runOut = t + stock / c;
        if (runOut < until) { if (Y === Infinity) Y = runOut; short += until - runOut; stock = 0; }
        else stock -= c * (until - t);
        t = until;
      }
      if (a.day > T || !Number.isFinite(a.day)) break;
      stock += a.qty; t = Math.max(t, a.day);
    }
    if (Y === Infinity) Y = t + stock / c; // runs out after T
    return { Y, short, end: stock };
  }

  /* ---------- network simulation (one plan under the shared scenario) ---------- */
  // Never mutates `st`. Disruptions apply to the source node and everything it supplies.
  function simulate(st, plan) {
    plan = plan || {};
    const it = st.item, sub = subtree(st.source), R = {};
    NODES.forEach(n => {
      const v = nodeVals(st, n), inS = sub.has(n.id);
      R[n.id] = { n, s: v.s * (inS ? 1 - st.inv / 100 : 1), c: v.c * (inS ? 1 + st.cons / 100 : 1), L: v.L, q: v.q,
        D: 0, F: 1, why: [], rerouted: false, arrivals: [], extraWhy: '', routeBlocked: false };
    });
    const src = R[st.source];
    if (st.delay > 0) { src.D += st.delay; src.why.push(`${src.n.name}'s resupply delayed ${st.delay} d (arrives day ${src.L + st.delay}, was day ${src.L})`); }
    if (st.short > 0) { src.F *= 1 - st.short / 100; src.why.push(`${src.n.name}'s incoming load short by ${st.short}%`); }
    if (st.routeOut) { R.DB.D = Infinity; R.DB.routeBlocked = true; R.DB.why.push('Route-1 via Pass-1 closed: no road resupply to Depot-B within 14 days'); }
    if (plan.reroute) { // Route-2 is a separate road; it never uses the blocked Pass-1
      const db = R.DB, alt = BYID.DB.alt;
      if (db.L + db.D > alt.L) { db.D = alt.L - db.L; db.F = Math.min(db.F, alt.cap); db.rerouted = true;
        db.why.push(`Plan: resupply rerouted via ${alt.route}, arrives day ${alt.L} at ${Math.round(alt.cap * 100)}% load (light-vehicle capacity)`); }
    }
    // Each depot ships its children's scheduled loads in date order while stock lasts. A load it
    // cannot fill waits for the depot's own resupply. Depot stock never goes below zero.
    ['DA', 'DB', 'TH'].forEach(pid => {
      const p = R[pid], A = p.L + p.D, Q = p.q * p.F; let s = p.s, arrived = false; p.queue = []; p.shipped = 0;
      kids(pid).map(k => R[k.id]).map(k => ({ k, t: Math.max(0, k.L - k.n.tr) })).sort((a, b) => a.t - b.t || a.k.n.id.localeCompare(b.k.n.id)).forEach(({ k, t }) => {
        if (!arrived && A <= t) { s += Q; arrived = true; }
        const need = k.q;
        if (s >= need) { s -= need; p.shipped += need; p.queue.push({ id: k.n.id, t, ok: true, sent: need }); return; }
        if (A <= H) {
          if (!arrived) { s += Q; arrived = true; }
          const send = Math.min(need, Math.max(0, s)); s -= send; p.shipped += send;
          const wait = Math.max(t, A) - t; k.D += wait; k.F *= need > 0 ? send / need : 1;
          if (wait > 0) k.why.push(`${p.n.name} could not fill ${k.n.name}'s load on day ${t}; it waits for ${p.n.name}'s resupply (day ${A}), so delivery moves to day ${k.L + k.D} (was day ${k.L})`);
          if (send < need) k.why.push(`${k.n.name} receives only ${Math.round(send / need * 100)}% of its load`);
          p.queue.push({ id: k.n.id, t, ok: false, wait, sent: send });
        } else {
          const send = Math.min(need, Math.max(0, s)); s -= send; p.shipped += send;
          if (send > 0) { k.F *= send / need; k.why.push(`${p.n.name} sends its last stock: ${k.n.name} gets ${Math.round(send / need * 100)}% of its load and nothing more within 14 days`); }
          else { k.D = Infinity; k.F = 0; k.why.push(`${p.n.name} has no stock and no resupply within 14 days, so ${k.n.name} gets no delivery`); }
          p.queue.push({ id: k.n.id, t, ok: false, wait: Infinity, sent: send });
        }
      });
      p.endStock = Math.max(0, s);
    });
    // Plan extras (air drops, lateral transfers). A donor never gives more than it holds.
    (plan.extras || []).forEach(x => {
      const r = R[x.to]; let units = x.units;
      if (x.from) { units = Math.min(units, Math.max(0, R[x.from].s)); R[x.from].s -= units; R[x.from].donated = (R[x.from].donated || 0) + units; }
      if (units > 0) { r.arrivals.push({ day: x.day, qty: units }); r.extraWhy = (r.extraWhy ? r.extraWhy + '; ' : '') + x.label; }
    });
    NODES.forEach(n => {
      const r = R[n.id], A = r.L + r.D; r.A = A;
      if (n.type !== 'post') {
        r.lateKids = (r.queue || []).filter(q => !q.ok).length;
        r.risk = r.lateKids > 0 ? 'red' : (r.D > 0 || r.F < 1) ? 'amber' : 'green';
        return;
      }
      const sSd = stockSd(st, n.id), cv = ITEMS[it].cv, T = Math.min(A, H);
      r.extra = r.arrivals.reduce((a, x) => a + x.qty, 0);
      const pr = project(r.s, r.c, r.arrivals, T);       // before the next scheduled delivery
      r.Y = pr.Y; r.short = pr.short; r.sSd = sSd;
      const early = r.arrivals.filter(a => r.c <= EPS || a.day <= r.s / r.c).reduce((a, x) => a + x.qty, 0);
      r.sEff = r.s + early;                               // stock that arrives before running out
      r.Yc = Math.min(safeDay(r.sEff, r.c, cv, sSd), r.Y); // cautious estimate never later than expected
      r.margin = (!Number.isFinite(A) || A > H) ? Math.min(r.Y, 99) - H : Math.min(r.Y, 99) - A;
      r.cover = Number.isFinite(A) && A <= H ? (r.c <= EPS ? Infinity : (pr.end + r.q * r.F) / r.c) : 0;
      r.P = riskIndex(r.sEff, r.c, cv, sSd, T);
      r.riskClass = riskClass(r.P);
      if (r.short > EPS || (r.F < 1 && r.cover < 2)) r.risk = 'red';
      else if (r.D > 0 || r.margin < 2 || r.cover < 5 || r.F < 1 || r.P >= 0.2) r.risk = 'amber';
      else r.risk = 'green';
    });
    return R;
  }

  function pathTo(id) { const p = []; let c = BYID[id]; while (c) { p.unshift(c.id); c = c.parent ? BYID[c.parent] : null; } return p; }
  function explain(st, R, id) {
    const parts = []; pathTo(id).forEach(pid => R[pid].why.forEach(w => parts.push(w)));
    const r = R[id], it = ITEMS[st.item];
    if (r.extraWhy) parts.push(r.extraWhy);
    if (r.n.type === 'post') {
      if (r.short > EPS) parts.push(`stock runs out on day ${fmt(r.Y, 1)}, before delivery: estimated shortage ${fmt(r.short, 1)} d (${fmt(r.short * r.c)} ${it.unit})`);
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

  /* ---------- Action deadlines (Decision Clock) ---------- */
  // Free depot stock = stock not already committed to on-time scheduled loads.
  function freeStock(R, pid) { const p = R[pid]; return Math.max(0, p.s - (p.queue || []).filter(q => q.ok).reduce((a, q) => a + q.sent, 0)); }
  function firstFlyable(cell, from, to) { for (let d = from; d <= to; d++) if (FSI.wx.flyable(cell, d).ok) return d; return null; }
  // Options in order of preference (cheapest / least disruptive first).
  function decisionOptions(st, R, id, free) {
    const r = R[id], n = r.n, p = R[n.parent], it = ITEMS[st.item], opts = [];
    const lat = LATERAL.find(l => l.includes(id));
    if (lat) {
      const o = lat[0] === id ? lat[1] : lat[0], ro = R[o];
      const surplus = ro.s - ro.c * (Math.min(ro.A, H) + 3);
      opts.push({ key: 'lateral', label: `Lateral transfer from ${BYID[o].name}`, lead: 1, cost: CONFIG.cost.transfer, donor: o,
        ok: ro.risk === 'green' && surplus > r.c * 2, why: ro.risk !== 'green' ? `${BYID[o].name} is at risk itself` : surplus > r.c * 2 ? `spare stock ≈ ${fmt(surplus)} ${it.unit} after keeping 3 days' safety` : 'neighbour has no spare stock' });
    }
    const avail = free != null ? free : freeStock(R, n.parent);
    const waitDepot = avail >= r.q * 0.5 ? 0 : (Number.isFinite(p.A) && p.A <= H ? p.A : null);
    opts.push({ key: 'expedite', label: `Expedite convoy from ${p.n.name}`, lead: n.tr + 0.5, earliest: waitDepot || 0, cost: CONFIG.cost.expedite, depot: n.parent,
      ok: waitDepot != null, why: waitDepot == null ? `${p.n.name} has no free stock and no resupply within 14 days`
        : waitDepot === 0 ? `${n.tr} d by road${n.lastMile ? ' and ' + n.lastMile : ''}, plus half a day to load` : `must wait for ${p.n.name}'s resupply (day ${p.A}), then ${n.tr} d on the track` });
    if (n.parent === 'DB') opts.push({ key: 'detour', label: 'Resupply via Route-2 (Pass-2)', lead: BYID.DB.alt.L + n.tr, cost: CONFIG.cost.reroute,
      ok: true, why: `${BYID.DB.alt.L} d to Depot-B by light vehicles (${Math.round(BYID.DB.alt.cap * 100)}% of a normal load), plus ${n.tr} d to the post. Does not use Pass-1` });
    const fly = []; for (let d = 1; d <= Math.min(H, Math.floor(r.Yc)); d++) if (FSI.wx.flyable(n.cell, d).ok) fly.push(d);
    const bad = []; for (let d = 1; d <= Math.min(7, H); d++) if (!FSI.wx.flyable(n.cell, d).ok) bad.push(d);
    opts.push({ key: 'air', label: 'Air maintenance (air-drop)', lead: 1, cost: CONFIG.cost.sortie, ok: fly.length > 0, flyDays: fly,
      why: fly.length ? `latest flyable day before stock runs low: day ${fly[fly.length - 1]}${bad.length ? `; not flyable on day ${bad.join(', ')} (snow, rain or wind)` : '; forecast clear'}` : 'no flyable day in the forecast before stock runs low' });
    opts.forEach(o => {
      o.earliest = o.earliest || 0; o.actBy = r.Yc - o.lead;
      if (o.key === 'air' && o.flyDays && o.flyDays.length) o.actBy = Math.min(o.actBy, o.flyDays[o.flyDays.length - 1] - 0.5); // order 12 h before the flight
      if (o.ok && o.actBy < o.earliest) { o.ok = false; o.why += ' (too late to arrive before stock runs low)'; }
    });
    return opts;
  }
  function pickOptions(opts) {
    const viable = opts.filter(o => o.ok && o.actBy > 0);
    return { viable, first: viable[0], last: viable.reduce((a, o) => (!a || o.actBy > a.actBy ? o : a), null) };
  }
  function statusOf(covered, first) { return covered ? 'covered' : !first ? 'late' : first.actBy < 1 ? 'now' : first.actBy < 3 ? 'soon' : 'plan'; }
  function decisionClock(st, item) {
    const s2 = Object.assign({}, st, { item }), R = simulate(s2, {});
    const rows = POSTS.map(n => {
      const r = R[n.id], covered = Number.isFinite(r.A) && r.A <= r.Yc && !(r.F < 1 && r.cover < 2);
      return { item, n, r, covered, opts: decisionOptions(s2, R, n.id), R };
    });
    // Free depot stock can serve each expedite convoy only once: most urgent post first.
    const pool = { DA: freeStock(R, 'DA'), DB: freeStock(R, 'DB'), TH: freeStock(R, 'TH') };
    rows.filter(x => !x.covered).map(x => ({ x, o: x.opts.find(o => o.key === 'expedite') })).filter(y => y.o && y.o.ok && y.o.earliest === 0)
      .sort((a, b) => a.o.actBy - b.o.actBy).forEach(({ x, o }) => {
        const need = x.r.q * 0.5;
        if (pool[o.depot] >= need) { pool[o.depot] -= Math.min(pool[o.depot], x.r.q); o.reserved = true; }
        else { o.ok = false; o.why = `${BYID[o.depot].name}'s free stock is already reserved for more urgent posts`; }
      });
    rows.forEach(x => { const p = pickOptions(x.opts); Object.assign(x, p); x.status = statusOf(x.covered, p.first); x.actBy = x.covered ? Infinity : p.first ? p.first.actBy : 0; });
    return rows;
  }
  // Counts used by Today, the map and the deadlines tabs (one source of truth).
  function statusCounts(st) {
    const all = Object.keys(ITEMS).flatMap(k => decisionClock(st, k));
    const c = { now: 0, soon: 0, plan: 0, late: 0, covered: 0 }; all.forEach(r => c[r.status]++);
    const byPost = {}; all.forEach(r => { (byPost[r.n.id] = byPost[r.n.id] || []).push(r); });
    const order = { late: 0, now: 0, soon: 1, plan: 2, covered: 3 };
    const postsOk = Object.values(byPost).filter(rs => rs.every(r => r.status === 'covered')).length;
    return { rows: all, counts: c, actNow: c.now + c.late, postsOk, byPost, order };
  }

  /* ---------- plans (Compare plans, demo, brief) ---------- */
  const PLAN_NAMES = { A: 'Plan A · keep current schedule', reroute: 'Reroute Depot-B resupply via Route-2', air: 'Air maintenance to most urgent posts', realloc: 'Lateral transfer between posts', combo: 'Reroute + air maintenance' };
  function urgentPosts(R) { return POSTS.map(p => R[p.id]).filter(r => r.risk === 'red' && r.short > EPS).sort((a, b) => (b.n.prio * b.short) - (a.n.prio * a.short) || a.Y - b.Y); }
  function buildPlan(st, kind) {
    const plan = { kind, reroute: false, extras: [], cost: 0, notes: [], applicable: kind === 'A' };
    if (kind === 'A') return plan;
    const it = ITEMS[st.item];
    if (kind === 'reroute' || kind === 'combo') {
      const R0 = simulate(st, {}), alt = BYID.DB.alt;
      if (R0.DB.L + R0.DB.D > alt.L) { plan.reroute = true; plan.cost += CONFIG.cost.reroute; plan.applicable = true; }
      else plan.notes.push('Reroute cannot help: Depot-B resupply already arrives before Route-2 could (day ' + alt.L + ')');
    }
    if (kind === 'air' || kind === 'combo') {
      const R0 = simulate(st, { reroute: plan.reroute }), u = urgentPosts(R0);
      let used = 0;
      u.forEach(r => {
        if (used >= CONFIG.airSorties) return;
        const day = firstFlyable(r.n.cell, 1, H);
        if (day == null) { plan.notes.push(`${r.n.name}: no flyable day in the forecast`); return; }
        const units = Math.min(CONFIG.sortieKg / it.kg, 6 * r.c);
        plan.extras.push({ to: r.n.id, units, day, label: `air drop of ${fmt(units)} ${it.unit} on day ${day} (first flyable day)` });
        plan.cost += CONFIG.cost.sortie; used++; plan.applicable = true;
      });
      if (!u.length) plan.notes.push('No post is short, so no air drop is needed');
      else if (u.length > CONFIG.airSorties) plan.notes.push(`Only ${CONFIG.airSorties} sorties available; ${u.length - CONFIG.airSorties} short post(s) not covered by air`);
    }
    if (kind === 'realloc') {
      const R0 = simulate(st, {}), usedDonor = new Set();
      urgentPosts(R0).forEach(r => {
        const lat = LATERAL.find(l => l.includes(r.n.id)); if (!lat) return;
        const o = lat[0] === r.n.id ? lat[1] : lat[0], ro = R0[o];
        if (ro.risk === 'red' || usedDonor.has(o)) return;
        const units = Math.max(0, Math.min(ro.s - ro.c * (Math.min(ro.A, H) + 3), r.short * r.c + 2 * r.c));
        if (units > 0) { usedDonor.add(o); plan.extras.push({ to: r.n.id, from: o, units, day: 1, label: `${fmt(units)} ${it.unit} moved from ${BYID[o].name}, arrives day 1` }); plan.cost += CONFIG.cost.transfer; plan.applicable = true; }
      });
      if (!plan.extras.length) plan.notes.push('No permitted lateral link has spare stock next to a short post');
    }
    return plan;
  }
  function metrics(R, cost) {
    const ps = POSTS.map(p => R[p.id]), shortPosts = ps.filter(r => r.short > EPS), sumShort = ps.reduce((a, r) => a + r.short, 0);
    const delivery = ps.map(r => { const ex = r.arrivals.length ? Math.min(...r.arrivals.map(a => a.day)) : Infinity; return Math.min(ex, Math.min(r.A, H + 1)); });
    return { stockouts: shortPosts.length, shortList: shortPosts.map(r => ({ id: r.n.id, name: r.n.name, from: r.Y, days: r.short, units: r.short * r.c })),
      sumShort, maxP: Math.max(...ps.map(r => r.P)), maxClass: riskClass(Math.max(...ps.map(r => r.P))), avgArr: delivery.reduce((a, b) => a + b, 0) / ps.length,
      firstOut: shortPosts.length ? Math.min(...shortPosts.map(r => r.Y)) : null,
      minMargin: Math.min(...ps.map(r => r.margin)), shortUnits: ps.reduce((a, r) => a + r.short * r.c, 0), cost, risk: sumShort + 5 * shortPosts.length };
  }
  const WEIGHTS = { balanced: [0.6, 0.25, 0.15], risk: [0.8, 0.15, 0.05], cost: [0.4, 0.2, 0.4] };
  // Fixed reference scales, so a plan's score never depends on which other plans are listed:
  // risk / risk of Plan A (same scenario), delivery day / (horizon + 1), cost / ₹10 lakh.
  function scoreOne(st, m, riskRef) {
    const w = WEIGHTS[st.prio] || WEIGHTS.balanced;
    const parts = { risk: m.risk / Math.max(1, riskRef), time: m.avgArr / (H + 1), cost: m.cost / CONFIG.costRef };
    return { total: w[0] * parts.risk + w[1] * parts.time + w[2] * parts.cost, parts, w };
  }
  // Evaluates every candidate with the same simulation, metrics and score, then recommends.
  // Rule: among applicable plans, fewest posts short; then lowest score; then lowest cost.
  function evaluatePlans(st) {
    const kinds = ['A', 'reroute', 'air', 'realloc', 'combo'];
    const cands = kinds.map(k => { const plan = buildPlan(st, k), R = simulate(st, plan), m = metrics(R, plan.cost); return { key: k, name: PLAN_NAMES[k], plan, R, m, applicable: plan.applicable, notes: plan.notes }; });
    const riskRef = cands[0].m.risk;
    cands.forEach(c => { c.score = scoreOne(st, c.m, riskRef); });
    const ranked = cands.filter(c => c.applicable).sort((a, b) => a.m.stockouts - b.m.stockouts || a.score.total - b.score.total || a.m.cost - b.m.cost);
    const best = ranked[0], A = cands[0];
    let reason;
    if (best.key === 'A') reason = A.m.stockouts ? 'no applicable alternative leaves fewer posts short' : 'no post runs short, so the current schedule needs no extra cost';
    else if (best.m.stockouts < A.m.stockouts) reason = `it leaves ${best.m.stockouts} post${best.m.stockouts === 1 ? '' : 's'} short against ${A.m.stockouts} for the current schedule`;
    else reason = `same number of posts short as other options, but the lowest score (${fmt(best.score.total, 2)})`;
    return { cands, ranked, best, A, reason, riskRef };
  }
  function baselineState(st) { return Object.assign({}, st, { delay: 0, cons: 0, short: 0, inv: 0, routeOut: false, wxStorm: null }); }

  /* ---------- winter stocking ---------- */
  function winterPlan(st) {
    const W = st.winterW, z = st.winterZ, early = CONFIG.winter.p10, rows = [];
    POSTS.filter(n => n.parent === 'DB').forEach(n => {
      let need = 0, have = 0; const by = {};
      Object.keys(ITEMS).forEach(k => {
        const it = ITEMS[k], v = nodeVals(st, n, k);
        // SKO use follows the weather: real forecast where available, then the 2023–26 average for those dates
        const cPre = k === 'F' ? (st.strength && st.strength[n.id] != null ? st.strength[n.id] : n.troops) * FSI.wx.polRate(n, early, 0) : v.c;
        const cWin = k === 'F' ? (st.strength && st.strength[n.id] != null ? st.strength[n.id] : n.troops) * FSI.wx.polRate(n, W, early) : v.c;
        const req = (cPre * early + cWin * W + z * Math.sqrt(W * 1.5) * cWin * it.cv) * it.kg / 1000, h = v.s * it.kg / 1000;
        need += req; have += h; by[k] = Math.max(0, req - h);
      });
      const gap = Math.max(0, need - have);
      rows.push({ n, need, have, gap, loads: Math.ceil(gap / CONFIG.truckT - EPS), by });
    });
    const totLoads = rows.reduce((a, r) => a + r.loads, 0), cap = Math.floor(early * CONFIG.loadsPerDay + EPS);
    // Weekly push: slots per week come from the same running total as `cap`, so they add up.
    const weeks = [], left = Object.fromEntries(rows.map(r => [r.n.id, r.loads]));
    for (let w = 0; w * 7 < early; w++) {
      const from = w * 7, to = Math.min(early, from + 7);
      let slots = Math.floor(to * CONFIG.loadsPerDay + EPS) - Math.floor(from * CONFIG.loadsPerDay + EPS); const alloc = {};
      while (slots > 0) {
        const pick = rows.filter(r => left[r.n.id] > 0).sort((a, b) => left[b.n.id] * b.n.prio - left[a.n.id] * a.n.prio || a.n.id.localeCompare(b.n.id))[0];
        if (!pick) break; left[pick.n.id]--; alloc[pick.n.id] = (alloc[pick.n.id] || 0) + 1; slots--;
      }
      weeks.push({ w: w + 1, from, to, alloc, spare: slots });
    }
    return { rows, totLoads, cap, short: totLoads - cap, early, W, weeks, left };
  }

  /* ---------- SITREP parser (low-bandwidth reports) ---------- */
  const CODES = Object.fromEntries(NODES.map(n => [n.code, n]));
  function parseSitrep(text, st) {
    const t = String(text || '').trim().toUpperCase().replace(/\s+/g, ' ');
    const out = { raw: t, ok: false, errors: [], warns: [], values: {}, flagged: [], post: null, dtg: null, str: null };
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
      else if (s) { out.str = +s[1]; if (out.str <= 0) out.errors.push('Strength must be more than 0'); }
      else out.errors.push(`Cannot read "${x}"`);
    });
    if (!Object.keys(out.values).length && !out.errors.length) out.errors.push('No stock values (use F, R, M, S followed by a number)');
    if (out.post && st) {
      Object.entries(out.values).forEach(([k, v]) => {
        const exp = nodeVals(st, out.post, k), it = ITEMS[k];
        const diff = v - exp.s, rel = exp.s > 0 ? Math.abs(diff) / exp.s : (v > 0 ? 1 : 0);
        if (rel > 0.25 && Math.abs(diff) > 2 * exp.c) { out.flagged.push(k); out.warns.push(`${it.name}: reported ${fmt(v)} ${it.unit}, expected about ${fmt(exp.s)} (${diff > 0 ? '+' : '−'}${fmt(rel * 100)}%). Check the count before acting`); }
      });
      if (out.str != null && Math.abs(out.str - out.post.troops) / out.post.troops > 0.1) out.warns.push(`Strength ${out.str} differs from planned ${out.post.troops}; consumption will be rescaled`);
    }
    out.ok = !out.errors.length;
    return out;
  }
  // Applying a report returns a state patch; it never edits state in place.
  function applySitrep(st, p) {
    const ovr = Object.assign({}, st.ovr), n = p.post;
    Object.entries(p.values).forEach(([k, v]) => { const key = ovKey(n.id, k); ovr[key] = Object.assign({}, ovr[key], { s: v }); });
    const strength = Object.assign({}, st.strength || {}); if (p.str != null) strength[n.id] = p.str;
    const reports = Object.assign({}, st.reports, { [n.id]: { ageH: 0, via: 'SITREP', items: Object.keys(p.values), flagged: p.flagged.slice() } });
    return { ovr, strength, reports };
  }

  /* ---------- "Why this recommendation?" for one post + supply ---------- */
  function explainRow(st, row) {
    const r = row.r, n = row.n, it = ITEMS[row.item], dq = dataQuality(st, n.id);
    const route = [];
    if (st.routeOut && n.parent === 'DB') route.push('Route-1 via Pass-1 is closed, so road resupply to Depot-B must use Route-2');
    if (st.delay && subtree(st.source).has(n.id)) route.push(`${BYID[st.source].name} resupply is ${st.delay} d late`);
    const rq = row.R[n.parent]; if (rq && rq.lateKids) route.push(`${rq.n.name} could not fill ${rq.lateKids} scheduled load(s) on time`);
    if (n.lastMile) route.push(`last leg by ${n.lastMile}`);
    const alts = row.opts.map(o => ({ label: o.label, open: o.ok && o.actBy > 0, actBy: o.actBy, lead: o.lead, cost: o.cost, why: o.why }));
    let reason, remaining = [];
    if (row.status === 'covered') reason = 'the scheduled delivery arrives before the cautious stock-out estimate, so no extra action is needed';
    else if (row.status === 'late') { reason = 'no option can arrive before stock runs low'; remaining.push(`shortage of about ${fmt(r.short, 1)} d unless use is cut`); }
    else {
      reason = `it is the cheapest option whose ordering window is still open (options are ranked by cost: transfer, convoy, detour, air)`;
      if (row.first.key === 'air') remaining.push('depends on the weather staying flyable');
      if (row.first.actBy < 1) remaining.push('the window closes within 24 hours');
      if (row.last && row.last !== row.first) remaining.push(`if missed, the last fallback is ${row.last.label.toLowerCase()} until day ${fmt(row.last.actBy, 1)}`);
      else remaining.push('no fallback option stays open longer');
    }
    if (dq.level !== 'good') remaining.push(`data quality ${dq.level}: ${dq.reasons.join('; ')}`);
    return { post: n.name, item: it.name, unit: it.unit, stock: r.sEff, use: r.c, runsOut: r.Y, cautious: r.Yc, delivery: r.A, deliveryLead: n.tr, freshness: st.reports[n.id], dq, route, alts, reason, remaining };
  }

  /* ---------- one-click demo (deterministic) ---------- */
  // Uses the bundled weather snapshot (not the live forecast) so every run gives the same numbers.
  const DEMO = { item: 'F', source: 'DB', delay: 0, cons: 0, short: 0, inv: 0, routeOut: true, wxStorm: null, prio: 'balanced' };
  function runDemo(st) {
    const wasFrozen = FSI.wx.isFrozen(); FSI.wx.freeze(true);
    try {
      const base0 = Object.assign({}, st, { item: DEMO.item, prio: DEMO.prio, ovr: {}, strength: {}, reports: JSON.parse(JSON.stringify(FSI.REPORTS)) });
      const base = baselineState(base0), dis = Object.assign({}, base0, DEMO);
      const Rb = simulate(base, {}), mb = metrics(Rb, 0);
      const ev = evaluatePlans(dis), Rd = ev.A.R, md = ev.A.m, best = ev.best;
      const affected = POSTS.map(n => Rd[n.id]).filter(r => r.risk !== 'green');
      const steps = [
        { t: 'Baseline loaded', d: `${ITEMS[DEMO.item].name}, normal schedule: ${mb.stockouts} post${mb.stockouts === 1 ? '' : 's'} short in the next 14 days. Depot-B resupply due day ${Rb.DB.A}.` },
        { t: 'Disruption applied', d: 'Pass-1 closed by snow (simulated): no road resupply to Depot-B for the 14-day horizon.' },
        { t: 'Stock re-projected', d: `Depot-B can fill ${Rd.DB.queue.filter(q => q.ok).length} of ${Rd.DB.queue.length} scheduled loads from its own stock; the rest go out partly filled or not at all.` },
        { t: 'Affected posts found', d: affected.length ? affected.map(r => `${r.n.name} (${r.short > EPS ? 'runs out day ' + fmt(r.Y, 1) : 'thin margin'})`).join('; ') : 'none' },
        { t: 'Options evaluated', d: ev.cands.map(c => `${c.name}: ${c.applicable ? c.m.stockouts + ' short, score ' + fmt(c.score.total, 2) : 'not applicable'}`).join(' · ') },
        { t: 'Recommendation', d: `${best.name}, because ${ev.reason}.` },
        { t: 'Outcome compared', d: `Posts short: ${mb.stockouts} baseline → ${md.stockouts} disrupted → ${best.m.stockouts} with the recommendation.` },
      ];
      return { steps, base: mb, dis: md, rec: best.m, recName: best.name, recKey: best.key, ev, patch: DEMO, snapshot: FSI.wx.snapshotDate };
    } finally { FSI.wx.freeze(wasFrozen); }
  }

  function fmt(n, d) { d = d || 0; return Number.isFinite(n) ? n.toLocaleString('en-IN', { maximumFractionDigits: d, minimumFractionDigits: d }) : '—'; }

  FSI.engine = { BYID, POSTS, kids, subtree, baseCons, nodeVals, ovKey, stockSd, freshness, dataQuality, riskIndex, riskClass, pStockout: riskIndex, safeDay, project,
    simulate, explain, freeStock, decisionOptions, decisionClock, statusCounts, urgentPosts, buildPlan, metrics, scoreOne, evaluatePlans, baselineState, PLAN_NAMES,
    winterPlan, parseSitrep, applySitrep, explainRow, runDemo, DEMO, fmt, phi };
})();

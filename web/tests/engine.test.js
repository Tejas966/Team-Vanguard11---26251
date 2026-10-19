// Engine tests. Run from the repo root:  node --test web/tests
// Loads the same browser scripts the app uses (data, weather, engine) into a sandbox.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function load() {
  const ctx = { console, Math, Date, JSON, Object, Array, Number, String, Set, Map, Infinity, NaN, isFinite, parseFloat };
  ctx.window = ctx; ctx.FSI = {};
  vm.createContext(ctx);
  for (const f of ['data.js', 'weather-data.js', 'weather.js', 'engine.js'])
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'), ctx, { filename: f });
  ctx.FSI.wx.freeze(true); // bundled snapshot: tests do not depend on today's date or the network
  return ctx.FSI;
}
const FSI = load(), E = FSI.engine, H = FSI.CONFIG.horizon;
const DEFAULT = () => ({ item: 'F', source: 'DB', delay: 3, cons: 0, short: 0, inv: 0, routeOut: false, planB: 'reroute', prio: 'balanced',
  ovr: {}, strength: {}, whatif: null, demo: false, replay: null, reports: JSON.parse(JSON.stringify(FSI.REPORTS)), inbox: [], hist: [], decisions: [], winterZ: 1.6449, winterW: 120 });
const clone = o => JSON.parse(JSON.stringify(o));
const SCENARIOS = [
  DEFAULT(),
  Object.assign(DEFAULT(), { delay: 0 }),
  Object.assign(DEFAULT(), { delay: 7, cons: 30 }),
  Object.assign(DEFAULT(), { routeOut: true }),
  Object.assign(DEFAULT(), { routeOut: true, item: 'M', inv: 40 }),
  Object.assign(DEFAULT(), { source: 'DA', delay: 7, item: 'R', short: 50 }),
  Object.assign(DEFAULT(), { source: 'TH', delay: 5, item: 'S', cons: 60 }),
];

test('projection: stock never negative, zero demand never runs out', () => {
  const p = E.project(100, 10, [], 20); assert.equal(p.Y, 10); assert.equal(p.short, 10); assert.equal(p.end, 0);
  const z = E.project(100, 0, [], 20); assert.equal(z.Y, Infinity); assert.equal(z.short, 0);
  const late = E.project(10, 10, [{ day: 3, qty: 50 }], 10); assert.equal(late.Y, 1); assert.equal(late.short, 4); // out day 1-3, then the 50 last to day 8: out again 8-10
  const early = E.project(10, 10, [{ day: 0.5, qty: 50 }], 10); assert.equal(early.short, 4); assert.equal(early.Y, 6);
  assert.equal(E.safeDay(100, 0, 0.2, 0), Infinity);
});

test('zero-demand post is never flagged', () => {
  const st = Object.assign(DEFAULT(), { strength: { P1: 0 } });
  const rows = E.decisionClock(st, 'F').filter(r => r.n.id === 'P1');
  assert.equal(rows[0].status, 'covered');
  assert.equal(E.simulate(st, {}).P1.short, 0);
});

test('inventory constraints: no negative stock, depots never ship more than they hold', () => {
  for (const st of SCENARIOS) {
    for (const plan of ['A', 'reroute', 'air', 'realloc', 'combo'].map(k => E.buildPlan(st, k))) {
      const R = E.simulate(st, plan);
      for (const id of ['DA', 'DB', 'TH']) {
        const p = R[id], A = p.L + p.D, incoming = A <= H ? p.q * p.F : 0;
        assert.ok(p.endStock >= 0, `${id} end stock`);
        assert.ok(p.shipped <= p.s + incoming + 1e-6, `${id} shipped ${p.shipped} > ${p.s} + ${incoming}`);
      }
      for (const n of E.POSTS) { const r = R[n.id]; assert.ok(r.s >= -1e-6, `${n.id} stock`); assert.ok(r.short >= 0 && r.short <= H + 1e-9); }
    }
  }
});

test('blocked route: with Pass-1 closed no plan delivers to Depot-B by Route-1', () => {
  const st = Object.assign(DEFAULT(), { routeOut: true });
  for (const k of ['A', 'air', 'realloc']) assert.equal(E.simulate(st, E.buildPlan(st, k)).DB.A, Infinity, k);
  for (const k of ['reroute', 'combo']) { const R = E.simulate(st, E.buildPlan(st, k)); assert.ok(R.DB.rerouted); assert.equal(R.DB.A, FSI.NODES.find(n => n.id === 'DB').alt.L); }
  // deadline options never offer Route-1
  E.decisionClock(st, 'F').forEach(r => r.opts.forEach(o => assert.ok(!/Route-1|Pass-1/.test(o.label))));
});

test('transport capacity: Route-2 carries at most its share; air sorties capped', () => {
  const st = Object.assign(DEFAULT(), { routeOut: true });
  const R = E.simulate(st, E.buildPlan(st, 'reroute')), cap = FSI.NODES.find(n => n.id === 'DB').alt.cap;
  assert.ok(R.DB.F <= cap + 1e-9);
  for (const s of SCENARIOS) {
    const p = E.buildPlan(s, 'air'), it = FSI.ITEMS[s.item];
    const air = p.extras.length; assert.ok(air <= FSI.CONFIG.airSorties);
    p.extras.forEach(x => { assert.ok(x.units * it.kg <= FSI.CONFIG.sortieKg + 1e-6); assert.ok(FSI.wx.flyable(E.BYID[x.to].cell, x.day).ok, 'drop on a flyable day'); });
  }
});

test('no duplicate allocation: depot free stock and donors are used once', () => {
  for (const st of SCENARIOS) for (const item of Object.keys(FSI.ITEMS)) {
    const rows = E.decisionClock(st, item), R = rows[0].R;
    for (const d of ['DB', 'TH']) {
      const reserved = rows.filter(r => r.n.parent === d).map(r => r.opts.find(o => o.key === 'expedite')).filter(o => o && o.reserved);
      const need = reserved.length ? rows.filter(r => r.n.parent === d && r.opts.find(o => o.key === 'expedite' && o.reserved)).reduce((a, r) => a + 0.5 * r.r.q, 0) : 0;
      assert.ok(need <= E.freeStock(R, d) + 1e-6, `${d} over-reserved for ${item}`);
    }
    const plan = E.buildPlan(Object.assign({}, st, { item }), 'realloc'), donors = plan.extras.map(x => x.from);
    assert.equal(new Set(donors).size, donors.length, 'each donor used once');
    const Rr = E.simulate(Object.assign({}, st, { item }), plan); plan.extras.forEach(x => assert.ok(Rr[x.from].s >= -1e-6));
  }
});

test('simulation never mutates the state; reset restores the exact baseline', () => {
  const st = DEFAULT(), before = clone(st);
  E.simulate(st, E.buildPlan(st, 'combo')); E.evaluatePlans(st); E.decisionClock(st, 'M'); E.winterPlan(st); E.runDemo(st);
  assert.deepEqual(clone(st), before);
  const changed = Object.assign(DEFAULT(), { delay: 7, routeOut: true, ovr: { 'P1|F': { s: 1 } } });
  assert.notDeepEqual(clone(changed), clone(DEFAULT()));
  assert.deepEqual(clone(DEFAULT()), before); // DEFAULT() is a fresh copy every time
});

test('scoring: one function, set-independent, recommendation = best of the table', () => {
  for (const st of SCENARIOS) {
    const ev = E.evaluatePlans(st);
    // each score equals scoreOne on its own metrics (no dependence on the other candidates)
    ev.cands.forEach(c => assert.equal(c.score.total, E.scoreOne(st, c.m, ev.riskRef).total));
    const applicable = ev.cands.filter(c => c.applicable);
    const expect = applicable.slice().sort((a, b) => a.m.stockouts - b.m.stockouts || a.score.total - b.score.total || a.m.cost - b.m.cost)[0];
    assert.equal(ev.best.key, expect.key);
    assert.ok(applicable.every(c => c.m.stockouts >= ev.best.m.stockouts));
    // recommendation never worse than doing nothing
    assert.ok(ev.best.m.stockouts <= ev.A.m.stockouts && (ev.best.m.stockouts < ev.A.m.stockouts || ev.best.m.sumShort <= ev.A.m.sumShort + 1e-9));
  }
});

test('demo is reproducible and uses engine outputs', () => {
  const a = E.runDemo(DEFAULT()), b = E.runDemo(DEFAULT());
  assert.deepEqual(clone(a.steps), clone(b.steps));
  assert.deepEqual([a.base.stockouts, a.dis.stockouts, a.rec.stockouts], [b.base.stockouts, b.dis.stockouts, b.rec.stockouts]);
  const ev = E.evaluatePlans(Object.assign(DEFAULT(), E.DEMO));
  assert.equal(a.recKey, ev.best.key); assert.equal(a.rec.stockouts, ev.best.m.stockouts); assert.equal(a.dis.stockouts, ev.A.m.stockouts);
  assert.ok(a.dis.stockouts >= a.base.stockouts, 'disruption is not better than baseline');
  assert.ok(a.rec.stockouts <= a.dis.stockouts, 'recommendation is not worse than no action');
});

test('dashboard counts match the deadlines rows', () => {
  for (const st of SCENARIOS) {
    const sc = E.statusCounts(st), rows = Object.keys(FSI.ITEMS).flatMap(k => E.decisionClock(st, k));
    const count = s => rows.filter(r => r.status === s).length;
    assert.equal(sc.actNow, count('now') + count('late')); assert.equal(sc.counts.soon, count('soon')); assert.equal(sc.counts.plan, count('plan'));
    assert.equal(sc.rows.length, E.POSTS.length * 4);
    E.POSTS.forEach(n => { const all = rows.filter(r => r.n.id === n.id); assert.equal(all.every(r => r.status === 'covered'), sc.byPost[n.id].every(r => r.status === 'covered')); });
  }
});

test('baseline vs intervention: plan A equals the plain simulation; baseline is undisrupted', () => {
  for (const st of SCENARIOS) {
    const ev = E.evaluatePlans(st), plain = E.metrics(E.simulate(st, {}), 0);
    assert.equal(ev.A.m.stockouts, plain.stockouts); assert.equal(ev.A.m.sumShort, plain.sumShort);
    const base = E.baselineState(st); assert.equal(base.delay, 0); assert.equal(base.routeOut, false);
  }
});

test('deadlines are possible: order times come before the cautious stock-out and after earliest start', () => {
  for (const st of SCENARIOS) for (const item of Object.keys(FSI.ITEMS)) E.decisionClock(st, item).forEach(r => r.opts.filter(o => o.ok).forEach(o => {
    assert.ok(o.actBy + o.lead <= r.r.Yc + 1e-9, `${r.n.id} ${o.key}`); assert.ok(o.actBy >= o.earliest - 1e-9);
  }));
});

test('winter plan: weekly slots add up to capacity; loads cover the gap', () => {
  const wp = E.winterPlan(DEFAULT());
  const slots = wp.weeks.reduce((a, w) => a + Object.values(w.alloc).reduce((x, y) => x + y, 0) + w.spare, 0);
  assert.equal(slots, wp.cap);
  wp.rows.forEach(r => assert.ok(r.loads * FSI.CONFIG.truckT >= r.gap - 1e-9));
  assert.equal(wp.short, wp.totLoads - wp.cap);
});

test('SITREP: parsed values are applied as a patch, data quality reflects gaps', () => {
  const st = DEFAULT(), p = E.parseSitrep('SITREP HER 190600 F600 R2900', st);
  assert.ok(p.ok); assert.ok(p.flagged.includes('F'));
  const patch = E.applySitrep(st, p), st2 = Object.assign({}, st, patch);
  assert.equal(E.nodeVals(st2, E.BYID.P3, 'F').s, 600);
  assert.equal(E.nodeVals(st, E.BYID.P3, 'F').s, E.nodeVals(DEFAULT(), E.BYID.P3, 'F').s, 'original state untouched');
  const dq = E.dataQuality(st2, 'P3'); assert.notEqual(dq.level, 'good'); // medical and spares missing, fuel count flagged
  assert.ok(!E.parseSitrep('SITREP XYZ 190600 F1', st).ok);
  assert.ok(!E.parseSitrep('SITREP KES 999999 F1', st).ok);
});

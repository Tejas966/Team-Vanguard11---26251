/* App shell: shared state, persistence, router, scenario bar. */
(function () {
  const E = FSI.engine, ui = FSI.ui, { ITEMS } = FSI;
  const KEY = 'fsi_state_v1';
  const DEFAULT = () => ({
    item: 'F', source: 'DB', delay: 3, cons: 0, short: 0, inv: 0, routeOut: false, planB: 'reroute', prio: 'balanced',
    ovr: {}, reports: JSON.parse(JSON.stringify(FSI.REPORTS)), inbox: [], hist: [], decisions: [],
    winterZ: 1.6449, winterW: 120, clockItem: null, focus: null,
  });
  let st = DEFAULT();
  try { const saved = JSON.parse(localStorage.getItem(KEY) || 'null'); if (saved) st = Object.assign(DEFAULT(), saved, { focus: null }); } catch (e) { /* storage blocked: run with defaults */ }
  FSI.state = st;
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { } };

  const PAGES = {
    overview: ['Command overview', 'Where the sector stands and which decisions are due first'],
    clock: ['Decision Clock', 'Latest time to act, per post and per option'],
    reports: ['Field reports', 'Low-bandwidth SITREPs and how fresh each figure is'],
    whatif: ['What-If simulator', 'Normal vs delayed delivery for one node'],
    ripple: ['Ripple-effect analyzer', 'How one disruption spreads through the network'],
    stress: ['Stress test & plans', 'Plan A vs Plan B under disruption'],
    winter: ['Winter stocking', 'Can we push enough up before the pass closes?'],
    brief: ["Commander's brief", 'One printable page from the current scenario'],
    methods: ['Methods & data', 'Calculations, rules, references and the demo dataset'],
  };
  const route = () => { const r = (location.hash.replace(/^#\/?/, '') || 'overview').split('?')[0]; return PAGES[r] ? r : 'overview'; };

  function scenarioBar() {
    const it = ITEMS[st.item], src = E.BYID[st.source];
    const c = (on, bad, t) => `<span class="chip ${bad ? 'bad' : on ? 'on' : ''}">${t}</span>`;
    ui.$('#scbar').innerHTML = `<span class="lbl">SHARED SCENARIO</span>${c(1, 0, 'Class: ' + it.name)}${c(1, 0, 'Source: ' + src.name)}${c(0, st.delay, `Delay +${st.delay} d`)}${c(0, st.cons, `Use ${st.cons >= 0 ? '+' : ''}${st.cons}%`)}${c(0, st.short, `Incoming −${st.short}%`)}${c(0, st.inv, `Stock −${st.inv}%`)}${c(0, st.routeOut, 'Route-1 ' + (st.routeOut ? 'CLOSED' : 'open'))}${Object.keys(st.ovr).length ? c(1, 0, Object.keys(st.ovr).length + ' figure(s) updated') : ''}
      <span style="flex:1"></span><button type="button" class="btn sm" id="clearScn">Clear disruption</button><button type="button" class="btn sm" id="resetDemo" title="Restore the original demo data">Reset demo</button>`;
    ui.$('#clearScn').onclick = () => FSI.set({ delay: 0, cons: 0, short: 0, inv: 0, routeOut: false });
    ui.$('#resetDemo').onclick = () => { st = DEFAULT(); FSI.state = st; save(); render(true); };
  }

  let lastRoute = null;
  function render(force) {
    const r = route(), changed = r !== lastRoute; lastRoute = r;
    ui.$('#pageTitle').textContent = PAGES[r][0]; ui.$('#pageSub').textContent = PAGES[r][1];
    document.title = PAGES[r][0] + ' · Forward Supply Intelligence';
    ui.$$('#nav a').forEach(a => a.getAttribute('href') === '#/' + r ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
    ui.$('#itemSel').value = st.item;
    ui.$('#dtg').textContent = 'As of ' + ui.when(0);
    scenarioBar();
    const y = window.scrollY, root = ui.$('#view');
    try { FSI.views[r](root, st); }
    catch (err) { console.error(err); root.innerHTML = `<div class="panel"><div class="pb"><b>Something went wrong on this page.</b><p class="note">${ui.esc(err.message)}</p><button class="btn" onclick="localStorage.removeItem('${KEY}');location.reload()">Reset demo data</button></div></div>`; }
    if (changed || force) { window.scrollTo(0, 0); if (changed && lastRoute) root.focus({ preventScroll: true }); } else window.scrollTo(0, y);
  }

  FSI.set = (patch, opts) => {
    Object.assign(st, patch); save();
    if (!(opts && opts.quiet)) render();
  };
  FSI.logDecision = d => {
    d.at = new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    FSI.set({ decisions: (st.decisions || []).concat([d]).slice(-30) });
  };
  FSI.acceptSitrep = p => {
    const ovr = Object.assign({}, st.ovr), n = p.post;
    if (p.str != null) Object.keys(ITEMS).forEach(k => { const key = E.ovKey(n.id, k); ovr[key] = Object.assign({}, ovr[key], { c: E.baseCons(n, k) * p.str / n.troops }); });
    Object.entries(p.values).forEach(([k, v]) => { const key = E.ovKey(n.id, k); ovr[key] = Object.assign({}, ovr[key], { s: v }); });
    const reports = Object.assign({}, st.reports, { [n.id]: { ageH: 0, via: 'SITREP' } });
    const msg = { raw: p.raw, at: new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }), status: p.warns.length ? 'flagged' : 'accepted',
      note: p.warns.length ? p.warns.join(' · ') : `${n.name} figures updated; report age reset` };
    FSI.set({ ovr, reports, inbox: [msg].concat(st.inbox || []).slice(0, 40) });
  };
  FSI.rejectSitrep = p => {
    const msg = { raw: p.raw, at: new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }), status: 'rejected', note: p.errors.join(' · ') };
    FSI.set({ inbox: [msg].concat(st.inbox || []).slice(0, 40) });
  };

  // live labels while a slider is being dragged (state commits on release)
  document.addEventListener('input', e => {
    const el = e.target; if (el.type !== 'range' || !el.dataset.fmt) return;
    const v = +el.value, out = el.parentElement.querySelector('output');
    if (out) out.textContent = { delay: `+${v} d`, pct: `${v >= 0 ? '+' : ''}${v}%`, plain: `${v}%`, neg: `−${v}%` }[el.dataset.fmt];
  });

  ui.$('#itemSel').innerHTML = Object.entries(ITEMS).map(([k, v]) => `<option value="${k}">${v.name} (${v.unit})</option>`).join('');
  ui.$('#itemSel').onchange = e => FSI.set({ item: e.target.value, clockItem: e.target.value });
  const side = ui.$('#side'), mb = ui.$('#menuBtn');
  mb.onclick = () => { const o = side.classList.toggle('open'); mb.setAttribute('aria-expanded', o); };
  ui.$('#nav').addEventListener('click', e => { if (e.target.closest('a')) { side.classList.remove('open'); mb.setAttribute('aria-expanded', 'false'); } });
  window.addEventListener('hashchange', () => render());
  render(true);
})();

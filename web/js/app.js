/* App shell: shared state, persistence, router, scenario bar. */
(function () {
  const E = FSI.engine, ui = FSI.ui, { ITEMS } = FSI;
  const KEY = 'fsi_state_v2'; // v2: what-if edits are sandboxed; old saved overrides are discarded
  const DEFAULT = () => ({
    item: 'F', source: 'DB', delay: 3, cons: 0, short: 0, inv: 0, routeOut: false, planB: 'reroute', prio: 'balanced',
    ovr: {}, strength: {}, whatif: null, demo: false, replay: null, reports: JSON.parse(JSON.stringify(FSI.REPORTS)), inbox: [], hist: [], decisions: [],
    winterZ: 1.6449, winterW: 120, clockItem: null, focus: null,
  });
  let st = DEFAULT();
  try { const saved = JSON.parse(localStorage.getItem(KEY) || 'null'); if (saved) st = Object.assign(DEFAULT(), saved, { focus: null }); } catch (e) { /* storage blocked: run with defaults */ }
  FSI.state = st;
  FSI.DEFAULT = DEFAULT;
  FSI.wx.freeze(!!st.demo);
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { } };

  const PAGES = {
    overview: ['Today', 'What needs doing, where, and by when'],
    map: ['Sector map', 'Click a post to see its supplies and next action'],
    clock: ['Action deadlines', 'The latest time to act, for every post and supply'],
    reports: ['Field reports', 'Low-bandwidth SITREPs and how fresh each figure is'],
    whatif: ['What-if: one delay', 'Normal vs delayed delivery for one node'],
    ripple: ['Knock-on effects', 'How one disruption spreads through the network'],
    stress: ['Compare plans', 'Plan A vs Plan B under disruption'],
    weather: ['Weather (real data)', 'Open-Meteo forecast and history driving demand and flying days'],
    winter: ['Advance Winter Stocking', 'Can we push enough up before the pass closes?'],
    brief: ["Commander's brief", 'One printable page from the current scenario'],
    methods: ['How it works', 'Calculations, rules, references and the demo dataset'],
  };
  const route = () => { const r = (location.hash.replace(/^#\/?/, '') || 'overview').split('?')[0]; return PAGES[r] ? r : 'overview'; };

  const TOOLS = ['whatif', 'ripple', 'stress', 'weather', 'methods'];
  function scenarioBar() {
    const bar = ui.$('#scbar'), r = route(), active = st.delay || st.cons || st.short || st.inv || st.routeOut || st.wxStorm;
    if (!TOOLS.includes(r)) {
      bar.className = active ? 'banner' : ''; bar.style.display = active ? '' : 'none';
      if (active) {
        const parts = [st.demo ? 'DEMO (weather snapshot)' : '', st.delay ? `${E.BYID[st.source].name} resupply late by ${st.delay} day${st.delay > 1 ? 's' : ''}` : '', st.routeOut ? 'Route-1 via Pass-1 closed' : '', st.cons ? `use ${st.cons > 0 ? 'up' : 'down'} ${Math.abs(st.cons)}%` : '', st.inv ? `stock ${st.inv}% lower` : '', st.short ? `incoming loads ${st.short}% short` : '', st.wxStorm ? 'simulated snowstorm at W3' : ''].filter(Boolean);
        bar.innerHTML = `<span><b>Situation in use:</b> ${parts.join(' · ')}</span><a class="btn sm" href="#/stress">Change</a><button type="button" class="btn sm" id="clearScn">Clear</button>`;
        ui.$('#clearScn').onclick = () => st.demo ? FSI.resetAll() : FSI.set({ delay: 0, cons: 0, short: 0, inv: 0, routeOut: false, wxStorm: null });
      }
      return;
    }
    bar.className = 'scbar'; bar.style.display = '';
    const it = ITEMS[st.item], src = E.BYID[st.source];
    const c = (on, bad, t) => `<span class="chip ${bad ? 'bad' : on ? 'on' : ''}">${t}</span>`;
    bar.innerHTML = `<span class="lbl">SHARED SCENARIO</span>${c(1, 0, 'Class: ' + it.name)}${c(1, 0, 'Source: ' + src.name)}${c(0, st.delay, `Delay +${st.delay} d`)}${c(0, st.cons, `Use ${st.cons >= 0 ? '+' : ''}${st.cons}%`)}${c(0, st.short, `Incoming −${st.short}%`)}${c(0, st.inv, `Stock −${st.inv}%`)}${c(0, st.routeOut, 'Route-1 ' + (st.routeOut ? 'CLOSED' : 'open'))}${Object.keys(st.ovr).length ? c(1, 0, Object.keys(st.ovr).length + ' figure(s) updated') : ''}${st.wxStorm ? c(0, 1, 'Simulated storm at W3, day 1–4') : ''}
      <span style="flex:1"></span><button type="button" class="btn sm" id="clearScn">Clear disruption</button><button type="button" class="btn sm" id="resetDemo" title="Restore the original demo data">Reset demo</button>`;
    ui.$('#clearScn').onclick = () => FSI.set({ delay: 0, cons: 0, short: 0, inv: 0, routeOut: false, wxStorm: null });
    ui.$('#resetDemo').onclick = () => FSI.resetAll();
  }

  let lastRoute = null;
  function render(force) {
    const r = route(), changed = r !== lastRoute; lastRoute = r;
    ui.$('#pageTitle').textContent = PAGES[r][0]; ui.$('#pageSub').textContent = PAGES[r][1];
    document.title = PAGES[r][0] + ' · Forward Supply Intelligence';
    ui.$$('#nav a').forEach(a => a.getAttribute('href') === '#/' + r ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
    if (TOOLS.includes(r)) ui.$('#tools').open = true;
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
    ui.announce(`Approved for ${d.post} · ${d.item}: ${d.option}.`);
  };
  FSI.acceptSitrep = p => {
    const patch = E.applySitrep(st, p), n = p.post;
    const msg = { raw: p.raw, at: new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }), status: p.warns.length ? 'flagged' : 'accepted',
      note: p.warns.length ? p.warns.join(' · ') : `${n.name} figures updated; report age reset` };
    FSI.set(Object.assign(patch, { inbox: [msg].concat(st.inbox || []).slice(0, 40) }));
    ui.announce(`Report accepted for ${n.name}${p.warns.length ? ', flagged: check the count' : ''}.`);
  };
  // Restores the exact original baseline (also used by "Reset demo").
  FSI.resetAll = () => { st = DEFAULT(); FSI.state = st; FSI.demoResult = null; FSI.demoStep = 0; FSI.wx.freeze(false); save(); render(true); };
  // One-click demo: fixed scenario, frozen weather snapshot, every number from the engine.
  FSI.startDemo = () => {
    st = DEFAULT(); FSI.state = st; FSI.wx.freeze(true);
    const d = E.runDemo(st); FSI.demoResult = d;
    Object.assign(st, d.patch, { demo: true, replay: { title: 'Demo: Pass-1 closed by snow', at: new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }), snapshot: d.snapshot, steps: d.steps } });
    save(); scenarioBar();
    return d;
  };
  FSI.rejectSitrep = p => {
    const msg = { raw: p.raw, at: new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }), status: 'rejected', note: p.errors.join(' · ') };
    FSI.set({ inbox: [msg].concat(st.inbox || []).slice(0, 40) });
    ui.announce(`Report rejected: ${p.errors.join('; ')}.`);
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
  FSI.wx.refresh(() => render());
})();

/* "Today": the home page for a duty officer. What needs doing, where, and by when.
   Also hosts the one-click demo, whose timeline is generated from engine results. */
(function () {
  const E = FSI.engine, ui = FSI.ui, { ITEMS } = FSI, { fmt, esc } = ui;
  let demoTimer = null;

  function demoPanel(st) {
    const d = FSI.demoResult, shown = FSI.demoStep || 0;
    if (!d) return `<div class="panel demo-p"><div class="pb demo-row"><div><b>See it work in 60 seconds</b><span>Loads a fixed scenario (Pass-1 closed by snow), re-projects stock, finds affected posts, evaluates every option and compares the outcomes. Numbers come from the engine; the demo uses the bundled weather snapshot so each run is identical.</span></div>
      <button type="button" class="btn primary" id="runDemo">▶ Run demo scenario</button></div></div>`;
    const row = (l, f) => `<tr><td>${l}</td><td class="n">${f(d.base)}</td><td class="n">${f(d.dis)}</td><td class="n"><b>${f(d.rec)}</b></td></tr>`;
    return `<div class="panel demo-p"><div class="ph"><h3>Demo scenario · Pass-1 closed by snow</h3><span class="hint">weather snapshot ${esc(d.snapshot)} · repeatable</span>
        <button type="button" class="btn sm" id="runDemo">Run again</button><button type="button" class="btn sm" id="resetDemo2">Reset demo</button></div>
      <div class="pb"><ol class="tl-steps">${d.steps.map((s, i) => `<li class="${i < shown ? 'done' : i === shown ? 'cur' : ''}"><b>${i + 1}. ${esc(s.t)}</b>${i < shown ? `<span>${esc(s.d)}</span>` : ''}</li>`).join('')}</ol>
      ${shown >= d.steps.length ? `<div class="scroll"><table class="t"><thead><tr><th>${ITEMS[E.DEMO.item].name}</th><th class="n">Baseline</th><th class="n">Disrupted, no action</th><th class="n">With: ${esc(d.recName)}</th></tr></thead><tbody>
        ${row('Posts short in 14 days', m => m.stockouts)}${row('Shortage (post-days)', m => fmt(m.sumShort, 1))}${row('Shortage volume (L)', m => fmt(m.shortUnits))}${row('First stock-out', m => m.firstOut == null ? 'none' : 'day ' + fmt(m.firstOut, 1))}${row('Extra cost (₹ lakh, illustrative)', m => fmt(m.cost, 1))}
        </tbody></table></div>${FSI.whyPlanBox(Object.assign({}, st, { prio: E.DEMO.prio }), d.ev)}
        <p class="note">The demo situation is now applied to every page (see the yellow banner). Open <a href="#/stress">Compare plans</a> or <a href="#/clock">Action deadlines</a> to explore it, or Reset demo to return to the original data.</p>` : ''}</div></div>`;
  }

  FSI.views.overview = (root, st) => {
    const sc = E.statusCounts(st), order = sc.order;
    const rows = sc.rows.filter(r => r.status !== 'covered').sort((a, b) => order[a.status] - order[b.status] || a.actBy - b.actBy);
    const ws = FSI.weatherSummary(), wp = E.winterPlan(st), stale = E.POSTS.filter(p => E.freshness(st, p.id) === 'stale');
    const done = (n, it) => (st.decisions || []).filter(d => d.post === n.name && d.item === ITEMS[it].name).pop();
    root.innerHTML = `
      ${demoPanel(st)}
      <div class="metrics">
        <div class="metric metric--status critical"><b class="v">${sc.actNow}</b><span class="l">Act now<small>within 24 h, or too late</small></span></div>
        <div class="metric metric--status warning"><b class="v">${sc.counts.soon}</b><span class="l">Act soon<small>within 3 days</small></span></div>
        <div class="metric metric--status info"><b class="v">${sc.counts.plan}</b><span class="l">Plan ahead<small>more than 3 days</small></span></div>
        <div class="metric metric--status healthy"><b class="v">${sc.postsOk}<small>/ ${E.POSTS.length}</small></b><span class="l">Posts fully OK<small>every supply lasts</small></span></div>
      </div>
      <p class="note" style="margin:-4px 0 10px">Counts are post × supply decisions from the Action deadlines page (same calculation).</p>
      <div class="grid today-main">
        <div class="panel"><div class="ph"><h3>What needs doing</h3><a class="hint" href="#/clock">All deadlines →</a></div>
          <div class="pb" style="padding-top:4px">${rows.length ? rows.slice(0, 6).map(r => {
            const d = done(r.n, r.item);
            return `<div class="acard ${r.status}">
              <div class="ac-top">${ui.statusTag(r.status)}<b>${esc(r.n.name)}</b><span>· ${ITEMS[r.item].name}</span>${FSI.dqTag(E.dataQuality(st, r.n.id))}</div>
              <p>${FSI.actionSentence(r)}</p>
              <div class="ac-btn">${d ? `<span class="logged">✓ Approved ${esc(d.at)}: ${esc(d.option)}</span>` : r.first ? `<button type="button" class="btn primary sm" data-ok="${r.n.id}|${r.item}|${r.first.key}">Approve</button>` : ''}
                <a class="btn sm" href="#/map" data-sel="${r.n.id}">Show on map</a><a class="btn sm" href="#/clock" data-focus="${r.n.id}|${r.item}">Options</a></div>
              ${FSI.whyBox(st, r)}</div>`; }).join('')
              + (rows.length > 6 ? `<p class="note"><a href="#/clock">${rows.length - 6} more on the Action deadlines page →</a></p>` : '')
            : '<p class="empty">Nothing to do. Every post has enough of every supply until its next delivery.</p>'}</div></div>
        <div class="panel"><div class="ph"><h3>Sector map</h3><a class="hint" href="#/map">Full map →</a></div>
          <svg class="fluid" id="tMap" viewBox="0 0 820 470" role="img" aria-label="Sector map"></svg>${FSI.mapLegend()}</div>
      </div>
      <div class="grid today-low">
        <a class="mini" href="#/weather"><b>Weather · next 7 days</b><span>Coldest: ${esc(ws.coldest.n.name)}, about ${fmt(ws.coldest.t, 0)} °C. Snow: ${ws.snow.filter(x => x.cm >= 1).map(x => x.c.id).join(', ') || 'none forecast'}. No-fly days: ${ws.noFly.reduce((a, x) => a + x.days.length, 0) || 'none'}.</span></a>
        <a class="mini ${wp.short > 0 ? 'bad' : ''}" href="#/winter"><b>Winter stocking</b><span>${wp.short > 0 ? `${wp.short} truckloads short before Pass-1 closes (~${wp.early} days).` : `On track before Pass-1 closes (~${wp.early} days).`}</span></a>
        <a class="mini ${stale.length ? 'bad' : ''}" href="#/reports"><b>Stock reports</b><span>${stale.length ? `${stale.map(p => p.name).join(', ')}: no report for over 3 days. Ask for a SITREP.` : 'All posts reported in the last 3 days.'}</span></a>
      </div>`;
    FSI.drawMap(ui.$('#tMap'), st, { onPick: id => { FSI.set({ mapSel: id }, { quiet: true }); location.hash = '#/map'; } });
    root.querySelectorAll('[data-ok]').forEach(b => b.onclick = () => {
      const [pid, item, key] = b.dataset.ok.split('|'), row = sc.rows.find(r => r.n.id === pid && r.item === item), o = row.opts.find(x => x.key === key);
      FSI.logDecision({ post: E.BYID[pid].name, item: ITEMS[item].name, option: o.label, actBy: ui.when(o.actBy) });
    });
    root.querySelectorAll('[data-sel]').forEach(a => a.onclick = () => FSI.set({ mapSel: a.dataset.sel }, { quiet: true }));
    root.querySelectorAll('[data-focus]').forEach(a => a.onclick = () => { const [pid, item] = a.dataset.focus.split('|'); FSI.set({ focus: pid, clockItem: item }, { quiet: true }); });
    const rd = ui.$('#runDemo'); if (rd) rd.onclick = () => {
      clearInterval(demoTimer);
      FSI.startDemo();                     // applies the fixed scenario and computes every step
      FSI.demoStep = 0; FSI.views.overview(ui.$('#view'), FSI.state);
      demoTimer = setInterval(() => {
        FSI.demoStep++;
        if (location.hash.replace(/^#\/?/, '') !== 'overview' && location.hash !== '') { clearInterval(demoTimer); FSI.demoStep = FSI.demoResult.steps.length; return; }
        FSI.views.overview(ui.$('#view'), FSI.state);
        if (FSI.demoStep >= FSI.demoResult.steps.length) clearInterval(demoTimer);
      }, 900);
    };
    const r2 = ui.$('#resetDemo2'); if (r2) r2.onclick = () => { clearInterval(demoTimer); FSI.resetAll(); };
  };
})();

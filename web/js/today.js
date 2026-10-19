/* "Today": the home page for a duty officer. What needs doing, where, and by when. */
(function () {
  const E = FSI.engine, ui = FSI.ui, { ITEMS } = FSI, { fmt, esc } = ui;
  const LEVEL = { late: 0, now: 0, soon: 1, plan: 2, covered: 3 };

  FSI.views.overview = (root, st) => {
    const status = FSI.postStatus(st);
    const rows = Object.values(status).flatMap(s => s.items).filter(r => r.status !== 'covered')
      .sort((a, b) => LEVEL[a.status] - LEVEL[b.status] || a.actBy - b.actBy);
    const nNow = rows.filter(r => r.status === 'now' || r.status === 'late').length, nSoon = rows.filter(r => r.status === 'soon').length;
    const okPosts = Object.values(status).filter(s => s.status === 'covered' || s.status === 'plan').length;
    const ws = FSI.weatherSummary(), wp = E.winterPlan(st), stale = E.POSTS.filter(p => E.freshness(st, p.id) === 'stale');
    const done = (n, it) => (st.decisions || []).filter(d => d.post === n.name && d.item === ITEMS[it].name).pop();

    root.innerHTML = `
      <div class="tiles3">
        <div class="big red"><b>${nNow}</b><span>Act now<br><small>within 24 hours</small></span></div>
        <div class="big amber"><b>${nSoon}</b><span>Act soon<br><small>within 3 days</small></span></div>
        <div class="big green"><b>${okPosts}<small>/ ${E.POSTS.length}</small></b><span>Posts OK<br><small>all supplies last</small></span></div>
      </div>
      <div class="grid today-main">
        <div class="panel"><div class="ph"><h3>What needs doing</h3><a class="hint" href="#/clock">All deadlines →</a></div>
          <div class="pb" style="padding-top:4px">${rows.length ? rows.slice(0, 6).map(r => {
            const d = done(r.n, r.item);
            return `<div class="acard ${r.status}">
              <div class="ac-top">${ui.statusTag(r.status)}<b>${esc(r.n.name)}</b><span>· ${ITEMS[r.item].name}</span></div>
              <p>${FSI.actionSentence(r)}</p>
              <div class="ac-btn">${d ? `<span class="logged">✓ Approved ${esc(d.at)}: ${esc(d.option)}</span>` : r.first ? `<button type="button" class="btn primary sm" data-ok="${r.n.id}|${r.item}|${r.first.key}">Approve</button>` : ''}
                <a class="btn sm" href="#/map" data-sel="${r.n.id}">Show on map</a><a class="btn sm" href="#/clock" data-focus="${r.n.id}|${r.item}">Options</a></div></div>`; }).join('')
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
    FSI.drawMap(ui.$('#tMap'), st, { status, onPick: id => { FSI.set({ mapSel: id }, { quiet: true }); location.hash = '#/map'; } });
    root.querySelectorAll('[data-ok]').forEach(b => b.onclick = () => {
      const [pid, item, key] = b.dataset.ok.split('|'), row = status[pid].items.find(r => r.item === item), o = row.opts.find(x => x.key === key);
      FSI.logDecision({ post: E.BYID[pid].name, item: ITEMS[item].name, option: o.label, actBy: ui.when(o.actBy) });
    });
    root.querySelectorAll('[data-sel]').forEach(a => a.onclick = () => FSI.set({ mapSel: a.dataset.sel }, { quiet: true }));
    root.querySelectorAll('[data-focus]').forEach(a => a.onclick = () => { const [pid, item] = a.dataset.focus.split('|'); FSI.set({ focus: pid, clockItem: item }, { quiet: true }); });
  };
})();

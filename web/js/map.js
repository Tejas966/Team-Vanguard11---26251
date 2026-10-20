/* Sector map + per-post status in plain language. Fictional, schematic geography. */
(function () {
  const E = FSI.engine, ui = FSI.ui, { ITEMS, NODES } = FSI, { fmt, esc } = ui;
  const KEYS = Object.keys(ITEMS);
  const LEVEL = { late: 0, now: 0, soon: 1, plan: 2, covered: 3 };
  const WORD = { late: 'TOO LATE', now: 'ACT NOW', soon: 'ACT SOON', plan: 'PLAN AHEAD', covered: 'OK' };
  const COLOR = { late: ui.tok('--status-critical'), now: ui.tok('--status-critical'), soon: ui.tok('--status-warning'), plan: ui.tok('--navy-500'), covered: ui.tok('--status-healthy') }; // same tiers as Today
  const ICON = { late: '✕', now: '!', soon: '!', plan: 'i', covered: '✓' };
  FSI.STATUS = { WORD, COLOR, ICON };
  ui.statusTag = s => ui.tag({ late: 'red', now: 'red', soon: 'amber', plan: 'blue', covered: 'green' }[s], ICON[s], WORD[s]);

  // Every post, all four supply classes, worst first.
  FSI.postStatus = st => {
    const rows = E.statusCounts(st).rows; // same rows as Today and Action deadlines
    const out = {};
    E.POSTS.forEach(n => {
      const items = rows.filter(r => r.n.id === n.id).sort((a, b) => LEVEL[a.status] - LEVEL[b.status] || a.actBy - b.actBy);
      const worst = items[0];
      out[n.id] = { n, items, worst, status: worst.status, minDays: Math.min(...items.map(r => r.r.Y)) };
    });
    return out;
  };
  // One plain sentence for an action card.
  FSI.actionSentence = row => {
    const it = ITEMS[row.item];
    if (row.status === 'covered') return `${it.name}: enough until the next delivery (${ui.when(row.r.A)}).`;
    if (row.status === 'late') return `${it.name} runs out around ${ui.when(row.r.Yc)} and no option reaches the post in time. Cut use and request the fastest relief.`;
    return `${row.first.label} by <b>${ui.when(row.first.actBy)}</b> (${ui.rel(row.first.actBy)}).`;
  };

  // Terrain: fictional ridges drawn as filled elevation bands.
  const PEAKS = [[270, 215, 7, 1], [130, 60, 6, 2], [700, 290, 4, 3], [470, 10, 5, 4], [40, 270, 4, 5], [760, 110, 4, 6]];
  const BAND = [ui.tok('--map-band-1'), ui.tok('--map-band-2'), ui.tok('--map-band-3'), ui.tok('--map-band-4'), ui.tok('--map-band-5'), ui.tok('--map-snow-1'), ui.tok('--map-snow-2')];
  function terrain(svg) {
    ui.svg('rect', { width: 820, height: 470, fill: ui.tok('--map-ground') }, svg);
    PEAKS.forEach(([cx, cy, n, s]) => {
      for (let i = n; i >= 1; i--) {
        let d = ''; const r0 = i * 19;
        for (let a = 0; a <= 56; a++) {
          const t = a / 56 * Math.PI * 2, rr = r0 * (1 + 0.17 * Math.sin(3 * t + s) + 0.09 * Math.sin(5 * t + 2 * s));
          d += (a ? 'L' : 'M') + (cx + rr * Math.cos(t) * 1.35).toFixed(1) + ' ' + (cy + rr * Math.sin(t)).toFixed(1);
        }
        const k = n - i; // 0 = outer band
        ui.svg('path', { d: d + 'Z', fill: k >= n - 1 && n >= 5 ? BAND[6] : k >= n - 2 && n >= 5 ? BAND[5] : BAND[Math.min(4, k)], stroke: ui.tok('--map-contour'), 'stroke-width': 0.6 }, svg);
      }
    });
    // river along the valley (fictional)
    ui.svg('path', { d: 'M0 445 C120 438, 200 400, 300 395 S470 380, 560 410 S720 450, 820 452', fill: 'none', stroke: ui.tok('--map-river'), 'stroke-width': 4, 'stroke-linecap': 'round' }, svg);
  }

  FSI.drawMap = (svg, st, opts) => {
    opts = opts || {};
    const status = opts.status || FSI.postStatus(st), sel = opts.selected, by = E.BYID, P = FSI.PASSES;
    svg.innerHTML = '';
    terrain(svg);
    const road = (pts, o) => {
      const d = pts.map((p, i) => (i ? 'L' : 'M') + p.x + ' ' + p.y).join('');
      ui.svg('path', { d, fill: 'none', stroke: ui.tok('--panel'), 'stroke-width': (o.w || 3) + 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg);
      ui.svg('path', { d, fill: 'none', stroke: o.c || ui.tok('--map-road'), 'stroke-width': o.w || 3, 'stroke-dasharray': o.dash || 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg);
    };
    const cut = st.routeOut;
    road([by.DA.map, P.P2, by.DB.map], { c: ui.tok('--map-route2'), w: 2, dash: '7 6' });                          // Route-2 (light vehicles)
    road([by.DA.map, P.P1, by.DB.map], { c: cut ? ui.tok('--status-critical') : ui.tok('--map-road'), w: 4, dash: cut ? '4 6' : null }); // Route-1
    road([by.DA.map, by.TH.map], { c: ui.tok('--map-road'), w: 4 });
    E.POSTS.forEach(n => road([by[n.parent].map, n.map], { c: ui.tok('--map-track'), w: 2, dash: n.lastMile ? '2 5' : null }));
    // passes
    Object.entries(P).forEach(([k, p]) => {
      const closed = k === 'P1' && cut, g = ui.svg('g', { transform: `translate(${p.x},${p.y})` }, svg);
      ui.svg('path', { d: 'M-11 8 L0 -11 L11 8Z', fill: closed ? ui.tok('--status-critical') : ui.tok('--panel'), stroke: closed ? ui.tok('--status-critical') : ui.tok('--ink'), 'stroke-width': 1.6 }, g);
      const txt = p.label + (closed ? ' · CLOSED' : k === 'P2' ? ' · light vehicles' : ' · open');
      ui.svg('rect', { x: 15, y: -9, width: txt.length * 6.4 + 10, height: 18, rx: 2, fill: closed ? ui.tok('--status-critical-bg') : ui.tok('--panel'), 'fill-opacity': closed ? 1 : 0.9, stroke: closed ? ui.tok('--status-critical-border') : ui.tok('--line-2') }, g);
      ui.svg('text', { x: 20, y: 4, 'font-size': 11, 'font-family': 'IBM Plex Mono', 'font-weight': 600, fill: closed ? ui.tok('--status-critical-ink') : ui.tok('--ink') }, g).textContent = txt;
    });
    // depots
    NODES.filter(n => n.type === 'depot').forEach(n => {
      const g = ui.svg('g', { transform: `translate(${n.map.x},${n.map.y})` }, svg);
      ui.svg('rect', { x: -11, y: -11, width: 22, height: 22, fill: ui.tok('--navy-700'), stroke: ui.tok('--panel'), 'stroke-width': 2 }, g);
      ui.svg('text', { y: 4, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, fill: ui.tok('--panel'), 'font-family': 'IBM Plex Mono' }, g).textContent = 'D';
      const left = n.labelLeft || n.map.x > 660;
      ui.svg('text', { x: left ? -16 : 16, y: -2, 'text-anchor': left ? 'end' : 'start', 'font-size': 12, 'font-weight': 600, 'font-family': 'IBM Plex Sans', fill: ui.tok('--ink'), 'paint-order': 'stroke', stroke: ui.tok('--map-ground'), 'stroke-width': 3 }, g).textContent = n.name;
      ui.svg('text', { x: left ? -16 : 16, y: 11, 'text-anchor': left ? 'end' : 'start', 'font-size': 10, 'font-family': 'IBM Plex Mono', fill: ui.tok('--ink-2'), 'paint-order': 'stroke', stroke: ui.tok('--map-ground'), 'stroke-width': 3 }, g).textContent = n.role.split(' (')[0];
    });
    // posts: big status marker + label card
    E.POSTS.forEach(n => {
      const s = status[n.id], col = COLOR[s.status], isSel = sel === n.id, x = n.map.x, y = n.map.y;
      const g = ui.svg('g', { class: 'node', transform: `translate(${x},${y})`, tabindex: 0, role: 'button', 'aria-label': `${n.name}: ${WORD[s.status]}. Open details.` }, svg);
      if (isSel) ui.svg('circle', { r: 21, fill: 'none', stroke: ui.tok('--navy-700'), 'stroke-width': 3 }, g);
      ui.svg('circle', { r: 14, fill: col, stroke: ui.tok('--panel'), 'stroke-width': 3 }, g);
      ui.svg('text', { y: 5, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 700, fill: s.status === 'soon' ? ui.tok('--on-warning') : ui.tok('--panel'), 'font-family': 'IBM Plex Mono' }, g).textContent = ICON[s.status];
      const snow3 = [1, 2, 3].some(d => (FSI.wx.get(n.cell, 'snow', d).v || 0) >= 1);
      if (snow3) { // snowflake drawn as SVG so it does not depend on the font (DESIGN.md §7)
        const sf = ui.svg('g', { transform: 'translate(17,-15)', stroke: ui.tok('--navy-500'), 'stroke-width': 1.6, 'stroke-linecap': 'round', 'aria-hidden': 'true' }, g);
        [0, 60, 120].forEach(a => ui.svg('line', { x1: 0, y1: -6, x2: 0, y2: 6, transform: `rotate(${a})` }, sf));
      }
      const line2 = s.status === 'covered' ? `OK · ${fmt(s.minDays, 0)} d of stock` : s.status === 'plan' ? `${ITEMS[s.worst.item].short} · plan by ${ui.when(s.worst.first.actBy).replace(/^\w+, /, '')}` : s.status === 'late' ? `${ITEMS[s.worst.item].short} · TOO LATE` : `${ITEMS[s.worst.item].short} · act by ${ui.when(s.worst.first.actBy).replace(/^\w+, /, '')}`;
      const w = Math.max(n.name.length * 7.2, line2.length * 6.1) + 16, left = x + 22 + w > 815;
      const lx = left ? -22 - w : 22;
      const box = ui.svg('rect', { x: lx, y: -19, width: w, height: 36, rx: 3, fill: ui.tok('--panel'), stroke: isSel ? ui.tok('--navy-700') : col, 'stroke-width': isSel ? 2 : 1.2 }, g);
      const t1 = ui.svg('text', { x: lx + 8, y: -4, 'font-size': 12, 'font-weight': 600, 'font-family': 'IBM Plex Sans', fill: ui.tok('--ink') }, g); t1.textContent = n.name;
      const t2 = ui.svg('text', { x: lx + 8, y: 10, 'font-size': 10.5, 'font-family': 'IBM Plex Mono', fill: s.status === 'soon' ? ui.tok('--status-warning-ink') : s.status === 'covered' ? ui.tok('--status-healthy-ink') : s.status === 'plan' ? ui.tok('--navy-700') : ui.tok('--status-critical-ink') }, g); t2.textContent = line2;
      // Re-fit the label box to the rendered text (fonts may fall back offline); the estimate above is only a first guess.
      try {
        const mw = Math.max(t1.getBBox().width, t2.getBBox().width);
        if (mw > 0) { const w2 = mw + 16, l2 = x + 22 + w2 > 815, lx2 = l2 ? -22 - w2 : 22;
          box.setAttribute('width', w2); box.setAttribute('x', lx2); t1.setAttribute('x', lx2 + 8); t2.setAttribute('x', lx2 + 8); }
      } catch (e) { /* not rendered yet (hidden svg): keep the estimate */ }
      const pick = () => opts.onPick && opts.onPick(n.id);
      g.addEventListener('click', pick); g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
    });
    ui.svg('text', { x: 10, y: 462, 'font-size': 10, 'font-family': 'IBM Plex Mono', fill: ui.tok('--muted') }, svg).textContent = 'SCHEMATIC · NOT TO SCALE · FICTIONAL SITES · NO BORDERS SHOWN';
  };
  FSI.mapLegend = () => `<div class="maplegend">
    <span><i class="dot critical"></i>Act now</span><span><i class="dot warning"></i>Act soon (≤ 3 days)</span><span><i class="dot info"></i>Plan ahead</span><span><i class="dot healthy"></i>OK</span>
    <span><i class="sq"></i>Supply depot</span><span><i class="ln"></i>Main road</span><span><i class="ln dash"></i>Route-2, light vehicles</span><span><i class="ln dot2"></i>Porter / animal transport</span><span><svg class="ico" viewBox="-7 -7 14 14" width="13" height="13" aria-hidden="true"><g stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><line y1="-6" y2="6"/><line y1="-6" y2="6" transform="rotate(60)"/><line y1="-6" y2="6" transform="rotate(120)"/></g></svg> Snow forecast (3 days)</span></div>`;

  // Detail card for one post: all four supplies, next action, weather.
  FSI.postCard = (st, s) => {
    const n = s.n, rep = st.reports[n.id], fr = E.freshness(st, n.id);
    let t = 0; for (let d = 0; d < 3; d++) t += FSI.wx.postTemp(n, d); t /= 3;
    const fly = [1, 2, 3].map(d => FSI.wx.flyable(n.cell, d).ok);
    const act = s.items.find(r => r.status !== 'covered');
    return `<div class="pcard">
      <div class="pc-head"><div><b>${esc(n.name)}</b> ${FSI.dqTag(E.dataQuality(st, n.id))}<span>${fmt(n.alt)} ft · ${n.troops} personnel · supplied by ${E.BYID[n.parent].name}${n.lastMile ? ' + ' + n.lastMile : ''}</span></div>${ui.statusTag(s.status)}</div>
      <div class="pc-sec">Stock</div>
      ${s.items.map(r => { const it = ITEMS[r.item], days = r.r.Y, pct = Math.min(100, days / 14 * 100), col = COLOR[r.status];
        return `<div class="srow"><span class="sname">${it.short}</span><span class="sbar"><span style="width:${pct}%;background:${col}"></span></span><span class="sdays"><b>${fmt(days, 1)}</b> d</span>
          <span class="snote">${r.status === 'covered' ? 'OK until next delivery' : r.status === 'late' ? 'too late to resupply' : 'safe until ' + ui.when(r.r.Yc).replace(/^\w+, /, '')}</span></div>`; }).join('')}
      <div class="pc-sec">Next action</div>
      ${act ? `<p class="pc-act">${ui.statusTag(act.status)} ${FSI.actionSentence(act)}</p>${act.first ? `<button type="button" class="btn primary sm" data-approve="${n.id}|${act.item}|${act.first.key}">Approve: ${esc(act.first.label)}</button>` : ''} <a class="btn sm" href="#/clock" data-focus="${n.id}|${act.item}">All options</a>`
        : '<p class="pc-act">No action needed. Every supply lasts until its next delivery.</p>'}
      ${act ? FSI.whyBox(st, act) : ''}
      <div class="pc-sec">Conditions</div>
      <p class="pc-small">Night temperature about <b>${fmt(t, 0)} °C</b> (real forecast, adjusted for altitude). Air maintenance next 3 days: ${fly.map((f, i) => `${ui.dayDate(i + 1).toLocaleDateString('en-IN', { weekday: 'short' })} ${f ? '✓' : '✕'}`).join(' · ')}.<br>
      Last stock report ${rep.ageH} h ago by ${rep.via}${fr !== 'fresh' ? ` <b class="warn-text">(old, so figures are less certain)</b>` : ''}.</p>
    </div>`;
  };
  FSI.bindCard = (root, st, s) => {
    root.querySelectorAll('[data-approve]').forEach(b => b.onclick = () => {
      const [pid, item, key] = b.dataset.approve.split('|'), row = s.items.find(r => r.item === item), o = row.opts.find(x => x.key === key);
      FSI.logDecision({ post: E.BYID[pid].name, item: ITEMS[item].name, option: o.label, actBy: ui.when(o.actBy) });
    });
    root.querySelectorAll('[data-focus]').forEach(a => a.onclick = () => { const [pid, item] = a.dataset.focus.split('|'); FSI.set({ focus: pid, clockItem: item }, { quiet: true }); });
  };

  /* ===== Map page ===== */
  FSI.views.map = (root, st) => {
    const status = FSI.postStatus(st), sel = st.mapSel && status[st.mapSel] ? st.mapSel : Object.values(status).sort((a, b) => LEVEL[a.status] - LEVEL[b.status])[0].n.id;
    root.innerHTML = `<div class="grid map-main">
      <div class="panel"><svg class="fluid" id="bigMap" viewBox="0 0 820 470" role="img" aria-label="Sector map"></svg>${FSI.mapLegend()}</div>
      <div class="panel" id="card">${FSI.postCard(st, status[sel])}</div></div>`;
    FSI.drawMap(ui.$('#bigMap'), st, { status, selected: sel, onPick: id => FSI.set({ mapSel: id }) });
    FSI.bindCard(ui.$('#card'), st, status[sel]);
  };
})();

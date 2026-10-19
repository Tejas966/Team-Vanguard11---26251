/* Sector map + per-post status in plain language. Fictional, schematic geography. */
(function () {
  const E = FSI.engine, ui = FSI.ui, { ITEMS, NODES } = FSI, { fmt, esc } = ui;
  const KEYS = Object.keys(ITEMS);
  const LEVEL = { late: 0, now: 0, soon: 1, plan: 2, covered: 3 };
  const WORD = { late: 'TOO LATE', now: 'ACT NOW', soon: 'ACT SOON', plan: 'PLAN AHEAD', covered: 'OK' };
  const COLOR = { late: '#C62828', now: '#C62828', soon: '#E0A100', plan: '#2A5687', covered: '#2E9E4A' };
  const ICON = { late: '✕', now: '!', soon: '!', plan: 'i', covered: '✓' };
  FSI.STATUS = { WORD, COLOR, ICON };
  ui.statusTag = s => ui.tag({ late: 'red', now: 'red', soon: 'amber', plan: 'blue', covered: 'green' }[s], ICON[s], WORD[s]);

  // Every post, all four supply classes, worst first.
  FSI.postStatus = st => {
    const rows = KEYS.flatMap(k => E.decisionClock(st, k));
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
  const BAND = ['#E6ECE4', '#DCE4DA', '#D1DACF', '#C7D0C5', '#BEC6BC', '#E9EEF2', '#F6F8FA'];
  function terrain(svg) {
    ui.svg('rect', { width: 820, height: 470, fill: '#EFF3EE' }, svg);
    PEAKS.forEach(([cx, cy, n, s]) => {
      for (let i = n; i >= 1; i--) {
        let d = ''; const r0 = i * 19;
        for (let a = 0; a <= 56; a++) {
          const t = a / 56 * Math.PI * 2, rr = r0 * (1 + 0.17 * Math.sin(3 * t + s) + 0.09 * Math.sin(5 * t + 2 * s));
          d += (a ? 'L' : 'M') + (cx + rr * Math.cos(t) * 1.35).toFixed(1) + ' ' + (cy + rr * Math.sin(t)).toFixed(1);
        }
        const k = n - i; // 0 = outer band
        ui.svg('path', { d: d + 'Z', fill: k >= n - 1 && n >= 5 ? BAND[6] : k >= n - 2 && n >= 5 ? BAND[5] : BAND[Math.min(4, k)], stroke: '#C3CCC1', 'stroke-width': 0.6 }, svg);
      }
    });
    // river along the valley (fictional)
    ui.svg('path', { d: 'M0 445 C120 438, 200 400, 300 395 S470 380, 560 410 S720 450, 820 452', fill: 'none', stroke: '#9CC3E4', 'stroke-width': 4, 'stroke-linecap': 'round' }, svg);
  }

  FSI.drawMap = (svg, st, opts) => {
    opts = opts || {};
    const status = opts.status || FSI.postStatus(st), sel = opts.selected, by = E.BYID, P = FSI.PASSES;
    svg.innerHTML = '';
    terrain(svg);
    const road = (pts, o) => {
      const d = pts.map((p, i) => (i ? 'L' : 'M') + p.x + ' ' + p.y).join('');
      ui.svg('path', { d, fill: 'none', stroke: '#FFFFFF', 'stroke-width': (o.w || 3) + 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg);
      ui.svg('path', { d, fill: 'none', stroke: o.c || '#5B6573', 'stroke-width': o.w || 3, 'stroke-dasharray': o.dash || 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg);
    };
    const cut = st.routeOut;
    road([by.DA.map, P.P2, by.DB.map], { c: '#7F97B5', w: 2, dash: '7 6' });                          // Route-2 (light vehicles)
    road([by.DA.map, P.P1, by.DB.map], { c: cut ? '#C62828' : '#4A5563', w: 4, dash: cut ? '4 6' : null }); // Route-1
    road([by.DA.map, by.TH.map], { c: '#4A5563', w: 4 });
    E.POSTS.forEach(n => road([by[n.parent].map, n.map], { c: '#7C8794', w: 2, dash: n.lastMile ? '2 5' : null }));
    // passes
    Object.entries(P).forEach(([k, p]) => {
      const closed = k === 'P1' && cut, g = ui.svg('g', { transform: `translate(${p.x},${p.y})` }, svg);
      ui.svg('path', { d: 'M-11 8 L0 -11 L11 8Z', fill: closed ? '#C62828' : '#FFFFFF', stroke: closed ? '#C62828' : '#14202E', 'stroke-width': 1.6 }, g);
      const txt = p.label + (closed ? ' · CLOSED' : k === 'P2' ? ' · light vehicles' : ' · open');
      ui.svg('rect', { x: 15, y: -9, width: txt.length * 6.4 + 10, height: 18, rx: 2, fill: closed ? '#FBE9E9' : 'rgba(255,255,255,.9)', stroke: closed ? '#E4A3A3' : '#C3CBD6' }, g);
      ui.svg('text', { x: 20, y: 4, 'font-size': 11, 'font-family': 'IBM Plex Mono', 'font-weight': 600, fill: closed ? '#A61F1F' : '#14202E' }, g).textContent = txt;
    });
    // depots
    NODES.filter(n => n.type === 'depot').forEach(n => {
      const g = ui.svg('g', { transform: `translate(${n.map.x},${n.map.y})` }, svg);
      ui.svg('rect', { x: -11, y: -11, width: 22, height: 22, fill: '#17365D', stroke: '#FFFFFF', 'stroke-width': 2 }, g);
      ui.svg('text', { y: 4, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, fill: '#FFFFFF', 'font-family': 'IBM Plex Mono' }, g).textContent = 'D';
      const left = n.labelLeft || n.map.x > 660;
      ui.svg('text', { x: left ? -16 : 16, y: -2, 'text-anchor': left ? 'end' : 'start', 'font-size': 12, 'font-weight': 600, 'font-family': 'IBM Plex Sans', fill: '#14202E', 'paint-order': 'stroke', stroke: '#EFF3EE', 'stroke-width': 3 }, g).textContent = n.name;
      ui.svg('text', { x: left ? -16 : 16, y: 11, 'text-anchor': left ? 'end' : 'start', 'font-size': 9.5, 'font-family': 'IBM Plex Mono', fill: '#44515F', 'paint-order': 'stroke', stroke: '#EFF3EE', 'stroke-width': 3 }, g).textContent = n.role.split(' (')[0];
    });
    // posts: big status marker + label card
    E.POSTS.forEach(n => {
      const s = status[n.id], col = COLOR[s.status], isSel = sel === n.id, x = n.map.x, y = n.map.y;
      const g = ui.svg('g', { class: 'node', transform: `translate(${x},${y})`, tabindex: 0, role: 'button', 'aria-label': `${n.name}: ${WORD[s.status]}. Open details.` }, svg);
      if (isSel) ui.svg('circle', { r: 21, fill: 'none', stroke: '#17365D', 'stroke-width': 3 }, g);
      ui.svg('circle', { r: 14, fill: col, stroke: '#FFFFFF', 'stroke-width': 3 }, g);
      ui.svg('text', { y: 5, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 700, fill: s.status === 'soon' ? '#2B1D00' : '#FFFFFF', 'font-family': 'IBM Plex Mono' }, g).textContent = ICON[s.status];
      const snow3 = [1, 2, 3].some(d => (FSI.wx.get(n.cell, 'snow', d).v || 0) >= 1);
      if (snow3) ui.svg('text', { x: 12, y: -10, 'font-size': 13, fill: '#2A5687' }, g).textContent = '❄';
      const line2 = s.status === 'covered' || s.status === 'plan' ? `OK · ${fmt(s.minDays, 0)} d of stock` : s.status === 'late' ? `${ITEMS[s.worst.item].short} · TOO LATE` : `${ITEMS[s.worst.item].short} · act by ${ui.when(s.worst.first.actBy).replace(/^\w+, /, '')}`;
      const w = Math.max(n.name.length * 7.2, line2.length * 6.1) + 16, left = x + 22 + w > 815;
      const lx = left ? -22 - w : 22;
      ui.svg('rect', { x: lx, y: -19, width: w, height: 36, rx: 3, fill: '#FFFFFF', stroke: isSel ? '#17365D' : col, 'stroke-width': isSel ? 2 : 1.2 }, g);
      ui.svg('text', { x: lx + 8, y: -4, 'font-size': 12, 'font-weight': 600, 'font-family': 'IBM Plex Sans', fill: '#14202E' }, g).textContent = n.name;
      ui.svg('text', { x: lx + 8, y: 10, 'font-size': 10.5, 'font-family': 'IBM Plex Mono', fill: s.status === 'soon' ? '#7D5300' : s.status === 'covered' || s.status === 'plan' ? '#1C6B31' : '#A61F1F' }, g).textContent = line2;
      const pick = () => opts.onPick && opts.onPick(n.id);
      g.addEventListener('click', pick); g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
    });
    ui.svg('text', { x: 10, y: 462, 'font-size': 10, 'font-family': 'IBM Plex Mono', fill: '#6B7887' }, svg).textContent = 'SCHEMATIC · NOT TO SCALE · FICTIONAL SITES · NO BORDERS SHOWN';
  };
  FSI.mapLegend = () => `<div class="maplegend">
    <span><i class="dot" style="background:#C62828"></i>Act now</span><span><i class="dot" style="background:#E0A100"></i>Act soon (≤ 3 days)</span><span><i class="dot" style="background:#2E9E4A"></i>OK</span>
    <span><i class="sq"></i>Supply depot</span><span><i class="ln"></i>Main road</span><span><i class="ln dash"></i>Route-2, light vehicles</span><span><i class="ln dot2"></i>Porter / animal transport</span><span>❄ snow forecast (3 days)</span></div>`;

  // Detail card for one post: all four supplies, next action, weather.
  FSI.postCard = (st, s) => {
    const n = s.n, rep = st.reports[n.id], fr = E.freshness(st, n.id);
    let t = 0; for (let d = 0; d < 3; d++) t += FSI.wx.postTemp(n, d); t /= 3;
    const fly = [1, 2, 3].map(d => FSI.wx.flyable(n.cell, d).ok);
    const act = s.items.find(r => r.status !== 'covered');
    return `<div class="pcard">
      <div class="pc-head"><div><b>${esc(n.name)}</b><span>${fmt(n.alt)} ft · ${n.troops} personnel · supplied by ${E.BYID[n.parent].name}${n.lastMile ? ' + ' + n.lastMile : ''}</span></div>${ui.statusTag(s.status)}</div>
      <div class="pc-sec">Stock</div>
      ${s.items.map(r => { const it = ITEMS[r.item], days = r.r.Y, pct = Math.min(100, days / 14 * 100), col = COLOR[r.status];
        return `<div class="srow"><span class="sname">${it.short}</span><span class="sbar"><span style="width:${pct}%;background:${col}"></span></span><span class="sdays"><b>${fmt(days, 1)}</b> d</span>
          <span class="snote">${r.status === 'covered' ? 'OK until next delivery' : r.status === 'late' ? 'too late to resupply' : 'safe until ' + ui.when(r.r.Yc).replace(/^\w+, /, '')}</span></div>`; }).join('')}
      <div class="pc-sec">Next action</div>
      ${act ? `<p class="pc-act">${ui.statusTag(act.status)} ${FSI.actionSentence(act)}</p>${act.first ? `<button type="button" class="btn primary sm" data-approve="${n.id}|${act.item}|${act.first.key}">Approve: ${esc(act.first.label)}</button>` : ''} <a class="btn sm" href="#/clock" data-focus="${n.id}|${act.item}">All options</a>`
        : '<p class="pc-act">No action needed. Every supply lasts until its next delivery.</p>'}
      <div class="pc-sec">Conditions</div>
      <p class="pc-small">Night temperature about <b>${fmt(t, 0)} °C</b> (real forecast, adjusted for altitude). Air maintenance next 3 days: ${fly.map((f, i) => `${ui.dayDate(i + 1).toLocaleDateString('en-IN', { weekday: 'short' })} ${f ? '✓' : '✕'}`).join(' · ')}.<br>
      Last stock report ${rep.ageH} h ago by ${rep.via}${fr !== 'fresh' ? ` <b style="color:var(--warn-ink)">(old, so figures are less certain)</b>` : ''}.</p>
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

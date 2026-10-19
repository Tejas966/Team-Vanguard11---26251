/* Views: overview, decision clock, field reports, winter stocking, brief, methods. */
(function () {
  const E = FSI.engine, ui = FSI.ui, { ITEMS, NODES, CONFIG } = FSI;
  const { fmt, esc, badge } = ui;
  const V = FSI.views = FSI.views || {};
  const ITEM_KEYS = Object.keys(ITEMS);
  const OPT_LETTER = { lateral: 'T', expedite: 'C', detour: 'D', air: 'A' };

  function allClocks(st) { return ITEM_KEYS.flatMap(k => E.decisionClock(st, k)); }
  function dueList(st) { return allClocks(st).filter(r => r.status !== 'covered').sort((a, b) => a.actBy - b.actBy); }
  function decisionLine(row) {
    const it = ITEMS[row.item];
    if (row.status === 'covered') return `Scheduled delivery on ${ui.when(row.r.A)} arrives before stock runs low.`;
    if (row.status === 'late') return `No option arrives before ${it.name.toLowerCase()} runs out (${ui.when(row.r.Yc)}). Ration use and request the fastest possible relief.`;
    const f = row.first, l = row.last;
    let s = `Act by <b>${ui.when(f.actBy)}</b> (${ui.rel(f.actBy)}) to ${f.label.toLowerCase()}.`;
    if (l && l !== f) s += ` Last fallback: ${l.label.toLowerCase()} until ${ui.when(l.actBy)}.`;
    return s;
  }

  /* ================= 00 OVERVIEW ================= */
  V.overview = (root, st) => {
    const due = dueList(st), next = due[0];
    const in24 = due.filter(r => r.actBy < 1 || r.status === 'late').length;
    const R = E.simulate(st, {});
    const posts = E.POSTS.map(p => R[p.id]);
    const atRisk = posts.filter(r => r.risk !== 'green');
    const stale = E.POSTS.filter(p => E.freshness(st, p.id) !== 'fresh');
    const wp = E.winterPlan(st);
    // worst status per post across all classes, for the map
    const worst = {};
    E.POSTS.forEach(p => {
      const rows = due.filter(r => r.n.id === p.id);
      const rr = R[p.id];
      if (rows.length) { const r0 = rows[0]; worst[p.id] = { risk: r0.status === 'now' || r0.status === 'late' ? 'red' : 'amber', label: `${ITEMS[r0.item].name.split(' ').pop()}: act ${r0.status === 'late' ? 'NOW' : ui.rel(r0.actBy)}` }; }
      else worst[p.id] = { risk: rr.risk === 'red' ? 'amber' : 'green', label: `${fmt(rr.Y, 0)} d ${ITEMS[st.item].name.toLowerCase()}` };
    });
    ['DA', 'DB', 'TH'].forEach(id => { worst[id] = { risk: R[id].risk, label: R[id].lateKids ? `${R[id].lateKids} dispatch late` : '' }; });

    root.innerHTML = `
      <p class="intro">Where the sector stands right now, and <b>which decisions are due first</b>. Deadlines come from the Decision Clock and cover all four supply classes.</p>
      <div class="tiles">
        <a class="tile ${next && next.actBy < 1 ? 'crit' : next ? 'warn' : 'good'}" href="#/clock"><div class="l">Next decision deadline</div>
          <div class="v">${next ? (next.status === 'late' ? 'NOW' : ui.rel(next.actBy).replace('in ', '')) : '—'}</div>
          <div class="s">${next ? `${esc(next.n.name)} · ${ITEMS[next.item].name}${next.first ? ' · ' + esc(next.first.label) : ''}` : 'No decision needed in 14 d'}</div></a>
        <a class="tile ${in24 ? 'crit' : 'good'}" href="#/clock"><div class="l">Decisions due within 24 h</div><div class="v">${in24}<small>of ${due.length} open</small></div><div class="s">across ${ITEM_KEYS.length} supply classes</div></a>
        <a class="tile ${atRisk.length ? 'warn' : 'good'}" href="#/ripple"><div class="l">Posts at risk · ${ITEMS[st.item].name}</div><div class="v">${atRisk.length}<small>/ ${posts.length}</small></div><div class="s">${posts.filter(r => r.risk === 'red').length} red · ${posts.filter(r => r.risk === 'amber').length} amber under current scenario</div></a>
        <a class="tile ${stale.length ? 'warn' : 'good'}" href="#/reports"><div class="l">Stock reports not fresh</div><div class="v">${stale.length}<small>/ ${E.POSTS.length}</small></div><div class="s">${stale.length ? stale.map(p => p.name.replace('Post ', '')).join(', ') + ': wider uncertainty' : 'All posts reported in 24 h'}</div></a>
      </div>
      ${FSI.weatherStrip()}
      <div class="grid ov-main">
        <div class="panel"><div class="ph"><h3>Sector picture</h3><span class="hint">Click a post to open its Decision Clock</span></div>
          <svg class="fluid" id="ovMap" viewBox="0 0 760 445" role="img" aria-label="Schematic sector map"></svg>
          <div class="legend" style="padding:6px 14px 10px">${badge('green')} on track ${badge('amber')} decision due ${badge('red')} decide now / too late <span>◇ depot</span><span>dashed outline = stale report</span><span>dashed line = Route-2 via Pass-2</span></div>
        </div>
        <div class="panel"><div class="ph"><h3>Next decisions</h3><a class="hint" href="#/clock">Open Decision Clock →</a></div>
          <div class="pb" style="padding-top:2px"><ul class="dlist">${due.slice(0, 7).map(r => `
            <li><div class="when">${r.status === 'late' ? 'TOO LATE' : ui.when(r.actBy).replace(/^\w+ /, '')}<small>${r.status === 'late' ? 'no option in time' : ui.rel(r.actBy)}</small></div>
              <div class="what">${ui.statusTag(r.status)} <b>${esc(r.n.name)}</b> · ${ITEMS[r.item].name}<span>${r.first ? esc(r.first.label) + (r.last && r.last !== r.first ? ` · fallback ${esc(r.last.label.toLowerCase())}` : '') : 'stock runs out ' + ui.when(r.r.Yc)}</span></div></li>`).join('') || '<li class="empty">No decisions due within 14 days.</li>'}</ul></div>
        </div>
      </div>
      <div class="grid ov-main" style="margin-top:12px">
        <div class="panel"><div class="ph"><h3>Alerts · ${ITEMS[st.item].name}</h3><span class="hint">Every alert states its cause</span></div>
          <div class="pb" style="padding-top:2px"><ul class="alerts">${NODES.map(n => R[n.id]).filter(r => r.risk !== 'green').sort((a, b) => (a.risk === 'red' ? 0 : 1) - (b.risk === 'red' ? 0 : 1)).map(r => `
            <li>${badge(r.risk)}<span><b>${esc(r.n.name)}</b> <span style="color:var(--muted)">· ${r.n.role}${r.n.type === 'post' ? ` · ${fmt(r.Y, 1)} d of stock` : ''}</span></span>
            <span class="why"><b>Cause:</b> ${esc(E.explain(st, R, r.n.id).join(' → ') || '—')}</span></li>`).join('') || '<li class="empty">No alerts for this class under the current scenario.</li>'}</ul></div></div>
        <div class="panel"><div class="ph"><h3>Winter stocking</h3><a class="hint" href="#/winter">Plan →</a></div><div class="pb">
          <div class="big-num">${wp.early}<small>days to the early closure estimate of Pass-1</small></div>
          <p style="margin:10px 0 0">${wp.short > 0 ? `${badge('red')} <b>${wp.short} truckloads short.</b> Need ${wp.totLoads}, convoy capacity allows ${wp.cap} before closure.` : `${badge('green')} On track: need ${wp.totLoads} loads, capacity ${wp.cap}.`}</p>
          <p class="note">Closure dates are illustrative. Safety margin z ${st.winterZ}, winter ${st.winterW} days.</p></div></div>
      </div>`;
    ui.sectorMap(ui.$('#ovMap'), st, worst, id => { if (id[0] === 'P') { FSI.set({ focus: id }); location.hash = '#/clock'; } else { FSI.set({ source: id }); location.hash = '#/ripple'; } });
  };

  /* ================= 01 DECISION CLOCK ================= */
  V.clock = (root, st) => {
    const item = st.clockItem || st.item, it = ITEMS[item];
    const counts = Object.fromEntries(ITEM_KEYS.map(k => [k, E.decisionClock(st, k).filter(r => r.status !== 'covered').length]));
    const rows = E.decisionClock(st, item).sort((a, b) => (a.status === 'covered') - (b.status === 'covered') || a.actBy - b.actBy);
    root.innerHTML = `
      <p class="intro">For every post: <b>the latest time to order each kind of resupply</b> so it arrives before stock runs out. Cheaper options close first.</p>
      <details class="howto"><summary>How is this worked out?</summary>We take a cautious stock-out time ("safe until": expected run-out minus a margin for an assumed demand spread and report age; not a calibrated probability), then subtract each option's travel time. Air maintenance counts only days the real forecast shows as flyable. A rush convoy needs spare stock at the depot.</details>
      <div class="itabs" role="tablist" aria-label="Supply class">${ITEM_KEYS.map(k => `<button type="button" role="tab" aria-selected="${k === item}" data-k="${k}">${ITEMS[k].name}${counts[k] ? `<span class="cnt">${counts[k]}</span>` : ''}</button>`).join('')}</div>
      <div class="legend" style="margin:-4px 0 10px"><span><b style="font-family:var(--mono)">T C D A</b> = latest time to order: lateral Transfer · expedite Convoy · Detour via Pass-2 · Air maintenance</span><span>▼ next scheduled delivery</span><span><i style="border-color:#C62828"></i>safe until (stock may run out after this)</span><span><i class="box" style="background:repeating-linear-gradient(135deg,rgba(198,40,40,.5) 0 3px,transparent 3px 6px)"></i>no option arrives in time</span></div>
      <div class="clock">${rows.map(row => clockRow(st, row, it)).join('')}</div>
      <p class="note">Lead times: lateral transfer 1 d · expedite convoy = road time (+ porter / animal transport leg where needed) + 0.5 d, only if the depot has free stock · detour = Route-2 to Depot-B + road · air maintenance 1 d, only on days the <b>real Open-Meteo forecast</b> shows flyable (snow &lt; 1 cm, rain &lt; 2 mm, wind &lt; 40 km/h). Costs are illustrative.</p>`;
    rows.forEach(row => drawTimeline(ui.$('#tl-' + row.n.id), row));
    root.querySelectorAll('.itabs button').forEach(b => b.onclick = () => FSI.set({ clockItem: b.dataset.k }));
    root.querySelectorAll('[data-approve]').forEach(b => b.onclick = () => {
      const [pid, key] = b.dataset.approve.split('|'); const row = rows.find(r => r.n.id === pid); const o = row.opts.find(x => x.key === key);
      FSI.logDecision({ post: row.n.name, item: it.name, option: o.label, actBy: ui.when(o.actBy) });
    });
    if (st.focus) { const el = ui.$('#row-' + st.focus); if (el) { el.scrollIntoView({ block: 'center' }); el.querySelector('details').open = true; } st.focus = null; }
  };
  function clockRow(st, row, it) {
    const r = row.r, n = row.n, fr = E.freshness(st, n.id), rep = st.reports[n.id];
    const logged = (st.decisions || []).filter(d => d.post === n.name && d.item === it.name);
    return `<div class="crow ${row.status}" id="row-${n.id}">
      <div class="who"><b>${esc(n.name)}</b> ${ui.statusTag(row.status)}
        <div class="meta">${fmt(r.sEff)} ${it.unit} in stock · uses ${fmt(r.c, 0)} ${it.unit}/day · lasts about ${fmt(r.Y, 1)} days</div>
        <div class="meta">Next delivery ${Number.isFinite(r.A) && r.A <= CONFIG.horizon ? ui.when(r.A) : 'none in 14 d'} · report ${rep.ageH} h old${fr !== 'fresh' ? ` <b style="color:var(--warn-ink)">(${fr})</b>` : ''}</div></div>
      <div class="tl"><svg class="fluid" id="tl-${n.id}" viewBox="0 0 620 78" role="img" aria-label="Timeline for ${esc(n.name)}"></svg></div>
      <div class="dec"><div class="head">${row.status === 'covered' ? 'No action needed' : row.status === 'late' ? 'Shortage unavoidable' : esc(row.first.label)}
        <small>${row.status === 'covered' ? 'schedule holds' : row.status === 'late' ? 'from ' + ui.when(r.Yc) : 'order by ' + ui.when(row.first.actBy)}</small></div>
        <div>${decisionLine(row)}</div>
        ${row.first && row.status !== 'covered' ? `<div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap"><button type="button" class="btn sm primary" data-approve="${n.id}|${row.first.key}">Approve: ${esc(row.first.label)}</button></div>` : ''}
        ${logged.length ? `<div class="logged">✓ Approved: ${esc(logged[logged.length - 1].option)} (${logged[logged.length - 1].at})</div>` : ''}</div>
      ${row.status !== 'covered' ? `<div style="grid-column:1/-1;padding:0 14px 8px">${FSI.whyBox(st, row)}</div>` : ''}
      <details><summary>All options</summary>
        <table class="optt"><thead><tr><th></th><th>Option</th><th class="n">Lead</th><th>Latest order time</th><th class="n">Cost ₹ L</th><th>Status</th></tr></thead><tbody>
        ${row.opts.map(o => `<tr class="${o.ok && o.actBy > 0 ? '' : 'no'}"><td><b style="font-family:var(--mono)">${OPT_LETTER[o.key]}</b></td><td>${esc(o.label)}<br><span style="color:var(--muted);font-size:11.5px">${esc(o.why)}</span></td><td class="n">${fmt(o.lead, 1)} d</td>
          <td>${o.ok ? (o.actBy > 0 ? ui.when(o.actBy) + ` <span style="color:var(--muted)">(${ui.rel(o.actBy)})</span>` : '<b style="color:var(--crit-ink)">window closed</b>') : '—'}</td><td class="n">${fmt(o.cost, 1)}</td>
          <td>${o.ok && o.actBy > 0 ? (o === row.first ? ui.tag('blue', '★', 'PREFERRED') : ui.tag('green', '✓', 'OPEN')) : ui.tag('grey', '–', 'NOT AVAILABLE')}</td></tr>`).join('')}
        </tbody></table>
        ${r.sSd > 0 ? `<p class="note">Last report is ${rep.ageH} h old, so the stock figure carries ±${Math.round(r.sSd * 100)}% extra uncertainty. That pulls the safe stock-out time earlier. A fresh SITREP would widen the window.</p>` : ''}
      </details></div>`;
  }
  function drawTimeline(svg, row) {
    const W = 620, H = CONFIG.horizon, x0 = 10, x1 = W - 10, X = d => x0 + Math.max(0, Math.min(H, d)) / H * (x1 - x0), r = row.r;
    const s = (t, a) => ui.svg(t, a, svg);
    s('rect', { x: x0, y: 30, width: x1 - x0, height: 14, fill: '#F2F6FB', stroke: '#D6DCE4' });
    for (let d = 0; d <= H; d++) {
      s('line', { x1: X(d), x2: X(d), y1: 44, y2: d % 7 === 0 ? 52 : 48, stroke: '#9AA6B4' });
      if (d % 2 === 0) s('text', { x: X(d), y: 64, 'text-anchor': 'middle', 'font-size': 9.5, 'font-family': 'IBM Plex Mono', fill: '#6B7887' }).textContent = d === 0 ? 'now' : ui.dayDate(d).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit' });
    }
    // stock bar: green until safe stock-out, red after
    if (r.Yc > 0) s('rect', { x: x0, y: 30, width: X(r.Yc) - x0, height: 14, fill: '#CFE8D6' });
    const lastOpen = row.last ? row.last.actBy : 0;
    if (row.status !== 'covered' && r.Yc > lastOpen) s('rect', { x: X(Math.max(0, lastOpen)), y: 30, width: X(r.Yc) - X(Math.max(0, lastOpen)), height: 14, fill: 'url(#hatch-' + row.n.id + ')' });
    const defs = s('defs', {}); const pat = ui.svg('pattern', { id: 'hatch-' + row.n.id, width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
    ui.svg('rect', { width: 3, height: 6, fill: 'rgba(198,40,40,.45)' }, pat);
    if (r.Yc < H) { s('line', { x1: X(r.Yc), x2: X(r.Yc), y1: 22, y2: 50, stroke: '#C62828', 'stroke-width': 2 });
      s('text', { x: X(r.Yc) + 3, y: 76, 'font-size': 9.5, 'font-family': 'IBM Plex Mono', fill: '#A61F1F', 'text-anchor': X(r.Yc) > W - 90 ? 'end' : 'start' }).textContent = 'safe until ' + ui.when(r.Yc).replace(/^\w+ /, ''); }
    if (Number.isFinite(r.A) && r.A <= H) { s('path', { d: `M${X(r.A) - 6} 18 L${X(r.A) + 6} 18 L${X(r.A)} 28Z`, fill: '#17365D' });
      s('text', { x: X(r.A), y: 12, 'text-anchor': 'middle', 'font-size': 9.5, 'font-family': 'IBM Plex Mono', fill: '#17365D' }).textContent = 'delivery'; }
    // act-by flags for open options (stacked when close together)
    const used = [];
    if (row.status === 'covered') return; // schedule holds: no deadlines to show
    row.opts.filter(o => o.ok && o.actBy > 0 && o.actBy < H).forEach(o => {
      const x = X(o.actBy); let lvl = 0; while (used.some(u => u.l === lvl && Math.abs(u.x - x) < 18)) lvl++; used.push({ x, l: lvl });
      const y = 37 - lvl * 0; const cx = x + lvl * 0;
      const g = s('g', { transform: `translate(${cx},${y})` });
      ui.svg('circle', { r: 8, fill: o === row.first ? '#17365D' : '#fff', stroke: '#17365D', 'stroke-width': 1.5, transform: `translate(0,${-lvl * 17})` }, g);
      ui.svg('text', { y: 3.5 - lvl * 17, 'text-anchor': 'middle', 'font-size': 9.5, 'font-weight': 700, 'font-family': 'IBM Plex Mono', fill: o === row.first ? '#fff' : '#17365D' }, g).textContent = OPT_LETTER[o.key];
      ui.svg('title', {}, g).textContent = `${o.label}: order by ${ui.when(o.actBy)}`;
    });
  }

  /* ================= 02 FIELD REPORTS ================= */
  V.reports = (root, st) => {
    const samples = FSI.SAMPLE_SITREPS.map(s => s.replace('{DTG}', ui.dtg()));
    root.innerHTML = `
      <p class="intro">Posts with only radio or satellite text send <b>one short line</b>. Paste it below. The system reads it, checks the numbers, and updates the post. Posts that have not reported for a while get earlier deadlines, because their figures are less certain.</p>
      <div class="grid r-main">
        <div class="panel"><div class="ph"><h3>Receive a SITREP</h3></div><div class="pb">
          <div class="fmt">SITREP &lt;POST&gt; &lt;DDHHMM&gt; F&lt;SKO L&gt; R&lt;rations kg&gt; M&lt;medical kits&gt; S&lt;MT spares&gt; [STR&lt;strength&gt;]<br>
          Post codes: ${E.POSTS.map(p => `<b>${p.code}</b> ${p.name.replace('Post ', '')}`).join(' · ')}</div>
          <div class="field" style="margin-top:10px"><label for="sitrep">Message text</label><textarea id="sitrep" rows="2" spellcheck="false" placeholder="SITREP KES ${ui.dtg()} F600 R840"></textarea></div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px"><span style="font-size:12px;color:var(--muted);align-self:center">Samples:</span>${samples.map((s, i) => `<button type="button" class="btn sm" data-sample="${i}">${esc(s.split(' ')[1])}</button>`).join('')}</div>
          <div id="parseOut"></div>
          <div style="display:flex;gap:8px;margin-top:10px"><button type="button" class="btn primary" id="accept" disabled>Accept report</button><button type="button" class="btn" id="clearMsg">Clear</button></div>
        </div></div>
        <div class="panel"><div class="ph"><h3>Report freshness</h3><button type="button" class="btn sm" id="age12" style="margin-left:auto" title="Demo control">Demo: age reports by 12 h</button></div>
          <div class="pb scroll" style="padding-top:0"><table class="t"><thead><tr><th>Post</th><th>Last report</th><th>Via</th><th>State</th><th>Effect</th></tr></thead><tbody>
          ${E.POSTS.map(p => { const r = st.reports[p.id], f = E.freshness(st, p.id), sd = E.stockSd(st, p.id);
            return `<tr><td><b>${p.name}</b> <span style="color:var(--muted);font-family:var(--mono);font-size:11px">${p.code}</span><br>${FSI.dqTag(E.dataQuality(st, p.id))}</td><td class="n">${r.ageH} h ago</td><td>${r.via}</td>
              <td>${f === 'fresh' ? ui.tag('green', '✓', 'FRESH') : f === 'ageing' ? ui.tag('amber', '!', 'AGEING') : ui.tag('red', '✕', 'STALE')}</td>
              <td style="font-size:12.5px">${sd ? `±${Math.round(sd * 100)}% on stock; request a report` : 'none'}</td></tr>`; }).join('')}
          </tbody></table><p class="note">Fresh &lt; 24 h · ageing 24–72 h (±8%) · stale &gt; 72 h (±20%). Thresholds are our assumptions.</p></div></div>
      </div>
      <div class="panel" style="margin-top:12px"><div class="ph"><h3>Inbox</h3><span class="hint">${(st.inbox || []).length} messages</span></div><div class="pb" style="padding-top:2px">
        <ul class="inbox">${(st.inbox || []).map(m => `<li><code>${esc(m.raw)}</code><span>${m.status === 'accepted' ? ui.tag('green', '✓', 'ACCEPTED') : m.status === 'flagged' ? ui.tag('amber', '!', 'ACCEPTED · CHECK') : ui.tag('red', '✕', 'REJECTED')}</span>
          <span class="m">${esc(m.at)} · ${esc(m.note)}</span></li>`).join('') || '<li class="empty">No messages yet. Try a sample above.</li>'}</ul></div></div>`;
    const ta = ui.$('#sitrep'), out = ui.$('#parseOut'), acc = ui.$('#accept');
    let parsed = null;
    const preview = () => {
      if (!ta.value.trim()) { out.innerHTML = ''; acc.disabled = true; parsed = null; return; }
      parsed = E.parseSitrep(ta.value, st);
      const p = parsed;
      out.innerHTML = `<div class="parse ${p.ok ? (p.warns.length ? '' : 'ok') : 'bad'}">${p.ok ? `<b>${esc(p.post.name)}</b> · ${Object.entries(p.values).map(([k, v]) => `${ITEMS[k].name}: <b>${fmt(v)}</b> ${ITEMS[k].unit}`).join(' · ')}${p.str != null ? ` · strength ${p.str}` : ''}` : '<b>Cannot accept this message</b>'}
        ${p.errors.length ? `<ul>${p.errors.map(e => `<li>${esc(e)}</li>`).join('')}</ul>` : ''}${p.warns.length ? `<ul>${p.warns.map(w => `<li>${esc(w)}</li>`).join('')}</ul>` : ''}</div>`;
      acc.disabled = !p.ok;
    };
    ta.addEventListener('input', preview);
    root.querySelectorAll('[data-sample]').forEach(b => b.onclick = () => { ta.value = samples[+b.dataset.sample]; preview(); ta.focus(); });
    ui.$('#clearMsg').onclick = () => { ta.value = ''; preview(); };
    acc.onclick = () => {
      if (!parsed || !parsed.ok) return;
      FSI.acceptSitrep(parsed);
    };
    ui.$('#age12').onclick = () => { const rep = {}; Object.entries(st.reports).forEach(([k, v]) => rep[k] = Object.assign({}, v, { ageH: v.ageH + 12 })); FSI.set({ reports: rep }); };
    // keep invalid attempts in the inbox too
    ta.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); if (parsed && !parsed.ok) FSI.rejectSitrep(parsed); else acc.click(); } });
    preview();
  };

  /* ================= 06 WINTER ================= */
  V.winter = (root, st) => {
    const wp = E.winterPlan(st), W = CONFIG.winter;
    const max = Math.max(...wp.rows.map(r => r.need));
    const remainT = Object.values(wp.left).reduce((a, b) => a + b, 0) * CONFIG.truckT;
    const sorties = Math.ceil(remainT * 1000 / CONFIG.sortieKg);
    root.innerHTML = `
      <p class="intro"><b>Advance Winter Stocking (AWS).</b> Pass-1 closes for months each winter, and air maintenance carries only a small share of road capacity. The question is: <b>can we push enough stock up before the pass shuts?</b> This works out the requirement for every post beyond the pass, compares it with convoy capacity, and builds a week-by-week push plan.</p>
      <div class="grid w-top" style="margin-bottom:12px">
        <div class="panel"><div class="pb"><div class="tile" style="border:0;padding:0"><div class="l">Days until Pass-1 closes</div></div>
          <div class="big-num" style="margin-top:4px">${W.p10}<small>early estimate</small></div><p class="note">Median ${W.median} d · late ${W.p90} d. Planning uses the early date, which is our assumption. <span class="est">ILLUSTRATIVE</span></p></div></div>
        <div class="panel"><div class="pb"><div class="tile" style="border:0;padding:0"><div class="l">Truckloads still to push</div></div>
          <div class="big-num" style="margin-top:4px">${wp.totLoads}<small>loads of ${CONFIG.truckT} t</small></div><p class="note">Capacity before closure: ${wp.cap} loads (${CONFIG.loadsPerDay}/day, assumption).</p></div></div>
        <div class="panel"><div class="pb"><div class="tile" style="border:0;padding:0"><div class="l">Verdict</div></div>
          <div style="margin-top:8px">${wp.short > 0 ? `${badge('red')} <b>${wp.short} loads short.</b><p style="margin:6px 0 0;font-size:13px">About ${fmt(remainT)} t would have to go by air, roughly <b>${sorties} sorties</b> of 2 t. Start Pass-2 runs now or pre-book air maintenance.</p>` : `${badge('green')} <b>On track</b><p style="margin:6px 0 0;font-size:13px">${-wp.short} loads of spare capacity.</p>`}</div></div></div>
      </div>
      <div class="panel" style="margin-bottom:12px"><div class="pb" style="display:flex;gap:18px;flex-wrap:wrap;align-items:end">
        <div class="field"><label for="wConf">Safety margin (assumed demand spread)</label><select id="wConf"><option value="1.2816">Normal (z 1.28)</option><option value="1.6449">High (z 1.64)</option><option value="2.3263">Very high (z 2.33)</option></select></div>
        <div class="field"><label for="wLen">Winter length</label><select id="wLen"><option value="90">90 days</option><option value="120">120 days</option><option value="150">150 days</option></select></div>
        <p class="note" style="margin:0;max-width:520px">Requirement = daily use × (days to closure + winter) + safety stock (z × CV × daily use × √(winter × 1.5)), per class, converted to tonnes. Covers posts beyond Pass-1 only.</p></div></div>
      <div class="grid w-two">
        <div class="panel"><div class="ph"><h3>Requirement vs on hand</h3></div><div class="pb">
          <div class="wbars">${wp.rows.map(r => `<span><b>${r.n.name.replace('Post ', '')}</b></span><div class="wbar" title="${fmt(r.have, 1)} t on hand of ${fmt(r.need, 1)} t"><span style="width:${r.have / max * 100}%"></span><em style="left:${r.have / max * 100}%;width:${r.gap / max * 100}%"></em></div><span class="n" style="font-family:var(--mono);text-align:right">+${r.loads} loads</span>`).join('')}</div>
          <div class="legend"><span><i class="box" style="background:var(--navy-500)"></i>on hand</span><span><i class="box" style="background:repeating-linear-gradient(135deg,rgba(198,40,40,.55) 0 3px,rgba(198,40,40,.12) 3px 7px)"></i>still to push</span></div>
          <div class="scroll" style="margin-top:10px"><table class="t"><thead><tr><th>Post</th>${Object.keys(ITEMS).map(k => `<th class="n">${ITEMS[k].name} (t)</th>`).join('')}<th class="n">Total gap</th></tr></thead><tbody>
          ${wp.rows.map(r => `<tr><td>${r.n.name}</td>${Object.keys(ITEMS).map(k => `<td class="n">${fmt(r.by[k], 1)}</td>`).join('')}<td class="n"><b>${fmt(r.gap, 1)} t</b></td></tr>`).join('')}</tbody></table></div></div></div>
        <div class="panel"><div class="ph"><h3>Weekly push plan</h3><span class="est">GREEDY · PRIORITY × DEFICIT</span></div><div class="pb">
          <div class="wk">${wp.weeks.map(w => `<div class="c"><b class="h">WEEK ${w.w} · ${ui.when(w.from).split(' ').slice(1, 3).join(' ')}–${ui.when(w.to).split(' ').slice(1, 3).join(' ')}</b>
            ${Object.entries(w.alloc).map(([id, k]) => `${E.BYID[id].name.replace('Post ', '')}: <b>${k}</b>`).join('<br>') || '<span class="na">nothing left to send</span>'}${w.spare ? `<br><span style="color:var(--good-ink)">${w.spare} spare slots</span>` : ''}</div>`).join('')}</div>
          <p class="note">Each week the next convoy slot goes to the post with the largest remaining gap × priority. Not delivered before closure: ${Object.entries(wp.left).filter(([, v]) => v > 0).map(([id, v]) => `${E.BYID[id].name.replace('Post ', '')} ${v}`).join(', ') || 'none'}.</p></div></div>
      </div>${FSI.snowHistoryPanel()}`;
    ui.$('#wConf').value = String(st.winterZ); ui.$('#wLen').value = String(st.winterW);
    ui.$('#wConf').onchange = e => FSI.set({ winterZ: +e.target.value });
    ui.$('#wLen').onchange = e => FSI.set({ winterW: +e.target.value });
  };

  /* ================= 07 BRIEF ================= */
  V.brief = (root, st) => {
    const due = dueList(st).slice(0, 6), R = E.simulate(st, {}), it = ITEMS[st.item], wp = E.winterPlan(st);
    const ev = E.evaluatePlans(st), mA = ev.A.m, best = ev.best;
    const stale = E.POSTS.filter(p => E.freshness(st, p.id) !== 'fresh');
    root.innerHTML = `<div class="noprint" style="display:flex;gap:8px;margin-bottom:12px"><button type="button" class="btn primary" onclick="window.print()">Print / save as PDF</button><span class="note" style="margin:0;align-self:center">One page for the commander, generated from the current scenario.</span></div>
    <div class="brief">
      <div class="cls">SYNTHETIC EXERCISE DATA · NOT OPERATIONAL</div>
      <h2>Forward supply brief · Sector North-1 (fictional)</h2>
      <div style="font-family:var(--mono);font-size:12px;color:var(--ink-2)">As of ${ui.when(0)} · prepared by Forward Supply Intelligence (prototype)</div>
      <h3>1. Situation</h3>
      <ul><li>Scenario: ${esc([st.delay ? `${E.BYID[st.source].name} resupply +${st.delay} d` : '', st.routeOut ? 'Route-1 via Pass-1 closed' : '', st.cons ? `consumption ${st.cons > 0 ? '+' : ''}${st.cons}%` : '', st.inv ? `stock −${st.inv}%` : '', st.short ? `incoming loads −${st.short}%` : ''].filter(Boolean).join('; ') || 'normal schedule')}.</li>
        <li>${it.name}: ${E.POSTS.filter(p => R[p.id].risk === 'red').length} posts red, ${E.POSTS.filter(p => R[p.id].risk === 'amber').length} amber.</li>
        <li>Stock reports not fresh: ${stale.length ? stale.map(p => `${p.name} (${st.reports[p.id].ageH} h)`).join(', ') : 'none'}.</li></ul>
      <h3>2. Decisions required (earliest first)</h3>
      <ol>${due.map(r => `<li><b>${esc(r.n.name)} · ${ITEMS[r.item].name}:</b> ${r.status === 'late' ? 'no option arrives in time; shortage from ' + ui.when(r.r.Yc) : `${esc(r.first.label)}, order by ${ui.when(r.first.actBy)}${r.last && r.last !== r.first ? `; fallback ${esc(r.last.label.toLowerCase())} until ${ui.when(r.last.actBy)}` : ''}`}.</li>`).join('') || '<li>No decisions due within 14 days.</li>'}</ol>
      <h3>3. Recommended plan · ${it.name}</h3>
      <p><b>${esc(best.name)}</b>, because ${esc(ev.reason)}. Posts short: current schedule ${mA.stockouts}, recommended plan ${best.m.stockouts}${best.m.stockouts ? ' (' + esc(best.m.shortList.map(x => x.name).join(', ') + ' still short') + ')' : ''}. Extra cost ₹${fmt(best.m.cost, 1)} lakh (illustrative). Evaluated ${ev.ranked.length} applicable plans with one scoring rule.</p>
      <h3>4. Advance Winter Stocking</h3>
      <p>${wp.totLoads} truckloads still needed before the early closure estimate in ${wp.early} days; capacity ${wp.cap}. ${wp.short > 0 ? `<b>${wp.short} loads short.</b>` : 'On track.'}</p>
      ${st.replay ? `<h3>Decision replay · ${esc(st.replay.title)}</h3><ol>${st.replay.steps.map(x => `<li><b>${esc(x.t)}:</b> ${esc(x.d)}</li>`).join('')}</ol><p style="font-size:12.5px;color:var(--ink-2)">Generated from the simulation run at ${esc(st.replay.at)} (weather snapshot ${esc(st.replay.snapshot)}).</p>` : ''}
      <h3>5. Decisions recorded</h3>
      <ul>${(st.decisions || []).slice(-8).map(d => `<li>${esc(d.at)}: ${esc(d.post)} · ${esc(d.item)}: ${esc(d.option)} (deadline ${esc(d.actBy)})</li>`).join('') || '<li>None yet.</li>'}</ul>
      <h3>6. Caveats</h3>
      <p style="font-size:12.5px;color:var(--ink-2)">All figures are estimates from documented rules on synthetic data. Probabilities assume normal demand variation with report-age uncertainty. Costs, closure dates and airlift availability are illustrative. The system recommends; the commander decides.</p>
    </div>`;
  };

  /* ================= 08 METHODS ================= */
  V.methods = (root, st) => {
    const it = ITEMS[st.item];
    root.innerHTML = `
      <div class="grid m5">
        <div class="panel"><div class="ph"><h3>How every number is produced</h3></div><div class="pb method">
          <h4>Action deadlines</h4><p>Each post's stock is projected day by day: <code>stock − use × days</code>, plus any extra deliveries on the day they land, never below zero. The <b>cautious</b> stock-out day solves <code>stock − use·T − 1.28·√(CV²·use²·T + (σ<sub>report</sub>·stock)²) = 0</code>, using an <b>assumed</b> demand spread (CV) and report-age uncertainty. It is a planning margin, not a calibrated probability. For each option, <b>latest order time = cautious stock-out − lead time</b>. An option is open only if it can start by then: a convoy needs free depot stock, and that stock is reserved once, for the most urgent post first; air maintenance needs a flyable day. Options are ranked cheapest first.</p>
          <h4>Real weather → demand and flying</h4><p>Daily minimum temperature, snowfall, rain and wind come from Open-Meteo for three public grid points in the western Himalaya (W1–W3). Each post takes its cell's temperature adjusted by <code>−6.5 °C per km</code> of extra altitude. SKO use per person per day = <code>1.0 + 0.09 × max(0, 8 − T)</code>, capped at 3.6 L, averaged over the next 14 days. It is anchored so that about −12 °C gives 2.8 L, the figure derived from ThePrint (2020). A day is flyable if snow &lt; 1 cm, rain &lt; 2 mm and wind &lt; 40 km/h. Beyond the forecast the model uses the 2023–2026 average for that date.</p>
          <h4>Field reports</h4><p>A SITREP is checked for format, post code and time. Each value is compared with expected stock; a gap over 25% and over 2 days of use is flagged "check count". Accepting it replaces the stock figure and resets the report age. Report age adds stock uncertainty: under 24 h none, 24–72 h ±8%, over 72 h ±20%.</p>
          <h4>What-if and knock-on effects</h4><p>What-if uses the same projection. Figures typed on the What-if page stay on that page; they never change the stock other pages use. In the network, each depot ships its children's scheduled loads in date order while stock lasts, and never ships more than it holds. A load it cannot fill waits for the depot's own resupply, so delays travel only along real links. Red: stock runs out before delivery. Amber: delayed, under 2 d margin, under 5 d cover after delivery, or a MEDIUM/HIGH risk class.</p>
          <h4>Risk class (rule-based)</h4><p>LOW / MEDIUM / HIGH comes from the same assumed demand spread (index under 0.2 / 0.2–0.5 / over 0.5). It is a rule-based classification, <b>not a probability</b>: the spread has not been calibrated on real consumption data.</p>
          <h4>Data quality (separate from risk)</h4><p>GOOD / FAIR / POOR per post, from report age (over 24 h −1, over 72 h −2), supplies missing from the last report (−1) and counts flagged as unlikely (−1). It is shown next to risk, never mixed into it.</p>
          <h4>Compare plans: one evaluator, one score</h4><ol><li>Every plan (current schedule, Route-2 reroute, air maintenance, lateral transfer, reroute + air) runs through the same simulation and metrics.</li><li>Recommendation: among applicable plans, fewest posts short; then lowest score; then lowest cost.</li><li>Score = w<sub>risk</sub>·risk + w<sub>time</sub>·time + w<sub>cost</sub>·cost with <b>fixed scales</b>: risk ÷ current schedule's risk, delivery day ÷ 15, cost ÷ ₹10 lakh. A plan's score does not change with which other plans are listed.</li><li>Constraints: Route-2 carries 60% of a load; at most 2 air sorties of 2 t, only on flyable days; a lateral donor keeps 3 days' safety and gives to one post; nothing uses a closed route.</li><li>If no plan removes every shortage, the page lists the posts still short and what would close the gap.</li></ol>
          <h4>One-click demo</h4><p>A fixed scenario (Pass-1 closed) run on the bundled weather snapshot, so every run gives the same numbers. Each step's text is generated from engine results; nothing is typed in by hand. Reset demo restores the original data exactly.</p>
          <h4>Winter stocking</h4><p>Requirement per class = use until closure + use over the winter + z·CV·use·√(winter·1.5), in tonnes, minus stock on hand. SKO use follows the weather: real forecast first, then the 2023–26 average for those dates. Weekly convoy slots come from the same running total as capacity, so they add up exactly. The push plan is greedy by remaining gap × priority.</p>
          <h4>What this prototype does not do yet</h4><p>Demand here comes from scales, not from a trained forecaster. The full build adds a seeded synthetic history, baseline models (seasonal-naive, ETS, TSB), LightGBM with weather drivers, rolling-origin backtests and calibrated intervals. We publish no accuracy number until that backtest exists.</p>
        </div></div>
        <div class="panel"><div class="ph"><h3>Research and references</h3></div><div class="pb"><ul class="refs">
          <li>Hyndman &amp; Athanasopoulos, <i>Forecasting: Principles and Practice</i>, 3rd ed. — <a href="https://otexts.com/fpp3" target="_blank" rel="noopener">otexts.com/fpp3</a><span class="tag-plan">PLANNED</span><span class="use">Forecast models, rolling-origin backtesting, error measures.</span></li>
          <li>Teunter &amp; Duncan (2009), intermittent demand on RAF spare parts — <a href="https://eprints.lancs.ac.uk/id/eprint/45112" target="_blank" rel="noopener">eprints.lancs.ac.uk</a><span class="tag-used">USED</span><span class="use">Why spares and medical carry high demand variability.</span></li>
          <li>Teunter, Syntetos &amp; Babai (2011), TSB method — <a href="https://doi.org/10.1016/j.ejor.2011.05.018" target="_blank" rel="noopener">doi.org/10.1016/j.ejor.2011.05.018</a><span class="tag-plan">PLANNED</span><span class="use">Forecasting lumpy demand with many zero days.</span></li>
          <li>Makridakis et al. (2022), M5 forecasting competition — <a href="https://doi.org/10.1016/j.ijforecast.2021.11.013" target="_blank" rel="noopener">doi.org/10.1016/j.ijforecast.2021.11.013</a><span class="tag-plan">PLANNED</span><span class="use">Evidence for gradient boosting with drivers.</span></li>
          <li>CAPSS, "Information Technology as a Force Multiplier in Operational Logistics" — <a href="https://capssindia.org/?p=13949" target="_blank" rel="noopener">capssindia.org</a><span class="tag-used">USED</span><span class="use">Problem framing: fragmented, delayed visibility across logistics systems.</span></li>
          <li>ThePrint (2020), winter readiness for high-altitude troops — <a href="https://theprint.in/defence/heres-how-army-is-getting-30000-additional-troops-winter-ready-in-ladakh/464301/" target="_blank" rel="noopener">theprint.in</a><span class="tag-used">USED</span><span class="use">Ration anchor (~2.5 kg per person per day) and the winter-stocking problem.</span></li>
          <li>The Quint (Feb 2020), report on the CAG audit of high-altitude rations and gear — <a href="https://www.thequint.com/news/india/soldiers-deprived-of-snow-glasses-boots-requisite-food" target="_blank" rel="noopener">thequint.com</a><span class="tag-used">USED</span><span class="use">Special high-altitude ration scales exist and shortfalls cut calorie intake. Our altitude multipliers (1.0 / 1.1 / 1.2) are our own assumption.</span></li>
          <li>Open-Meteo historical weather API (CC BY 4.0) — <a href="https://open-meteo.com/en/docs/historical-weather-api" target="_blank" rel="noopener">open-meteo.com</a><span class="tag-used">USED</span><span class="use">Real daily temperature, snow, rain and wind (2023–2026 archive + 16-day forecast) drive SKO demand and flyable days.</span></li>
          <li>Google OR-Tools vehicle routing — <a href="https://developers.google.com/optimization/routing/vrptw" target="_blank" rel="noopener">developers.google.com</a><span class="tag-plan">PLANNED</span><span class="use">Full routing with capacities and time windows.</span></li>
        </ul><p class="note">Please check each citation's exact title and link before submission.</p></div></div>
      </div>
      <div class="panel" style="margin-top:12px"><div class="ph"><h3>What is real, what is not</h3><span class="hint">Checked ${new Date().toLocaleDateString('en-IN')}</span></div><div class="pb scroll" style="padding-top:0">
        <table class="t"><thead><tr><th>Element</th><th>Type</th><th>Where it comes from</th><th>Status in this session</th></tr></thead><tbody>
          <tr><td>Weather: temperature, snow, rain, wind</td><td>${ui.tag('green', '✓', 'REAL PUBLIC')}</td><td>Open-Meteo archive (ERA5) since 2023 + 16-day forecast, CC BY 4.0. Snapshot fetched ${esc(FSI.WEATHER.fetched.replace('T', ' '))}.</td><td>${FSI.wx.isFrozen() ? 'Demo: bundled snapshot (repeatable)' : FSI.wx.live ? 'Live forecast fetched this session' : 'Live fetch not reached; using bundled snapshot'}</td></tr>
          <tr><td>Stock levels, daily use, strength</td><td>${ui.tag('amber', '!', 'SYNTHETIC')}</td><td>Generated for this demo; ration anchor from public reporting.</td><td>Field reports (SITREP) replace stock figures when accepted</td></tr>
          <tr><td>Posts, depots, roads, passes</td><td>${ui.tag('amber', '!', 'FICTIONAL')}</td><td>Hand-drawn schematic. No real locations, units or borders.</td><td>—</td></tr>
          <tr><td>Costs</td><td>${ui.tag('amber', '!', 'ILLUSTRATIVE')}</td><td>Round numbers in ₹ lakh for comparing plans only.</td><td>—</td></tr>
          <tr><td>Lead times, convoy and air capacity, closure dates</td><td>${ui.tag('amber', '!', 'ASSUMED')}</td><td>Team assumptions, listed in docs/ASSUMPTIONS.md.</td><td>—</td></tr>
          <tr><td>Deadlines, risk class, data quality, plan choice</td><td>${ui.tag('blue', 'i', 'RULE-BASED')}</td><td>Written rules on this page; every number is computed, none typed in.</td><td>14 automated tests (node --test web/tests)</td></tr>
          <tr><td>Demand forecasting model</td><td>${ui.tag('grey', '–', 'NOT BUILT YET')}</td><td>Planned: baselines + LightGBM with backtests. No accuracy is claimed.</td><td>—</td></tr>
        </tbody></table></div></div>
      <div class="panel" style="margin-top:12px"><div class="ph"><h3>Synthetic demo dataset · ${it.name} (${it.unit})</h3><span class="hint">Fictional</span></div>
        <div class="pb scroll" style="padding-top:0"><table class="t"><thead><tr><th>Node</th><th>Role</th><th>Supplied by</th><th class="n">Personnel</th><th class="n">Altitude ft</th><th class="n">Daily use</th><th class="n">Stock</th><th class="n">Days</th><th class="n">Next delivery</th><th class="n">Load</th></tr></thead><tbody>
        ${NODES.map(n => { const v = E.nodeVals(st, n); return `<tr><td><b>${n.name}</b></td><td>${n.role}</td><td>${n.parent ? E.BYID[n.parent].name : 'railhead'}</td><td class="n">${n.troops || '—'}</td><td class="n">${n.alt ? fmt(n.alt) : '—'}</td><td class="n">${fmt(v.c, 1)}</td><td class="n">${fmt(v.s)}</td><td class="n">${fmt(v.s / v.c, 1)}</td><td class="n">day ${v.L}</td><td class="n">${fmt(v.q)}</td></tr>`; }).join('')}
        </tbody></table><p class="note">Rations = personnel × 2.5 kg × altitude band factor (&lt;9,000 / 9–12,000 / &gt;12,000 ft). SKO = personnel × weather-driven litres per person (real Open-Meteo temperature). Scales are anchored on public reporting; multipliers, stock, lead times and costs are assumptions.</p></div></div>`;
  };
})();

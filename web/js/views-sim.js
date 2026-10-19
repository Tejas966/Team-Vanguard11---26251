/* Views: What-If simulator, Ripple-effect analyzer, Stress test. All share FSI.state. */
(function () {
  const E = FSI.engine, ui = FSI.ui, { ITEMS, NODES, LATERAL, CONFIG } = FSI;
  const { fmt, esc, badge } = ui, H = CONFIG.horizon;
  const V = FSI.views;

  function actionFor(st, R, id) {
    const r = R[id], n = r.n, it = ITEMS[st.item];
    if (r.risk === 'green') return '—';
    if (n.type === 'depot') return n.id === 'DB' && (st.routeOut || st.source === 'DB') ? 'Expedite resupply via Route-2 (Pass-2) or request air maintenance' : `Prioritise ${n.name}'s replenishment; dispatch to highest-priority posts first`;
    if (r.risk === 'red') {
      const lat = LATERAL.find(l => l.includes(id));
      if (lat) { const o = lat[0] === id ? lat[1] : lat[0], ro = R[o], sur = ro.s - ro.c * (Math.min(ro.A, H) + 3);
        if (ro.risk === 'green' && sur > 0) return `Reallocate up to ${fmt(Math.min(sur, r.short * r.c + 2 * r.c))} ${it.unit} from ${E.BYID[o].name} (lateral link, 1 d)`; }
      return `Prioritise replenishment before ${ui.when(Math.max(0, r.Y))}: air maintenance or first slot on the next convoy`;
    }
    if (r.cover < 5 && Number.isFinite(r.A)) return 'Top up the next delivery; buffer after delivery is thin';
    return 'Monitor daily; pre-position stock at the parent depot';
  }

  /* ================= 03 WHAT-IF ================= */
  V.whatif = (root, st) => {
    const n = E.BYID[st.source], base = E.nodeVals(st, n), it = ITEMS[st.item];
    // Edits on this page are a sandbox: they never change the stock figures other pages use.
    const wi = st.whatif && st.whatif.node === n.id && st.whatif.item === st.item ? st.whatif : null;
    const v = { s: wi ? wi.s : base.s, c: wi && n.type === 'post' ? wi.c : base.c, L: wi ? wi.L : base.L, q: base.q };
    root.innerHTML = `
      <p class="intro">Compare normal delivery with a delayed one for a single node. The node, delay and consumption change you set here are shared with the other planning tools. <b>Stock and delivery figures you type here stay on this page</b> and never change the real figures.</p>${wi ? `<p class="note" style="margin-top:-8px">Using your edited figures (real: ${fmt(base.s)} ${it.unit}, ${fmt(base.c, 1)} ${it.unit}/day, delivery day ${base.L}).</p>` : ''}
      <div class="grid m1">
        <div class="panel"><div class="ph"><h3>Inputs</h3></div><div class="pb form">
          <div class="field"><label for="wNode">Node (disruption source)</label><select id="wNode">${NODES.map(x => `<option value="${x.id}">${x.name} · ${x.role}</option>`).join('')}</select><div class="help">${n.role}. Supplied by ${n.parent ? E.BYID[n.parent].name : 'railhead'} via ${n.route || 'track'}.</div></div>
          <div class="field" id="f-s"><label for="wS">Available inventory</label><div class="row"><input type="number" id="wS" min="0" step="1" value="${Math.round(v.s)}"><span class="unit">${it.unit}</span></div><div class="err">Enter 0 or more.</div>${st.inv ? `<div class="help">The Stress page cuts this by ${st.inv}%.</div>` : ''}</div>
          <div class="field" id="f-c"><label for="wC">Average daily consumption</label><div class="row"><input type="number" id="wC" min="0" step="0.1" value="${Math.round(v.c * 10) / 10}" ${n.type === 'depot' ? 'readonly' : ''}><span class="unit">${it.unit}/d</span></div><div class="err">Must be more than 0.</div><div class="help">${n.type === 'depot' ? 'For a depot this is its outflow to the posts it supplies (edit at post level).' : `${n.troops} personnel × scale × altitude factor.`}</div></div>
          <div class="field" id="f-l"><label for="wL">Expected delivery time</label><div class="row"><input type="number" id="wL" min="0" max="30" step="1" value="${v.L}"><span class="unit">days</span></div><div class="err">Enter 0 to 30.</div></div>
          <div class="field"><label for="wD">Additional delivery delay</label><div class="row"><input type="range" id="wD" data-fmt="delay" min="0" max="10" value="${st.delay}"><output class="val">+${st.delay} d</output></div></div>
          <div class="field"><label for="wX">Change in consumption</label><div class="row"><input type="range" id="wX" data-fmt="pct" min="-30" max="60" step="5" value="${st.cons}"><output class="val">${st.cons >= 0 ? '+' : ''}${st.cons}%</output></div><div class="help">Cold snap, troop surge or patrol tempo. Applies to this node and everything it supplies.</div></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn primary" href="#/ripple" style="text-decoration:none">Trace ripple effect →</a><button type="button" class="btn" id="wReset">Reset inputs</button></div>
        </div></div>
        <div class="panel"><div class="ph"><h3>Normal vs disrupted</h3><span class="est">ESTIMATES</span></div><div class="pb" id="wOut"></div></div>
      </div>`;
    ui.$('#wNode').value = st.source;
    ui.$('#wNode').onchange = e => FSI.set({ source: e.target.value });
    ui.$('#wD').onchange = e => FSI.set({ delay: +e.target.value });
    ui.$('#wX').onchange = e => FSI.set({ cons: +e.target.value });
    ui.$('#wReset').onclick = () => FSI.set({ whatif: null, delay: 0, cons: 0 });
    const read = () => {
      const s = parseFloat(ui.$('#wS').value), c = parseFloat(ui.$('#wC').value), L = parseFloat(ui.$('#wL').value);
      const bad = { 'f-s': !(s >= 0), 'f-c': !(c > 0), 'f-l': !(L >= 0 && L <= 30) };
      Object.entries(bad).forEach(([id, b]) => ui.$('#' + id).classList.toggle('invalid', b));
      if (Object.values(bad).some(Boolean)) { ui.$('#wOut').innerHTML = '<div class="empty" style="padding:30px 0;text-align:center">Fix the highlighted inputs to see the comparison.</div>'; return; }
      FSI.set({ whatif: { node: n.id, item: st.item, s, c: n.type === 'post' ? c : base.c, L: Math.max(n.tr, Math.round(L)) } }, { quiet: true }); out();
    };
    ['wS', 'wC', 'wL'].forEach(id => ui.$('#' + id).addEventListener('change', read));
    ['wS', 'wC', 'wL'].forEach(id => ui.$('#' + id).addEventListener('input', () => { clearTimeout(V._t); V._t = setTimeout(read, 250); }));
    out();
    function out() {
      const st2 = FSI.state, w2 = st2.whatif && st2.whatif.node === n.id && st2.whatif.item === st2.item ? st2.whatif : null;
      const v2 = { s: w2 ? w2.s : base.s, c: w2 ? w2.c : base.c, L: w2 ? w2.L : base.L, q: base.q };
      const s = v2.s * (1 - st2.inv / 100), c = v2.c, c2 = c * (1 + st2.cons / 100), L = v2.L, d = st2.delay, A = L + d;
      // same projection the network simulation uses
      const pN = E.project(s, c, [], L), pD = E.project(s, c2, [], A);
      const remN = pN.short > 0 ? -pN.short * c : pN.end, remD = pD.short > 0 ? -pD.short * c2 : pD.end, tN = pN.Y, tD = pD.Y, mN = tN - L, mD = tD - A;
      const sev = m => m >= 2 ? ['green', 'LOW', `stock outlasts delivery by ${fmt(m, 1)} d`] : m >= 0 ? ['amber', 'WATCH', `only ${fmt(m, 1)} d of margin`] : m > -2 ? ['red', 'HIGH', `runs out ${fmt(-m, 1)} d before delivery`] : ['red', 'CRITICAL', `runs out ${fmt(-m, 1)} d before delivery`];
      const [cN, lN, tNt] = sev(mN), [cD, lD, tDt] = sev(mD);
      const shortU = Math.max(0, -remD), cost = shortU * it.kg * CONFIG.airRate / 1e5, sSd = n.type === 'post' ? E.stockSd(st2, n.id) : 0;
      const P = (T, cc) => E.riskClass(E.riskIndex(s, cc, it.cv, sSd, T));
      const card = (cls, title, Ad, rem, t, p, c_, l_, tx) => `<div class="card ${cls}"><h4>${title} <span class="est">EST.</span></h4><dl class="kv">
        <dt>Delivery arrives</dt><dd>${ui.when(Ad)}</dd><dt>Stock at arrival</dt><dd>${rem >= 0 ? fmt(rem) : 0} ${it.unit}</dd><dt>Time to stock-out</dt><dd>${fmt(t, 1)} d</dd>
        <dt>Risk class (rule-based)</dt><dd>${p}</dd><dt>Shortage</dt><dd>${rem < 0 ? fmt(-rem) + ' ' + it.unit : 'none'}</dd></dl><div style="margin-top:8px">${badge(c_)} <span style="font-size:12.5px">${l_} · ${tx}</span></div></div>`;
      ui.$('#wOut').innerHTML = `<div class="cmp2">${card('nor', 'Normal delivery', L, remN, tN, P(L, c), cN, lN, tNt)}${card('dis', `Disrupted (+${d} d, ${st2.cons >= 0 ? '+' : ''}${st2.cons}% use)`, A, remD, tD, P(A, c2), cD, lD, tDt)}</div>
        <div class="verdict ${cD}">${badge(cD)}<p><b>Estimated impact:</b> ${remD < 0 ? `${n.name} would run out of ${it.name.toLowerCase()} on ${ui.when(tD)}, ${fmt(A - tD, 1)} d before the delivery on ${ui.when(A)}. The gap is ${fmt(shortU)} ${it.unit}; covering it by air maintenance costs about <b>₹${fmt(cost, 1)} lakh</b> <span class="est">ILLUSTRATIVE ₹${CONFIG.airRate}/kg</span>.` : mD < 2 ? `No stock-out expected, but the margin shrinks from ${fmt(mN, 1)} d to ${fmt(mD, 1)} d.` : `Delay absorbed: stock lasts ${fmt(mD, 1)} d beyond delivery.`}</p></div>
        ${n.type === 'depot' ? '<p class="note">For a depot, a shortage here means dispatches fall behind. The Ripple page shows which posts are hit.</p>' : ''}
        <div class="chart-wrap" style="margin-top:10px"><svg class="fluid" id="wChart" viewBox="0 0 640 230" role="img" aria-label="Projected stock"></svg><div class="tip" id="wTip"></div></div>
        <div class="legend"><span><i style="border-color:var(--navy-500)"></i>Normal</span><span><i style="border-color:var(--dis);border-top-style:dashed"></i>Disrupted</span><span><i class="box" style="background:rgba(198,40,40,.15)"></i>shortage window</span><span>▼ delivery</span></div>`;
      chart({ s, c, c2, L, A, q: v2.q, F: 1 - st2.short / 100, tD, unit: it.unit });
    }
    function chart(o) {
      const svg = ui.$('#wChart'), W = 640, Hh = 230, ml = 56, mr = 14, mt = 14, mb = 28, days = Math.max(10, Math.ceil(o.A + 4));
      const ser = (cc, arr, F) => { const p = []; let s = o.s; for (let t = 0; t <= days; t += 0.5) { if (Math.abs(t - arr) < 0.01) s += o.q * F; p.push({ t, v: Math.max(0, s) }); s -= cc * 0.5; } return p; };
      const a = ser(o.c, o.L, 1), b = ser(o.c2, o.A, o.F), ymax = Math.max(...a.map(p => p.v), ...b.map(p => p.v)) * 1.08 || 1;
      const X = t => ml + t / days * (W - ml - mr), Y = v => mt + (Hh - mt - mb) * (1 - v / ymax);
      for (let k = 0; k <= 4; k++) { const v = ymax * k / 4; ui.svg('line', { x1: ml, x2: W - mr, y1: Y(v), y2: Y(v), stroke: k ? '#E6EAF0' : '#9AA6B4' }, svg); ui.svg('text', { x: ml - 6, y: Y(v) + 4, 'text-anchor': 'end', 'font-size': 10, fill: '#6B7887', 'font-family': 'IBM Plex Mono' }, svg).textContent = fmt(v); }
      for (let t = 0; t <= days; t += 2) ui.svg('text', { x: X(t), y: Hh - 10, 'text-anchor': 'middle', 'font-size': 10, fill: '#6B7887', 'font-family': 'IBM Plex Mono' }, svg).textContent = t ? 'd' + t : 'now';
      if (o.tD < o.A) ui.svg('rect', { x: X(o.tD), y: mt, width: X(Math.min(o.A, days)) - X(o.tD), height: Hh - mt - mb, fill: 'rgba(198,40,40,.12)' }, svg);
      const path = p => p.map((q, i) => (i ? 'L' : 'M') + X(q.t).toFixed(1) + ' ' + Y(q.v).toFixed(1)).join('');
      ui.svg('path', { d: path(a), fill: 'none', stroke: '#2A5687', 'stroke-width': 2 }, svg);
      ui.svg('path', { d: path(b), fill: 'none', stroke: '#7A3E9D', 'stroke-width': 2, 'stroke-dasharray': '6 4' }, svg);
      [[o.L, '#2A5687'], [o.A, '#7A3E9D']].forEach(([t, c]) => { if (t <= days) ui.svg('path', { d: `M${X(t) - 5} ${mt} L${X(t) + 5} ${mt} L${X(t)} ${mt + 8}Z`, fill: c }, svg); });
      const cross = ui.svg('line', { y1: mt, y2: Hh - mb, stroke: '#14202E', opacity: 0 }, svg), hit = ui.svg('rect', { x: ml, y: mt, width: W - ml - mr, height: Hh - mt - mb, fill: 'transparent' }, svg), tip = ui.$('#wTip');
      hit.addEventListener('mousemove', e => { const r = svg.getBoundingClientRect(); let t = Math.round(((e.clientX - r.left) * W / r.width - ml) / (W - ml - mr) * days * 2) / 2; t = Math.max(0, Math.min(days, t)); const i = Math.round(t * 2);
        cross.setAttribute('x1', X(t)); cross.setAttribute('x2', X(t)); cross.setAttribute('opacity', 0.4); tip.style.display = 'block';
        tip.innerHTML = `${ui.when(t)}<br>normal ${fmt(a[i].v)} ${o.unit}<br>disrupted ${fmt(b[i].v)} ${o.unit}`; const px = X(t) * r.width / W; tip.style.left = (px > r.width * 0.6 ? px - tip.offsetWidth - 10 : px + 10) + 'px'; tip.style.top = '20px'; });
      hit.addEventListener('mouseleave', () => { tip.style.display = 'none'; cross.setAttribute('opacity', 0); });
    }
  };

  /* ================= 04 RIPPLE ================= */
  V.ripple = (root, st) => {
    const R = E.simulate(st, {}), it = ITEMS[st.item], src = R[st.source], sub = [...E.subtree(st.source)].map(id => R[id]);
    const affected = sub.filter(r => r.risk !== 'green' && r.n.id !== st.source), reds = E.urgentPosts(R), urg = reds[0];
    const rows = NODES.map(n => R[n.id]).sort((a, b) => ({ red: 0, amber: 1, green: 2 }[a.risk] - { red: 0, amber: 1, green: 2 }[b.risk]) || (a.Y ?? 99) - (b.Y ?? 99));
    root.innerHTML = `
      <p class="intro">One disruption traced through the <b>actual links</b> of the network. A depot with enough buffer absorbs a delay; one without passes it on to the posts it supplies. Click any node to make it the source.</p>
      <div class="panel" style="margin-bottom:12px"><div class="pb ctl-row">
        <div class="field"><label for="rSrc">Disrupted node</label><select id="rSrc">${NODES.map(x => `<option value="${x.id}">${x.name} · ${x.role}</option>`).join('')}</select></div>
        <div class="field"><label for="rD">Supply delay at source</label><div class="row"><input type="range" id="rD" data-fmt="delay" min="0" max="10" value="${st.delay}"><output class="val">+${st.delay} d</output></div></div>
        <div class="field"><label for="rS">Shortage in incoming delivery</label><div class="row"><input type="range" id="rS" data-fmt="plain" min="0" max="80" step="10" value="${st.short}"><output class="val">${st.short}%</output></div></div>
        <div><button type="button" class="btn" id="rReset">Reset disruption</button></div></div></div>
      <div class="grid m2">
        <div class="panel"><div class="ph"><h3>Supply network</h3><span class="hint">Arrows = supply direction · dotted = lateral transfer allowed</span></div>
          <svg class="net" id="net" viewBox="0 0 900 470" role="img" aria-label="Supply network"></svg>
          <div class="legend" style="padding:8px 14px 10px">${badge('green')} no effect / buffer holds ${badge('amber')} delayed or thin ${badge('red')} shortage expected</div></div>
        <div class="panel"><div class="ph"><h3>Impact chain</h3></div><div class="pb">
          ${urg ? `<div class="urgent"><h4>MOST URGENT · ${esc(urg.n.name.toUpperCase())}</h4><p>Runs out of ${it.name.toLowerCase()} on <b>${ui.when(urg.Y)}</b>; delivery ${Number.isFinite(urg.A) && urg.A <= H ? 'on <b>' + ui.when(urg.A) + '</b>' : '<b>not within 14 d</b>'}. It ranks first on priority × shortage (priority ${urg.n.prio}, ${fmt(urg.short, 1)} d short). <b>Action:</b> ${esc(actionFor(st, R, urg.n.id))}. <a href="#/clock" onclick="FSI.set({focus:'${urg.n.id}',clockItem:'${st.item}'},{quiet:true})">See its deadline →</a></p></div>`
            : `<div class="urgent ok"><h4>NO SHORTAGE EXPECTED</h4><p>${sub.some(r => r.risk === 'amber') ? 'Some nodes are delayed or thin, but every post holds until delivery.' : 'The network absorbs this disruption.'}</p></div>`}
          <ol class="flow">
            <li><b>Supply delay</b>${st.delay || st.short || st.routeOut ? esc(src.why.concat(st.routeOut && st.source !== 'DB' ? R.DB.why : []).join('; ')) : 'No delay set. Use the sliders or the What-If page.'}</li>
            <li><b>Inventory reduction</b>${src.n.type === 'depot' ? `${src.n.name} holds ${fmt(src.s)} ${it.unit} (${fmt(src.s / src.c, 1)} d of outflow). ${src.lateKids ? `It fills ${src.queue.filter(q => q.ok).length} of ${src.queue.length} scheduled loads before running dry.` : 'Its buffer covers every scheduled load.'}` : `${src.n.name} stock falls to ${fmt(Math.max(0, src.s - src.c * Math.min(src.A, H)))} ${it.unit} by delivery.`}</li>
            <li><b>Potential shortage</b>${reds.length ? reds.map(r => `${r.n.name} from ${ui.when(r.Y)} (${fmt(r.short, 1)} d)`).join('; ') : 'None expected within 14 days.'}</li>
            <li><b>Downstream disruption</b>${affected.length ? `${affected.length} node${affected.length > 1 ? 's' : ''} downstream affected: ${affected.filter(r => r.risk === 'red').length} red, ${affected.filter(r => r.risk === 'amber').length} amber.` : 'No downstream node affected.'}</li>
            <li><b>Recommended action</b>${urg ? esc(actionFor(st, R, urg.n.id)) : affected.length ? esc(actionFor(st, R, affected[0].n.id)) : 'Continue the normal schedule and monitor.'}</li>
          </ol></div></div>
      </div>
      <div class="panel" style="margin-top:12px"><div class="ph"><h3>Node-by-node impact</h3><span class="est">ESTIMATES</span></div><div class="pb scroll" style="padding-top:0"><table class="t">
        <thead><tr><th>Node</th><th>Risk</th><th class="n">Stock lasts</th><th class="n">Delivery</th><th>Risk class<br><span style="text-transform:none">rule-based</span></th><th>Reason</th><th>Recommended action</th></tr></thead><tbody>
        ${rows.map(r => { const p = r.n.type === 'post'; return `<tr><td><b>${r.n.name}</b><br><span style="font-size:11.5px;color:var(--muted)">${r.n.role}</span></td><td>${badge(r.risk)}</td>
          <td class="n">${fmt(p ? r.Y : r.s / r.c, 1)} d</td><td class="n">${Number.isFinite(r.A) && r.A <= H ? ui.when(r.A) : 'none ≤14 d'}${r.D > 0 && Number.isFinite(r.D) ? `<br><span style="color:var(--crit-ink);font-size:11px">+${r.D} d</span>` : ''}</td>
          <td>${p ? r.riskClass : '—'}</td><td class="reason">${esc(E.explain(st, R, r.n.id).join(' → ') || 'Not on the disrupted path; schedule unchanged.')}</td><td style="font-size:12.5px">${esc(actionFor(st, R, r.n.id))}</td></tr>`; }).join('')}
      </tbody></table></div></div>`;
    ui.$('#rSrc').value = st.source;
    ui.$('#rSrc').onchange = e => FSI.set({ source: e.target.value });
    ui.$('#rD').onchange = e => FSI.set({ delay: +e.target.value });
    ui.$('#rS').onchange = e => FSI.set({ short: +e.target.value });
    ui.$('#rReset').onclick = () => FSI.set({ delay: 0, short: 0, source: 'DB' });
    drawNet(ui.$('#net'), st, R);
  };
  function drawNet(svg, st, R) {
    const BW = 180, BH = 56, colr = { green: ['#E8F5EC', '#2E9E4A'], amber: ['#FDF4DC', '#E0A100'], red: ['#FBE9E9', '#C62828'] };
    const defs = ui.svg('defs', {}, svg);
    ['n', 'r'].forEach(k => { const m = ui.svg('marker', { id: 'ar' + k, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs); ui.svg('path', { d: 'M0 0 L10 5 L0 10z', fill: k === 'r' ? '#C62828' : '#6B7887' }, m); });
    NODES.filter(n => n.parent).forEach(n => {
      const p = E.BYID[n.parent], r = R[n.id], x1 = p.net.x + BW, y1 = p.net.y + BH / 2, x2 = n.net.x - 4, y2 = n.net.y + BH / 2, mx = (x1 + x2) / 2;
      const bad = r.D > 0 || r.F < 1, cut = n.id === 'DB' && st.routeOut && !r.rerouted;
      ui.svg('path', { d: `M${x1} ${y1} C${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`, fill: 'none', stroke: bad || cut ? '#C62828' : '#8C98A6', 'stroke-width': bad ? 2.4 : 1.6, 'stroke-dasharray': cut ? '4 5' : 'none', 'marker-end': `url(#ar${bad ? 'r' : 'n'})` }, svg);
      const lbl = r.D > 0 ? (Number.isFinite(r.D) ? `+${r.D} d` : 'no supply') : `${n.tr} d transit`, ty = (y1 + y2) / 2 - 6;
      ui.svg('rect', { x: mx - 36, y: ty - 11, width: 72, height: 16, fill: '#fff', stroke: bad ? '#E4A3A3' : '#D6DCE4' }, svg);
      ui.svg('text', { x: mx, y: ty + 1, 'text-anchor': 'middle', 'font-size': 10, 'font-family': 'IBM Plex Mono', fill: bad ? '#A61F1F' : '#44515F' }, svg).textContent = lbl;
    });
    if (st.planB === 'reroute' || st.planB === 'combo') { const p = E.BYID.DA.net, n = E.BYID.DB.net;
      ui.svg('path', { d: `M${p.x + 60} ${p.y} C${p.x + 60} ${n.y - 60}, ${n.x - 80} ${n.y - 70}, ${n.x + 30} ${n.y - 2}`, fill: 'none', stroke: '#5B8DD6', 'stroke-width': 1.6, 'stroke-dasharray': '6 5', 'marker-end': 'url(#arn)' }, svg);
      ui.svg('text', { x: p.x + 70, y: n.y - 50, 'font-size': 10, 'font-family': 'IBM Plex Mono', fill: '#2A5687' }, svg).textContent = 'Route-2 via Pass-2 (Plan B option)'; }
    LATERAL.forEach(([a, b]) => { const A = E.BYID[a].net, B = E.BYID[b].net, x = A.x + BW + 6;
      ui.svg('path', { d: `M${x} ${A.y + BH / 2} C${x + 40} ${A.y + BH / 2}, ${x + 40} ${B.y + BH / 2}, ${x} ${B.y + BH / 2}`, fill: 'none', stroke: '#8FA9C8', 'stroke-width': 1.4, 'stroke-dasharray': '3 4', 'marker-end': 'url(#arn)', 'marker-start': 'url(#arn)' }, svg); });
    NODES.forEach(n => {
      const r = R[n.id], [bg, bd] = colr[r.risk], isSrc = n.id === st.source;
      const g = ui.svg('g', { class: 'node', transform: `translate(${n.net.x},${n.net.y})`, tabindex: 0, role: 'button', 'aria-label': `${n.name}, ${ui.RB[r.risk][1]}. Make disruption source.` }, svg);
      ui.svg('rect', { class: 'box', width: BW, height: BH, fill: bg, stroke: bd, 'stroke-width': isSrc ? 2.6 : 1.4 }, g);
      ui.svg('rect', { width: 5, height: BH, fill: bd }, g);
      ui.svg('text', { x: 14, y: 20, 'font-size': 13, 'font-weight': 600, 'font-family': 'IBM Plex Sans', fill: '#14202E' }, g).textContent = n.name;
      const sub = n.type === 'post' ? (r.short > 0 ? `short ${fmt(r.short, 1)} d from d${fmt(r.Y, 1)}` : `${fmt(r.Y, 1)} d stock · next d${Number.isFinite(r.A) ? r.A : '—'}`) : (r.lateKids ? `${r.lateKids} load${r.lateKids > 1 ? 's' : ''} late` : r.D > 0 ? 'delay absorbed' : n.role);
      ui.svg('text', { x: 14, y: 37, 'font-size': 10.5, 'font-family': 'IBM Plex Mono', fill: '#44515F' }, g).textContent = sub;
      ui.svg('text', { x: 14, y: 50, 'font-size': 9.5, 'font-family': 'IBM Plex Mono', fill: bd === '#E0A100' ? '#7D5300' : bd }, g).textContent = `${ui.RB[r.risk][0]} ${ui.RB[r.risk][1]}${isSrc ? ' · SOURCE' : ''}`;
      const pick = () => FSI.set({ source: n.id });
      g.addEventListener('click', pick); g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
    });
  }

  /* ================= 05 COMPARE PLANS ================= */
  // Every number here comes from one call: E.evaluatePlans(st). The recommendation, the options
  // table and the side-by-side comparison all read the same evaluated candidates.
  V.stress = (root, st) => {
    const it = ITEMS[st.item], ev = E.evaluatePlans(st), A = ev.A, best = ev.best;
    const cmpKey = st.planB && st.planB !== 'A' ? st.planB : 'reroute', B = ev.cands.find(c => c.key === cmpKey);
    const mA = A.m, mB = B.m;
    const shortTxt = m => m.shortList.length ? m.shortList.map(x => `${x.name} from day ${fmt(x.from, 1)} (${fmt(x.days, 1)} d, ${fmt(x.units)} ${it.unit})`).join('; ') : 'none';
    let limit = '';
    if (best.m.stockouts > 0) {
      const units = best.m.shortUnits, sorties = Math.ceil(units * it.kg / CONFIG.sortieKg);
      const rem = best.m.shortList, cut = Math.max(...rem.map(x => { const r = best.R[x.id]; return (1 - r.Y / Math.min(r.A, CONFIG.horizon)) * 100; }));
      limit = `<div class="limit"><b>No evaluated plan removes every shortage.</b> Still short with the recommendation: ${esc(shortTxt(best.m))}. Any one of these would close the gap: <b>${sorties} more air sortie${sorties > 1 ? 's' : ''}</b> of 2 t (if flyable); a consumption cut of about <b>${fmt(Math.min(99, cut))}%</b> at the worst post; or the disruption cleared ${fmt(Math.max(...rem.map(x => x.days)), 1)} d sooner.</div>`;
    }
    const rowsDef = [['Posts with stock-out', m => m.stockouts, v => v, 'low'], ['Shortage (post-days)', m => m.sumShort, v => fmt(v, 1), 'low'], ['Shortage volume', m => m.shortUnits, v => fmt(v) + ' ' + it.unit, 'low'],
      ['First stock-out (day)', m => m.firstOut == null ? 99 : m.firstOut, v => v === 99 ? 'none' : fmt(v, 1), 'high'], ['Average next delivery (day)', m => m.avgArr, v => fmt(v, 1), 'low'],
      ['Extra cost (₹ lakh, illustrative)', m => m.cost, v => fmt(v, 1), 'low']];
    const scoreCell = c => c.applicable ? fmt(c.score.total, 2) : '—';
    root.innerHTML = `
      <p class="intro">Stress the current situation, then let the system evaluate <b>every</b> permitted plan with the same simulation and the same score. The recommendation is the best of all of them. The side-by-side table lets you look at any one plan against the current schedule.</p>
      <div class="grid m3">
        <div class="panel"><div class="ph"><h3>Scenario builder</h3></div><div class="pb form">
          <div class="field"><label id="sDL">Delivery delayed by</label><div class="chips" role="group" aria-labelledby="sDL">${[0, 3, 5, 7].map(d => `<button type="button" data-d="${d}" aria-pressed="${st.delay === d}">${d ? '+' + d + ' d' : 'None'}</button>`).join('')}</div><div class="help">Applied at ${E.BYID[st.source].name}, the shared source.</div></div>
          <div class="field"><label for="sC">Increased consumption</label><div class="row"><input type="range" id="sC" data-fmt="pct" min="-30" max="60" step="5" value="${st.cons}"><output class="val">${st.cons >= 0 ? '+' : ''}${st.cons}%</output></div></div>
          <div class="field"><label for="sI">Reduced inventory availability</label><div class="row"><input type="range" id="sI" data-fmt="neg" min="0" max="60" step="5" value="${st.inv}"><output class="val">−${st.inv}%</output></div><div class="help">Spoilage, damage or a count correction in the disrupted area.</div></div>
          <label class="check"><input type="checkbox" id="sR" ${st.routeOut ? 'checked' : ''}> <span><b>Route-1 via Pass-1 unavailable</b><br><span style="color:var(--muted);font-size:12px">Depot-B gets no road resupply on Route-1 within 14 days. No plan may use Route-1.</span></span></label>
          <div class="field"><label for="sP">Decision priority</label><select id="sP"><option value="balanced">Balanced (risk 60 · time 25 · cost 15)</option><option value="risk">Minimise shortage (80 · 15 · 5)</option><option value="cost">Minimise cost (40 · 20 · 40)</option></select></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn primary" id="sSave">Save run to history</button><button type="button" class="btn" id="sReset">Reset stress</button></div>
        </div></div>
        <div class="panel"><div class="ph"><h3>Recommendation · ${it.name}</h3><span class="est">ESTIMATES · COSTS ILLUSTRATIVE</span></div><div class="pb">
          <div class="reco"><h4>RECOMMENDED · BEST OF ${ev.ranked.length} APPLICABLE PLANS · COMMANDER DECIDES</h4><div class="big">${esc(best.name)}</div>
            <ul><li><b>Why:</b> ${esc(ev.reason)}.</li><li><b>Posts still short:</b> ${esc(shortTxt(best.m))}.</li>${best.key !== 'A' ? `<li><b>Cost:</b> ₹${fmt(best.m.cost, 1)} lakh extra (illustrative).</li>` : ''}${best.notes.length ? `<li><b>Note:</b> ${esc(best.notes.join('; '))}.</li>` : ''}</ul>
            ${FSI.whyPlanBox(st, ev)}</div>
          ${limit}
          <div style="font-size:12.5px;font-weight:600;margin:14px 0 4px">All plans evaluated · same simulation, same score (lower is better)</div>
          <div class="scroll"><table class="t"><thead><tr><th>Plan</th><th class="n">Posts short</th><th class="n">Shortage post-days</th><th class="n">First stock-out</th><th class="n">₹ lakh</th><th class="n">Score</th><th></th></tr></thead><tbody>
            ${ev.cands.map(c => `<tr${c === best ? ' style="background:var(--navy-100)"' : ''}><td>${esc(c.name)}${c.notes.length ? `<br><span class="na" style="font-size:11.5px">${esc(c.notes[0])}</span>` : ''}</td>
              <td class="n">${c.applicable ? c.m.stockouts : '—'}</td><td class="n">${c.applicable ? fmt(c.m.sumShort, 1) : '—'}</td><td class="n">${c.applicable ? (c.m.firstOut == null ? 'none' : 'day ' + fmt(c.m.firstOut, 1)) : '—'}</td><td class="n">${c.applicable ? fmt(c.m.cost, 1) : '—'}</td><td class="n">${scoreCell(c)}</td>
              <td>${c === best ? '<span class="fact">RECOMMENDED</span>' : !c.applicable ? '<span class="na">not applicable</span>' : `<button type="button" class="btn sm" data-cmp="${c.key}">Compare</button>`}</td></tr>`).join('')}</tbody></table></div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:16px 0 6px"><b style="font-size:12.5px">Side by side:</b><span style="font-size:12.5px">Plan A · current schedule vs</span>
            <select id="sB" aria-label="Plan to compare with Plan A">${ev.cands.filter(c => c.key !== 'A').map(c => `<option value="${c.key}" ${c.key === cmpKey ? 'selected' : ''}>${esc(c.name)}${c === best ? ' (recommended)' : ''}</option>`).join('')}</select></div>
          ${B.applicable ? '' : `<p class="note" style="margin-top:0">${esc(B.name)} is not applicable in this situation: ${esc(B.notes.join('; '))}. It is shown identical to Plan A.</p>`}
          <div class="scroll"><table class="t cmp"><thead><tr><th>Metric</th><th class="n">Plan A · current</th><th class="n">${esc(B.name)}</th></tr></thead><tbody>
            ${rowsDef.map(([l, f, fm, dir]) => { const a = f(mA), b = f(mB), eq = Math.abs(a - b) < 1e-9, aB = !eq && (dir === 'low' ? a < b : a > b); return `<tr><td>${l}</td><td class="n ${aB ? 'better' : ''}">${fm(a)}</td><td class="n ${!eq && !aB ? 'better' : ''}">${fm(b)}</td></tr>`; }).join('')}
            <tr><td>Score (same scale as the table above)</td><td class="n">${scoreCell(A)}</td><td class="n">${scoreCell(B)}</td></tr></tbody></table></div>
          <div style="font-size:12.5px;font-weight:600;margin:12px 0 4px">Days of margin per post (below zero = shortage)</div><div class="chart-wrap"><svg class="fluid" id="sBars" viewBox="0 0 520 250" role="img" aria-label="Margin per post"></svg><div class="tip" id="sTip"></div></div>
          <div class="legend"><span><i class="box" style="background:var(--planA)"></i>Plan A · current</span><span><i class="box" style="background:var(--planB)"></i>${esc(B.name)}</span></div>
        </div></div>
      </div>
      <div class="panel" style="margin-top:12px"><div class="ph"><h3>Scenario history</h3><button type="button" class="btn sm" id="hClear" style="margin-left:auto">Clear</button></div><div class="pb scroll" style="padding-top:0"><table class="t">
        ${(st.hist || []).length ? `<thead><tr><th>#</th><th>Saved</th><th>Scenario</th><th class="n">Short (current)</th><th class="n">Short (recommended)</th><th>Recommended</th><th></th></tr></thead><tbody>${st.hist.map((h, i) => `<tr><td class="n">${st.hist.length - i}</td><td style="font-family:var(--mono);font-size:12px">${esc(h.at)}</td>
          <td style="font-size:12.5px">${ITEMS[h.sc.item].name} · ${E.BYID[h.sc.source].name} · +${h.sc.delay} d · use ${h.sc.cons >= 0 ? '+' : ''}${h.sc.cons}% · stock −${h.sc.inv}%${h.sc.routeOut ? ' · Route-1 closed' : ''}</td><td class="n">${h.a}</td><td class="n">${h.b}</td><td>${esc(h.reco)}</td><td><button type="button" class="btn sm" data-restore="${i}">Restore</button></td></tr>`).join('')}</tbody>`
          : '<tbody><tr><td class="empty" style="border:0">No saved runs yet.</td></tr></tbody>'}</table></div></div>`;
    ui.$('#sP').value = st.prio;
    root.querySelectorAll('[data-d]').forEach(b => b.onclick = () => FSI.set({ delay: +b.dataset.d }));
    root.querySelectorAll('[data-cmp]').forEach(b => b.onclick = () => FSI.set({ planB: b.dataset.cmp }));
    ui.$('#sC').onchange = e => FSI.set({ cons: +e.target.value });
    ui.$('#sI').onchange = e => FSI.set({ inv: +e.target.value });
    ui.$('#sR').onchange = e => FSI.set({ routeOut: e.target.checked });
    ui.$('#sB').onchange = e => FSI.set({ planB: e.target.value });
    ui.$('#sP').onchange = e => FSI.set({ prio: e.target.value });
    ui.$('#sReset').onclick = () => FSI.set({ cons: 0, inv: 0, routeOut: false, planB: 'reroute', prio: 'balanced' });
    ui.$('#sSave').onclick = () => {
      const sc0 = { item: st.item, source: st.source, delay: st.delay, cons: st.cons, short: st.short, inv: st.inv, routeOut: st.routeOut, planB: st.planB, prio: st.prio };
      const h = [{ at: new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }), sc: sc0, a: mA.stockouts, b: best.m.stockouts, reco: best.name }].concat(st.hist || []).slice(0, 20);
      FSI.set({ hist: h });
    };
    ui.$('#hClear').onclick = () => FSI.set({ hist: [] });
    root.querySelectorAll('[data-restore]').forEach(b => b.onclick = () => FSI.set(Object.assign({}, st.hist[+b.dataset.restore].sc)));
    bars(ui.$('#sBars'), A.R, B.R);
  };
  function bars(svg, RA, RB) {
    const W = 520, Hh = 250, ml = 40, mr = 8, mt = 12, mb = 40, ps = E.POSTS.map(p => ({ n: p, a: RA[p.id].margin, b: RB[p.id].margin }));
    const vals = ps.flatMap(p => [p.a, p.b]).filter(Number.isFinite), mx = Math.min(30, Math.max(4, ...vals)), mn = Math.max(-20, Math.min(-2, ...vals));
    const Y = v => mt + (Hh - mt - mb) * (mx - v) / (mx - mn), gw = (W - ml - mr) / ps.length, bw = Math.min(22, gw / 3), tip = ui.$('#sTip');
    for (let v = Math.ceil(mn / 2) * 2; v <= mx; v += 2) { ui.svg('line', { x1: ml, x2: W - mr, y1: Y(v), y2: Y(v), stroke: v === 0 ? '#14202E' : '#E6EAF0', 'stroke-width': v === 0 ? 1.2 : 1 }, svg); ui.svg('text', { x: ml - 5, y: Y(v) + 4, 'text-anchor': 'end', 'font-size': 10, fill: '#6B7887', 'font-family': 'IBM Plex Mono' }, svg).textContent = v; }
    ps.forEach((p, i) => {
      const cx = ml + gw * i + gw / 2;
      [[p.a, '#17365D', -1, 'Plan A'], [p.b, '#5B8DD6', 1, 'Plan B']].forEach(([v, c, s, lab]) => {
        const x = cx + s * (bw / 2 + 1) - bw / 2, y0 = Y(0), y1 = Y(Math.max(mn, Math.min(mx, v)));
        const r = ui.svg('rect', { x, y: Math.min(y0, y1), width: bw, height: Math.max(1, Math.abs(y1 - y0)), fill: c, stroke: v < 0 ? '#C62828' : 'none', 'stroke-width': 1.5 }, svg);
        r.addEventListener('mousemove', () => { const b = svg.getBoundingClientRect(); tip.style.display = 'block'; tip.innerHTML = `${p.n.name}<br>${lab}: ${fmt(v, 1)} d ${v < 0 ? '(shortage)' : 'margin'}`; tip.style.left = Math.min(b.width - 150, (x + bw) * b.width / W + 6) + 'px'; tip.style.top = (Math.min(y0, y1) * b.height / Hh) + 'px'; });
        r.addEventListener('mouseleave', () => tip.style.display = 'none');
      });
      ui.svg('text', { x: cx, y: Hh - mb + 16, 'text-anchor': 'middle', 'font-size': 10.5, fill: '#14202E', 'font-family': 'IBM Plex Sans' }, svg).textContent = p.n.name.replace('Post ', '');
      if (Math.min(p.a, p.b) < 0) ui.svg('text', { x: cx, y: Hh - mb + 29, 'text-anchor': 'middle', 'font-size': 9.5, fill: '#A61F1F', 'font-family': 'IBM Plex Mono' }, svg).textContent = 'short';
    });
  }
})();

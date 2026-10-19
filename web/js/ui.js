/* Small UI helpers shared by all views. */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const E = FSI.engine;
  const ui = {};
  ui.$ = s => document.querySelector(s);
  ui.$$ = s => Array.from(document.querySelectorAll(s));
  ui.svg = (tag, a, p) => { const e = document.createElementNS(NS, tag); for (const k in (a || {})) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; };
  ui.esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  ui.fmt = E.fmt;
  const RB = { green: ['✓', 'GREEN'], amber: ['!', 'AMBER'], red: ['✕', 'RED'] };
  ui.RB = RB;
  ui.badge = r => `<span class="rb ${r}"><i aria-hidden="true">${RB[r][0]}</i>${RB[r][1]}</span>`;
  ui.tag = (cls, icon, text) => `<span class="rb ${cls}"><i aria-hidden="true">${icon}</i>${text}</span>`;

  // "Now" is the moment the page loaded, rounded down to the hour. Day 0 = now.
  const now = new Date(); now.setMinutes(0, 0, 0);
  ui.NOW = now;
  ui.dayDate = d => new Date(now.getTime() + d * 86400000);
  ui.when = d => {
    if (!Number.isFinite(d)) return 'none in 14 d';
    const t = ui.dayDate(d); t.setMinutes(0, 0, 0); // deadlines round DOWN to the hour
    return t.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' }) + ' ' + t.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
  };
  ui.rel = d => {
    if (!Number.isFinite(d)) return '—';
    if (d <= 0) return 'overdue';
    const h = Math.round(d * 24);
    return h < 24 ? `in ${h} h` : `in ${Math.floor(h / 24)} d ${h % 24} h`;
  };
  ui.dtg = () => {
    const d = new Date(), p = n => String(n).padStart(2, '0');
    return `${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}`;
  };

  ui.statusTag = s => ({
    covered: ui.tag('green', '✓', 'NO ACTION'),
    plan: ui.tag('blue', 'i', 'PLAN'),
    soon: ui.tag('amber', '!', 'DECIDE SOON'),
    now: ui.tag('red', '!', 'DECIDE NOW'),
    late: ui.tag('red', '✕', 'TOO LATE'),
  }[s]);

  // Schematic sector map (fictional coordinates; not to scale).
  ui.sectorMap = (svg, st, worstByPost, onPick) => {
    svg.innerHTML = '';
    const g = ui.svg('g', {}, svg);
    // terrain hint: soft contour rings around fictional peaks
    [[300, 200, 7, 1], [140, 70, 5, 2], [620, 290, 4, 3], [520, 30, 4, 4]].forEach(([cx, cy, n, s]) => {
      for (let i = 1; i <= n; i++) {
        let d = ''; const r0 = i * 18;
        for (let a = 0; a <= 48; a++) {
          const t = a / 48 * Math.PI * 2, rr = r0 * (1 + 0.16 * Math.sin(3 * t + s) + 0.08 * Math.sin(5 * t + 2 * s));
          d += (a ? 'L' : 'M') + (cx + rr * Math.cos(t) * 1.3).toFixed(1) + ' ' + (cy + rr * Math.sin(t)).toFixed(1);
        }
        ui.svg('path', { d: d + 'Z', fill: 'none', stroke: i % 3 ? '#E2E7EE' : '#D3DAE3', 'stroke-width': 1 }, g);
      }
    });
    const N = FSI.NODES, by = E.BYID, P = FSI.PASSES;
    const line = (a, b, attrs) => ui.svg('line', Object.assign({ x1: a.x, y1: a.y, x2: b.x, y2: b.y }, attrs), svg);
    // Pass-2 alternate (dashed)
    ui.svg('path', { d: `M${by.DA.map.x} ${by.DA.map.y} L${P.P2.x} ${P.P2.y} L${by.DB.map.x} ${by.DB.map.y}`, fill: 'none', stroke: '#8FA9C8', 'stroke-width': 1.6, 'stroke-dasharray': '6 5' }, svg);
    // main roads
    const cut = st.routeOut;
    line(by.DA.map, P.P1, { stroke: cut ? '#C62828' : '#6B7887', 'stroke-width': 2.4, 'stroke-dasharray': cut ? '3 4' : 'none' });
    line(P.P1, by.DB.map, { stroke: cut ? '#C62828' : '#6B7887', 'stroke-width': 2.4, 'stroke-dasharray': cut ? '3 4' : 'none' });
    line(by.DA.map, by.TH.map, { stroke: '#6B7887', 'stroke-width': 2.4 });
    N.filter(n => n.type === 'post').forEach(n => line(by[n.parent].map, n.map, { stroke: '#9AA6B4', 'stroke-width': 1.6 }));
    // passes
    Object.entries(P).forEach(([k, p]) => {
      const closed = k === 'P1' && cut;
      const gp = ui.svg('g', { transform: `translate(${p.x},${p.y})` }, svg);
      ui.svg('path', { d: 'M-9 7 L0 -9 L9 7Z', fill: closed ? '#C62828' : '#fff', stroke: closed ? '#C62828' : '#44515F', 'stroke-width': 1.5 }, gp);
      ui.svg('text', { x: 13, y: 4, 'font-size': 11, 'font-family': 'IBM Plex Mono', fill: closed ? '#A61F1F' : '#44515F' }, gp).textContent = p.label + (closed ? ' · CLOSED' : k === 'P2' ? ' · light vehicles' : '');
    });
    const col = { green: '#2E9E4A', amber: '#E0A100', red: '#C62828' };
    N.forEach(n => {
      const w = worstByPost[n.id], risk = w ? w.risk : 'green';
      const gn = ui.svg('g', { transform: `translate(${n.map.x},${n.map.y})`, tabindex: 0, role: 'button', class: 'node',
        'aria-label': `${n.name}: ${RB[risk][1]}${w && w.label ? ', ' + w.label : ''}` }, svg);
      if (n.type === 'depot') ui.svg('path', { d: 'M0 -11 L11 0 L0 11 L-11 0Z', fill: '#fff', stroke: '#14202E', 'stroke-width': 1.8 }, gn);
      else {
        const fr = E.freshness(st, n.id);
        ui.svg('rect', { x: -9, y: -9, width: 18, height: 18, fill: col[risk], stroke: fr === 'stale' ? '#14202E' : '#fff', 'stroke-width': 1.6, 'stroke-dasharray': fr === 'stale' ? '3 2' : 'none' }, gn);
        ui.svg('text', { x: 0, y: 4, 'text-anchor': 'middle', 'font-size': 10, 'font-weight': 700, fill: risk === 'amber' ? '#2B1D00' : '#fff', 'font-family': 'IBM Plex Mono' }, gn).textContent = RB[risk][0];
      }
      ui.svg('text', { x: 15, y: -2, 'font-size': 12, 'font-weight': 600, 'font-family': 'IBM Plex Sans', fill: '#14202E' }, gn).textContent = n.name;
      if (w && w.label) ui.svg('text', { x: 15, y: 11, 'font-size': 10, 'font-family': 'IBM Plex Mono', fill: risk === 'green' ? '#6B7887' : risk === 'amber' ? '#7D5300' : '#A61F1F' }, gn).textContent = w.label;
      if (onPick) { gn.addEventListener('click', () => onPick(n.id)); gn.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(n.id); } }); }
    });
    ui.svg('text', { x: 10, y: 438, 'font-size': 10, 'font-family': 'IBM Plex Mono', fill: '#6B7887' }, svg).textContent = 'SCHEMATIC · NOT TO SCALE · FICTIONAL SITES · NO BORDERS SHOWN';
  };

  FSI.ui = ui;
})();

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
  // Knock-on / network severity. Keys are the engine's risk tiers; words are meanings (DESIGN.md §5.1).
  const RB = { green: ['✓', 'OK'], amber: ['!', 'AT RISK'], red: ['✕', 'SHORTAGE'] };
  ui.RB = RB;
  ui.badge = r => `<span class="rb ${r}"><i aria-hidden="true">${RB[r][0]}</i>${RB[r][1]}</span>`;
  // Source / estimate tag (DESIGN.md §5.2): one component, approved words only, tone follows the word.
  const TAG_TONE = { ESTIMATE: 'estimate', SIMULATED: 'estimate', ILLUSTRATIVE: 'estimate', ASSUMED: 'estimate', AVERAGE: 'estimate',
    'REAL PUBLIC': 'real', 'RULE-BASED': 'rule', PLANNED: 'planned', SNAPSHOT: 'planned' };
  ui.srcTag = w => `<span class="tag ${TAG_TONE[w] || 'planned'}">${w}</span>`;
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

  FSI.ui = ui;
})();

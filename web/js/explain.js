/* "Why this recommendation?" boxes. All values come from the engine (explainRow / evaluatePlans). */
(function () {
  const E = FSI.engine, ui = FSI.ui, { CONFIG } = FSI, { fmt, esc } = ui;
  const day = d => Number.isFinite(d) && d <= CONFIG.horizon ? `day ${fmt(d, 1)} (${ui.when(d)})` : 'not within 14 days';
  FSI.dqTag = dq => ui.tag({ good: 'green', fair: 'amber', poor: 'red' }[dq.level], { good: '✓', fair: '!', poor: '✕' }[dq.level], 'DATA ' + dq.level.toUpperCase());

  // For one post + supply (a Decision Clock row)
  FSI.whyBox = (st, row) => {
    const x = E.explainRow(st, row), f = x.freshness || {};
    return `<details class="why"><summary>Why this recommendation?</summary><div class="why-b">
      <dl class="kv2">
        <dt>Post · supply</dt><dd>${esc(x.post)} · ${esc(x.item)}</dd>
        <dt>Stock now</dt><dd>${fmt(x.stock)} ${x.unit}</dd>
        <dt>Expected use</dt><dd>${fmt(x.use, 1)} ${x.unit} per day</dd>
        <dt>Runs out (expected)</dt><dd>${day(x.runsOut)}</dd>
        <dt>Safe until</dt><dd>${day(x.cautious)} <span class="na">assumed demand spread, not calibrated</span></dd>
        <dt>Next scheduled delivery</dt><dd>${day(x.delivery)} · road leg ${x.deliveryLead} d</dd>
        <dt>Data</dt><dd>${FSI.dqTag(x.dq)} report ${f.ageH != null ? f.ageH + ' h old' : 'missing'}${f.via ? ' by ' + esc(f.via) : ''}${x.dq.reasons.length ? ' · ' + esc(x.dq.reasons.join('; ')) : ''}</dd>
        <dt>Route constraints</dt><dd>${x.route.length ? esc(x.route.join('; ')) : 'none'}</dd>
      </dl>
      <table class="t compact"><thead><tr><th>Option evaluated</th><th class="n">Lead</th><th>Order by</th><th class="n">₹ lakh</th><th>Status</th></tr></thead><tbody>
        ${x.alts.map(a => `<tr class="${a.open ? '' : 'no'}"><td>${esc(a.label)}<br><span class="na">${esc(a.why)}</span></td><td class="n">${fmt(a.lead, 1)} d</td><td>${a.open ? ui.when(a.actBy) : '—'}</td><td class="n">${fmt(a.cost, 1)}</td><td>${a.open ? 'open' : 'not available'}</td></tr>`).join('')}
      </tbody></table>
      <p><b>Why:</b> ${esc(x.reason)}.</p>
      ${x.remaining.length ? `<p><b>Remaining risk:</b> ${esc(x.remaining.join('; '))}.</p>` : ''}
    </div></details>`;
  };

  // For the plan recommendation (Compare plans, demo)
  FSI.whyPlanBox = (st, ev) => {
    const b = ev.best, w = b.score.w;
    return `<details class="why"><summary>Why this recommendation?</summary><div class="why-b">
      <p><b>Rule:</b> among applicable plans, fewest posts short wins; then the lowest score; then the lowest cost.
      Score = ${w[0]} × risk + ${w[1]} × time + ${w[2]} × cost, where risk = (shortage post-days + 5 per post short) ÷ ${fmt(Math.max(1, ev.riskRef), 1)} (current schedule's risk), time = average next-delivery day ÷ ${CONFIG.horizon + 1}, cost = ₹ lakh ÷ ${CONFIG.costRef}. These scales are fixed, so a plan's score does not change with which other plans are listed.</p>
      <table class="t compact"><thead><tr><th>Plan</th><th class="n">Short</th><th class="n">Risk</th><th class="n">Time</th><th class="n">Cost</th><th class="n">Score</th></tr></thead><tbody>
        ${ev.cands.map(c => `<tr class="${c.applicable ? '' : 'no'}"><td>${esc(c.name)}${c === b ? ' <b>★</b>' : ''}</td><td class="n">${c.applicable ? c.m.stockouts : '—'}</td><td class="n">${c.applicable ? fmt(c.score.parts.risk, 2) : '—'}</td><td class="n">${c.applicable ? fmt(c.score.parts.time, 2) : '—'}</td><td class="n">${c.applicable ? fmt(c.score.parts.cost, 2) : '—'}</td><td class="n">${c.applicable ? fmt(c.score.total, 2) : 'n/a'}</td></tr>`).join('')}
      </tbody></table>
      <p><b>Chosen:</b> ${esc(b.name)}, because ${esc(ev.reason)}.</p>
      ${b.m.stockouts ? `<p><b>Remaining risk:</b> ${b.m.shortList.map(x => `${esc(x.name)} short ${fmt(x.days, 1)} d from day ${fmt(x.from, 1)}`).join('; ')}.</p>` : '<p><b>Remaining risk:</b> no post runs short in the 14-day horizon under this plan.</p>'}
      ${b.key === 'air' || b.key === 'combo' ? '<p><b>Trade-off:</b> air drops depend on the forecast staying flyable.</p>' : ''}
    </div></details>`;
  };
})();

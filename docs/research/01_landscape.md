# 01 — Landscape: SIH26251 Predictive Logistics & Forward Supply Chain

*Researched 2026-10-09. Public, open-source info only. Confidence: (H) high, (M) medium, (L) low. All named places/units in our own work must stay fictional.*

## TL;DR (read this if nothing else)
- At least **7 public GitHub repos target SIH26251 directly** (found via GitHub search, 2026-10-09). Most are days old, early-stage, and use the same template: forecast + Leaflet map + rerouting + "IoT" + ledger.
- The strongest public competitor (**RASAD**) already has P10/P50/P90 quantile forecasts and closure-aware MILP planning. **Uncertainty bands alone will not set us apart.** What sets us apart is *showing* how the system fails and how honest it is.
- The real Indian Army system (**DIME**, launched Jan 2026) already promises dashboards, exception alerts and stock forecasting. A jury from the Army will have seen dashboards. They have not seen a stress test.

## 1. Public projects and analogues

**RASAD (rahulpravash-design/rasad).** Python/PyTorch/LightGBM, OR-Tools MILP, FastAPI, React + MapLibre, SQLite, Docker. Stock reports are signed (Ed25519) and screened with Isolation Forest. Forecasts are federated (FedAvg) quantile MLPs giving P10/P50/P90. Truck/mule/helicopter planning accounts for seasonal pass closures, and there is a hash-chained audit log. *Strong:* the most technically complete entry; it already does uncertainty and closures. *Missing:* everything runs on synthetic data, and the headline numbers (98.6% fraud detection, 10.8% error, 83% cost cut) are not backed by any interval-coverage check I could see. With that many components it may be hard to demo in 90 s. v0.4, 13 commits. https://github.com/rahulpravash-design/rasad (2026-10-09, M: read via the README summary, not the code)

**AGNILOGIX (amrut4469-blip/army-predictive-logistics-sih).** React + Leaflet/OSM, FastAPI + Celery, PostGIS, OR-Tools VRP. Forecasts with Prophet + XGBoost + LSTM. Ranks stock-out risk by "days of cover", re-routes around closed roads, has a what-if simulator, and requires commander approval. *Strong:* the framing (days of cover, a human approving each decision) is right. *Missing:* the docs promise more than the visible code delivers, the 3-model stack is the generic pattern, and I found no uncertainty or backtest. 26 commits. https://github.com/amrut4469-blip/army-predictive-logistics-sih (2026-10-09, M)

**Predictive-Logistics-Command-system (alanaveen401).** Static HTML/Tailwind + Leaflet + Chart.js, no backend. 14-day forecasts, supply lines coloured by adequacy, rerouting around landslides, simulated RFID/BLE/temperature telemetry, and an app-level "hash-chained ledger". *Strong:* looks polished and has a visual IoT story. *Missing:* everything is simulated client-side, with no real model behind it. https://github.com/alanaveen401/Predictive-Logistics-Command-system (2026-10-09, M)

**ahmed-ab001/Indian-Army.** TypeScript/Vite + Supabase. Tables for convoys, base inventory thresholds, escorts and "predictive_alerts". *Missing:* the ML is barely visible beyond the schema. 5 commits. https://github.com/ahmed-ab001/Indian-Army (2026-10-09, M)

**Other SIH26251-titled repos** (Monriya23, vishalcoder74, ojasvirathore098-pixel, Megharani032006, amrut4469-blip/army-predictive-logistics) are mostly 1-commit stubs or data generators. https://github.com/search?q=predictive+logistics+army&type=repositories (2026-10-09, H that they exist; L on what they will finally contain)

**Indian Army DIME (Depot Integration Management Edition).** Built by the Army with BISAG-N and launched 8 Jan 2026. Reportedly offers real-time visibility from unit to Army HQ, commander dashboards with exception alerts, and predictive stock analytics, claiming ~70% less paperwork and logistics cycle time cut by a third. *Implication:* "a dashboard with alerts" is already in service, so we must go beyond it. https://ssbcrackexams.com/indian-army-launches-digital-logistics-platform-dime-for-enhanced-operational-efficiency/ (2026-10-09, M: secondary source; I could not verify it against a PIB release)

**Legacy Indian systems (CICP / ILMS / IMMOLS).** A CAPS paper (Feb 2024) names the Army's Computerised Inventory Control Project, the Navy's ILMS and the IAF's IMMOLS. Its main gap is integrated asset and in-transit visibility; it recommends RFID/GPS/cloud. This supports the PS wording about multiple information streams. https://capssindia.org/?p=13949 (2026-10-09, H)

**US Army predictive logistics (RCCTO + C3 AI, Dec 2025).** A brigade-level tool forecasting spare parts, fuel and munitions, described as agentic/GenAI with supply-chain visibility "amid disruption". It also mentions an Army–FedEx predictive logistics network (Sep 2026). https://thedefensepost.com/2025/12/18/us-army-ai-logistics-planning/amp/ ; https://thedefensepost.com/2026/09/02/us-army-predictive-logistics-fedex/ (2026-10-09, M; FedEx item seen only as a search snippet, L)

**Academic baseline: RAF spare parts.** Teunter & Duncan (2009, JORS) used a large UK RAF dataset and found that Croston-type methods and bootstrapping clearly beat moving average and exponential smoothing for intermittent demand. *Implication:* for spares and medical items with lumpy demand, a well-chosen *simple* method plus an honest backtest is credible. LSTM is not automatically better. https://eprints.lancs.ac.uk/id/eprint/45112 (2026-10-09, H)

**Indian Navy SORIN (CSTEP).** An AI-based "Smart and Rapid Inventory" tool for naval supply chains. It is an analogue only, and I could not verify any details. https://web.cstep.in/projects-details.php?id=939 (2026-10-09, L)

I could not find a public SIH 2024/2025 problem statement that clearly matches Army forward logistics (search returned only general SIH coverage). **Not verified.**

## 2. What most of the ~136 teams will submit

Prediction (M, based on the 7+ repos above):
1. **Forecasting:** LSTM and/or Prophet/XGBoost on synthetic consumption, giving a single-line forecast with no interval, reported as one MAPE number.
2. **Dashboard:** React (or Streamlit/HTML) with KPI cards, Chart.js/Recharts, and a red/amber/green stock table.
3. **Map:** Leaflet/OSM with depot→post lines and a "road blocked" toggle that reroutes via Dijkstra/A* or OR-Tools VRP.
4. **"IoT/RFID":** simulated sensor JSON that is always online and always fresh.
5. **Trust layer:** "blockchain"/hash-chained ledger and RBAC.
6. **Buzzwords:** digital twin, GenAI chatbot, offline-first, federated learning.

**What will look identical to the jury:** the map with coloured lines, the forecast chart, the "road closed → new route" click, and the RFID claim. Rerouting is already common (AGNILOGIX, alanaveen401, RASAD), so a reroute animation will not stand out.

## 3. Differentiators (feasible in 3–4 days, visible in a 90-s demo), ranked

1. **"Resilience test": close a pass/road for N days and show which posts fail first and when.** Drag a slider (e.g. close Route B for 0–21 days). The map shows each post's countdown to stock-out per item, and posts flip red in order. A ranked list shows "first failure: Post-3, fuel, day 6 (P≈0.7)". *Why #1:* competitors show a reroute, but nobody shows the *consequence over time*. That is the question a commander actually asks, and anyone can understand it in 10 seconds. It is a deterministic simulation on top of forecasts, so it is cheap to build.
2. **Days-of-supply with confidence bands and stock-out probability.** Every post×item shows "DoS 9 days (80% band 6–13), P(stock-out before next convoy) = 23%". Use quantile/bootstrap forecasts, fan charts, and colour driven by *probability* rather than raw stock level. It feeds #1 directly. Note that RASAD already has P10/P90, so the edge here is the operational framing ("probability of running out before resupply"), not the quantiles themselves.
3. **An honest backtest table with interval coverage.** One panel lists, for each item class, our model vs. naive vs. Croston/seasonal-naive, with MAE and **"80% interval actually contained the truth 78% of the time"**. It takes about a day to build and signals rigour no stub repo has. It also answers the jury's "is the AI real?" question in a single slide.
4. **Visible stale/no-signal sensor handling.** One post's IoT feed goes silent. The tile turns grey with "last seen 31 h ago", the system falls back to forecast-only estimation, and the confidence band visibly *widens*. This turns the IoT buzzword into a robustness feature and is cheap to build (a timestamp check plus inflated variance).
5. **Explainable forecast drivers per post.** Clicking a post shows "demand ↑ 18% vs. last week: temperature −8 °C (+heating fuel), strength +40, patrol tempo high". Use additive model components or SHAP on a gradient-boosted model. *Lower rank* because it is easier to fake and harder to make look good in 90 s.

*Optional add-on:* combine #1 and #2 into a **what-if planner** ("add one helicopter sortie on day 4: Post-3 failure moves from day 6 to day 15"). Do it only if #1 to #4 are done.

## Sources
- https://github.com/rahulpravash-design/rasad — 2026-10-09 — strongest SIH26251 competitor; quantile federated forecasts, closure-aware MILP
- https://github.com/amrut4469-blip/army-predictive-logistics-sih — 2026-10-09 — AGNILOGIX; Prophet/XGBoost/LSTM, OR-Tools VRP, days of cover
- https://github.com/alanaveen401/Predictive-Logistics-Command-system — 2026-10-09 — front-end-only demo, simulated IoT, hash ledger
- https://github.com/ahmed-ab001/Indian-Army — 2026-10-09 — Supabase/TS early stub
- https://github.com/search?q=predictive+logistics+army&type=repositories — 2026-10-09 — list of 8 SIH26251-style repos
- https://github.com/search?q=SIH26251&type=repositories — 2026-10-09 — only RASAD tagged with the PS ID
- https://ssbcrackexams.com/indian-army-launches-digital-logistics-platform-dime-for-enhanced-operational-efficiency/ — 2026-10-09 — DIME launch (secondary source)
- https://capssindia.org/?p=13949 — 2026-10-09 — CICP/ILMS/IMMOLS and the visibility gap
- https://thedefensepost.com/2025/12/18/us-army-ai-logistics-planning/amp/ — 2026-10-09 — US Army RCCTO + C3 AI brigade forecasting
- https://thedefensepost.com/2026/09/02/us-army-predictive-logistics-fedex/ — 2026-10-09 — Army–FedEx predictive logistics (snippet only)
- https://www.army.mil/article/284092 — 2026-10-09 — US Army "resilient, distributed, predictive" logistics concept (title/snippet only)
- https://eprints.lancs.ac.uk/id/eprint/45112 — 2026-10-09 — Teunter & Duncan 2009, RAF intermittent-demand comparison
- https://web.cstep.in/projects-details.php?id=939 — 2026-10-09 — Indian Navy SORIN (not opened in detail)

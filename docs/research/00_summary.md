# 00 — Phase 1 summary (SIH26251, Predictive Logistics & Forward Supply Chain)

_9 Oct 2026. Details are in files 01–05, `SOURCES.md` and `../ASSUMPTIONS.md`._

## Recommended approach
We will build **"Forward Supply Intelligence"**, a decision-support tool for a fictional high-altitude sector of about 8 posts, 2 depots, 4 supply classes (rations, fuel, medical, spares) and one winter pass. It runs one pipeline:

**forecast demand → quantify uncertainty → days-of-supply and stock-out probability → stress-test road closures → recommend resupply.**

- **Forecasting.**
  - Baselines: seasonal-naive, ETS, and TSB for intermittent items (statsforecast).
  - Stronger model: one global LightGBM with weather, strength and activity features.
  - Intervals: split conformal, with coverage checked in a rolling-origin backtest.
- **Risk.** A seeded Monte Carlo (about 500 paths, 7-day residual blocks) gives days of supply at P10/P50/P90 and the probability of stock-out before the next convoy.
- **Routing.** NetworkX shortest path plus a greedy capacity allocator on a hand-made fictional graph. The interface lets us swap in OR-Tools VRP at the finale.
- **Feed.** A Python sensor simulator sends POST requests to FastAPI, which pushes Server-Sent Events to React and handles stale and no-signal cases. MQTT is documented as the production path.
- **Stack.**
  - Backend: Python 3.12, FastAPI, pandas<3, statsforecast, lightgbm, scikit-learn, networkx, pytest. All licences are Apache, MIT or BSD.
  - Frontend: React + Vite + TS, Recharts, an SVG schematic map (no tile server needed).

## Three differentiators (see 05)
1. **Resilience test.** Close Pass-1 for N days and see which post runs out first, of what, on which day, and with what probability, before and after mitigation.
2. **Days of supply as a probability.** For example, "P(stock-out before next convoy) = 23%", with an 80% band.
3. **Honest backtest panel.** Our model against the baselines, with interval coverage, scored on a held-out *different* generator.
*(Supporting feature: no-signal sensor handling, where the uncertainty band visibly widens.)*

## Data strategy
| Element | Type |
|---|---|
| Weather (daily min/max temp, precip, snowfall 2023–2025) | **Real public**: Open-Meteo ERA5, CC BY 4.0, cached; 3 grid points labelled W1–W3, not mapped |
| Posts, depots, strength, stock, consumption, fleet, closures, sensor feed | **Synthetic**, seeded; two generators (A train, B held-out) to avoid circularity |
| Sector map and road graph | **Synthetic / schematic**, fictional names, no real basemap or borders |
| Landslide / snow closure probability | **Synthetic** rule-based logistic model on real weather; coefficients illustrative |
| Calorie, ration and kerosene anchors | **Public figures** used as ratios only (medium confidence) |

## Key risks
| Risk | Mitigation |
|---|---|
| Time: 3–4 days shared with exams | Strict Must list; engine first; fallback to screenshots + video on Day 3 |
| Jury sees "synthetic" as weak | Lead with the A/B non-circular protocol and coverage numbers; say openly what we do not claim |
| Strong competitors (RASAD) already have quantiles and closures | Compete on the *consequence over time* (D1) and on calibration evidence (D3), not on component count |
| Monte Carlo too slow in UI | Vectorised numpy; cache per scenario; cut paths to 300 if needed |
| statsforecast/LightGBM install trouble on a teammate's Windows laptop | Pinned `requirements.txt` on Py 3.12; seasonal-naive + LightGBM-only fallback |
| Unverified facts (DIME details, rubric, some ration figures) | Marked L/M; not used as headline claims |

## Proposed MVP scope
**Must (demoable in 3–4 days)**
- M1 Seeded generator A + B (8 posts × 4 classes × ~3 years) on cached real weather
- M2 Forecasts: seasonal-naive, ETS/TSB, LightGBM; conformal 80% intervals
- M3 Rolling-origin backtest → JSON + table (MASE, pinball, coverage) on A-holdout and B
- M4 Monte Carlo days of supply and stock-out probability per post × item; ranked risk list
- M5 Fictional road graph; block an edge → reroute; resilience test (N days) with greedy mitigation
- M6 FastAPI endpoints for all of the above + SSE sensor feed with Live/Stale/No-signal
- M7 Dashboard per mockup: header (horizon toggle, Simulated badge), 4 tiles, schematic map, risk table, forecast chart with band, live feed, resilience/re-plan panel (Approve and Compare)
- M8 `make dev`-style one-command start; pytest for engine; README with limits

**Should (if time allows)**
- S1 "Why" note per forecast (LightGBM contributions)
- S2 Backtest figures as PNG for slides
- S3 Hosted demo (Render/Railway free tier) or recorded video only
- S4 Store-and-forward replay after comms blackout

**Won't (explicitly cut)**
- Real roads, real basemap and borders; OSM/osmnx
- Full VRP with time windows (finale)
- Auth/RBAC, blockchain, chatbot, LSTM, federated learning
- MQTT broker (documented only)
- Mobile app, multi-sector support

## Day plan (≈ 3–4 working days; days need not be consecutive)
| Day | Work | Acceptance |
|---|---|---|
| 1 | Weather cache; generators A and B; forecasting models; backtest harness | Backtest table produced by code; tests pass |
| 2 | Monte Carlo DOS and risk; graph and reroute; resilience test and mitigation; API | API returns ranked risks with bands; blocked edge changes plan and failure days |
| 3 | Dashboard wired to API; sensor simulator + SSE + no-signal; demo run-through | 90-s demo works from clean start |
| 4 | Buffer; figures; README; screenshots; video; write-up in portal fields | Submission pack complete |

## Team split (6 people; names to fill)
| Role | Owns | Day 1 | Day 2 | Day 3 | Day 4 |
|---|---|---|---|---|---|
| Engine lead (Tejas) | Forecasting, backtest, risk | Models + backtest | Monte Carlo + API | Integration | Fixes |
| Data | Generators A/B, weather cache | Generator A | Generator B (separately from model) | Sensor simulator | Data README |
| Routing | Graph, reroute, resilience | Graph JSON + reroute | Resilience + mitigation | API polish | Tests |
| UI ×2 | React dashboard | Layout from mockup on mock JSON | Map + tables + charts | Wire to API + SSE | Screenshots |
| Write-up | Portal text, slides, video | Read research | Draft write-up | Demo script | Video + final edit |

## Questions for Tejas (max 5)
1. **Map style.** Is a schematic map (fictional coordinates, no real basemap) acceptable? The alternative is a generic real terrain basemap, which looks more "GIS" but risks implying real sites and drawing borders. I recommend schematic.
2. **Portal fields and limits, plus the PPT template** (asked in Phase 0). Needed for the submission pack.
3. **Team roles.** Who are the two UI people and the write-up owner? Can the Data person write generator B *without* seeing the model code (needed for honest evaluation)?
4. **Live link.** Should we spend time on a free hosted demo, or is a recorded video plus GitHub enough?
5. **Scope.** Is the Must list above the right size for your 3–4 days? If it is too much, I would cut M7 to 3 panels (map, risk table, resilience) before cutting any engine work.

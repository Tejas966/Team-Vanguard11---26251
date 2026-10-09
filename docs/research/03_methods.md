# 03 — Methods: forecasting, inventory risk, routing, synthetic data

Scope: SIH26251 MVP (~8 fictional posts, 4–6 supply classes, 2–3 years of daily synthetic data, small road graph). Accessed 2026-10-09 unless stated. Confidence tags: [H] high, [M] medium, [L] low.

## TL;DR decisions

| Area | Decision |
|---|---|
| Baseline | Seasonal-naive (weekly) + ETS (AutoETS) for smooth classes; TSB for intermittent classes (medical, spares) |
| Strong model | One global LightGBM model across all posts/classes, lag + calendar + exogenous features, quantile objective (P10/P50/P90), then conformal calibration on a holdout window |
| Intervals | Conformal (split conformal on rolling residuals) is the simplest honest option; report empirical coverage |
| Backtest | Rolling origin, 6 folds, step 30 days, horizons 7/14/30 |
| Metrics | MAE, MASE, pinball loss, 80% interval coverage + width; intermittent: MASE/RMSSE + bias; no MAPE |
| DOS / risk | Monte Carlo over forecast sample paths (1,000 paths) → P(stock-out by day t) and days-of-supply P10/P50/P90 |
| Routing | NetworkX shortest path + greedy capacity allocation on a hand-made synthetic graph; OR-Tools kept as finale extension |
| Python | 3.12 (scipy 1.18 and networkx 3.7 need ≥3.12) |

## A. Forecasting

### A1. Model families

| Family | Fits our data when | Strengths | Weaknesses |
|---|---|---|---|
| ETS / Holt-Winters | Smooth, positive series with weekly/annual seasonality (rations, fuel) | Fast, interpretable, analytic intervals, strong M-competition benchmark | No exogenous features; daily data with annual seasonality (m=365) is awkward — ETS seasonality is practical only for short periods like m=7 [H, FPP3 §8, §12.1] |
| Croston / SBA / TSB | Many zeros (medical, spares) | Built for intermittent demand. SBA corrects Croston's upward bias [H, Syntetos & Boylan 2005]. TSB updates the demand probability every period, so it decays toward obsolescence [H, Nixtla TSB docs] | Flat point forecast (a rate, not a timing); no exogenous features; no native distribution, so pair with conformal |
| Gradient boosting (LightGBM / sklearn HistGradientBoosting) | Demand driven by exogenous drivers (temperature, troop strength, activity, calendar) | One global model across all series. Handles nonlinearity and feature interactions. Quantile objective available | Needs lag features and careful leakage control; does not extrapolate trend; with only 8×5 series it can overfit |

**Recommendation.** Baseline = **seasonal-naive (lag 7)** as the floor every model must beat, plus **AutoETS (season 7)** for smooth classes and **TSB** for classes where more than 30% of days are zero. Use ADI/CV² classification (Syntetos–Boylan) to route each series to ETS or TSB [M]. Strong model = **one global LightGBM** with features: lags 1/7/14/28, rolling means 7/28, day-of-week, month, holiday flag, temperature (and a cold-day indicator), troop strength, activity level, post ID, and class ID. The exogenous features at forecast time must be *planned* values (e.g. planned troop strength, forecast temperature), never realised future values. This is the main leakage risk.

### A2. Prediction intervals

| Option | How | Honesty | Effort |
|---|---|---|---|
| Quantile regression (pinball loss) | LightGBM `objective="quantile"`, one model per α | Not guaranteed. On small data, quantiles are often miscalibrated and can cross | Low |
| Split conformal | Hold out a calibration window; interval = point ± empirical quantile of \|residual\| per horizon | Marginal coverage guarantee under exchangeability [H, Lei et al. 2018]. Time series violate this, so check coverage empirically | Very low (≈15 lines numpy) |
| Conformalized quantile regression (CQR) | Quantile model + conformal correction of the band | Adaptive width plus a coverage guarantee under exchangeability [H, Romano et al. 2019] | Low–medium |
| statsforecast `ConformalIntervals(h, n_windows)` | Cross-validation residuals over n_windows; needs n_windows·h < series length | Distribution-free, works for any statsforecast model, including Croston/TSB [H, Nixtla docs] | One argument |
| MAPIE v1 | `SplitConformalRegressor`, `ConformalizedQuantileRegressor`, `TimeSeriesRegressor` (EnbPI/ACI) [H, MAPIE API docs] | Same theory, packaged | Extra dependency |

**Recommendation.** The simplest honest choice is **horizon-specific split conformal on rolling-origin residuals**. Collect out-of-sample residuals per horizon h from backtest folds, then set the P10/P90 band at the P50 forecast plus the empirical residual quantiles. Clip the lower bound at 0. Use the statsforecast `ConformalIntervals` for the baselines. Skip MAPIE in the MVP; adding a dependency to replace ~15 lines of code is not worth it. Always **report empirical coverage**. A nominal 80% interval that covers 65% is a finding, not something to hide.

### A3. Backtest protocol

- **Rolling origin** (expanding window) [H, FPP3 §5.10]: minimum train = 365 days; **6 folds**, origins every 30 days over the final ~6 months; at each origin forecast **h = 1…30** and report at **7, 14 and 30** (both as cumulative-sum error and as the per-day mean over the horizon).
- Refit at every origin. The models are cheap.
- Final 90 days = **untouched test** (and the "mechanism B" scenarios, §D). Tune only on the earlier folds.

| Metric | Use | Note |
|---|---|---|
| MAE | Headline, in units | — |
| MASE (scale = in-sample seasonal-naive MAE, m=7) | Cross-series comparison; <1 beats seasonal-naive | [H, FPP3 §5.8; Hyndman & Koehler 2006] |
| sMAPE | Avoid, or show only in an appendix | FPP3 recommends against it: asymmetric, unstable near zero [H]. **MAPE is undefined when y=0**, so never use it here |
| Pinball loss (P10/P50/P90), scaled by naive | Quantile quality | — |
| Empirical coverage + mean width of the 80% interval | Calibration | Target 0.80 ± 0.05 |
| Intermittent: MASE / **RMSSE** + **bias (mean error)** + coverage of cumulative demand over h | MAE rewards an all-zero forecast on sparse series [M, Kolassa 2016], so use RMSSE as in M5 and judge the *cumulative* demand over the lead time, which is what drives stock | [M, Makridakis et al. 2022 (M5)] |

### A4. Library check (PyPI metadata pulled 2026-10-09)

| Package (latest) | Licence | Python | Windows | Weight / notes | Verdict |
|---|---|---|---|---|---|
| statsforecast 2.1.1 | Apache-2.0 | ≥3.10, wheels cp310–cp314 | win_amd64 wheels | Pulls statsmodels, fugue, coreforecast, utilsforecast; **pins pandas<3.0** | **Use** (ETS, TSB/CrostonSBA, ConformalIntervals) |
| lightgbm 4.7.0 | MIT | ≥3.10 | `py3-none-win_amd64` wheel | ~3.5 MB; numpy/scipy/narwhals | **Use** |
| scikit-learn 1.9.1 | BSD-3 | ≥3.11 | wheels | Needed anyway | **Use** (HistGradientBoosting is the fallback if LightGBM breaks) |
| mapie 1.5.0 | BSD-3 | ≥3.10 (classifiers to 3.13) | pure Python | Light | Optional; skip in MVP |
| sktime 1.2.0 | BSD-3 | 3.10–3.14 | pure Python | Large dependency surface, many soft dependencies | Skip |
| darts 0.47.0 | Apache-2.0 | ≥3.10 (classifiers only to 3.12) | pure Python | Heavy: numba, shap, xarray, pyod, matplotlib (+torch for deep models) | Skip |

Licences and versions come from PyPI JSON metadata [H]. I could not verify any Windows install friction beyond the presence of wheels. Every recommended package ships a Windows wheel or is pure Python, so no compiler should be needed [M].

**Lightest stack:** `numpy pandas<3 scipy scikit-learn lightgbm statsforecast networkx` (+ `ortools` only if the finale needs VRP). Python **3.12**.

## B. Inventory policy under uncertainty

**Safety stock / reorder point** (normal approximation, demand and lead time independent) [M, standard result, e.g. Silver, Pyke & Thomas; Wikipedia "Safety stock"]:

SS = z · sqrt( LT̄ · σ_d² + d̄² · σ_LT² ),  ROP = d̄ · LT̄ + SS

Here σ_d is the **forecast-error** standard deviation (from backtest residuals), not the raw demand standard deviation, and σ_LT comes from the convoy lead-time distribution.

- **Cycle service level (CSL)** = P(no stock-out in a replenishment cycle); z = Φ⁻¹(CSL).
- **Fill rate** = fraction of demand met from stock; it needs the loss function G(z): expected shortage = σ_LTD·G(z). For the same z, fill rate is usually much higher than CSL. State which one each number means. Recommendation: show CSL (easier to explain), with targets set by priority (medical 99%, rations 97%, spares 90%). These targets are our assumption.

The analytic formula fails exactly where we care most: intermittent or skewed demand, lead-time disruption (a closed pass is not "normal variance"), and multi-day horizons. Use it as a sanity check only.

**Recommended: Monte Carlo days-of-supply (DOS)**

```
inputs: stock S0, scheduled receipts R[t] (with arrival-delay distribution),
        forecast quantiles q_τ[t] for t=1..H (or model sample paths), N=1000, seed
for n in 1..N:
    for t in 1..H:
        u ~ U(0,1)  (one u per path reused across t = comonotone, conservative;
                     or draw from bootstrapped residual blocks for realistic autocorrelation)
        D[n,t] = max(0, interp(q_·[t], u))           # inverse-CDF from quantiles
        delay ~ empirical lead-time distribution; receipt lands at t+delay
        S[n,t] = S[n,t-1] + R_n[t] - D[n,t]
    T_out[n] = first t with S[n,t] < 0 (else > H)
outputs: P(stock-out by day t) = mean(T_out <= t)   # risk curve
         DOS P10/P50/P90 = quantiles of T_out       # "6 days (4–9)"
```

This needs only numpy, takes milliseconds for 8 posts × 6 classes, handles intermittent demand and disrupted receipts, and gives the UI line: *"Medical, Post C: 50% chance of stock-out within 6 days (80% band 4–9)."* Block-bootstrapping backtest residuals (7-day blocks) adds the serial correlation that independent draws per day would ignore. Without it, the spread of cumulative demand is too narrow [M].

## C. Routing under disruption

| Option | Fits | Cost |
|---|---|---|
| CVRPTW with OR-Tools routing | Multiple vehicles, capacities, time windows. Time windows are modelled as a "Time" dimension with slack and `SetRange` on cumulative variables. Requires a transit callback over a distance or time matrix [H, OR-Tools VRPTW docs] | Apache-2.0; 9.15 ships win_amd64 wheels for cp310–cp314 [H, PyPI]; ~30 MB; about a day to wire up and debug |
| Shortest path + capacity heuristic (NetworkX) | Hub-to-post resupply on a tree-like mountain network, which is our case | BSD-3; pure Python; `nx.shortest_path(G, weight="time")`; re-routing = drop the edge (or set its weight to ∞) and recompute |

**Recommendation:** use **NetworkX** for the 3–4 day build. Mountain resupply is mostly hub→post along few corridors, so full VRP adds little to the demo. Keep the interface `plan_routes(graph, demands, vehicles) -> routes` so the 36-hour finale can swap in OR-Tools CVRP using a matrix built from NetworkX all-pairs shortest-path times. Dynamic re-routing: an edge carries `closed_until`; on a closure event, recompute paths for affected posts and flag posts with no path (they become air-drop only).

**Resilience test, a simple algorithm we can defend:**
1. Close edge e for N days, then recompute reachability and the new travel time per post.
2. For each post and class, run the Monte Carlo DOS (§B) with receipts that depend on that post's route: receipts on cut routes are removed for N days, receipts on detours are delayed by the extra travel time.
3. Rank posts by P50 time-to-stock-out, so the posts that fail first are listed first, with P(stock-out within N days).
4. Allocate limited alternate capacity (detour convoy tonnage plus air-drop sorties/day) with a **greedy priority rule**: each day, give the next unit of capacity to the (post, class) with the highest `priority_weight × P(stock-out before next resupply)` and repeat until capacity runs out. This is simple to explain. For the finale, an LP via `scipy.optimize.linprog` (maximise weighted covered shortage subject to daily capacity, coverage ≤ need) gives the provably optimal version of the same allocation.
5. Report: posts that fail without and with mitigation, and the expected shortage avoided.

**Map data: osmnx vs a synthetic graph**

| | osmnx (OSM, generic mountain area) | Hand-made synthetic graph |
|---|---|---|
| Licence | OSM data is ODbL; requires "© OpenStreetMap contributors" credit and a licence notice [H, osm.org/copyright]; osmnx itself is MIT | None |
| Data honesty | Real roads in Indian mountain border areas can come close to real military locations, which conflicts with team rules A0/A1 | Fully fictional, generic labels |
| Determinism | Live Overpass queries; OSM changes over time, so we would have to cache a snapshot | Fixed in the repo |
| Demo risk | Network or rate limits; large graphs need simplifying | None |

**Recommendation:** a **hand-made synthetic graph** (~15–25 nodes: 1 depot, 2 staging nodes, 8 posts, junctions; edges carry `distance_km`, `climb_m`, `seasonal_closure_prob`, `name="Pass-1"`), stored as JSON. Coordinates may be placed on a generic DEM/terrain tile for visuals, but the layout is invented. osmnx is optional "future work" for a non-sensitive region.

## D. Synthetic data credibility (not circular)

Risk: if one function generates the data and the model learns it, the model only recovers our own invented equation. Design:

1. **Mechanism A (training history, seed s_A):** demand = base(post, class) × troop_strength × f_temp(temperature) × weekly profile × activity multiplier, with negative-binomial noise. Intermittent classes use a Bernoulli occurrence × lognormal size process.
2. **Mechanism B (held-out evaluation scenarios, seeds s_B1..s_Bk, never used for tuning):**
   - Different functional form: a threshold or piecewise temperature response instead of a smooth one, and an interaction term (activity × cold) that is absent from A.
   - **Unseen weather year:** temperature from a different public year or a +2σ cold anomaly.
   - **Regime shift:** troop strength steps ±30% mid-horizon; activity surges lasting 5–10 days.
   - **Different noise family:** heavy-tailed (Student-t or lognormal shocks) instead of NB; occurrence probability drifts for spares.
   - **Shocks:** random one-off bulk draws and data-entry gaps (missing IoT readings) to exercise robustness.
3. **Report results three ways:** in-distribution (A test), out-of-distribution (B scenarios), and a degradation table. Credibility comes from showing *where the model degrades* and that it still beats seasonal-naive. If it does not beat seasonal-naive, say so.
4. **Baselines on every table:** naive, seasonal-naive (m=7), and moving average (28-day). Improvement is reported as MASE relative to seasonal-naive and as skill = 1 − MAE_model / MAE_snaive.
5. **Reproducibility:** one `config.yaml` with all parameters and seeds; `numpy.random.default_rng(seed)` per (post, class, mechanism); a generator version written into every output file.
6. Exogenous inputs (troop strength, activity) are themselves synthetic and labelled as such in the UI. The parameter ranges are our assumption, not doctrine.

## Sources (all accessed 2026-10-09)

- Hyndman & Athanasopoulos, *Forecasting: Principles and Practice* (3e): accuracy measures https://otexts.com/fpp3/accuracy.html ; time-series CV https://otexts.com/fpp3/tscv.html ; ETS https://otexts.com/fpp3/expsmooth.html ; complex seasonality https://otexts.com/fpp3/complexseasonality.html [H]
- Hyndman & Koehler (2006), "Another look at measures of forecast accuracy", IJF 22(4) https://doi.org/10.1016/j.ijforecast.2006.03.001 [H]
- Syntetos & Boylan (2005), "The accuracy of intermittent demand estimates", IJF 21(2) https://doi.org/10.1016/j.ijforecast.2004.10.001 [H]
- Teunter, Syntetos & Babai (2011), "Intermittent demand: linking forecasting to inventory obsolescence", EJOR 214(3) https://doi.org/10.1016/j.ejor.2011.05.018 [H]
- Nixtla statsforecast TSB docs https://nixtlaverse.nixtla.io/statsforecast/docs/models/tsb.html ; ConformalIntervals tutorial https://nixtlaverse.nixtla.io/statsforecast/docs/tutorials/conformalprediction.html [H]
- Lei, G'Sell, Rinaldo, Tibshirani & Wasserman (2018), "Distribution-free predictive inference for regression", JASA https://arxiv.org/abs/1604.04173 [H]
- Romano, Patterson & Candès (2019), "Conformalized Quantile Regression", NeurIPS https://arxiv.org/abs/1905.03222 [H]
- MAPIE v1 API / release notes https://mapie.readthedocs.io/en/latest/api/ , https://mapie.readthedocs.io/en/stable/v1_release_notes.html [H]
- Kolassa (2016), "Evaluating predictive count data distributions in retail sales forecasting", IJF 32(3) https://doi.org/10.1016/j.ijforecast.2015.12.004 [M]
- Makridakis, Spiliotis & Assimakopoulos (2022), "M5 accuracy competition", IJF 38(4) https://doi.org/10.1016/j.ijforecast.2021.11.013 [M]
- Safety-stock formula with lead-time variance: https://en.wikipedia.org/wiki/Safety_stock ; Silver, Pyke & Thomas, *Inventory and Production Management in Supply Chains*, 4e (CRC, 2017) [M]. I could not verify the exact page in the textbook.
- OR-Tools VRPTW guide https://developers.google.com/optimization/routing/vrptw [H]
- PyPI JSON metadata (version, licence, requires_python, wheels): https://pypi.org/pypi/{statsforecast,lightgbm,scikit-learn,mapie,sktime,darts,ortools,networkx,osmnx,scipy}/json [H]
- OpenStreetMap copyright / ODbL https://www.openstreetmap.org/copyright [H]

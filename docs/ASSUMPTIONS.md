# Assumptions log

Every assumption we rely on, why, and a source if one exists. Confidence: **H** high / **M** medium / **L** low.
"Ours" means a modelling choice by the team, not doctrine or data. The UI and write-up must label anything that rests on an "ours" or **L** row as illustrative.
Source IDs point to `docs/research/` files; full URLs are in `docs/research/SOURCES.md`.

## A. Data honesty and safety

| # | Assumption | Reason | Source | Conf. |
|---|---|---|---|---|
| A0 | No real defence data is used. All operational data (posts, strength, stock, consumption, fleet, convoys, closures) is synthetic. | Real data is classified or unavailable. | Team rule | H |
| A1 | All post, depot, unit, route and pass names are fictional (`Post-H1`, `Pass-1`, `Depot-A`). | Avoid real order of battle or locations. | Team rule | H |
| A2 | The sector map is **schematic**: fictional coordinates on a plain terrain-style canvas. No real basemap, no real roads, no international boundaries. | Real roads plus fictional posts would still imply real sites. Border depiction is legally sensitive in India. | 03_methods §C, 04_data_sources §2 | H |
| A3 | Real public weather (Open-Meteo / ERA5, CC BY 4.0) from 3 public high-altitude grid points drives synthetic demand. The points are labelled "Weather cell W1–W3" and are **not** shown on the map or tied to any site. | This gives real seasonal and cold patterns without exposing locations. | 04_data_sources §2 | H |
| A4 | Open-Meteo's free tier is for non-commercial use, and a student hackathon prototype counts as non-commercial. | This is our reading; the terms do not name hackathons. | 04_data_sources | M |
| A5 | The UI always shows a "Simulated data — fictional sites" badge and attribution "Weather data by Open-Meteo.com". | Honesty and licence. | Team rule; Open-Meteo terms | H |

## B. Domain parameters (anchor values; all synthetic in use)

| # | Assumption | Reason | Source | Conf. |
|---|---|---|---|---|
| B1 | Rations (Class I) ≈ 2.5 kg per person per day, scaled by altitude band (<9k, 9–12k, >12k ft). The band multipliers are ours (1.0 / 1.1 / 1.2). | Publicly reported 2020 surge figures; ration scales rise with altitude. | 02_domain (ThePrint 2020; CAG calorie tiers) | M (base), L (multipliers) |
| B2 | Heating fuel (kerosene) rises as temperature falls (heating-degree-day form), averaging ≈ 2.8 L per person per day in deep winter. | Derived: 15,000 kL ÷ 30,000 troops ÷ ~180 days. | 02_domain | M (average), L (curve shape) |
| B3 | Winter road closure for a high pass is 30–180 days depending on year and road works. The default scenario is 120 days; a "short winter" scenario is 45 days. | Sources disagree: the planning figure is 6 months, and recent snow clearance has cut it to 32–68 days. | 02_domain | M |
| B4 | Air resupply capacity is ≈ 5–6% of road surge capacity, flies mornings only, and is grounded by weather on 20–40% of winter days. | Tonnages are reported; the no-fly rate is ours. | 02_domain | M (capacity ratio), L (no-fly rate) |
| B5 | Random landslide or avalanche outages last 1–14 days, and their frequency rises with 3-day rain and 2-day snowfall (logistic model with illustrative coefficients). | No public per-segment rates exist. | 04_data_sources §1.1 | L |
| B6 | Medical and spares demand is intermittent. Spares scale with activity level and vehicle-km; medical demand rises with cold and with new arrivals before acclimatisation. | Plausible, but there are no public Indian figures. | 02_domain | L |
| B7 | Stock reports from forward posts arrive 1–7 days late when sensors are absent. | Implied by the stated aim of the Army's DIME platform to cut paperwork. | 02_domain | L |
| B8 | Service-level targets are ours: medical 99%, fuel 97%, rations 97%, spares 90% (cycle service level). | Needed for reorder points; this is not doctrine. | 03_methods §B | L |

## C. Modelling and evaluation

| # | Assumption | Reason | Source | Conf. |
|---|---|---|---|---|
| C1 | At forecast time, future troop strength and activity level are known as *plans*, and temperature as a *forecast*. Actual future values are never used as features. | Prevents leakage that would inflate accuracy. | 03_methods §A | M |
| C2 | Prediction intervals are split conformal from out-of-sample backtest residuals, per horizon. We **check** nominal 80% coverage against actual coverage and report it; we do not assume it. | Honest and model-agnostic. | 03_methods §A2 (Lei et al. 2018) | H (method) |
| C3 | Daily demand errors are autocorrelated, so the Monte Carlo resamples 7-day blocks of residuals. | Independent draws would understate risk. | 03_methods §B | M |
| C4 | Lead time per route is lognormal; a detour adds graph travel time; a closed edge removes the route. | Standard choice. | 03_methods §B | M |
| C5 | Daily air-drop and detour capacity are scenario parameters. | Synthetic. | — | L |

## D. Synthetic-data credibility: how we avoid circularity

The risk is that a model trained and tested on data from our own formula just recovers that formula, so its accuracy means nothing. Our protocol:

1. **Two generators.**
   - **Mechanism A** (training/validation world) has a linear heating-degree-day response, Gaussian multiplicative noise, smooth strength changes and weather years 2023–2024.
   - **Mechanism B** (held-out test world) has a **different** functional form: a convex/threshold cold response, negative-binomial counts for intermittent items, sudden ±30% strength steps, random demand shocks (surges and outbreaks), and the **unseen** 2025 weather year.
   - The model code never imports generator B's parameters. B is written by a different team member, from a short spec, without looking at the model.
2. **Baselines in every table.** Naive, seasonal-naive (7 days) and a 28-day moving average. A model "wins" only if it beats seasonal-naive on MASE.
3. **We report both.** Scores on A-holdout and on B are shown side by side. We expect B to be worse and say so. That gap is our honest estimate of the error we would see when moving to real data.
4. **Fixed seeds.** One `config.yaml` holds all seeds, so every number in the UI and the docs can be regenerated with one command.
5. **What we do not claim.** We do not claim real-world accuracy. We claim the *pipeline* (forecast → uncertainty → days-of-supply risk → resilience test) is sound and calibrated on data it was not built from.

## E. Web prototype additions (2026-10-19)

| # | Assumption | Reason | Source | Conf. |
|---|---|---|---|---|
| E1 | SKO (kerosene) per person per day = 1.0 + 0.09 × max(0, 8 − T<sub>post</sub>), capped at 3.6 L. | Gives ~2.8 L at −12 °C, matching the figure derived from public reporting; shape is ours. | ThePrint 2020 (derived) | M (level), L (shape) |
| E2 | Post night temperature = weather-cell minimum − 6.5 °C per km of extra altitude. | Standard environmental lapse rate. | Textbook value | M |
| E3 | A day is flyable for air maintenance if snow < 1 cm, rain < 2 mm and wind < 40 km/h. | We have no cloud/visibility data. | Ours | L |
| E4 | Report age widens stock uncertainty: < 24 h none, 24–72 h ±8%, > 72 h ±20%. | Older counts are less reliable. | Ours | L |
| E5 | Decision Clock uses the 90% conservative stock-out time and fixed option lead times (transfer 1 d, convoy = road + 0.5 d, detour 5 d + road, air 1 d). | Transparent and explainable. | Ours | M |
| E6 | Weather points W1–W3 are public civilian grid points; posts are fictional and only *assigned* to a cell. | Real weather without exposing locations. | Team rule | H |

# Forward Supply Intelligence — web prototype (SIH26251)

Decision-support prototype for forward logistics. **All data is synthetic; all sites are fictional.**

## Run it
- Easiest: double-click `index.html` (works offline; fonts fall back if there is no internet).
- Or serve the folder: `python -m http.server 8765 --directory web` and open http://localhost:8765

## Pages
| # | Page | What it answers |
|---|---|---|
| 00 | Command overview | Where is the trouble, and which decision is due first? |
| 01 | **Decision Clock** | By when must I act, with which option, and what is the fallback? |
| 02 | Field reports | Low-bandwidth SITREP parsing, anomaly checks, report freshness |
| 03 | What-If simulator | Normal vs delayed delivery for one node |
| 04 | Ripple-effect analyzer | How one disruption spreads along real network links |
| 05 | Stress test & plans | Plan A vs Plan B, with a written decision rule |
| 06 | Winter stocking | Can we push enough up before the pass closes? Weekly push plan |
| 07 | Commander's brief | One printable page from the current scenario |
| 08 | Methods & data | Every formula, rule, reference and the demo dataset |

All pages share one scenario (top bar), so a change anywhere updates everything. State is kept in the browser's local storage; **Reset demo** restores the original data.

## Code
- `js/data.js` — synthetic dataset and assumptions
- `js/engine.js` — all calculations (no DOM); documented on the Methods page
- `js/ui.js`, `js/views*.js`, `js/app.js` — rendering, routing, shared state

## Honest limits
Demand comes from ration/fuel scales, not yet from a trained forecaster. Probabilities use a normal approximation. Costs, closure dates and airlift availability are illustrative. The system recommends; a human decides.

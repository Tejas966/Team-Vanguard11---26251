# Forward Supply Intelligence — web prototype (SIH26251)

Decision-support prototype for forward logistics. **Logistics data is synthetic and all sites are fictional. Weather is real (Open-Meteo, CC BY 4.0).** Refresh the snapshot with `python data/fetch_weather.py`; the app also tries to fetch the latest forecast live when online.

## Run it
- Easiest: double-click `index.html` (works offline; fonts fall back if there is no internet).
- Or serve the folder: `python -m http.server 8765 --directory web` and open http://localhost:8765

## Pages
**Daily use** (what a duty officer needs):
| Page | What it answers |
|---|---|
| Today | What needs doing, where, and by when (action cards with Approve) |
| Sector map | Where is the trouble? Click a post for its four supplies, next action and weather |
| Action deadlines | Latest time to order each resupply option, per post and supply |
| Field reports (SITREP) | Paste a one-line coded report; it is checked and applied |
| Winter stocking (AWS) | Truckloads still needed before Pass-1 closes; weekly push plan |
| Commander's brief | One printable page |

**Planning tools** (collapsed in the menu): What-if (one delay) · Knock-on effects · Compare plans · Weather (real data) · How it works.

All pages share one scenario (top bar), so a change anywhere updates everything. State is kept in the browser's local storage; **Reset demo** restores the original data.

## Code
- `js/data.js` — synthetic dataset and assumptions
- `js/engine.js` — all calculations (no DOM); documented on the Methods page
- `js/ui.js`, `js/views*.js`, `js/map.js`, `js/today.js`, `js/app.js` — rendering, routing, shared state
- Tests: `node --test web/tests/engine.test.js` (14 engine tests)

## Design system
The UI follows `DESIGN.md` at the repository root. In short:
- **Tokens** live in `css/app.css` (`:root`): base palette, semantic aliases (`--status-critical`, `--text-meta`, `--border-control`, …), a nine-step type scale (`--fs-display` … `--fs-tag`, never below 11 px) and the chart/map colours.
- **SVG maps and charts** read the same tokens through `ui.tok('--name')`, so there are no hard-coded colours in the view code.
- **Status badges** (`ui.tag`, `ui.statusTag`) always pair an icon with a meaning word: ACT NOW, ACT SOON, PLAN AHEAD, OK, TOO LATE, SHORTAGE, AT RISK. The rule-based risk class is LOW / MEDIUM / HIGH, labelled "(rule-based)".
- **Source tags** (`ui.srcTag(word)`, class `.tag`) say what kind of number something is, using only ESTIMATE, SIMULATED, ILLUSTRATIVE, ASSUMED, AVERAGE, REAL PUBLIC, RULE-BASED, PLANNED, SNAPSHOT.
- **Components:** one `.callout` (critical / warning / healthy / info) and one `.metric` (`.metric--status` for Today's counts) replace the earlier one-off styles.
- Screenshots of all 11 pages (1440 px wide) are in `submission/screenshots/`.

## Honest limits
Demand comes from ration scales and a weather-driven SKO rule, not yet from a trained forecaster. The risk class and the "safe until" time use an assumed demand spread; they are rule-based, not calibrated probabilities. Costs, closure dates and airlift availability are illustrative. The system recommends; a human decides.

# Project notes for coding agents

- The app is the static site in `web/` (plain HTML/CSS/JS, no build step). Run: `python -m http.server 8765 --directory web`. Tests: `node --test web/tests/engine.test.js`.
- **All UI changes must follow `DESIGN.md`** (tokens, component specs, UX writing, accessibility). Use existing CSS variables in `web/css/app.css`; do not add hard-coded colours, inline styles for reusable patterns, a second styling system, or new dependencies without checking DESIGN.md §A5.
- Numbers shown in the UI come from `web/js/engine.js`. Do not hard-code outcome values, and never label a rule-based output as a probability or a plan as "optimal".
- Keep the honesty markers: synthetic-data badge, Open-Meteo attribution, the map's "fictional" footer, estimate/simulated tags.
- Class names are also JavaScript hooks (see DESIGN.md §A4). Rename them only together with the code that queries them.

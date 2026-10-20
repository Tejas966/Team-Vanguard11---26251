# Forward Supply Intelligence — Design System

Status: **specification v1 (20 Oct 2026)**. It documents the visual system already in `web/css/app.css` and the view code, and sets rules for future changes. Items marked **CHANGE** are proposals that have **not been implemented yet**.

Scope: the static web app in `web/` (vanilla JS, one stylesheet, no build step, no `package.json`). Tokens live as CSS custom properties in `web/css/app.css`. There is no second styling system, and none should be added.

---

## 1. Product design principles

1. **Decision first.** Every screen answers one operational question. Its first visible element answers it; detail comes after.
2. **Show the evidence.** A status, deadline or recommendation is always next to the numbers that produced it, with a "Why this recommendation?" disclosure.
3. **Say what kind of number it is.** Each figure is one of: *observed* (field report), *forecast* (Open-Meteo), *simulated* (scenario), *estimated* (engine rule), *synthetic* (demo data) or *illustrative* (costs). Its label or tag makes this clear.
4. **Calm by default, loud only when it matters.** Neutral workspace; colour is reserved for status. A page with nothing wrong should look quiet.
5. **Dense but legible.** This is a working tool. Use compact tables and small multiples, but never text below 11 px and never low-contrast text to fit more in.
6. **One component per meaning.** If two things mean the same, they look the same on every page.
7. **The system recommends; a person decides.** Approve buttons record a decision; nothing implies automatic execution.

### Page priorities

| Page | Primary question | First element on the page |
|---|---|---|
| Today | What must I do first? | Status counts, then action cards sorted by deadline |
| Sector map | Where is the trouble? | Map; selected post's card |
| Action deadlines | By when, and which option is still open? | Rows sorted by latest order time, with timeline |
| Field reports | Is this report valid, and how fresh is each post's data? | Message input with live validation |
| Winter stocking | Can enough go up before the pass closes? | Days to closure, loads needed vs capacity |
| Commander's brief | One printable summary | Numbered sections |
| What-if | What happens to one node if delivery slips? | Normal vs disrupted cards |
| Knock-on effects | How does one disruption spread? | Network diagram + impact chain |
| Compare plans | Which permitted plan is best, and why? | Recommendation panel, then the all-plans table |
| Weather | What is the real weather doing to demand and flying? | Source/status line, then demand table |
| How it works | How is each number produced? | Formulas, data-source table, references |

---

## 2. Colour tokens

### 2.1 Base palette (existing; keep)

| Token | Hex | Use |
|---|---|---|
| `--navy-950` | `#081627` | reserved (deepest overlay) |
| `--navy-900` | `#0B1D33` | sidebar background, tooltips |
| `--navy-800` | `#112A47` | sidebar hover/active row |
| `--navy-700` | `#17365D` | primary action, selected state, Plan A series, depot marker |
| `--navy-500` | `#2A5687` | links, focus ring, info/"plan ahead" status, normal-case series |
| `--navy-300` | `#8FA9C8` | sidebar secondary text |
| `--navy-100` | `#E4ECF5` | info tint, selected table row |
| `--navy-50` | `#F2F6FB` | recommendation panel tint |
| `--ink` | `#14202E` | primary text (16.5:1 on white) |
| `--ink-2` | `#44515F` | secondary text (8.1:1 on white) |
| `--muted` | `#6B7887` | metadata, axis labels (**CHANGE**, see 2.3) |
| `--line` | `#D6DCE4` | dividers inside panels |
| `--line-2` | `#C3CBD6` | panel/table header rules |
| `--bg` | `#EEF1F5` | workspace background |
| `--panel` | `#FFFFFF` | panels, cards |
| `--panel-2` | `#F6F8FB` | inset areas, table headers, disclosure bodies |

### 2.2 Semantic tokens

The semantic names below are the ones components should use. **CHANGE:** today components reference base names directly; add these aliases in `:root` and migrate gradually.

| Semantic token | Maps to | Meaning |
|---|---|---|
| `--surface-app` | `--bg` | main background |
| `--surface-nav` | `--navy-900` | sidebar |
| `--surface-panel` | `--panel` | panels and cards |
| `--surface-inset` | `--panel-2` | inset, headers, disclosures |
| `--text-primary` | `--ink` | body and values |
| `--text-secondary` | `--ink-2` | explanations |
| `--text-meta` | `--muted` (fixed) | timestamps, units, axis labels |
| `--border-subtle` | `--line` | row dividers |
| `--border-strong` | `--line-2` | panel edges, header rules |
| `--border-control` | **new `#7C8794`** | input/select borders (3.65:1 on white) |
| `--action` / `--action-hover` | `--navy-700` / `--navy-500` | primary buttons |
| `--status-critical` (+ `-ink`, `-bg`, `-border`) | `#C62828` / `#A61F1F` / `#FBE9E9` / `#E4A3A3` | shortage, too late, failure, invalid input |
| `--status-warning` (+ `-ink`, `-bg`, `-border`) | `#E0A100` / `#7D5300` / `#FDF4DC` / `#EBCB78` | act soon, pending, estimate/assumption tags, simulated situation |
| `--status-healthy` (+ `-ink`, `-bg`, `-border`) | `#2E9E4A` / `#1C6B31` / `#E8F5EC` / `#A9D8B5` | OK, accepted, verified real data |
| `--status-info` (+ `-ink`, `-bg`, `-border`) | `--navy-500` / `--navy-700` / `--navy-100` / `#BFD0E4` | plan ahead, informational, rule-based |
| `--status-neutral` | `--muted` / `--panel-2` / `--line-2` | not applicable, not built, disabled |
| `--disabled` | opacity 0.5 on the component + `cursor:default` | disabled controls |
| `--series-a` / `--series-b` | `--navy-700` / `#5B8DD6` | comparison charts (Plan A / Plan B) |
| `--series-scenario` | `#7A3E9D` | "disrupted" line in What-if only |

### 2.3 Semantic rules

- **Red = critical or failure only:** a shortage expected, too late, invalid input, closed route. Never use red for decoration, totals or branding.
- **Amber = warning or pending action:** act soon, data ageing, estimates, a simulation in use. Amber (`#E0A100`) is **never text colour** (2.3:1 on white). Use `--status-warning-ink` for text.
- **Green = healthy or verified positive:** OK, accepted report, real-data tag. A good outcome ("✓ better") uses green ink, not fill.
- **Blue = information and planned items:** plan ahead, rule-based tags, selection. Blue is also the action colour, so status-blue always appears **with a label**.
- **Status is never colour alone.** Every status carries an icon glyph (✕ ! i ✓ –) **and** a word (ACT NOW, OK, …).
- **CHANGE (contrast):**
  - `--muted #6B7887` measures 3.98:1 on `--bg` and 4.23:1 on `--panel-2`, below AA for the 10–12 px text it is used for. Change it to **`#5C6878`** (5.0:1 on `--bg`, 5.3:1 on `--panel-2`).
  - Form-control borders `#C3CBD6` are 1.64:1 on white, below the 3:1 needed for non-text elements. Use `--border-control #7C8794`.
  - White ✓ on `--status-healthy` fill is 3.44:1. Use `--status-healthy-ink` as the icon background in badges.

---

## 3. Typography

### 3.1 Families (existing; keep)

| Token | Stack | Use |
|---|---|---|
| `--sans` | IBM Plex Sans, system-ui, Segoe UI, sans-serif | body, tables, buttons |
| `--cond` | IBM Plex Sans Condensed, Arial Narrow, sans-serif | page titles, panel titles, big metric numbers |
| `--mono` | IBM Plex Mono, ui-monospace, Consolas, monospace | timestamps, DTG, IDs, codes, numeric table cells, tags |

Fonts load from Google Fonts. Offline, the system fallbacks apply; layouts must survive that, so don't size boxes to Plex metrics alone (see §11).

### 3.2 Scale

The current CSS uses **22 sizes (9–46 px)**. **CHANGE:** collapse them to this scale.

| Token | Size / line-height | Weight | Use |
|---|---|---|---|
| `--fs-display` | 44 / 1.0 | 700 cond | one hero number per page at most (Winter days-to-closure, Today counts) |
| `--fs-metric` | 30 / 1.1 | 600 cond | metric values |
| `--fs-h1` | 22 / 1.2 | 700 cond | page title (top bar) |
| `--fs-h2` | 18 / 1.25 | 700 cond | card titles (post name), recommendation title |
| `--fs-h3` | 15 / 1.3 | 600 cond | panel titles |
| `--fs-body` | 14 / 1.45 | 400 sans | body, table text, action sentences |
| `--fs-small` | 13 / 1.45 | 400 sans | secondary text, explanations, form labels |
| `--fs-meta` | 12 / 1.4 | 400 sans/mono | notes, hints, units, timestamps |
| `--fs-tag` | 11 / 1.2 | 600 mono | status badges, tags, table header labels |

**Floor: 11 px.** Remove the 9, 9.5 and 10 px sizes (sidebar tags, `.est`, `.fact`, `.tag-*`, legend labels). Inside SVG, label text is at least 10 px at the 1440 px design width.

### 3.3 Numbers, units and text treatment

- Numeric table cells: `font-family: var(--mono); font-variant-numeric: tabular-nums; text-align: right` (class `n`). Keep this.
- **Value and unit:** the value is in `--text-primary`; the unit is a smaller `--text-meta` suffix (`1,318 L`, `5.0 d`).
- **Number format:** Indian grouping (`en-IN`); 0 decimals for stock, 1 for days, 2 for scores; currency as `₹1.5 lakh`.
- **Time:**
  - On daily-use pages, show an absolute date plus a relative time: `Thu 22 Oct 14:00 (in 2 d 18 h)`.
  - On planning tools, `day N` (days from now) is allowed, but the column or axis says so once.
  - Deadlines round **down** to the hour.
- **All caps** only in status badges, tags and the sidebar group labels. **CHANGE:** panel titles (`.ph h3`) and the uppercase table headers move to sentence case at `--fs-h3` / `--fs-tag`. This cuts the current eight uppercase rules to three.

---

## 4. Spacing, layout and shape

- **Spacing scale (px):** 2, 4, 6, 8, 12, 16, 20, 24, 32.
  - Gaps between panels are 12.
  - Panel padding is 12 × 14 (head 9 × 14).
  - Page padding is 18 × 20 (desktop) and 14 × 16 (≤ 600 px).
- **Layout:**
  - App shell: 232 px sidebar + fluid content, content max-width 1400 px.
  - Grids use `minmax(0, fr)` columns so content can shrink.
  - Two-column page patterns: *controls 320 px + results* (What-if, Compare plans) and *primary 1.6fr + side 1fr* (Map, Knock-on).
  - Every grid collapses to one column at ≤ 1080 px.
- **Radius:** 0 for panels, cards, tables and the map; 2 px for buttons, inputs and chips; 3 px for map label boxes; 50% only for status dots.
- **Borders:** 1 px `--border-subtle` or `--border-strong`. Emphasis uses a **3 px top edge** on metric tiles or a **4 px inset left edge** on list rows, never both.
  - **CHANGE:** the 6 px left border on Today's big counts becomes 4 px, to match the deadline rows.
  - **CHANGE:** the `.tile` 3 px top border and `.card` top borders keep only for comparison cards.
- **Elevation:** none. Flat panels with borders. Shadows only on the open mobile sidebar.

---

## 5. Component specifications

Each component lists the existing class to keep and the rules that standardise it.

### 5.1 Status badge — `.rb` + `ui.tag()` / `ui.statusTag()`

- **Layout:** 15 px icon square + word; mono 11 px, weight 600; 1 px tinted border; tinted background.
- **Tones:**
  - `red` = ACT NOW, TOO LATE, SHORTAGE
  - `amber` = ACT SOON, AGEING, FLAGGED
  - `blue` = PLAN AHEAD, RULE-BASED
  - `green` = OK, ACCEPTED, REAL PUBLIC
  - `grey` = NOT APPLICABLE, NOT BUILT
- **Words are meanings, not colours.** **CHANGE:** Knock-on effects shows `RED / AMBER / GREEN` as the badge text; replace with `SHORTAGE / AT RISK / OK`.
- **One severity vocabulary.** **CHANGE:**
  - What-if uses `LOW / WATCH / HIGH / CRITICAL` while the risk class uses `LOW / MEDIUM / HIGH`. These are two different "LOW/HIGH" scales on adjacent pages.
  - Proposed: margin severity uses the deadline words (`OK / ACT SOON / SHORTAGE`); the rule-based risk class keeps `LOW / MEDIUM / HIGH`, always followed by "(rule-based)".

### 5.2 Source and estimate tags — `.est`, `.fact`, `.tag-used`, `.tag-plan`

Four classes do one job. **CHANGE:** merge them into one `.tag` with tones `estimate` (amber), `real` (green), `rule` (blue) and `planned` (grey/blue), at 11 px.

Approved words: `ESTIMATE`, `SIMULATED`, `ILLUSTRATIVE`, `ASSUMED`, `REAL PUBLIC`, `RULE-BASED`, `PLANNED`, `SNAPSHOT`, `AVERAGE`. Don't stack more than two tags on one element.

### 5.3 Metric summary

There are four patterns today: `.tile`, `.big`, `.big-num`, and `.reco .big`. **CHANGE:** one `.metric` component.
- Label (`--fs-tag`, sentence case)
- Value (`--fs-metric`, cond, tabular)
- Optional unit or "/ total" in `--fs-small`
- Optional one-line context (`--fs-meta`)
- Tone edge on the left (4 px) when the metric is a status count

Today's counts are `.metric--status`. The Winter top row reuses the same component.

### 5.4 Panel — `.panel > .ph + .pb`

- **Header:** title (h3) left; secondary links or tags right (`.hint`).
- **Body:** 12 × 14.
- **Nesting:** panels never nest panels. Use `--surface-inset` blocks inside instead.

### 5.5 Data table — `table.t`

- **Header:** mono 11 px (CHANGE from uppercase 10.5) on `--surface-inset`.
- **Rows:** 7 × 8 padding with `--border-subtle` dividers. Numeric columns use `.n`. The selected or recommended row uses the `--navy-100` background **plus** a tag (`RECOMMENDED`).
- **CHANGE:** `.optt` (options inside disclosures) becomes `table.t.compact` (5 × 6 padding), not a separate style.
- **Comparison tables:** "better" cells keep the `✓ better` suffix (green ink), so the comparison is never colour-only.
- **Width:** wide tables sit inside `.scroll`. Never shrink the font to fit.

### 5.6 Buttons — `.btn`, `.btn.primary`, `.btn.sm`

- **Sizes:** default 32 px high (6 × 12 padding, 13 px); `sm` 26 px (3 × 9, 12 px).
- **Variants:**
  - **Primary:** navy-700 fill, white text. At most one per card (Approve, Run demo, Accept report).
  - **Secondary:** white with a `--border-control` border.
  - **Text-link** buttons only for navigation ("All deadlines →").
- **Destructive or reset actions** (Reset demo, Clear history) are secondary, never red. Red is status, not action.
- **CHANGE:** links styled as buttons (`a.btn`) need the same height and colour as `button.btn`; three local overrides set `color:var(--ink)` today.

### 5.7 Form controls — `.field`

- **Structure:** label (13 px, weight 500) above control; help text (12 px meta) below; error (12 px critical-ink) below that, shown with `.field.invalid` plus a red border.
- **Controls:**
  - Inputs and selects: 32 px high, 2 px radius, `--border-control`.
  - Ranges: show their value in `output.val` (mono, navy-700), update it live while dragging, and commit on release.
- **Read-only fields** use `--surface-inset` and keep their label.
- Chip toggles (`.chips button[aria-pressed]`) for 2–5 discrete choices. Tabs (`.itabs`, `role=tab`) for switching the supply class. Don't use one for the other.

### 5.8 Callout / alert

There are six variants today: `.urgent`, `.limit`, `.verdict`, `.banner`, `.parse`, `.acard`. **CHANGE:** one `.callout` with tones `critical | warning | healthy | info`.

**Structure:**
- status badge
- **what** (one sentence)
- **evidence** (numbers)
- **action** (button or sentence)
- **uncertainty / trade-off** (meta line)

The page-level situation banner (`.banner`) stays separate: full width, warning tone, always with Change and Clear.

### 5.9 Action card — `.acard`

Today and the map card follow this order:
1. status badge
2. post · supply
3. data-quality tag
4. one action sentence ("Expedite convoy from Depot-B by Thu 22 Oct 14:00 (in 2 d 18 h).")
5. buttons (Approve, Show on map, Options)
6. "Why this recommendation?"

Once approved, the Approve button is replaced by a green `✓ Approved <time>: <option>` line.

### 5.10 Recommendation panel — `.reco`

Contents:
- title "Recommended · best of N applicable plans · commander decides"
- plan name (`--fs-h2`)
- bullet facts: why, posts still short, cost, notes
- the "Why this recommendation?" disclosure with the scoring table

Only one recommendation panel per page. Don't call a plan "optimal": the method is a ranking over five fixed candidates.

### 5.11 Timelines

- **Deadline timeline (SVG):** stock bar (healthy tint until "safe until"), red line at the safe-until point, ▼ for scheduled delivery, lettered circles (T C D A) for the latest order time of each option, hatched red for "no option arrives in time". Day ticks with weekday labels.
- **Step timeline:** `.flow` (numbered, impact chain) and `.tl-steps` (demo, left-edge state) are two patterns for one idea. **CHANGE:** use `.steps` with a numbered marker and states `done | current | pending`.

### 5.12 Expandable explanation — `details.why`

- **Summary text:** always "Why this recommendation?" for recommendations, and "How is this worked out?" for page-level method notes.
- **Body (`.why-b`):** facts as a `dl.kv2` list, then the options table, then **Why:** and **Remaining risk:** sentences.
- Bodies show engine values only; nothing is typed in by hand.
- **CHANGE:** the "All options" disclosure in deadline rows and `details.howto` need the same summary style (navy-500, weight 500, ▸/▾ marker).

### 5.13 Dialogs and notifications

None exist yet. If added:
- **Dialogs:** use native `<dialog>` with focus trap and Esc to close. Only for confirming an irreversible action (e.g. "Clear history"). Not for information that fits inline.
- **Notifications (toast):** bottom-left, 4 s, `role=status`, one at a time. Use them only to confirm a completed action ("Report accepted for Post Heron"). Don't use them for warnings; those belong in the page as callouts.

### 5.14 Loading, empty and error states

- **Loading:** the app computes synchronously, so there is no spinner. The only async step is the live weather fetch. Show `CACHED FORECAST`, then switch to `LIVE FORECAST fetched hh:mm`; on failure show "Could not reach Open-Meteo, using cached data" and keep the page usable.
- **Empty:** `.empty` text states the reason and next step ("No saved runs yet. Set up a scenario and press Save run."). Never leave an empty table header on its own.
- **Error:** the router's catch block shows the panel "Something went wrong on this page" with the message and a Reset demo data button. Keep it.
- **Invalid input:** inline field error (§5.7), never an alert box.

---

## 6. Data visualisation conventions

- **Line and area:** 2 px lines, no markers. The disrupted series is dashed `--series-scenario`. Shortage windows are a red tint at 12% opacity. Delivery is a ▼ marker in the series colour.
- **Bars:** comparison bars sit side by side (Plan A navy-700, Plan B #5B8DD6). Negative values (shortage) get a 1.5 px critical outline **and** a "short" label under the category.
- **Axes and grid:**
  - Gridlines `#E6EAF0` at 1 px; the zero line is `--ink` at 1.2 px.
  - Axis text is mono 10 px in `--text-meta`.
  - One y-axis per chart. No dual axes.
- **Tooltips:** `.tip`, navy-900 with white mono 11.5 px, follows a crosshair. Every chart that has a tooltip also shows its key numbers elsewhere on the page in text, so the tooltip is never the only way to read them.
- **Legends:** below the chart, `.legend`, with the same swatch shapes as the marks.
- **Sources:** real-data charts (weather history) say "Real ERA5 data" in the panel head. Synthetic charts carry an `ESTIMATE` / `SIMULATED` tag.
- **CHANGE:** there are 145 hex literals in JS-built SVG. Read colours from CSS tokens with one helper, e.g. `ui.tok('--status-critical')` via `getComputedStyle`, so charts and maps follow the token table.

---

## 7. Map and network conventions

**The terrain must stay schematic and fictional.**
- Elevation bands use pale grey-green tints (`#E6ECE4 → #BEC6BC`, snow-cap `#F6F8FA`), with a river line `#9CC3E4`.
- Show no real coordinates, borders or place names.
- Keep the footer line "SCHEMATIC · NOT TO SCALE · FICTIONAL SITES · NO BORDERS SHOWN" on every map.

**Map symbols:**

| Feature | Symbol |
|---|---|
| Post | 14 px circle filled with status colour, 3 px white ring, icon glyph (✕ ! i ✓); label box with name + one status line |
| Selected post | extra 3 px navy-700 ring |
| Depot | 22 px navy-700 square with "D" |
| Pass | triangle with label pill; red fill + "CLOSED" when closed |
| Main road | 4 px `#4A5563` with 4 px white casing |
| Route-2 (light vehicles) | 2 px dashed `#7F97B5` |
| Porter / animal track | 2 px dotted `#7C8794` |
| Closed segment | red dashed |
| Snow in forecast (3 days) | ❄ glyph next to the post (**CHANGE:** use an SVG icon, since the glyph depends on the font) |

**Network diagram (Knock-on effects):**
- Nodes are 180 × 56 boxes with a status-coloured fill tint and border, plus a 5 px status edge.
- Each node has three text lines: name, state, and status word.
- Edges are curved, with arrowheads toward the receiver. They turn red and thicker when delayed, and carry a white label pill ("+3 d", "1 d transit").
- Lateral transfers are dotted, two-headed and light navy.

**Legends:** every map and network has a text legend, and each status colour in it is paired with a word.

**Interaction:**
- Nodes are focusable (`tabindex=0`, `role=button`, `aria-label` with name and status) and respond to Enter and Space.
- Hover and focus both draw a navy-700 2.2 px stroke.

---

## 8. UX writing guidelines

**Voice:** plain, neutral, specific, active. Write for a duty officer, not an analyst.

**Structure of a warning:**
1. What happened or may happen.
2. Evidence.
3. Action.
4. Uncertainty.

> Post Heron · SKO: stock projected to run out on Wed 21 Oct 14:00 (2.0 days). Next delivery Fri 23 Oct. Expedite convoy from Depot-B by Tue 20 Oct 02:00. Last report 0 h old; count flagged as unusually low, so check it.

**Prefer / avoid:**

| Prefer | Avoid |
|---|---|
| Stock projected to fall below safety stock in 2 days. | Dangerous supply crisis predicted. |
| Recommended plan: Reroute + air maintenance. It leaves 0 posts short against 2. | Our intelligent engine found the perfect plan. |
| Risk class: HIGH (rule-based). | 87% probability of stock-out. |
| Cautious estimate (assumed demand spread). | 90% confidence. |
| Weather: real forecast (Open-Meteo). Stock: synthetic. | Live AI-powered sensing. |
| Air maintenance (air-drop) | Airlift / sortie magic |

**Accurate words:**
- **observed:** field report or sensor
- **forecast:** Open-Meteo
- **simulated:** scenario or storm switch
- **estimated:** engine rule
- **synthetic:** demo stock and use
- **illustrative:** costs

Use "best of the evaluated plans", never "optimal". Use "recommended", never "decided".

**Terminology** (one name everywhere; **CHANGE** where code or Methods text still differs):

| Use | Not |
|---|---|
| Action deadlines | Decision Clock (code comments may keep the old name) |
| Knock-on effects | Ripple-effect analyzer |
| Compare plans | Stress test |
| Safe until | conservative / cautious stock-out (in UI copy) |
| Air maintenance | airlift |
| Field report (SITREP) | message, sensor reading (unless it is one) |

**Labels:**
- Sentence case.
- Verbs on buttons: Approve, Accept report, Run demo scenario, Compare.
- No exclamation marks.
- No "please".

---

## 9. Accessibility requirements

- **Contrast:**
  - Text: WCAG 2.2 AA, 4.5:1 for text under 18 px and 3:1 for large text.
  - Non-text: 3:1 for UI components and meaningful graphics (control borders, focus ring, status fills).
  - Apply the §2.3 fixes.
- **Status:** colour + glyph + word, always (§2.3). Charts mark shortages with an outline and a label as well as colour.
- **Keyboard:**
  - Everything clickable is a `button`, `a` or focusable SVG `g[role=button]`.
  - Visible `:focus-visible` ring: 2 px navy-500, 2 px offset.
  - Don't remove outlines without a replacement (`.node:focus` currently does; it relies on the stroke change, which is acceptable).
- **Semantics:**
  - One `h1` per page (top bar).
  - Panel titles are `h3`. **CHANGE:** add `h2` for the main page section, or demote the panel titles consistently.
  - Tables have `th` headers; tabs use `role=tablist/tab` with `aria-selected`.
  - Disclosures use native `details/summary`.
- **Announcements:** content that changes after an action (Approve, Accept report, demo steps) goes in an `aria-live="polite"` region. **CHANGE:** the demo timeline and the Approve confirmation are not announced today.
- **Motion:** only the demo's 0.9 s step reveal. Respect `prefers-reduced-motion` by showing all steps at once. **CHANGE**.
- **Target size:** at least 24 × 24 px for every control. `.btn.sm` (26 px) meets this; table action buttons must not go smaller.
- **Language:** `lang="en"` is set. Abbreviations (SKO, POL, AWS, SITREP, MT) are expanded once per page or in a tooltip.

---

## 10. Responsive behaviour

| Width | Behaviour |
|---|---|
| ≥ 1180 px | Full layout. Deadline rows in three columns (post · timeline · decision). |
| 1080–1179 | Deadline decision column drops below the timeline. |
| 861–1079 | All two-column page grids become one column. Metric rows show two per line. |
| ≤ 860 | Sidebar becomes an off-canvas drawer (☰ Menu button, overlay, closes on navigation). |
| ≤ 600 | Metrics one per line. Page padding 16 px. Scenario chips scroll horizontally. Tables scroll inside `.scroll`. |

**Rules:**
- **No horizontal page scroll at 375 px.** Check every page with `document.documentElement.scrollWidth === innerWidth`.
- SVGs scale by `viewBox`. Text inside them must stay ≥ 9 px when rendered at 375 px wide; if not, show a simplified legend or the list view.
- **Print:** only the Commander's brief is designed for print. The sidebar, top bar and banner are hidden.

---

## 11. Anti-patterns (do not do)

- Gradient hero headers, glowing cards, glassmorphism, neon dark mode, "AI" sparkle icons, animated counters.
- Status shown by colour alone, or colour names as labels ("RED").
- Red for buttons, branding or totals; amber text on white.
- Percentages labelled "probability" or "confidence" for rule-based outputs; the word "optimal".
- A new component that duplicates an existing one (a second badge, a seventh callout style).
- Hard-coded hex in new code. Use tokens (and `ui.tok()` once it exists).
- Inline `style="…"` for anything reusable. There are 116 inline styles in view templates today; don't add more, and move repeats into classes.
- Text under 11 px; fixed-height boxes that clip text.
- Sizing SVG label boxes from character counts of one specific font without slack. `map.js` does this, so a font change or the offline fallback can overflow labels.
- Hiding the synthetic-data badge, the Open-Meteo attribution, or the map's "fictional" footer.
- Dual-axis charts; pie charts for comparisons; 3-D anything.
- Modal pop-ups for warnings that belong on the page.

---

## Appendix A — Audit of the current implementation (20 Oct 2026)

### A1. Worth preserving

- **The palette and shell:** dark navy sidebar (`#0B1D33`), cool neutral workspace, white flat panels with 1 px borders and no shadows. This reads as an operations tool, not SaaS.
- **IBM Plex Sans / Condensed / Mono:** an engineering feel, clear numerals; mono for timestamps and numeric cells with tabular figures.
- **Status always as glyph + word:** `.rb` badges, map markers with ✕ ! i ✓, `✓ better` in comparisons.
- **Honesty markers:** `DEMO DATA · REAL WEATHER` badge, `ESTIMATE` tags, map footer, "What is real, what is not" table, Open-Meteo attribution.
- **Patterns:**
  - the deadline timeline (option letters, safe-until line, hatched no-option zone)
  - the network diagram with labelled edge pills
  - the situation banner that appears only when a scenario is active
  - the "Why this recommendation?" disclosure filled from the engine
- **Responsive behaviour:** already verified with no horizontal scroll at 375 px on all 11 pages.

### A2. Inconsistencies found

1. **Font sizes:** 22 distinct sizes, including 9, 9.5 and 10 px text (sidebar tags, `.est`, `.fact`, `.tag-*`).
2. **Contrast:**
   - `--muted` fails AA on `--bg` (3.98:1) and `--panel-2` (4.23:1).
   - Form-control borders are 1.64:1, against the 3:1 needed for UI components.
   - White ✓ on the green badge icon is 3.44:1.
3. **Two severity vocabularies:** What-if `LOW / WATCH / HIGH / CRITICAL` vs risk class `LOW / MEDIUM / HIGH`. Knock-on effects labels badges with colour names (`RED/AMBER/GREEN`).
4. **Four metric-tile styles:** `.tile` (3 px top), `.big` (6 px left), `.big-num`, `.reco .big`. Winter puts `.tile` inside `.panel`.
5. **Six callout styles:** `.urgent`, `.limit`, `.verdict`, `.banner`, `.parse`, `.acard`.
6. **Two table styles** (`table.t`, `.optt`) and **two step timelines** (`.flow`, `.tl-steps`).
7. **Four tag classes** for one job (`.est`, `.fact`, `.tag-used`, `.tag-plan`) with differing wording ("EST.", "ESTIMATES · COSTS ILLUSTRATIVE", "ILLUSTRATIVE RATE").
8. **Three emphasis-edge treatments:** inset 4 px left shadow, 6 px left border, 3 px top border.
9. **Hard-coded styling in JS:**
   - 145 hex colours, mostly in `map.js`, `views-sim.js` and `ui.js` SVG code, so maps and charts don't follow tokens.
   - 116 inline `style=` attributes in templates.
10. **Terminology drift:**
    - "Decision Clock" (How it works, code) vs "Action deadlines" (nav).
    - "Ripple" vs "Knock-on effects".
    - "Stress test" vs "Compare plans".
    - "safe until" vs "cautious stock-out".
11. **Excess all-caps:** 8 uppercase rules (panel titles, table headers, tile labels, mini cards, card headers) on top of badges.
12. **Time references:** daily pages use dates; planning tools mix `day 6`, `d+3` and dates without saying which.
13. **Dead code:** the old `V.overview` and `ui.sectorMap` remain in `views.js` and `ui.js` but are overridden by `today.js` and `map.js`.
14. **Heading hierarchy:** pages jump from `h1` to panel `h3`. The demo timeline and approval confirmations are not announced to screen readers.

### A3. Components to standardise (in priority order)

1. **Status badge vocabulary** (§5.1): one severity scale; meaning words, not colour words.
2. **Tag** (§5.2): one class, approved words.
3. **Callout** (§5.8): one structure with what / evidence / action / uncertainty.
4. **Metric** (§5.3): one component for Today, Winter and anywhere else.
5. **Table** (§5.5): `.optt` becomes `table.t.compact`.
6. **Steps** (§5.11): `.flow` and `.tl-steps` become one.
7. **Disclosure** (§5.12): one summary style.
8. **Token helper for SVG** (§6): `ui.tok()`.

### A4. Changes that could break functionality, and what to protect

- **Class names are also JS hooks:**
  - `#view`, `.reco .big`, `details.why`, `.itabs button`, `.node`, `svg.fluid`, `#scbar`, `#tools`, `[data-ok]`, `[data-approve]`, `[data-cmp]`, `[data-focus]`, `[data-sel]`, `[data-restore]`, `[data-sample]`, `#resetDemo`, `#runDemo`.
  - Renaming a class means updating `today.js`, `map.js`, `views*.js` and `app.js` together. Add new classes alongside old ones, then remove the old ones.
- **Map label sizing** in `map.js` is computed from character counts (7.2 px and 6.1 px per character). Changing fonts or sizes there requires re-tuning, or label boxes will clip or overlap. Measuring with `getBBox()` would remove this risk.
- **SVG `viewBox` dimensions** (map 820 × 470, network 900 × 470, deadline timeline 620 × 78) are used in coordinate maths. Don't change them in CSS.
- **Status tiers come from the engine** (`late / now / soon / plan / covered`); colours map to them in `map.js` and `explain.js`. A colour change must keep that mapping one-to-one.
- **Print stylesheet:** the brief depends on `.noprint` and hidden shell elements.
- **The 14 engine tests** cover numbers, not styling. A visual refactor won't break them, but it also won't be caught by them. Re-run the 11-page browser smoke check (no errors, no horizontal scroll, buttons work) after any UI change.

### A5. Dependencies

- **No `package.json`:** the app is plain HTML/CSS/JS with no build step.
- **shadcn/ui** needs React and Tailwind, so it doesn't fit this codebase. Adopting it would mean a rewrite. **Not recommended.**
- **Lucide icons:** repository `lucide-icons/lucide` verified, LICENSE is **ISC** (GitHub's detector reports NOASSERTION, so keep the licence notice with copied files).
  - Reasonable as a **copy-in of ~8 SVG icons** (alert-triangle, check, x, info, snowflake, plane, truck, clock) into one `js/icons.js`, replacing font-dependent glyphs (❄ ✕ ★).
  - No package install needed.
- **Charts:** the hand-written SVG charts are small and consistent. A chart library is not needed for the current four chart types.

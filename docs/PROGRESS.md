# Progress log

Target statement: **SIH26251 — Indian Army: Predictive Logistics & Forward Supply Chain**
Team: Van Guard (6). Idea deadline: 20 Oct 2026. Budget: ~3–4 working days.

## Status
| Phase | State |
|---|---|
| 0. Setup | done (9 Oct) |
| 1. Research & design | done (9 Oct) |
| CHECKPOINT | **waiting for approval** |
| 2. Build | not started |
| 3. Submission pack | not started |

## Task list
- [x] P0 Repo skeleton, git, logs
- [x] P0 Questions to Tejas (form fields, roles, media, mockups, repo visibility)
- [x] P1 01_landscape.md (competition, what others will submit, how we differ)
- [x] P1 02_domain.md (supply classes, DOS, winter stocking, consumption drivers, failure modes)
- [x] P1 03_methods.md (forecasting, intervals, backtest, inventory policy, routing, resilience)
- [x] P1 04_data_sources.md (public data, licences, synthetic plan, IoT feed)
- [x] P1 05_differentiators.md (criteria to features to evidence)
- [x] P1 Synthetic-data credibility plan (in ASSUMPTIONS.md)
- [x] P1 00_summary.md, SOURCES.md, MVP scope, day plan, team split, questions
- [ ] CHECKPOINT: wait for "approved"
- [ ] P2 DESIGN.md
- [ ] P2 Day 1: generator + forecasting + backtest
- [ ] P2 Day 2: DOS/risk + routing + resilience scenario
- [ ] P2 Day 3: dashboard + sensor feed + end-to-end demo
- [ ] P2 Day 4: buffer, figures, README, screenshots, video
- [ ] P3 Submission pack

## Log
### 2026-10-09
- **Done:** repo skeleton, git init, assumptions log, this file.
- **Decision:** the repo root *is* the project folder (the brief's `sih-backup/` layout is applied at the repo root, since the repo is already named for the team and statement).
- **Next:** Phase 1 research threads (landscape, domain, methods, data sources, differentiators).
- **Blockers:** waiting on portal form fields/limits, team roles, and whether a live link/video is accepted.
- **Done (Phase 1):** research files 00–05, SOURCES.md, ASSUMPTIONS.md (incl. A/B non-circular protocol).
- **Decision:** schematic fictional map + hand-made graph, not OSM/osmnx (no-real-locations rule, determinism, borders). Pending Tejas's confirmation (Q1).
- **Decision:** Python 3.12 (scipy/networkx latest need >=3.12; statsforecast needs pandas<3).
- **Decision:** lead differentiators = resilience test, probabilistic days of supply, honest backtest panel; no-signal handling as support.
- **Next:** CHECKPOINT. No application code until "approved".

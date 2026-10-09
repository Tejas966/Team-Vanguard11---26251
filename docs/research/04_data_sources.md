# 04 — Data sources and data strategy

All checks done 2026-10-09. Confidence: **H** = confirmed on an official page, **M** = secondary source or partly confirmed, **L** = not confirmed. Real defence data is not available. **Everything about units, posts, stock levels, consumption, convoys and closures in the MVP is synthetic.** Public data is used only for physical context (weather, terrain, roads, landslide history).

## 1. Data types: what is public and what we simulate

| Data type | Public data available | Licence / terms | Access | Freshness | What we simulate |
|---|---|---|---|---|---|
| Demand / consumption | Only top-level ration calorie scales: about 4,428 / 5,173 / 5,350 kcal/day for altitudes below 9,000 ft / 9,000–12,000 ft / above 12,000 ft, as reported from a CAG audit [S14] (M). No per-item public scales found. | News report of a public audit | Web | Audit covers 2015–18 | **All per-item daily consumption** (rations, fuel, kerosene, medical, ammo-generic) for a made-up headcount, with altitude/cold multipliers. Only the calorie tiers above are a public anchor. |
| Inventory | None | — | — | — | **Fully synthetic** stock at made-up posts, fed in by the IoT simulator (section 3). |
| Transport capacity | None for military vehicles or convoys | — | — | — | **Synthetic** vehicle classes (e.g. 3 t / 10 t trucks, a generic airlift lot), payload, trip time per segment. |
| Terrain / elevation | SRTM 30 m (public domain, NASA) [S5]; Copernicus GLO-30 (free worldwide except Armenia/Azerbaijan, must show the DLR/Airbus notice) [S6]; CartoDEM 30 m free on Bhuvan with login, single-user licence [S7] (M); Open-Meteo Elevation API (Copernicus GLO-90, up to 100 points per call, no key) [S3]; OpenTopoData public API (srtm30m/aster30m, 100 locations per request, 1 call/s, 1,000 calls/day) [S4] | See left | SRTM via LP DAAC needs an Earthdata login [S5]. APIs need no auth. | Static | Nothing. We fetch real elevation, but only for our generic points. |
| Weather | Open-Meteo Historical API: ERA5 (0.25°, 1940–now) and ERA5-Land (0.1°), about 5-day delay; daily `temperature_2m_min/max`, `precipitation_sum`, `snowfall_sum` (snow depth is hourly only) [S2]. Forecast API under the same terms. | Data CC BY 4.0. Free tier is **non-commercial only**: 600/min, 5,000/h, 10,000/day, 300,000/month. **No API key.** [S1][S9] | REST JSON | ERA5 ~5 days behind; forecast updated several times a day | Nothing for the history. Scenario "what-if" storms are synthetic overlays. |
| Road network | OpenStreetMap through osmnx (MIT) [S10][S11] | ODbL. Must credit "© OpenStreetMap contributors" and link the licence [S10] | Overpass via osmnx, no auth | Live (community-edited) | Road **class, capacity and status** (open/closed) are synthetic. Mountain-road coverage in OSM may be incomplete; we have not verified this. |
| Disruptions: landslides | NASA Global Landslide Catalog CSV export (rainfall-triggered, since 2007, one-time export current to 2016-03-07) [S12]; the wider COOLR catalogue through Landslide Viewer [S13]; NRSC *Landslide Atlas of India* (2023, ~80,000 landslides, 1998–2022, PDF) [S15]; GSI inventory/susceptibility on Bhukosh, free but needs registration and accepting T&Cs [S16] (M) | GLC: cite Kirschbaum et al. 2010/2015 [S12]. Licence field "not specified". I could not verify a formal licence. Atlas: no terms of use shown, and I could not find a downloadable GIS layer. | CSV download / PDF / registered portal | GLC export is static (2016) | **Per-segment daily disruption probability is synthetic** (model in 1.1), calibrated loosely against the public catalogue counts. |
| Disruptions: snow / pass closure | ERA5 `snowfall_sum` via Open-Meteo [S2]; MODIS MOD10A1 500 m daily snow cover (NSIDC, free for research/education; needs an Earthdata login) [S8] (M) | See left | API / Earthdata | Daily | **Closure windows are simulated.** Pass closure and opening dates appear in news coverage each year, but we do not scrape or cite specific military routes. |

### 1.1 Turning hazard data into per-segment disruption probability (synthetic model)

For each road segment *s* on day *d*:

```
slope_s   = max slope from DEM samples along segment (deg)
base_s    = hazard tier from slope (low <15°, med 15–30°, high >30°) → logit offset b_s ∈ {-5, -4, -3}
                (optionally +0.5 if a GLC/COOLR point lies within 5 km)
rain_3d   = sum precipitation_sum over d-2..d (mm)       # Open-Meteo
snow_2d   = sum snowfall_sum over d-1..d (cm)
p_slide   = 1 / (1 + exp(-(b_s + 0.04*rain_3d)))         # logistic
p_snow    = 1 / (1 + exp(-(-4 + 0.15*snow_2d + 0.08*max(0, alt_s-3500)/100)))
p_seasonal= 1 if d in synthetic closure window for high passes (e.g. ~Dec–Apr) else 0
p_closed  = 1 - (1-p_slide)(1-p_snow)(1-p_seasonal)
```

All coefficients are **illustrative**, not fitted to data. Present this as a transparent rule-based baseline that real closure logs could later calibrate.

## 2. Recommended data strategy for the MVP

Coordinates: use **real public places only**, meaning district/tehsil towns and ERA5 grid points, with **generic labels** ("Depot-A", "Post-H1", "Pass-Node-2"). Never use or guess the coordinates of real posts, units or military roads. Snap the "forward posts" to grid points or village centroids taken from OSM `place=*`, and say in the UI that they are not real sites. Do not draw international boundaries. Indian rules on how national borders are shown are sensitive, so hide the boundary layer and work in a single interior region.

| MVP element | Class | Exact fetch / generation |
|---|---|---|
| Weather history | Real-public | Open-Meteo archive `https://archive-api.open-meteo.com/v1/archive`, daily `temperature_2m_min,temperature_2m_max,precipitation_sum,snowfall_sum`, 3–5 generic high-altitude coordinates (public towns), 2023-01-01 → 2025-12-31, `timezone=Asia/Kolkata`. Cache as CSV in `data/public/weather/` with `LICENCE.txt` (CC BY 4.0, Open-Meteo link). About 5 calls in total. |
| Weather forecast | Real-public (optional) | Open-Meteo forecast API, 7-day daily for the same points, cached once per hour. Fall back to the cache if offline. |
| Elevation | Real-public | Open-Meteo `/v1/elevation` for all nodes and segment sample points (≤100 per call). Cache to `data/public/elevation.json`. |
| Road graph | Real-public geometry + Synthetic attributes | osmnx `graph_from_bbox`/`graph_from_point` with `network_type="drive"` for one small public bbox. Simplify and save GraphML to `data/public/roads.graphml`. If the network is too sparse, hand-draw an **illustrative** graph instead. |
| Landslide history | Real-public (context only) | NASA GLC CSV export filtered to the bbox, saved to `data/public/glc_bbox.csv`, cite Kirschbaum et al. Shown as a map layer and used to add a small logit bump. |
| Disruption probabilities | Synthetic | Model in 1.1, seeded RNG, stored in `data/synthetic/disruptions.csv`. |
| Pass closures | Synthetic / Illustrative | Seasonal window plus snow-triggered closures, with a label saying they are simulated. |
| Posts, depots, headcount | Synthetic | `data/synthetic/nodes.json`: generic names, public-town coordinates. |
| Consumption history | Synthetic | 3 years of daily per-item use = headcount × base rate × altitude tier (public kcal tiers as the ratio) × cold factor from `temperature_2m_min` × noise and occasional surges. This means the forecast model learns real weather signal on top of synthetic demand. |
| Inventory stream | Synthetic | IoT simulator (section 3). |
| Fleet / capacity | Synthetic | `data/synthetic/fleet.json`. |

## 3. IoT-style inventory feed

| Option | Pros | Cons | Licence |
|---|---|---|---|
| MQTT + Mosquitto broker + paho-mqtt | The real IoT pattern: QoS levels, retained "last value", LWT for "no signal", built for low bandwidth | Needs an extra broker process or service on Windows plus a bridge into FastAPI. More things that can break in a 3–4 day build. | Mosquitto EPL-2.0 / EDL-1.0 (BSD-3) [S17] (M); paho-mqtt EPL/EDL [S18] (M) |
| WebSocket (FastAPI) | Two-way, low latency | Reconnect and backfill logic is hand-written. We do not need traffic from the UI to the server. | — |
| **SSE from FastAPI** | One-way server→UI, browser `EventSource` reconnects on its own, `Last-Event-ID` resume, keep-alive pings every 15 s. Built in since FastAPI 0.135.0 (`fastapi.sse.EventSourceResponse`) [S19] (H) | One-way only (fine here) | MIT (FastAPI) |

**Recommendation:** a Python simulator (`sim/iot_sim.py`) sends `POST /api/telemetry` for each reading (batches allowed). FastAPI validates it, dedupes, stores in SQLite and fans out on `GET /api/stream` (SSE) to React. The pitch line is "MQTT is the production path: the gateway subscribes to `inv/<post_id>/<sensor_id>` and calls the same ingest function". Keep ingest separate from the transport so an MQTT adapter is a small addition later.

### Payload schema (v1)

```json
{
  "schema": "inv.v1",
  "sensor_id": "LC-H1-07",
  "post_id": "POST-H1",
  "item": "kerosene",
  "quantity": 412.5,
  "unit": "L",
  "battery_pct": 63,
  "rssi_dbm": -97,
  "ts": "2026-10-09T06:15:00Z",
  "seq": 18234,
  "signature": "UNSIGNED-DEMO"
}
```

Rules:
- **Duplicates / out-of-order:** keep `last_seq` for each `sensor_id`. If `seq <= last_seq`, store it as history but do not update current stock (flag `late`). If `seq > last_seq + 1`, record a gap. The key `(sensor_id, seq)` is unique, so retries do no harm.
- **Staleness** (`now - last_seen`): <15 min **Live**, 15–60 min **Stale** (amber, value shown greyed), >60 min **No signal** (red, show the last known value and its age, forecast falls back to consumption-based estimates). `battery_pct < 20` shows a warning. `rssi_dbm < -110` marks the link as weak.
- **Clock skew:** reject `ts` more than 10 min in the future and use server receive time instead.
- **Signature:** placeholder field. The production design is HMAC-SHA256 per device over the canonical JSON. Not implemented, and we say so.
- **Store-and-forward (optional):** the simulator writes to a local SQLite outbox when the POST fails (simulated "comms blackout") and replays in `seq` order when the link returns. The UI then shows a backfill burst, which demonstrates offline-first behaviour.

## Sources (all accessed 2026-10-09)

- [S1] Open-Meteo Terms — https://open-meteo.com/en/terms (H)
- [S2] Open-Meteo Historical Weather API — https://open-meteo.com/en/docs/historical-weather-api (H)
- [S3] Open-Meteo Elevation API — https://open-meteo.com/en/docs/elevation-api (H)
- [S4] OpenTopoData — https://www.opentopodata.org/ (H)
- [S5] LP DAAC command-line access (Earthdata login) — https://lpdaac.usgs.gov/resources/e-learning/how-access-lp-daac-data-command-line ; SRTM public domain per Earth Engine catalog https://developers.google.com/earth-engine/datasets/catalog/USGS_SRTMGL1_003 (M)
- [S6] Copernicus DEM licence — https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Data/DEM/resources/license/License-COPDEM-30.pdf ; https://registry.opendata.aws/copernicus-dem/ (M, from search summary)
- [S7] NRSC CartoDEM / EOP CDEM policy — https://www.nrsc.gov.in/EOP_CDEM_Policy ; https://bhuvan-app3.nrsc.gov.in/data/download/help/source/html/introduction.htm (M)
- [S8] NSIDC MOD10A1 v61 — https://nsidc.org/data/MoD10A1 (M)
- [S9] Open-Meteo Licence / Pricing — https://open-meteo.com/en/licence ; https://open-meteo.com/en/pricing (H)
- [S10] OSM copyright — https://www.openstreetmap.org/copyright (H)
- [S11] OSMnx docs (MIT) — https://osmnx.readthedocs.io/ (M)
- [S12] NASA GLC export — https://data.nasa.gov/dataset/global-landslide-catalog-export ; https://catalog.data.gov/dataset/global-landslide-catalog-export (H for content, licence not stated)
- [S13] NASA COOLR — https://gpm.nasa.gov/applications/landslides/coolr (H)
- [S14] CAG ration-scale reporting — https://www.theweek.in/news/india/2019/12/13/no-sun-glasses-boots-or-food-life-of-army-personnel-in-siachen-ladakh.amp.html ; https://raksha-anirveda.com/army-troops-have-no-snow-glasses-and-boots-says-cag-report/ (M; primary CAG PDF not checked)
- [S15] ISRO Landslide Atlas of India — https://www.isro.gov.in/ISRO_EN/Landslide_Atlas_India.html (H)
- [S16] GSI Bhukosh — https://bhukosh.gsi.gov.in ; PIB note https://moes.gov.in/sites/default/files/PIB2158420.pdf (M)
- [S17] Mosquitto licence — https://mosquitto.org/ (M, from secondary listings)
- [S18] paho-mqtt licence — https://salsa.debian.org/debian/python-paho-mqtt/-/blob/master/LICENSE.txt (M)
- [S19] FastAPI SSE — https://fastapi.tiangolo.com/tutorial/server-sent-events/ ; https://fastapi.tiangolo.com/reference/sse/ (H)

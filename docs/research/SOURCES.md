# Sources

All sources were accessed 2026-10-09 unless a line says otherwise. Each research file cites inline, with confidence marks.


## Landscape and competition (`01_landscape.md`)

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


## Domain (`02_domain.md`)

- S1 https://en.wikipedia.org/wiki/Classes_of_supply — 2026-10-09 — Class I–X list; NATO I–V note (tertiary)
- S2 https://www.globalsecurity.org/military/intro/supclass.htm — 2026-10-09 — classes and subclasses
- S3 https://en.wikipedia.org/wiki/Army_Service_Corps_(India) — 2026-10-09 — ASC role (tertiary)
- S4 https://en.wikipedia.org/wiki/Army_Ordnance_Corps_(India) — 2026-10-09 — AOC role (tertiary)
- S5 https://mikelimadba.substack.com/p/days-of-supply-dos-versus-required — 2026-10-09 — quotes DoD "one day's supply" definition (secondary)
- S6 https://racklify.com/encyclopedia/what-is-days-of-supply-formula-example-and-how-to-calculate-it/ — 2026-10-09 — DOS formula (generic)
- S7 https://www.cdcr.ca.gov/operations-manual/dom/chapter-2-fiscal-management/article-12-materials-management/22030-10-5-setting-levels/ — 2026-10-09 — stock objective = safety + order/ship + operating levels (civil, illustrative)
- S8 https://gao.gov/assets/nsiad-91-58.pdf — 2026-10-09 — GAO on Army stockage; text not verified
- S9 https://www.theweek.in/theweek/current/2020/08/13/winter-is-coming.html — 2026-10-09 — AWS tonnage, trucks/day, air bridge, costs
- S10 https://theprint.in/defence/with-winter-coming-heres-what-it-takes-to-keep-the-army-marching-in-eastern-ladakh/2276228/ — 2026-10-09 — 2024 stocking, −50 °C, 15 Nov, weekly air fresh supply
- S11 https://indiainfrahub.com/featured/strategic-zojila-pass-opens-to-traffic-after-snow-clearance-by-bro/ ; https://www.deccanherald.com/amp/story/india%2Fsrinagar-leh-national-highway-reopened-in-record-time-1200741.html — 2026-10-09 — closure averages 135 days; recent 32–68 days
- S12 https://theprint.in/defence/heres-how-army-is-getting-30000-additional-troops-winter-ready-in-ladakh/464301/ — 2026-10-09 — 2020 ration and kerosene tonnage, 2.5 kg/day
- S13 https://aviation-defence-universe.com/calorie-intake-of-soldiers-posted-at-siachen — 2026-10-09 — altitude ration bands, kcal figures (reports govt reply)
- S14 https://publications.drdo.gov.in/ojs/index.php/dsj/article/view/1701 — 2026-10-09 — DRDO ration-scale study
- S15 https://www.tribuneindia.com/news/defence/as-army-gets-advanced-fuel-storage-facility-in-kargil-logistics-challenge-in-high-altitude-comes-in-focus/amp — 2026-10-09 — FOL storage challenges
- S16 https://publications.drdo.gov.in/ojs/index.php/dsj/article/view/6084 — 2026-10-09 — cold injury and hypoxia incidence (1981–84)
- S17 https://www.cag.gov.in/uploads/PressRelease/PR-Press-Brief-Report-no-16-05f19941ebcdbc7-81616480.pdf ; https://www.thequint.com/news/india/soldiers-deprived-of-snow-glasses-boots-requisite-food — 2026-10-09 — CAG 2020 findings
- S18 https://www.tribuneindia.com/news/defence/armys-mono-rail-to-the-rescue-at-16000-ft-extreme-weather-and-tough-terrain-no-hurdle-for-delivery-of-essential-supplies-to-lac-posts — 2026-10-09 — last mile, posts cut off for weeks
- S19 https://www.thedefensepost.com/2024/01/23/indian-army-logistics-drones/ — 2026-10-09 — 563 logistics drones
- S20 https://www.indiandefensenews.in/2026/01/indian-army-launches-digital-platform.html ; https://ssbcrackexams.com/indian-army-launches-digital-logistics-platform-dime-for-enhanced-operational-efficiency/ — 2026-10-09 — DIME launch, Jan 2026 (secondary)


## Methods (`03_methods.md`)

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


## Data sources and IoT (`04_data_sources.md`)

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

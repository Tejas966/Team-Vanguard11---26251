# 02 — Domain basics: forward supply in high-altitude terrain

*Public-level sources only. Accessed 2026-10-09. Confidence tags: [H] high, [M] medium, [L] low. Source numbers like [S3] point to the Sources list at the end.*

## 1. Supply classes

US Army/NATO practice groups materiel into ten classes [S1, S2; H]:

| Class | Content |
|---|---|
| I | Rations and water |
| II | Clothing and individual equipment, tools |
| III | POL: petroleum, oil, lubricants (fuel, kerosene, coolants) |
| IV | Construction and fortification material |
| V | Ammunition |
| VI | Personal-demand items |
| VII | Major end items (vehicles, launchers) |
| VIII | Medical materiel |
| IX | Repair parts and spares |
| X | Non-military support material |

Wikipedia states that NATO uses only Classes I–V as a common nomenclature under a STANAG [S1; M]. The NATO handbook page we tried returned 404, so **I could not verify this against NATO text**.

**Indian equivalents.** We found no official public document that maps Indian categories to Class I–X. Open descriptions suggest this rough split:
- **ASC (Army Service Corps)** handles rations, FOL (fuel, oil, lubricants), hygiene items, second-line transport, animal transport and air-drop loading [S3; M].
- **AOC (Army Ordnance Corps)** handles clothing, equipment, weapons, vehicles, spares and ammunition. In other words it covers "all munitions except fuel, fodder and medicines" [S4; M].
- Medical stores sit with the medical services, which we did not verify.

So, approximately, I+III fall under ASC and II/V/VII/IX under AOC. This is our own mapping, not doctrine.

## 2. Days of supply (DOS)

- **Definition.** The older DoD dictionary defined "one day's supply" as a standard quantity for estimating average daily expenditure under stated conditions. It can also be a factor, e.g. rounds per weapon per day [S5; M, secondary quote].
- **Formula.** `DOS = on-hand quantity ÷ expected daily consumption`. This is standard inventory practice [S6; H].
- **Stockage objective.** It is expressed in days and built from three parts: **operating level + order-and-ship time + safety level** [S6, S7; M].
- **Example.** A GAO report on Army supply is summarised as giving divisions a 14-day operating level, a 5-day safety level and order-ship time for repair parts [S8; L]. The PDF would not render for us, so **I could not verify the exact text**.
- **Not checked.** We could not open FM 4-0 or ATP 4-0.1 directly to confirm their wording.

For winter-isolated posts, the "order-and-ship time" is in effect the whole closure period. The stock objective therefore becomes roughly 180 days plus a safety margin (see §3).

## 3. Advance Winter Stocking (AWS)

- **Road window.** Passes into the high-altitude northern sector are closed in winter, so the road window runs roughly April–September [S9, S10; H].
- **Closure length.** Historically one key pass averaged about 135 days closed. Recent BRO snow clearance has cut that to roughly 32–68 days in some years [S11; M]. Sources therefore disagree on how long roads stay shut: "six months" is the planning figure, but actual closures have recently been shorter.
- **Tonnage.** About 2 lakh (200,000) tonnes are stocked each year. Normal flow is about 100 trucks a day, rising to about 400 trucks (around 4,000 t/day) in a surge [S9; M]. An earlier report called this the largest annual winter-stocking exercise [S9; M].
- **What is stocked.** More than 80 items, including kerosene, diesel, petrol, rations, medical stores and clothing [S9; M].
- **2020 surge (+30,000 troops for six months).** Planning figures were about 13,500 t of basic rations plus 6,500 t of special high-altitude rations, about 15,000 kL of kerosene and about 2.5 kg of rations per soldier per day [S12; M].
  - Our derived figure: kerosene works out to about **2.8 L per soldier per day**. One search summary computed 0.5 L, which is arithmetically wrong.
- **One division, 2024.** Fuel stock was under 20 million L for six months. The winter season is declared on 15 November. Temperatures fall below −50 °C. Fresh vegetables and meat are still flown in weekly. Stocking was about 60% complete by mid-September [S10; M].
- **Air bridge.** It is the only link while roads are closed. Aircraft must leave before noon because heat and thin air reduce engine performance. Airlift is about 200–250 t/day, against road surge capacity of up to 4,000 t/day [S9; M].
- **Cost.** One road trip by a 10-tonne truck costs about ₹1 lakh. Strategic airlift costs about ₹24 lakh per flying hour [S9; L–M].

## 4. Consumption drivers

| Driver | Public evidence | Confidence |
|---|---|---|
| Troop strength | Rations scale linearly per head (about 2.5 kg/person/day in high-altitude planning) [S12] | M |
| Altitude | Ration scales step up at <9,000 ft, 9,000–12,000 ft and >12,000 ft [S13] | M |
| Altitude and energy | Energy expenditure above 12,000 ft is about 4,270 ± 550 kcal/day against a ration of about 5,350 kcal. Basal metabolic rate rises 7–21% [S13] | M |
| Measured intake | About 3,900 kcal/person/day at high altitude in a DRDO study [S14] | M |
| Cold | Kerosene for bukhari heaters dominates POL in winter [S12, S10]. We found no public temperature-to-litres curve | Relationship H, magnitude **assumed** |
| Activity / tempo | No public Indian figures. Doctrine treats ammunition as a tempo-dependent rate (rounds/weapon/day) [S5] | **Assumed** |
| Vehicle movement | Diesel and petrol are stocked for vehicles and generators [S9, S15]. No public per-km figures | **Assumed** |
| Medical | In 1981–84 forward hospitals admitted about 247 cold-injury and 171 hypoxia cases a year. Chilblains made up 85.8% of cold injuries and HAPE 76.2% of hypoxia cases [S16]. Frostbite remains a concern [S16] | M (old data) |

**Substitution risk.** CAG (2020) found that substitute items issued on a "cost-to-cost" basis reduced calorie intake, by as much as 82% in reports. It also found snow-goggle shortages of 62–98% in 2015–18 [S17; H for the facts as reported].

## 5. Typical failure modes

1. **Seasonal road closure** from snow on passes, plus avalanches and drifts of 30–40 ft [S11; H].
2. **Landslides and route cuts** that leave posts isolated "for weeks". Mules and porters struggle on these routes [S18; M].
3. **Air-maintenance constraints:** weather, flying only in the morning, and limited payload [S9; M].
4. **Convoy throughput ceiling:** about 100–400 trucks/day in a 6-month window [S9; M].
5. **Single-route dependency.** Two road axes, both snowbound in winter [S12; M]. New tunnels are expected to roughly halve the stocking period [S10; M].
6. **Last-mile carriage.** Animal transport, porters, a monorail carrying 300 kg per run, and logistics drones (563 ordered) [S18, S19; M].
7. **Procurement and surge shocks:** extra deployments strained procurement as well as transport [S15; M]. CAG recorded procurement delays of up to four years [S17; H].
8. **Data latency and manual reporting.** DIME was launched in January 2026 to give "near real-time" visibility. It promises about 70% less paperwork and a cycle time about one-third shorter, which implies that today's workflow is paper-heavy [S20; M, secondary reporting; we did not find the PIB original].

## 6. What this means for our model

Tag key: **S** = sourced, **A** = assumed.

**Variables the synthetic generator must include:**
- `post_id`, `altitude_band` (<9k / 9–12k / >12k ft). **S** [S13]
- `troop_strength`. **S** (linear ration driver) [S12]
- `temp_min_c`, `snowfall`, `wind`. **A** (seasonal curve, down to about −40/−50 °C) [S9, S10]
- `road_status` (open/closed per route segment), with a seasonal closure window plus random landslide or avalanche outages. Seasonality is **S**; outage rates are **A**.
- `air_sortie_available` (weather-gated), with capacity much lower than road. **S** (ratio) [S9]
- `activity_level` (routine / patrol / surge). **A**
- `vehicle_km`, `generator_hours`. **A**
- Stock on hand per class (I, III-kerosene, III-diesel, V, VIII, IX), from which we compute `DOS`. **S** (method)
- `report_lag_days` (data latency). **A**, motivated by [S20]

**Relationships we treat as plausible:**
- Class I demand = strength × kg/person/day × altitude multiplier. **S** in form; the multiplier is **A**.
- Kerosene demand rises as temperature falls, using a heating-degree-day style formula with a floor at zero above about 10 °C. Direction is **S**; shape is **A**.
- Class VIII demand rises with cold exposure and altitude, especially for new arrivals before acclimatisation. **S** in direction [S16]; magnitude is **A**.
- Class V and IX rise with tempo and vehicle-km. **A**.
- Resupply = road capacity when open, otherwise air capacity × probability of good weather. **S** in structure; probabilities are **A**.
- Stock objective in winter = expected closure days × daily consumption + safety level. **S** in structure [S6, S7]; safety days are **A**.
- Location naming: only synthetic IDs and generic regions (e.g. "high-altitude northern sector"). No real units or posts.

## Sources

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

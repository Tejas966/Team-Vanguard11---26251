/* Synthetic demo data. Every post, depot, route and number here is fictional.
   Consumption anchors: ~2.5 kg rations / person / day (ThePrint 2020), ration scale
   rising with altitude band (CAG). Everything else is a team assumption. */
window.FSI = window.FSI || {};

FSI.ITEMS = {
  F: { name: 'POL · SKO (kerosene)', short: 'SKO', unit: 'L', cv: 0.15, kg: 0.8 },
  R: { name: 'Rations', short: 'Rations', unit: 'kg', cv: 0.08, kg: 1 },
  M: { name: 'Medical stores', short: 'Medical', unit: 'kits', cv: 0.5, kg: 4 },
  S: { name: 'MT spares', short: 'MT spares', unit: 'units', cv: 0.6, kg: 6 },
};

// net: position in the network diagram; map: position on the schematic sector map
FSI.NODES = [
  { id: 'DA', code: 'DPA', name: 'Depot-A', role: 'Rear supply depot (ASC / AOC)', type: 'depot', parent: null, L: 4, tr: 2,
    route: 'Railhead (off-map)', stockDays: 20, qtyDays: 14, net: { x: 30, y: 195 }, map: { x: 60, y: 400 } },
  { id: 'DB', code: 'DPB', name: 'Depot-B', role: 'Forward supply depot', type: 'depot', parent: 'DA', L: 3, tr: 2,
    route: 'Route-1 via Pass-1', stockDays: 5, qtyDays: 10, labelLeft: true, net: { x: 300, y: 110 }, map: { x: 390, y: 175 },
    alt: { route: 'Route-2 via Pass-2', L: 5, cap: 0.6 } },
  { id: 'TH', code: 'HT1', name: 'Transit Camp T-1', role: 'Transit camp', type: 'depot', parent: 'DA', L: 2, tr: 1,
    route: 'Valley road', stockDays: 6, qtyDays: 10, net: { x: 300, y: 330 }, map: { x: 300, y: 355 } },
  { id: 'P1', cell: 'W1', code: 'KES', name: 'Post Kestrel', role: 'Forward post', type: 'post', parent: 'DB', L: 3, tr: 1,
    troops: 120, alt: 15200, prio: 2, stock: { F: 5, R: 7, M: 9, S: 12 }, qtyDays: 10,
    net: { x: 610, y: 18 }, map: { x: 560, y: 80 } },
  { id: 'P2', cell: 'W1', code: 'FAL', name: 'Post Falcon', role: 'Forward post', type: 'post', parent: 'DB', L: 5, tr: 2,
    lastMile: 'porter / animal transport', troops: 80, alt: 16100, prio: 3, stock: { F: 6, R: 8, M: 5, S: 9 }, qtyDays: 10,
    net: { x: 610, y: 96 }, map: { x: 520, y: 190 } },
  { id: 'P3', cell: 'W3', code: 'HER', name: 'Post Heron', role: 'Forward post', type: 'post', parent: 'DB', L: 4, tr: 1,
    troops: 100, alt: 14800, prio: 2, stock: { F: 9, R: 10, M: 12, S: 14 }, qtyDays: 10,
    net: { x: 610, y: 174 }, map: { x: 560, y: 280 } },
  { id: 'P4', cell: 'W3', code: 'OSP', name: 'Post Osprey', role: 'Forward post', type: 'post', parent: 'DB', L: 6, tr: 2,
    lastMile: 'porter / animal transport', troops: 60, alt: 17400, prio: 3, stock: { F: 7, R: 9, M: 8, S: 6 }, qtyDays: 10,
    net: { x: 610, y: 252 }, map: { x: 300, y: 70 } },
  { id: 'P5', cell: 'W2', code: 'KIT', name: 'Post Kite', role: 'Valley post', type: 'post', parent: 'TH', L: 2, tr: 1,
    troops: 140, alt: 11200, prio: 1, stock: { F: 8, R: 9, M: 10, S: 11 }, qtyDays: 10,
    net: { x: 610, y: 330 }, map: { x: 430, y: 410 } },
  { id: 'P6', cell: 'W2', code: 'MER', name: 'Post Merlin', role: 'Valley post', type: 'post', parent: 'TH', L: 4, tr: 1,
    troops: 90, alt: 12600, prio: 1, stock: { F: 7, R: 6, M: 9, S: 8 }, qtyDays: 10,
    net: { x: 610, y: 408 }, map: { x: 600, y: 370 } },
];
FSI.LATERAL = [['P2', 'P3'], ['P5', 'P6']];
FSI.PASSES = { P1: { x: 250, y: 270, label: 'Pass-1' }, P2: { x: 180, y: 130, label: 'Pass-2' } };

FSI.CONFIG = {
  horizon: 14,          // days
  z90: 1.2816,          // 90% one-sided, used for "conservative" stock-out day
  airGo: 0.65,          // chance a winter airlift day is flyable (assumption)
  sortieKg: 2000,       // kg per sortie (assumption)
  airRate: 200,         // ₹ per kg by air (illustrative)
  cost: { reroute: 1.5, sortie: 4.0, transfer: 0.4, expedite: 0.6 }, // ₹ lakh, illustrative
  costRef: 10,          // ₹ lakh: fixed cost scale used in plan scores
  airSorties: 2,        // air maintenance sorties available per plan (assumption)
  winter: { p10: 31, median: 38, p90: 47 }, // days until Pass-1 closes (illustrative)
  truckT: 5,            // tonnes per truckload
  loadsPerDay: 1.6,     // Pass-1 convoy capacity before closure (assumption)
  // report age (hours) -> extra stock uncertainty (fraction of stock)
  fresh: [{ h: 24, sd: 0 }, { h: 72, sd: 0.08 }, { h: Infinity, sd: 0.2 }],
};

// Weather-driven POL rule: SKO litres per person per day = 1.0 + 0.09 x max(0, 8 - Tmin at post),
// capped at 3.6; Tmin at post = cell Tmin - 6.5 C per km of extra altitude. Anchored so that
// about -12 C gives ~2.8 L (derived from ThePrint 2020: 15,000 kL / 30,000 troops / 180 days).
FSI.POL_RULE = { base: 1.0, slope: 0.09, ref: 8, cap: 3.6, lapse: 6.5 };
// A day is flyable for air maintenance if snowfall < 1 cm, precipitation < 2 mm and max wind < 40 km/h (our rule).
FSI.FLY_RULE = { snow: 1, prcp: 2, wind: 40 };

// Last report per post, in hours before "now", and the channel it came by
FSI.REPORTS = {
  P1: { ageH: 3,  via: 'sensor' }, P2: { ageH: 9,  via: 'SITREP' }, P3: { ageH: 5, via: 'sensor' },
  P4: { ageH: 80, via: 'SITREP' }, P5: { ageH: 2,  via: 'sensor' }, P6: { ageH: 30, via: 'SITREP' },
};

// Sample low-bandwidth messages for the SITREP inbox (format: SITREP <CODE> <DDHHMM> <item><qty> ... [STR<n>])
FSI.SAMPLE_SITREPS = [
  'SITREP OSP {DTG} F1200 R1500 M8 S9 STR60',
  'SITREP FAL {DTG} F2900 R1900 M7 STR82',
  'SITREP HER {DTG} F600 R2900',
  'SITREP XYZ {DTG} F100',
];

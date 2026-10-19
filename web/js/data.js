/* Synthetic demo data. Every post, depot, route and number here is fictional.
   Consumption anchors: ~2.5 kg rations / person / day (ThePrint 2020), ration scale
   rising with altitude band (CAG). Everything else is a team assumption. */
window.FSI = window.FSI || {};

FSI.ITEMS = {
  F: { name: 'Heating fuel',   unit: 'L',     cv: 0.15, kg: 0.85 },
  R: { name: 'Rations',        unit: 'kg',    cv: 0.08, kg: 1 },
  M: { name: 'Medical kits',   unit: 'kits',  cv: 0.5,  kg: 4 },
  S: { name: 'Vehicle spares', unit: 'units', cv: 0.6,  kg: 6 },
};

// net: position in the network diagram; map: position on the schematic sector map
FSI.NODES = [
  { id: 'DA', code: 'DPA', name: 'Depot-A', role: 'Rear base depot', type: 'depot', parent: null, L: 4, tr: 2,
    route: 'Railhead (off-map)', stockDays: 20, qtyDays: 14, net: { x: 30, y: 195 }, map: { x: 70, y: 390 } },
  { id: 'DB', code: 'DPB', name: 'Depot-B', role: 'Forward depot', type: 'depot', parent: 'DA', L: 3, tr: 2,
    route: 'Route-1 via Pass-1', stockDays: 5, qtyDays: 10, net: { x: 300, y: 110 }, map: { x: 420, y: 165 },
    alt: { route: 'Route-2 via Pass-2', L: 5, cap: 0.6 } },
  { id: 'TH', code: 'HT1', name: 'Hub T-1', role: 'Transit hub', type: 'depot', parent: 'DA', L: 2, tr: 1,
    route: 'Valley road', stockDays: 6, qtyDays: 10, net: { x: 300, y: 330 }, map: { x: 330, y: 345 } },
  { id: 'P1', code: 'KES', name: 'Post Kestrel', role: 'Forward post', type: 'post', parent: 'DB', L: 3, tr: 1,
    troops: 120, alt: 15200, prio: 2, stock: { F: 5, R: 7, M: 9, S: 12 }, qtyDays: 10,
    net: { x: 610, y: 18 }, map: { x: 555, y: 85 } },
  { id: 'P2', code: 'FAL', name: 'Post Falcon', role: 'Forward post', type: 'post', parent: 'DB', L: 5, tr: 2,
    troops: 80, alt: 16100, prio: 3, stock: { F: 6, R: 8, M: 5, S: 9 }, qtyDays: 10,
    net: { x: 610, y: 96 }, map: { x: 625, y: 165 } },
  { id: 'P3', code: 'HER', name: 'Post Heron', role: 'Forward post', type: 'post', parent: 'DB', L: 4, tr: 1,
    troops: 100, alt: 14800, prio: 2, stock: { F: 9, R: 10, M: 12, S: 14 }, qtyDays: 10,
    net: { x: 610, y: 174 }, map: { x: 565, y: 245 } },
  { id: 'P4', code: 'OSP', name: 'Post Osprey', role: 'Forward post', type: 'post', parent: 'DB', L: 6, tr: 2,
    troops: 60, alt: 17400, prio: 3, stock: { F: 7, R: 9, M: 8, S: 6 }, qtyDays: 10,
    net: { x: 610, y: 252 }, map: { x: 440, y: 50 } },
  { id: 'P5', code: 'KIT', name: 'Post Kite', role: 'Valley post', type: 'post', parent: 'TH', L: 2, tr: 1,
    troops: 140, alt: 11200, prio: 1, stock: { F: 8, R: 9, M: 10, S: 11 }, qtyDays: 10,
    net: { x: 610, y: 330 }, map: { x: 480, y: 340 } },
  { id: 'P6', code: 'MER', name: 'Post Merlin', role: 'Valley post', type: 'post', parent: 'TH', L: 4, tr: 1,
    troops: 90, alt: 12600, prio: 1, stock: { F: 7, R: 6, M: 9, S: 8 }, qtyDays: 10,
    net: { x: 610, y: 408 }, map: { x: 610, y: 380 } },
];
FSI.LATERAL = [['P2', 'P3'], ['P5', 'P6']];
FSI.PASSES = { P1: { x: 300, y: 250, label: 'Pass-1' }, P2: { x: 210, y: 110, label: 'Pass-2' } };

FSI.CONFIG = {
  horizon: 14,          // days
  z90: 1.2816,          // 90% one-sided, used for "conservative" stock-out day
  airGo: 0.65,          // chance a winter airlift day is flyable (assumption)
  sortieKg: 2000,       // kg per sortie (assumption)
  airRate: 200,         // ₹ per kg by air (illustrative)
  cost: { reroute: 1.5, sortie: 4.0, transfer: 0.4, expedite: 0.6 }, // ₹ lakh, illustrative
  winter: { p10: 31, median: 38, p90: 47 }, // days until Pass-1 closes (illustrative)
  truckT: 5,            // tonnes per truckload
  loadsPerDay: 1.6,     // Pass-1 convoy capacity before closure (assumption)
  // report age (hours) -> extra stock uncertainty (fraction of stock)
  fresh: [{ h: 24, sd: 0 }, { h: 72, sd: 0.08 }, { h: Infinity, sd: 0.2 }],
};

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

// De soorten van de kennisbank Topografie (plan T1 par. 1.4; bouwplan T2b-2 fase 6.1). Met de hand bijgehouden.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
// Per soort: de groep, de geometrie (vlak, lijn, punt of geen) en wat aanwijzen betekent.
// "geen" is voor een label-item zonder officiele grens (besluit A2): alleen benoemen en relaties, geen aanwijzen.

export var SOORTEN = [
  { id: "land", groep: "bestuurlijk", geometrie: "vlak", aanwijzen: "het vlak (bij kleine landen: het vlak of zijn cirkel)" },
  { id: "gebied", groep: "bestuurlijk", geometrie: "vlak", aanwijzen: "het vlak" },
  { id: "bijzonder-gebied", groep: "bestuurlijk", geometrie: "vlak", aanwijzen: "het vlak" },
  { id: "gewest", groep: "bestuurlijk", geometrie: "vlak", aanwijzen: "het vlak" },
  { id: "gemeenschap", groep: "bestuurlijk", geometrie: "geen", aanwijzen: "geen (een gemeenschap heeft geen eigen vlak)" },
  { id: "taalgebied", groep: "bestuurlijk", geometrie: "vlak", aanwijzen: "het vlak" },
  { id: "provincie", groep: "bestuurlijk", geometrie: "vlak", aanwijzen: "het vlak" },
  { id: "district", groep: "bestuurlijk", geometrie: "vlak", aanwijzen: "het vlak" },
  { id: "gemeente", groep: "bestuurlijk", geometrie: "vlak", aanwijzen: "het vlak" },
  { id: "stad", groep: "plaatsen", geometrie: "punt", aanwijzen: "het punt (tikvlak minstens 44 px)" },
  { id: "agglomeratie", groep: "plaatsen", geometrie: "punt", aanwijzen: "het punt" },
  { id: "oceaan", groep: "water", geometrie: "vlak", aanwijzen: "het vlak" },
  { id: "zee", groep: "water", geometrie: "vlak", aanwijzen: "het vlak" },
  { id: "baai", groep: "water", geometrie: "vlak", aanwijzen: "het vlak" },
  { id: "zeestraat", groep: "water", geometrie: "vlak", aanwijzen: "het vlak" },
  { id: "meer", groep: "water", geometrie: "vlak", aanwijzen: "het vlak" },
  { id: "zeearm", groep: "water", geometrie: "vlak", aanwijzen: "het vlak" },
  { id: "rivier", groep: "water", geometrie: "lijn", aanwijzen: "de tikstrook langs de lijn" },
  { id: "riviertak", groep: "water", geometrie: "lijn", aanwijzen: "de tikstrook langs de lijn" },
  { id: "kanaal", groep: "water", geometrie: "lijn", aanwijzen: "de tikstrook langs de lijn" },
  { id: "werelddeel", groep: "land", geometrie: "vlak", aanwijzen: "het vlak" },
  { id: "regio", groep: "land", geometrie: "vlak", aanwijzen: "het vlak" },
  { id: "streek", groep: "land", geometrie: "vlak", aanwijzen: "het vlak; zonder officiele grens een label-item zonder geometrie (A2)" },
  { id: "eiland", groep: "land", geometrie: "vlak", aanwijzen: "het vlak" },
  { id: "eilandengroep", groep: "land", geometrie: "vlak", aanwijzen: "het vlak" },
  { id: "schiereiland", groep: "land", geometrie: "vlak", aanwijzen: "het vlak" },
  { id: "gebergte", groep: "land", geometrie: "vlak", aanwijzen: "het vlak" },
  { id: "laagland", groep: "land", geometrie: "vlak", aanwijzen: "het vlak" },
  { id: "hoogland", groep: "land", geometrie: "vlak", aanwijzen: "het vlak" },
  { id: "woestijn", groep: "land", geometrie: "vlak", aanwijzen: "het vlak" },
  { id: "natuurgebied", groep: "land", geometrie: "vlak", aanwijzen: "het vlak" },
  { id: "bergtop", groep: "punten", geometrie: "punt", aanwijzen: "het punt" },
  { id: "vulkaan", groep: "punten", geometrie: "punt", aanwijzen: "het punt" },
  { id: "waterval", groep: "punten", geometrie: "punt", aanwijzen: "het punt" },
  { id: "riviermonding", groep: "punten", geometrie: "punt", aanwijzen: "het punt" },
  { id: "grenspunt", groep: "punten", geometrie: "punt", aanwijzen: "het punt" },
  { id: "kaartlijn", groep: "kaartlezen", geometrie: "lijn", aanwijzen: "de tikstrook (berekende lijn)" },
  { id: "halfrond", groep: "kaartlezen", geometrie: "vlak", aanwijzen: "het vlak (berekend)" }
];

export var SOORT_PER_ID = {};
SOORTEN.forEach(function(s) { SOORT_PER_ID[s.id] = s; });

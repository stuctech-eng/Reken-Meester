// Tikregel voor de kaartproef T2a (plan TO fase T2, v1.1, §4). Zuivere functies, geen DOM.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Alle maten in CSS-pixels op de weergegeven kaart: schaal = CSS-pixels per viewBox-eenheid.
// De pixelratio speelt geen rol.

export var TIKMAAT = 44;            // tikcirkel en tikstrook: 44 CSS-pixels
export var STRAAL = TIKMAAT / 2;    // 22 CSS-pixels
export var MARGE = 4;               // verschil in afstand dat beslist (CSS-pixels)
var CIRKEL_OPP = Math.PI * STRAAL * STRAAL;

// Pad "M x,y l dx,dy dx,dy Z M ..." naar ringen of lijnen in viewBox-eenheden
export function leesPad(d) {
  var uit = [], huidig = null, m, re = /([MlZ])([^MlZ]*)/g;
  while ((m = re.exec(d))) {
    var cmd = m[1], getallen = m[2].trim() ? m[2].trim().split(/[ ,]+/).map(Number) : [];
    if (cmd === "M") { huidig = [[getallen[0], getallen[1]]]; uit.push(huidig); }
    else if (cmd === "l") {
      for (var i = 0; i < getallen.length; i += 2) { var v = huidig[huidig.length - 1]; huidig.push([v[0] + getallen[i], v[1] + getallen[i + 1]]); }
    } else if (cmd === "Z") huidig.push([huidig[0][0], huidig[0][1]]);
  }
  return uit;
}

// Doelen van een laag voorbereiden (eenmalig per kaart en laag)
export function maakDoelen(laag) {
  return laag.items.map(function(it) {
    if (laag.soort === "punt") return { id: it.id, naam: it.naam, soort: "punt", x: it.x, y: it.y };
    return { id: it.id, naam: it.naam, soort: laag.soort, ringen: leesPad(it.d), opp: it.opp || 0, mx: it.mx, my: it.my, ir: it.ir || 0 };
  });
}

function binnenRing(px, py, r) {
  var c = false;
  for (var i = 0, j = r.length - 1; i < r.length; j = i++) {
    var a = r[i], b = r[j];
    if ((a[1] > py) !== (b[1] > py) && px < (b[0] - a[0]) * (py - a[1]) / (b[1] - a[1]) + a[0]) c = !c;
  }
  return c;
}
function afstandLijnstuk(px, py, a, b) {
  var dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy;
  var t = l ? Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / l)) : 0;
  var x = a[0] + t * dx - px, y = a[1] + t * dy - py;
  return Math.sqrt(x * x + y * y);
}
function afstandRingen(px, py, ringen) {
  var m = Infinity;
  for (var k = 0; k < ringen.length; k++) { var r = ringen[k]; for (var i = 0; i < r.length - 1; i++) { var d = afstandLijnstuk(px, py, r[i], r[i + 1]); if (d < m) m = d; } }
  return m;
}

// Past er op deze schaal geen cirkel van 44 px in het vlak zelf (grootste ingeschreven cirkel, vooraf berekend)?
// Dan krijgt het een zichtbare tikcirkel op het middelpunt van die ingeschreven cirkel (mx, my).
export function isKlein(doel, schaal) { return doel.soort === "vlak" && doel.ir * schaal < STRAAL; }

// Beoordeel één doel voor een tik op (x, y) in CSS-pixels. Geeft null als de tik buiten het tikgebied valt.
export function beoordeel(doel, schaal, x, y) {
  var ux = x / schaal, uy = y / schaal;
  if (doel.soort === "punt") {
    var dp = Math.sqrt(Math.pow(doel.x * schaal - x, 2) + Math.pow(doel.y * schaal - y, 2));
    return dp <= STRAAL ? { doel: doel, afstand: dp, opp: CIRKEL_OPP, binnen: true } : null;
  }
  if (doel.soort === "lijn") {
    var dl = afstandRingen(ux, uy, doel.ringen) * schaal;
    return dl <= STRAAL ? { doel: doel, afstand: dl, opp: Infinity, binnen: false } : null;
  }
  var teller = 0;
  for (var k = 0; k < doel.ringen.length; k++) if (binnenRing(ux, uy, doel.ringen[k])) teller++;
  var inVlak = teller % 2 === 1;
  var klein = isKlein(doel, schaal);
  var dm = Math.sqrt(Math.pow(doel.mx * schaal - x, 2) + Math.pow(doel.my * schaal - y, 2));
  var inCirkel = klein && dm <= STRAAL;
  if (!inVlak && !inCirkel) return null;
  var afstand = inVlak ? 0 : (doel.ringen.length ? afstandRingen(ux, uy, doel.ringen) * schaal : dm);
  return { doel: doel, afstand: afstand, opp: doel.opp * schaal * schaal + (klein ? CIRKEL_OPP : 0), binnen: true };
}

// De tikregel (§4): { uitkomst: "geen" } | { uitkomst: "gekozen", doel, regel } | { uitkomst: "twijfel", kandidaten }
export function beslis(doelen, schaal, x, y) {
  var k = [];
  for (var i = 0; i < doelen.length; i++) { var b = beoordeel(doelen[i], schaal, x, y); if (b) k.push(b); }
  if (!k.length) return { uitkomst: "geen", kandidaten: [] };
  if (k.length === 1) return { uitkomst: "gekozen", doel: k[0].doel, regel: "een", kandidaten: k };
  // 1. ingesloten doel wint: het kleinste doel (binnen eigen vlak of tikcirkel) dat minder dan de helft
  //    zo groot is als elke andere kandidaat
  var kleinste = null;
  k.forEach(function(c) { if (c.binnen && (!kleinste || c.opp < kleinste.opp)) kleinste = c; });
  if (kleinste && k.every(function(c) { return c === kleinste || kleinste.opp < c.opp / 2; })) return { uitkomst: "gekozen", doel: kleinste.doel, regel: "ingesloten", kandidaten: k };
  // 2. de kleinste afstand, als het verschil met de tweede groter is dan de marge
  var s = k.slice().sort(function(a, b) { return a.afstand - b.afstand || (a.doel.id < b.doel.id ? -1 : 1); });
  if (s[1].afstand - s[0].afstand > MARGE) return { uitkomst: "gekozen", doel: s[0].doel, regel: "afstand", kandidaten: s };
  // 3. onduidelijk: de keuzelijst met precies de kandidaten
  return { uitkomst: "twijfel", kandidaten: s };
}

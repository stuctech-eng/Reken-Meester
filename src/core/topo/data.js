// Topografie in de app: de kennisbank en de kaarten, pas geladen als je een modus van Topografie opent (plan T3 par. 3.1).
// Dit bestand en alles wat het importeert staat nooit in de standaardbundel van rekenen en wiskunde (test: tools/topo/test-bundel.mjs).
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Identiteit (plan T3 par. 3.2): de kennisbank-id is de identiteit van een gebied. naamVan(id) geeft de voorkeursnaam uit de
// kennisbank, nooit uit de kaart. Een kaart wordt gekoppeld via zetKaart(id, kaartbestand); de doelen per laag krijgen hun naam
// uit naamVan.

import { LANDEN } from "./items/landen.js";
import { STEDEN } from "./items/steden-nl.js";
import { PROVINCIES } from "./items/provincies.js";
import { GEWESTEN } from "./items/gewesten.js";
import { STEDEN_BE } from "./items/steden-be.js";
import { WATER_NLBE } from "./items/water-nlbe.js";
import { EILANDEN_NL } from "./items/eilanden-nl.js";
import { pakUit } from "./kaart/bogen.js";
import { maakDoelen } from "./kaart/tikregel.js";
import { ringDelen } from "./kaart/beeld.js";
import { maakWijsAan } from "./sjablonen/wijs-aan.js";

var KB = {};
[LANDEN, STEDEN, PROVINCIES, GEWESTEN, STEDEN_BE, WATER_NLBE, EILANDEN_NL].forEach(function(lijst) {
  lijst.forEach(function(it) { if (it && it.id && it.naam) KB[it.id] = it; });
});

export function item(id) { return KB[id] || null; }

export function naamVan(id) {
  var it = KB[id];
  if (!it || !it.naam || !it.naam.waarde) throw new Error("onbekend gebied in de kennisbank: " + id);
  return it.naam.waarde;
}

var KAARTEN = {};

// Een kaart klaarzetten: uitpakken (bogen), per item de ringen met oppervlakte (voor de rand), per laag de doelen met naam
export function zetKaart(id, bestand) {
  if (KAARTEN[id]) return KAARTEN[id];
  var k = pakUit(bestand);
  var lagen = k.lagen.map(function(l) {
    var items = l.items.map(function(it) { var n = {}; for (var s in it) n[s] = it[s]; n.naam = naamVan(it.id); if (it.d) n.delen = ringDelen(it.d); return n; });
    var laag = { id: l.id, soort: l.soort, bron: l.bron, items: items };
    laag.doelen = maakDoelen(laag);
    return laag;
  });
  KAARTEN[id] = {
    id: k.id, breedte: k.breedte, hoogte: k.hoogte,
    achtergrond: k.achtergrond.map(function(a) { return { id: a.id, d: a.d, delen: ringDelen(a.d) }; }),
    lagen: lagen,
  };
  return KAARTEN[id];
}

export function kaart(id) {
  if (!KAARTEN[id]) throw new Error("kaart niet geladen: " + id);
  return KAARTEN[id];
}

export function laag(kaartId, laagId) {
  var l = kaart(kaartId).lagen.filter(function(x) { return x.id === laagId; })[0];
  if (!l) throw new Error("onbekende laag " + laagId + " op de kaart " + kaartId);
  return l;
}

// De omhullende (viewBox-eenheden) van een reeks gebieden van een laag: [x0, y0, x1, y1]; het beginbeeld van een vraag
var OMHULLING = {};
export function omhulling(kaartId, laagId, ids) {
  var sleutel = kaartId + "/" + laagId + "/" + ids.join(",");
  if (OMHULLING[sleutel]) return OMHULLING[sleutel];
  var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, wel = {};
  ids.forEach(function(id) { wel[id] = 1; });
  laag(kaartId, laagId).doelen.forEach(function(d) {
    if (!wel[d.id]) return;
    var pts = d.soort === "punt" ? [[d.x, d.y]] : [].concat.apply([], d.ringen);
    pts.forEach(function(p) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; });
  });
  OMHULLING[sleutel] = [x0, y0, x1, y1];
  return OMHULLING[sleutel];
}

// S2 wijs-aan (plan T3 par. 3.4)
export var wijsAan = maakWijsAan({ laag: laag, naamVan: naamVan, omhulling: omhulling });

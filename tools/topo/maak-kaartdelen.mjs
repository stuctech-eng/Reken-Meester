// Splitst een kaart met gedeelde bogen in een basis en delen (plan T5c par. 3.3; de indeling in src/core/topo/kaartdelen.js).
// Alleen bouwomgeving. De volledige kaart (src/core/topo/kaarten/<id>.js) blijft de uitvoer van maak-kaarten.mjs en de invoer van
// de tests en de proefpagina; de app laadt alleen de delen.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik (vanuit de hoofdmap van de repo): node tools/topo/maak-kaartdelen.mjs [uitmap]   (standaard: src/core/topo/kaarten)
// - de basis: alles van de kaart, behalve de vormen van de lagen van een deel; van die lagen alleen de id's van de items (de
//   inhoud), met het deel erbij; de bogen van de achtergrond en van de lagen van de basis, in de volgorde van de kaart;
// - een deel: de lagen van het deel en de bogen die alleen die lagen gebruiken (in de volgorde van de kaart). Een boognummer
//   kleiner dan het aantal bogen van de basis wijst naar de basis; de andere naar het deel zelf (min dat aantal). Een boog die twee
//   delen gebruiken, staat in beide;
// - uitgepakt geeft elk deel precies de lagen van de volledige kaart (test: tools/topo/test-kaartdelen.mjs); twee keer draaien
//   geeft byte-gelijke bestanden.

import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { KAARTDELEN, deelVanLaag } from "../../src/core/topo/kaartdelen.js";

var HIER = path.dirname(fileURLToPath(import.meta.url));
var ROOT = path.resolve(HIER, "..", "..");

function fout(t) { throw new Error(t); }
function bogenVan(items, uit) { items.forEach(function(it) { (it.r || []).forEach(function(ring) { ring.forEach(function(a) { uit[a < 0 ? ~a : a] = 1; }); }); }); }
function nummers(set) { return Object.keys(set).map(Number).sort(function(a, b) { return a - b; }); }
function hernummer(items, nieuw) {
  return items.map(function(it) {
    var n = {};
    for (var k in it) n[k] = k === "r" ? it.r.map(function(ring) { return ring.map(function(a) { var b = a < 0 ? ~a : a, x = nieuw[b]; if (x === undefined) fout("boog zonder plaats: " + b); return a < 0 ? ~x : x; }); }) : it[k];
    return n;
  });
}

export function splits(K) {
  var indeling = KAARTDELEN[K.id] || fout("geen indeling voor de kaart " + K.id);
  var lagenIds = K.lagen.map(function(l) { return l.id; });
  Object.keys(indeling).forEach(function(d) { indeling[d].forEach(function(id) { if (lagenIds.indexOf(id) < 0) fout("deel " + d + ": geen laag " + id + " op de kaart " + K.id); }); });
  var inBasis = {};
  bogenVan(K.achtergrond, inBasis);
  K.lagen.forEach(function(l) { if (deelVanLaag(K.id, l.id) === "basis") bogenVan(l.items, inBasis); });
  var basisNrs = nummers(inBasis), basisNieuw = {};
  basisNrs.forEach(function(b, i) { basisNieuw[b] = i; });
  var basis = {};
  for (var k in K) {
    if (k === "bogen") basis.bogen = basisNrs.map(function(b) { return K.bogen[b]; });
    else if (k === "achtergrond") basis.achtergrond = hernummer(K.achtergrond, basisNieuw);
    else if (k === "lagen") basis.lagen = K.lagen.map(function(l) {
      var d = deelVanLaag(K.id, l.id);
      if (d === "basis") { var nl = {}; for (var m in l) nl[m] = m === "items" ? hernummer(l.items, basisNieuw) : l[m]; return nl; }
      return { id: l.id, soort: l.soort, bron: l.bron, deel: d, items: l.items.map(function(it) { return { id: it.id }; }) };
    });
    else basis[k] = K[k];
  }
  var delen = {};
  Object.keys(indeling).sort().forEach(function(d) {
    var lagen = K.lagen.filter(function(l) { return deelVanLaag(K.id, l.id) === d; }), eigen = {};
    lagen.forEach(function(l) { bogenVan(l.items, eigen); });
    var eigenNrs = nummers(eigen).filter(function(b) { return !inBasis[b]; }), nieuw = {};
    for (var b in basisNieuw) nieuw[b] = basisNieuw[b];
    eigenNrs.forEach(function(b, i) { nieuw[b] = basisNrs.length + i; });
    delen[d] = { id: K.id, deel: d, kaartVersie: K.kaartVersie, formaat: K.formaat, afronding: K.afronding, basisBogen: basisNrs.length,
      lagen: lagen.map(function(l) { var nl = {}; for (var m in l) nl[m] = m === "items" ? hernummer(l.items, nieuw) : l[m]; return nl; }),
      bogen: eigenNrs.map(function(x) { return K.bogen[x]; }) };
  });
  return { basis: basis, delen: delen };
}

function kop(K, wat) {
  return "// GEGENEREERD door tools/topo/maak-kaartdelen.mjs uit src/core/topo/kaarten/" + K.id + ".js (kaartVersie " + K.kaartVersie + "); " + wat + "; niet met de hand bewerken.\n" +
    "// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.\n";
}

export function schrijf(uit, K, r) {
  fs.mkdirSync(uit, { recursive: true });
  var namen = [K.id + "-basis.js"];
  fs.writeFileSync(path.join(uit, K.id + "-basis.js"), kop(K, "de basis") + "export default " + JSON.stringify(r.basis) + ";\n");
  Object.keys(r.delen).forEach(function(d) {
    namen.push(K.id + "-" + d + ".js");
    fs.writeFileSync(path.join(uit, K.id + "-" + d + ".js"), kop(K, "het deel " + d) + "export default " + JSON.stringify(r.delen[d]) + ";\n");
  });
  return namen;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  var uit = process.argv[2] || path.join(ROOT, "src/core/topo/kaarten");
  var ids = Object.keys(KAARTDELEN);
  for (var i = 0; i < ids.length; i++) {
    var K = (await import(pathToFileURL(path.join(ROOT, "src/core/topo/kaarten", ids[i] + ".js")).href)).default;
    console.log(schrijf(uit, K, splits(K)).join(", "));
  }
}

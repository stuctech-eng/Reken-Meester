// Test van de kaartvorm met gedeelde bogen (plan T3 par. 3.5). Snel; alleen bouwomgeving.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik: node test-bogen.mjs
// Per kaartbestand in src/core/topo/kaarten:
//   - opnieuw inpakken van de uitgepakte kaart geeft precies het bestand (deterministisch, niets verloren);
//   - elke boog wordt gebruikt, geen boog staat er twee keer in (vooruit of achteruit), elke boog heeft minstens 2 punten;
//   - pakUit laat de invoer ongewijzigd;
//   - de uitgepakte kaart heeft geen sleutels van het nieuwe formaat meer;
//   - de tijd van het uitpakken (gemeld).
// Dat de uitgepakte kaart gelijk is aan wat de kaartpijplijn maakt, bewijst test-kaarten.mjs (deel inhoud).
// Mutanten: een omgewisselde boog in een ring, een omgekeerde boog, een ontbrekende boog en een grovere afronding
// moeten een verschil of een fout geven.

import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { pakIn } from "./bogen.mjs";
import { pakUit, FORMAAT } from "../../src/core/topo/kaart/bogen.js";
import { KAARTDELEN } from "../../src/core/topo/kaartdelen.js";

var HIER = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.join(HIER, "..", "..");
var MAP = path.join(ROOT, "src/core/topo/kaarten");
var n = 0, fouten = [];
function eis(ok, tekst) { n++; if (!ok) fouten.push(tekst); }
function kopie(x) { return JSON.parse(JSON.stringify(x)); }

function eersteRing(K) {
  for (var i = 0; i < K.lagen.length; i++) for (var j = 0; j < K.lagen[i].items.length; j++) { var it = K.lagen[i].items[j]; if (it.r) { for (var k = 0; k < it.r.length; k++) if (it.r[k].length >= 2) return it.r[k]; } }
  return null;
}

// T5c: de delen van een kaart (kaarten/<id>-basis.js en -<deel>.js) zijn geen losse kaarten; die test test-kaartdelen.mjs
var DEELBESTANDEN = {};
Object.keys(KAARTDELEN).forEach(function(k) { DEELBESTANDEN[k + "-basis.js"] = 1; Object.keys(KAARTDELEN[k]).forEach(function(d) { DEELBESTANDEN[k + "-" + d + ".js"] = 1; }); });
var bestanden = fs.readdirSync(MAP).filter(function(f) { return /\.js$/.test(f) && !DEELBESTANDEN[f]; }).sort();
for (var b of bestanden) {
  var K = (await import(pathToFileURL(path.join(MAP, b)).href)).default, id = b.replace(/\.js$/, "");
  eis(K.formaat === FORMAAT, id + ": formaat " + FORMAAT);
  var voor = JSON.stringify(K), t0 = Date.now(), U = pakUit(K), ms = Date.now() - t0;
  eis(JSON.stringify(K) === voor, id + ": pakUit laat de invoer ongewijzigd");
  eis(U.formaat === undefined && U.afronding === undefined && U.bogen === undefined, id + ": uitgepakt zonder de sleutels van het formaat");
  var opnieuw = pakIn(U, K.afronding);
  eis(JSON.stringify(opnieuw) === voor, id + ": opnieuw inpakken geeft precies het bestand");
  eis(JSON.stringify(pakUit(opnieuw)) === JSON.stringify(U), id + ": twee keer uitpakken geeft hetzelfde");
  // bogen: gebruikt, uniek, minstens 2 punten
  var gebruikt = new Array(K.bogen.length).fill(0);
  K.achtergrond.concat.apply(K.achtergrond, K.lagen.map(function(l) { return l.items; })).forEach(function(it) { (it.r || []).forEach(function(r) { r.forEach(function(x) { gebruikt[x < 0 ? ~x : x]++; }); }); });
  eis(gebruikt.every(function(g) { return g > 0; }), id + ": elke boog wordt gebruikt");
  var gezien = new Set(), dubbel = 0, kort = 0;
  K.bogen.forEach(function(s) {
    var p = [], x = 0, y = 0;
    s.split(" ").forEach(function(d, i) { var q = d.split(",").map(Number); if (i === 0) { x = q[0]; y = q[1]; } else { x = Math.round((x + q[0]) * 1e6) / 1e6; y = Math.round((y + q[1]) * 1e6) / 1e6; } p.push(x + "," + y); });
    if (p.length < 2) kort++;
    var v = p.join(" "), t = p.slice().reverse().join(" ");
    if (gezien.has(v) || gezien.has(t)) dubbel++;
    gezien.add(v);
  });
  eis(dubbel === 0, id + ": geen boog dubbel (" + dubbel + ")");
  eis(kort === 0, id + ": elke boog minstens 2 punten (" + kort + ")");
  console.log(id + ": " + K.bogen.length + " bogen; uitpakken " + ms + " ms");
  // mutanten
  var ring = eersteRing(K), refs = JSON.stringify(U);
  function mutant(naam, wijzig) {
    var M = kopie(K), uit;
    try { wijzig(M); uit = JSON.stringify(pakUit(M)); } catch (e) { uit = "fout: " + e.message; }
    eis(uit !== refs, id + ": mutant " + naam + " gevangen");
  }
  mutant("omgewisselde boog", function(M) { var r = eersteRing(M); var a = r[0]; r[0] = r[1]; r[1] = a; });
  mutant("omgekeerde boog", function(M) { var r = eersteRing(M); r[0] = ~r[0]; });
  mutant("ontbrekende boog", function(M) { M.bogen.pop(); });
  mutant("grovere afronding", function(M) { M.afronding = M.afronding * 10; });
  eis(!!ring, id + ": er is een ring met minstens twee bogen voor de mutanten");
}

console.log("test-bogen: " + bestanden.length + " kaart(en); " + (fouten.length ? "FOUT" : "GOED") + ": " + (n - fouten.length) + " controles geslaagd, " + fouten.length + " mislukt");
fouten.forEach(function(f) { console.log("  - " + f); });
if (fouten.length) process.exit(1);

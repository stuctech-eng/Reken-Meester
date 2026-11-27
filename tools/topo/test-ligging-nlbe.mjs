// Test van de afgeleide liggingsrelaties (plan T5 par. 4.1, 4.2 en 6). Alleen bouwomgeving, in Node.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik (vanuit de hoofdmap van de repo): node tools/topo/test-ligging-nlbe.mjs
// - het script maakt twee keer een byte-gelijk bestand, gelijk aan src/core/topo/afgeleid/ligging-nlbe.js;
// - elke relatie: bekend type, toegestane bron- en doelsoort (relaties.js), vastgesteld en bewezen, de invoer van de afleiding met
//   een SHA-256 uit het register (bronnen.js), geen dubbele; de inverse is te maken (relatie-index.js, bouwIndex);
// - ligt-in: elke stad op de kaart ligt in het vlak van zijn provincie (punt in vlak op de kaart nlbe); elke Belgische provincie ligt
//   met haar middelpunt in het vlak van haar gewest; elke Nederlandse stad heeft precies een provincie, elke Belgische buiten Brussel ook;
// - grenst-aan: gelijk aan de buren die data.js bij het laden uit de kaart haalt (T4); bekende gevallen; geen paar over de landsgrens;
// - park -> provincie (T5c-2): opnieuw berekend zonder Clipper, met scanlijnen (de overlap per rij): per park de provincies met
//   minstens 5 % van zijn overlap met alle provincies; precies die relaties; geen aandeel tussen 1 en 5 %; bekende gevallen;
// Mutanten: een stad in een verkeerde provincie, een verzonnen buurpaar en een SHA die niet in het register staat moeten gevangen worden.

import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath, pathToFileURL } from "url";

var HIER = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.join(HIER, "..", "..");
function laad(p) { return import(pathToFileURL(path.join(ROOT, p)).href); }
var n = 0, fouten = [];
function eis(ok, tekst) { n++; if (!ok) fouten.push(tekst); }

var STANDAARD = path.join(ROOT, "src/core/topo/afgeleid/ligging-nlbe.js");
var tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ligging-"));
[1, 2].forEach(function(k) {
  execFileSync("node", [path.join(HIER, "maak-ligging-nlbe.mjs"), path.join(tmp, "r" + k)]);
  eis(fs.readFileSync(path.join(tmp, "r" + k, "ligging-nlbe.js")).equals(fs.readFileSync(STANDAARD)), "script geeft byte-gelijk ligging-nlbe.js (run " + k + ")");
});

var L = (await laad("src/core/topo/afgeleid/ligging-nlbe.js")).LIGGING_NLBE;
var R = (await laad("src/core/topo/relaties.js")).RELATIES;
var REG = (await laad("src/core/topo/bronnen.js")).REGISTER;
var IX = await laad("src/core/topo/relatie-index.js");
var LADEN = await laad("src/core/topo/laden.js");
var D = await LADEN.laadTopo(["nlbe"], ["nlbe/gebieden", "nlbe/grens"]);
var P = (await laad("src/core/topo/items/provincies.js")).PROVINCIES;
var SNL = (await laad("src/core/topo/items/steden-nl.js")).STEDEN;
var SBE = (await laad("src/core/topo/items/steden-be.js")).STEDEN_BE;

function controleer(lijst, reg) {
  var f = [];
  var gezien = {};
  lijst.forEach(function(r) {
    var t = R[r.type], wie = r.type + " " + r.van + " " + r.naar;
    if (!t) { f.push("onbekend type: " + wie); return; }
    var bron = D.item(r.van), doel = D.item(r.naar);
    if (!bron || !doel || t.bronSoorten.indexOf(bron.soort) < 0 || t.doelSoorten.indexOf(doel.soort) < 0) f.push("soort niet toegestaan: " + wie);
    if (!IX.bewezen(r, "relatie")) f.push("niet bewezen: " + wie);
    var ok = r.afleiding.invoer.every(function(x) { var e = reg[x.bronId]; return !!e && Object.keys(e.bestanden).some(function(b) { return e.bestanden[b] === x.sha256; }); });
    if (!ok) f.push("invoer niet in het register: " + wie);
    var k = r.type + "|" + r.van + "|" + r.naar, k2 = r.type + "|" + r.naar + "|" + r.van;
    if (gezien[k] || (t.symmetrisch && gezien[k2])) f.push("dubbel: " + wie);
    gezien[k] = 1;
  });
  try { IX.bouwIndex([], lijst); } catch (e) { f.push("index: " + e.message); }
  return f;
}
var f0 = controleer(L, REG);
eis(f0.length === 0, "elke relatie geldig (" + f0.slice(0, 3).join(" | ") + ")");

// punt in vlak op de kaart
function binnen(ringen, x, y) {
  var in_ = false;
  ringen.forEach(function(ring) { for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) { var a = ring[i], b = ring[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) in_ = !in_; } });
  return in_;
}
function doel(laagId, id) { return D.laag("nlbe", laagId).doelen.filter(function(d) { return d.id === id; })[0]; }
var ligtIn = L.filter(function(r) { return r.type === "ligt-in"; });
var steden = D.laag("nlbe", "steden").doelen, buiten = [], geteld = 0;
ligtIn.forEach(function(r) {
  var s = steden.filter(function(d) { return d.id === r.van; })[0];
  if (!s) return;
  var pv = doel(/^prov-nl/.test(r.naar) ? "provincies-nl" : "provincies-be", r.naar);
  geteld++;
  if (!binnen(pv.ringen, s.x, s.y)) buiten.push(r.van + " niet in " + r.naar);
});
eis(geteld >= 35 && buiten.length === 0, "elke stad op de kaart ligt in het vlak van zijn provincie (" + geteld + " getoetst; " + buiten.join(", ") + ")");
var gewFout = [];
ligtIn.filter(function(r) { return /^prov-be/.test(r.van); }).forEach(function(r) {
  var pv = doel("provincies-be", r.van), gw = doel("gewesten", r.naar);
  if (!binnen(gw.ringen, pv.mx, pv.my)) gewFout.push(r.van);
});
eis(gewFout.length === 0 && ligtIn.filter(function(r) { return /^prov-be/.test(r.van); }).length === 10, "elke Belgische provincie ligt in haar gewest (10; " + gewFout.join(", ") + ")");
eis(SNL.every(function(s) { return ligtIn.filter(function(r) { return r.van === s.id; }).length === 1; }), "elke Nederlandse stad heeft precies een provincie");
eis(SBE.every(function(s) { return ligtIn.filter(function(r) { return r.van === s.id; }).length === (s.id === "stad-be-brussel" ? 0 : 1); }), "elke Belgische stad heeft precies een provincie, Brussel geen");

// grenst-aan
var ga = L.filter(function(r) { return r.type === "grenst-aan"; });
var verschil = [];
P.forEach(function(p) {
  var uitBestand = ga.filter(function(r) { return r.van === p.id || r.naar === p.id; }).map(function(r) { return r.van === p.id ? r.naar : r.van; }).sort();
  if (uitBestand.join(",") !== D.buren(p.id).join(",")) verschil.push(p.id);
});
eis(verschil.length === 0, "grenst-aan gelijk aan de buren uit de kaart (T4) (" + verschil.join(", ") + ")");
eis(ga.every(function(r) { return r.van.slice(0, 7) === r.naar.slice(0, 7); }), "geen buurpaar over de landsgrens");
function buren(naam, land) { var p = P.filter(function(x) { return x.naam.waarde === naam && x.feiten.land.waarde === land; })[0]; return ga.filter(function(r) { return r.van === p.id || r.naar === p.id; }).map(function(r) { return D.naamVan(r.van === p.id ? r.naar : r.van); }).sort().join(", "); }
eis(buren("Utrecht", "NLD") === "Gelderland, Noord-Holland, Zuid-Holland" && buren("Luxemburg", "BEL") === "Luik, Namen", "bekende gevallen: Utrecht en Luxemburg (" + buren("Utrecht", "NLD") + "; " + buren("Luxemburg", "BEL") + ")");
eis(ga.length === 41, "41 buurparen: 22 in Nederland, 19 in Belgie (" + ga.length + ")");

// park -> provincie, onafhankelijk van Clipper: met scanlijnen. Per rij (stap 0,02 kaarteenheden) de stukken binnen het vlak (even-oneven,
// zoals de kaart), en de lengte van de overlap van de stukken van park en provincie; opgeteld per rij is dat de oppervlakte.
var STAP = 0.02;
function randen(ringen) { var e = []; ringen.forEach(function(r) { for (var i = 0, j = r.length - 1; i < r.length; j = i++) if (r[i][1] !== r[j][1]) e.push([r[j][0], r[j][1], r[i][0], r[i][1]]); }); return e; }
function bbox(ringen) { var b = [Infinity, Infinity, -Infinity, -Infinity]; ringen.forEach(function(r) { r.forEach(function(q) { b[0] = Math.min(b[0], q[0]); b[1] = Math.min(b[1], q[1]); b[2] = Math.max(b[2], q[0]); b[3] = Math.max(b[3], q[1]); }); }); return b; }
function stukken(e, y) { var xs = []; e.forEach(function(k) { if ((k[1] > y) !== (k[3] > y)) xs.push(k[0] + (y - k[1]) * (k[2] - k[0]) / (k[3] - k[1])); }); xs.sort(function(a, b) { return a - b; }); var u = []; for (var i = 0; i + 1 < xs.length; i += 2) u.push([xs[i], xs[i + 1]]); return u; }
function overlap(a, b) { var t = 0, i = 0, j = 0; while (i < a.length && j < b.length) { var l = Math.max(a[i][0], b[j][0]), r = Math.min(a[i][1], b[j][1]); if (r > l) t += r - l; if (a[i][1] < b[j][1]) i++; else j++; } return t; }
var provG = D.laag("nlbe", "provincies-nl").doelen.concat(D.laag("nlbe", "provincies-be").doelen).map(function(d) { return { id: d.id, e: randen(d.ringen), b: bbox(d.ringen) }; });
var parkRel = ligtIn.filter(function(r) { return /^prov-/.test(r.naar) && !/^(stad|prov)-/.test(r.van); }), verwacht = [], twijfel = [];
["parken", "parken-be"].forEach(function(lid) {
  D.laag("nlbe", lid).doelen.forEach(function(d) {
    var e = randen(d.ringen), b = bbox(d.ringen), kand = provG.filter(function(q) { return q.b[0] <= b[2] && q.b[2] >= b[0] && q.b[1] <= b[3] && q.b[3] >= b[1]; });
    var s = kand.map(function(q) { return { id: q.id, a: 0 }; });
    for (var y = Math.floor(b[1] / STAP) * STAP + STAP / 2; y < b[3]; y += STAP) { var ps = stukken(e, y); if (!ps.length) continue; kand.forEach(function(q, k) { s[k].a += overlap(ps, stukken(q.e, y)); }); }
    var som = s.reduce(function(a, x) { return a + x.a; }, 0);
    s.forEach(function(x) { var a = x.a / som; if (a >= 0.05) verwacht.push(d.id + ">" + x.id); else if (a > 0.01) twijfel.push(d.id + " " + x.id); });
  });
});
eis(verwacht.sort().join() === parkRel.map(function(r) { return r.van + ">" + r.naar; }).sort().join(), "park -> provincie gelijk aan de herberekening met scanlijnen (" + verwacht.length + " tegen " + parkRel.length + ")");
eis(twijfel.length === 0, "park -> provincie: geen aandeel tussen 1 en 5 % (" + twijfel.join(", ") + ")");
function provVan(park) { return parkRel.filter(function(r) { return r.van === park; }).map(function(r) { return D.naamVan(r.naar); }).sort().join(", "); }
eis(provVan("park-nl-de-hoge-veluwe") === "Gelderland" && provVan("streek-nl-biesbosch") === "Noord-Brabant, Zuid-Holland" && provVan("park-nl-oosterschelde") === "Zeeland" && provVan("park-be-vallee-de-la-semois") === "Luxemburg, Namen", "bekende gevallen: Hoge Veluwe, Biesbosch, Oosterschelde, Semois");
eis(D.laag("nlbe", "parken").items.concat(D.laag("nlbe", "parken-be").items).every(function(it) { return parkRel.some(function(r) { return r.van === it.id; }); }), "elk park op de kaart ligt in minstens een provincie");

// taalgebied -> gewest (T5c-3), met scanlijnen: elk taalgebied ligt voor minstens 99 % in precies het gewest van de relatie
var gewG = D.laag("nlbe", "gewesten").doelen.map(function(d) { return { id: d.id, e: randen(d.ringen) }; }), taalFout = [];
D.laag("nlbe", "taalgebieden").doelen.forEach(function(d) {
  var e = randen(d.ringen), b = bbox(d.ringen), s = gewG.map(function(q) { return { id: q.id, a: 0 }; });
  for (var y = Math.floor(b[1] / STAP) * STAP + STAP / 2; y < b[3]; y += STAP) { var ps = stukken(e, y); if (!ps.length) continue; gewG.forEach(function(q, k) { s[k].a += overlap(ps, stukken(q.e, y)); }); }
  var som = s.reduce(function(a, x) { return a + x.a; }, 0), r = ligtIn.filter(function(x) { return x.van === d.id; });
  var groot = s.filter(function(x) { return x.a >= 0.99 * som; });
  if (r.length !== 1 || groot.length !== 1 || groot[0].id !== r[0].naar) taalFout.push(d.id);
});
eis(taalFout.length === 0 && ligtIn.filter(function(x) { return /^taalgebied-/.test(x.van); }).length === 4, "taalgebied -> gewest: 4, elk voor minstens 99 % in zijn gewest (scanlijnen) (" + taalFout.join(", ") + ")");

// mutanten
function kopie(x) { return JSON.parse(JSON.stringify(x)); }
var m1 = kopie(L); m1.filter(function(r) { return r.van === "stad-nl-eindhoven"; })[0].naar = "prov-nl-pv31";
var s1 = steden.filter(function(d) { return d.id === "stad-nl-eindhoven"; })[0];
eis(!binnen(doel("provincies-nl", "prov-nl-pv31").ringen, s1.x, s1.y), "mutant: Eindhoven in Limburg wordt gevangen door punt in vlak");
var m2 = kopie(L); m2.push({ type: "grenst-aan", van: "prov-nl-pv20", naar: "prov-nl-pv31", kwalificaties: { via: "land" }, herkomst: "afgeleid", status: "vastgesteld", afleiding: m2[m2.length - 1].afleiding });
eis(D.buren("prov-nl-pv20").indexOf("prov-nl-pv31") < 0, "mutant: verzonnen buurpaar Groningen-Limburg wordt gevangen door de vergelijking met de kaart");
var m3 = kopie(L); m3[0].afleiding.invoer[0].sha256 = "c".repeat(64);
eis(controleer(m3, REG).length > 0, "mutant: SHA buiten het register wordt gevangen");

console.log("test-ligging-nlbe: " + (fouten.length ? "FOUT" : "GOED") + ": " + (n - fouten.length) + " controles geslaagd, " + fouten.length + " mislukt");
fouten.forEach(function(x) { console.log("  - " + x); });
if (fouten.length) process.exit(1);

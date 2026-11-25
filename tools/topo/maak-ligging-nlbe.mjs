// Maakt src/core/topo/afgeleid/ligging-nlbe.js: de afgeleide liggingsrelaties van Nederland en Belgie (plan T5 par. 4.1, 4.2 en 4.6).
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik (vanuit de hoofdmap van de repo): node tools/topo/maak-ligging-nlbe.mjs [uitmap]   (standaard: src/core/topo/afgeleid)
// Twee keer draaien geeft een byte-gelijk bestand (test: tools/topo/test-ligging-nlbe.mjs).
//
// Drie soorten relaties, elk met herkomst "afgeleid" en de afleiding (script, regel, invoer met SHA-256 uit het register):
// 1 ligt-in, stad -> provincie (Nederland): de provincie uit het CBS-bestand van de bevolkingskernen (feiten.provincie, bron CBS),
//   omgezet naar de provincie-id via de naam van de provincie (Fryslan = Friesland, de enige andere schrijfwijze).
// 2 ligt-in, stad -> provincie (Belgie): uit de NIS-code van de gemeente (REFNIS van Statbel, feiten.refnis): het eerste cijfer is de
//   provincie; bij 2 het tweede: 23 en 24 Vlaams-Brabant, 25 Waals-Brabant, 21 het Brussels Hoofdstedelijk Gewest (geen provincie).
// 3 ligt-in, provincie -> gewest (Belgie): uit de NIS-code van de provincie: 10000, 20001, 30000, 40000 en 70000 in het Vlaams Gewest;
//   20002, 50000, 60000, 80000 en 90000 in het Waals Gewest (de indeling van REFNIS).
// 4 grenst-aan, provincie <-> provincie, binnen een land: twee provincies van dezelfde laag van de kaart nlbe delen een boog (een
//   grenslijn, niet alleen een hoekpunt). Een paar staat er een keer in (van < naar); de inverse maakt de index.
// De test controleert 1 tot en met 3 ook met de geometrie (punt in vlak, op de kaart).

import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

var HIER = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.join(HIER, "..", "..");
var UIT = process.argv[2] || path.join(ROOT, "src", "core", "topo", "afgeleid");
function laad(p) { return import(pathToFileURL(path.join(ROOT, p)).href); }

var P = (await laad("src/core/topo/items/provincies.js")).PROVINCIES;
var G = (await laad("src/core/topo/items/gewesten.js")).GEWESTEN;
var SNL = (await laad("src/core/topo/items/steden-nl.js")).STEDEN;
var SBE = (await laad("src/core/topo/items/steden-be.js")).STEDEN_BE;
var KAART = (await laad("src/core/topo/kaarten/nlbe.js")).default;

var SCRIPT = "tools/topo/maak-ligging-nlbe.mjs";
function sha(bron) { if (!bron || !/^[0-9a-f]{64}$/.test(bron.sha256 || "")) throw new Error("bron zonder SHA-256"); return bron.sha256; }
function uitKaart(id) { var r = (KAART.invoer || []).filter(function(x) { return x.indexOf(id + ":") === 0; }); if (r.length !== 1) throw new Error("kaartinvoer " + id + " niet precies een keer"); return r[0].split(":")[1]; }

var PROV_NL = {}, PROV_BE = {}, GEWEST = {};
P.forEach(function(p) { if (p.feiten.land.waarde === "NLD") PROV_NL[p.naam.waarde] = p; else PROV_BE[p.feiten.code.waarde] = p; });
G.forEach(function(g) { GEWEST[g.feiten.code.waarde] = g; });
var NAAM_CBS = { "Fryslân": "Friesland" };

var REL = [];
// 1 Nederland
SNL.forEach(function(s) {
  var f = s.feiten.provincie;
  if (!f || f.status !== "vastgesteld") return;
  var naam = NAAM_CBS[f.waarde] || f.waarde, p = PROV_NL[naam];
  if (!p) throw new Error("onbekende CBS-provincie " + f.waarde + " bij " + s.id);
  REL.push({ type: "ligt-in", van: s.id, naar: p.id, kwalificaties: {}, herkomst: "afgeleid", status: "vastgesteld",
    afleiding: { script: SCRIPT, regel: "de provincie uit het CBS-bestand van de bevolkingskernen (feiten.provincie), via de naam van de provincie; Fryslân = Friesland", invoer: [{ bronId: "CBS", sha256: sha(f.bron) }] } });
});
// 2 Belgie
function provincieVanNis(nis) {
  var a = nis.charAt(0), b = nis.charAt(1);
  if (a === "2") return b === "3" || b === "4" ? "20001" : b === "5" ? "20002" : null;
  return a + "0000";
}
SBE.forEach(function(s) {
  var f = s.feiten.refnis;
  if (!f || f.status !== "vastgesteld") return;
  var code = provincieVanNis(f.waarde);
  if (code === null) return;   // Brussels Hoofdstedelijk Gewest: geen provincie
  var p = PROV_BE[code];
  if (!p) throw new Error("onbekende provincie " + code + " bij " + s.id);
  REL.push({ type: "ligt-in", van: s.id, naar: p.id, kwalificaties: {}, herkomst: "afgeleid", status: "vastgesteld",
    afleiding: { script: SCRIPT, regel: "de provincie uit de NIS-code van de gemeente (REFNIS): eerste cijfer; bij 2: 23 en 24 Vlaams-Brabant, 25 Waals-Brabant, 21 geen provincie", invoer: [{ bronId: "STB", sha256: sha(f.bron) }] } });
});
// 3 provincie -> gewest
var VLAAMS = ["10000", "20001", "30000", "40000", "70000"], WAALS = ["20002", "50000", "60000", "80000", "90000"];
Object.keys(PROV_BE).sort().forEach(function(code) {
  var p = PROV_BE[code], g = VLAAMS.indexOf(code) >= 0 ? GEWEST["02000"] : WAALS.indexOf(code) >= 0 ? GEWEST["03000"] : null;
  if (!g) throw new Error("provincie zonder gewest: " + code);
  REL.push({ type: "ligt-in", van: p.id, naar: g.id, kwalificaties: {}, herkomst: "afgeleid", status: "vastgesteld",
    afleiding: { script: SCRIPT, regel: "het gewest uit de NIS-code van de provincie (REFNIS): 10000, 20001, 30000, 40000 en 70000 Vlaams Gewest; 20002, 50000, 60000, 80000 en 90000 Waals Gewest", invoer: [{ bronId: "STB", sha256: sha(p.feiten.code.bron) }] } });
});
// 4 grenst-aan uit de gedeelde bogen
var LAGEN = { "provincies-nl": "CBSGEB", "provincies-be": "STB" };
Object.keys(LAGEN).forEach(function(lid) {
  var l = KAART.lagen.filter(function(x) { return x.id === lid; })[0], perBoog = {}, paren = {};
  l.items.forEach(function(it) { it.r.forEach(function(ring) { ring.forEach(function(a) { var b = a < 0 ? ~a : a; (perBoog[b] = perBoog[b] || {})[it.id] = 1; }); }); });
  Object.keys(perBoog).forEach(function(b) { var ids = Object.keys(perBoog[b]).sort(); for (var i = 0; i < ids.length; i++) for (var j = i + 1; j < ids.length; j++) paren[ids[i] + " " + ids[j]] = 1; });
  Object.keys(paren).sort().forEach(function(k) {
    var d = k.split(" ");
    REL.push({ type: "grenst-aan", van: d[0], naar: d[1], kwalificaties: { via: "land" }, herkomst: "afgeleid", status: "vastgesteld",
      afleiding: { script: SCRIPT, regel: "twee provincies van de laag " + lid + " van de kaart nlbe delen een boog (een grenslijn, niet alleen een hoekpunt)", invoer: [{ bronId: LAGEN[lid], sha256: uitKaart(LAGEN[lid]) }] } });
  });
});

var tekst = "// GEGENEREERD door " + SCRIPT + "; niet met de hand bewerken.\n" +
  "// De afgeleide liggingsrelaties van Nederland en Belgie (plan T5 par. 4.1, 4.2 en 4.6): ligt-in (stad -> provincie, provincie -> gewest)\n" +
  "// en grenst-aan (provincie <-> provincie). Per relatie de afleiding met de SHA-256 van de invoer.\n" +
  "// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.\n" +
  "export var LIGGING_NLBE = " + JSON.stringify(REL) + ";\n";
fs.mkdirSync(UIT, { recursive: true });
fs.writeFileSync(path.join(UIT, "ligging-nlbe.js"), tekst);
console.log("ligging-nlbe.js: " + REL.length + " relaties (" + REL.filter(function(r) { return r.type === "ligt-in"; }).length + " ligt-in, " + REL.filter(function(r) { return r.type === "grenst-aan"; }).length + " grenst-aan)");

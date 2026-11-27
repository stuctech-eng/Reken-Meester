// Maakt src/core/topo/afgeleid/grensgebieden-nlbe.js: grenst-aan van de vier grensgebieden naar een buurland van Nederland
// (plan T5c, B4: nb23 "Aan welk land grenst ...?"; plan T1 par. 2.1). Alleen bouwomgeving.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik (vanuit de hoofdmap van de repo): node tools/topo/maak-grensgebied-relaties.mjs [uitmap]   (standaard: src/core/topo/afgeleid)
// Per grensgebied de buurlanden (Belgie, Duitsland), elk met herkomst "afgeleid" en de afleiding:
// - Drielandenpunt en enclavegebied Baarle: uit het feit landen (afgeleid in maak-grensgebieden-nl.mjs), zonder Nederland;
// - Dollard: uit het feit grensgebied (besluit 26-11-2026, de grens is daar niet vastgelegd), zonder Nederland;
// - Zeeuws-Vlaanderen: de grensgemeenten (afgeleid/grensgemeenten-nl.js) waarvan het middelpunt op de kaart nlbe in het vlak van de
//   streek ligt; de landen waaraan die gemeenten grenzen. Er moet minstens een zo'n gemeente zijn.
// Twee keer draaien geeft een byte-gelijk bestand (test: tools/topo/test-grensgebied-relaties.mjs).

import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { pakUit } from "../../src/core/topo/kaart/bogen.js";
import { maakDoelen } from "../../src/core/topo/kaart/tikregel.js";

var HIER = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.join(HIER, "..", "..");
var UIT = process.argv[2] || path.join(ROOT, "src", "core", "topo", "afgeleid");
function laad(p) { return import(pathToFileURL(path.join(ROOT, p)).href); }
function fout(t) { throw new Error(t); }
var SCRIPT = "tools/topo/maak-grensgebied-relaties.mjs";

var GG = (await laad("src/core/topo/items/grensgebieden.js")).GRENSGEBIEDEN;
var STR = (await laad("src/core/topo/items/streken-nl.js")).STREKEN_NL;
var WNL = (await laad("src/core/topo/items/water-nl.js")).WATER_NL;
var GEM = (await laad("src/core/topo/afgeleid/grensgemeenten-nl.js")).GRENSGEMEENTEN_NL;
var KAART = pakUit((await laad("src/core/topo/kaarten/nlbe.js")).default);

function binnen(ringen, x, y) { var c = false; ringen.forEach(function(r) { for (var i = 0, j = r.length - 1; i < r.length; j = i++) { var a = r[i], b = r[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } }); return c; }
function doelen(lid) { var l = KAART.lagen.filter(function(x) { return x.id === lid; })[0] || fout("geen laag " + lid); return maakDoelen({ id: l.id, soort: l.soort, items: l.items }); }
function rel(van, land, regel, invoer) { return { type: "grenst-aan", van: van, naar: land, kwalificaties: {}, herkomst: "afgeleid", status: "vastgesteld", afleiding: { script: SCRIPT, regel: regel, invoer: invoer } }; }

var REL = [];
GG.forEach(function(g) {
  var f = g.feiten.landen;
  if (!f || f.status !== "vastgesteld") fout("geen vastgesteld feit landen: " + g.id);
  f.waarde.filter(function(l) { return l !== "NLD"; }).sort().forEach(function(l) { REL.push(rel(g.id, l, "uit het feit landen van het grensgebied (" + f.afleiding.regel + "), zonder Nederland", f.afleiding.invoer)); });
});
var dol = WNL.filter(function(w) { return w.id === "zeearm-dollard"; })[0] || fout("geen Dollard");
var dg = dol.feiten.grensgebied;
if (!dg || dg.status !== "vastgesteld") fout("geen feit grensgebied bij de Dollard");
dg.waarde.filter(function(l) { return l !== "NLD"; }).sort().forEach(function(l) { REL.push(rel(dol.id, l, "uit het feit grensgebied van de Dollard (besluit 26-11-2026: de grens is daar niet vastgelegd), zonder Nederland", [{ bronId: "TOP10", sha256: dol.feiten.typewater.bron.sha256 }])); });
var zv = STR.filter(function(s) { return s.id === "streek-nl-zeeuws-vlaanderen"; })[0] || fout("geen Zeeuws-Vlaanderen");
var vlak = doelen("streken").filter(function(d) { return d.id === zv.id; })[0] || fout("Zeeuws-Vlaanderen niet op de kaart");
var gem = doelen("grensgemeenten").filter(function(d) { return binnen(vlak.ringen, d.mx, d.my); }).map(function(d) { return d.id; }).sort();
if (!gem.length) fout("geen grensgemeente in Zeeuws-Vlaanderen");
var landen = {};
GEM.filter(function(r) { return gem.indexOf(r.van) >= 0 && r.type === "grenst-aan"; }).forEach(function(r) { landen[r.naar] = 1; });
var invoerZv = [{ bronId: "CBSGEB", sha256: zv.feiten.land.bron.sha256 }];
Object.keys(landen).sort().forEach(function(l) { REL.push(rel(zv.id, l, "de grensgemeenten (afgeleid/grensgemeenten-nl.js) met hun middelpunt op de kaart nlbe in het vlak van de streek (" + gem.join(", ") + ") grenzen aan dit land", invoerZv)); });

var tekst = "// GEGENEREERD door " + SCRIPT + "; niet met de hand bewerken.\n" +
  "// De grensgebieden en hun buurland (plan T5c, B4; nb23): grenst-aan, met per relatie de afleiding.\n" +
  "// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.\n" +
  "export var GRENSGEBIEDEN_NLBE = " + JSON.stringify(REL) + ";\n";
fs.mkdirSync(UIT, { recursive: true });
fs.writeFileSync(path.join(UIT, "grensgebieden-nlbe.js"), tekst);
console.log("grensgebieden-nlbe.js: " + REL.map(function(r) { return r.van + " -> " + r.naar; }).join(", ") + "; Zeeuws-Vlaanderen via " + gem.join(", "));

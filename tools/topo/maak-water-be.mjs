// De rivieren en kanalen van Belgie als label-item zonder lijn (plan T5b-3 par. 3.1 en 3.2; besluit Dick 26-11-2026, optie B).
// Alleen bouwomgeving.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik: node maak-water-be.mjs <uitvoermap>
// - controleert de SHA-256 van water-be.json tegen het register;
// - elke naam uit de lijsten van T1 par. 2.2 wordt een item, behalve een water dat al bestaat (bestaand: de Maas en het Kanaal
//   Gent-Terneuzen); dat bestaande item moet in de kennisbank staan, met dezelfde naam;
// - een rivier is internationaal water (geen feit land, zoals water-nlbe.js); een kanaal ligt in Belgie (besluit);
// - geen geometrie: geometrie.bron null, met de reden (A2); schrijft items/water-be.js, byte-gelijk bij twee keer draaien.

import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { openBron } from "./bronnen/bron.mjs";

var HIER = path.dirname(fileURLToPath(import.meta.url));
var ROOT = path.resolve(HIER, "..", "..");
var BRONNEN = JSON.parse(fs.readFileSync(path.join(HIER, "bronnen.json"), "utf8"));
var REG = BRONNEN.register.ids;
var GEEN = "nog geen lijn: de bron (VHA, RHW) kon niet vanaf de iPhone worden opgehaald (besluit Dick 26-11-2026, optie B); alleen benoemen, als label-item zonder lijn (A2)";

function fout(t) { throw new Error(t); }
export function slug(naam) { return naam.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

export async function bouw() {
  var tab = openBron(path.join(HIER, "water-be.json"), "tabellenNlbe", "tools/topo/water-be.json");
  if (REG.tabellenNlbe.bestanden["tools/topo/water-be.json"] !== tab.sha256) fout("SHA-256 van water-be.json wijkt af van het register");
  var T = JSON.parse(tab.buf.toString("utf8"));
  var bestaand = {};
  for (var f of ["items/water-nlbe.js", "items/kanalen-nl.js"]) {
    var m = await import(pathToFileURL(path.join(ROOT, "src/core/topo", f)).href);
    Object.keys(m).forEach(function(k) { m[k].forEach(function(it) { bestaand[it.id] = it; }); });
  }
  Object.keys(T.bestaand).forEach(function(n) { var it = bestaand[T.bestaand[n]]; if (!it || it.naam.waarde !== n) fout("bestaand item klopt niet: " + n); });
  var ITEMS = [], ids = {};
  function item(soort, n) {
    if (T.bestaand[n]) return;
    var id = soort + "-be-" + slug(n);
    if (ids[id]) fout("id twee keer: " + id); ids[id] = 1;
    var it = { id: id, soort: soort, naam: { waarde: n, varianten: [], herkomst: "besluit", status: "vastgesteld", besluit: T.naamBesluit }, feiten: {}, geometrie: { bron: null, geen: GEEN, kaart: {} }, relaties: [] };
    if (soort === "kanaal") it.feiten.land = { waarde: "BEL", herkomst: "besluit", status: "vastgesteld", besluit: T.landBesluit };
    ITEMS.push(it);
  }
  T.rivieren.forEach(function(n) { item("rivier", n); });
  T.kanalen.forEach(function(n) { item("kanaal", n); });
  ITEMS.sort(function(a, b) { return a.id < b.id ? -1 : 1; });
  return { ITEMS: ITEMS };
}

function regel(naam, waarde) { return "export var " + naam + " = " + JSON.stringify(waarde) + ";\n"; }
export function schrijf(uit, r) {
  fs.mkdirSync(path.join(uit, "items"), { recursive: true });
  fs.writeFileSync(path.join(uit, "items", "water-be.js"), "// GEGENEREERD door tools/topo/maak-water-be.mjs uit tools/topo/water-be.json (SHA-256 in tools/topo/bronnen.json); niet met de hand bewerken.\n// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.\n" + regel("WATER_BE", r.ITEMS));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  var r = await bouw();
  schrijf(process.argv[2], r);
  console.log(JSON.stringify(r.ITEMS.map(function(i) { return i.id; })));
}

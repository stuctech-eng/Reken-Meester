// De drie gemeenschappen van Belgie en waar ze bevoegd zijn (plan T1 par. 1.4 en 2.2; plan T5c, nb22). Alleen bouwomgeving.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik (vanuit de hoofdmap van de repo): node tools/topo/maak-gemeenschappen-be.mjs [uitmap]   (standaard: src/core/topo)
// - leest gemeenschappen-be.json en controleert de SHA-256 tegen het register (tabellenNlbe); de bron (de Grondwet, als PDF) staat met
//   haar SHA-256 in het register OV;
// - per gemeenschap een item (soort gemeenschap, zonder vlak), naam en land met de passage van art. 2;
// - per regel van bevoegd een relatie bevoegd-in (gemeenschap -> taalgebied) met de kwalificatie reikwijdte en de passage van het
//   artikel; elke naam staat letterlijk in de passage van art. 2, elk taalgebied bestaat in de kennisbank;
// - schrijft items/gemeenschappen-be.js; twee keer draaien geeft een byte-gelijk bestand.
// De passages staan letterlijk in de Grondwet: test-gemeenschappen-be.mjs controleert dat met de PDF erbij.

import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { openBron } from "./bronnen/bron.mjs";

var HIER = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HIER, "..", "..");
var BRONNEN = JSON.parse(fs.readFileSync(path.join(HIER, "bronnen.json"), "utf8")), REG = BRONNEN.register.ids;
function fout(t) { throw new Error(t); }

export async function bouw() {
  var tab = openBron(path.join(HIER, "gemeenschappen-be.json"), "tabellenNlbe", "tools/topo/gemeenschappen-be.json");
  if (REG.tabellenNlbe.bestanden["tools/topo/gemeenschappen-be.json"] !== tab.sha256) fout("SHA-256 van gemeenschappen-be.json wijkt af van het register");
  var T = JSON.parse(tab.buf.toString("utf8")), B = T.bron;
  if (REG.OV.bestanden[B.bestand] !== B.sha256) fout("de Grondwet (" + B.bestand + ") staat niet met deze SHA-256 in het register OV");
  var TG = (await import(pathToFileURL(path.join(ROOT, "src/core/topo/items/taalgebieden.js")).href)).TAALGEBIEDEN.map(function(t) { return t.id; });
  function bron(artikel, passage) { return { id: "OV", uitgever: B.uitgever, document: B.document + ", " + artikel, url: B.url, bestand: B.bestand, sha256: B.sha256, passage: passage, geraadpleegd: B.geraadpleegd }; }
  var G = T.gemeenschappen, bArt2 = bron(G.artikel, G.passage);
  var ITEMS = Object.keys(G.items).sort().map(function(id) {
    var naam = G.items[id];
    if (G.passage.indexOf(naam) < 0) fout("naam niet in de passage van art. 2: " + naam);
    var rel = T.bevoegd.filter(function(r) { return r.van === id; }).map(function(r) {
      if (TG.indexOf(r.naar) < 0) fout("geen taalgebied " + r.naar);
      if (["taalgebied", "instellingen"].indexOf(r.reikwijdte) < 0) fout("reikwijdte " + r.reikwijdte);
      return { type: "bevoegd-in", naar: r.naar, kwalificaties: { reikwijdte: r.reikwijdte }, herkomst: "bron", status: "vastgesteld", bron: bron(r.artikel, r.passage) };
    });
    if (!rel.length) fout("gemeenschap zonder bevoegdheid: " + id);
    return { id: id, soort: "gemeenschap",
      naam: { waarde: naam, varianten: [], herkomst: "bron", status: "vastgesteld", bron: bArt2 },
      feiten: { land: { waarde: "BEL", herkomst: "bron", status: "vastgesteld", bron: bArt2 } },
      geometrie: { bron: null, geen: "een gemeenschap heeft geen eigen vlak (T1 par. 1.4); alleen in vragen zonder kaart (A2)", kaart: {} },
      relaties: rel };
  });
  T.bevoegd.forEach(function(r) { if (!G.items[r.van]) fout("bevoegd: onbekende gemeenschap " + r.van); });
  return { ITEMS: ITEMS };
}

export function schrijf(uit, r) {
  fs.mkdirSync(path.join(uit, "items"), { recursive: true });
  fs.writeFileSync(path.join(uit, "items", "gemeenschappen-be.js"), "// GEGENEREERD door tools/topo/maak-gemeenschappen-be.mjs uit tools/topo/gemeenschappen-be.json en de Belgische Grondwet (SHA-256 in tools/topo/bronnen.json); niet met de hand bewerken.\n// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.\nexport var GEMEENSCHAPPEN_BE = " + JSON.stringify(r.ITEMS) + ";\n");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  var r = await bouw();
  schrijf(process.argv[2] || path.join(ROOT, "src/core/topo"), r);
  console.log(r.ITEMS.map(function(i) { return i.id + ": " + i.relaties.map(function(x) { return x.naar + " (" + x.kwalificaties.reikwijdte + ")"; }).join(", "); }).join(" | "));
}

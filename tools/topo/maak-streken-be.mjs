// De Belgische streken met een officiele grens: de landbouwstreken van het KB van 24 februari 1951 (plan T5b-3 par. 3.3; plan T1
// par. 2.2). Alleen bouwomgeving.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik: node maak-streken-be.mjs <Lbstrbel.gpkg> <uitvoermap>
// - controleert de SHA-256 van Lbstrbel.gpkg en van streken-be.json tegen het register;
// - per streek de landbouwstreken uit de tabel: elke naam komt precies een keer voor in de bron; geen landbouwstreek twee keer;
// - feiten: land Belgie (bron LBS), de indeling (besluit); het vlak is de landbouwstreek, of bij meer landbouwstreken hun delen samen;
// - schrijft items/streken-be.js; twee keer draaien geeft een byte-gelijk bestand.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { openBron } from "./bronnen/bron.mjs";
import { leesGpkg, leesGeometrie } from "./bronnen/lees-gpkg.mjs";

var HIER = path.dirname(fileURLToPath(import.meta.url));
var BRONNEN = JSON.parse(fs.readFileSync(path.join(HIER, "bronnen.json"), "utf8"));
var LBS = BRONNEN.landbouwstrekenBelgie, REG = BRONNEN.register.ids;

function fout(t) { throw new Error(t); }

export async function openLbs(pad) {
  var b = openBron(pad, "LBS", LBS.gpkg.bestand);
  if (b.sha256 !== LBS.gpkg.sha256) fout("SHA-256 van Lbstrbel.gpkg wijkt af");
  var L = await leesGpkg(b.buf, LBS.gpkg.laag, ["NAAM"], "SHAPE", "NAAM");
  if (L.crs !== LBS.gpkg.crs || L.records.length !== LBS.gpkg.features) fout("LBS: onverwacht CRS of aantal");
  var per = {}; L.records.forEach(function(r) { var n = r.kenmerken.NAAM; if (per[n]) fout("LBS: naam twee keer: " + n); per[n] = leesGeometrie(r.geom); });
  return { sha: b.sha256, per: per };
}

export async function bouw(paden) {
  var L = await openLbs(paden.lbs);
  var tab = openBron(path.join(HIER, "streken-be.json"), "tabellenNlbe", "tools/topo/streken-be.json");
  if (REG.tabellenNlbe.bestanden["tools/topo/streken-be.json"] !== tab.sha256) fout("SHA-256 van streken-be.json wijkt af van het register");
  var T = JSON.parse(tab.buf.toString("utf8"));
  var bronLbs = { id: "LBS", bestand: LBS.gpkg.bestand, sha256: LBS.gpkg.sha256, laag: LBS.gpkg.laag, gedownload: LBS.gedownload };
  var gebruikt = {}, namen = {};
  var ITEMS = Object.keys(T.streken).sort().map(function(id) {
    var s = T.streken[id];
    if (namen[s.naam]) fout("naam twee keer: " + s.naam); namen[s.naam] = 1;
    s.lbs.forEach(function(n) { if (!L.per[n]) fout("LBS: geen landbouwstreek " + n); if (gebruikt[n]) fout("LBS: " + n + " twee keer gebruikt"); gebruikt[n] = id; });
    var it = { id: id, soort: "streek",
      naam: { waarde: s.naam, varianten: [], herkomst: "besluit", status: "vastgesteld", besluit: T.naamBesluit, controle: { id: "LBS", waarde: s.lbs.join("; ") } },
      feiten: {
        land: { waarde: "BEL", herkomst: "bron", status: "vastgesteld", bron: bronLbs },
        indeling: { waarde: "landbouwstreek " + s.lbs.join(" en ") + " (KB 24-02-1951)", herkomst: "besluit", status: "vastgesteld", besluit: T.besluit }
      },
      geometrie: { bron: { bronId: "LBS", bestand: LBS.gpkg.bestand, sha256: LBS.gpkg.sha256, laag: LBS.gpkg.laag, sleutel: "NAAM", waarden: s.lbs.slice().sort(), crs: LBS.gpkg.crs }, kaart: {} },
      relaties: [] };
    if (s.lbs.length > 1) it.geometrie.bron.aggregatie = "de delen van de landbouwstreken " + s.lbs.join(" en ") + " samen";
    return it;
  });
  return { ITEMS: ITEMS };
}

function regel(naam, waarde) { return "export var " + naam + " = " + JSON.stringify(waarde) + ";\n"; }
export function schrijf(uit, r) {
  fs.mkdirSync(path.join(uit, "items"), { recursive: true });
  fs.writeFileSync(path.join(uit, "items", "streken-be.js"), "// GEGENEREERD door tools/topo/maak-streken-be.mjs uit tools/topo/streken-be.json en Landbouwstreken Belgie (SHA-256 in tools/topo/bronnen.json); niet met de hand bewerken.\n// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.\n" + regel("STREKEN_BE", r.ITEMS));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  var r = await bouw({ lbs: process.argv[2] });
  schrijf(process.argv[3], r);
  console.log(JSON.stringify(r.ITEMS.map(function(i) { return i.id + " " + i.geometrie.bron.waarden.join("+"); })));
}

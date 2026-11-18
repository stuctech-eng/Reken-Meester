// De 5 bewoonde Waddeneilanden en de eilandengroep (bouwplan T2b-2 fase 6.2 deel 2, versie 2). Alleen bouwomgeving.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik: node maak-eilanden-nl.mjs <cbsgebiedsindelingen2026.gpkg> <uitvoermap>
// - per eiland de CBS-gemeente met dezelfde naam (laag gemeente_niet_gegeneraliseerd, ISO-WKB Z, D4);
// - het eilandvlak is het grootste afzonderlijke polygooncomponent (een buitenring met zijn gaten), gekozen op oppervlakte
//   in RD (EPSG:28992, metrisch); in de GEOREF het rangnummer, de oppervlakte en de SHA-256 van de coordinaten;
// - de volgorde west naar oost uit de x (RD) van het zwaartepunt van het eilandvlak; wijkt die af van de tabel, dan stopt het;
// - de eilandengroep heeft geen eigen vlak (D3 a); hoort-bij met herkomst besluit (T1 par. 2.1);
// - schrijft items/eilanden-nl.js; twee keer draaien geeft een byte-gelijk bestand.

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { openBron } from "./bronnen/bron.mjs";
import { leesGpkg, leesGeometrie } from "./bronnen/lees-gpkg.mjs";

var HIER = path.dirname(fileURLToPath(import.meta.url));
var SCRIPT = "tools/topo/maak-eilanden-nl.mjs";
var BRONNEN = JSON.parse(fs.readFileSync(path.join(HIER, "bronnen.json"), "utf8"));
var GEB = BRONNEN.cbsGebiedsindelingen2026;
var LAAG = "gemeente_niet_gegeneraliseerd";
var BESLUIT_GROEP = "T1 par. 2.1: de 5 bewoonde Waddeneilanden (Texel, Vlieland, Terschelling, Ameland, Schiermonnikoog) horen bij de Waddeneilanden";

function fout(t) { throw new Error(t); }
function oppRing(r) { var s = 0; for (var i = 0; i < r.length - 1; i++) s += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]; return s / 2; }
// oppervlakte van een component in m2: de buitenring min de gaten
export function oppComponent(p) { return p.reduce(function(s, r, i) { return s + (i === 0 ? Math.abs(oppRing(r)) : -Math.abs(oppRing(r))); }, 0); }
export function shaComponent(p) { return crypto.createHash("sha256").update(JSON.stringify(p)).digest("hex"); }
// het grootste component: hoogste oppervlakte; bij gelijke oppervlakte het laagste rangnummer
export function grootsteComponent(delen) {
  var best = -1, idx = -1;
  delen.forEach(function(p, i) { var a = oppComponent(p); if (a > best) { best = a; idx = i; } });
  return { deel: idx, oppervlakteM2: best, component: delen[idx] };
}
// zwaartepunt (x) van de buitenring
export function zwaartepuntX(p) {
  var r = p[0], a = 0, cx = 0;
  for (var i = 0; i < r.length - 1; i++) { var k = r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]; a += k; cx += (r[i][0] + r[i + 1][0]) * k; }
  return cx / (3 * a);
}

export async function bouw(gpkgPad) {
  var gpkg = openBron(gpkgPad, "CBSGEB", GEB.gpkg.bestand);
  if (gpkg.sha256 !== GEB.gpkg.sha256) fout("SHA-256 van CBSGEB wijkt af van cbsGebiedsindelingen2026");
  var tabBron = openBron(path.join(HIER, "water-nlbe.json"), "tabellenNlbe", "tools/topo/water-nlbe.json");
  var T = JSON.parse(tabBron.buf.toString("utf8")).eilanden;
  var laag = await leesGpkg(gpkg.buf, LAAG, ["statcode", "statnaam"], "geom", "statcode");
  if (laag.crs !== "EPSG:28992" || laag.records.length !== GEB.lagen[LAAG]) fout("CBSGEB: onverwachte gemeentelaag");
  var perCode = {}; laag.records.forEach(function(r) { perCode[r.kenmerken.statcode] = r; });
  var cbsBron = { id: "CBSGEB", bestand: GEB.gpkg.bestand, sha256: GEB.gpkg.sha256, laag: LAAG, jaargang: GEB.jaargang, gedownload: GEB.gedownload };
  var invoer = [{ bronId: "CBSGEB", sha256: GEB.gpkg.sha256 }, { bronId: "tabellenNlbe", sha256: tabBron.sha256 }];
  var gemeten = Object.keys(T.lid).map(function(id) {
    var code = T.lid[id].statcode, r = perCode[code];
    if (!r) fout("CBSGEB: gemeente niet gevonden: " + code);
    var delen = leesGeometrie(r.geom), g = grootsteComponent(delen);
    return { id: id, code: code, naam: r.kenmerken.statnaam, delen: delen.length, g: g, x: zwaartepuntX(g.component) };
  });
  var volgorde = gemeten.slice().sort(function(a, b) { return a.x - b.x; }).map(function(m) { return m.id; });
  if (volgorde.join() !== T.volgorde.join()) fout("de berekende volgorde west naar oost wijkt af: " + volgorde.join(", "));
  var ITEMS = gemeten.sort(function(a, b) { return a.x - b.x; }).map(function(m, i) {
    if (("eiland-nl-" + m.naam.toLowerCase()) !== m.id) fout("de CBS-naam past niet bij de id: " + m.naam + " " + m.id);
    return {
      id: m.id, soort: "eiland",
      naam: { waarde: m.naam, varianten: [], herkomst: "bron", status: "vastgesteld", bron: { id: "CBSGEB", bestand: cbsBron.bestand, sha256: cbsBron.sha256, laag: LAAG, sleutel: "statcode", waarde: m.code } },
      feiten: {
        land: { waarde: "NLD", herkomst: "bron", status: "vastgesteld", bron: cbsBron },
        volgorde: { waarde: i + 1, herkomst: "afgeleid", status: "vastgesteld", afleiding: { script: SCRIPT, invoer: invoer, regel: "rangnummer van west naar oost op de x (RD) van het zwaartepunt van de buitenring van het eilandvlak" } }
      },
      geometrie: { bron: { bronId: "CBSGEB", bestand: GEB.gpkg.bestand, sha256: GEB.gpkg.sha256, laag: LAAG, sleutel: "statcode", waarde: m.code, crs: "EPSG:28992",
        deel: m.g.deel, delen: m.delen, deelOppervlakteM2: Math.round(m.g.oppervlakteM2), deelSha256: shaComponent(m.g.component),
        afleiding: { script: SCRIPT, invoer: invoer, regel: "het grootste afzonderlijke polygooncomponent (buitenring met gaten) op oppervlakte in RD" } }, kaart: {} },
      relaties: [{ type: "hoort-bij", naar: T.groep.id, kwalificaties: {}, herkomst: "besluit", status: "vastgesteld", besluit: BESLUIT_GROEP }]
    };
  });
  ITEMS.push({
    id: T.groep.id, soort: "eilandengroep",
    naam: { waarde: T.groep.naam, varianten: [], herkomst: "besluit", status: "vastgesteld", besluit: JSON.parse(fs.readFileSync(path.join(HIER, "water-nlbe.json"), "utf8")).naamBesluit },
    feiten: { land: { waarde: "NLD", herkomst: "besluit", status: "vastgesteld", besluit: BESLUIT_GROEP } },
    geometrie: { bron: null, geen: "D3 a: geen eigen vlak; alleen benoemen en hoort-bij", kaart: {} },
    relaties: []
  });
  var AFW = [{ id: "nlbe-eilanden-kleine-delen", soort: "geometrie", tekst: "Waddeneilanden: het eilandvlak is het grootste component van de CBS-gemeente; de kleinere delen (" + gemeten.map(function(m) { return m.naam + " " + (m.delen - 1); }).join(", ") + ", onder andere Griend en Noorderhaaks) horen niet bij het eiland en volgen eventueel in Gevorderd" }];
  return { ITEMS: ITEMS, AFW: AFW };
}

function regel(naam, waarde) { return "export var " + naam + " = " + JSON.stringify(waarde) + ";\n"; }
export function schrijf(uit, r) {
  fs.mkdirSync(path.join(uit, "items"), { recursive: true });
  fs.writeFileSync(path.join(uit, "items", "eilanden-nl.js"), "// GEGENEREERD door tools/topo/maak-eilanden-nl.mjs uit CBS Gebiedsindelingen 2026 (SHA-256 in tools/topo/bronnen.json) en tools/topo/water-nlbe.json; niet met de hand bewerken.\n// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.\n" + regel("EILANDEN_NL", r.ITEMS) + "// punten voor de open lijst (src/core/topo/open-vragen.md)\n" + regel("AFWIJKINGEN_EILANDEN", r.AFW));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  var r = await bouw(process.argv[2]);
  schrijf(process.argv[3], r);
  console.log(JSON.stringify(r.ITEMS.map(function(x) { return x.id + (x.feiten.volgorde ? " " + x.feiten.volgorde.waarde + " deel " + x.geometrie.bron.deel + "/" + x.geometrie.bron.delen + " " + x.geometrie.bron.deelOppervlakteM2 : ""); })));
}

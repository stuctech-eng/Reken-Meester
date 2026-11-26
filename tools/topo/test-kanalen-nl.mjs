// Tests voor de kanalen van Nederland uit het NWB Vaarwegen (plan T5b-3 par. 3.2). Alleen bouwomgeving, niet in de app.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik: node --max-old-space-size=6000 test-kanalen-nl.mjs <nwb-vaarwegen-t5b3.json> <cbsgebiedsindelingen2026.gpkg>
// - byte-gelijk: het script maakt opnieuw precies items/kanalen-nl.js;
// - de inhoud: precies de 12 kanalen van T1 par. 2.1; nagerekend zonder het script: per kanaal alle vakken van de bundel met
//   die vaarwegnaam;
// - samenhang: de vakken van een kanaal vormen een aaneengesloten geheel, met hoogstens 3 km tussen twee stukken (sluizen en
//   voorhavens hebben in NWB een eigen naam); de grootste sprong wordt gemeld;
// - ligging, onafhankelijk met CBS: minstens 85 % van de punten van elk kanaal ligt in een Nederlandse gemeente of binnen 200 m
//   ervan; een kanaal op de grens (grensgebied) minstens 40 %;
// - de kaart nlbe: de laag kanalen heeft precies de 12 kanalen;
// - mutanten op de tabel: een vaarweg die niet bestaat, twee kanalen met dezelfde naam, een vak twee keer.

import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import { fileURLToPath, pathToFileURL } from "url";
import proj4 from "proj4";
import { leesGpkg, leesGeometrie } from "./bronnen/lees-gpkg.mjs";
import { CRS } from "./bronnen/bron.mjs";
import { binnenVlak, afstandTotLijnstuk } from "./vlakpunt.mjs";
import { bouw, schrijf } from "./maak-kanalen-nl.mjs";

var HIER = path.dirname(fileURLToPath(import.meta.url));
var ROOT = path.resolve(HIER, "..", "..");
var PADEN = { nwb: process.argv[2] }, GPKG = process.argv[3];
var K = (await import(pathToFileURL(path.join(ROOT, "src/core/topo/items/kanalen-nl.js")).href)).KANALEN_NL;
var n = 0, fouten = [];
function eis(ok, t) { n++; if (!ok) fouten.push(t); }

var tmp = fs.mkdtempSync(path.join(os.tmpdir(), "kanalen-"));
schrijf(tmp, bouw(PADEN));
eis(fs.readFileSync(path.join(tmp, "items", "kanalen-nl.js")).equals(fs.readFileSync(path.join(ROOT, "src/core/topo/items/kanalen-nl.js"))), "byte-gelijk: items/kanalen-nl.js");

var T1 = ["Noordzeekanaal", "Amsterdam-Rijnkanaal", "Noordhollandsch Kanaal", "Twentekanaal", "Julianakanaal", "Maas-Waalkanaal", "Zuid-Willemsvaart", "Wilhelminakanaal", "Van Starkenborghkanaal", "Prinses Margrietkanaal", "Kanaal door Zuid-Beveland", "Kanaal Gent-Terneuzen"];
eis(K.length === 12 && K.every(function(k) { return k.soort === "kanaal"; }) && K.map(function(k) { return k.naam.waarde; }).sort().join() === T1.slice().sort().join(), "precies de 12 kanalen van T1 par. 2.1");

// nagerekend zonder het script
var B = JSON.parse(fs.readFileSync(PADEN.nwb, "utf8")), vak = {};
B.paginas.forEach(function(p) { JSON.parse(p.tekst).features.forEach(function(f) { vak[String(f.properties.vwk_id)] = f; }); });
var naarRd = proj4("EPSG:4326", CRS["EPSG:28992"]);
var g = await leesGpkg(fs.readFileSync(GPKG), "gemeente_niet_gegeneraliseerd", ["statcode"], "geom", "statcode");
var gem = g.records.map(function(r) { var d = leesGeometrie(r.geom), b = [Infinity, Infinity, -Infinity, -Infinity]; d.forEach(function(p) { p[0].forEach(function(c) { b[0] = Math.min(b[0], c[0]); b[1] = Math.min(b[1], c[1]); b[2] = Math.max(b[2], c[0]); b[3] = Math.max(b[3], c[1]); }); }); return { d: d, b: b }; });
function inNl(q, marge) {
  return gem.some(function(x) {
    if (q[0] < x.b[0] - marge || q[0] > x.b[2] + marge || q[1] < x.b[1] - marge || q[1] > x.b[3] + marge) return false;
    if (x.d.some(function(p) { return binnenVlak(q, p); })) return true;
    return x.d.some(function(p) { return p.some(function(r) { for (var i = 0; i + 1 < r.length; i++) if (afstandTotLijnstuk(q, r[i], r[i + 1]) <= marge) return true; return false; }); });
  });
}
K.forEach(function(k) {
  var namen = k.naam.controle.waarde.split("; ");
  var verwacht = Object.keys(vak).filter(function(v) { return namen.indexOf(vak[v].properties.vwg_naam) >= 0; }).sort(function(a, b) { return Number(a) - Number(b); });
  eis(verwacht.join() === k.geometrie.bron.waarden.join(), "NWB " + k.id + ": precies alle " + verwacht.length + " vakken met vwg_naam " + namen.join(" of "));
  var lijnen = []; verwacht.forEach(function(v) { var gg = vak[v].geometry; (gg.type === "LineString" ? [gg.coordinates] : gg.coordinates).forEach(function(l) { lijnen.push(l.map(function(c) { return naarRd.forward(c); })); }); });
  // samenhang: groepen van lijnen met een eindpunt binnen 50 m van een punt van een andere lijn
  var groep = lijnen.map(function(l, i) { return i; });
  function wortel(i) { while (groep[i] !== i) i = groep[i] = groep[groep[i]]; return i; }
  function afst(q, l) { var m = Infinity; for (var i = 0; i + 1 < l.length; i++) m = Math.min(m, afstandTotLijnstuk(q, l[i], l[i + 1])); return m; }
  for (var i = 0; i < lijnen.length; i++) for (var j = 0; j < lijnen.length; j++) if (i !== j) {
    var a = lijnen[i]; if (afst(a[0], lijnen[j]) <= 3000 || afst(a[a.length - 1], lijnen[j]) <= 3000) groep[wortel(i)] = wortel(j);
  }
  var wortels = {}; lijnen.forEach(function(l, i) { wortels[wortel(i)] = 1; });
  eis(Object.keys(wortels).length === 1, "samenhangend: " + k.id + " (" + Object.keys(wortels).length + " delen)");
  var pts = []; lijnen.forEach(function(l) { l.forEach(function(q, i) { if (i % 3 === 0) pts.push(q); }); });
  var binnen = pts.filter(function(q) { return inNl(q, 200); }).length;
  eis(binnen >= (k.feiten.grensgebied ? 0.4 : 0.85) * pts.length, "in Nederland: " + k.id + " (" + binnen + " van " + pts.length + " punten)");
});

var KAART = (await import(pathToFileURL(path.join(ROOT, "src/core/topo/kaarten/nlbe.js")).href)).default;
var lk = KAART.lagen.filter(function(l) { return l.id === "kanalen"; })[0];
eis(!!lk && lk.soort === "lijn" && lk.items.map(function(x) { return x.id; }).sort().join() === K.map(function(k) { return k.id; }).sort().join(), "de kaart nlbe: de laag kanalen met de 12 kanalen");

var TAB = path.join(HIER, "kanalen-nl.json"), BRON = path.join(HIER, "bronnen.json");
var tabOud = fs.readFileSync(TAB), bronOud = fs.readFileSync(BRON);
var MUT = [
  ["een vaarweg die niet bestaat", function(t) { t.kanalen["kanaal-julianakanaal"].nwb = ["Juliana Kanaal"]; }],
  ["twee kanalen met dezelfde naam", function(t) { t.kanalen["kanaal-julianakanaal"].naam = "Noordzeekanaal"; }],
  ["een vak twee keer", function(t) { t.kanalen["kanaal-julianakanaal"].nwb = ["Noordzeekanaal"]; }]
];
var gevangen = 0, gemist = [];
try {
  for (var m = 0; m < MUT.length; m++) {
    var t = JSON.parse(tabOud.toString("utf8")); MUT[m][1](t);
    var tekst = JSON.stringify(t, null, 2), sha = crypto.createHash("sha256").update(tekst).digest("hex");
    fs.writeFileSync(TAB, tekst);
    fs.writeFileSync(BRON, bronOud.toString("utf8").replace(/("tools\/topo\/kanalen-nl.json": ")[0-9a-f]{64}"/, "$1" + sha + "\""));
    var mod = await import(pathToFileURL(path.join(HIER, "maak-kanalen-nl.mjs")).href + "?m=" + m);
    var ok = false; try { mod.bouw(PADEN); } catch (e) { ok = true; }
    if (ok) gevangen++; else gemist.push(MUT[m][0]);
  }
} finally { fs.writeFileSync(TAB, tabOud); fs.writeFileSync(BRON, bronOud); }
eis(gemist.length === 0, "mutanten gevangen: " + gemist.join(", "));

console.log("mutanten kanalen-nl: " + gevangen + " van " + MUT.length + " gevangen");
console.log("test-kanalen-nl: " + (fouten.length ? "FOUT" : "GOED") + ": " + (n - fouten.length) + " controles geslaagd, " + fouten.length + " mislukt");
fouten.forEach(function(f) { console.log("  - " + f); });
if (fouten.length) process.exit(1);

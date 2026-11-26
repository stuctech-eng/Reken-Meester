// Tests voor de kaart in delen (plan T5c par. 3.3). Alleen bouwomgeving, niet in de app.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik (vanuit de hoofdmap van de repo): node tools/topo/test-kaartdelen.mjs
// - byte-gelijk: maak-kaartdelen.mjs maakt opnieuw precies de bestanden kaarten/nlbe-*.js uit kaarten/nlbe.js;
// - de indeling: elke laag van een deel bestaat op de kaart, en staat in precies een deel;
// - gelijk aan de volledige kaart: de basis uitgepakt geeft precies de achtergrond en de lagen van de basis van kaarten/nlbe.js, en
//   van de lagen van een deel precies de items (id's); elk deel uitgepakt geeft precies zijn lagen van kaarten/nlbe.js;
// - per vaardigheid, in een eigen proces met alleen de basis en de delen van die vaardigheid: elke combinatie (onderdeel, item)
//   geeft een vraag (geen laag van een ander deel nodig);
// - alleen de basis: de kennisitems van elke vaardigheid (het modusscherm) zijn gelijk aan die met de hele kaart;
// - wat het oefenscherm laadt (topoNlbeDelen): de delen tot en met de doelvaardigheid en de volgende; vooruit die daarna;
// - mutanten: een deel met een andere kaartVersie, en een veranderde boog in een deel, worden gevangen.

import fs from "fs";
import os from "os";
import path from "path";
import zlib from "zlib";
import { execFileSync } from "child_process";
import { fileURLToPath, pathToFileURL } from "url";

var HIER = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HIER, "..", "..");
function bron(p) { return pathToFileURL(path.join(ROOT, p)).href; }

// het deelproces: alleen de basis en de delen van een vaardigheid; schrijft het aantal vragen of de fout
if (process.argv[2] === "--vaardigheid") {
  var id = process.argv[3];
  var LADEN = await import(bron("src/core/topo/laden.js")), V = await import(bron("src/core/topo/vaardigheden-nlbe.js"));
  var D = await LADEN.laadTopo(["nlbe"], V.delenVanVaardigheid(id));
  var def = V.TOPO_NLBE_DEFS.filter(function(d) { return d.id === id; })[0], tel = 0;
  D.combinaties(def).forEach(function(c) { var q = D.maakMet(def, def.onderdelen[c.o], c.id); if (q) tel++; });
  console.log("vragen " + tel);
  process.exit(0);
}
if (process.argv[2] === "--alleen-basis") {
  var LADEN2 = await import(bron("src/core/topo/laden.js")), V2 = await import(bron("src/core/topo/vaardigheden-nlbe.js"));
  var D2 = await LADEN2.laadTopo(["nlbe"]);
  var uit = {}; V2.TOPO_NLBE_DEFS.forEach(function(d) { uit[d.id] = d.zonderItems ? [] : D2.sleutelsVanDef(d); });
  console.log(JSON.stringify(uit));
  process.exit(0);
}

var n = 0, fouten = [];
function eis(ok, t) { n++; if (!ok) fouten.push(t); }

var KD = await import(bron("src/core/topo/kaartdelen.js"));
var MK = await import(bron("tools/topo/maak-kaartdelen.mjs"));
var BG = await import(bron("src/core/topo/kaart/bogen.js"));
var FULL = (await import(bron("src/core/topo/kaarten/nlbe.js"))).default;

// byte-gelijk
var tmp = fs.mkdtempSync(path.join(os.tmpdir(), "kaartdelen-"));
var namen = MK.schrijf(tmp, FULL, MK.splits(FULL));
namen.forEach(function(f) { eis(fs.readFileSync(path.join(tmp, f)).equals(fs.readFileSync(path.join(ROOT, "src/core/topo/kaarten", f))), "byte-gelijk: kaarten/" + f); });

// de indeling
var IND = KD.KAARTDELEN.nlbe, gezien = {};
Object.keys(IND).forEach(function(d) { IND[d].forEach(function(l) { eis(!gezien[l], "laag " + l + " in twee delen"); gezien[l] = d; eis(FULL.lagen.some(function(x) { return x.id === l; }), "deel " + d + ": laag " + l + " bestaat"); }); });

// gelijk aan de volledige kaart
function lees(f) { return import(pathToFileURL(path.join(ROOT, "src/core/topo/kaarten", f)).href).then(function(m) { return m.default; }); }
var BASIS = await lees("nlbe-basis.js"), DELEN = {};
for (var d in IND) DELEN[d] = await lees("nlbe-" + d + ".js");
function vergelijk(basis, delen) {
  var vol = BG.pakUit(FULL), b = BG.pakUit(basis), ok = [];
  ok.push(JSON.stringify(vol.achtergrond) === JSON.stringify(b.achtergrond));
  vol.lagen.forEach(function(l, i) {
    var bl = b.lagen[i], deel = KD.deelVanLaag("nlbe", l.id);
    if (deel === "basis") { ok.push(JSON.stringify(l) === JSON.stringify(bl)); return; }
    ok.push(bl.id === l.id && bl.deel === deel && bl.items.map(function(x) { return x.id; }).join() === l.items.map(function(x) { return x.id; }).join());
    var dl = BG.pakDeelUit(basis, delen[deel]).filter(function(x) { return x.id === l.id; })[0];
    ok.push(!!dl && JSON.stringify(dl) === JSON.stringify(l));
  });
  return ok.every(function(x) { return x; });
}
eis(vergelijk(BASIS, DELEN), "basis en delen uitgepakt gelijk aan de volledige kaart nlbe");
eis([BASIS].concat(Object.keys(DELEN).map(function(k) { return DELEN[k]; })).every(function(x) { return x.kaartVersie === FULL.kaartVersie; }), "alle delen met de kaartVersie van de volledige kaart");

// mutanten
var gevangen = 0;
function kopie(o) { return JSON.parse(JSON.stringify(o)); }
var m1 = kopie(DELEN); m1.water.kaartVersie = "0".repeat(64);
try { vergelijk(BASIS, m1); } catch (e) { gevangen++; }
var m2 = kopie(DELEN); m2.water.bogen[0] = m2.water.bogen[0].replace(/^(-?[0-9.]+),/, function(a, x) { return String(Number(x) + 1) + ","; });
var mis2 = false; try { mis2 = !vergelijk(BASIS, m2); } catch (e) { mis2 = true; }
if (mis2) gevangen++;
eis(gevangen === 2, "mutanten kaartdelen: " + gevangen + " van 2 gevangen");

// per vaardigheid in een eigen proces
var V = await import(bron("src/core/topo/vaardigheden-nlbe.js"));
var LADEN = await import(bron("src/core/topo/laden.js"));
var D = await LADEN.laadTopo(["nlbe"], Object.keys(IND).map(function(k) { return "nlbe/" + k; }));
V.TOPO_NLBE_DEFS.forEach(function(def) {
  var uit = "";
  try { uit = execFileSync(process.execPath, [fileURLToPath(import.meta.url), "--vaardigheid", def.id], { encoding: "utf8", maxBuffer: 1 << 24 }); } catch (e) { uit = String(e.stdout || "") + String(e.stderr || ""); }
  var verwacht = D.combinaties(def).length;
  eis(uit.trim() === "vragen " + verwacht, "alleen basis en de delen van " + def.id + " (" + (V.delenVanVaardigheid(def.id).join(", ") || "geen") + "): " + verwacht + " vragen; kreeg: " + uit.trim().slice(0, 200));
});
var alleenBasis = JSON.parse(execFileSync(process.execPath, [fileURLToPath(import.meta.url), "--alleen-basis"], { encoding: "utf8", maxBuffer: 1 << 26 }));
V.TOPO_NLBE_DEFS.forEach(function(def) { if (!def.zonderItems) eis(alleenBasis[def.id].join() === D.sleutelsVanDef(def).join(), "alleen de basis: de kennisitems van " + def.id + " gelijk aan die met de hele kaart"); });

// wat het oefenscherm laadt
var ORDER = V.TOPO_NLBE_ORDER;
function verwachtDelen(doel) {
  var nodig = {}, vooruit = {};
  ORDER.forEach(function(id, i) { if (i <= doel + 1) V.delenVanVaardigheid(id).forEach(function(x) { nodig[x] = 1; }); });
  if (doel + 2 < ORDER.length) V.delenVanVaardigheid(ORDER[doel + 2]).forEach(function(x) { if (!nodig[x]) vooruit[x] = 1; });
  return JSON.stringify({ nodig: Object.keys(nodig).sort(), vooruit: Object.keys(vooruit).sort() });
}
ORDER.forEach(function(id, i) {
  var st = {}; ORDER.slice(0, i).forEach(function(x) { st[x] = { mastered: true }; });
  eis(JSON.stringify(V.topoNlbeDelen(st, null)) === verwachtDelen(i), "oefenen tot en met " + id + ": de juiste delen");
  eis(JSON.stringify(V.topoNlbeDelen({}, id)) === verwachtDelen(i), "los oefenen " + id + ": de juiste delen");
});
V.TOPO_NLBE_DEFS.forEach(function(def) {
  def.onderdelen.forEach(function(o) { if (o.kaart && o.laag) { var dl = KD.deelVanLaag(o.kaart, o.laag); eis(dl === "basis" || V.delenVanVaardigheid(def.id).indexOf(o.kaart + "/" + dl) >= 0, def.id + ": het deel van de laag " + o.laag); } });
});

// omvang
function gz(f) { return zlib.gzipSync(fs.readFileSync(path.join(ROOT, "src/core/topo/kaarten", f))).length; }
console.log("omvang gzip: volledig " + gz("nlbe.js") + "; " + namen.map(function(f) { return f + " " + gz(f); }).join(", "));
console.log("delen per vaardigheid: " + V.TOPO_NLBE_DEFS.map(function(d) { return d.id + " " + (V.delenVanVaardigheid(d.id).join("+") || "-"); }).join(", "));
console.log("test-kaartdelen: " + (fouten.length ? "FOUT" : "GOED") + ": " + (n - fouten.length) + " controles geslaagd, " + fouten.length + " mislukt");
fouten.forEach(function(f) { console.log("  - " + f); });
if (fouten.length) process.exit(1);

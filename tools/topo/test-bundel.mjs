// Test van het dynamisch laden van Topografie (plan T3 par. 3.1 en par. 5). Bouwt de app twee keer met Vite (preview en
// productie) en kijkt per bundel welke bronbestanden erin zitten.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik (vanuit de hoofdmap van de repo, na npm ci): node tools/topo/test-bundel.mjs
// Eisen:
//   - de standaardbundel (de bundel die index.html laadt, met alles wat die statisch importeert) bevat niets uit
//     src/core/topo/ behalve beheersing.js (T4), kaartdelen.js (T5c), laden.js, vaardigheden-nlbe.js en zichtbaar.js, en niet
//     KaartAntwoord.jsx of een kaartbestand;
//   - T5c: de kaart nlbe zit in de app alleen in delen (basis, water, gebieden, grens), elk in een eigen bundel; de volledige kaart
//     (kaarten/nlbe.js, voor de tests en de proefpagina) zit in geen enkele bundel;
//   - de kennisbank, de sjablonen, de tikregel, de kaarten en KaartAntwoord.jsx zitten in een bundel die pas met import() laadt;
//   - productie en preview: de modus topo_nlbe staat in de app (sinds 25-11-2026, na T4);
//   - met TOPO_UIT=1: Topografie staat niet in de app (de modus is weggelaten bij het bouwen);
//   - de groei van de standaardbundel tegen de vorige commit (BASIS, optioneel: een map met een build van die commit) in bytes.
// Mutant: een statische import van KaartAntwoord in het oefenscherm moet de eerste eis laten falen.

import path from "path";
import fs from "fs";
import zlib from "zlib";
import { fileURLToPath } from "url";
import { build } from "vite";

var HIER = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.join(HIER, "..", "..");
var TOEGESTAAN = ["src/core/topo/beheersing.js", "src/core/topo/kaartdelen.js", "src/core/topo/laden.js", "src/core/topo/vaardigheden-nlbe.js", "src/core/topo/zichtbaar.js"];
var n = 0, fouten = [];
function eis(ok, tekst) { n++; if (!ok) fouten.push(tekst); }

async function bouw(vercelEnv, mutant, uit) {
  var chunks = null;
  var oud = process.env.VERCEL_ENV, oudUit = process.env.TOPO_UIT;
  if (vercelEnv) process.env.VERCEL_ENV = vercelEnv; else delete process.env.VERCEL_ENV;
  if (uit) process.env.TOPO_UIT = "1"; else delete process.env.TOPO_UIT;
  var plugins = [{
    name: "bundel-meting",
    generateBundle: function(o, bundel) { chunks = Object.keys(bundel).map(function(k) { return bundel[k]; }).filter(function(c) { return c.type === "chunk"; }); },
  }];
  if (mutant) plugins.push({
    name: "mutant-statische-import",
    transform: function(code, id) {
      if (/PracticeScreen\.jsx$/.test(id)) return 'import KaartAntwoordMutant from "../components/answer/KaartAntwoord.jsx";\nwindow.__MUTANT = KaartAntwoordMutant;\n' + code;
      return null;
    },
  });
  await build({ root: ROOT, logLevel: "silent", configFile: path.join(ROOT, "vite.config.js"), build: { write: false }, plugins: plugins });
  if (oud === undefined) delete process.env.VERCEL_ENV; else process.env.VERCEL_ENV = oud;
  if (oudUit === undefined) delete process.env.TOPO_UIT; else process.env.TOPO_UIT = oudUit;
  return chunks;
}

function rel(id) { return path.relative(ROOT, id).split(path.sep).join("/"); }

// De standaardbundel: de ingang en alles wat die statisch importeert (niet via import())
function standaard(chunks) {
  var perNaam = {}; chunks.forEach(function(c) { perNaam[c.fileName] = c; });
  var ingang = chunks.filter(function(c) { return c.isEntry; })[0], gezien = {}, rij = [ingang];
  while (rij.length) { var c = rij.pop(); if (gezien[c.fileName]) continue; gezien[c.fileName] = c; (c.imports || []).forEach(function(f) { if (perNaam[f]) rij.push(perNaam[f]); }); }
  return Object.keys(gezien).map(function(k) { return gezien[k]; });
}

function controleer(naam, chunks) {
  var std = standaard(chunks), mods = [];
  std.forEach(function(c) { Object.keys(c.modules).forEach(function(m) { mods.push(rel(m)); }); });
  var verboden = mods.filter(function(m) { return (m.indexOf("src/core/topo/") === 0 && TOEGESTAAN.indexOf(m) < 0) || /KaartAntwoord\.jsx$/.test(m); });
  return { std: std, mods: mods, verboden: verboden };
}

var preview = await bouw("preview", false), r = controleer("preview", preview);
eis(r.verboden.length === 0, "preview: niets uit src/core/topo/ (behalve laden, vaardigheden, zichtbaar) of KaartAntwoord in de standaardbundel: " + r.verboden.join(", "));
var lazyMods = {}; preview.forEach(function(c) { if (r.std.indexOf(c) < 0) Object.keys(c.modules).forEach(function(m) { lazyMods[rel(m)] = c.fileName; }); });
["src/core/topo/data.js", "src/core/topo/items/landen.js", "src/core/topo/sjablonen/wijs-aan.js", "src/core/topo/kaart/tikregel.js", "src/core/topo/kaart/bogen.js", "src/core/topo/kaart/beeld.js", "src/core/topo/kaarten/nlbe-basis.js", "src/core/topo/kaarten/nlbe-water.js", "src/core/topo/kaarten/nlbe-gebieden.js", "src/core/topo/kaarten/nlbe-grens.js", "src/components/answer/KaartAntwoord.jsx"].forEach(function(m) {
  eis(!!lazyMods[m], "preview: " + m + " zit in een bundel die pas met import() laadt");
});
eis(!lazyMods["src/core/topo/kaarten/nlbe.js"] && r.mods.indexOf("src/core/topo/kaarten/nlbe.js") < 0, "preview: de volledige kaart nlbe zit in geen bundel");
var deelBundels = ["nlbe-basis", "nlbe-water", "nlbe-gebieden", "nlbe-grens"].map(function(d) { return lazyMods["src/core/topo/kaarten/" + d + ".js"]; });
eis(deelBundels.every(function(b) { return !!b; }) && deelBundels.filter(function(b, i) { return deelBundels.indexOf(b) === i; }).length === 4, "preview: elk deel van de kaart nlbe in een eigen bundel: " + deelBundels.join(", "));
var stdCode = r.std.map(function(c) { return c.code; }).join("\n");
eis(stdCode.indexOf("topo_nlbe") >= 0, "preview: de modus topo_nlbe staat in de app");

var prod = await bouw(undefined, false), p = controleer("productie", prod);
eis(p.verboden.length === 0, "productie: niets uit src/core/topo/ (behalve de toegestane) of KaartAntwoord in de standaardbundel: " + p.verboden.join(", "));
var prodCode = p.std.map(function(c) { return c.code; }).join("\n");
eis(prodCode.indexOf("Provincies, steden en buren aanwijzen op de kaart") >= 0, "productie: de modus topo_nlbe staat in de app");
var uitB = await bouw(undefined, false, true), u = controleer("uit", uitB);
var uitCode = u.std.map(function(c) { return c.code; }).join("\n");
eis(uitCode.indexOf("Provincies, steden en buren aanwijzen op de kaart") < 0, "TOPO_UIT=1: de modus topo_nlbe is weggelaten");

var mut = await bouw("preview", true), m = controleer("mutant", mut);
eis(m.verboden.length > 0, "mutant statische import van KaartAntwoord gevangen");

function omvang(chunks) { var c = chunks.map(function(x) { return x.code; }).join(""); return { bytes: Buffer.byteLength(c), gzip: zlib.gzipSync(Buffer.from(c), { level: 9 }).length }; }
var op = omvang(p.std), ov = omvang(r.std);
console.log("standaardbundel productie: " + op.bytes + " bytes, gzip " + op.gzip + "; preview: " + ov.bytes + " bytes, gzip " + ov.gzip);
if (process.env.BASIS && fs.existsSync(process.env.BASIS)) {
  var basis = fs.readdirSync(path.join(process.env.BASIS, "assets")).filter(function(f) { return /^index-.*\.js$/.test(f); }).map(function(f) { return fs.readFileSync(path.join(process.env.BASIS, "assets", f)); });
  var bb = Buffer.concat(basis);
  console.log("vorige commit: " + bb.length + " bytes, gzip " + zlib.gzipSync(bb, { level: 9 }).length + "; groei productie " + (op.bytes - bb.length) + " bytes");
}
console.log("bundels die pas laden bij Topografie: " + preview.filter(function(c) { return r.std.indexOf(c) < 0; }).map(function(c) { return c.fileName + " " + Buffer.byteLength(c.code); }).join(", "));

console.log("test-bundel: " + (fouten.length ? "FOUT" : "GOED") + ": " + (n - fouten.length) + " controles geslaagd, " + fouten.length + " mislukt");
fouten.forEach(function(f) { console.log("  - " + f); });
if (fouten.length) process.exit(1);

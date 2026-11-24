// Test van de nakijkregel voor namen (plan T3 par. 3.3; grading.js, naam_varianten). Alleen bouwomgeving, in Node.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik (vanuit de hoofdmap van de repo): node tools/topo/test-namen.mjs
// Een tabel met invoer en verwachte uitkomst (leeg, goed, een ander gebied, bijna goed, fout), met alle vier de bewerkingen,
// twee bewerkingen, een korte naam en "bijna goed bij twee gebieden". Daarna mutanten van de regel, die de tabel moet vangen:
// een accent telt mee, de varianten vergeten, bijna goed telt als goed, stap 3 na stap 4, omwisselen niet herkend.

import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

var HIER = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.join(HIER, "..", "..");
var GR = await import(pathToFileURL(path.join(ROOT, "src/core/grading.js")).href);
var n = 0, fouten = [];
function eis(ok, tekst) { n++; if (!ok) fouten.push(tekst); }

var DEN_BOSCH = { answer: "'s-Hertogenbosch", namen: { juist: ["'s-Hertogenbosch", "Den Bosch"], anderen: [["Utrecht"], ["Groningen"], ["Den Haag", "'s-Gravenhage"]] } };
var UTRECHT = { answer: "Utrecht", namen: { juist: ["Utrecht"], anderen: [["Groningen"], ["Zeeland"], ["Limburg"]] } };
var FRIESLAND = { answer: "Friesland", namen: { juist: ["Friesland", "Fryslân"], anderen: [["Groningen"], ["Drenthe"]] } };
var LUIK = { answer: "Luik", namen: { juist: ["Luik", "Liège"], anderen: [["Namen", "Namur"]] } };
var TWEELING = { answer: "Abcdef", namen: { juist: ["Abcdef"], anderen: [["Abcdeg"]] } };

// [vraag, invoer, verwacht: "leeg" | "goed" | "ander" | "bijna" | "fout"]
var TABEL = [
  [UTRECHT, "", "leeg"], [UTRECHT, "   ", "leeg"],
  [UTRECHT, "Utrecht", "goed"], [UTRECHT, "utrecht", "goed"], [UTRECHT, " UTRECHT ", "goed"],
  [DEN_BOSCH, "'s-Hertogenbosch", "goed"], [DEN_BOSCH, "s hertogenbosch", "goed"], [DEN_BOSCH, "shertogenbosch", "goed"], [DEN_BOSCH, "Den Bosch", "goed"], [DEN_BOSCH, "den-bosch", "goed"], [DEN_BOSCH, "’s Hertogenbosch", "goed"],
  [FRIESLAND, "Fryslan", "goed"], [FRIESLAND, "fryslân", "goed"],
  [LUIK, "liege", "goed"],
  [DEN_BOSCH, "Den Haag", "ander"], [DEN_BOSCH, "s-gravenhage", "ander"], [UTRECHT, "Groningen", "ander"],
  [UTRECHT, "Utrect", "bijna"], [UTRECHT, "Utrechtt", "bijna"], [UTRECHT, "Utrekht", "bijna"], [UTRECHT, "Utercht", "bijna"],
  [DEN_BOSCH, "s-hertogenbosh", "bijna"], [FRIESLAND, "Freisland", "bijna"],
  [UTRECHT, "Uterchtt", "fout"], [UTRECHT, "Amsterdam", "fout"], [UTRECHT, "Utr", "fout"],
  [LUIK, "Liuk", "fout"],
  [TWEELING, "Abcdex", "fout"], [TWEELING, "Abcdef", "goed"], [TWEELING, "Abcdeg", "ander"],
];

function uitkomst(regel, vraag, invoer) {
  var r = regel(invoer, vraag);
  if (!r.geldig) return "leeg";
  if (r.goed) return r.waarde === vraag.answer ? "goed" : "goed-maar-waarde-verkeerd";
  if (r.waarde === vraag.answer) return "fout-maar-waarde-is-antwoord";
  var n = GR.naamNorm(invoer), ander = vraag.namen.anderen.some(function(g) { return g.some(function(x) { return GR.naamNorm(x) === n; }); });
  return r.bijna ? "bijna" : ander ? "ander" : "fout";
}
function draai(regel) {
  var mis = [];
  TABEL.forEach(function(t) { var u = uitkomst(regel, t[0], t[1]); if (u !== t[2]) mis.push(JSON.stringify(t[1]) + " bij " + t[0].answer + ": " + u + " (verwacht " + t[2] + ")"); });
  return mis;
}

var echt = draai(GR.naamNakijken);
eis(echt.length === 0, "de tabel klopt (" + TABEL.length + " gevallen): " + echt.join("; "));
eis(GR.gradeTyped("naam_varianten", "s hertogenbosch", DEN_BOSCH, {}).goed === true, "gradeTyped gebruikt de naamregel");

// eenBewerking los
[["utrecht", "utrect", true], ["utrecht", "utrechtt", true], ["utrecht", "utrekht", true], ["utrecht", "utercht", true], ["utrecht", "utrecht", false], ["utrecht", "uterchtt", false], ["abc", "cba", false]].forEach(function(t) {
  eis(GR.eenBewerking(t[0], t[1]) === t[2], "eenBewerking " + t[0] + " / " + t[1] + " = " + t[2]);
});

// mutanten van de regel
function normZonderAccenten(s) { return String(s).toLowerCase().replace(/[\s\-'‘’`´.]/g, ""); }
function mutant(opties) {
  return function(invoer, vraag) {
    var norm = opties.accent ? normZonderAccenten : GR.naamNorm;
    var x = norm(invoer || "");
    if (x === "") return { geldig: false, goed: false, waarde: null };
    var juist = (opties.zonderVarianten ? [vraag.namen.juist[0]] : vraag.namen.juist).map(norm), anderen = [];
    vraag.namen.anderen.forEach(function(g) { g.forEach(function(y) { anderen.push(norm(y)); }); });
    var een = opties.geenOmwissel ? function(a, b) { return GR.eenBewerking(a, b) && a.split("").sort().join("") !== b.split("").sort().join(""); } : GR.eenBewerking;
    var ruw = String(invoer).trim();
    if (juist.indexOf(x) >= 0) return { geldig: true, goed: true, waarde: vraag.answer };
    var bijna = norm(vraag.answer).length >= 5 && juist.some(function(y) { return een(y, x); }) && !anderen.some(function(y) { return een(y, x); });
    if (opties.bijnaGoed && bijna) return { geldig: true, goed: true, waarde: vraag.answer };
    if (opties.stap3Na4 && bijna) return { geldig: true, goed: false, waarde: ruw, bijna: true };
    if (anderen.indexOf(x) >= 0) return { geldig: true, goed: false, waarde: ruw, bijna: false };
    return { geldig: true, goed: false, waarde: ruw, bijna: bijna };
  };
}
[["een accent telt mee", { accent: true }], ["varianten vergeten", { zonderVarianten: true }], ["bijna goed telt als goed", { bijnaGoed: true }],
 ["omwisselen niet herkend", { geenOmwissel: true }]].forEach(function(m) {
  eis(draai(mutant(m[1])).length > 0, "mutant " + m[0] + " gevangen");
});
// stap 3 na stap 4: een naam van een ander gebied die ook een bewerking van het juiste is (bijvoorbeeld Limburg tegen Limburgg niet;
// hier: een andere provincie "Utrechts" naast Utrecht) moet "ander" blijven
var BUREN = { answer: "Utrecht", namen: { juist: ["Utrecht"], anderen: [["Utrechts"]] } };
eis(uitkomst(GR.naamNakijken, BUREN, "Utrechts") === "ander", "een naam van een ander gebied is nooit bijna goed (stap 3 voor stap 4)");
eis(uitkomst(mutant({ stap3Na4: true }), BUREN, "Utrechts") !== "ander", "mutant stap 3 na stap 4 gevangen");

console.log("test-namen: " + (fouten.length ? "FOUT" : "GOED") + ": " + (n - fouten.length) + " controles geslaagd, " + fouten.length + " mislukt");
fouten.forEach(function(f) { console.log("  - " + f); });
if (fouten.length) process.exit(1);

// Test van Topografie in de app, stap T3b (plan T3 par. 3.1 tot en met 3.4 en par. 5). Alleen bouwomgeving, in Node.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik (vanuit de hoofdmap van de repo): node tools/topo/test-topo-app.mjs
// - tikregel: src/core/topo/kaart/tikregel.js is onder de kop letterlijk gelijk aan public/kaartproef/tikregel.js;
// - laden: laadTopo(["nlbe"]) zet de kaart klaar; topo() werkt pas daarna;
// - identiteit: binnen elke laag geen twee gebieden met dezelfde naam, ook niet na normalisatie; elke naam komt uit de kennisbank;
//   de volgorde van de items doet er niet toe (raster van tikken met de omgekeerde volgorde: dezelfde uitkomst);
// - S2 wijs-aan: per vaardigheid 2.000 vragen, elk opnieuw nagerekend: het antwoord is naamVan(antwoordId), het gebied hoort bij
//   de vraagset, de keuzes zijn verschillend, bevatten het antwoord en komen uit de vraagset; elk gebied komt in de eerste ronde langs;
// - invoer: resolveInput geeft "kaart" bij een volledige vraag en Kiezen zonder antwoordId;
// - rand: ringen kleiner dan 1 px2 op het scherm krijgen geen rand (gemeld per laag bij x1); het vlak houdt alle ringen.
// Mutanten: een andere naam dan de kennisbank, een antwoordId buiten de laag, een dubbele keuze en een naam die twee keer in een
// laag staat moeten gevangen worden.

import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

var HIER = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.join(HIER, "..", "..");
function bron(p) { return pathToFileURL(path.join(ROOT, p)).href; }
var n = 0, fouten = [];
function eis(ok, tekst) { n++; if (!ok) fouten.push(tekst); }

// tikregel gelijk aan de proef
var app = fs.readFileSync(path.join(ROOT, "src/core/topo/kaart/tikregel.js"), "utf8").split("\n").slice(2).join("\n");
var proef = fs.readFileSync(path.join(ROOT, "public/kaartproef/tikregel.js"), "utf8").split("\n").slice(1).join("\n");
eis(app === proef, "tikregel in de app gelijk aan de tikregel van de proef");

var LADEN = await import(bron("src/core/topo/laden.js"));
var gooit = false; try { LADEN.topo(); } catch (e) { gooit = true; }
eis(gooit, "topo() gooit een fout voordat Topografie geladen is");
var D = await LADEN.laadTopo(["nlbe"]);
eis(LADEN.topo() === D, "na laadTopo geeft topo() de geladen gegevens");
var TR = await import(bron("src/core/topo/kaart/tikregel.js"));
var BE = await import(bron("src/core/topo/kaart/beeld.js"));
var V = await import(bron("src/core/topo/vaardigheden-nlbe.js"));
var IR = await import(bron("src/core/inputResolve.js"));
var K = D.kaart("nlbe");

function norm(s) { return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[\s\-'’.]/g, ""); }

// identiteit: namen per laag
function namenUniek(laag) {
  var exact = {}, gn = {}, dubbel = [];
  laag.items.forEach(function(it) {
    if (exact[it.naam]) dubbel.push(it.naam); exact[it.naam] = 1;
    var k = norm(it.naam); if (gn[k] && gn[k] !== it.id) dubbel.push(it.naam + " (genormaliseerd)"); gn[k] = it.id;
  });
  return dubbel;
}
K.lagen.forEach(function(l) {
  var dubbel = namenUniek(l);
  eis(dubbel.length === 0, "laag " + l.id + ": geen dubbele namen (" + dubbel.join(", ") + ")");
  l.items.forEach(function(it, i) {
    eis(it.naam === D.naamVan(it.id) && it.naam === D.item(it.id).naam.waarde, "laag " + l.id + ": naam van " + it.id + " uit de kennisbank");
    eis(l.doelen[i].id === it.id && l.doelen[i].naam === it.naam, "laag " + l.id + ": doel " + i + " hoort bij item " + it.id);
  });
});
// mutant: een naam die twee keer in een laag staat
var mutLaag = { items: K.lagen[0].items.slice(0, 2).map(function(it) { return { id: it.id, naam: "Zelfde" }; }) };
eis(namenUniek(mutLaag).length > 0, "mutant dubbele naam in een laag gevangen");

// identiteit: de volgorde van de doelen doet er niet toe
["provincies-nl", "steden", "landen", "rivieren", "waddeneilanden"].forEach(function(lid) {
  var l = D.laag("nlbe", lid), om = l.doelen.slice().reverse(), s = 396 / K.breedte, versch = 0, tikken = 0;
  for (var y = 0; y < K.hoogte * s; y += 6) for (var x = 0; x < K.breedte * s; x += 6) {
    var a = TR.beslis(l.doelen, s, x, y), b = TR.beslis(om, s, x, y); tikken++;
    var ua = a.uitkomst === "gekozen" ? a.doel.id : a.uitkomst, ub = b.uitkomst === "gekozen" ? b.doel.id : b.uitkomst;
    if (ua !== ub) versch++;
  }
  eis(versch === 0, "laag " + lid + ": omgekeerde volgorde geeft dezelfde uitkomst bij " + tikken + " tikken (" + versch + " verschillen)");
});

// S2 wijs-aan: 2.000 vragen per vaardigheid
function controleerVraag(def, q, ids) {
  var f = [];
  try { if (q.answer !== D.naamVan(q.kaart.antwoordId)) f.push("antwoord is niet naamVan(antwoordId)"); } catch (e) { f.push("antwoordId niet in de kennisbank"); }
  if (ids.indexOf(q.kaart.antwoordId) < 0) f.push("antwoordId buiten de vraagset");
  if (q.kaart.kaart !== def.kaart || q.kaart.laag !== def.laag) f.push("kaart of laag past niet");
  if (q.question !== "Tik " + def.soortwoord + " " + q.answer + " aan.") f.push("vraagtekst");
  var namen = ids.map(D.naamVan);
  if (q.choices.length !== Math.min(4, ids.length)) f.push("aantal keuzes");
  if (q.choices.indexOf(q.answer) < 0) f.push("het antwoord staat niet bij de keuzes");
  if (new Set(q.choices).size !== q.choices.length) f.push("dubbele keuze");
  if (q.choices.some(function(c) { return namen.indexOf(c) < 0; })) f.push("keuze buiten de vraagset");
  if (!q.tekstVraag) f.push("geen tekstVraag");
  return f;
}
for (var def of V.TOPO_NLBE_DEFS) {
  var l = D.laag(def.kaart, def.laag), ids = l.items.filter(function(it) { return !def.prefix || it.id.indexOf(def.prefix) === 0; }).map(function(it) { return it.id; });
  var skill = V.TOPO_NLBE_SKILLS.filter(function(x) { return x.id === def.id; })[0], gezien = {}, slecht = [], eersteRonde = {};
  for (var i = 0; i < 2000; i++) {
    await Promise.resolve();   // een nieuw rekenmoment: elke aanroep is een getoonde vraag (flow.js, currentTick)
    var q = skill.generate();
    if (i < ids.length) eersteRonde[q.kaart.antwoordId] = 1;
    gezien[q.kaart.antwoordId] = 1;
    var f = controleerVraag(def, q, ids);
    if (f.length && slecht.length < 3) slecht.push(i + ": " + f.join("; "));
  }
  eis(slecht.length === 0, def.id + ": 2000 vragen kloppen (" + slecht.join(" | ") + ")");
  eis(Object.keys(eersteRonde).length === ids.length, def.id + ": elk van de " + ids.length + " gebieden komt in de eerste ronde langs (" + Object.keys(eersteRonde).length + ")");
  eis(skill.inputType === "kaart" && skill.gradingRule === "kaart_item", def.id + ": invoer aanwijzen");
  eis(["strategy", "tip", "uitleg", "voorbeeld", "label", "desc"].every(function(k) { return typeof skill[k] === "string" && skill[k].length > 3; }), def.id + ": label, desc, strategy, tip, uitleg en voorbeeld (het oefenscherm toont ze)");
  console.log(def.id + ": " + ids.length + " gebieden, minCorrect " + def.minCorrect);
  // mutanten van de vraagcontrole
  await Promise.resolve();
  var q0 = skill.generate();
  var m1 = Object.assign({}, q0, { answer: q0.answer + "x" }), m2 = Object.assign({}, q0, { kaart: Object.assign({}, q0.kaart, { antwoordId: "prov-nl-pv99" }) }), m3 = Object.assign({}, q0, { choices: [q0.answer, q0.answer].concat(q0.choices.slice(2)) });
  eis(controleerVraag(def, m1, ids).length > 0, def.id + ": mutant andere naam gevangen");
  eis(controleerVraag(def, m2, ids).length > 0, def.id + ": mutant antwoordId buiten de laag gevangen");
  eis(controleerVraag(def, m3, ids).length > 0, def.id + ": mutant dubbele keuze gevangen");
  // invoer
  var r1 = IR.resolveInput("topo_nlbe", def.id, Object.assign({ inputType: "kaart" }, q0));
  eis(r1.inputType === "kaart" && r1.gradingRule === "kaart_item", def.id + ": resolveInput geeft aanwijzen");
  var r2 = IR.resolveInput("topo_nlbe", def.id, Object.assign({ inputType: "kaart" }, q0, { kaart: { kaart: "nlbe", laag: def.laag } }));
  eis(r2.inputType === "choice", def.id + ": zonder antwoordId Kiezen");
}

// rand: ringen zonder oppervlakte krijgen geen rand
var s1 = 396 / K.breedte, regels = [];
K.lagen.concat([{ id: "achtergrond", items: K.achtergrond, soort: "vlak" }]).forEach(function(l) {
  if (l.soort !== "vlak") return;
  var alle = 0, rand = 0;
  l.items.forEach(function(it) {
    alle += it.delen.length;
    var r = BE.randPad(it.delen, s1);
    rand += r ? r.split("M").length - 1 : 0;
    eis(it.delen.map(function(x) { return x.d; }).join("") === it.d, "laag " + l.id + ": de ringen van " + it.id + " vormen samen het pad");
  });
  regels.push(l.id + " " + rand + " van " + alle + " ringen met rand");
});
console.log("rand bij x1 (396 px): " + regels.join("; "));
var proefRing = [{ d: "M0,0l10,0 0,10 -10,0Z", opp: 100 }, { d: "M5,5l0.001,0 0,0.001Z", opp: 0.0000005 }];
eis(BE.randPad(proefRing, 1) === "M0,0l10,0 0,10 -10,0Z", "randPad laat een ring zonder oppervlakte weg");
eis(BE.randPad(proefRing, 2000) === proefRing[0].d + proefRing[1].d, "randPad toont de ring als hij ingezoomd groot genoeg is");

console.log("test-topo-app: " + (fouten.length ? "FOUT" : "GOED") + ": " + (n - fouten.length) + " controles geslaagd, " + fouten.length + " mislukt");
fouten.forEach(function(f) { console.log("  - " + f); });
if (fouten.length) process.exit(1);

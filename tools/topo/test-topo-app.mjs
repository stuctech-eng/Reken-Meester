// Test van Topografie in de app, stappen T3b en T3c (plan T3 par. 3.1 tot en met 3.4 en par. 5). Alleen bouwomgeving, in Node.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Gebruik (vanuit de hoofdmap van de repo): node tools/topo/test-topo-app.mjs
// - tikregel: src/core/topo/kaart/tikregel.js is onder de kop letterlijk gelijk aan public/kaartproef/tikregel.js;
// - laden: laadTopo(["nlbe"]) zet de kaart klaar; topo() werkt pas daarna;
// - identiteit: binnen elke laag geen twee gebieden met dezelfde naam, ook niet na normalisatie; elke naam komt uit de kennisbank;
//   de volgorde van de items doet er niet toe (raster van tikken met de omgekeerde volgorde: dezelfde uitkomst);
// - vaardigheden (S1 benoem, S2 wijs-aan, S3 relatie): per vaardigheid 2.000 vragen, elk opnieuw nagerekend op de kennisbank: het
//   antwoord, de vraagset, de vraagtekst, de keuzes (verschillend, met het antwoord, uit de toegestane namen; bij S3 nooit een ander
//   juist antwoord), de invoer (resolveInput); elke combinatie van onderdeel en item komt in de eerste ronde langs; minCorrect;
// - namen: geen normalisatiebotsing per laag, ook niet met de varianten;
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

var GR = await import(bron("src/core/grading.js"));
function norm(s) { return GR.naamNorm(s); }

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

// De vaardigheden: per vaardigheid 2.000 vragen, elk opnieuw nagerekend op de kennisbank (per sjabloon)
var VS = await import(bron("src/core/topo/sjablonen/wijs-aan.js"));
var RS = await import(bron("src/core/topo/sjablonen/relatie.js"));
var RBRON = { relaties: D.relaties, ids: D.ids, naamVan: D.naamVan };
function sleutel(q) {
  if (q.relatie) return "relatie|" + q.relatie.relatie + "|" + q.relatie.gevraagd + "|" + q.relatie.genoemd;
  return (q.kaart.stand === "toon" ? "benoem|" : "wijs-aan|") + q.kaart.laag + "|" + q.kaart.antwoordId;
}
function onderdeelVan(def, q) {
  return def.onderdelen.filter(function(o) {
    if (q.relatie) return o.sjabloon === "relatie" && o.relatie === q.relatie.relatie && o.gevraagd === q.relatie.gevraagd;
    return o.sjabloon === (q.kaart.stand === "toon" ? "benoem" : "wijs-aan") && o.laag === q.kaart.laag && (!o.prefix || q.kaart.antwoordId.indexOf(o.prefix) === 0) && !(o.zonder && o.zonder.indexOf(q.kaart.antwoordId) >= 0);
  })[0];
}
function controleerKeuzes(q, toegestaan, f) {
  if (q.choices.indexOf(q.answer) < 0) f.push("het antwoord staat niet bij de keuzes");
  if (new Set(q.choices).size !== q.choices.length) f.push("dubbele keuze");
  if (q.choices.some(function(c) { return toegestaan.indexOf(c) < 0; })) f.push("keuze buiten de toegestane namen");
}
function controleerVraag(def, q) { try { return controleerVraagRuw(def, q); } catch (e) { return ["fout: " + e.message]; } }
function controleerVraagRuw(def, q) {
  var f = [], o = onderdeelVan(def, q);
  if (!o) return ["geen onderdeel van " + def.id];
  if (!q.tekstVraag) f.push("geen tekstVraag");
  if (o.sjabloon === "relatie") {
    var juist = RS.juisteIds(RBRON, o, q.relatie.genoemd);
    if (juist.indexOf(q.relatie.antwoordId) < 0) f.push("antwoord staat niet in de relatie");
    try { if (q.answer !== D.naamVan(q.relatie.antwoordId)) f.push("antwoord is niet naamVan(antwoordId)"); } catch (e) { f.push("antwoordId niet in de kennisbank"); }
    if (q.question !== o.tekst(D.naamVan(q.relatie.genoemd))) f.push("vraagtekst");
    var pool = RS.poolIds(RBRON, o, q.relatie.genoemd).filter(function(x) { return juist.indexOf(x) < 0; }).map(function(x) { return D.naamVan(x); });
    var andereJuiste = juist.filter(function(x) { return x !== q.relatie.antwoordId; }).map(D.naamVan);
    if (q.choices.some(function(c) { return andereJuiste.indexOf(c) >= 0; })) f.push("een ander juist antwoord staat bij de keuzes");
    controleerKeuzes(q, pool.concat([q.answer]), f);
    if (q.choices.length !== Math.min(4, pool.length + 1)) f.push("aantal keuzes");
    if (q.kaart || q.inputType) f.push("relatievraag met kaart of invoer");
    return f;
  }
  var ids = VS.vraagIds(D.laag(o.kaart, o.laag), o.prefix, o.zonder), namen = ids.map(function(x) { return D.naamVan(x); });
  try { if (q.answer !== D.naamVan(q.kaart.antwoordId)) f.push("antwoord is niet naamVan(antwoordId)"); } catch (e) { f.push("antwoordId niet in de kennisbank"); }
  if (ids.indexOf(q.kaart.antwoordId) < 0) f.push("antwoordId buiten de vraagset");
  if (q.kaart.kaart !== o.kaart || q.kaart.laag !== o.laag) f.push("kaart of laag past niet");
  if (JSON.stringify(q.kaart.focus) !== JSON.stringify(D.omhulling(o.kaart, o.laag, ids))) f.push("focus is niet de omhullende van de vraagset");
  controleerKeuzes(q, namen, f);
  if (q.choices.length !== Math.min(4, ids.length)) f.push("aantal keuzes");
  if (o.sjabloon === "wijs-aan") {
    if (q.question !== "Tik " + o.soortwoord + " " + q.answer + " aan.") f.push("vraagtekst");
    if (q.inputType !== "kaart" || q.gradingRule !== "kaart_item") f.push("invoer is niet aanwijzen");
  } else {
    if (q.question !== o.vraag) f.push("vraagtekst");
    if (q.kaart.stand !== "toon") f.push("kaart niet als figuur");
    if (o.typen) {
      if (q.inputType !== "naam" || q.gradingRule !== "naam_varianten") f.push("typen zonder naaminvoer");
      if (JSON.stringify(q.namen.juist) !== JSON.stringify(D.namenVan(q.kaart.antwoordId))) f.push("namen.juist is niet de naam met varianten");
      var l = D.laag(o.kaart, o.laag);
      if (q.namen.anderen.length !== l.items.length - 1) f.push("namen.anderen niet alle andere gebieden van de laag");
    } else if (q.inputType) f.push("kiezen met een invoertype");
  }
  return f;
}
for (var def of V.TOPO_NLBE_DEFS) {
  var skill = V.TOPO_NLBE_SKILLS.filter(function(x) { return x.id === def.id; })[0], slecht = [], eersteRonde = {}, soorten = {};
  var combos = D.combinaties(def), verwacht = {};
  combos.forEach(function(c) { var o = def.onderdelen[c.o]; verwacht[o.sjabloon === "relatie" ? "relatie|" + o.relatie + "|" + o.gevraagd + "|" + c.id : o.sjabloon + "|" + o.laag + "|" + c.id] = 1; });
  eis(def.minCorrect === combos.length, def.id + ": minCorrect " + def.minCorrect + " is het aantal combinaties " + combos.length);
  for (var i = 0; i < 2000; i++) {
    await Promise.resolve();   // een nieuw rekenmoment: elke aanroep is een getoonde vraag (flow.js, currentTick)
    var q = skill.generate(), k = sleutel(q);
    if (i < combos.length) eersteRonde[k] = 1;
    soorten[k.split("|")[0]] = 1;
    var f = controleerVraag(def, q);
    if (f.length && slecht.length < 3) slecht.push(i + " (" + k + "): " + f.join("; "));
    var r = IR.resolveInput("topo_nlbe", def.id, q);
    var verwachtInvoer = q.relatie ? "choice" : q.kaart.stand === "toon" ? (q.inputType === "naam" ? "naam" : "choice") : "kaart";
    if (r.inputType !== verwachtInvoer && slecht.length < 3) slecht.push(i + " (" + k + "): resolveInput " + r.inputType + " in plaats van " + verwachtInvoer);
  }
  eis(slecht.length === 0, def.id + ": 2000 vragen kloppen (" + slecht.join(" | ") + ")");
  eis(Object.keys(eersteRonde).length === combos.length && Object.keys(eersteRonde).every(function(k) { return verwacht[k]; }), def.id + ": elke combinatie komt in de eerste ronde langs (" + Object.keys(eersteRonde).length + " van " + combos.length + ")");
  eis(def.onderdelen.every(function(o) { return soorten[o.sjabloon]; }), def.id + ": elk sjabloon komt voor");
  eis(["strategy", "tip", "uitleg", "voorbeeld", "label", "desc"].every(function(k) { return typeof skill[k] === "string" && skill[k].length > 3; }), def.id + ": label, desc, strategy, tip, uitleg en voorbeeld (het oefenscherm toont ze)");
  eis(!!skill.typenNaam === def.onderdelen.some(function(o) { return o.typen; }), def.id + ": typenNaam (de schakelaar Kiezen | Typen) volgt de onderdelen");
  console.log(def.id + ": " + combos.length + " combinaties (" + def.onderdelen.map(function(o) { return o.sjabloon; }).join(", ") + ")");
  // mutanten van de vraagcontrole
  await Promise.resolve();
  var q0 = skill.generate();
  var m1 = Object.assign({}, q0, { answer: q0.answer + "x" }), m3 = Object.assign({}, q0, { choices: [q0.answer, q0.answer].concat(q0.choices.slice(2)) });
  var m4 = Object.assign({}, q0, { choices: q0.choices.slice(0, -1).concat(q0.choices[q0.choices.length - 1] === q0.answer ? [q0.choices[0] + "?"] : ["Parijs"]) });
  eis(controleerVraag(def, m1).length > 0, def.id + ": mutant andere naam gevangen");
  eis(controleerVraag(def, m3).length > 0, def.id + ": mutant dubbele keuze gevangen");
  eis(controleerVraag(def, m4).length > 0, def.id + ": mutant keuze van buiten gevangen");
  if (q0.kaart) {
    var m2 = Object.assign({}, q0, { kaart: Object.assign({}, q0.kaart, { antwoordId: "prov-nl-pv99" }) });
    eis(controleerVraag(def, m2).length > 0, def.id + ": mutant antwoordId buiten de laag gevangen");
    var r2 = IR.resolveInput("topo_nlbe", def.id, Object.assign({}, q0, { inputType: "kaart", kaart: { kaart: "nlbe", laag: q0.kaart.laag } }));
    eis(r2.inputType === "choice", def.id + ": aanwijzen zonder antwoordId wordt Kiezen");
  }
}
// relatie: een bekend geval, en een mutant met een verkeerd antwoord
var nb04 = V.TOPO_NLBE_DEFS.filter(function(d) { return d.id === "nb04"; })[0], qr = D.maakMet(nb04, nb04.onderdelen[0], "prov-nl-pv23");
eis(qr.answer === "Zwolle" && controleerVraag(nb04, Object.assign({}, qr, { answer: "Arnhem", relatie: Object.assign({}, qr.relatie, { antwoordId: "stad-nl-arnhem" }) })).length > 0, "relatie: Overijssel heeft Zwolle als hoofdstad; een ander antwoord wordt gevangen");

// besluiten 24-11-2026: Almere heet in de vragen Almere; IJmond wordt niet gevraagd; nb05 vraagt alleen de officiele rollen
eis(D.naamVan("stad-nl-almere") === "Almere", "Almere heet Almere");
var nb06 = V.TOPO_NLBE_DEFS.filter(function(d) { return d.id === "nb06"; })[0];
eis(D.combinaties(nb06).every(function(c) { return c.id !== "stad-nl-ijmond"; }) && D.laag("nlbe", "steden").items.some(function(it) { return it.id === "stad-nl-ijmond"; }), "IJmond staat op de kaart, maar wordt niet gevraagd");
var nb05 = V.TOPO_NLBE_DEFS.filter(function(d) { return d.id === "nb05"; })[0];
eis(D.maakMet(nb05, nb05.onderdelen[0], "NLD").answer === "Amsterdam" && D.maakMet(nb05, nb05.onderdelen[0], "BEL").answer === "Brussel" && D.maakMet(nb05, nb05.onderdelen[1], "BEL").answer === "Brussel" && D.maakMet(nb05, nb05.onderdelen[2], "stad-be-brussel").answer === "België", "nb05: Amsterdam, Brussel, de zetel van de Belgische regering en terug");
eis(D.relaties("regeringszetel-van").every(function(r) { return r.naar !== "NLD"; }), "geen regeringszetel van Nederland (niet officieel vastgelegd)");
eis(D.maakMet(nb05, nb05.onderdelen[0], "NLD").choices.indexOf("Den Haag") >= 0, "nb05: Den Haag staat bij de keuzes voor de hoofdstad van Nederland");

// namen per laag, met de varianten: geen botsing na normalisatie (plan T3 par. 3.3)
K.lagen.forEach(function(l) {
  var gezien = {}, botsing = [];
  l.items.forEach(function(it) { D.namenVan(it.id).forEach(function(nm) { var k = GR.naamNorm(nm); if (gezien[k] && gezien[k] !== it.id) botsing.push(nm); gezien[k] = it.id; }); });
  eis(botsing.length === 0, "laag " + l.id + ": geen normalisatiebotsing tussen gebieden (" + botsing.join(", ") + ")");
});

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

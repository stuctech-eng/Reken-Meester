// Sjabloon S11 combinatie (plan T1 par. 1.5; plan T5 par. 4.6, nb28): een keten van twee relaties, helemaal uitgerekend op de
// kennisbank. Geen kennisitem (plan T5 par. 5.1).
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Onderdeel: { sjabloon: "keten", stappen: [{ relatie, richting }, { relatie, richting }], prefix, zonder, tekst }
//   richting "heen": van -> naar (stad ligt-in provincie); "terug": naar -> van (provincie heeft-provinciehoofdstad stad)
//   prefix, zonder  welke beginitems
//   tekst           functie(naam van het beginitem) -> de vraag
// Uniciteitstest: de eindverzameling heeft precies een item. Zinvolheidstest: het eindantwoord en elk tussenitem is niet het
// beginitem zelf (dan stond het antwoord al in de vraag). Zonder precies een zinvol antwoord geen vraag (ketenIds laat het item weg).
//   answer     de naam van het eindantwoord
//   choices    het antwoord en 3 foute keuzes: eerst andere einden van de tweede stap, dan items van dezelfde soort; nooit het
//              beginitem
//   inputType  "naam" met de namen voor de nakijkregel naam_varianten (typen); kiezen kan ook (de schakelaar van de modus)

import { shuffle } from "../../skills/helpers.js";

function stap(bron, ids, s) {
  var uit = [];
  bron.relaties(s.relatie).forEach(function(r) {
    var a = s.richting === "terug" ? r.naar : r.van, b = s.richting === "terug" ? r.van : r.naar;
    if (ids.indexOf(a) >= 0 && uit.indexOf(b) < 0) uit.push(b);
  });
  return uit;
}

// Het eindantwoord van de keten vanuit id, of null als het niet precies een zinvol antwoord is
export function ketenAntwoord(bron, o, id) {
  var tussen = stap(bron, [id], o.stappen[0]);
  if (tussen.length !== 1 || tussen[0] === id) return null;
  var eind = stap(bron, tussen, o.stappen[1]);
  if (eind.length !== 1 || eind[0] === id) return null;
  return { tussen: tussen[0], eind: eind[0] };
}

// De beginitems met precies een zinvol antwoord
export function ketenIds(bron, o) {
  var s = o.stappen[0], kand = [];
  bron.relaties(s.relatie).forEach(function(r) {
    var a = s.richting === "terug" ? r.naar : r.van;
    if ((!o.prefix || a.indexOf(o.prefix) === 0) && !(o.zonder && o.zonder.indexOf(a) >= 0) && kand.indexOf(a) < 0) kand.push(a);
  });
  return kand.filter(function(a) { return ketenAntwoord(bron, o, a) !== null; }).sort();
}

export function maakKeten(bron) {
  return function(o, id) {
    var k = ketenAntwoord(bron, o, id);
    if (!k) throw new Error("keten zonder precies een zinvol antwoord: " + id);
    // foute keuzes: eerst andere einden van de tweede stap (andere provinciehoofdsteden, andere gewesten), dan andere items van
    // dezelfde soort met hetzelfde voorvoegsel; nooit het eindantwoord en nooit het beginitem
    var voor = k.eind.split("-").slice(0, 2).join("-") + "-";
    var s2 = o.stappen[1], einden = [];
    bron.relaties(s2.relatie).forEach(function(r) { var b = s2.richting === "terug" ? r.van : r.naar; if (b.indexOf(voor) === 0 && einden.indexOf(b) < 0) einden.push(b); });
    var weg = function(x) { return x !== k.eind && x !== id; };
    var eerst = shuffle(einden.filter(weg));
    var daarna = shuffle(bron.ids(bron.item(k.eind).soort, voor).filter(function(x) { return weg(x) && eerst.indexOf(x) < 0; }));
    var fout = eerst.concat(daarna).slice(0, 3);
    var soortgenoten = bron.ids(bron.item(k.eind).soort, voor).filter(function(x) { return x !== k.eind; });
    var naam = bron.naamVan(k.eind);
    return {
      question: o.tekst(bron.naamVan(id)),
      answer: naam,
      choices: shuffle([naam].concat(fout.map(function(x) { return bron.naamVan(x); }))),
      tekstVraag: true,
      smallChoices: true,
      inputType: "naam",
      gradingRule: "naam_varianten",
      namen: { juist: bron.namenVan(k.eind), anderen: soortgenoten.map(function(x) { return bron.namenVan(x); }) },
      keten: { begin: id, tussen: k.tussen, eind: k.eind },
    };
  };
}

// Sjabloon S5 hoort-er-niet-bij (plan T1 par. 1.5; plan T5 par. 4.2, nb14): 4 items, 3 staan in relatie R tot X, 1 niet; kies die ene.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Onderdeel: { sjabloon: "niet-bij", relatie, prefix, pool, tekst }. Gevraagd zijn de items X (prefix) met minstens 3 doelen in R.
// T5c-3 (nb22): met minDoelen (bijvoorbeeld 2, Brussel-Hoofdstad: de Vlaamse en de Franse Gemeenschap) minstens zoveel doelen; de
// keuzes zijn dan alle doelen (hoogstens 3) en het ene item buiten R.
//   question   tekst(naam van X): "Welke provincie grenst niet aan Gelderland?"
//   answer     de naam van het ene item uit de pool dat niet in R tot X staat (en niet X zelf)
//   choices    3 doelen van X en dat ene item
//   relatie    { relatie, gevraagd: "naar", genoemd: X, antwoordId } (kennisitem en uitleg)
// Precies een juist antwoord: de 3 andere keuzes staan aantoonbaar in R tot X (de kennisbank).

import { shuffle } from "../../skills/helpers.js";
import { juisteIds, poolIds } from "./relatie.js";

export function genoemdNietBij(bron, o) {
  var gezien = {}, uit = [];
  bron.relaties(o.relatie).forEach(function(r) {
    var x = r.van;
    if ((!o.prefix || x.indexOf(o.prefix) === 0) && !gezien[x] && juisteIds(bron, { relatie: o.relatie, gevraagd: "naar" }, x).length >= (o.minDoelen || 3)) { gezien[x] = 1; uit.push(x); }
  });
  return uit;
}

export function maakNietBij(bron) {
  return function(o, id) {
    var r = { relatie: o.relatie, gevraagd: "naar" };
    var juist = juisteIds(bron, r, id);
    if (juist.length < (o.minDoelen || 3)) throw new Error("niet-bij vraagt minstens " + (o.minDoelen || 3) + " doelen: " + id);
    var buiten = poolIds(bron, o, id).filter(function(x) { return juist.indexOf(x) < 0 && x !== id; });
    if (!buiten.length) throw new Error("niet-bij: geen item buiten de relatie voor " + id);
    var antwoordId = buiten[Math.floor(Math.random() * buiten.length)];
    var drie = shuffle(juist).slice(0, 3);
    var naam = bron.naamVan(antwoordId);
    return {
      question: o.tekst(bron.naamVan(id)),
      answer: naam,
      choices: shuffle([naam].concat(drie.map(function(x) { return bron.naamVan(x); }))),
      tekstVraag: true,
      smallChoices: true,
      relatie: { relatie: o.relatie, gevraagd: "naar", genoemd: id, antwoordId: antwoordId },
    };
  };
}

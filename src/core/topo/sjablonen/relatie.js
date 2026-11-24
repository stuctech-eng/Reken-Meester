// Sjabloon S3 relatie, kiezen (plan T1 par. 1.5, met de selectieregel; plan T3 par. 3.4).
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Onderdeel: { sjabloon: "relatie", relatie, gevraagd, prefix, pool, tekst }.
//   relatie   een relatiesoort uit de kennisbank (bijvoorbeeld "provinciehoofdstad-van": stad -> provincie), alleen vastgestelde relaties
//   gevraagd  "van": de vraag noemt het doel en vraagt de bron ("Wat is de hoofdstad van de provincie Overijssel?");
//             "naar": de vraag noemt de bron en vraagt het doel ("Van welke provincie is Zwolle de hoofdstad?")
//   prefix    welke genoemde items gevraagd worden (op de id)
//   pool      { soort, prefix }: waar de foute keuzes vandaan komen (kennisbank-items van die soort)
//   tekst     functie(naam van het genoemde item) -> de vraag
// Selectieregel: het antwoord is een van de juiste items; de foute keuzes staan aantoonbaar niet in de relatie tot het genoemde item
// (niet in de kennisbank). Andere juiste items komen nooit als foute keuze.

import { shuffle } from "../../skills/helpers.js";

export function genoemdeIds(bron, o) {
  var gezien = {}, uit = [];
  bron.relaties(o.relatie).forEach(function(r) {
    var g = o.gevraagd === "van" ? r.naar : r.van;
    if ((!o.prefix || g.indexOf(o.prefix) === 0) && !gezien[g]) { gezien[g] = 1; uit.push(g); }
  });
  return uit;
}

export function juisteIds(bron, o, id) {
  return bron.relaties(o.relatie).filter(function(r) { return (o.gevraagd === "van" ? r.naar : r.van) === id; }).map(function(r) { return o.gevraagd === "van" ? r.van : r.naar; });
}

export function maakRelatie(bron) {
  return function(o, id) {
    var juist = juisteIds(bron, o, id);
    if (!juist.length) throw new Error("geen relatie " + o.relatie + " voor " + id);
    var antwoordId = shuffle(juist.slice())[0];
    var fout = shuffle(bron.ids(o.pool.soort, o.pool.prefix).filter(function(x) { return juist.indexOf(x) < 0; })).slice(0, 3);
    var naam = bron.naamVan(antwoordId);
    return {
      question: o.tekst(bron.naamVan(id)),
      answer: naam,
      choices: shuffle([naam].concat(fout.map(function(x) { return bron.naamVan(x); }))),
      tekstVraag: true,
      smallChoices: true,
      relatie: { relatie: o.relatie, gevraagd: o.gevraagd, genoemd: id, antwoordId: antwoordId },
    };
  };
}

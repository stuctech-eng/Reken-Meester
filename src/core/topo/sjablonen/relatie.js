// Sjabloon S3 relatie, kiezen (plan T1 par. 1.5, met de selectieregel; plan T3 par. 3.4).
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Onderdeel: { sjabloon: "relatie", relatie, gevraagd, prefix, pool, tekst }.
//   relatie   een relatiesoort uit de kennisbank (bijvoorbeeld "provinciehoofdstad-van": stad -> provincie), alleen vastgestelde relaties
//   gevraagd  "van": de vraag noemt het doel en vraagt de bron ("Wat is de hoofdstad van de provincie Overijssel?");
//             "naar": de vraag noemt de bron en vraagt het doel ("Van welke provincie is Zwolle de hoofdstad?")
//   prefix    welke genoemde items gevraagd worden (op de id); zonder: genoemde items die niet gevraagd worden (T5a)
//   pool      { soort, prefix }: waar de foute keuzes vandaan komen (kennisbank-items van die soort), of { ids: [...] }: een vaste
//             lijst, of een functie(genoemde id) die een van beide geeft (bijvoorbeeld per land andere steden)
//   tekst     functie(naam van het genoemde item) -> de vraag
// Selectieregel: het antwoord is een van de juiste items; de foute keuzes staan aantoonbaar niet in de relatie tot het genoemde item
// (niet in de kennisbank). Andere juiste items komen nooit als foute keuze, het genoemde item ook niet (T5a: grenst-aan). Minstens een foute keuze is een verwarring (buren, plan
// T4 par. 8), als die er bij de kandidaten is.

import { shuffle } from "../../skills/helpers.js";
import { kiesFout } from "./foutkeuze.js";

export function genoemdeIds(bron, o) {
  var gezien = {}, uit = [];
  bron.relaties(o.relatie).forEach(function(r) {
    var g = o.gevraagd === "van" ? r.naar : r.van;
    if ((!o.prefix || g.indexOf(o.prefix) === 0) && !(o.zonder && o.zonder.indexOf(g) >= 0) && !gezien[g]) { gezien[g] = 1; uit.push(g); }
  });
  return uit;
}

export function juisteIds(bron, o, id) {
  return bron.relaties(o.relatie).filter(function(r) { return (o.gevraagd === "van" ? r.naar : r.van) === id; }).map(function(r) { return o.gevraagd === "van" ? r.van : r.naar; });
}

export function poolIds(bron, o, id) {
  var p = typeof o.pool === "function" ? o.pool(id) : o.pool;
  return p.ids ? p.ids.slice() : bron.ids(p.soort, p.prefix);
}

// De verwarring (plan T4 par. 8): bij "naar" (het antwoord is het doel, bijvoorbeeld een provincie) de buren van het antwoord; bij
// "van" (het antwoord is de bron, bijvoorbeeld een hoofdstad) de bronnen van de buren van het genoemde doel (de hoofdsteden van de
// buurprovincies)
export function verwarring(bron, o, id, antwoordId) {
  if (o.gevraagd === "naar") return bron.buren(antwoordId);
  var b = bron.buren(id);
  return bron.relaties(o.relatie).filter(function(r) { return b.indexOf(r.naar) >= 0; }).map(function(r) { return r.van; });
}

export function maakRelatie(bron) {
  return function(o, id) {
    var juist = juisteIds(bron, o, id);
    if (!juist.length) throw new Error("geen relatie " + o.relatie + " voor " + id);
    var antwoordId = shuffle(juist.slice())[0];
    var fout = kiesFout(poolIds(bron, o, id).filter(function(x) { return juist.indexOf(x) < 0 && x !== id; }), verwarring(bron, o, id, antwoordId), 3);
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

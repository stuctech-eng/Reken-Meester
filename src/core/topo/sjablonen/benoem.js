// Sjabloon S1 benoem (plan T1 par. 1.5; plan T3 par. 3.4): een gebied is gemarkeerd op de kaart, kies of typ de naam.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Onderdeel: { sjabloon: "benoem", kaart, laag, prefix, vraag, typen }. De vraag:
//   question   o.vraag ("Welke provincie is oranje?")
//   answer     de naam van het gemarkeerde gebied (naamVan)
//   choices    hoogstens 4 namen uit dezelfde vraagset, met een buur als die er is (plan T4 par. 8; smallChoices: namen in de
//              kleinere letter van het keuzeraster)
//   kaart      { kaart, laag, antwoordId, focus, stand: "toon" }: het oefenscherm toont de kaart boven het antwoord, met het gebied
//              gemarkeerd; tikken kiest niets (zoomen en slepen wel)
//   typen      alleen met o.typen: inputType "naam" en nakijkregel "naam_varianten" (plan T3 par. 3.3), met de namen die de regel
//              nodig heeft: namen.juist = de voorkeursnaam en de goedgekeurde varianten; namen.anderen = per ander gebied van de laag
//              zijn namen. Zonder Typen (of zonder o.typen) is het kiezen.

import { shuffle } from "../../skills/helpers.js";
import { vraagIds } from "./wijs-aan.js";
import { kiesFout } from "./foutkeuze.js";

export function maakBenoem(bron) {
  return function(o, id) {
    var l = bron.laag(o.kaart, o.laag), ids = vraagIds(l, o.prefix, o.zonder);
    if (ids.indexOf(id) < 0) throw new Error("gebied " + id + " hoort niet bij de laag " + o.laag);
    var naam = bron.naamVan(id);
    var anderen = kiesFout(ids.filter(function(x) { return x !== id; }), bron.buren(id), 3).map(function(x) { return bron.naamVan(x); });
    var q = {
      question: o.vraag,
      answer: naam,
      choices: shuffle([naam].concat(anderen)),
      tekstVraag: true,
      smallChoices: true,
      kaart: { kaart: o.kaart, laag: o.laag, antwoordId: id, focus: bron.omhulling(o.kaart, o.laag, ids), stand: "toon" },
    };
    if (o.typen) {
      q.inputType = "naam";
      q.gradingRule = "naam_varianten";
      q.namen = {
        juist: bron.namenVan(id),
        anderen: l.items.filter(function(it) { return it.id !== id; }).map(function(it) { return bron.namenVan(it.id); }),
      };
    }
    return q;
  };
}

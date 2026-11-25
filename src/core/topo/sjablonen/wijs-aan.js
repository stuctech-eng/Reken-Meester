// Sjabloon S2 wijs-aan (plan T1 par. 1.5; plan T3 par. 3.4): naam gegeven, tik het gebied aan op de kaart.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Onderdeel van een vaardigheid (vaardigheden-nlbe.js): { sjabloon: "wijs-aan", kaart, laag, prefix, zonder, soortwoord }. De vraag:
//   question   "Tik de provincie Utrecht aan."
//   answer     de naam van het gevraagde gebied (naamVan, uit de kennisbank)
//   choices    hoogstens 4 namen uit dezelfde vraagset, met een buur als die er is (alleen als het oefenscherm de kaart niet kan
//              tonen; resolveInput)
//   kaart      { kaart, laag, antwoordId, focus }: het oefenscherm toont de kaart als invoer (inputType "kaart"); focus is de
//              omhullende van de hele vraagset (bij elke vraag van het onderdeel dezelfde, dus geen hint): het beginbeeld
//   tekstVraag true: een hele zin (de bestaande weergave van het oefenscherm)
// Welk gebied gevraagd wordt, kiest data.js (een ronde langs alle gebieden en onderdelen van de vaardigheid).

import { shuffle } from "../../skills/helpers.js";
import { kiesFout } from "./foutkeuze.js";

// De gevraagde items van een laag: met het voorvoegsel, zonder de ids in zonder (die blijven wel op de kaart en tikbaar)
export function vraagIds(laagObj, prefix, zonder) {
  return laagObj.items.filter(function(it) { return (!prefix || it.id.indexOf(prefix) === 0) && !(zonder && zonder.indexOf(it.id) >= 0); }).map(function(it) { return it.id; });
}

export function maakWijsAan(bron) {
  return function(o, id) {
    var ids = vraagIds(bron.laag(o.kaart, o.laag), o.prefix, o.zonder);
    if (ids.indexOf(id) < 0) throw new Error("gebied " + id + " hoort niet bij de laag " + o.laag);
    var naam = bron.naamVan(id);
    var anderen = kiesFout(ids.filter(function(x) { return x !== id; }), bron.buren(id), 3).map(function(x) { return bron.naamVan(x); });
    return {
      question: "Tik " + o.soortwoord + " " + naam + " aan.",
      answer: naam,
      choices: shuffle([naam].concat(anderen)),
      tekstVraag: true,
      inputType: "kaart",
      gradingRule: "kaart_item",
      kaart: { kaart: o.kaart, laag: o.laag, antwoordId: id, focus: bron.omhulling(o.kaart, o.laag, ids) },
    };
  };
}

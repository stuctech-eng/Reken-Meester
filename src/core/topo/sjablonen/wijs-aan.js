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

// De gevraagde items van een laag: met het voorvoegsel, zonder de ids in zonder (die blijven wel op de kaart en tikbaar), en met
// alleen (T5a, optioneel): alleen deze ids (bijvoorbeeld de provinciehoofdsteden, zie alleenVan)
export function vraagIds(laagObj, prefix, zonder, alleen) {
  return laagObj.items.filter(function(it) { return (!prefix || it.id.indexOf(prefix) === 0) && !(zonder && zonder.indexOf(it.id) >= 0) && (!alleen || alleen.indexOf(it.id) >= 0); }).map(function(it) { return it.id; });
}
// o.metRelatie (T5a, optioneel): alleen de items die bron zijn van die relatie (nb24: de provinciehoofdsteden)
export function alleenVan(bron, o) {
  return o.metRelatie ? bron.relaties(o.metRelatie).map(function(r) { return r.van; }) : null;
}
// Het beginbeeld: de omhullende van de vraagset, of met o.vrijeStart (T5a, nb25: zonder hulp) de hele kaart
export function beginbeeld(bron, o, ids) {
  if (!o.vrijeStart) return bron.omhulling(o.kaart, o.laag, ids);
  var k = bron.kaart(o.kaart);
  return [0, 0, k.breedte, k.hoogte];
}

export function maakWijsAan(bron) {
  return function(o, id) {
    var ids = vraagIds(bron.laag(o.kaart, o.laag), o.prefix, o.zonder, alleenVan(bron, o));
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
      kaart: { kaart: o.kaart, laag: o.laag, antwoordId: id, focus: beginbeeld(bron, o, ids) },
    };
  };
}

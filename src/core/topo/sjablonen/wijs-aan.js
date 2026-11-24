// Sjabloon S2 wijs-aan (plan T1 par. 1.5; plan T3 par. 3.4): naam gegeven, tik het gebied aan op de kaart.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Vaardigheid (vaardigheden-nlbe.js): { id, kaart, laag, prefix, soortwoord }. De vraag:
//   question   "Tik de provincie Utrecht aan."
//   answer     de naam van het gevraagde gebied (naamVan, uit de kennisbank)
//   choices    hoogstens 4 namen uit dezelfde vraagset (de terugval op kiezen, plan T3 par. 3.2)
//   kaart      { kaart, laag, antwoordId }: het oefenscherm toont de kaart als invoer (inputType "kaart")
//   tekstVraag true: een hele zin (de bestaande weergave van het oefenscherm)
// Elk item komt een keer langs voordat de ronde opnieuw begint (deckPick).

import { deckPick } from "../../skills/flow.js";
import { shuffle } from "../../skills/helpers.js";

export function vraagIds(laagObj, prefix) {
  return laagObj.items.filter(function(it) { return !prefix || it.id.indexOf(prefix) === 0; }).map(function(it) { return it.id; });
}

export function maakWijsAan(bron) {
  return function(v) {
    var l = bron.laag(v.kaart, v.laag), ids = vraagIds(l, v.prefix);
    if (ids.length < 2) throw new Error("te weinig gebieden voor " + v.id + ": " + ids.length);
    var id = deckPick(v.id, ids), naam = bron.naamVan(id);
    var anderen = shuffle(ids.filter(function(x) { return x !== id; })).slice(0, 3).map(bron.naamVan);
    return {
      question: "Tik " + v.soortwoord + " " + naam + " aan.",
      answer: naam,
      choices: shuffle([naam].concat(anderen)),
      tekstVraag: true,
      kaart: { kaart: v.kaart, laag: v.laag, antwoordId: id },
    };
  };
}

// Sjabloon relatie met een kaartantwoord (plan T5 par. 4.1, nb13): een item is genoemd, tik het doel van de relatie aan op de kaart
// ("Tik de provincie aan waarin Eindhoven ligt."). De regels van S2 (aanwijzen, bevestigen); de kaart is die van wijs-aan.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Onderdeel: { sjabloon: "wijs-relatie", relatie, prefix, zonder, kaart, laag, tekst }. Gevraagd zijn de bronnen van de relatie
// (gevraagd "naar", zoals bij relatie.js); het antwoord is het enige doel, en dat moet een gebied van de laag zijn.
//   question   tekst(naam van het genoemde item)
//   answer     de naam van het doel
//   choices    het doel en 3 andere gebieden van de laag, met een buur als die er is (alleen als de kaart niet kan tekenen)
//   kaart      { kaart, laag, antwoordId, focus }: focus is de omhullende van de hele laag (bij elke vraag dezelfde, dus geen hint)
//   relatie    { relatie, gevraagd: "naar", genoemd, antwoordId } (voor het kennisitem en de uitleg bij een fout)

import { shuffle } from "../../skills/helpers.js";
import { juisteIds } from "./relatie.js";
import { kiesFout } from "./foutkeuze.js";

export function maakWijsRelatie(bron) {
  return function(o, id) {
    var r = { relatie: o.relatie, gevraagd: "naar" };
    var juist = juisteIds(bron, r, id);
    if (juist.length !== 1) throw new Error("wijs-relatie vraagt precies een doel: " + o.relatie + " " + id + " heeft er " + juist.length);
    var doelId = juist[0], l = bron.laag(o.kaart, o.laag), ids = l.items.map(function(it) { return it.id; });
    if (ids.indexOf(doelId) < 0) throw new Error("het doel " + doelId + " staat niet in de laag " + o.laag);
    var naam = bron.naamVan(doelId);
    var anderen = kiesFout(ids.filter(function(x) { return x !== doelId; }), bron.buren(doelId), 3).map(function(x) { return bron.naamVan(x); });
    return {
      question: o.tekst(bron.naamVan(id)),
      answer: naam,
      choices: shuffle([naam].concat(anderen)),
      tekstVraag: true,
      inputType: "kaart",
      gradingRule: "kaart_item",
      kaart: { kaart: o.kaart, laag: o.laag, antwoordId: doelId, focus: bron.omhulling(o.kaart, o.laag, ids) },
      relatie: { relatie: o.relatie, gevraagd: "naar", genoemd: id, antwoordId: doelId },
    };
  };
}

// Nakijken van een getypt antwoord, los van de invoer en van de verwerking.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// gradeTyped(gradingRule, invoer, vraag, inputConfig) -> { geldig, goed, waarde }
//   geldig: de invoer is een bruikbaar antwoord voor deze regel (anders gebeurt er niets)
//   goed:   het antwoord is inhoudelijk goed
//   waarde: de gelezen invoer (wat de leerling gaf), geschreven in dezelfde vorm als vraag.answer
//           (getal bij een getal; bij tekst de notatie van Wiskunde, "\u221207"). Omdat resolveInput
//           alleen typen toelaat als answer precies zo terug te schrijven is, geldt: goed <=> waarde === answer.
// De verwerking daarna (feedback, voortgang) blijft in het oefenscherm (handleChoice).

import { parseTypedSigned, writeAnswerInteger } from "./answerCheck.js";

export function gradeTyped(gradingRule, invoer, vraag, inputConfig) {
  if (gradingRule === "numeric_equal") {
    var getal = parseTypedSigned(invoer, !!(inputConfig && inputConfig.allowNegative));
    if (getal === null) return { geldig: false, goed: false, waarde: null };
    var waarde = writeAnswerInteger(getal, vraag.answer);
    return { geldig: true, goed: waarde === vraag.answer, waarde: waarde };
  }
  // Onbekende regel: nooit goed rekenen; resolveInput laat zo'n vraag niet typen
  return { geldig: false, goed: false, waarde: null };
}

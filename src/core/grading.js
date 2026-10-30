// Nakijken van een getypt antwoord, los van de invoer en van de verwerking.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// gradeTyped(gradingRule, invoer, vraag) -> { geldig, goed, waarde }
//   geldig: de invoer is een bruikbaar antwoord voor deze regel (anders gebeurt er niets)
//   goed:   het antwoord is inhoudelijk goed
//   waarde: de gelezen invoer (wat de leerling gaf)
// De verwerking daarna (feedback, voortgang) blijft in het oefenscherm (handleChoice).

import { parseTypedInteger } from "./answerCheck.js";

export function gradeTyped(gradingRule, invoer, vraag) {
  if (gradingRule === "numeric_equal") {
    var waarde = parseTypedInteger(invoer);
    if (waarde === null) return { geldig: false, goed: false, waarde: null };
    return { geldig: true, goed: waarde === vraag.answer, waarde: waarde };
  }
  // Onbekende regel: nooit goed rekenen; resolveInput laat zo'n vraag niet typen
  return { geldig: false, goed: false, waarde: null };
}

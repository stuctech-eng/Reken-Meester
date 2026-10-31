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

import { parseTypedSigned, writeAnswerInteger, parseTypedDecimal, writeAnswerDecimal, writeAnswerMoney } from "./answerCheck.js";

export function gradeTyped(gradingRule, invoer, vraag, inputConfig) {
  if (gradingRule === "numeric_equal") {
    var getal = parseTypedSigned(invoer, !!(inputConfig && inputConfig.allowNegative));
    if (getal === null) return { geldig: false, goed: false, waarde: null };
    var waarde = writeAnswerInteger(getal, vraag.answer);
    return { geldig: true, goed: waarde === vraag.answer, waarde: waarde };
  }
  // Kommagetal: exact (geheel getal met schaal). Waarde gelijk ("0,50" = "0,5"), of bij afronden ook
  // precies evenveel decimalen als het antwoord ("8,0": "8" en "8,00" zijn fout).
  if (gradingRule === "decimal_value_equal" || gradingRule === "decimal_exact_decimals") {
    var d = parseTypedDecimal(invoer, inputConfig && inputConfig.maxDecimals);
    if (d === null) return { geldig: false, goed: false, waarde: null };
    var w = writeAnswerDecimal(d, vraag.answer, gradingRule === "decimal_exact_decimals");
    return { geldig: true, goed: w === vraag.answer, waarde: w };
  }
  // Geldbedrag: exact in centen. Waarde gelijk ("8,5" = "\u20ac 8,50"), of bij bedrag schrijven (g03)
  // precies de notatie van het antwoord; dan blijven de getypte decimalen in waarde ("11,7" -> "\u20ac 11,7").
  if (gradingRule === "money_value_equal" || gradingRule === "money_exact_notation") {
    var md = parseTypedDecimal(invoer, (inputConfig && inputConfig.maxDecimals !== undefined) ? inputConfig.maxDecimals : 2);
    if (md === null) return { geldig: false, goed: false, waarde: null };
    var mw = writeAnswerMoney(md, vraag.answer, gradingRule === "money_exact_notation");
    return { geldig: true, goed: mw === vraag.answer, waarde: mw };
  }
  // Onbekende regel: nooit goed rekenen; resolveInput laat zo'n vraag niet typen
  return { geldig: false, goed: false, waarde: null };
}

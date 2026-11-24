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

import { parseTypedInteger, parseTypedSigned, writeAnswerInteger, writeAnswerLetterInteger, parseTypedDecimal, writeAnswerDecimal, writeAnswerMoney, writeAnswerPercent, readAnswerQuantity, writeAnswerQuantity, quantityMaxDecimals, parseTypedFraction, writeAnswerFraction, parseTypedPair, readAnswerPair, writeAnswerPair } from "./answerCheck.js";

export function gradeTyped(gradingRule, invoer, vraag, inputConfig) {
  if (gradingRule === "numeric_equal") {
    var getal = parseTypedSigned(invoer, !!(inputConfig && inputConfig.allowNegative));
    if (getal === null) return { geldig: false, goed: false, waarde: null };
    // Met inputConfig.letter de vorm "x = 4" (zoals het antwoord van een vergelijking)
    var waarde = (inputConfig && inputConfig.letter !== undefined) ? writeAnswerLetterInteger(getal, inputConfig.letter) : writeAnswerInteger(getal, vraag.answer);
    if (waarde === null) return { geldig: false, goed: false, waarde: null };
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
  // Procent: de getypte cijfers als heel getal; waarde altijd in de canonieke vorm "<getal>%"
  // ("040" -> "40%", "0" -> "0%"). Leeg is geen antwoord (dus nooit "0%").
  if (gradingRule === "percent_value_equal") {
    var pv = parseTypedInteger(invoer);
    if (pv === null) return { geldig: false, goed: false, waarde: null };
    var pw = writeAnswerPercent(pv);
    return { geldig: true, goed: pw === vraag.answer, waarde: pw };
  }
  // Getal met eenheid: dezelfde waarde ("7,50" = "7,5\u00a0kg"); de eenheid komt altijd uit het antwoord.
  // Decimalen alleen met allowDecimal; waarde in de canonieke vorm ("8" -> "8\u00a0kg").
  if (gradingRule === "quantity_value_equal") {
    var qa = readAnswerQuantity(vraag.answer);
    var qd = qa === null ? null : parseTypedDecimal(invoer, quantityMaxDecimals(inputConfig));
    if (qd === null) return { geldig: false, goed: false, waarde: null };
    var qw = writeAnswerQuantity(qd, qa.eenheid);
    return { geldig: true, goed: qw === vraag.answer, waarde: qw };
  }
  // Breuk, exact: goed alleen als de ruwe invoer letterlijk het antwoord is ("01/02" en "2/4" zijn fout bij
  // "1/2"). waarde: bij goed de invoer (= answer); bij fout de canonieke vorm, behalve als die gelijk is aan
  // het antwoord (dan de ruwe invoer), zodat goed <=> waarde === answer blijft gelden.
  if (gradingRule === "fraction_exact") {
    var fi = parseTypedFraction(invoer, !!(inputConfig && inputConfig.gemengd));
    if (fi === null) return { geldig: false, goed: false, waarde: null };
    var fgoed = invoer === vraag.answer;
    var fcan  = writeAnswerFraction(fi);
    return { geldig: true, goed: fgoed, waarde: (fgoed || fcan === vraag.answer) ? invoer : fcan };
  }
  // Twee getallen, exact: de ruwe invoer is "a|b" (eerste vak, tweede vak). waarde is altijd de canonieke
  // tekst bij inputConfig.tussen ("12 rest 6", "3\u00a0:\u00a04"); goed alleen als die letterlijk het antwoord is.
  // Geen omdraaien en geen gelijkwaardige verhouding: "4 : 3" en "6 : 8" zijn fout bij "3 : 4".
  // Kloktijd (tussen "klok"): eerst valideren en normaliseren ("08|05" -> "8:05"). Met inputConfig.klok12
  // (klok lezen, 12-uursklok) is ook het tijdstip 12 uur verder of eerder goed: de minuten gelijk en het
  // uur gelijk modulo 12 ("13:30" en "1:30", "0:50" en "12:50"); waarde is dan het antwoord zelf.
  if (gradingRule === "pair_exact") {
    var tussen = inputConfig && inputConfig.tussen;
    var pp = parseTypedPair(invoer, tussen);
    var pw = pp ? writeAnswerPair(pp, tussen) : null;
    if (pw === null) return { geldig: false, goed: false, waarde: null };
    if (pw !== vraag.answer && tussen === "klok" && inputConfig.klok12) {
      var pv = readAnswerPair(vraag.answer, "klok");
      if (pv && Number(pp.a) % 12 === Number(pv.a) % 12 && pp.b === pv.b) return { geldig: true, goed: true, waarde: vraag.answer };
    }
    return { geldig: true, goed: pw === vraag.answer, waarde: pw };
  }
  // Naam (Topografie, plan T3 par. 3.3): naamNakijken hieronder; bijna: "bijna goed, let op de spelling" (telt als fout)
  if (gradingRule === "naam_varianten") return naamNakijken(invoer, vraag);
  // Onbekende regel: nooit goed rekenen; resolveInput laat zo'n vraag niet typen
  return { geldig: false, goed: false, waarde: null };
}

// ── Namen nakijken (Topografie, plan T3 par. 3.3) ────────────────
// vraag.namen = { juist: [voorkeursnaam, varianten...], anderen: [[naam, varianten...], ...] } (de andere gebieden van de laag).
// Normaliseren: kleine letters, accenten weg, spaties, koppeltekens, apostrofs en punten weg ("'s-Hertogenbosch" = "s hertogenbosch").
// Volgorde, het eerste dat past beslist:
//   1. leeg: geen antwoord (geldig false, er gebeurt niets);
//   2. goed: gelijk aan de voorkeursnaam of een variant;
//   3. een ander gebied: gelijk aan een naam van een ander gebied van de laag: fout, zonder melding;
//   4. bijna goed: precies een bewerking (een letter anders, erbij of weg, of twee buurletters omgewisseld) van een juiste naam,
//      alleen bij een naam van minstens 5 letters en alleen als de invoer niet ook zo dicht bij een ander gebied ligt: fout, met bijna;
//   5. anders: fout.
// waarde: bij goed het antwoord zelf; anders de invoer (zonder spaties aan de randen; nooit gelijk aan het antwoord, want dat is goed).
export function naamNorm(s) {
  return String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[\s\-'\u2018\u2019\u0060\u00b4.]/g, "");
}
// Precies een bewerking (beperkte Damerau-Levenshtein-afstand 1)
export function eenBewerking(a, b) {
  if (a === b) return false;
  var la = a.length, lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  if (la === lb) {
    var v = [];
    for (var i = 0; i < la; i++) if (a.charAt(i) !== b.charAt(i)) v.push(i);
    if (v.length === 1) return true;
    return v.length === 2 && v[1] === v[0] + 1 && a.charAt(v[0]) === b.charAt(v[1]) && a.charAt(v[1]) === b.charAt(v[0]);
  }
  var k = la > lb ? a : b, c = la > lb ? b : a, j = 0;
  while (j < c.length && k.charAt(j) === c.charAt(j)) j++;
  return k.slice(j + 1) === c.slice(j);
}
export function naamNakijken(invoer, vraag) {
  var n = naamNorm(invoer || "");
  if (n === "") return { geldig: false, goed: false, waarde: null };
  var namen = vraag.namen || { juist: [vraag.answer], anderen: [] };
  var juist = namen.juist.map(naamNorm), anderen = [];
  namen.anderen.forEach(function(g) { g.forEach(function(x) { anderen.push(naamNorm(x)); }); });
  var ruw = String(invoer).trim();
  if (juist.indexOf(n) >= 0) return { geldig: true, goed: true, waarde: vraag.answer };
  if (anderen.indexOf(n) >= 0) return { geldig: true, goed: false, waarde: ruw, bijna: false };
  var bijna = naamNorm(vraag.answer).length >= 5 && juist.some(function(x) { return eenBewerking(x, n); }) && !anderen.some(function(x) { return eenBewerking(x, n); });
  return { geldig: true, goed: false, waarde: ruw, bijna: bijna };
}

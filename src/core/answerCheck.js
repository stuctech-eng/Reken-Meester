// Antwoord typen: welke vragen getypt mogen worden en hoe een getypt antwoord wordt gelezen.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Kiezen blijft de standaard en verandert niet. Bij Typen wordt de invoer hier omgezet naar
// een waarde; het oefenscherm geeft die waarde daarna aan precies dezelfde verwerking als een
// aangetikte keuze (goed/fout, hulp, voortgang).
//
// Per modus staat hier expliciet:
//   kind               welk soort antwoord getypt wordt (nu alleen "geheel": 0, 1, 2, ...)
//   alleenKiezen       vaardigheden waarbij typen niet past; die tonen bij Typen gewoon de keuzes
//   alleenKiezenVraag  (optioneel) vraagtekst-patroon voor losse vragen die kiezen blijven,
//                      voor gemengde vaardigheden zoals een snelheidsronde
// Een modus die hier niet staat, heeft geen Typen (de schakelaar verschijnt dan niet).

var TYPE_CONFIG = {
  optellen: {
    kind: "geheel",
    alleenKiezen: [
      "s25_estimate_sum",         // schatten: het goede antwoord is de schatting, niet de som
      "s33_error_spotter_medium", // fout-spotter: kies de foute som
      "s69_error_int",            // fout-spotter: kies de foute som
    ],
  },
  aftrekken: {
    kind: "geheel",
    alleenKiezen: [
      "a31_schatten_100",         // schatten: het goede antwoord is de schatting
      "a32_schatten_1000",        // schatten: het goede antwoord is de schatting
      "a36_fout_spotten",         // fout-spotter: kies de foute som
    ],
    // Snelheidsronde a37 mengt vragen uit alle blokken; de schatvragen daarin ("Schat: ...")
    // blijven kiezen. Fout-spotters vangt het vangnet hieronder al (isErrorSpotter).
    alleenKiezenVraag: /^Schat:/,
  },
  vermenigvuldigen: {
    kind: "geheel",
    alleenKiezen: [
      "v34_schatten",             // schatten: het goede antwoord is de schatting
      "v35_fout_spotten",         // fout-spotter: kies de foute som
    ],
    // Snelheidsronde v37 mengt vragen uit alle blokken; de schatvragen daarin ("Schat: ...")
    // blijven kiezen. Fout-spotters vangt het vangnet hieronder al (isErrorSpotter).
    alleenKiezenVraag: /^Schat:/,
  },
  delen: {
    kind: "geheel",
    alleenKiezen: [
      "d34_schatten",             // schatten: het goede antwoord is de schatting
      "d35_fout_spotten",         // fout-spotter: kies de foute som
    ],
    // Snelheidsronde d37 mengt vragen uit alle blokken; de schatvragen daarin ("Schat: ...")
    // blijven kiezen. Fout-spotters vangt het vangnet hieronder al. De restvragen (d27, d28) hebben
    // een eigen invoertype (twee vakjes, "pair" in delen.js); in een snelheidsronde ook, via bronSkillId. Een vraag die met het cijferblok niet op het scherm past (zoals een
    // hoog rooster op een kleine telefoon), toont het oefenscherm zelf met keuzes.
    alleenKiezenVraag: /^Schat:/,
  },
};

// Langste invoer in cijfers (Optellen, Aftrekken, Vermenigvuldigen en Delen: hoogstens 5 cijfers; ruim genomen)
export var TYPE_MAX_DIGITS = 7;

export function typingAvailable(subjectId) {
  return Object.prototype.hasOwnProperty.call(TYPE_CONFIG, subjectId);
}

// Mag deze vraag getypt worden? Eerst de vaste regels per modus en vaardigheid; daarna een
// vangnet op de vraag zelf (een fout-spotter of een antwoord dat geen geheel getal is, wordt
// nooit als typvraag getoond).
export function canTypeQuestion(subjectId, skillId, question) {
  if (!typingAvailable(subjectId)) return false;
  var cfg = TYPE_CONFIG[subjectId];
  if (cfg.alleenKiezen.indexOf(skillId) !== -1) return false;
  if (!question || question.isErrorSpotter) return false;
  if (cfg.alleenKiezenVraag && cfg.alleenKiezenVraag.test(String(question.question))) return false;
  if (cfg.kind === "geheel") {
    var a = question.answer;
    return typeof a === "number" && isFinite(a) && Math.floor(a) === a && a >= 0;
  }
  return false;
}

// Getypte tekst lezen als geheel getal (0 of groter). Toegestaan: alleen cijfers ("1000"), of
// cijfers in groepjes van drie met een spatie of een punt ertussen ("1 000", "1.000"). Alles
// anders (leeg, letters, "1.00", "10.0", "1,5", "-3") geeft null: geen antwoord.
// Het toetsenblok levert alleen cijfers; de groepjes zijn voor invoer van buitenaf.
var PLAIN_RE   = /^\d+$/;
var GROUPED_RE = /^\d{1,3}(?:([ .])\d{3})(?:\1\d{3})*$/;

export function parseTypedInteger(text) {
  if (typeof text !== "string") return null;
  var s = text.trim();
  if (s === "") return null;
  var digits;
  if (PLAIN_RE.test(s)) digits = s;
  else if (GROUPED_RE.test(s)) digits = s.replace(/[ .]/g, "");
  else return null;
  if (digits.length > TYPE_MAX_DIGITS) return null;
  return Number(digits);
}

// Weergave van de cijfers tijdens het typen: groepjes van drie met een spatie ("12 533")
export function formatTypedDigits(digits) {
  var s = String(digits || "");
  var out = "";
  for (var i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 === 0) out += " ";
    out += s.charAt(i);
  }
  return out;
}

// ── Gehele getallen met teken (Wiskunde) ─────────────────────────────────────────────
// Typinvoer: optioneel "-" vooraan, daarna cijfers zoals bij parseTypedInteger. Alleen "-" of
// leeg is geen antwoord. Zonder allowNegative is een teken geen antwoord. "-0" is 0.
export function parseTypedSigned(text, allowNegative) {
  if (typeof text !== "string") return null;
  var s = text, neg = false;
  if (s.charAt(0) === "-") {
    if (!allowNegative) return null;
    neg = true;
    s = s.slice(1);
  }
  var v = parseTypedInteger(s);
  if (v === null) return null;
  return (neg && v !== 0) ? -v : v;
}

// Het verwachte antwoord als geheel getal lezen. Een getal blijft zichzelf (alleen hele getallen).
// Een tekst mag een minteken hebben (U+2212 of "-") en groepjes van drie met een (vaste) spatie:
// "\u221219", "10\u00a0000". Al het andere geeft null.
var ANSWER_INT_RE = /^[\u2212-]?(?:\d+|\d{1,3}(?:[ \u00a0]\d{3})+)$/;

export function readAnswerInteger(answer) {
  if (typeof answer === "number") return (isFinite(answer) && Math.floor(answer) === answer) ? answer : null;
  if (typeof answer !== "string" || !ANSWER_INT_RE.test(answer)) return null;
  var neg = answer.charAt(0) === "\u2212" || answer.charAt(0) === "-";
  var v = Number(answer.replace(/[^\d]/g, ""));
  return (neg && v !== 0) ? -v : v;
}

// Een waarde schrijven in dezelfde vorm als het verwachte antwoord: bij een getal als getal,
// bij tekst in de notatie van Wiskunde (minteken U+2212, groepjes van drie met een vaste spatie
// vanaf 10 000, zoals int() in wiskunde-getallen.js).
export function writeAnswerInteger(value, answer) {
  if (typeof answer === "number") return value;
  var s = String(Math.abs(value));
  if (s.length > 4) s = s.replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
  return (value < 0 ? "\u2212" : "") + s;
}

// ── Kommagetallen (exact: een geheel getal met een schaal, nooit een JavaScript-kommagetal) ──
// Een decimaal getal is { m, s }: m = alle cijfers als geheel getal, s = aantal decimalen.
// "0,55" -> { m: 55, s: 2 }; "8,0" -> { m: 80, s: 1 }; "7" -> { m: 7, s: 0 }.
var TYPED_DEC_RE  = /^(\d+)(?:,(\d+))?$/;
var ANSWER_DEC_RE = /^(\d+)(?:,(\d+))?$/;

function decUit(heel, dec) {
  return { m: Number(heel + (dec || "")), s: (dec || "").length, heel: heel, dec: dec || "" };
}

// Typinvoer lezen: cijfers, eventueel een komma met minstens één cijfer erna ("0," en "," zijn
// geen antwoord). Hoogstens TYPE_MAX_DIGITS cijfers in totaal en hoogstens maxDecimals decimalen.
export function parseTypedDecimal(text, maxDecimals) {
  if (typeof text !== "string") return null;
  var r = TYPED_DEC_RE.exec(text);
  if (!r) return null;
  var dec = r[2] || "";
  if ((r[1] + dec).length > TYPE_MAX_DIGITS) return null;
  if (dec.length > (maxDecimals === undefined ? 3 : maxDecimals)) return null;
  return decUit(r[1], dec);
}

// Het verwachte antwoord lezen als kommagetal (tekst "0,55" of "7", of een geheel getal)
export function readAnswerDecimal(answer) {
  if (typeof answer === "number") return (isFinite(answer) && Math.floor(answer) === answer && answer >= 0) ? decUit(String(answer), "") : null;
  if (typeof answer !== "string") return null;
  var r = ANSWER_DEC_RE.exec(answer);
  return r ? decUit(r[1], r[2] || "") : null;
}

// Schrijven in de vorm van het antwoord: zonder voorloopnullen; zelfdeDecimalen = true houdt het
// aantal decimalen zoals gegeven (afronden), anders zonder eindnullen ("0,50" -> "0,5", "7,0" -> "7").
// Bij een getal als antwoord: een getal (alleen als de waarde geheel is), anders tekst.
export function writeAnswerDecimal(d, answer, zelfdeDecimalen) {
  var heel = String(Number(d.heel));
  var dec  = d.dec;
  if (!zelfdeDecimalen) dec = dec.replace(/0+$/, "");
  if (typeof answer === "number" && dec === "") return Number(heel);
  return dec === "" ? heel : heel + "," + dec;
}

// ── Geldbedragen (exact in centen) ───────────────────────────────────────────────
// Een bedrag is tekst: "\u20ac", een vaste spatie, het getal: "\u20ac\u00a08,15" of in hele euro's "\u20ac\u00a06".
// Alleen tekst is een bedrag; een getal als antwoord (zoals 800 cent) is geen bedrag.
var ANSWER_MONEY_RE = /^\u20ac\u00a0(\d+)(?:,(\d\d))?$/;

export function readAnswerMoney(answer) {
  if (typeof answer !== "string") return null;
  var r = ANSWER_MONEY_RE.exec(answer);
  return r ? { heel: r[1], dec: r[2] || "", metCenten: !!r[2] } : null;
}

// Een getypt bedrag (uit parseTypedDecimal) schrijven in de notatie van het antwoord.
// zelfdeDecimalen = true (bedrag schrijven, g03): de getypte decimalen blijven ("11,7" -> "\u20ac 11,7").
// Anders in centen: bij een antwoord met centen altijd twee decimalen ("8,5" -> "\u20ac 8,50"),
// bij hele euro's zonder centen als het bedrag rond is ("6,00" -> "\u20ac 6").
export function writeAnswerMoney(d, answer, zelfdeDecimalen) {
  var heel = String(Number(d.heel));
  if (zelfdeDecimalen) return "\u20ac\u00a0" + heel + (d.dec === "" ? "" : "," + d.dec);
  var a = readAnswerMoney(answer);
  var centen = (d.dec + "00").slice(0, 2);
  if ((a && a.metCenten) || centen !== "00") return "\u20ac\u00a0" + heel + "," + centen;
  return "\u20ac\u00a0" + heel;
}

// ── Procenten ──────────────────────────────────────────────────────────────────
// Een procent is tekst: een heel getal direct gevolgd door "%" ("40%"). Niet: "40 %", "40,5%", "40",
// voorloopnullen ("040%") of een getal als antwoord.
var ANSWER_PERCENT_RE = /^(0|[1-9]\d*)%$/;

export function readAnswerPercent(answer) {
  if (typeof answer !== "string") return null;
  var r = ANSWER_PERCENT_RE.exec(answer);
  return r ? Number(r[1]) : null;
}

// Canonieke notatie: het getal zonder voorloopnullen, direct gevolgd door "%"
export function writeAnswerPercent(value) {
  return String(value) + "%";
}

// ── Getal met eenheid ───────────────────────────────────────────────────────────────────
// Een hoeveelheid is tekst: het getal, een vaste spatie en een eenheid uit de vaste lijst:
// "45\u00a0cm", "7,5\u00a0kg", "60\u00a0km/u". Canoniek: zonder voorloopnullen, zonder eindnullen na
// de komma en zonder scheidingsteken voor duizendtallen. Een gewone spatie of een andere eenheid is
// geen hoeveelheid. De eenheid komt bij het nakijken altijd uit het antwoord, nooit uit de invoer.
var EENHEDEN = ["mm", "cm", "m", "km", "g", "kg", "ml", "l", "cm\u00b2", "m\u00b2", "km/u", "min", "dm\u00b2", "cm\u00b3"];  // dm² en cm³: Meetkunde
var ANSWER_QUANTITY_RE = /^(0|[1-9]\d*)(?:,(\d+))?\u00a0(\S+)$/;

export function readAnswerQuantity(answer) {
  if (typeof answer !== "string") return null;
  var r = ANSWER_QUANTITY_RE.exec(answer);
  if (!r || EENHEDEN.indexOf(r[3]) < 0) return null;
  return { heel: r[1], dec: r[2] || "", eenheid: r[3] };
}

// Een getypt getal (uit parseTypedDecimal) schrijven met de eenheid van het antwoord:
// zonder voorloopnullen en zonder eindnullen ("7,50" -> "7,5\u00a0kg", "7,0" -> "7\u00a0kg")
export function writeAnswerQuantity(d, eenheid) {
  var heel = String(Number(d.heel));
  var dec  = d.dec.replace(/0+$/, "");
  return heel + (dec === "" ? "" : "," + dec) + "\u00a0" + eenheid;
}

// ── Breuken ─────────────────────────────────────────────────────────────────────────
// Een breuk is tekst: "5/7", een gemengd getal "7 2/3" (gewone spatie) of, bij een vaardigheid met een
// geheel deel, een geheel getal "1". Canoniek: zonder voorloopnullen. Elk deel (geheel, teller, noemer)
// hoogstens FRACTION_MAX_DIGITS cijfers; de noemer is nooit 0.
export var FRACTION_MAX_DIGITS = 3;
var ANSWER_FRACTION_RE = /^(?:([1-9]\d*) )?(0|[1-9]\d*)\/([1-9]\d*)$/;
var ANSWER_WHOLE_RE    = /^(0|[1-9]\d*)$/;
var TYPED_FRACTION_RE  = /^(?:(\d+) )?(\d+)\/(\d+)$/;
var TYPED_WHOLE_RE     = /^(\d+)$/;

// Het verwachte antwoord lezen (alleen tekst in de canonieke vorm): { geheel, teller, noemer } (lege tekst = geen)
export function readAnswerFraction(answer) {
  if (typeof answer !== "string") return null;
  var r = ANSWER_FRACTION_RE.exec(answer);
  if (r) return { geheel: r[1] || "", teller: r[2], noemer: r[3] };
  r = ANSWER_WHOLE_RE.exec(answer);
  return r ? { geheel: r[1], teller: "", noemer: "" } : null;
}

// De ruwe invoer uit het breukvak lezen ("g t/n", "t/n" of "g", precies zoals getypt): elk deel
// 1..FRACTION_MAX_DIGITS cijfers, noemer niet 0. Een geheel deel alleen als gemengd. Anders null.
export function parseTypedFraction(text, gemengd) {
  if (typeof text !== "string") return null;
  var r = TYPED_FRACTION_RE.exec(text);
  var f = r ? { geheel: r[1] || "", teller: r[2], noemer: r[3] } : null;
  if (!f) { r = TYPED_WHOLE_RE.exec(text); f = r ? { geheel: r[1], teller: "", noemer: "" } : null; }
  if (!f) return null;
  if (f.geheel.length > FRACTION_MAX_DIGITS || f.teller.length > FRACTION_MAX_DIGITS || f.noemer.length > FRACTION_MAX_DIGITS) return null;
  if (f.noemer !== "" && Number(f.noemer) === 0) return null;
  if (f.geheel !== "" && !gemengd) return null;
  return f;
}

// Canonieke vorm (zonder voorloopnullen): "t/n", "g t/n" of "g"
export function writeAnswerFraction(f) {
  var g = f.geheel === "" ? "" : String(Number(f.geheel));
  if (f.teller === "") return g;
  var b = String(Number(f.teller)) + "/" + String(Number(f.noemer));
  return g === "" ? b : g + " " + b;
}

// ── Twee getallen (deling met rest, verhouding, kloktijd) ──────────────────────────────
// Een paar is tekst met twee gehele getallen en een vaste scheiding (inputConfig.tussen):
//   "rest" -> "12 rest 6" (gewone spaties), ":" -> "3\u00a0:\u00a04" (vaste spaties), zoals de generatoren.
//   "klok" -> een kloktijd op 24 uur: "8:05", "14:30", "0:30" (uur zonder voorloopnul, minuten 2 cijfers),
//   zoals tijd.js. Zie hieronder (KLOK_*): eigen regels voor uur en minuten.
// Elk getal 1..PAIR_MAX_DIGITS cijfers, zonder voorloopnul en niet 0 (gemeten: in antwoorden en keuzes
// van d27, d28, p20 en p23 hoogstens 2 cijfers en nooit 0). De volgorde telt: het eerste vak is het
// eerste getal van het antwoord.
export var PAIR_MAX_DIGITS = 2;
var PAIR_TUSSEN = { rest: " rest ", ":": "\u00a0:\u00a0", klok: ":" };
var PAIR_DEEL_RE = /^[1-9]\d*$/;

function pairDeelOk(d) {
  return typeof d === "string" && PAIR_DEEL_RE.test(d) && d.length <= PAIR_MAX_DIGITS;
}

// Kloktijd (tussen "klok"), drie gescheiden stappen:
//   1. valideren (parseTypedPair): uur 1 of 2 cijfers, 0..23 ("08" mag); minuten precies 2 cijfers, 00..59.
//      Ongeldig is null: niets wordt aangevuld of omgerekend ("5" wordt geen "05", 24 wordt geen 0).
//   2. normaliseren (writeAnswerPair): uur zonder voorloopnul, ":", minuten in 2 cijfers ("08"+"05" -> "8:05").
//   3. nakijken (grading.js, pair_exact): letterlijk gelijk aan het antwoord; met klok12 ook h en h +/- 12.
var KLOK_UUR_RE = /^\d{1,2}$/;
var KLOK_MIN_RE = /^\d{2}$/;
function klokDelenOk(a, b) {
  return typeof a === "string" && typeof b === "string" && KLOK_UUR_RE.test(a) && Number(a) <= 23 && KLOK_MIN_RE.test(b) && Number(b) <= 59;
}

// Het verwachte antwoord lezen (alleen precies de canonieke vorm van deze scheiding): { a, b }, anders null
export function readAnswerPair(answer, tussen) {
  if (typeof answer !== "string" || !Object.prototype.hasOwnProperty.call(PAIR_TUSSEN, tussen)) return null;
  if (tussen === "klok") {
    var k = answer.split(":");
    if (k.length !== 2 || !klokDelenOk(k[0], k[1]) || String(Number(k[0])) !== k[0]) return null;
    return { a: k[0], b: k[1] };
  }
  var delen = answer.split(PAIR_TUSSEN[tussen]);
  if (delen.length !== 2 || !pairDeelOk(delen[0]) || !pairDeelOk(delen[1])) return null;
  return { a: delen[0], b: delen[1] };
}

// De ruwe invoer uit de twee vakjes lezen: altijd "a|b" (eerste vak, tweede vak). Elk deel
// 1..PAIR_MAX_DIGITS cijfers, geen voorloopnul, niet 0. Anders null (niet nakijkbaar).
// Bij tussen "klok": de kloktijdregels hierboven (stap 1); de delen blijven zoals getypt ("08", "05").
export function parseTypedPair(text, tussen) {
  if (typeof text !== "string") return null;
  var delen = text.split("|");
  if (tussen === "klok") {
    if (delen.length !== 2 || !klokDelenOk(delen[0], delen[1])) return null;
    return { a: delen[0], b: delen[1] };
  }
  if (delen.length !== 2 || !pairDeelOk(delen[0]) || !pairDeelOk(delen[1])) return null;
  return { a: delen[0], b: delen[1] };
}

// Canonieke tekst van een paar bij deze scheiding (null bij een onbekende scheiding)
export function writeAnswerPair(p, tussen) {
  if (!p || !Object.prototype.hasOwnProperty.call(PAIR_TUSSEN, tussen)) return null;
  if (tussen === "klok") return klokDelenOk(p.a, p.b) ? String(Number(p.a)) + ":" + p.b : null;
  return p.a + PAIR_TUSSEN[tussen] + p.b;
}

// Hoeveel decimalen mag een getal met eenheid hebben? Zonder allowDecimal geen (en geen kommatoets).
export function quantityMaxDecimals(inputConfig) {
  if (!inputConfig || !inputConfig.allowDecimal) return 0;
  return inputConfig.maxDecimals === undefined ? 2 : inputConfig.maxDecimals;
}

// Uitleg onder de schakelaar Kiezen | Typen (per modus; anders de standaardtekst)
var TYPE_HINT = {
  geld:              "Je typt het bedrag met het cijferblok; met , typ je de centen. Munten, schatten en fout spotten blijven kiezen.",
  procenten:         "Je typt het antwoord met het cijferblok: procenten, getallen, bedragen, maten, het deel van een geheel (breukvak) en een verhouding (twee vakjes). Vergelijken, schatten en fout spotten blijven kiezen.",
  delen:             "Je typt het antwoord met het cijferblok; bij een deling met rest typ je de uitkomst en de rest in twee vakjes. Schatten en fout spotten blijven kiezen.",
  breuken:           "Je typt het antwoord in het breukvak: tik op teller, noemer of geheel en typ met het cijferblok. Vergelijken, herkennen, schatten en fout spotten blijven kiezen.",
  meten:             "Je typt het antwoord met het cijferblok: getallen, kommagetallen en maten. Eenheden kiezen, vergelijken, schatten en fout spotten blijven kiezen.",
  reizen:            "Je typt afstanden, snelheden, liters en bedragen met het cijferblok. Tijden, schatten en fout spotten blijven kiezen.",
  kommagetallen:     "Je typt het antwoord met het cijferblok; met , typ je een kommagetal en een breuk typ je in het breukvak. Vergelijken, schatten en fout spotten blijven kiezen.",
  wiskunde_getallen: "Je typt het antwoord met het cijferblok; met \u2212/+ maak je het negatief en een breuk typ je in het breukvak. Kommagetallen, procenten en keuzevragen blijven kiezen.",
  wiskunde_algebra:  "Je typt het antwoord met het cijferblok; met \u2212/+ maak je het negatief. Alleen bij invullen; vergelijkingen en vereenvoudigen blijven kiezen.",
  wiskunde_algebra2: "Je typt het antwoord met het cijferblok; met \u2212/+ maak je het negatief. Alleen bij de discriminant en een verhaal; de rest blijft kiezen.",
  wiskunde_meetkunde: "Je typt het getal met het cijferblok: graden, lengtes, oppervlaktes en inhouden (de eenheid staat al achter het vak; met , typ je een decimaal). Herkennen, fout spotten en schatten blijven kiezen.",
};
var TYPE_HINT_STANDAARD = "Je typt het antwoord met het cijferblok. Schatten en fout spotten blijven kiezen.";

export function typeHint(subjectId) {
  return Object.prototype.hasOwnProperty.call(TYPE_HINT, subjectId) ? TYPE_HINT[subjectId] : TYPE_HINT_STANDAARD;
}

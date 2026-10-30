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
      "d27_rest_tafel",           // antwoord met rest ("10 rest 4"): twee getallen
      "d28_rest_groot",           // antwoord met rest ("10 rest 4"): twee getallen
      "d34_schatten",             // schatten: het goede antwoord is de schatting
      "d35_fout_spotten",         // fout-spotter: kies de foute som
    ],
    // Snelheidsronde d37 mengt vragen uit alle blokken; de schatvragen daarin ("Schat: ...")
    // blijven kiezen. Fout-spotters en restvragen (antwoord is geen geheel getal) vangt het
    // vangnet hieronder al. Een vraag die met het cijferblok niet op het scherm past (zoals een
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

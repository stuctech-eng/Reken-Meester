import { useState, forwardRef } from "react";
import { A } from "../../styles/tokens.js";
import Keypad from "../Keypad.jsx";
import { PAIR_MAX_DIGITS, parseTypedPair } from "../../core/answerCheck.js";

// NO BACKTICKS / TEMPLATE LITERALS anywhere. String concatenation only.

// Twee getallen typen: twee vakjes naast elkaar met een vast woord of teken ertussen (tussen):
// "rest" bij een deling met rest ([uitkomst] rest [rest]), ":" bij een verhouding ([links] : [rechts]).
// Bediening zoals het breukvak: tik op een vak om het te kiezen (minstens 44 x 44 px, het actieve vak
// heeft een rand). Het cijferblok typt in het actieve vak; hoogstens PAIR_MAX_DIGITS cijfers per vak;
// een vak met alleen "0" krijgt het volgende cijfer in plaats van de 0 (geen voorloopnul). Wissen haalt
// het laatste cijfer weg; is het actieve vak leeg, dan gaat het naar het vorige vak.
// Kijkt zelf niet na: ✓ geeft de ruwe invoer "a|b" (eerste vak, tweede vak) aan onSubmit; het
// oefenscherm kijkt na (grading.js, pair_exact) en verwerkt (handleChoice). ✓ is alleen aan als beide
// vakken een getal hebben dat niet 0 is.
// De toestand (vakken en actief vak) staat hier; het oefenscherm geeft per getoonde vraag een nieuwe
// key, zodat de vakjes bij elke vraag leeg beginnen met het eerste vak actief, ook als dezelfde vraag
// terugkomt. De ref wijst naar de omhullende div, met een knop "Controleer" (meting "Passend cijferblok").

var DELEN  = ["a", "b"];
// Kloktijd (tussen "klok"): [uren] : [minuten]; tijdsduur (tussen "duur"): [uren] u [minuten] min.
// Bij beide blijft een 0 staan ("08", "05", "0"), elk vak hoogstens 2 cijfers, en ✓ gaat alleen aan als
// parseTypedPair de invoer geldig vindt (dezelfde regel als het nakijken; bij duur mag één vak leeg).
// Stelsel (tussen "stelsel"): [\u2212/+] x = [x] y = [y]. Hetzelfde als klok en duur (0 blijft staan, 2 cijfers,
// ✓ via parseTypedPair), plus een teken per vak: de toets "\u2212/+" draait het teken van het actieve vak om
// (aria-pressed = het actieve vak is negatief); getoond als echt minteken. Wissen haalt eerst de cijfers weg,
// daarna het teken. Op het kleinste scherm (tiny) is de tussenruimte 6 in plaats van 10, zodat de rij ook met
// "\u221248" in beide vakken op 320 px past. Alleen bij stelsel is er een tekentoets en die kleinere tussenruimte;
// de andere scheidingen zijn precies zoals voorheen.
var LABELS = {
  rest: { a: "Uitkomst", b: "Rest", tussen: "rest" },
  ":":  { a: "Links",    b: "Rechts", tussen: ":" },
  klok: { a: "Uren",     b: "Minuten", tussen: ":", tijd: true },
  duur: { a: "Uren",     b: "Minuten", tussen: "u", na: "min", tijd: true },
  stelsel: { a: "x",     b: "y", voor: "x\u00a0=", tussen: "y\u00a0=", teken: true },
};

var PairAnswer = forwardRef(function PairAnswer({ size, fit, feedback, disabled, tussen, onSubmit }, ref) {
  var tiny    = size === "tiny";
  var compact = size === "compact";
  var lab     = LABELS[tussen] || LABELS[":"];

  var waardeState = useState({ a: "", b: "" });
  var waarde      = waardeState[0];
  var setWaarde   = waardeState[1];
  var actiefState = useState("a");
  var actief      = actiefState[0];
  var setActief   = actiefState[1];

  var uit = !!(disabled || feedback);
  var regels = !!(lab.tijd || lab.teken);

  function deelOk(d) { return d !== "" && Number(d) !== 0; }
  var geldig = regels ? parseTypedPair(waarde.a + "|" + waarde.b, tussen) !== null : deelOk(waarde.a) && deelOk(waarde.b);

  function cijfer(d) {
    if (uit) return;
    setWaarde(function(w) {
      var oud = w[actief];
      if (regels ? oud.replace("-", "").length >= 2 : (oud.length >= PAIR_MAX_DIGITS && oud !== "0")) return w;
      var nieuw = { a: w.a, b: w.b };
      nieuw[actief] = (oud === "0" && !regels) ? d : oud + d;
      return nieuw;
    });
  }
  function wissen() {
    if (uit) return;
    if (waarde[actief] === "") {
      var i = DELEN.indexOf(actief);
      if (i > 0) setActief(DELEN[i - 1]);
      return;
    }
    setWaarde(function(w) {
      var nieuw = { a: w.a, b: w.b };
      nieuw[actief] = w[actief].slice(0, -1);
      return nieuw;
    });
  }
  function wisselTeken() {
    if (uit) return;
    setWaarde(function(w) {
      var nieuw = { a: w.a, b: w.b };
      var oud = w[actief];
      nieuw[actief] = oud.charAt(0) === "-" ? oud.slice(1) : "-" + oud;
      return nieuw;
    });
  }
  function controleer() {
    if (uit || !geldig) return;
    onSubmit(waarde.a + "|" + waarde.b);
  }

  var kleur  = feedback === "correct" ? A.successTxt : feedback === "wrong" ? A.errorTxt : A.text;
  var vakH   = tiny ? 44 : compact ? 46 : 50;
  var letter = tiny ? 26 : compact ? 28 : 32;

  function vak(deel) {
    var isActief = actief === deel && !uit;
    return (
      <button
        key={deel}
        type="button"
        aria-label={lab[deel]}
        aria-pressed={isActief}
        disabled={uit}
        onClick={function() { if (!uit) setActief(deel); }}
        style={{
          minWidth: 64,
          height: vakH,
          minHeight: 44,
          padding: "0 8px",
          borderRadius: A.r12,
          border: "2.5px solid " + (isActief ? A.primary : A.border),
          background: isActief ? A.bgCard : "transparent",
          color: kleur,
          fontSize: letter,
          fontWeight: 900,
          fontVariantNumeric: "tabular-nums",
          letterSpacing: 0,
          cursor: uit ? "default" : "pointer",
          WebkitTapHighlightColor: "transparent",
          touchAction: "manipulation",
          userSelect: "none",
          WebkitUserSelect: "none",
        }}
      >
        {lab.teken ? waarde[deel].replace("-", "\u2212") : waarde[deel]}
      </button>
    );
  }

  return (
    <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: tiny ? 8 : compact ? 10 : 12 }}>
      <div aria-label="Jouw antwoord" style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: lab.teken && tiny ? 6 : 10,
        padding: tiny ? 6 : 8,
        borderRadius: A.r16,
        border: "2.5px solid " + (
          feedback === "correct" ? A.successBorder
          : feedback === "wrong" ? A.errorBorder
          : A.primary
        ),
        background: feedback === "correct" ? A.successBg : feedback === "wrong" ? A.errorBg : A.bgCard,
        boxShadow: feedback ? "none" : A.shadow,
      }}>
        {lab.teken && (
          <button
            type="button"
            aria-label="Teken wisselen"
            aria-pressed={waarde[actief].charAt(0) === "-"}
            disabled={uit}
            onClick={wisselTeken}
            style={{
              width: 44,
              height: 44,
              flexShrink: 0,
              borderRadius: A.r12,
              border: "2px solid " + A.border,
              background: waarde[actief].charAt(0) === "-" && !uit ? A.primary : A.bgCard,
              color: waarde[actief].charAt(0) === "-" && !uit ? "#ffffff" : A.text,
              fontSize: 18,
              fontWeight: 900,
              letterSpacing: 0,
              cursor: uit ? "default" : "pointer",
              opacity: feedback ? 0.5 : 1,
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
              userSelect: "none",
              WebkitUserSelect: "none",
            }}
          >
            {"\u2212/+"}
          </button>
        )}
        {lab.voor && (
          <span aria-hidden="true" style={{
            color: kleur,
            fontSize: Math.round(letter * 0.7),
            fontWeight: 900,
            userSelect: "none",
            WebkitUserSelect: "none",
          }}>
            {lab.voor}
          </span>
        )}
        {vak("a")}
        <span aria-hidden="true" style={{
          color: kleur,
          fontSize: lab.tussen === ":" ? letter : Math.round(letter * 0.7),
          fontWeight: 900,
          userSelect: "none",
          WebkitUserSelect: "none",
        }}>
          {lab.tussen}
        </span>
        {vak("b")}
        {lab.na && (
          <span aria-hidden="true" style={{
            color: kleur,
            fontSize: Math.round(letter * 0.7),
            fontWeight: 900,
            userSelect: "none",
            WebkitUserSelect: "none",
          }}>
            {lab.na}
          </span>
        )}
      </div>
      {!feedback && (
        <Keypad
          onDigit={cijfer}
          onBackspace={wissen}
          onSubmit={controleer}
          canSubmit={geldig}
          disabled={disabled}
          size={size}
          keyH={fit.keyH}
          gap={fit.gap}
        />
      )}
    </div>
  );
});

export default PairAnswer;

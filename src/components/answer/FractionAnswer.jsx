import { useState, forwardRef } from "react";
import { A } from "../../styles/tokens.js";
import Keypad from "../Keypad.jsx";
import { FRACTION_MAX_DIGITS } from "../../core/answerCheck.js";

// NO BACKTICKS / TEMPLATE LITERALS anywhere. String concatenation only.

// Breuk typen: een breukvak met teller boven een streep en noemer eronder; bij gemengd ook een
// vak voor het geheel links. Dat geheel-vak staat er bij gemengd altijd, ook als het antwoord geen
// gemengd getal is (anders verraadt het vak de vorm van het antwoord).
// Bediening: tik op een vak om het te kiezen (minstens 44 x 44 px, het actieve vak heeft een rand).
// Het cijferblok typt in het actieve vak; hoogstens FRACTION_MAX_DIGITS cijfers per vak; een vak
// met alleen "0" krijgt het volgende cijfer in plaats van de 0 (geen voorloopnul). Wissen haalt het
// laatste cijfer weg; is het actieve vak leeg, dan gaat het naar het vorige vak.
// Kijkt zelf niet na: ✓ geeft de ruwe invoer ("g t/n", "t/n" of "g") aan onSubmit; het oefenscherm
// kijkt na (grading.js) en verwerkt (handleChoice). ✓ is alleen aan als teller en noemer allebei
// zijn ingevuld (noemer niet 0), of bij gemengd alleen het geheel.
// De toestand (vakken en actief vak) staat hier; het oefenscherm geeft per getoonde vraag een
// nieuwe key, zodat het vak bij elke vraag leeg begint, ook als dezelfde vraag terugkomt.
// De ref wijst naar de omhullende div, met een knop "Controleer" (meting "Passend cijferblok").

var VOLGORDE = ["geheel", "teller", "noemer"];
var LABEL    = { geheel: "Geheel", teller: "Teller", noemer: "Noemer" };

var FractionAnswer = forwardRef(function FractionAnswer({ size, fit, feedback, disabled, gemengd, onSubmit }, ref) {
  var tiny    = size === "tiny";
  var compact = size === "compact";
  var delen   = gemengd ? VOLGORDE : VOLGORDE.slice(1);

  var waardeState = useState({ geheel: "", teller: "", noemer: "" });
  var waarde      = waardeState[0];
  var setWaarde   = waardeState[1];
  var actiefState = useState(delen[0]);
  var actief      = actiefState[0];
  var setActief   = actiefState[1];

  var uit = !!(disabled || feedback);

  function ruw() {
    if (waarde.teller === "" && waarde.noemer === "") return waarde.geheel;
    var b = waarde.teller + "/" + waarde.noemer;
    return waarde.geheel === "" ? b : waarde.geheel + " " + b;
  }
  var breukCompleet = waarde.teller !== "" && waarde.noemer !== "" && Number(waarde.noemer) !== 0;
  var alleenGeheel  = gemengd && waarde.geheel !== "" && waarde.teller === "" && waarde.noemer === "";
  var geldig        = breukCompleet || alleenGeheel;

  function cijfer(d) {
    if (uit) return;
    setWaarde(function(w) {
      var oud = w[actief];
      if (oud.length >= FRACTION_MAX_DIGITS && oud !== "0") return w;
      var nieuw = {};
      nieuw.geheel = w.geheel; nieuw.teller = w.teller; nieuw.noemer = w.noemer;
      nieuw[actief] = oud === "0" ? d : oud + d;
      return nieuw;
    });
  }
  function wissen() {
    if (uit) return;
    if (waarde[actief] === "") {
      var i = delen.indexOf(actief);
      if (i > 0) setActief(delen[i - 1]);
      return;
    }
    setWaarde(function(w) {
      var nieuw = {};
      nieuw.geheel = w.geheel; nieuw.teller = w.teller; nieuw.noemer = w.noemer;
      nieuw[actief] = w[actief].slice(0, -1);
      return nieuw;
    });
  }
  function controleer() {
    if (uit || !geldig) return;
    onSubmit(ruw());
  }

  var kleur = feedback === "correct" ? A.successTxt : feedback === "wrong" ? A.errorTxt : A.text;
  var vakH  = tiny ? 44 : compact ? 46 : 50;
  var letter = tiny ? 26 : compact ? 28 : 32;

  function vak(deel) {
    var isActief = actief === deel && !uit;
    return (
      <button
        key={deel}
        type="button"
        aria-label={LABEL[deel]}
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
        {waarde[deel]}
      </button>
    );
  }

  return (
    <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: tiny ? 8 : compact ? 10 : 12 }}>
      <div aria-label="Jouw antwoord" style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
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
        {gemengd && vak("geheel")}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: 4 }}>
          {vak("teller")}
          <div aria-hidden="true" style={{ height: 3, borderRadius: 2, background: kleur }} />
          {vak("noemer")}
        </div>
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

export default FractionAnswer;

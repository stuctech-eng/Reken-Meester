import { forwardRef } from "react";
import { A } from "../../styles/tokens.js";
import Keypad from "../Keypad.jsx";
import { formatTypedDigits } from "../../core/answerCheck.js";

// NO BACKTICKS / TEMPLATE LITERALS anywhere. String concatenation only.

// Antwoord typen: het ingetypte getal in het antwoordvak, met het eigen cijferblok eronder.
// Kijkt zelf niet na: ✓ (Controleer) roept onSubmit aan; het oefenscherm kijkt na (grading.js)
// en verwerkt (handleChoice). De ref wijst naar de omhullende div: daarmee meet het
// oefenscherm of ✓ op het scherm past ("Passend cijferblok").
// fit: { keyH, gap, vakH } = de maten na de meting (of de vaste maten per schermgrootte).
// inputConfig.allowNegative: een toets "\u2212/+" links in het antwoordvak draait het teken om
// (onSign). typed heeft dan eventueel "-" vooraan; getoond als echt minteken (U+2212).
// komma (inputType "decimal"): een toets "," rechts in het antwoordvak (onComma); typed bevat dan
// eventueel een ",". euro (inputType "money"): "\u20ac" voor het getal zodra er iets is getypt.
// Zonder allowNegative, komma en euro is het vak precies zoals voorheen.

// Kleinste hoogte van het antwoordvak met tekentoets: toets 44 px plus de rand (2 x 2,5 px)
export var VAK_MIN_TEKEN = 49;
var TEKEN_W = 52;

var NumberAnswer = forwardRef(function NumberAnswer({ size, fit, feedback, disabled, typed, onDigit, onBackspace, onSubmit, canSubmit, onSign, inputConfig, komma, onComma, euro }, ref) {
  var tiny    = size === "tiny";
  var compact = size === "compact";
  var teken   = !!(inputConfig && inputConfig.allowNegative);
  var neg     = teken && typed.charAt(0) === "-";
  var cijfers = neg ? typed.slice(1) : typed;
  var kpos    = cijfers.indexOf(",");
  var tekst   = (euro ? "\u20ac\u00a0" : "") + (neg ? "\u2212" : "") + (kpos < 0 ? formatTypedDigits(cijfers) : formatTypedDigits(cijfers.slice(0, kpos)) + cijfers.slice(kpos));
  var extra   = teken || !!komma;
  var basis   = tiny ? 32 : compact ? 36 : 42;
  // Met teken- of kommatoets is er minder breedte: lange getallen ("\u22129 999 999") krijgen een kleinere letter
  var letter  = extra && tekst.length > 6 ? Math.max(22, Math.floor(basis * 6 / tekst.length)) : basis;
  var vakStijl = {
    minHeight: fit.vakH,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: A.r16,
    border: "2.5px solid " + (
      feedback === "correct" ? A.successBorder
      : feedback === "wrong" ? A.errorBorder
      : A.primary
    ),
    background: feedback === "correct" ? A.successBg : feedback === "wrong" ? A.errorBg : A.bgCard,
    color: feedback === "correct" ? A.successTxt : feedback === "wrong" ? A.errorTxt : A.text,
    fontSize: tiny ? 32 : compact ? 36 : 42,
    fontWeight: 900,
    fontVariantNumeric: "tabular-nums",
    letterSpacing: -0.5,
    whiteSpace: "nowrap",
    boxShadow: feedback ? "none" : A.shadow,
  };
  if (extra) {
    vakStijl.position     = "relative";
    vakStijl.fontSize     = letter;
    vakStijl.paddingLeft  = TEKEN_W;
    vakStijl.paddingRight = TEKEN_W;
  }
  return (
    <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: tiny ? 8 : compact ? 10 : 12 }}>
      <div aria-label="Jouw antwoord" style={vakStijl}>
        {teken && (
          <button
            type="button"
            aria-label="Teken wisselen"
            aria-pressed={neg}
            disabled={disabled || !!feedback}
            onClick={function() { if (!disabled && !feedback) onSign(); }}
            style={{
              position: "absolute",
              left: 0,
              top: "50%",
              transform: "translateY(-50%)",
              width: 44,
              height: 44,
              marginLeft: 4,
              borderRadius: A.r12,
              border: "2px solid " + A.border,
              background: neg ? A.primary : A.bgCard,
              color: neg ? "#ffffff" : A.text,
              fontSize: 18,
              fontWeight: 900,
              letterSpacing: 0,
              cursor: (disabled || feedback) ? "default" : "pointer",
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
        {typed === ""
          ? <span style={{ color: A.textSoft, fontSize: tiny ? 16 : 18, fontWeight: 700, letterSpacing: 0 }}>{"Typ je antwoord"}</span>
          : (extra ? tekst : formatTypedDigits(typed))}
        {komma && (
          <button
            type="button"
            aria-label="Komma"
            disabled={disabled || !!feedback || kpos >= 0}
            onClick={function() { if (!disabled && !feedback) onComma(); }}
            style={{
              position: "absolute",
              right: 0,
              top: "50%",
              transform: "translateY(-50%)",
              width: 44,
              height: 44,
              marginRight: 4,
              borderRadius: A.r12,
              border: "2px solid " + A.border,
              background: A.bgCard,
              color: A.text,
              fontSize: 26,
              fontWeight: 900,
              letterSpacing: 0,
              cursor: (disabled || feedback || kpos >= 0) ? "default" : "pointer",
              opacity: (feedback || kpos >= 0) ? 0.5 : 1,
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
              userSelect: "none",
              WebkitUserSelect: "none",
            }}
          >
            {","}
          </button>
        )}
      </div>
      {!feedback && (
        <Keypad
          onDigit={onDigit}
          onBackspace={onBackspace}
          onSubmit={onSubmit}
          canSubmit={canSubmit}
          disabled={disabled}
          size={size}
          keyH={fit.keyH}
          gap={fit.gap}
        />
      )}
    </div>
  );
});

export default NumberAnswer;

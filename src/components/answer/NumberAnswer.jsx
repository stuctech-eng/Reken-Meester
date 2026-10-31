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
var NumberAnswer = forwardRef(function NumberAnswer({ size, fit, feedback, disabled, typed, onDigit, onBackspace, onSubmit, canSubmit }, ref) {
  var tiny    = size === "tiny";
  var compact = size === "compact";
  return (
    <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: tiny ? 8 : compact ? 10 : 12 }}>
      <div
        aria-label="Jouw antwoord"
        style={{
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
        }}
      >
        {typed === ""
          ? <span style={{ color: A.textSoft, fontSize: tiny ? 16 : 18, fontWeight: 700, letterSpacing: 0 }}>{"Typ je antwoord"}</span>
          : formatTypedDigits(typed)}
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

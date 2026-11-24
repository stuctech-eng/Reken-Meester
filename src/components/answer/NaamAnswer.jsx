import { forwardRef, useState } from "react";
import { A, T } from "../../styles/tokens.js";

// NO BACKTICKS / TEMPLATE LITERALS anywhere. String concatenation only.

// Een naam typen (Topografie, plan T3 par. 3.3): een tekstvak met het toetsenbord van de iPhone, zonder autocorrectie, automatische
// hoofdletter en spellingcontrole, en de knop Controleer. Kijkt zelf niet na: onSubmit krijgt de ruwe tekst (grading.js,
// naam_varianten). Enter of Controleer geeft het antwoord; een leeg vak doet niets. Letters minstens 16 px, zodat Safari niet inzoomt.
var NaamAnswer = forwardRef(function NaamAnswer(props, ref) {
  var st = useState(""), tekst = st[0], setTekst = st[1];
  var klaar = !!props.feedback || props.disabled;
  function geef() { if (!klaar && tekst.trim() !== "") props.onSubmit(tekst); }
  return (
    <div ref={ref} style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
      <input
        type="text"
        aria-label="Typ de naam"
        value={tekst}
        disabled={klaar}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        enterKeyHint="done"
        placeholder="Typ de naam"
        onChange={function(e) { setTekst(e.target.value); }}
        onKeyDown={function(e) { if (e.key === "Enter") { e.preventDefault(); geef(); } }}
        style={{ flex: "1 1 auto", minWidth: 0, minHeight: 52, fontFamily: "inherit", fontSize: 20, fontWeight: 800, color: A.text, background: A.bgCard,
          border: "2px solid " + (props.feedback === "correct" ? A.successBorder : props.feedback === "wrong" ? A.errorBorder : A.border), borderRadius: A.r16, padding: "0 14px" }}
      />
      <button
        type="button"
        aria-label="Controleer"
        disabled={klaar || tekst.trim() === ""}
        onClick={geef}
        style={{ flex: "0 0 auto", minWidth: 52, minHeight: 52, fontFamily: "inherit", fontSize: T.lg, fontWeight: 900, color: "#fff", background: A.primary, border: "none", borderRadius: A.r16, cursor: "pointer", opacity: klaar || tekst.trim() === "" ? 0.5 : 1 }}
      >
        {"✓"}
      </button>
    </div>
  );
});

export default NaamAnswer;

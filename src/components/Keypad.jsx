import { A } from "../styles/tokens.js";

// NO BACKTICKS / TEMPLATE LITERALS anywhere. String concatenation only.

// Eigen cijferblok voor "Antwoord typen". Geen iPhone-toetsenbord: dat schuift het scherm
// omhoog en dekt de som af. Indeling:
//   1 2 3
//   4 5 6
//   7 8 9
//   ⌫ 0 ✓
// ✓ = Controleer (alleen actief als er iets is ingetypt). Knoppen minstens 44 px hoog.
// keyH en gap (optioneel): kleinere toetsen en tussenruimte als de vraag hoog is (zie het
// oefenscherm, "Passend cijferblok"); zonder deze waarden de vaste maten per schermgrootte.
var ROWS = [["1", "2", "3"], ["4", "5", "6"], ["7", "8", "9"], ["del", "0", "ok"]];

// Vaste maten per schermgrootte (toets, tussenruimte, antwoordvak) en de kleinste maten
export var KEYPAD_SIZES = {
  normal:  { keyH: 60, gap: 10, vakH: 68 },
  compact: { keyH: 52, gap: 8,  vakH: 58 },
  tiny:    { keyH: 46, gap: 6,  vakH: 52 },
};
export var KEYPAD_MIN = { keyH: 44, gap: 4, vakH: 44 };

export default function Keypad({ onDigit, onBackspace, onSubmit, canSubmit, disabled, size, keyH, gap }) {
  var tiny    = size === "tiny";
  var compact = size === "compact";
  var keyHgt  = keyH || KEYPAD_SIZES[tiny ? "tiny" : compact ? "compact" : "normal"].keyH;
  var keyGap  = gap  || KEYPAD_SIZES[tiny ? "tiny" : compact ? "compact" : "normal"].gap;

  function keyStyle(kind, off) {
    var isOk = kind === "ok";
    return {
      height: keyHgt,
      minHeight: 44,
      borderRadius: A.r16,
      border: "2px solid " + (isOk ? (off ? A.border : A.primary) : A.border),
      background: isOk ? (off ? A.border : A.primary) : A.bgCard,
      color: isOk ? "#ffffff" : A.text,
      fontSize: kind === "digit" ? (tiny ? 26 : 30) : (tiny ? 20 : 22),
      fontWeight: 900,
      fontVariantNumeric: "tabular-nums",
      boxShadow: off ? "none" : A.shadow,
      cursor: off ? "default" : "pointer",
      opacity: off && !isOk ? 0.5 : 1,
      WebkitTapHighlightColor: "transparent",
      touchAction: "manipulation",
      userSelect: "none",
      WebkitUserSelect: "none",
    };
  }

  return (
    <div
      role="group"
      aria-label="Cijferblok"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: keyGap,
      }}
    >
      {ROWS.map(function(row) {
        return row.map(function(k) {
          if (k === "del") {
            return (
              <button key={k} type="button" aria-label="Wissen" disabled={disabled}
                onClick={function() { if (!disabled) onBackspace(); }}
                style={keyStyle("del", disabled)}>
                {"⌫"}
              </button>
            );
          }
          if (k === "ok") {
            var off = disabled || !canSubmit;
            return (
              <button key={k} type="button" aria-label="Controleer" disabled={off}
                onClick={function() { if (!off) onSubmit(); }}
                style={keyStyle("ok", off)}>
                {"✓"}
              </button>
            );
          }
          return (
            <button key={k} type="button" disabled={disabled}
              onClick={function() { if (!disabled) onDigit(k); }}
              style={keyStyle("digit", disabled)}>
              {k}
            </button>
          );
        });
      })}
    </div>
  );
}

import { useState, useRef, useLayoutEffect } from "react";
import { A } from "../../styles/tokens.js";

// NO BACKTICKS / TEMPLATE LITERALS anywhere. String concatenation only.

// Antwoord kiezen: vier knoppen in twee kolommen. Kijkt zelf niet na; een klik gaat naar
// onChoice (het oefenscherm verwerkt het antwoord in handleChoice).
//
// Knopgrootte: de twee kolommen zijn altijd precies half zo breed (minmax(0, 1fr)), ook als een
// keuze niet kan afbreken ("3050 mm", "€ 27,30", "september"). Past een keuzetekst niet in zijn
// knop, dan worden alle vier de knoppen samen kleiner (zelfde letter, dus geen hint), tot
// hoogstens CH_FONT_MIN of CH_SMALL_MIN. Past alles, dan blijft het 38 px (of 24 px bij
// smallChoices en bij fout-spotters: vier hele sommen als keuze, isErrorSpotter). Gemeten vóór
// het eerste beeld, opnieuw na het laden van de letters en bij een andere schermbreedte; chFont staat niet in de afhankelijkheden, dus het meten geeft geen lus.
var CH_FONT_MIN  = 22;
var CH_SMALL_MIN = 16;

export default function ChoiceGrid({ vraag, size, feedback, selected, onChoice }) {
  var tiny    = size === "tiny";
  var compact = size === "compact";

  var chRef       = useRef(null);
  var chFontState = useState(null);
  var chFont      = chFontState[0];
  var setChFont   = chFontState[1];
  var chSmall     = !!(vraag.smallChoices || vraag.isErrorSpotter);
  var chBase      = chSmall ? 24 : 38;
  var chMin       = chSmall ? CH_SMALL_MIN : CH_FONT_MIN;
  var chKey       = String(vraag.question) + "|" + vraag.choices.join("|");

  useLayoutEffect(function() {
    var grid = chRef.current;
    if (!grid) return undefined;
    var active = true;
    function buttons() { return Array.prototype.slice.call(grid.querySelectorAll("button")); }
    function setAll(f) { buttons().forEach(function(b) { b.style.fontSize = f + "px"; }); }
    // Te breed: de tekst steekt uit de knop, of komt in de binnenmarge (padding) van de knop
    function tooWide() {
      return buttons().some(function(b) {
        if (b.scrollWidth > b.clientWidth + 0.5) return true;
        if (!document.createRange) return false;
        var cs    = window.getComputedStyle(b);
        var avail = b.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        var range = document.createRange();
        range.selectNodeContents(b);
        var rects = range.getClientRects ? range.getClientRects() : [];
        for (var i = 0; i < rects.length; i++) { if (rects[i].width > avail + 0.5) return true; }
        return false;
      });
    }
    function fit() {
      if (!active || !grid.isConnected) return;
      setAll(chBase);
      var f = chBase;
      while (f > chMin && tooWide()) { f -= 1; setAll(f); }
      setChFont(f === chBase ? null : f);
    }
    fit();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    window.addEventListener("resize", fit);
    return function() { active = false; window.removeEventListener("resize", fit); };
  }, [chKey, chBase, chMin]);

  return (
    <div ref={chRef} style={{
      display: "grid",
      // minmax(0, 1fr): een brede keuze maakt de kolom nooit breder dan de helft
      gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
      gap: tiny ? 8 : compact ? 10 : 12,
    }}>
      {vraag.choices.map(function(choice) {
        var isSelected   = selected === choice;
        var isCorrectAns = choice === vraag.answer;
        var bg     = A.bgCard;
        var border = A.border;
        var color  = A.text;
        var shadow = A.shadow;

        if (feedback) {
          if (isCorrectAns) {
            bg = A.successBg; border = A.successBorder; color = A.successTxt; shadow = "none";
          } else if (isSelected) {
            bg = A.errorBg; border = A.errorBorder; color = A.errorTxt; shadow = "none";
          }
        }

        return (
          <button
            key={choice}
            onClick={function() { onChoice(choice); }}
            disabled={selected !== null}
            style={{
              padding: tiny ? "10px 8px" : compact ? "12px 10px" : "20px 12px",
              borderRadius: A.r16,
              border: "2.5px solid " + border,
              background: bg,
              color: color,
              // smallChoices en fout-spotters (muntrijen, woorden, hele sommen): 24; anders 38. Kleiner alleen als
              // een keuze niet past (zie Knopgrootte); alle vier de knoppen krijgen dan dezelfde letter
              fontSize: chFont || chBase,
              minWidth: 0,
              fontWeight: 900,
              boxShadow: shadow,
              transition: "background 0.15s, border-color 0.15s, transform 0.1s",
              cursor: selected !== null ? "default" : "pointer",
              WebkitTapHighlightColor: "transparent",
              minHeight: tiny ? 56 : compact ? 64 : 80,
              transform: "scale(1)",
              letterSpacing: -0.5,
            }}
          >
            {choice}
          </button>
        );
      })}
    </div>
  );
}

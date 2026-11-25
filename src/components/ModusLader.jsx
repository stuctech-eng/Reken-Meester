import { useState, useEffect } from "react";
import { Screen } from "./UI.jsx";
import { A } from "../styles/tokens.js";
import { laadTopo } from "../core/topo/laden.js";

// NO BACKTICKS / TEMPLATE LITERALS anywhere. String concatenation only.

// Wacht met het oefenscherm tot de kaarten en de kennisbank van een modus van Topografie geladen zijn (plan T3 par. 3.1): het
// oefenscherm maakt zijn eerste vraag meteen. Een modus zonder kaarten (rekenen, wiskunde) tekent direct zijn kinderen, zonder
// iets te laden. Bij een fout een zichtbare melding, met "Opnieuw" en "Terug".
// opGeladen (optioneel, plan T4 par. 5.2): na het laden en voor het oefenscherm, bijvoorbeeld om de sessie van Topografie te starten
// met de opgeslagen itemstand. Een fout daarin geeft dezelfde melding.
export default function ModusLader({ kaarten, onBack, opGeladen, children }) {
  var nodig = !!(kaarten && kaarten.length);
  var st = useState(nodig ? "laden" : "klaar"), stand = st[0], setStand = st[1];
  var ft = useState(null), fout = ft[0], setFout = ft[1];
  var pg = useState(0), poging = pg[0], setPoging = pg[1];

  useEffect(function() {
    if (!nodig) return undefined;
    var weg = false;
    setStand("laden"); setFout(null);
    // ook de code van de kaart (KaartAntwoord) meteen: een laadfout komt dan hier, met Opnieuw en Terug, en niet midden in een vraag
    Promise.all([laadTopo(kaarten), import("./answer/KaartAntwoord.jsx")]).then(function() { if (opGeladen) opGeladen(); if (!weg) setStand("klaar"); }).then(null, function(e) { if (!weg) { setFout(e && e.message ? e.message : String(e)); setStand("fout"); } });
    return function() { weg = true; };
  }, [nodig, poging]);

  if (stand === "klaar") return children;
  var knop = { fontFamily: "inherit", fontWeight: 800, fontSize: 16, minHeight: 44, borderRadius: 12, border: "2px solid " + A.border, background: A.bgCard, color: A.text, padding: "0 16px", cursor: "pointer" };
  return (
    <Screen>
      <div style={{ padding: "calc(env(safe-area-inset-top) + 32px) 16px 16px", textAlign: "center" }}>
        {stand === "laden" && <div role="status" style={{ fontWeight: 800, fontSize: 18, color: A.text }}>{"Kaart laden…"}</div>}
        {stand === "fout" && (
          <div role="alert">
            <div style={{ fontWeight: 800, fontSize: 18, color: A.error, marginBottom: 8 }}>{"De kaart kon niet laden."}</div>
            <div style={{ fontSize: 14, color: A.textSoft, marginBottom: 16, wordBreak: "break-word" }}>{fout}</div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <button type="button" style={knop} onClick={function() { setPoging(poging + 1); }}>{"Opnieuw"}</button>
              <button type="button" style={knop} onClick={onBack}>{"Terug"}</button>
            </div>
          </div>
        )}
      </div>
    </Screen>
  );
}

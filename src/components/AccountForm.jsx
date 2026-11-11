import { useState } from "react";
import { A, D, T } from "../styles/tokens.js";

// NO BACKTICKS / TEMPLATE LITERALS anywhere. String concatenation only.
//
// Formulier voor het account (plan IN, fase IN-2): account maken, inloggen en wachtwoord vergeten. Het formulier
// roept alleen de handlers aan; die geven null (gelukt of geannuleerd) of een fouttekst, die onder het
// formulier blijft staan. Het formulier blijft daarna bruikbaar.
//
// props:
//   start: null (de twee knoppen), "maken" of "inloggen"
//   onMaak(email, wachtwoord), onInlog(email, wachtwoord), onVergeten(email): beloftes met null of een tekst
//   inlogUit: een tekst als inloggen hier niet kan (bijvoorbeeld zonder Web Locks), anders null
//   donker: het donkere thema (naamscherm)
//   onTerug: als het formulier op een vaste keuze begint (start), wat "Terug" dan doet

export default function AccountForm({ start, onMaak, onInlog, onVergeten, inlogUit, donker, onTerug }) {
  var C = donker
    ? { bg: D.bg, card: D.bgCard, text: D.text, soft: D.textSoft, border: D.border, primary: D.primary, error: D.error }
    : { bg: A.bg, card: A.bgCard, text: A.text, soft: A.textSoft, border: A.border, primary: A.primary, error: A.error };

  var modusState = useState(start || null);
  var modus      = modusState[0];
  var setModus   = modusState[1];
  var emailState = useState("");
  var email      = emailState[0];
  var setEmail   = emailState[1];
  var wwState    = useState("");
  var ww         = wwState[0];
  var setWw      = wwState[1];
  var foutState  = useState(null);
  var fout       = foutState[0];
  var setFout    = foutState[1];
  var infoState  = useState(null);
  var info       = infoState[0];
  var setInfo    = infoState[1];
  var bezigState = useState(false);
  var bezig      = bezigState[0];
  var setBezig   = bezigState[1];

  function kies(m) { setModus(m); setFout(null); setInfo(null); }
  function terug() {
    if (modus === "vergeten") kies("inloggen");
    else if (onTerug) onTerug();
    else kies(null);
  }

  function voerUit() {
    if (bezig) return;
    var actie = modus === "maken" ? onMaak(email, ww) : modus === "inloggen" ? onInlog(email, ww) : onVergeten(email);
    setBezig(true);
    setFout(null);
    setInfo(null);
    Promise.resolve(actie).then(function(tekst) {
      setBezig(false);
      if (tekst) { setFout(tekst); return; }
      if (modus === "vergeten") setInfo("Als dit e-mailadres een account heeft, staat er een e-mail klaar om je wachtwoord te herstellen.");
    }, function() {
      setBezig(false);
      setFout("Er ging iets mis. Probeer het opnieuw.");
    });
  }

  var knop = {
    width: "100%",
    minHeight: 48,
    padding: "12px 18px",
    borderRadius: 14,
    fontSize: T.md,
    fontWeight: 800,
    cursor: "pointer",
    WebkitTapHighlightColor: "transparent",
    boxSizing: "border-box",
  };
  var veld = {
    width: "100%",
    minHeight: 48,
    padding: "12px 14px",
    background: C.bg,
    border: "2px solid " + C.border,
    borderRadius: 12,
    color: C.text,
    fontSize: 16,
    fontWeight: 600,
    outline: "none",
    boxSizing: "border-box",
  };

  if (!modus) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <button onClick={function() { kies("maken"); }} style={Object.assign({}, knop, { background: C.primary, color: "#ffffff", border: "none" })}>
          {"Account maken"}
        </button>
        <button
          onClick={function() { if (!inlogUit) kies("inloggen"); }}
          disabled={!!inlogUit}
          style={Object.assign({}, knop, { background: "transparent", color: C.primary, border: "2px solid " + C.primary, opacity: inlogUit ? 0.55 : 1 })}
        >
          {"Ik heb al een account"}
        </button>
        {inlogUit && <div style={{ fontSize: T.sm, color: C.soft, textAlign: "center" }}>{inlogUit}</div>}
      </div>
    );
  }

  var titel = modus === "maken" ? "Account maken" : modus === "inloggen" ? "Inloggen" : "Wachtwoord vergeten";
  var knopTekst = modus === "maken" ? "Account maken" : modus === "inloggen" ? "Inloggen" : "Stuur e-mail";

  return (
    <form
      onSubmit={function(e) { e.preventDefault(); voerUit(); }}
      style={{ display: "flex", flexDirection: "column", gap: 10 }}
    >
      <div style={{ fontWeight: 800, fontSize: T.md, color: C.text }}>{titel}</div>
      <input
        type="email"
        name="email"
        autoComplete="email"
        inputMode="email"
        placeholder="E-mailadres"
        value={email}
        onChange={function(e) { setEmail(e.target.value); setFout(null); }}
        style={veld}
      />
      {modus !== "vergeten" && (
        <input
          type="password"
          name="password"
          autoComplete={modus === "maken" ? "new-password" : "current-password"}
          placeholder={modus === "maken" ? "Nieuw wachtwoord (minstens 6 tekens)" : "Wachtwoord"}
          value={ww}
          onChange={function(e) { setWw(e.target.value); setFout(null); }}
          style={veld}
        />
      )}
      {fout && (
        <div role="alert" style={{ color: C.error, fontSize: T.sm, fontWeight: 700, lineHeight: 1.4 }}>{fout}</div>
      )}
      {info && (
        <div role="status" style={{ color: C.text, fontSize: T.sm, fontWeight: 600, lineHeight: 1.4 }}>{info}</div>
      )}
      <button
        type="submit"
        disabled={bezig}
        style={Object.assign({}, knop, { background: C.primary, color: "#ffffff", border: "none", opacity: bezig ? 0.6 : 1 })}
      >
        {bezig ? "Bezig..." : knopTekst}
      </button>
      {modus === "inloggen" && (
        <button type="button" onClick={function() { kies("vergeten"); }} style={Object.assign({}, knop, { background: "transparent", color: C.primary, border: "none" })}>
          {"Wachtwoord vergeten?"}
        </button>
      )}
      <button type="button" onClick={terug} style={Object.assign({}, knop, { background: "transparent", color: C.soft, border: "none" })}>
        {"Terug"}
      </button>
    </form>
  );
}

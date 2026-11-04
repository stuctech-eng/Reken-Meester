import { Component, useState } from "react";
import { A } from "../styles/tokens.js";

// NO BACKTICKS / TEMPLATE LITERALS anywhere. String concatenation only.

// Foutopvang voor de hele app (main.jsx). Gaat er bij het tekenen iets mis, dan toont dit een
// foutkaart in plaats van een leeg scherm. Zonder fout tekent het alleen zijn kinderen (geen
// extra HTML). Fouten bij het maken van een volgende vraag (klik of timer) geeft het oefenscherm
// door door ze bij het tekenen opnieuw te gooien, zodat ook die hier uitkomen.
// "Opnieuw starten" herlaadt de app; bij het laden zet het bestaande herstel (concept-sessie en
// wachtrij in App) de voortgang terug.
// Uitzondering op de functiestijl van de rest van de code: React vangt een fout bij het tekenen
// alleen op in een klasse-onderdeel (getDerivedStateFromError / componentDidCatch).

var STAPEL_REGELS = 6;

function eersteRegels(tekst, n) {
  if (!tekst) return "";
  return String(tekst).split("\n").map(function(r) { return r.trim(); }).filter(function(r) { return r !== ""; }).slice(0, n).join("\n");
}

function maakDetails(error, info, tijd) {
  var melding = error && error.message ? String(error.message) : String(error);
  var regels  = [
    "Melding: " + melding,
    "Tijd: " + tijd,
  ];
  var stapel = eersteRegels(error && error.stack, STAPEL_REGELS);
  if (stapel) regels.push("", "Stapel:", stapel);
  var onderdelen = eersteRegels(info && info.componentStack, STAPEL_REGELS);
  if (onderdelen) regels.push("", "Onderdelen:", onderdelen);
  if (typeof navigator !== "undefined" && navigator.userAgent) regels.push("", "Toestel: " + navigator.userAgent);
  return regels.join("\n");
}

function FoutKaart({ details }) {
  var openState   = useState(false);
  var open        = openState[0];
  var setOpen     = openState[1];
  var kopieState  = useState(null);
  var kopie       = kopieState[0];
  var setKopie    = kopieState[1];

  function kopieer() {
    function mislukt() { setKopie("mislukt"); }
    try {
      if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") { mislukt(); return; }
      navigator.clipboard.writeText(details).then(function() { setKopie("gelukt"); }, mislukt);
    } catch (e) {
      mislukt();
    }
  }

  function herstart() {
    try { window.location.reload(); } catch (e) {}
  }

  var knop = {
    minHeight: 48,
    width: "100%",
    padding: "12px 16px",
    borderRadius: A.r12,
    fontSize: 17,
    fontWeight: 800,
    cursor: "pointer",
    touchAction: "manipulation",
  };

  return (
    <div role="alert" style={{
      minHeight: "100dvh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "16px 16px calc(16px + env(safe-area-inset-bottom, 0px))",
      background: A.bg,
    }}>
      <div style={{
        width: "100%",
        maxWidth: 420,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        padding: 20,
        borderRadius: A.r20,
        border: "2px solid " + A.errorBorder,
        background: A.bgCard,
        boxShadow: A.shadowMd,
        color: A.text,
      }}>
        <div style={{ fontSize: 22, fontWeight: 900 }}>Er ging iets mis</div>
        <div style={{ fontSize: 16, lineHeight: 1.45, color: A.textMid }}>
          De app kon dit scherm niet tonen. Tik op Opnieuw starten. Je voortgang wordt hersteld waar mogelijk.
        </div>
        <button type="button" onClick={herstart} style={Object.assign({}, knop, {
          border: "none",
          background: A.primary,
          color: "#ffffff",
        })}>
          Opnieuw starten
        </button>
        <button type="button" aria-expanded={open} onClick={function() { setOpen(!open); }} style={Object.assign({}, knop, {
          border: "2px solid " + A.border,
          background: "transparent",
          color: A.textMid,
          fontSize: 15,
        })}>
          {open ? "Details verbergen" : "Details"}
        </button>
        {open && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <pre style={{
              margin: 0,
              maxHeight: 240,
              overflow: "auto",
              padding: 12,
              borderRadius: A.r12,
              background: A.bgCardHigh,
              color: A.text,
              fontSize: 12,
              lineHeight: 1.4,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              userSelect: "text",
              WebkitUserSelect: "text",
            }}>
              {details}
            </pre>
            <button type="button" onClick={kopieer} style={Object.assign({}, knop, {
              border: "2px solid " + A.border,
              background: A.bgCard,
              color: A.text,
              fontSize: 15,
            })}>
              Kopieer details
            </button>
            {kopie && (
              <div role="status" style={{ fontSize: 14, color: kopie === "gelukt" ? A.successTxt : A.textMid }}>
                {kopie === "gelukt" ? "Gekopieerd." : "Kopiëren lukte niet. Houd de tekst hierboven ingedrukt om hem te kopiëren."}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, details: "" };
  }

  static getDerivedStateFromError(error) {
    return { error: error || new Error("onbekende fout") };
  }

  componentDidCatch(error, info) {
    this.setState({ details: maakDetails(error, info, new Date().toISOString()) });
  }

  render() {
    if (this.state.error) {
      return <FoutKaart details={this.state.details || maakDetails(this.state.error, null, new Date().toISOString())} />;
    }
    return this.props.children;
  }
}

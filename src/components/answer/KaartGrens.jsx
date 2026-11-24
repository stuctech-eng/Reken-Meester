import { Component } from "react";
import { A } from "../../styles/tokens.js";

// NO BACKTICKS / TEMPLATE LITERALS anywhere. String concatenation only.

// Foutopvang rond de kaart (Topografie, plan T3 par. 3.1): lukt het tekenen van de kaart niet, dan toont dit de melding in beeld
// (debugregel: fouten zichtbaar in de app) met "Opnieuw laden". Geen keuzes: bij een aanwijsvraag zouden de namen het antwoord
// verraden (besluit 24-11-2026). Opnieuw laden herstelt de voortgang zoals bij de foutkaart van de app (ErrorBoundary.jsx).
// Een klasse-onderdeel, omdat React een fout bij het tekenen alleen zo opvangt.
export default class KaartGrens extends Component {
  constructor(props) { super(props); this.state = { fout: null }; }
  static getDerivedStateFromError(fout) { return { fout: fout }; }
  render() {
    if (!this.state.fout) return this.props.children;
    var melding = this.state.fout && this.state.fout.message ? this.state.fout.message : String(this.state.fout);
    return (
      <div role="alert" style={{ background: A.errorBg || "#fef2f2", color: A.error, border: "2px solid " + (A.errorBorder || A.error), borderRadius: 12, padding: "10px 12px", fontWeight: 700, fontSize: 14 }}>
        <div style={{ marginBottom: 8 }}>{"De kaart kon niet laden (" + melding + ")."}</div>
        <button type="button" onClick={function() { window.location.reload(); }} style={{ fontFamily: "inherit", fontWeight: 800, fontSize: 15, minHeight: 44, borderRadius: 12, border: "2px solid " + A.border, background: A.bgCard, color: A.text, padding: "0 14px", cursor: "pointer" }}>{"Opnieuw laden"}</button>
      </div>
    );
  }
}

import { Component } from "react";
import { A } from "../../styles/tokens.js";

// NO BACKTICKS / TEMPLATE LITERALS anywhere. String concatenation only.

// Foutopvang rond de kaart (Topografie, plan T3 par. 3.1): lukt het laden of tekenen van de kaart niet, dan toont dit de melding
// in beeld (debugregel: fouten zichtbaar in de app) en daaronder de keuzes (props.terugval), zodat de vraag gewoon te beantwoorden is.
// Een klasse-onderdeel, omdat React een fout bij het tekenen alleen zo opvangt (zoals ErrorBoundary.jsx).
export default class KaartGrens extends Component {
  constructor(props) { super(props); this.state = { fout: null }; }
  static getDerivedStateFromError(fout) { return { fout: fout }; }
  render() {
    if (!this.state.fout) return this.props.children;
    var melding = this.state.fout && this.state.fout.message ? this.state.fout.message : String(this.state.fout);
    return (
      <div>
        <div role="alert" style={{ background: A.errorBg || "#fef2f2", color: A.error, border: "2px solid " + (A.errorBorder || A.error), borderRadius: 12, padding: "8px 12px", marginBottom: 10, fontWeight: 700, fontSize: 14 }}>
          {"De kaart kon niet laden (" + melding + "). Kies het antwoord hieronder."}
        </div>
        {this.props.terugval}
      </div>
    );
  }
}

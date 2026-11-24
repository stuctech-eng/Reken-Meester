// Vaste hoogte van de kaart als figuur bij benoemen (Topografie, S1; plan T3 par. 3.1): de kaart staat boven de keuzes of het
// tekstvak en neemt hoogstens 38 % van de schermhoogte (tussen 200 en 340 CSS-px). Ook het vak tijdens het laden is zo hoog,
// zodat de opbouw van het scherm niet verspringt (de meting van het oefenscherm, past het antwoordvak).
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.

export function toonHoogte() {
  var h = typeof window !== "undefined" ? window.innerHeight : 746;
  return Math.max(200, Math.min(340, Math.round(h * 0.38)));
}

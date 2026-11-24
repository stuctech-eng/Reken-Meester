import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { A } from "../../styles/tokens.js";
import { topo } from "../../core/topo/laden.js";
import { beslis, isKlein, STRAAL } from "../../core/topo/kaart/tikregel.js";
import { randPad, volgendeStap, vorigeStap, dichtsteStap, venster, begrens, ZOOMSTAPPEN, SLEEPGRENS } from "../../core/topo/kaart/beeld.js";

// NO BACKTICKS / TEMPLATE LITERALS anywhere. String concatenation only.

// Aanwijzen op de kaart (Topografie, plan T3 par. 3.2), in het oefenscherm. Dezelfde bediening als de iPhone-proef van T2
// (public/topoproef/topoproef.js): tikken, slepen, knijpen, zoomknoppen, de tikregel en bevestigen met "Dit is mijn antwoord".
// Geen naam vóór het bevestigen (besluit 24-11-2026, na de iPhone-test van Dick): een naam zou het antwoord verraden. Dus:
// - de balk zegt alleen "Gekozen: het groene gebied / de groene stip / de groene lijn";
// - bij twijfel (de tikregel kiest niet) geen lijst met namen, maar de kaart zoomt in rond de tik: "zoom in en tik iets verder";
//   de tikmeting van T2 bewijst dat elk doel binnen x4 een plek heeft waar een tik het meteen kiest;
// - bij een stip in een groter vlak (ingesloten) de knop "Het gebied eromheen", zonder naam;
// - geen lijst met alle gebieden (dat is benoemen, S1). Afwijking van T1 par. 5.3 ("keuzelijst altijd"), op de open lijst.
//
// Identiteit: een tik levert via de tikregel een kennisbank-id op (nooit een plek in het kaartbestand of een tikpositie); de naam
// komt uit de kennisbank (naamVan, data.js) en gaat naar het oefenscherm via onChoice, zoals een keuze. Daarna is alles gelijk aan
// kiezen (nakijken, feedback, opslag).
// Na het antwoord: het juiste gebied groen, een foute keuze rood; tikken kiest dan niets meer, zoomen en slepen blijven.
// Rand (T3a, de spikkels): het vlak tekent alle ringen, de rand alleen de ringen van minstens 1 px2 op het scherm (beeld.js).
//
// Contract (AnswerArea): props vraag (met vraag.kaart = { kaart, laag, antwoordId }), feedback, selected, disabled, onChoice.

var NS = "http://www.w3.org/2000/svg";
var KLEUR = { zee: "#dbeafe", land: "#e5e7eb", landRand: "#9ca3af", doel: "#fef3c7", doelRand: "#92400e", gekozen: "#16a34a", gekozenRand: "#14532d", goed: "#16a34a", goedRand: "#14532d", fout: "#dc2626", foutRand: "#7f1d1d", stip: "#b45309", lijn: "#1d4ed8", punt: "#1a1d3a" };
var BALK_RUIMTE = 8, MIN_H = 160;

function el(naam, attr) { var e = document.createElementNS(NS, naam); for (var k in attr) e.setAttribute(k, attr[k]); return e; }

var knopStijl = { fontFamily: "inherit", fontWeight: 800, fontSize: 15, minHeight: 44, minWidth: 44, borderRadius: 12, border: "2px solid " + A.border, background: A.bgCard, color: A.text, padding: "0 10px", cursor: "pointer" };

export default function KaartAntwoord(props) {
  var spec = props.vraag.kaart;
  var data = topo();
  var K = data.kaart(spec.kaart), L = data.laag(spec.kaart, spec.laag), doelen = L.doelen;
  var naamVan = data.naamVan;

  var vakRef = useRef(null), balkRef = useRef(null);
  var S = useRef({ zoom: 1, ox: 0, oy: 0, maxH: 0, svg: null, aanraking: null, knijp: null, vingers: {}, blok: false, begonnen: false }).current;

  var gekState = useState(null), gekozen = gekState[0], setGekozen = gekState[1];        // het gekozen doel (vóór bevestigen)
  var altState = useState(null), alternatief = altState[0], setAlternatief = altState[1]; // het vlak onder een ingesloten tik
  var twijfelState = useState(false), twijfel = twijfelState[0], setTwijfel = twijfelState[1]; // de laatste tik was onduidelijk
  var zoomState = useState(1), zoomNu = zoomState[0], setZoomNu = zoomState[1];
  var tekenState = useState(0), tekenNr = tekenState[0], setTekenNr = tekenState[1];

  var klaar = !!props.feedback;
  var gekozenNaam = props.selected;

  function breedte() { return vakRef.current ? vakRef.current.clientWidth : 0; }
  function v() { return venster(K, S.zoom, S.ox, S.oy, breedte(), S.maxH); }
  function schaal() { var b = breedte(); return b > 0 ? b / v().w : 1; }
  function zetBegrensd() { var n = begrens(K, v()); S.ox = n.x; S.oy = n.y; }
  function meetRuimte() {
    if (!vakRef.current) return;
    var top = vakRef.current.getBoundingClientRect().top, balk = balkRef.current ? balkRef.current.offsetHeight : 0;
    S.maxH = Math.max(MIN_H, Math.floor(window.innerHeight - top - balk - BALK_RUIMTE));
  }
  function zetZoom(z, cx, cy) {
    var w = v();
    if (cx === undefined) { cx = w.x + w.w / 2; cy = w.y + w.h / 2; }
    S.zoom = z;
    var n = v();
    S.ox = cx - n.w / 2; S.oy = cy - n.h / 2;
    zetBegrensd(); setZoomNu(z); setTekenNr(function(t) { return t + 1; });
  }

  // het doel bij de naam die het oefenscherm als antwoord kreeg (na bevestigen)
  function doelVanNaam(naam) { for (var i = 0; i < doelen.length; i++) if (doelen[i].naam === naam) return doelen[i]; return null; }

  function teken() {
    var vak = vakRef.current;
    if (!vak) return;
    meetRuimte();
    // Bij het begin het midden van de kaart in beeld (bij x1 past de hoogte van nlbe niet altijd op het scherm; slepen toont de rest)
    if (!S.begonnen && breedte() > 0) { var w0 = v(); S.ox = (K.breedte - w0.w) / 2; S.oy = (K.hoogte - w0.h) / 2; S.begonnen = true; }
    zetBegrensd();
    var w = v();
    vak.innerHTML = "";
    var svg = el("svg", { viewBox: w.x + " " + w.y + " " + w.w + " " + w.h, role: "img", "aria-label": "Kaart, zoom " + S.zoom, style: "display:block;width:100%;height:auto;touch-action:none" });
    svg.appendChild(el("rect", { x: 0, y: 0, width: K.breedte, height: K.hoogte, fill: KLEUR.zee }));
    vak.appendChild(svg); S.svg = svg;
    var s = schaal(), px = 1 / s;
    var groep = el("g", {}), cirkels = el("g", {});
    svg.appendChild(groep);
    function vlakPad(item, vul, rand, dikte, doorz) {
      groep.appendChild(el("path", { d: item.d, fill: vul, "fill-opacity": doorz === undefined ? 1 : doorz, stroke: "none", "fill-rule": "evenodd" }));
      var r = randPad(item.delen, s);
      if (r) groep.appendChild(el("path", { d: r, fill: "none", stroke: rand, "stroke-width": dikte * px }));
    }
    K.achtergrond.forEach(function(a) { vlakPad(a, KLEUR.land, KLEUR.landRand, 0.8); });
    K.lagen.forEach(function(l) {
      if (l.id === L.id || l.soort !== "vlak") return;
      l.items.forEach(function(it) { vlakPad(it, KLEUR.land, KLEUR.landRand, 0.8); });
    });
    var goedId = klaar ? spec.antwoordId : null;
    var gekozenD = klaar ? doelVanNaam(gekozenNaam) : gekozen;
    var foutId = klaar && gekozenD && gekozenD.id !== spec.antwoordId ? gekozenD.id : null;
    L.items.forEach(function(item, i) {
      var d = doelen[i];
      var kleur = d.id === goedId ? KLEUR.goed : d.id === foutId ? KLEUR.fout : (!klaar && gekozenD && gekozenD.id === d.id) ? KLEUR.gekozen : null;
      var randKleur = d.id === goedId ? KLEUR.goedRand : d.id === foutId ? KLEUR.foutRand : kleur ? KLEUR.gekozenRand : KLEUR.doelRand;
      if (d.soort === "vlak") {
        if (d.ringen.length) vlakPad(item, kleur || KLEUR.doel, randKleur, kleur ? 3 : 1.2, kleur ? 0.85 : 1);
        if (isKlein(d, s)) {
          if (kleur) cirkels.appendChild(el("circle", { cx: d.mx, cy: d.my, r: STRAAL * px, fill: kleur, "fill-opacity": 0.16, stroke: kleur, "stroke-opacity": 0.7, "stroke-width": 1.5 * px }));
          cirkels.appendChild(el("circle", { cx: d.mx, cy: d.my, r: (kleur ? 6 : 4.5) * px, fill: kleur || KLEUR.stip, stroke: "#fff", "stroke-width": 1.5 * px }));
        }
      } else if (d.soort === "lijn") {
        if (kleur) groep.appendChild(el("path", { d: item.d, fill: "none", stroke: "#fff", "stroke-width": 10 * px, "stroke-linecap": "round", "stroke-linejoin": "round" }));
        groep.appendChild(el("path", { d: item.d, fill: "none", stroke: kleur || KLEUR.lijn, "stroke-width": (kleur ? 6 : 3) * px, "stroke-linecap": "round", "stroke-linejoin": "round" }));
      } else {
        groep.appendChild(el("circle", { cx: d.x, cy: d.y, r: (kleur ? 10 : 5) * px, fill: kleur || KLEUR.punt, stroke: "#fff", "stroke-width": (kleur ? 3 : 1.5) * px }));
      }
    });
    groep.appendChild(cirkels);
    svg.addEventListener("pointerdown", neer);
    svg.addEventListener("pointermove", beweeg);
    svg.addEventListener("pointerup", op);
    svg.addEventListener("pointercancel", afgebroken);
    ["gesturestart", "gesturechange", "gestureend"].forEach(function(n) { svg.addEventListener(n, function(e) { e.preventDefault(); }); });
  }

  // ── aanraking: dezelfde regels als de proef (een tik tot 10 px verplaatsing; slepen; knijpen naar de dichtstbijzijnde stap) ──
  function zetViewBox(z) { var w = venster(K, z, S.ox, S.oy, breedte(), S.maxH); S.svg.setAttribute("viewBox", w.x + " " + w.y + " " + w.w + " " + w.h); }
  function vang(id) { if (S.svg && S.svg.setPointerCapture) { try { S.svg.setPointerCapture(id); } catch (x) { /* niet nodig voor de werking */ } } }
  function los(id) { delete S.vingers[id]; if (S.blok && !Object.keys(S.vingers).length) S.blok = false; }
  function neer(e) {
    S.vingers[e.pointerId] = true;
    if (S.knijp || S.blok) return;
    var a = S.aanraking;
    if (a && e.pointerId !== a.id) { startKnijp(a, e); return; }
    if (a) return;
    S.aanraking = { id: e.pointerId, x: e.clientX, y: e.clientY, cx: e.clientX, cy: e.clientY, ox: S.ox, oy: S.oy, slepen: false };
    vang(e.pointerId);
  }
  function startKnijp(a, e) {
    vang(e.pointerId);
    var r = S.svg.getBoundingClientRect(), s = schaal();
    var p1 = [a.cx, a.cy], p2 = [e.clientX, e.clientY], mid = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
    S.knijp = { ids: [a.id, e.pointerId], pos: {}, d0: Math.max(1, Math.hypot(p2[0] - p1[0], p2[1] - p1[1])), z0: S.zoom, zv: S.zoom,
      kaartpunt: [S.ox + (mid[0] - r.left) / s, S.oy + (mid[1] - r.top) / s], mid: mid };
    S.knijp.pos[a.id] = p1; S.knijp.pos[e.pointerId] = p2;
    S.aanraking = null;
  }
  function houdOnderVingers(z) {
    var k = S.knijp, r = S.svg.getBoundingClientRect(), sz = r.width / venster(K, z, 0, 0, breedte(), S.maxH).w;
    S.ox = k.kaartpunt[0] - (k.mid[0] - r.left) / sz; S.oy = k.kaartpunt[1] - (k.mid[1] - r.top) / sz;
    var n = begrens(K, venster(K, z, S.ox, S.oy, breedte(), S.maxH)); S.ox = n.x; S.oy = n.y;
  }
  function knijpBeweeg(e) {
    var k = S.knijp;
    if (k.ids.indexOf(e.pointerId) < 0) return;
    k.pos[e.pointerId] = [e.clientX, e.clientY];
    var p1 = k.pos[k.ids[0]], p2 = k.pos[k.ids[1]], d = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    k.mid = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
    k.zv = Math.min(ZOOMSTAPPEN[ZOOMSTAPPEN.length - 1], Math.max(ZOOMSTAPPEN[0], k.z0 * d / k.d0));
    houdOnderVingers(k.zv); zetViewBox(k.zv);
  }
  function knijpEinde() {
    var z = dichtsteStap(S.knijp.zv);
    S.zoom = z; houdOnderVingers(z);
    S.knijp = null; S.blok = Object.keys(S.vingers).length > 0;
    setZoomNu(z); setTekenNr(function(t) { return t + 1; });
  }
  function afgebroken(e) {
    if (S.knijp && S.knijp.ids.indexOf(e.pointerId) >= 0) { los(e.pointerId); knijpEinde(); return; }
    if (S.aanraking && e.pointerId === S.aanraking.id) S.aanraking = null;   // nooit een keuze
    los(e.pointerId);
  }
  function beweeg(e) {
    if (S.knijp) { knijpBeweeg(e); return; }
    var a = S.aanraking;
    if (!a || e.pointerId !== a.id) return;
    a.cx = e.clientX; a.cy = e.clientY;
    var dx = e.clientX - a.x, dy = e.clientY - a.y;
    if (!a.slepen && Math.sqrt(dx * dx + dy * dy) > SLEEPGRENS) a.slepen = true;
    if (a.slepen) { var s = schaal(); S.ox = a.ox - dx / s; S.oy = a.oy - dy / s; zetBegrensd(); zetViewBox(S.zoom); }
  }
  function op(e) {
    if (S.knijp && S.knijp.ids.indexOf(e.pointerId) >= 0) { los(e.pointerId); knijpEinde(); return; }
    var a = S.aanraking;
    if (!a || e.pointerId !== a.id) { los(e.pointerId); return; }
    S.aanraking = null; los(e.pointerId);
    var dx = e.clientX - a.x, dy = e.clientY - a.y;
    if (a.slepen || Math.sqrt(dx * dx + dy * dy) > SLEEPGRENS) { setTekenNr(function(t) { return t + 1; }); return; }
    var r = S.svg.getBoundingClientRect();
    tik(e.clientX - r.left, e.clientY - r.top);
  }

  // Een tik op (x, y) in CSS-pixels binnen het beeld; de tikregel rekent op de hele kaart bij deze schaal
  function tik(x, y) {
    if (klaar || props.disabled) return;
    var s = schaal(), b = beslis(doelen, s, S.ox * s + x, S.oy * s + y);
    setAlternatief(null); setTwijfel(false);
    if (b.uitkomst === "geen") { setGekozen(null); return; }
    if (b.uitkomst === "twijfel") {
      setGekozen(null); setTwijfel(true);
      var z = volgendeStap(S.zoom);
      if (z) zetZoom(z, S.ox + x / s, S.oy + y / s);
      return;
    }
    if (b.regel === "ingesloten") {
      var onder = b.kandidaten.filter(function(c) { return c.doel !== b.doel && c.doel.soort === "vlak" && c.afstand === 0; });
      setAlternatief(onder.length ? onder[0].doel : null);
    }
    setGekozen(b.doel);
  }
  function kiesEromheen() { setAlternatief(null); setGekozen(alternatief); }
  function bevestig() { if (gekozen && !klaar && !props.disabled) props.onChoice(naamVan(gekozen.id)); }

  // Testhaak voor de Chromium-tests (lezen en tikken; zoals window.__TOPO in de proef). Alleen als de test hem aanzet
  // (window.__TOPO_TEST), want hij bevat het antwoord
  useEffect(function() {
    if (window.__TOPO_TEST !== true) return;
    window.__TOPO_APP = {
      schaal: schaal, venster: v, breedte: breedte, doelen: doelen, antwoordId: spec.antwoordId,
      tik: tik, zet: function(z, cx, cy) { zetZoom(z, cx, cy); return v(); },
      uitkomst: function(x, y) { var s = schaal(); return beslis(doelen, s, S.ox * s + x, S.oy * s + y).uitkomst; },
    };
  });

  useLayoutEffect(function() { teken(); });
  useEffect(function() {
    function opnieuw() { setTekenNr(function(t) { return t + 1; }); }
    window.addEventListener("resize", opnieuw);
    function laat(e) { los(e.pointerId); }
    window.addEventListener("pointerup", laat);
    window.addEventListener("pointercancel", laat);
    return function() { window.removeEventListener("resize", opnieuw); window.removeEventListener("pointerup", laat); window.removeEventListener("pointercancel", laat); };
  }, []);

  var tekst = klaar ? (props.feedback === "correct" ? "Goed: " + gekozenNaam : "Jij koos " + (gekozenNaam || "niets") + ". Groen is " + naamVan(spec.antwoordId) + ".")
    : gekozen ? "Gekozen: " + (gekozen.soort === "punt" ? "de groene stip" : gekozen.soort === "lijn" ? "de groene lijn" : "het groene gebied")
    : twijfel ? "Niet duidelijk: hier liggen stippen of lijnen dicht bij elkaar. Tik iets verder van de andere."
    : "Tik op de kaart.";

  return (
    <div data-tekennr={tekenNr} style={{ position: "relative" }}>
      <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
        <button type="button" aria-label="Uitzoomen" style={knopStijl} disabled={vorigeStap(zoomNu) === null} onClick={function() { var z = vorigeStap(S.zoom); if (z) zetZoom(z); }}>{"−"}</button>
        <span style={{ fontWeight: 800, minWidth: 28, textAlign: "center" }}>{"x" + (Math.round(zoomNu * 10) / 10)}</span>
        <button type="button" aria-label="Inzoomen" style={knopStijl} disabled={volgendeStap(zoomNu) === null} onClick={function() { var z = volgendeStap(S.zoom); if (z) zetZoom(z); }}>{"+"}</button>
        <button type="button" style={knopStijl} disabled={zoomNu === 1} onClick={function() { zetZoom(1); }}>{"Zoom x1"}</button>
      </div>
      {/* De kaart is 4 px aan elke kant breder dan het antwoordgebied (dat 20 px van de rand staat): schermbreedte min 32 px, precies de maat van de iPhone-proef en de tikmeting
          van T2 (396 px op 428 px; test: tools/topo/test-topo-chromium) */}
      <div ref={vakRef} style={{ margin: "0 -4px", background: KLEUR.zee, borderRadius: 12, overflow: "hidden" }} />
      {alternatief && gekozen && !klaar && (
        <div role="status" style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, fontWeight: 800, fontSize: 15, lineHeight: "20px" }}>
          <span style={{ flex: "1 1 auto" }}>{"Je tikte op een stip. Bedoelde je het gebied eromheen?"}</span>
          <button type="button" style={Object.assign({}, knopStijl, { background: KLEUR.gekozen, borderColor: KLEUR.gekozen, color: "#fff" })} onClick={kiesEromheen}>{"Het gebied eromheen"}</button>
        </div>
      )}
      <div ref={balkRef} style={{ marginTop: 6 }}>
        <div aria-live="polite" style={{ fontWeight: 800, fontSize: 15, lineHeight: "20px", minHeight: 20, marginBottom: 6 }}>{tekst}</div>
        {!klaar && (
          <div style={{ display: "flex", gap: 6 }}>
            <button type="button" style={Object.assign({}, knopStijl, { flex: "1 1 auto", background: gekozen ? A.primary : A.bgCard, color: gekozen ? "#fff" : A.textSoft, borderColor: gekozen ? A.primary : A.border })} disabled={!gekozen || props.disabled} onClick={bevestig}>{"Dit is mijn antwoord"}</button>
          </div>
        )}
      </div>
    </div>
  );
}

import { A } from "../styles/tokens.js";
import { T, L, Poly, Boog, LIJN, P, G, HULP, PL, GL } from "./TheorieFiguur.jsx";

// NO BACKTICKS / TEMPLATE LITERALS anywhere. String concatenation only.

// Tekening bij een meetkundevraag (plan TK2), met de getallen van die vraag. De generator geeft
// vraag.figuur = { soort, gegeven: { ... }, gevraagd }. Alleen gegeven waarden staan erbij; op de plek
// van het antwoord staat "?". Hoeken zijn echt getekend; lengtes niet op schaal (begrensde verhouding,
// zodat je het antwoord niet kunt opmeten): daar staat "niet op schaal" onder.
// viewBox 300 x 140. Op het scherm minstens 100 px hoog (schaal 0,71): letters 20 eenheden = 14 px,
// lijnen 2,2 eenheden = 1,6 px.

export var VF_B = 300, VF_H = 140;
var FSV = 20;
function TV(x, y, tekst, kleur, anker) { return T(x, y, tekst, kleur, anker, { fs: FSV }); }
function graden(n) { return n + "°"; }
function cm(n) { return n + " cm"; }
var RAD = Math.PI / 180;

// Punt op afstand r in richting d (graden, wiskundig: tegen de klok in, y omhoog)
function pt(c, r, d) { return [c[0] + r * Math.cos(d * RAD), c[1] - r * Math.sin(d * RAD)]; }
function rond(x) { return Math.round(x * 10) / 10; }
// Boog van richting d1 naar d2 (tegen de klok in)
function boog(c, r, d1, d2, kleur) {
  var p1 = pt(c, r, d1), p2 = pt(c, r, d2), groot = (d2 - d1) > 180 ? 1 : 0;
  return Boog("M" + rond(p1[0]) + "," + rond(p1[1]) + " A" + r + "," + r + " 0 " + groot + " 0 " + rond(p2[0]) + "," + rond(p2[1]), kleur);
}
// Label in een hoek van t graden (vanaf richting d1, tegen de klok in), op de deellijn. De afstand tot
// het hoekpunt is zo gekozen dat het label (breedte naar het aantal tekens) vrij blijft van de boog
// (straal r) en van beide benen; max begrenst de afstand, en het label blijft binnen de tekening
// (18..282 x 14..128), maar komt nooit dichter dan de boog toelaat.
function labelMaat(tekst) { return { w: 12 * String(tekst).length, h: 16 }; }
function hoekLabel(c, d1, t, tekst, kleur, max, r) {
  var m = labelMaat(tekst), dir = d1 + t / 2;
  var uit = Math.abs(Math.cos(dir * RAD)) * m.w / 2 + Math.abs(Math.sin(dir * RAD)) * m.h / 2;
  var minD = (r || 22) + uit + 4;
  var d = Math.max(minD, labelAfstand(t, m));
  if (max && d > max) d = Math.max(max, minD);
  var p = pt(c, d, dir);
  // binnen de tekening: het hele tekstvak (met de witte rand) blijft binnen 0..300 x 0..140
  var x1 = 4 + m.w / 2, x2 = VF_B - 4 - m.w / 2, y1 = 16, y2 = VF_H - 16;
  var buiten = function(q) { return q[0] < x1 || q[0] > x2 || q[1] < y1 || q[1] > y2; };
  while (d > minD && buiten(p)) { d -= 2; p = pt(c, d, dir); }
  // past het op de kleinste afstand nog niet, dan het label het laatste stukje naar binnen schuiven
  if (buiten(p)) p = [grens(p[0], x1, x2), grens(p[1], y1, y2)];
  return TV(rond(p[0]), rond(p[1]), tekst, kleur);
}
// Afstand langs de deellijn zodat het label vrij van beide benen staat
function labelAfstand(t, m) { return (Math.hypot(m.w, m.h) / 2 + 3) / Math.sin(t / 2 * RAD); }
function rechteHoek(c, d1, kleur) {
  var a = pt(c, 13, d1), b = pt(pt(c, 13, d1), 13, d1 + 90), e = pt(c, 13, d1 + 90);
  return <polyline points={rond(a[0]) + "," + rond(a[1]) + " " + rond(b[0]) + "," + rond(b[1]) + " " + rond(e[0]) + "," + rond(e[1])} fill="none" stroke={kleur || LIJN} strokeWidth={2.2} />;
}
function grens(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

// ── Hoeken ──────────────────────────────────────────────────────

// Twee snijdende lijnen; rechts de gegeven hoek a, links (overstaand) of boven (nevenhoek) het vraagteken
function kruis(f) {
  var a = f.gegeven.a, c = [150, 70], half = a / 2;
  var Lh = Math.min(135 / Math.cos(half * RAD), 60 / Math.sin(half * RAD));
  var p1 = pt(c, Lh, half), p2 = pt(c, Lh, 180 + half), p3 = pt(c, Lh, -half), p4 = pt(c, Lh, 180 - half);
  var vraag = f.gevraagd === "overstaand"
    ? <g>{boog(c, 22, 180 - half, 180 + half, G)}{hoekLabel(c, 180 - half, a, "?", G, 125)}</g>
    : <g>{boog(c, 22, half, 180 - half, G)}{hoekLabel(c, half, 180 - a, "?", G, 58)}</g>;
  return (
    <g>
      {L(p2[0], p2[1], p1[0], p1[1])}{L(p4[0], p4[1], p3[0], p3[1])}
      {boog(c, 22, -half, half, P)}{hoekLabel(c, -half, a, graden(a), P, 118)}
      {vraag}
    </g>
  );
}

// Twee evenwijdige lijnen en een snijlijn. Gegeven hoek a onderaan, rechtsboven het snijpunt.
// Bovenaan het vraagteken: F-hoek (zelfde plek), Z-hoek (binnen, andere kant) of de nevenhoek van de Z-hoek
// (die linksboven: hij deelt met de Z-hoek de bovenste lijn naar links en ligt buiten de evenwijdige lijnen,
// zodat hij nooit in de weg zit van de gegeven hoek). Evenwijdig-pijltjes links.
function evenwijdig(f) {
  var a = f.gegeven.a, yB = 52, yO = 116;
  var dx = (yO - yB) / Math.tan(a * RAD);
  var P1 = [150 + dx / 2, yB], P2 = [150 - dx / 2, yO];
  var e1 = pt(P1, 22 / Math.sin(a * RAD), a), e2 = pt(P2, 20 / Math.sin(a * RAD), a + 180);
  var plek = { F: [0, a], Z: [180, a], nevenZ: [a, 180 - a] }[f.gevraagd];
  // Elk label hoogstens 26 boven of onder zijn eigen lijn: het gegeven label bij de onderste lijn, het
  // vraagteken bij de bovenste; zo zitten ze elkaar tussen de lijnen niet in de weg
  var dicht = function(richting) { return Math.max(26, 26 / Math.max(0.3, Math.abs(Math.sin(richting * RAD)))); };
  return (
    <g>
      {L(10, yB, 290, yB)}{L(10, yO, 290, yO)}
      {L(16, yB - 6, 24, yB)}{L(16, yB + 6, 24, yB)}{L(16, yO - 6, 24, yO)}{L(16, yO + 6, 24, yO)}
      {L(rond(e2[0]), rond(e2[1]), rond(e1[0]), rond(e1[1]))}
      {boog(P2, 20, 0, a, P)}{hoekLabel(P2, 0, a, graden(a), P, dicht(a / 2))}
      {boog(P1, 20, plek[0], plek[0] + plek[1], G)}{hoekLabel(P1, plek[0], plek[1], "?", G, dicht(plek[0] + plek[1] / 2))}
    </g>
  );
}

// Driehoek met hoeken alfa (links), beta (rechts); echte hoeken, passend in het kader 176 x 88
// (y 31..119: ruimte boven voor het label bij de top en onder voor een label naast een stompe basishoek).
// labels: [links, rechts, top] = { tekst, kleur } of null. Elk label staat naast zijn hoekpunt, buiten de
// driehoek (links ervan, rechts ervan, boven de top): zo raken labels elkaar en de zijden nooit.
// recht = rechte hoek links (vierkantje); poten = streepjes op de twee gelijke zijden.
function driehoek(alfa, beta, labels, recht, poten) {
  var gamma = 180 - alfa - beta;
  var ac = Math.sin(beta * RAD) / Math.sin(gamma * RAD);
  var C = [ac * Math.cos(alfa * RAD), ac * Math.sin(alfa * RAD)];
  var minX = Math.min(0, C[0]), maxX = Math.max(1, C[0]), maxY = C[1];
  var s = Math.min(176 / (maxX - minX), 88 / maxY);
  var bx = 150 - (maxX - minX) * s / 2 - minX * s, by = 75 + maxY * s / 2;
  var Q = [[0, 0], [1, 0], C].map(function(p) { return [rond(bx + p[0] * s), rond(by - p[1] * s)]; });
  var zij = [Math.hypot(Q[1][0] - Q[0][0], Q[1][1] - Q[0][1]), Math.hypot(Q[2][0] - Q[1][0], Q[2][1] - Q[1][1]), Math.hypot(Q[2][0] - Q[0][0], Q[2][1] - Q[0][1])];
  var richt = function(p, q) { return Math.atan2(-(q[1] - p[1]), q[0] - p[0]) / RAD; };
  // Elke hoek loopt tegen de klok in vanaf de eerste richting: links vanaf de basis, rechts vanaf de
  // richting naar de top, in de top vanaf de richting naar links onder.
  var hoeken = [
    { c: Q[0], d1: 0, t: alfa, kort: Math.min(zij[0], zij[2]), lab: [Q[0][0] - 10, Q[0][1] - 9, "end"] },
    { c: Q[1], d1: richt(Q[1], Q[2]), t: beta, kort: Math.min(zij[0], zij[1]), lab: [Q[1][0] + 10, Q[1][1] - 9, "start"] },
    { c: Q[2], d1: richt(Q[2], Q[0]), t: gamma, kort: Math.min(zij[1], zij[2]), lab: [Q[2][0], Q[2][1] - 15, "middle"] },
  ];
  var tekenHoek = function(h, lab, i) {
    if (!lab) return null;
    var r = Math.min(20, h.kort * 0.3);
    var boogje = (recht && i === 0) ? rechteHoek(h.c, 0, lab.kleur) : boog(h.c, r, h.d1, h.d1 + h.t, lab.kleur);
    // Stompe (of rechte) hoek aan de basis: de schuine zijde loopt schuin omhoog over de plek naast het
    // hoekpunt; dan staat het label iets lager, naast de basislijn (eronder is niets getekend)
    var ly = (i < 2 && h.t >= 90) ? h.c[1] + 6 : h.lab[1];
    var tekst = lab.tekst ? TV(rond(h.lab[0]), rond(ly), lab.tekst, lab.kleur, h.lab[2]) : null;
    return <g key={"h" + i}>{boogje}{tekst}</g>;
  };
  var streepjes = null;
  if (poten) {
    streepjes = [[Q[0], Q[2]], [Q[1], Q[2]]].map(function(z, i) {
      var m = [(z[0][0] + z[1][0]) / 2, (z[0][1] + z[1][1]) / 2], dx = z[1][0] - z[0][0], dy = z[1][1] - z[0][1], n = Math.hypot(dx, dy);
      var ux = -dy / n * 7, uy = dx / n * 7;
      return <g key={"s" + i}>{L(rond(m[0] - ux), rond(m[1] - uy), rond(m[0] + ux), rond(m[1] + uy), P)}</g>;
    });
  }
  return (
    <g>
      {Poly(Q)}
      {streepjes}
      {hoeken.map(function(h, i) { return tekenHoek(h, labels[i], i); })}
    </g>
  );
}
function driehoekHoeken(f) {
  var g = f.gegeven;
  if (f.gevraagd === "andere") return driehoek(90, g.s, [{ tekst: "", kleur: LIJN }, { tekst: graden(g.s), kleur: P }, { tekst: "?", kleur: G }], true);
  return driehoek(g.a, g.b, [{ tekst: graden(g.a), kleur: P }, { tekst: graden(g.b), kleur: P }, { tekst: "?", kleur: G }]);
}
function gelijkbenig(f) {
  var g = f.gegeven;
  if (f.gevraagd === "basis") {
    var b = (180 - g.top) / 2;
    return driehoek(b, b, [{ tekst: "?", kleur: G }, { tekst: "?", kleur: G }, { tekst: graden(g.top), kleur: P }], false, true);
  }
  return driehoek(g.basis, g.basis, [{ tekst: graden(g.basis), kleur: P }, { tekst: graden(g.basis), kleur: P }, { tekst: "?", kleur: G }], false, true);
}

// ── Oppervlakte (niet op schaal) ────────────────────────────────

// Lengtes naar het kader: zelfde schaal, maar nooit te klein of te smal (begrensde verhouding).
// Vaste plekken voor de labels, zodat ze elkaar niet raken: de hoogte rechts naast de stippellijn op 62%
// van de hoogte, het vraagteken laag (25%) en verder naar rechts; de basis eronder, de schuine zijde links.
function parallellogram(f) {
  var g = f.gegeven, o = Math.sqrt(g.s * g.s - g.h * g.h);
  var k = Math.min(200 / (g.b + o), 86 / g.h);
  var hp = grens(g.h * k, 60, 86), bp = grens(g.b * k, 150, 200), op = grens(hp * o / g.h, 18, 56);
  var x0 = rond(150 - (bp + op) / 2 + 12), y = 110, top = rond(y - hp);
  var hx = rond(x0 + op);
  return (
    <g>
      {Poly([[x0, y], [rond(x0 + bp), y], [rond(x0 + bp + op), top], [hx, top]], PL)}
      {L(hx, top, hx, y, HULP, true)}{rechteHoek([hx, y], 0, HULP)}
      {TV(rond(x0 + bp / 2), y + 17, cm(g.b), P)}
      {TV(hx + 8, rond(y - hp * 0.62), cm(g.h), P, "start")}
      {TV(rond(x0 + op / 2 - 8), rond(y - hp / 2), cm(g.s), P, "end")}
      {TV(rond(hx + bp * 0.5), rond(y - hp * 0.25), "?", G)}
    </g>
  );
}
// Driehoek: de hoogte gestippeld in de driehoek (met rechte hoek); de maat van de hoogte staat ernaast als
// maatlijn rechts van de driehoek (met een hulplijntje vanaf de top). In de driehoek zelf is te weinig plaats
// om het label vrij van de schuine zijde te zetten.
function driehoekOpp(f) {
  var g = f.gegeven;
  var k = Math.min(150 / g.b, 86 / g.h);
  var hp = grens(g.h * k, 60, 86), bp = grens(g.b * k, 130, 150);
  var op = g.s ? grens(hp * Math.sqrt(g.s * g.s - g.h * g.h) / g.h, 24, bp * 0.4) : bp * 0.3;
  var x0 = 64, y = 110, top = [rond(x0 + op), rond(y - hp)], xm = rond(x0 + bp + 18);
  return (
    <g>
      {Poly([[x0, y], [rond(x0 + bp), y], top], PL)}
      {L(top[0], top[1], top[0], y, HULP, true)}{rechteHoek([top[0], y], 0, HULP)}
      {L(top[0] + 4, top[1], xm + 6, top[1], HULP, true, 1.6)}
      {L(xm, top[1], xm, y, HULP)}{L(xm - 6, top[1], xm + 6, top[1], HULP)}{L(xm - 6, y, xm + 6, y, HULP)}
      {TV(rond(x0 + bp / 2), y + 17, cm(g.b), P)}
      {TV(xm + 9, rond(y - hp / 2), cm(g.h), P, "start")}
      {g.s ? TV(rond(x0 + op / 2 - 10), rond(y - hp / 2), cm(g.s), P, "end") : null}
      {TV(rond(top[0] + (bp - op) * 0.45), rond(y - hp * 0.3), "?", G)}
    </g>
  );
}
function trapezium(f) {
  var g = f.gegeven;
  var k = Math.min(210 / g.c, 78 / g.h);
  var cp = grens(g.c * k, 190, 220), hp = grens(g.h * k, 60, 78), ap = grens(cp * g.a / g.c, 100, cp - 50);
  var x0 = rond(150 - cp / 2), y = 110, top = rond(y - hp), tx = rond(x0 + (cp - ap) * 0.4);
  return (
    <g>
      {Poly([[x0, y], [rond(x0 + cp), y], [rond(tx + ap), top], [tx, top]], PL)}
      {L(tx, top, tx, y, HULP, true)}{rechteHoek([tx, y], 0, HULP)}
      {TV(rond(tx + ap / 2), top - 12, cm(g.a), P)}
      {TV(rond(x0 + cp / 2), y + 16, cm(g.c), P)}
      {TV(tx + 8, rond(y - hp * 0.62), cm(g.h), P, "start")}
      {TV(rond(tx + ap * 0.72), rond(y - hp * 0.25), "?", G)}
    </g>
  );
}
// Rechthoek met rechtsboven een rechthoek eruit (L-vorm). Bij de omtrek is de rand de vraag (dik).
// Labels: breedte onder, hoogte links; de uitsparing: de breedte onder haar onderrand, de hoogte rechts
// naast haar zijrand (in de lege uitsparing).
function lvorm(f) {
  var g = f.gegeven;
  var k = Math.min(200 / g.W, 92 / g.H);
  // de uitsparing minstens 80 breed en 42 hoog: dan staan haar twee labels elk duidelijk bij hun eigen rand
  var wp = grens(g.W * k, 170, 200), hp = grens(g.H * k, 84, 92);
  var cwp = grens(wp * g.cw / g.W, 80, wp - 70), chp = grens(hp * g.ch / g.H, 42, hp - 38);
  var x0 = rond(150 - wp / 2 + 14), y0 = 16, x1 = rond(x0 + wp), y1 = rond(y0 + hp), nx = rond(x1 - cwp), ny = rond(y0 + chp);
  var omtrek = f.gevraagd === "omtrek";
  return (
    <g>
      <polygon points={[[x0, y0], [nx, y0], [nx, ny], [x1, ny], [x1, y1], [x0, y1]].map(function(q) { return q[0] + "," + q[1]; }).join(" ")}
        fill={GL} stroke={omtrek ? G : LIJN} strokeWidth={omtrek ? 3.4 : 2.2} strokeLinejoin="round" />
      {TV(rond((x0 + x1) / 2), y1 + 15, cm(g.W), P)}
      {TV(x0 - 8, rond((y0 + y1) / 2), cm(g.H), P, "end")}
      {TV(rond((nx + x1) / 2), ny + 14, cm(g.cw), P)}
      {TV(nx + 8, rond(y0 + chp / 2), cm(g.ch), P, "start")}
      {TV(rond(x0 + (nx - x0) * 0.4), rond(ny + (y1 - ny) * 0.5), "?", G)}
    </g>
  );
}

// ── Register ────────────────────────────────────────────────────

var SOORT = {
  kruis: { teken: kruis, schaal: true, tekst: function(f) { return "Twee lijnen snijden elkaar. Gegeven hoek " + f.gegeven.a + " graden. Gevraagd met een vraagteken: " + (f.gevraagd === "overstaand" ? "de overstaande hoek" : "de hoek ernaast") + "."; } },
  evenwijdig: { teken: evenwijdig, schaal: true, tekst: function(f) { return "Twee evenwijdige lijnen en een snijlijn. Onderaan een hoek van " + f.gegeven.a + " graden. Bovenaan met een vraagteken: " + ({ F: "de F-hoek", Z: "de Z-hoek", nevenZ: "de nevenhoek van de Z-hoek" }[f.gevraagd]) + "."; } },
  driehoekhoeken: { teken: driehoekHoeken, schaal: true, tekst: function(f) { return f.gevraagd === "andere" ? "Rechthoekige driehoek met een scherpe hoek van " + f.gegeven.s + " graden. De andere scherpe hoek heeft een vraagteken." : "Driehoek met hoeken van " + f.gegeven.a + " en " + f.gegeven.b + " graden. De derde hoek heeft een vraagteken."; } },
  gelijkbenig: { teken: gelijkbenig, schaal: true, tekst: function(f) { return f.gevraagd === "basis" ? "Gelijkbenige driehoek met een tophoek van " + f.gegeven.top + " graden. De basishoeken hebben een vraagteken." : "Gelijkbenige driehoek met basishoeken van " + f.gegeven.basis + " graden. De tophoek heeft een vraagteken."; } },
  parallellogram: { teken: parallellogram, schaal: false, tekst: function(f) { return "Parallellogram, basis " + f.gegeven.b + " cm, hoogte " + f.gegeven.h + " cm (gestippeld), schuine zijde " + f.gegeven.s + " cm. De oppervlakte heeft een vraagteken."; } },
  driehoekopp: { teken: driehoekOpp, schaal: false, tekst: function(f) { return "Driehoek, basis " + f.gegeven.b + " cm, hoogte " + f.gegeven.h + " cm (gestippeld)" + (f.gegeven.s ? ", schuine zijde " + f.gegeven.s + " cm" : "") + ". De oppervlakte heeft een vraagteken."; } },
  trapezium: { teken: trapezium, schaal: false, tekst: function(f) { return "Trapezium, evenwijdige zijden " + f.gegeven.a + " en " + f.gegeven.c + " cm, hoogte " + f.gegeven.h + " cm (gestippeld). De oppervlakte heeft een vraagteken."; } },
  lvorm: { teken: lvorm, schaal: false, tekst: function(f) { return "L-vorm: rechthoek " + f.gegeven.W + " bij " + f.gegeven.H + " cm, rechtsboven is " + f.gegeven.cw + " bij " + f.gegeven.ch + " cm eruit. " + (f.gevraagd === "omtrek" ? "De omtrek (de dikke rand)" : "De oppervlakte") + " heeft een vraagteken."; } },
};
export function bekendeVraagFiguur(f) { return !!(f && SOORT[f.soort]); }
// Hoogte van het onderschrift "niet op schaal" (px), voor de ruimtemeting in PracticeScreen
export var VF_ONDER_H = 16;
export function heeftOnderschrift(f) { return bekendeVraagFiguur(f) && !SOORT[f.soort].schaal; }

export default function VraagFiguur({ figuur, hoogte }) {
  if (!bekendeVraagFiguur(figuur)) return null;
  var s = SOORT[figuur.soort];
  var b = Math.round(hoogte * VF_B / VF_H);
  return (
    <div data-vraagfiguur={figuur.soort} style={{ textAlign: "center" }}>
      <svg viewBox={"0 0 " + VF_B + " " + VF_H} role="img" aria-label={s.tekst(figuur)}
        style={{ width: b, maxWidth: "100%", height: hoogte, display: "block", margin: "0 auto", fontFamily: "inherit" }}>
        {s.teken(figuur)}
      </svg>
      {!s.schaal && (
        <div style={{ fontSize: 12, lineHeight: "14px", height: 14, marginTop: 2, color: A.textMid }}>{"niet op schaal"}</div>
      )}
    </div>
  );
}

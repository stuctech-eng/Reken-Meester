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

// ── TK2b: cirkel, Pythagoras, ruimtefiguren, gelijkvormigheid ───

// Van de kandidaat-punten het punt met de grootste afstand tot alle lijnstukken (voor een vraagteken)
function afstandLijn(q, a, b) {
  var dx = b[0] - a[0], dy = b[1] - a[1], t = Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(q[0] - a[0] - t * dx, q[1] - a[1] - t * dy);
}
function vrijstePlek(kandidaten, stukken) {
  var best = kandidaten[0], bestD = -1;
  kandidaten.forEach(function(q) {
    var d = Math.min.apply(null, stukken.map(function(s) { return afstandLijn(q, s[0], s[1]); }));
    if (d > bestD) { bestD = d; best = q; }
  });
  return best;
}
// Getal met komma (4.5 -> "4,5") en eenheid
function getal(x) { return String(x).replace(".", ","); }
function maat(x, eenheid) { return getal(x) + " " + eenheid; }
// Maatlijn (verticaal) met streepjes aan de uiteinden, en het label ernaast
function maatlijnV(x, y1, y2, tekst, kleur, links) {
  return (
    <g>
      {L(x, y1, x, y2, HULP)}{L(x - 6, y1, x + 6, y1, HULP)}{L(x - 6, y2, x + 6, y2, HULP)}
      {TV(links ? x - 9 : x + 9, rond((y1 + y2) / 2), tekst, kleur, links ? "end" : "start")}
    </g>
  );
}
// Label naast het midden van een lijnstuk, aan de kant van de normaal (nx, ny), vrij van de lijn
function zijLabel(p1, p2, tekst, kleur, kant) {
  var mx = (p1[0] + p2[0]) / 2, my = (p1[1] + p2[1]) / 2, dx = p2[0] - p1[0], dy = p2[1] - p1[1], n = Math.hypot(dx, dy);
  var nx = -dy / n * kant, ny = dx / n * kant, m = labelMaat(tekst);
  var uit = Math.abs(nx) * m.w / 2 + Math.abs(ny) * 12 + 6;
  return TV(rond(mx + nx * uit), rond(my + ny * uit), tekst, kleur);
}

// Cirkel: straal (vanuit het midden naar rechts, label buiten de cirkel) of middellijn (horizontaal) gegeven of gevraagd; omtrek gegeven
// (rand blauw, label rechtsboven) of gevraagd (rand goud, "?" rechtsboven); oppervlakte gevraagd ("?" binnen)
function cirkel(f) {
  var g = f.gegeven, v = f.gevraagd, c = [120, 70], R = 56;
  var randKleur = v === "omtrek" ? G : g.omtrek ? P : LIJN, randDik = (v === "omtrek" || g.omtrek) ? 3.4 : 2.2;
  var straal = g.r ? P : v === "straal" ? G : null, middellijn = g.d ? P : v === "middellijn" ? G : null;
  var sp = [c[0] + R, c[1]];
  return (
    <g>
      <circle cx={c[0]} cy={c[1]} r={R} fill={v === "opp" ? GL : PL} stroke={randKleur} strokeWidth={randDik} />
      {straal ? <g>{L(c[0], c[1], sp[0], sp[1], straal)}{TV(sp[0] + 9, sp[1], g.r ? cm(g.r) : "?", straal, "start")}</g> : null}
      {middellijn ? <g>{L(c[0] - R, c[1], c[0] + R, c[1], middellijn)}{TV(c[0] - 20, c[1] - 14, g.d ? cm(g.d) : "?", middellijn)}</g> : null}
      <circle cx={c[0]} cy={c[1]} r={3} fill={LIJN} />
      {g.omtrek ? TV(c[0] + R + 8, 22, maat(g.omtrek, "cm"), P, "start") : null}
      {v === "omtrek" ? TV(c[0] + R + 14, 22, "?", G, "start") : null}
      {v === "opp" ? TV(c[0] - 18, c[1] + 26, "?", G) : null}
    </g>
  );
}
// Halve of kwart cirkel met straal r. Oppervlakte: "?" binnen; omtrek van de halve cirkel (boog + middellijn):
// de hele rand goud en dik, "?" rechtsboven
function cirkeldeel(f) {
  var r = f.gegeven.r, v = f.gevraagd;
  if (v === "kwartopp") {
    var c = [96, 118], R = 92;
    return (
      <g>
        <path d={"M" + c[0] + "," + c[1] + " L" + (c[0] + R) + "," + c[1] + " A" + R + "," + R + " 0 0 0 " + c[0] + "," + (c[1] - R) + " Z"} fill={GL} stroke={LIJN} strokeWidth={2.2} strokeLinejoin="round" />
        {rechteHoek(c, 0, HULP)}
        {TV(c[0] - 8, rond(c[1] - R / 2), cm(r), P, "end")}
        {TV(c[0] + 36, c[1] - 30, "?", G)}
      </g>
    );
  }
  var m = [150, 112], Rh = 84, omtrek = v === "halfomtrek";
  return (
    <g>
      <path d={"M" + (m[0] - Rh) + "," + m[1] + " A" + Rh + "," + Rh + " 0 0 1 " + (m[0] + Rh) + "," + m[1] + " Z"} fill={GL} stroke={omtrek ? G : LIJN} strokeWidth={omtrek ? 3.4 : 2.2} strokeLinejoin="round" />
      {L(m[0], m[1], m[0] + Rh, m[1], P)}<circle cx={m[0]} cy={m[1]} r={3} fill={LIJN} />
      {TV(m[0] + Rh / 2, m[1] + 15, cm(r), P)}
      {omtrek ? TV(m[0] + Rh * 0.8, 18, "?", G) : TV(m[0] - 26, m[1] - 34, "?", G)}
    </g>
  );
}
// Rechthoekige driehoek, rechte hoek linksonder. Horizontaal de rechthoekszijde a, verticaal de andere (b of "?"),
// de schuine zijde c (gegeven of "?"). Niet op schaal (begrensde verhouding).
function rechthoekig(f) {
  var g = f.gegeven, schuin = f.gevraagd === "schuin";
  var hor = g.a, ver = schuin ? g.b : Math.sqrt(g.c * g.c - g.a * g.a);
  var k = Math.min(170 / hor, 92 / ver);
  var bp = grens(hor * k, 100, 170), hp = grens(ver * k, 56, 92);
  var x0 = 84, y0 = 112, A0 = [x0, y0], B0 = [x0 + bp, y0], C0 = [x0, rond(y0 - hp)];
  return (
    <g>
      {Poly([A0, B0, C0], PL)}{rechteHoek(A0, 0, LIJN)}
      {TV(rond(x0 + bp / 2), y0 + 15, cm(g.a), P)}
      {TV(x0 - 9, rond(y0 - hp / 2), schuin ? cm(g.b) : "?", schuin ? P : G, "end")}
      {zijLabel(C0, B0, schuin ? "?" : cm(g.c), schuin ? G : P, -1)}
    </g>
  );
}
// Ladder tegen een muur: grond, muur (rechts), ladder schuin; voet en ladderlengte gegeven, hoogte "?"
function ladder(f) {
  var g = f.gegeven, h = Math.sqrt(g.L * g.L - g.v * g.v);
  var k = Math.min(92 / h, 130 / g.v);
  var hp = grens(h * k, 64, 92), vp = grens(g.v * k, 44, 130);
  var xm = 196, y0 = 112, voet = [rond(xm - vp), y0], top = [xm, rond(y0 - hp)];
  return (
    <g>
      {L(30, y0, 250, y0)}
      <rect x={xm} y={14} width={12} height={y0 - 14} fill={GL} stroke={LIJN} strokeWidth={2.2} />
      {rechteHoek([xm, y0], 90, HULP)}
      {L(voet[0], voet[1], top[0], top[1], P, false, 4)}
      {TV(rond(voet[0] + vp / 2), y0 + 15, maat(g.v, "m"), P)}
      {zijLabel(voet, top, maat(g.L, "m"), P, -1)}
      {TV(xm + 20, rond(y0 - hp / 2), "?", G, "start")}
    </g>
  );
}
// Rechthoek (scherm of veld) met de diagonaal; breedte onder, hoogte links, diagonaal "?"
function diagonaal(f) {
  var g = f.gegeven, e = f.eenheid;
  var k = Math.min(180 / g.b, 92 / g.h);
  var bp = grens(g.b * k, 120, 180), hp = grens(g.h * k, 56, 92);
  var x0 = rond(168 - bp / 2), y1 = 112, y0 = rond(y1 - hp);
  // vraagteken langs de diagonaal, op een derde vanaf linksonder, iets erboven (daar is ruimte tot de bovenrand)
  var vq = [x0 + bp * 0.32, y1 - hp * 0.32], nl = Math.hypot(bp, hp);
  return (
    <g>
      <rect x={x0} y={y0} width={rond(bp)} height={rond(hp)} fill={PL} stroke={LIJN} strokeWidth={2.2} />
      {L(x0, y1, rond(x0 + bp), y0, G, true)}
      {TV(rond(x0 + bp / 2), y1 + 15, maat(g.b, e), P)}
      {TV(x0 - 9, rond((y0 + y1) / 2), maat(g.h, e), P, "end")}
      {TV(rond(vq[0] - hp / nl * 16), rond(vq[1] - bp / nl * 16), "?", G)}
    </g>
  );
}

// Ruimtefiguren in schuine projectie: diepte naar rechtsboven (dx, -dy). Verborgen ribben gestippeld, over de
// vlakken heen getekend (je kijkt er als het ware doorheen).
function prisma(f) {
  // Liggend driehoekig prisma: voorvlak de driehoek (blauw), diepte naar rechtsboven. In deze schuine
  // projectie kijk je van rechtsvoor: zichtbaar zijn het voorvlak en het rechtervlak; het schuine vlak links
  // en de onderkant liggen achter. Verborgen ribben (vanuit de achterste linkerhoek) gestippeld.
  // De hoogte van de driehoek gestippeld met rechte hoek, de maat ervan als maatlijn links.
  var g = f.gegeven;
  var bp = grens(g.b * 12, 70, 104), hp = grens(g.h * 10, 60, 74), dp = grens(g.l * 6, 60, 104);
  var dx = dp * 0.8, dy = dp * 0.3, x0 = 84, y0 = 108;
  var A0 = [x0, y0], B0 = [x0 + bp, y0], C0 = [rond(x0 + bp * 0.35), y0 - hp];
  var sh = function(p) { return [rond(p[0] + dx), rond(p[1] - dy)]; };
  var A1 = sh(A0), B1 = sh(B0), C1 = sh(C0);
  // vraagteken op het rechtervlak, op de plek die het verst van alle ribben (ook de verborgen) ligt
  var kand = [];
  for (var i = 1; i < 6; i++) for (var j = 1; j < 6; j++) {
    var u = i / 6, w = j / 6;
    kand.push([C0[0] + (B0[0] - C0[0]) * u + dx * w, C0[1] + (B0[1] - C0[1]) * u - dy * w]);
  }
  var vq = vrijstePlek(kand, [[A0, B0], [B0, C0], [C0, A0], [B0, B1], [B1, C1], [C1, C0], [A0, A1], [A1, B1], [A1, C1]]);
  return (
    <g>
      {Poly([C0, B0, B1, C1], GL)}{Poly([A0, B0, C0], PL)}
      {L(A0[0], A0[1], A1[0], A1[1], HULP, true)}{L(A1[0], A1[1], B1[0], B1[1], HULP, true)}{L(A1[0], A1[1], C1[0], C1[1], HULP, true)}
      {L(C0[0], C0[1], C0[0], y0, HULP, true)}{rechteHoek([C0[0], y0], 0, HULP)}
      {maatlijnV(x0 - 14, C0[1], y0, cm(g.h), P, true)}
      {TV(rond(x0 + bp / 2), y0 + 14, cm(g.b), P)}
      {zijLabel(B0, B1, cm(g.l), P, 1)}
      {TV(rond(vq[0]), rond(vq[1]), "?", G)}
    </g>
  );
}
// Prisma met een gegeven grondvlak (vijfhoek, onderaan blauw) en hoogte (maatlijn rechts)
function prismaG(f) {
  var g = f.gegeven, hp = grens(g.h * 6, 56, 80), y0 = 120;
  var basis = [[110, 0], [170, 0], [190, -12], [150, -24], [95, -16]];
  var onder = basis.map(function(p) { return [p[0], y0 + p[1]]; }), boven = basis.map(function(p) { return [p[0], rond(y0 + p[1] - hp)]; });
  return (
    <g>
      {Poly([onder[0], onder[1], boven[1], boven[0]], GL)}{Poly([onder[1], onder[2], boven[2], boven[1]], GL)}{Poly([onder[4], onder[0], boven[0], boven[4]], GL)}
      {Poly(boven, GL)}
      {L(onder[3][0], onder[3][1], onder[4][0], onder[4][1], HULP, true)}{L(onder[2][0], onder[2][1], onder[3][0], onder[3][1], HULP, true)}{L(onder[3][0], onder[3][1], boven[3][0], boven[3][1], HULP, true)}
      <polygon points={onder.map(function(p) { return p[0] + "," + p[1]; }).join(" ")} fill="none" stroke={P} strokeWidth={2.2} />
      {TV(200, y0 - 8, maat(g.G, "cm²"), P, "start")}
      {maatlijnV(78, rond(y0 - 16 - hp), y0 - 16, cm(g.h), P, true)}
      {TV(128, rond(y0 - 6 - hp / 2), "?", G)}
    </g>
  );
}
function cilinder(f) {
  var g = f.gegeven, rx = 58, ry = 13, cx = 150, top = 26;
  var hp = grens(g.h * 6, 60, 88), bot = top + hp;
  return (
    <g>
      <path d={"M" + (cx - rx) + "," + top + " L" + (cx - rx) + "," + bot + " A" + rx + "," + ry + " 0 0 0 " + (cx + rx) + "," + bot + " L" + (cx + rx) + "," + top} fill={GL} stroke={LIJN} strokeWidth={2.2} />
      <path d={"M" + (cx - rx) + "," + bot + " A" + rx + "," + ry + " 0 0 1 " + (cx + rx) + "," + bot} fill="none" stroke={HULP} strokeWidth={2.2} strokeDasharray="6 5" />
      <ellipse cx={cx} cy={top} rx={rx} ry={ry} fill={GL} stroke={LIJN} strokeWidth={2.2} />
      {L(cx, top, cx + rx, top, P)}<circle cx={cx} cy={top} r={3} fill={LIJN} />
      {TV(cx + rx + 9, top, cm(g.r), P, "start")}
      {maatlijnV(cx - rx - 16, top, bot, cm(g.h), P, true)}
      {TV(cx + 6, rond((top + ry + bot - ry) / 2), "?", G)}
    </g>
  );
}
// Piramide met vierkant grondvlak (schuin getekend) en de hoogte gestippeld van de top naar het midden
function piramide(f) {
  var g = f.gegeven, z = grens(g.z * 12, 90, 110), d = z * 0.55, hp = grens(g.h * 7, 64, 90);
  var x0 = 30, y0 = 110, dx = d * 0.8, dy = d * 0.45;
  var A0 = [x0, y0], B0 = [x0 + z, y0], C0 = [rond(x0 + z + dx), rond(y0 - dy)], D0 = [rond(x0 + dx), rond(y0 - dy)];
  var M = [rond(x0 + z / 2 + dx / 2), rond(y0 - dy / 2)], T0 = [M[0], rond(M[1] - hp)], xm = C0[0] + 16;
  // vraagteken op het voorvlak of het rechtervlak, op de plek die het verst van alle ribben en lijnen ligt
  var kand = [];
  [[B0, C0, T0], [A0, B0, T0]].forEach(function(v) {
    for (var i = 1; i < 10; i++) for (var j = 1; j < 10 - i; j++) {
      var u = i / 10, w = j / 10;
      kand.push([v[0][0] + (v[1][0] - v[0][0]) * u + (v[2][0] - v[0][0]) * w, v[0][1] + (v[1][1] - v[0][1]) * u + (v[2][1] - v[0][1]) * w]);
    }
  });
  var hoekje = [[M[0] + 13, M[1]], [M[0] + 13, M[1] - 13], [M[0], M[1] - 13]];
  var vq = vrijstePlek(kand, [[A0, B0], [B0, C0], [C0, D0], [D0, A0], [A0, T0], [B0, T0], [C0, T0], [D0, T0], [T0, M], [hoekje[0], hoekje[1]], [hoekje[1], hoekje[2]]]);
  return (
    <g>
      {Poly([A0, B0, T0], GL)}{Poly([B0, C0, T0], GL)}
      {L(A0[0], A0[1], D0[0], D0[1], HULP, true)}{L(D0[0], D0[1], C0[0], C0[1], HULP, true)}{L(D0[0], D0[1], T0[0], T0[1], HULP, true)}
      {L(T0[0], T0[1], M[0], M[1], HULP, true)}{rechteHoek(M, 0, HULP)}
      {L(T0[0] + 4, T0[1], xm + 6, T0[1], HULP, true, 1.6)}
      {maatlijnV(xm, T0[1], M[1], cm(g.h), P)}
      {TV(rond(x0 + z / 2), y0 + 14, cm(g.z), P)}
      {zijLabel(B0, C0, cm(g.z), P, 1)}
      {TV(rond(vq[0]), rond(vq[1]), "?", G)}
    </g>
  );
}
function kegel(f) {
  var g = f.gegeven, rx = 62, ry = 14, cx = 150, y0 = 112, hp = grens(g.h * 5, 64, 90), T0 = [cx, y0 - hp];
  // vraagteken links van de hoogte, op de plek die het verst van de rand, de hoogte en de achterste boog ligt
  var boogAchter = [];
  for (var a = 0; a <= 12; a++) boogAchter.push([cx - rx * Math.cos(a * Math.PI / 12), y0 - ry * Math.sin(a * Math.PI / 12)]);
  var stukken = [[[cx - rx, y0], T0], [T0, [cx, y0]]];
  for (var b = 0; b < 12; b++) stukken.push([boogAchter[b], boogAchter[b + 1]]);
  var kand = [];
  for (var i = 1; i < 7; i++) for (var j = 1; j < 6; j++) { var yy = y0 - hp * j / 6, xl = cx - rx * (1 - j / 6); kand.push([xl + (cx - xl) * i / 7, yy]); }
  var vq = vrijstePlek(kand, stukken);
  return (
    <g>
      <path d={"M" + (cx - rx) + "," + y0 + " L" + T0[0] + "," + T0[1] + " L" + (cx + rx) + "," + y0 + " A" + rx + "," + ry + " 0 0 1 " + (cx - rx) + "," + y0} fill={GL} stroke={LIJN} strokeWidth={2.2} strokeLinejoin="round" />
      <path d={"M" + (cx - rx) + "," + y0 + " A" + rx + "," + ry + " 0 0 1 " + (cx + rx) + "," + y0} fill="none" stroke={HULP} strokeWidth={2.2} strokeDasharray="6 5" />
      {L(cx, T0[1], cx, y0, HULP, true)}
      {L(cx, y0, cx + rx, y0, P)}<circle cx={cx} cy={y0} r={3} fill={LIJN} />
      {TV(cx + rx + 9, y0, cm(g.r), P, "start")}
      {maatlijnV(cx - rx - 16, T0[1], y0, cm(g.h), P, true)}
      {TV(rond(vq[0]), rond(vq[1]), "?", G)}
    </g>
  );
}
// Balk: voorvlak l x h, diepte b naar rechtsboven; totale oppervlakte "?" (op het zijvlak, waar geen
// verborgen ribben lopen)
function balk(f) {
  var g = f.gegeven, lp = grens(g.l * 12, 80, 120), hp = grens(g.h * 8, 48, 76), bp = grens(g.b * 6, 40, 70);
  var dx = bp * 0.8, dy = bp * 0.45, x0 = 74, y0 = 110;
  var A0 = [x0, y0], B0 = [x0 + lp, y0], C0 = [x0 + lp, y0 - hp], D0 = [x0, y0 - hp];
  var sh = function(p) { return [rond(p[0] + dx), rond(p[1] - dy)]; };
  var A1 = sh(A0), B1 = sh(B0), C1 = sh(C0), D1 = sh(D0);
  // vraagteken op het voorvlak of het rechtervlak, op de plek die het verst van alle ribben (ook de verborgen) ligt
  var kand = [];
  for (var i = 1; i < 6; i++) for (var j = 1; j < 6; j++) kand.push([B0[0] + dx * i / 6, B0[1] - dy * i / 6 - hp * j / 6]);
  for (var k = 1; k < 8; k++) for (var m = 1; m < 6; m++) kand.push([x0 + lp * k / 8, y0 - hp * m / 6]);
  var vq = vrijstePlek(kand, [[A0, B0], [B0, C0], [C0, D0], [D0, A0], [B0, B1], [C0, C1], [D0, D1], [B1, C1], [C1, D1], [A0, A1], [A1, B1], [A1, D1]]);
  return (
    <g>
      {Poly([D0, C0, C1, D1], GL)}{Poly([B0, B1, C1, C0], GL)}{Poly([A0, B0, C0, D0], GL)}
      {L(A0[0], A0[1], A1[0], A1[1], HULP, true)}{L(A1[0], A1[1], B1[0], B1[1], HULP, true)}{L(A1[0], A1[1], D1[0], D1[1], HULP, true)}
      {TV(rond(x0 + lp / 2), y0 + 14, cm(g.l), P)}
      {TV(x0 - 9, rond(y0 - hp / 2), cm(g.h), P, "end")}
      {zijLabel(B0, B1, cm(g.b), P, 1)}
      {TV(rond(vq[0]), rond(vq[1]), "?", G)}
    </g>
  );
}
// Twee gelijkvormige driehoeken (links oud, rechts nieuw), zelfde vorm, factor zichtbaar maar begrensd
// (0,75 tot 2,2: ook bij verkleinen blijft de tweede driehoek groot genoeg voor zijn labels).
// Basis: a1 en b1; linkerzijde: a2 en "?"
function gelijkvormig(f) {
  var g = f.gegeven, kv = grens(g.b1 / g.a1, 0.75, 2.2);
  var sb = Math.min(80, 168 / (1 + kv)), vorm = [[0, 0], [1, 0], [0.3, -0.62]];
  var x1 = 86, y0 = 108, x2 = rond(x1 + sb + 40);
  var drie = function(x, s) { return vorm.map(function(p) { return [rond(x + p[0] * s), rond(y0 + p[1] * s)]; }); };
  var K = drie(x1, sb), Gr = drie(x2, sb * kv);
  return (
    <g>
      {Poly(K, PL)}{Poly(Gr, GL)}
      {TV(rond(x1 + sb / 2), y0 + 15, cm(g.a1), P)}
      {TV(rond(x2 + sb * kv / 2), y0 + 15, cm(g.b1), P)}
      {zijLabel(K[0], K[2], cm(g.a2), P, -1)}
      {zijLabel(Gr[0], Gr[2], "?", G, -1)}
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
  cirkel: { teken: cirkel, schaal: false, tekst: function(f) { var g = f.gegeven; return "Cirkel" + (g.r ? " met straal " + g.r + " cm" : g.d ? " met middellijn " + g.d + " cm" : " met omtrek " + getal(g.omtrek) + " cm") + ". Met een vraagteken: " + ({ omtrek: "de omtrek", opp: "de oppervlakte", straal: "de straal", middellijn: "de middellijn" }[f.gevraagd]) + "."; } },
  cirkeldeel: { teken: cirkeldeel, schaal: false, tekst: function(f) { return (f.gevraagd === "kwartopp" ? "Kwart cirkel" : "Halve cirkel") + " met straal " + f.gegeven.r + " cm. Met een vraagteken: " + (f.gevraagd === "halfomtrek" ? "de omtrek, de boog plus de middellijn (de dikke rand)" : "de oppervlakte") + "."; } },
  rechthoekig: { teken: rechthoekig, schaal: false, tekst: function(f) { var g = f.gegeven; return f.gevraagd === "schuin" ? "Rechthoekige driehoek met rechthoekszijden " + g.a + " en " + g.b + " cm. De schuine zijde heeft een vraagteken." : "Rechthoekige driehoek met schuine zijde " + g.c + " cm en rechthoekszijde " + g.a + " cm. De andere rechthoekszijde heeft een vraagteken."; } },
  ladder: { teken: ladder, schaal: false, tekst: function(f) { return "Ladder van " + getal(f.gegeven.L) + " m tegen een muur, de voet " + getal(f.gegeven.v) + " m van de muur. De hoogte langs de muur heeft een vraagteken."; } },
  diagonaal: { teken: diagonaal, schaal: false, tekst: function(f) { return "Rechthoek van " + f.gegeven.b + " bij " + f.gegeven.h + " " + f.eenheid + " met een schuine lijn van hoek tot hoek. Die diagonaal heeft een vraagteken."; } },
  prisma: { teken: prisma, schaal: false, tekst: function(f) { var g = f.gegeven; return "Driehoekig prisma: het grondvlak is een driehoek met basis " + g.b + " cm en hoogte " + g.h + " cm, de lengte is " + g.l + " cm. De inhoud heeft een vraagteken."; } },
  prismaG: { teken: prismaG, schaal: false, tekst: function(f) { return "Prisma met een grondvlak van " + f.gegeven.G + " cm² (onderaan, blauw omlijnd) en een hoogte van " + f.gegeven.h + " cm. De inhoud heeft een vraagteken."; } },
  cilinder: { teken: cilinder, schaal: false, tekst: function(f) { return "Cilinder met straal " + f.gegeven.r + " cm en hoogte " + f.gegeven.h + " cm. De inhoud heeft een vraagteken."; } },
  piramide: { teken: piramide, schaal: false, tekst: function(f) { return "Piramide met een vierkant grondvlak van " + f.gegeven.z + " bij " + f.gegeven.z + " cm en een hoogte van " + f.gegeven.h + " cm (gestippeld). De inhoud heeft een vraagteken."; } },
  kegel: { teken: kegel, schaal: false, tekst: function(f) { return "Kegel met straal " + f.gegeven.r + " cm en hoogte " + f.gegeven.h + " cm. De inhoud heeft een vraagteken."; } },
  balk: { teken: balk, schaal: false, tekst: function(f) { var g = f.gegeven; return "Balk van " + g.l + " bij " + g.b + " bij " + g.h + " cm. De totale oppervlakte heeft een vraagteken."; } },
  gelijkvormig: { teken: gelijkvormig, schaal: false, tekst: function(f) { var g = f.gegeven; return "Twee gelijkvormige driehoeken. Bij de eerste: zijde " + g.a1 + " cm en zijde " + g.a2 + " cm. Bij de tweede hoort " + g.a1 + " cm bij " + g.b1 + " cm; de zijde die bij " + g.a2 + " cm hoort, heeft een vraagteken."; } },
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

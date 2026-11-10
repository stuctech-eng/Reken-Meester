import { A } from "../styles/tokens.js";

// NO BACKTICKS / TEMPLATE LITERALS anywhere. String concatenation only.

// Vaste tekeningen bij de theorie van Meetkunde (plan TK1) en van Statistiek en kans (plan ST, fase S3; ids st_...). Elke tekening is een SVG met een vaste
// viewBox (breedte 320), op het scherm hoogstens 320 px breed en verder schalend met het venster.
// Letters minstens 17 eenheden en lijnen minstens 2,1 eenheden: op het smalste scherm (tekening ongeveer
// 236 px breed) is dat nog minstens 12,5 px en 1,5 px. Schematisch, niet op schaal; waar het telt
// (Pythagoras, de omgedraaide driehoek en het trapezium) kloppen de verhoudingen precies.
// Kleuren: lijnen A.text, "gegeven" A.primary, tweede kleur A.gold, hulplijnen gestippeld A.textMid.
// Gebruik in de theorietekst: een regel "[fig:<id>]" (zie PracticeScreen). Een onbekende id tekent niets.

// Ook gebruikt door VraagFiguur (TK2): dezelfde kleuren en tekenhulpjes.
export var LIJN = A.text, P = A.primary, G = A.gold, GROEN = A.success, HULP = A.textMid;
export var PL = A.primaryLight, GL = A.goldBg, GRL = A.successBg;
var W = 2.2;        // lijndikte
var FS = 17;        // lettergrootte

export function T(x, y, tekst, kleur, anker, extra) {
  return <text x={x} y={y} fill={kleur || LIJN} fontSize={(extra && extra.fs) || FS} fontWeight={(extra && extra.fw) || 700} textAnchor={anker || "middle"} dominantBaseline="middle" stroke="#ffffff" strokeWidth={4} strokeLinejoin="round" paintOrder="stroke">{tekst}</text>;
}
export function L(x1, y1, x2, y2, kleur, streep, dikte) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={kleur || LIJN} strokeWidth={dikte || W} strokeDasharray={streep ? "6 5" : undefined} strokeLinecap="round" />;
}
export function Poly(pts, vul, rand, streep) {
  return <polygon points={pts.map(function(p) { return p[0] + "," + p[1]; }).join(" ")} fill={vul || "none"} stroke={rand || LIJN} strokeWidth={W} strokeLinejoin="round" strokeDasharray={streep ? "6 5" : undefined} />;
}
export function Boog(d, kleur) { return <path d={d} fill="none" stroke={kleur} strokeWidth={W + 1} strokeLinecap="round" />; }
export function Pijl(x1, y1, x2, y2, kleur) {
  var dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx * dx + dy * dy), ux = dx / len, uy = dy / len;
  var bx = x2 - 9 * ux, by = y2 - 9 * uy;
  return (
    <g>
      {L(x1, y1, bx, by, kleur || HULP)}
      <polygon points={x2 + "," + y2 + " " + (bx - 5 * uy) + "," + (by + 5 * ux) + " " + (bx + 5 * uy) + "," + (by - 5 * ux)} fill={kleur || HULP} />
    </g>
  );
}

// ── Pythagoras: coördinaten (ook voor de test) ────────────────────
// a = 3, b = 4, c = 5 (schaal 18). Beide grote vierkanten hebben zijde a + b en dezelfde vier driehoeken.
var PK = 18, PA = 3 * PK, PB = 4 * PK, PS = PA + PB;
var PL_X = 14, PR_X = 178, PY = 16;
function pt(ox, x, y) { return [ox + x, PY + y]; }
export var PYTHAGORAS = {
  a: PA, b: PB, s: PS,
  links: {
    vierkant: [pt(PL_X, 0, 0), pt(PL_X, PS, 0), pt(PL_X, PS, PS), pt(PL_X, 0, PS)],
    driehoeken: [
      [pt(PL_X, 0, 0), pt(PL_X, PA, 0), pt(PL_X, 0, PB)],
      [pt(PL_X, PS, 0), pt(PL_X, PS, PA), pt(PL_X, PA, 0)],
      [pt(PL_X, PS, PS), pt(PL_X, PB, PS), pt(PL_X, PS, PA)],
      [pt(PL_X, 0, PS), pt(PL_X, 0, PB), pt(PL_X, PB, PS)],
    ],
    midden: [pt(PL_X, PA, 0), pt(PL_X, PS, PA), pt(PL_X, PB, PS), pt(PL_X, 0, PB)],
  },
  rechts: {
    vierkant: [pt(PR_X, 0, 0), pt(PR_X, PS, 0), pt(PR_X, PS, PS), pt(PR_X, 0, PS)],
    driehoeken: [
      [pt(PR_X, PA, 0), pt(PR_X, PS, 0), pt(PR_X, PA, PA)],
      [pt(PR_X, PS, 0), pt(PR_X, PS, PA), pt(PR_X, PA, PA)],
      [pt(PR_X, 0, PA), pt(PR_X, PA, PA), pt(PR_X, 0, PS)],
      [pt(PR_X, PA, PA), pt(PR_X, PA, PS), pt(PR_X, 0, PS)],
    ],
    kwadraatA: [pt(PR_X, 0, 0), pt(PR_X, PA, 0), pt(PR_X, PA, PA), pt(PR_X, 0, PA)],
    kwadraatB: [pt(PR_X, PA, PA), pt(PR_X, PS, PA), pt(PR_X, PS, PS), pt(PR_X, PA, PS)],
  },
};

function pythagoras() {
  var Lk = PYTHAGORAS.links, R = PYTHAGORAS.rechts;
  var midL = [PL_X + PS / 2, PY + PS / 2];
  return (
    <g>
      {Lk.driehoeken.map(function(d, i) { return <g key={"l" + i}>{Poly(d, i % 2 ? GL : PL)}</g>; })}
      {Poly(Lk.midden, GRL, GROEN)}
      {Poly(Lk.vierkant)}
      {T(midL[0], midL[1], "c²", GROEN, "middle", { fs: 20, fw: 800 })}
      {R.driehoeken.map(function(d, i) { return <g key={"r" + i}>{Poly(d, i < 2 ? PL : GL)}</g>; })}
      {Poly(R.kwadraatA, GRL, GROEN)}
      {Poly(R.kwadraatB, GRL, GROEN)}
      {Poly(R.vierkant)}
      {T(PR_X + PA / 2, PY + PA / 2, "a²", GROEN, "middle", { fs: 18, fw: 800 })}
      {T(PR_X + PA + PB / 2, PY + PA + PB / 2, "b²", GROEN, "middle", { fs: 20, fw: 800 })}
      {T(PL_X + PB / 2, PY + PS + 14, "b", G)}{T(PL_X + PB + PA / 2, PY + PS + 14, "a", P)}
      {T(PR_X + PA / 2, PY + PS + 14, "a", P)}{T(PR_X + PA + PB / 2, PY + PS + 14, "b", G)}
    </g>
  );
}

// ── De tekeningen ─────────────────────────────────────────────────
var FIG = {};

FIG.kruis = { h: 160, label: "Twee lijnen die elkaar kruisen. De hoeken links en rechts heten allebei a en zijn gelijk (overstaand). Een hoek boven of onder is 180° min a.",
  onder: "Overstaande hoeken zijn gelijk; hoeken naast elkaar zijn samen 180°.",
  teken: function() { return (
    <g>
      {L(40, 30, 280, 130)}{L(40, 130, 280, 30)}
      {Boog("M136,90 A26,26 0 0 1 136,70", P)}{Boog("M184,70 A26,26 0 0 1 184,90", P)}
      {T(112, 80, "a", P)}{T(208, 80, "a", P)}
      {T(160, 44, "180° − a", G)}{T(160, 118, "180° − a", G)}
    </g>
  ); } };

FIG.evenwijdig = { h: 170, label: "Twee evenwijdige lijnen, gesneden door een derde lijn. Onderaan een hoek a. Bovenaan op dezelfde plek de F-hoek, ook a. Bovenaan aan de andere kant van de snijlijn, tussen de evenwijdige lijnen, de Z-hoek, ook a.",
  onder: "Bij evenwijdige lijnen zijn de F-hoek en de Z-hoek allebei gelijk aan a.",
  teken: function() { return (
    <g>
      {L(20, 50, 300, 50)}{L(20, 120, 300, 120)}
      {L(262, 44, 270, 50)}{L(262, 56, 270, 50)}{L(262, 114, 270, 120)}{L(262, 126, 270, 120)}
      {L(94.3, 150, 205.7, 20)}
      {Boog("M144,120 A24,24 0 0 0 135.6,101.8", P)}{T(156, 106, "a", P, "start")}
      {Boog("M204,50 A24,24 0 0 0 195.6,31.8", P)}{T(214, 34, "F: a", P, "start")}
      {Boog("M156,50 A24,24 0 0 0 164.4,68.2", G)}{T(146, 74, "Z: a", G, "end")}
      {T(160, 160, "evenwijdig (>)", HULP, "middle", { fs: 17, fw: 600 })}
    </g>
  ); } };

FIG.hoekensom = { h: 175, label: "Een driehoek met hoeken alfa, bèta en gamma. Door de top loopt een stippellijn evenwijdig aan de basis. Langs die lijn komen alfa en bèta terug als Z-hoeken; samen met gamma vormen ze een gestrekte hoek van 180 graden.",
  onder: "Hulplijn door de top: α en β komen boven terug (Z-hoeken). α + γ + β = 180°.",
  teken: function() { return (
    <g>
      {L(20, 40, 300, 40, HULP, true)}
      {Poly([[40, 150], [280, 150], [120, 40]])}
      {Boog("M66,150 A26,26 0 0 0 55.3,129", P)}{T(76, 138, "α", P)}
      {Boog("M254,150 A26,26 0 0 1 258.6,135.3", G)}{T(236, 140, "β", G)}
      {Boog("M98,40 A22,22 0 0 0 107.1,57.8", P)}{T(86, 56, "α", P)}
      {Boog("M107.1,57.8 A22,22 0 0 0 138.1,52.5", GROEN)}{T(124, 78, "γ", GROEN)}
      {Boog("M138.1,52.5 A22,22 0 0 0 142,40", G)}{T(158, 53, "β", G)}
      {T(250, 28, "evenwijdig", HULP, "middle", { fs: 17, fw: 600 })}
    </g>
  ); } };

FIG.gelijkbenig = { h: 175, label: "Een gelijkbenige driehoek met een stippellijn als symmetrieas door de top. De twee schuine zijden zijn gelijk (streepjes) en de twee basishoeken zijn gelijk.",
  onder: "De symmetrieas vouwt de basishoeken op elkaar: ze zijn gelijk.",
  teken: function() { return (
    <g>
      {Poly([[80, 160], [240, 160], [160, 30]])}
      {L(160, 30, 160, 160, HULP, true)}
      {L(113.2, 90.8, 126.8, 99.2, P)}{L(193.2, 99.2, 206.8, 90.8, P)}
      {Boog("M106,160 A26,26 0 0 0 93.6,137.8", G)}{Boog("M214,160 A26,26 0 0 1 226.4,137.8", G)}
      {T(110, 146, "x", G)}{T(210, 146, "x", G)}
      {T(166, 112, "as", HULP, "start", { fs: 17, fw: 600 })}
    </g>
  ); } };

function vak(x, y, w, tekst) {
  return <g><rect x={x - w / 2} y={y - 15} width={w} height={30} rx={8} fill={A.bgCard} stroke={P} strokeWidth={W} />{T(x, y + 1, tekst, LIJN, "middle", { fs: 17, fw: 800 })}</g>;
}
FIG.familie = { h: 230, label: "Een schema. Een pijl betekent: is ook een. Vierkant is ook een rechthoek en een ruit. Rechthoek en ruit zijn ook een parallellogram. Een parallellogram is ook een trapezium. Een ruit is ook een vlieger.",
  onder: "Pijl = \"is ook een\". Trapezium: minstens één paar evenwijdige zijden.",
  teken: function() { return (
    <g>
      {Pijl(140, 40, 100, 68)}{Pijl(180, 40, 220, 68)}
      {Pijl(100, 101, 140, 128)}{Pijl(220, 101, 180, 128)}
      {Pijl(160, 161, 160, 188)}{Pijl(256, 101, 270, 128)}
      {vak(160, 25, 110, "vierkant")}
      {vak(82, 85, 112, "rechthoek")}{vak(238, 85, 96, "ruit")}
      {vak(150, 145, 150, "parallellogram")}{vak(272, 145, 92, "vlieger")}
      {vak(160, 205, 120, "trapezium")}
    </g>
  ); } };

function cel(ox, oy, pts, diag, naam, extra) {
  var p = pts.map(function(q) { return [ox + q[0], oy + q[1]]; });
  return (
    <g>
      {Poly(p, A.bgCard)}
      {L(ox + diag[0][0], oy + diag[0][1], ox + diag[0][2], oy + diag[0][3], P)}
      {L(ox + diag[1][0], oy + diag[1][1], ox + diag[1][2], oy + diag[1][3], G)}
      {extra ? extra(ox, oy) : null}
      {T(ox + 80, oy + 100, naam, LIJN, "middle", { fs: 17, fw: 800 })}
    </g>
  );
}
function haak(x, y) { return <path d={"M" + x + "," + (y - 8) + " L" + (x + 8) + "," + (y - 8) + " L" + (x + 8) + "," + y} fill="none" stroke={LIJN} strokeWidth={2.1} />; }
FIG.diagonalen = { h: 226, label: "Vier vierhoeken met hun diagonalen. Parallellogram: de diagonalen delen elkaar middendoor. Rechthoek: ook even lang. Ruit: ook loodrecht. Vlieger: loodrecht, maar slechts één diagonaal wordt middendoor gedeeld.",
  onder: "Middendoor: parallellogram. Ook even lang: rechthoek. Ook loodrecht: ruit. Loodrecht, maar slechts één diagonaal wordt middendoor gedeeld: vlieger.",
  teken: function() { return (
    <g>
      {cel(0, 0, [[20, 70], [110, 70], [140, 20], [50, 20]], [[20, 70, 140, 20], [110, 70, 50, 20]], "parallellogram")}
      {cel(160, 0, [[20, 20], [140, 20], [140, 70], [20, 70]], [[20, 20, 140, 70], [140, 20, 20, 70]], "rechthoek")}
      {cel(0, 112, [[80, 8], [140, 45], [80, 82], [20, 45]], [[80, 8, 80, 82], [20, 45, 140, 45]], "ruit", function(ox, oy) { return haak(ox + 80, oy + 45); })}
      {cel(160, 112, [[80, 8], [115, 35], [80, 84], [45, 35]], [[80, 8, 80, 84], [45, 35, 115, 35]], "vlieger", function(ox, oy) { return haak(ox + 80, oy + 35); })}
    </g>
  ); } };

FIG.parallellogram = { h: 150, label: "Links een parallellogram met een stippellijn als hoogte. Het driehoekje links wordt afgeknipt en rechts aangelegd. Rechts is het een rechthoek met dezelfde basis en hoogte.",
  onder: "Knip het driehoekje af en leg het rechts: een rechthoek. Oppervlakte = basis · hoogte.",
  teken: function() { return (
    <g>
      {Poly([[15, 110], [40, 110], [40, 40]], PL, P)}
      {Poly([[15, 110], [115, 110], [140, 40], [40, 40]])}
      {L(40, 40, 40, 110, HULP, true)}{T(48, 78, "h", HULP, "start")}
      {T(65, 128, "basis", LIJN)}
      {Pijl(150, 75, 176, 75)}
      {Poly([[185, 110], [260, 110], [285, 40], [185, 40]])}
      {Poly([[260, 110], [285, 110], [285, 40]], PL, P)}
      {T(235, 128, "basis", LIJN)}{T(297, 75, "h", HULP, "start")}
    </g>
  ); } };

FIG.driehoek = { h: 150, label: "Een parallellogram, door een diagonaal verdeeld in twee dezelfde driehoeken, de ene omgedraaid. Een stippellijn toont de hoogte.",
  onder: "Twee dezelfde driehoeken vormen een parallellogram: één driehoek = ½ · basis · hoogte.",
  teken: function() { return (
    <g>
      {Poly([[40, 120], [200, 120], [100, 40]], PL, P)}
      {Poly([[200, 120], [260, 40], [100, 40]], GL, G)}
      {L(100, 40, 100, 120, HULP, true)}{T(92, 84, "h", HULP, "end")}
      {T(120, 138, "basis", LIJN)}
    </g>
  ); } };

FIG.trapezium = { h: 150, label: "Een trapezium met onderkant a en bovenkant b, en ernaast dezelfde trapezium omgedraaid. Samen een parallellogram met basis a plus b.",
  onder: "Trapezium + omgedraaide kopie = parallellogram met basis a + b. Eén trapezium = ½ · (a + b) · h.",
  teken: function() { return (
    <g>
      {Poly([[20, 120], [140, 120], [110, 50], [60, 50]], PL, P)}
      {Poly([[140, 120], [190, 120], [230, 50], [110, 50]], GL, G)}
      {T(80, 138, "a", P)}{T(165, 138, "b", G)}{T(85, 40, "b", P)}{T(170, 40, "a", G)}
      {L(250, 50, 250, 120, HULP, true)}{T(258, 85, "h", HULP, "start")}
    </g>
  ); } };

FIG.cirkel = { h: 190, label: "Een cirkel. Een lijn van het midden naar de rand is de straal r. Een lijn door het midden van rand tot rand is de middellijn d. De rand zelf is de omtrek.",
  onder: "Straal r: midden tot rand. Middellijn d = 2r. Omtrek = de rand (π · d). Oppervlakte = binnen (π · r²).",
  teken: function() { return (
    <g>
      <circle cx={160} cy={95} r={70} fill={GRL} stroke={P} strokeWidth={W + 2} />
      {L(90, 95, 230, 95, LIJN)}{T(196, 110, "d", LIJN)}
      {L(160, 95, 209.5, 45.5, G)}{T(180, 64, "r", G, "end")}
      <circle cx={160} cy={95} r={3.5} fill={LIJN} />
      {T(70, 32, "omtrek", P, "middle")}
      {T(160, 132, "oppervlakte", GROEN, "middle", { fs: 17, fw: 700 })}
    </g>
  ); } };

function sectorPad(cx, cy, r, a0, a1) {
  var x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0), x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
  return "M" + cx + "," + cy + " L" + x0.toFixed(1) + "," + y0.toFixed(1) + " A" + r + "," + r + " 0 0 1 " + x1.toFixed(1) + "," + y1.toFixed(1) + " Z";
}
FIG.taartpunten = { h: 170, label: "Links een cirkel in 8 taartpunten, om en om gekleurd. Rechts dezelfde 8 punten om en om naast elkaar gelegd: bijna een parallellogram. De lengte is ongeveer de halve omtrek, pi keer r; de hoogte is ongeveer r.",
  onder: "8 punten om en om: bijna een parallellogram (een benadering, niet precies). Lengte ≈ π · r, hoogte ≈ r. Hoe meer punten, hoe beter.",
  teken: function() {
    var r = 45, c = 2 * r * Math.sin(Math.PI / 8), hh = r * Math.cos(Math.PI / 8), X = 162, Yb = 112, delen = [];
    for (var j = 0; j < 8; j++) delen.push(<path key={"c" + j} d={sectorPad(70, 85, r, -Math.PI / 2 + j * Math.PI / 4, -Math.PI / 2 + (j + 1) * Math.PI / 4)} fill={j % 2 ? GL : PL} stroke={LIJN} strokeWidth={2.1} />);
    for (var k = 0; k < 4; k++) {
      var ax = X + c / 2 + k * c, l = [X + k * c, Yb - hh], rr = [X + (k + 1) * c, Yb - hh];
      delen.push(<path key={"d" + k} d={"M" + ax.toFixed(1) + "," + Yb + " L" + l[0].toFixed(1) + "," + l[1].toFixed(1) + " A" + r + "," + r + " 0 0 1 " + rr[0].toFixed(1) + "," + rr[1].toFixed(1) + " Z"} fill={PL} stroke={LIJN} strokeWidth={2.1} />);
      var ux = X + c + k * c, lb = [X + c / 2 + k * c, Yb], rb = [X + 3 * c / 2 + k * c, Yb];
      delen.push(<path key={"u" + k} d={"M" + ux.toFixed(1) + "," + (Yb - hh).toFixed(1) + " L" + rb[0].toFixed(1) + "," + rb[1] + " A" + r + "," + r + " 0 0 1 " + lb[0].toFixed(1) + "," + lb[1] + " Z"} fill={GL} stroke={LIJN} strokeWidth={2.1} />);
    }
    return (
      <g>
        {delen}
        {Pijl(120, 85, 138, 85)}
        {T(X + 2.25 * c, Yb + 30, "≈ π · r", P, "middle")}
        {L(X - 6, Yb - hh, X - 6, Yb, G)}{T(X - 12, Yb - hh / 2, "r", G, "end")}
      </g>
    );
  } };

FIG.pythagoras = { h: 168, label: "Twee even grote vierkanten met zijde a plus b, elk met dezelfde vier rechthoekige driehoeken. Links blijft in het midden een scheef vierkant over: c kwadraat. Rechts blijven twee vierkanten over: a kwadraat en b kwadraat. Dus c kwadraat is a kwadraat plus b kwadraat.",
  onder: "Twee even grote vierkanten, dezelfde vier driehoeken. Wat overblijft is even groot: c² = a² + b².",
  teken: pythagoras };

FIG.laagjes = { h: 180, label: "Een balk als stapel van vijf dunne laagjes. Het onderste laagje is het grondvlak; de stapel is de hoogte.",
  onder: "Laagje op laagje: inhoud = grondvlak · hoogte.",
  teken: function() {
    var x0 = 50, y0 = 40, w = 150, hgt = 120, dx = 50, dy = -28, lagen = [];
    for (var i = 1; i < 5; i++) { var y = y0 + i * hgt / 5; lagen.push(<g key={i}>{L(x0, y, x0 + w, y, HULP)}{L(x0 + w, y, x0 + w + dx, y + dy, HULP)}</g>); }
    return (
      <g>
        {Poly([[x0, y0 + hgt - hgt / 5], [x0 + w, y0 + hgt - hgt / 5], [x0 + w, y0 + hgt], [x0, y0 + hgt]], PL, P)}
        {Poly([[x0, y0], [x0 + w, y0], [x0 + w, y0 + hgt], [x0, y0 + hgt]])}
        {Poly([[x0, y0], [x0 + dx, y0 + dy], [x0 + w + dx, y0 + dy], [x0 + w, y0]])}
        {Poly([[x0 + w, y0], [x0 + w + dx, y0 + dy], [x0 + w + dx, y0 + hgt + dy], [x0 + w, y0 + hgt]])}
        {lagen}
        {T(x0 + w / 2, y0 + hgt - hgt / 10, "grondvlak", P, "middle", { fs: 17, fw: 800 })}
        {L(x0 - 14, y0, x0 - 14, y0 + hgt, G)}{T(x0 - 20, y0 + hgt / 2, "h", G, "end")}
      </g>
    );
  } };

FIG.piramides = { h: 225, label: "Een kubus. Vanuit één hoekpunt, de top, lopen lijnen naar de andere hoekpunten. Zo ontstaan drie piramides: met als grondvlak de achterkant, de rechterkant en de onderkant van de kubus. Samen vullen ze de hele kubus.",
  onder: "Eén top, drie grondvlakken (achter, rechts, onder): drie piramides met gelijke inhoud vullen de kubus. Elk = ⅓.",
  teken: function() {
    var V = [60, 80], FTR = [180, 80], FBL = [60, 200], FBR = [180, 200], BTL = [120, 30], BTR = [240, 30], BBL = [120, 150], BBR = [240, 150];
    return (
      <g>
        {Poly([BTL, BTR, BBR, BBL], GL, G)}
        {Poly([FTR, BTR, BBR, FBR], PL, P)}
        {Poly([FBL, FBR, BBR, BBL], GRL, GROEN)}
        {Poly([V, FTR, FBR, FBL])}
        {L(V[0], V[1], BTL[0], BTL[1])}{L(FTR[0], FTR[1], BTR[0], BTR[1])}
        {L(V[0], V[1], BTR[0], BTR[1], HULP, true)}{L(V[0], V[1], BBR[0], BBR[1], HULP, true)}
        {L(V[0], V[1], BBL[0], BBL[1], HULP, true)}{L(V[0], V[1], FBR[0], FBR[1], HULP, true)}
        <circle cx={V[0]} cy={V[1]} r={4.5} fill={LIJN} />
        {T(50, 68, "top", LIJN, "end")}
        {T(252, 92, "achter", G, "start", { fs: 17, fw: 800 })}{T(212, 132, "rechts", P, "middle", { fs: 17, fw: 800 })}{T(150, 214, "onder", GROEN, "middle", { fs: 17, fw: 800 })}
      </g>
    );
  } };

// Kubus van 2 x 2 x 2 blokjes: [kolom, laag, diepte]. Eerst de achterste rij, dan de voorste (die ligt eroverheen).
export var KUBUS8 = [[0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1], [0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0]];
var KUBUS8_X = 238, KUBUS8_Y = 166, KUBUS8_S = 25, KUBUS8_D = 12;
function blokje(x, y, s, d, vul) {
  return <g>{Poly([[x, y], [x + s, y], [x + s, y + s], [x, y + s]], vul)}{Poly([[x, y], [x + d, y - d], [x + s + d, y - d], [x + s, y]], vul)}{Poly([[x + s, y], [x + s + d, y - d], [x + s + d, y + s - d], [x + s, y + s]], vul)}</g>;
}
FIG.vergroten = { h: 240, label: "Boven twee gelijkvormige rechthoekige driehoeken: zijden 3, 4, 5 en zijden 6, 8, 10, factor 2. Onder: een vierkantje wordt met factor 2 een vierkant van 4 vakjes, en een kubusje wordt met factor 2 een kubus van 8 blokjes.",
  onder: "Factor 2: lengtes × 2, oppervlakte × 2² = 4, inhoud × 2³ = 8.",
  teken: function() { return (
    <g>
      {Poly([[20, 100], [60, 100], [20, 70]], PL, P)}{T(40, 114, "4", P)}{T(12, 85, "3", P, "end")}{T(48, 78, "5", P, "start")}
      {Pijl(76, 85, 100, 85)}
      {Poly([[115, 100], [195, 100], [115, 40]], GL, G)}{T(155, 114, "8", G)}{T(107, 70, "6", G, "end")}{T(162, 62, "10", G, "start")}
      {T(262, 70, "× 2", LIJN, "middle", { fs: 20, fw: 800 })}
      {Poly([[20, 175], [50, 175], [50, 205], [20, 205]], PL, P)}{T(35, 222, "1", P)}
      {Pijl(58, 190, 80, 190)}
      {Poly([[90, 145], [150, 145], [150, 205], [90, 205]], GL, G)}{L(120, 145, 120, 205, G)}{L(90, 175, 150, 175, G)}{T(120, 222, "4", G)}
      {blokje(176, 180, 25, 12, PL)}{T(190, 222, "1", P)}
      {Pijl(212, 190, 228, 190)}
      {KUBUS8.map(function(k, i) { return <g key={"k" + i}>{blokje(KUBUS8_X + k[0] * KUBUS8_S + k[2] * KUBUS8_D, KUBUS8_Y - k[1] * KUBUS8_S - k[2] * KUBUS8_D, KUBUS8_S, KUBUS8_D, GL)}</g>; })}
      {T(268, 222, "8", G)}
    </g>
  ); } };

// ── Statistiek en kans (plan ST, fase S3) ────────────────────────
// Vaste voorbeelden bij de theorie per groep; noemt de tekst een voorbeeld, dan dezelfde getallen.
var ROOD = A.error;
function stVak(x, y, b, h, vul, rand) { return <rect x={x} y={y} width={b} height={h} rx={6} fill={vul || "none"} stroke={rand || LIJN} strokeWidth={1.8} />; }

FIG.st_soorten = { h: 150, label: "Vier soorten gegevens. Telbaar: 0, 1, 2, 3. Meetbaar: 152,5 cm. Geen volgorde: rood, blauw. Met volgorde: S, M, L.",
  onder: "Getallen tel of meet je; categorieën zijn namen, met of zonder vaste volgorde.",
  teken: function() { return (
    <g>
      {stVak(6, 6, 150, 64, PL, P)}{T(81, 26, "telbaar", P)}{T(81, 52, "0, 1, 2, 3")}
      {stVak(164, 6, 150, 64, PL, P)}{T(239, 26, "meetbaar", P)}{T(239, 52, "152,5 cm")}
      {stVak(6, 80, 150, 64, GL, G)}{T(81, 100, "geen volgorde", G)}{T(81, 126, "rood, blauw")}
      {stVak(164, 80, 150, 64, GL, G)}{T(239, 100, "met volgorde", G)}{T(239, 126, "S < M < L")}
    </g>
  ); } };

// Twee staafdiagrammen met dezelfde getallen (40 en 44); links begint de as bij 0, rechts bij 38
function staafje(x0, v, lo, hi, kleur) { var y = 140 - (v - lo) / (hi - lo) * 100; return <g><rect x={x0} y={y} width={34} height={140 - y} fill={kleur === P ? PL : GL} stroke={kleur} strokeWidth={2} />{T(x0 + 17, y - 12, String(v), kleur)}</g>; }
FIG.st_as = { h: 172, label: "Twee staafdiagrammen met staven van 40 en 44. Links begint de as bij 0: de staven zijn bijna even hoog. Rechts begint de as bij 38: de tweede staaf lijkt drie keer zo hoog.",
  onder: "Zelfde getallen, andere as: rechts lijkt het verschil veel groter.",
  teken: function() { return (
    <g>
      {L(40, 30, 40, 140)}{L(40, 140, 150, 140)}{T(32, 140, "0", LIJN, "end")}{T(32, 40, "50", LIJN, "end")}
      {staafje(56, 40, 0, 50, P)}{staafje(104, 44, 0, 50, P)}
      {L(206, 30, 206, 140)}{L(206, 140, 316, 140)}{T(198, 140, "38", LIJN, "end")}{T(198, 40, "44", LIJN, "end")}
      {staafje(222, 40, 38, 44, G)}{staafje(270, 44, 38, 44, G)}
      {T(95, 160, "as vanaf 0", P)}{T(261, 160, "as vanaf 38", G)}
    </g>
  ); } };

// Getallenlijn 0..20 met de punten 2, 3, 4, 4, 5, 6, 18: de mediaan (4) en het gemiddelde (6)
var UIT = [2, 3, 4, 4, 5, 6, 18];
function ux(v) { return 20 + v * 14; }
FIG.st_uitschieter = { h: 150, label: "Getallenlijn van 0 tot 20 met de punten 2, 3, 4, 4, 5, 6 en 18. De mediaan is 4. Het gemiddelde is 6: de uitschieter 18 trekt het naar rechts.",
  onder: "Eén uitschieter (18) trekt het gemiddelde naar 6; de mediaan blijft 4.",
  teken: function() { return (
    <g>
      {L(ux(0), 112, ux(20), 112)}
      {[0, 5, 10, 15, 20].map(function(v) { return <g key={"t" + v}>{L(ux(v), 106, ux(v), 118)}{T(ux(v), 136, String(v))}</g>; })}
      {UIT.map(function(v, i) { var dubbel = i > 0 && UIT[i - 1] === v; return <circle key={"p" + i} cx={ux(v)} cy={dubbel ? 78 : 94} r={7} fill={v === 18 ? ROOD : LIJN} />; })}
      {L(ux(4), 34, ux(4), 104, G, true)}{T(ux(4), 22, "mediaan 4", G)}
      {L(ux(6), 58, ux(6), 104, P, true)}{T(ux(6) + 6, 48, "gemiddelde 6", P, "start")}
      {T(ux(18), 70, "uitschieter", ROOD)}
    </g>
  ); } };

// Kwartielen bij 2, 5, 8, 11, 13, 17, 20 (de mediaan telt niet mee), met de boxplot eronder
var KW = [2, 5, 8, 11, 13, 17, 20];
function kx(i) { return 20 + i * 42; }
function bx(v) { return 20 + v * 14; }
FIG.st_kwartielen = { h: 214, label: "De rij 2, 5, 8, 11, 13, 17, 20. De mediaan is 11. Onderste helft 2, 5, 8 met Q1 = 5; bovenste helft 13, 17, 20 met Q3 = 17. Daaronder de boxplot: snor van 2 tot 5, doos van 5 tot 17 met de streep bij 11, snor van 17 tot 20.",
  onder: "Mediaan 11; Q1 = 5 en Q3 = 17 zijn de middens van de helften. Kwartielafstand 17 − 5 = 12.",
  teken: function() { return (
    <g>
      {KW.map(function(v, i) { var kleur = i === 3 ? G : (i === 1 || i === 5) ? P : LIJN; return <g key={"k" + i}>{stVak(kx(i), 8, 38, 36, i === 3 ? GL : (i === 1 || i === 5) ? PL : "none", kleur)}{T(kx(i) + 19, 27, String(v), kleur)}</g>; })}
      {L(kx(0), 54, kx(2) + 38, 54, HULP)}{L(kx(4), 54, kx(6) + 38, 54, HULP)}
      {T(kx(1) + 19, 74, "Q1 = 5", P)}{T(kx(3) + 19, 74, "mediaan", G)}{T(kx(5) + 19, 74, "Q3 = 17", P)}
      <g>
        {L(bx(2), 120, bx(5), 120)}{L(bx(17), 120, bx(20), 120)}{L(bx(2), 110, bx(2), 130)}{L(bx(20), 110, bx(20), 130)}
        <rect x={bx(5)} y={100} width={bx(17) - bx(5)} height={40} fill={PL} stroke={P} strokeWidth={2.2} />
        {L(bx(11), 100, bx(11), 140, G, false, 3.4)}
      </g>
      {L(bx(0), 168, bx(20), 168)}
      {[0, 5, 10, 15, 20].map(function(v) { return <g key={"a" + v}>{L(bx(v), 162, bx(v), 174)}{T(bx(v), 194, String(v))}</g>; })}
    </g>
  ); } };

// Zak met 3 rode en 5 blauwe knikkers
var ZAK = [[60, 42, 1], [92, 36, 0], [122, 48, 0], [50, 74, 0], [82, 70, 1], [114, 80, 0], [66, 104, 0], [100, 108, 1]];
FIG.st_zak = { h: 140, label: "Een zak met 3 rode en 5 blauwe knikkers. Kans op rood: 3 gunstige van de 8 mogelijke, dus 3/8.",
  onder: "Kans = gunstig : mogelijk = 3 : 8 = 3/8.",
  teken: function() { return (
    <g>
      <ellipse cx={86} cy={74} rx={66} ry={60} fill="none" stroke={LIJN} strokeWidth={2.2} />
      {ZAK.map(function(k, i) { return <circle key={"z" + i} cx={k[0]} cy={k[1]} r={12} fill={k[2] ? ROOD : P} />; })}
      {T(176, 30, "kans op rood", LIJN, "start")}
      {T(176, 60, "gunstig: 3", ROOD, "start")}{T(176, 88, "mogelijk: 8", P, "start")}
      {T(176, 120, "= 3/8", LIJN, "start", { fs: 22, fw: 800 })}
    </g>
  ); } };

// Rooster van twee dobbelstenen, de vakjes met som 7 gemarkeerd
FIG.st_rooster = { h: 200, label: "Rooster van twee dobbelstenen: 6 bij 6 vakjes met de som van de ogen. De 6 vakjes met som 7 zijn gemarkeerd.",
  onder: "36 vakjes; som 7 komt 6 keer voor, dus de kans is 6/36 = 1/6.",
  teken: function() {
    var out = [], x0 = 9, kk = 38, kb = 44, rh = 28;
    out.push(<g key="k">{T(x0 + kk / 2, rh / 2, "+", P)}</g>);
    for (var i = 1; i <= 6; i++) {
      out.push(<g key={"a" + i}>{T(x0 + kk + kb * (i - 0.5), rh / 2, String(i), P)}{T(x0 + kk / 2, rh * (i + 0.5), String(i), P)}</g>);
      for (var j = 1; j <= 6; j++) {
        var zeven = i + j === 7;
        out.push(<g key={"c" + i + "_" + j}><rect x={x0 + kk + kb * (j - 1)} y={rh * i} width={kb} height={rh} fill={zeven ? GL : "none"} stroke={HULP} strokeWidth={1} />{T(x0 + kk + kb * (j - 0.5), rh * (i + 0.5), String(i + j), zeven ? G : LIJN)}</g>);
      }
    }
    return <g>{out}{L(x0 + kk, 0, x0 + kk, 196)}{L(x0, rh, x0 + kk + 6 * kb, rh)}</g>;
  } };

// Kansboom: 2 rode en 3 blauwe knikkers, twee keer pakken zonder terugleggen; de route rood, rood gemarkeerd
FIG.st_kansboom = { h: 176, label: "Kansboom zonder terugleggen bij 2 rode en 3 blauwe knikkers. Eerste keer: rood 2/5, blauw 3/5. Na rood: rood 1/4, blauw 3/4. Na blauw: rood 2/4, blauw 2/4. De route rood, rood is gemarkeerd.",
  onder: "Rood en dan rood: 2/5 · 1/4 = 2/20 = 1/10.",
  teken: function() { return (
    <g>
      <circle cx={14} cy={88} r={5} fill={LIJN} />
      {L(18, 84, 100, 42, ROOD, false, 3.4)}{L(18, 92, 100, 134, HULP)}
      {T(52, 50, "2/5", ROOD)}{T(52, 128, "3/5", LIJN)}
      {T(124, 42, "rood", ROOD)}{T(124, 134, "blauw", P)}
      {L(150, 38, 236, 16, ROOD, false, 3.4)}{L(150, 46, 236, 68, HULP)}{L(158, 130, 236, 108, HULP)}{L(158, 138, 236, 160, HULP)}
      {T(190, 14, "1/4", ROOD)}{T(190, 70, "3/4", LIJN)}{T(196, 106, "2/4", LIJN)}{T(196, 162, "2/4", LIJN)}
      {T(268, 16, "rood", ROOD)}{T(268, 68, "blauw", P)}{T(268, 108, "rood", ROOD)}{T(268, 160, "blauw", P)}
    </g>
  ); } };

export var FIGUUR_IDS = Object.keys(FIG);

// Theorietekst opsplitsen bij de merktekens: een regel "[fig:<id>]" wordt een tekening.
// Uitkomst: [{ tekst }, { figuur }, ...]; een onbekende id wordt weggelaten (nooit als tekst getoond).
var MERK_RE = /\n?\[fig:([a-z0-9_]*)\]\n?/g;
export function splitsTheorie(tekst) {
  var delen = [], vanaf = 0, m;
  if (typeof tekst !== "string") return delen;
  MERK_RE.lastIndex = 0;
  while ((m = MERK_RE.exec(tekst)) !== null) {
    if (m.index > vanaf) delen.push({ tekst: tekst.slice(vanaf, m.index) });
    if (bekendeFiguur(m[1])) delen.push({ figuur: m[1] });
    vanaf = MERK_RE.lastIndex;
  }
  if (vanaf < tekst.length) delen.push({ tekst: tekst.slice(vanaf) });
  return delen;
}
export function bekendeFiguur(id) { return Object.prototype.hasOwnProperty.call(FIG, id); }

export default function TheorieFiguur({ id }) {
  if (!bekendeFiguur(id)) return null;
  var f = FIG[id];
  return (
    <figure style={{ margin: "10px 0", textAlign: "center" }}>
      <svg viewBox={"0 0 320 " + f.h} role="img" aria-label={f.label} style={{ width: "100%", maxWidth: 320, height: "auto", display: "block", margin: "0 auto", fontFamily: "inherit" }}>
        {f.teken()}
      </svg>
      <figcaption style={{ fontSize: 13, lineHeight: 1.4, color: A.textMid, marginTop: 6 }}>{f.onder}</figcaption>
    </figure>
  );
}

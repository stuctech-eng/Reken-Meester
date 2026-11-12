// Kaartproef T2a (plan TO fase T2, v1.1, §3; aanpassing na het tussenrapport: zoom en slepen): losse pagina, geen deel van de app.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.

import { maakDoelen, beslis, isKlein, STRAAL } from "./tikregel.js";

var VERSIE = "T2a-proef-3";
var KAARTEN = [
  { id: "proef-nl", titel: "Nederland" },
  { id: "proef-europa", titel: "Kleine staten" },
  { id: "proef-caribisch-groot", titel: "Grote Antillen" },
  { id: "proef-caribisch-klein", titel: "Kleine Antillen", sleepUitleg: true },   // te hoog voor het scherm: afgesneden, verticaal slepen
  { id: "proef-wereld", titel: "Wereld" }
];
export var ZOOMSTAPPEN = [1, 2, 4, 8];
export var SLEEPGRENS = 10;   // CSS-pixels: tot en met 10 is het een tik, daarboven slepen
var NS = "http://www.w3.org/2000/svg";
var KLEUR = { zee: "#dbeafe", land: "#e5e7eb", landRand: "#9ca3af", doel: "#fef3c7", doelRand: "#92400e", gekozen: "#c026d3", opdracht: "#dc2626", lijn: "#1d4ed8", punt: "#1a1d3a" };

var staat = { kaart: null, data: {}, laag: null, stand: "vrij", gekozen: null, doelen: [], opdracht: null, uitslag: {}, log: [], svg: null,
  zoom: 1, ox: 0, oy: 0, aanraking: null, maxH: 0 };

function el(naam, attr) { var e = document.createElementNS(NS, naam); for (var k in attr) e.setAttribute(k, attr[k]); return e; }
function $(id) { return document.getElementById(id); }

function laadKaart(id) {
  if (staat.data[id]) return Promise.resolve(staat.data[id]);
  return import("./data/" + id + ".js").then(function(m) { staat.data[id] = m.default; return m.default; });
}

// Zichtbaar deel van de kaart (viewBox-eenheden) en de schaal in CSS-pixels per eenheid.
// De breedte van het beeld hangt alleen van de zoom af; de hoogte is hoogstens de vrije schermhoogte (staat.maxH).
function venster() {
  var k = staat.kaart, w = k.breedte / staat.zoom, h = k.hoogte / staat.zoom, b = $("kaartvak").clientWidth;
  if (staat.maxH > 0 && b > 0) h = Math.min(h, staat.maxH * w / b);
  return { x: staat.ox, y: staat.oy, w: w, h: h };
}
// Vrije hoogte voor de kaart: van de bovenkant van het kaartvak tot de onderste balk, met 8 px ruimte
function meetRuimte() { staat.maxH = Math.max(120, Math.floor(window.innerHeight - $("kaartvak").offsetTop - $("balk").offsetHeight - 8)); }
function schaal() { return staat.svg ? staat.svg.getBoundingClientRect().width / venster().w : 1; }
function begrens() {
  var k = staat.kaart, v = venster();
  staat.ox = Math.min(Math.max(staat.ox, 0), k.breedte - v.w);
  staat.oy = Math.min(Math.max(staat.oy, 0), k.hoogte - v.h);
}
function zetZoom(z, cx, cy) {
  var v = venster();
  if (cx === undefined) { cx = v.x + v.w / 2; cy = v.y + v.h / 2; }
  staat.zoom = z;
  var n = venster();
  staat.ox = cx - n.w / 2; staat.oy = cy - n.h / 2;
  begrens(); teken();
}

function optie(lijst, waarde, tekst) { var o = document.createElement("option"); o.value = waarde; o.textContent = tekst; lijst.appendChild(o); }
function knoppen() {
  var kv = $("kaartkeuze"); kv.innerHTML = "";
  KAARTEN.forEach(function(k) { optie(kv, k.id, k.titel); });
  if (staat.kaart) kv.value = staat.kaart.id;
  var lv = $("laagkeuze"); lv.innerHTML = "";
  if (staat.kaart) staat.kaart.lagen.forEach(function(l) { optie(lv, l.id, l.titel); });
  if (staat.laag) lv.value = staat.laag.id;
  lv.style.display = staat.kaart && staat.kaart.lagen.length > 1 ? "" : "none";
  var sb = $("stand"); sb.className = staat.stand === "opdracht" ? "aan" : ""; sb.setAttribute("aria-pressed", staat.stand === "opdracht" ? "true" : "false");
}
function zoomKnoppen() {
  var i = ZOOMSTAPPEN.indexOf(staat.zoom);
  $("zoomin").disabled = i === ZOOMSTAPPEN.length - 1;
  $("zoomuit").disabled = i === 0;
  $("heel").disabled = staat.zoom === 1;
  $("zoomwaarde").textContent = "x" + staat.zoom;
}

function kiesKaart(id) {
  return laadKaart(id).then(function(k) { staat.kaart = k; staat.zoom = 1; staat.ox = 0; staat.oy = 0; return kiesLaag(k.lagen[0].id); });
}
function kiesLaag(id) {
  staat.laag = staat.kaart.lagen.filter(function(l) { return l.id === id; })[0];
  staat.doelen = maakDoelen(staat.laag);
  staat.gekozen = null;
  if (staat.stand === "opdracht") startOpdracht(); else staat.opdracht = null;
  knoppen(); toonGekozen(); toonOpdracht(); teken();
}

function teken() {
  meetRuimte(); begrens();
  var k = staat.kaart, vak = $("kaartvak"), v = venster();
  vak.innerHTML = "";
  var svg = el("svg", { viewBox: v.x + " " + v.y + " " + v.w + " " + v.h, role: "img", "aria-label": "Kaart " + k.titel + ", zoom " + staat.zoom });
  svg.appendChild(el("rect", { x: 0, y: 0, width: k.breedte, height: k.hoogte, fill: KLEUR.zee }));
  vak.appendChild(svg); staat.svg = svg;
  var s = schaal(), px = 1 / s;
  if (!(s > 0) || !isFinite(px)) { requestAnimationFrame(teken); return; }
  var groep = el("g", {}); svg.appendChild(groep);
  k.achtergrond.forEach(function(a) { groep.appendChild(el("path", { d: a.d, fill: KLEUR.land, stroke: KLEUR.landRand, "stroke-width": 0.8 * px, "fill-rule": "evenodd" })); });
  k.lagen.forEach(function(l) {
    if (l === staat.laag || l.soort !== "vlak") return;
    l.items.forEach(function(it) { groep.appendChild(el("path", { d: it.d, fill: KLEUR.land, stroke: KLEUR.landRand, "stroke-width": 0.8 * px, "fill-rule": "evenodd" })); });
  });
  var opdr = staat.opdracht && staat.opdracht.huidig;
  staat.doelen.forEach(function(d) {
    var gek = staat.gekozen && staat.gekozen.id === d.id, opd = opdr && opdr.id === d.id;
    var kleur = gek ? KLEUR.gekozen : (opd ? KLEUR.opdracht : null);
    var item = staat.laag.items.filter(function(i) { return i.id === d.id; })[0];
    if (d.soort === "vlak") {
      if (d.ringen.length) groep.appendChild(el("path", { d: item.d, fill: kleur || KLEUR.doel, "fill-opacity": kleur ? 0.85 : 1, stroke: KLEUR.doelRand, "stroke-width": 1.2 * px, "fill-rule": "evenodd" }));
      if (isKlein(d, s)) groep.appendChild(el("circle", { cx: d.mx, cy: d.my, r: STRAAL * px, fill: kleur || "none", "fill-opacity": kleur ? 0.35 : 0, stroke: kleur || KLEUR.doelRand, "stroke-width": 1.5 * px, "stroke-dasharray": (4 * px) + " " + (3 * px) }));
    } else if (d.soort === "lijn") {
      groep.appendChild(el("path", { d: item.d, fill: "none", stroke: kleur || KLEUR.lijn, "stroke-width": (kleur ? 5 : 3) * px, "stroke-linecap": "round", "stroke-linejoin": "round" }));
    } else {
      groep.appendChild(el("circle", { cx: d.x, cy: d.y, r: (kleur ? 7 : 5) * px, fill: kleur || KLEUR.punt, stroke: "#fff", "stroke-width": 1.5 * px }));
    }
  });
  svg.addEventListener("pointerdown", neer);
  svg.addEventListener("pointermove", beweeg);
  svg.addEventListener("pointerup", op);
  svg.addEventListener("pointercancel", function(e) { if (staat.aanraking && e.pointerId === staat.aanraking.id) staat.aanraking = null; });
  zoomKnoppen();
  $("info").textContent = "Kaartbreedte " + Math.round(svg.getBoundingClientRect().width) + " CSS-px, zoom x" + staat.zoom + ", schaal " + s.toFixed(3) + " px per eenheid, pixelratio " + window.devicePixelRatio + " (alleen ter informatie).";
}

// ── aanraking: één vinger; tot en met 10 CSS-px verplaatsing is een tik, daarboven slepen ──
function neer(e) {
  if (staat.aanraking) return;                       // een tweede vinger wordt genegeerd
  staat.aanraking = { id: e.pointerId, x: e.clientX, y: e.clientY, ox: staat.ox, oy: staat.oy, slepen: false };
  if (staat.svg.setPointerCapture) { try { staat.svg.setPointerCapture(e.pointerId); } catch (x) { /* niet nodig voor de werking */ } }
}
function beweeg(e) {
  var a = staat.aanraking;
  if (!a || e.pointerId !== a.id) return;
  var dx = e.clientX - a.x, dy = e.clientY - a.y;
  if (!a.slepen && Math.sqrt(dx * dx + dy * dy) > SLEEPGRENS) a.slepen = true;
  if (a.slepen) {                                   // begrens() houdt het beeld binnen de kaart
    var s = schaal();
    staat.ox = a.ox - dx / s; staat.oy = a.oy - dy / s; begrens();
    var v = venster(); staat.svg.setAttribute("viewBox", v.x + " " + v.y + " " + v.w + " " + v.h);
  }
}
function op(e) {
  var a = staat.aanraking;
  if (!a || e.pointerId !== a.id) return;
  staat.aanraking = null;
  var dx = e.clientX - a.x, dy = e.clientY - a.y;
  if (a.slepen || Math.sqrt(dx * dx + dy * dy) > SLEEPGRENS) { teken(); return; }   // slepen: nooit een keuze
  var r = staat.svg.getBoundingClientRect();
  tik(e.clientX - r.left, e.clientY - r.top);
}

// Een tik op (x, y) in CSS-pixels binnen het beeld; de tikregel rekent op de hele kaart bij deze schaal
function tik(x, y) {
  var s = schaal(), gx = staat.ox * s + x, gy = staat.oy * s + y, b = beslis(staat.doelen, s, gx, gy);
  var regel = { t: new Date().toISOString().slice(11, 19), kaart: staat.kaart.id, laag: staat.laag.id, x: Math.round(x), y: Math.round(y), zoom: staat.zoom,
    uitkomst: b.uitkomst === "gekozen" ? b.doel.id + " (" + b.regel + ")" : b.uitkomst,
    kandidaten: b.kandidaten.map(function(c) { return c.doel.id + ":" + c.afstand.toFixed(1); }).join(" ") };
  staat.log.push(regel); if (staat.log.length > 50) staat.log.shift();
  toonDebug();
  if (b.uitkomst === "geen") { staat.gekozen = null; $("gekozen").textContent = "Tik op een gebied."; $("bevestig").disabled = true; teken(); return; }
  if (b.uitkomst === "twijfel") { if (staat.opdracht) staat.opdracht.keuzelijst = true; openLijst(b.kandidaten.map(function(c) { return c.doel; }), "Welke bedoel je?"); return; }
  staat.gekozen = b.doel; toonGekozen(); teken();
}

function toonGekozen() {
  $("gekozen").textContent = staat.gekozen ? "Gekozen: " + staat.gekozen.naam : "Tik op de kaart.";
  $("bevestig").disabled = !staat.gekozen;
}

function openLijst(doelen, kop) {
  var v = $("lijstvel"); v.innerHTML = "";
  var h = document.createElement("div"); h.style.fontWeight = "800"; h.style.marginBottom = "8px"; h.textContent = kop; v.appendChild(h);
  doelen.forEach(function(d) {
    var b = document.createElement("button"); b.textContent = d.naam;
    b.onclick = function() { sluitLijst(); staat.gekozen = d; toonGekozen(); teken(); }; v.appendChild(b);
  });
  var a = document.createElement("button"); a.textContent = "Annuleren"; a.onclick = sluitLijst; v.appendChild(a);
  $("lijst").style.display = "flex";
}
function sluitLijst() { $("lijst").style.display = "none"; }

// ── opdracht: alle doelen van de laag, in willekeurige volgorde; het doel is gemarkeerd ──
function sleutel() { return staat.kaart.id + "/" + staat.laag.id; }
function startOpdracht() {
  var rij = staat.doelen.slice();
  for (var i = rij.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = rij[i]; rij[i] = rij[j]; rij[j] = t; }
  staat.opdracht = { rij: rij, nr: 0, huidig: rij[0], keuzelijst: false };
  staat.uitslag[sleutel()] = { doelen: rij.length, gedaan: 0, inEenKeer: 0, metLijst: 0, fout: [], zoom: {} };
  staat.gekozen = null; toonOpdracht();
}
function toonOpdracht() {
  var o = staat.opdracht, uitleg = !!(o && o.huidig && staat.kaart && KAARTEN.filter(function(k) { return k.id === staat.kaart.id; })[0].sleepUitleg);
  $("opdracht").style.height = uitleg ? "66px" : "";   // drie regels alleen bij de Kleine Antillen; elders blijft het 44 px
  $("opdracht").textContent = o ? (o.huidig ? "Opdracht " + (o.nr + 1) + " van " + o.rij.length + ": tik " + o.huidig.naam + " aan (rood gemarkeerd)." + (uitleg ? " Staat het rode doel buiten beeld? Sleep de kaart omhoog of omlaag." : "") : "Klaar met deze laag. Kopieer de uitslag (knop Uitslag) of kies een andere laag.") : "Vrij tikken: tik op de kaart. Kies Opdracht voor de test.";
}
function bevestig() {
  if (!staat.gekozen) return;
  var o = staat.opdracht;
  if (o && o.huidig) {
    var u = staat.uitslag[sleutel()]; u.gedaan++;
    var goed = staat.gekozen.id === o.huidig.id;
    if (goed && !o.keuzelijst) u.inEenKeer++;
    if (o.keuzelijst) u.metLijst++;
    if (!goed) u.fout.push(o.huidig.id + " -> " + staat.gekozen.id);
    u.zoom[o.huidig.id] = staat.zoom;
    staat.log.push({ t: new Date().toISOString().slice(11, 19), kaart: staat.kaart.id, laag: staat.laag.id, x: "", y: "", zoom: staat.zoom, uitkomst: "bevestigd " + staat.gekozen.id + (goed ? " (goed)" : " (FOUT, gevraagd " + o.huidig.id + ")"), kandidaten: "" });
    o.nr++; o.huidig = o.rij[o.nr] || null; o.keuzelijst = false;
    toonOpdracht();
  }
  staat.gekozen = null; toonGekozen(); teken(); toonDebug();
}

function uitslagTekst() {
  var r = ["Kaartproef " + VERSIE, "Scherm " + window.innerWidth + " CSS-px, pixelratio " + window.devicePixelRatio, navigator.userAgent, ""];
  Object.keys(staat.uitslag).forEach(function(k) {
    var u = staat.uitslag[k], zs = {};
    Object.keys(u.zoom).forEach(function(d) { zs["x" + u.zoom[d]] = (zs["x" + u.zoom[d]] || 0) + 1; });
    r.push(k + ": " + u.gedaan + " van " + u.doelen + " gedaan; in één keer goed " + u.inEenKeer + " (" + (u.gedaan ? Math.round(100 * u.inEenKeer / u.gedaan) : 0) + "%); met keuzelijst " + u.metLijst + "; fout " + u.fout.length + (u.fout.length ? " [" + u.fout.join(", ") + "]" : "") + "; zoom bij bevestigen " + JSON.stringify(zs));
  });
  r.push("", "Laatste tikken:");
  staat.log.forEach(function(l) { r.push(l.t + " " + l.kaart + "/" + l.laag + " x" + l.zoom + " (" + l.x + "," + l.y + ") " + l.uitkomst + (l.kandidaten ? " | " + l.kandidaten : "")); });
  return r.join("\n");
}
function toonDebug() { $("debug").textContent = uitslagTekst(); }

$("bevestig").onclick = bevestig;
$("anders").onclick = function() { openLijst(staat.doelen.slice().sort(function(a, b) { return a.naam < b.naam ? -1 : 1; }), "Kies uit de lijst"); };
$("lijst").onclick = function(e) { if (e.target.id === "lijst") sluitLijst(); };
$("kaartkeuze").onchange = function() { kiesKaart(this.value); };
$("laagkeuze").onchange = function() { kiesLaag(this.value); };
$("stand").onclick = function() { staat.stand = staat.stand === "opdracht" ? "vrij" : "opdracht"; if (staat.stand === "opdracht") startOpdracht(); else { staat.opdracht = null; toonOpdracht(); } knoppen(); teken(); };
$("meer").onclick = function() { toonDebug(); $("paneel").style.display = "flex"; };
$("sluit").onclick = function() { $("paneel").style.display = "none"; };
$("paneel").onclick = function(e) { if (e.target.id === "paneel") $("paneel").style.display = "none"; };
$("toondebug").onclick = function() { var d = $("debug"); d.style.display = d.style.display === "block" ? "none" : "block"; toonDebug(); };
$("zoomin").onclick = function() { var i = ZOOMSTAPPEN.indexOf(staat.zoom); if (i < ZOOMSTAPPEN.length - 1) zetZoom(ZOOMSTAPPEN[i + 1]); };
$("zoomuit").onclick = function() { var i = ZOOMSTAPPEN.indexOf(staat.zoom); if (i > 0) zetZoom(ZOOMSTAPPEN[i - 1]); };
$("heel").onclick = function() { zetZoom(1); };
$("kopieer").onclick = function() {
  var t = uitslagTekst();
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function() { $("kopieer").textContent = "Gekopieerd"; }, function() { $("debug").style.display = "block"; toonDebug(); });
  else { $("debug").style.display = "block"; toonDebug(); }
};
window.addEventListener("resize", function() { if (staat.kaart) teken(); });

// Testhaak (alleen voor de Chromium-tests): dezelfde tikregel als de pagina gebruikt
window.__TOPO = {
  kiesKaart: kiesKaart, kiesLaag: kiesLaag, schaal: schaal, venster: venster,
  zet: function(z, cx, cy) { zetZoom(z, cx, cy); return venster(); },
  rasterBeslis: function(stap) {
    var r = staat.svg.getBoundingClientRect(), s = schaal(), uit = [], w = Math.floor(r.width / stap), h = Math.floor(r.height / stap);
    for (var j = 0; j <= h; j++) for (var i = 0; i <= w; i++) { var b = beslis(staat.doelen, s, staat.ox * s + i * stap, staat.oy * s + j * stap); uit.push(b.uitkomst === "gekozen" ? b.doel.id : (b.uitkomst === "twijfel" ? "?" : "")); }
    return { w: w + 1, h: h + 1, stap: stap, schaal: s, breedte: r.width, hoogte: r.height, ox: staat.ox, oy: staat.oy, zoom: staat.zoom, uit: uit };
  },
  tik: tik, staat: staat
};

knoppen();
kiesKaart(KAARTEN[0].id);

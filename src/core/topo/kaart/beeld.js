// Kaartbeeld voor de app (plan T3 par. 3.1): zuivere rekenfuncties voor het tekenen, zonder DOM.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// - ringDelen: een pad (d) gesplitst in zijn ringen, elk met de oppervlakte in viewBox-eenheden (eenmalig per item);
// - randPad: het pad voor de rand, alleen met de ringen die op het scherm minstens RAND_MIN_PX2 groot zijn. Een ring
//   zonder oppervlakte (de restjes van de samenvoeging van gemeenten, 6.3) tekende anders een stip (T3a: de spikkels).
//   Het vlak zelf tekent altijd alle ringen; de geometrie en de tikregel veranderen niet;
// - zoomstappen en het begrenzen van het beeld, dezelfde regels als de proef (public/topoproef/topoproef.js).

import { leesPad } from "./tikregel.js";

export var RAND_MIN_PX2 = 1;
export var ZOOMSTAPPEN = [1, 2, 4, 8, 16, 32];
export var SLEEPGRENS = 10;   // CSS-pixels: tot en met 10 is het een tik, daarboven slepen

function oppervlakte(r) {
  var s = 0;
  for (var i = 0; i < r.length - 1; i++) s += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1];
  return Math.abs(s / 2);
}

export function ringDelen(d) {
  var delen = d.split("M").filter(function(x) { return x !== ""; }).map(function(x) { return "M" + x; });
  return delen.map(function(dd) {
    var r = leesPad(dd)[0];
    return { d: dd, opp: r ? oppervlakte(r) : 0 };
  });
}

export function randPad(delen, schaal) {
  var min = RAND_MIN_PX2 / (schaal * schaal), uit = "";
  for (var i = 0; i < delen.length; i++) if (delen[i].opp >= min) uit += delen[i].d;
  return uit;
}

export function volgendeStap(z) { for (var i = 0; i < ZOOMSTAPPEN.length; i++) if (ZOOMSTAPPEN[i] > z * 1.0001) return ZOOMSTAPPEN[i]; return null; }
export function vorigeStap(z) { for (var i = ZOOMSTAPPEN.length - 1; i >= 0; i--) if (ZOOMSTAPPEN[i] < z / 1.0001) return ZOOMSTAPPEN[i]; return null; }
export function dichtsteStap(z) {
  var beste = ZOOMSTAPPEN[0];
  ZOOMSTAPPEN.forEach(function(s) { if (Math.abs(Math.log(s / z)) < Math.abs(Math.log(beste / z))) beste = s; });
  return beste;
}

// Het zichtbare deel (viewBox-eenheden) bij zoom z: breedte kaartbreedte / z; ingezoomd gebruikt het beeld de vrije hoogte maxH
// (CSS-pixels) bij een beeldbreedte van b CSS-pixels, tot de hele kaarthoogte (zoals de proef)
export function venster(kaart, z, ox, oy, b, maxH) {
  var w = kaart.breedte / z, h = kaart.hoogte / z;
  if (maxH > 0 && b > 0) h = z > 1 ? Math.min(kaart.hoogte, maxH * w / b) : Math.min(h, maxH * w / b);
  return { x: ox, y: oy, w: w, h: h };
}
export function begrens(kaart, v) {
  return { x: Math.min(Math.max(v.x, 0), kaart.breedte - v.w), y: Math.min(Math.max(v.y, 0), kaart.hoogte - v.h), w: v.w, h: v.h };
}

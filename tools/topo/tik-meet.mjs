// Tikbaarheid per doel per zoomstap (aanvulling T2a par. 1-3), geborgd in bouwplan T2b-2 fase 6.1, par. 6.
// Gebruik: node tik-meet.mjs <repo> <schermbreedte> <uit.json> [maxh] [kaart,kaart,...]
// Zonder kaartlijst: de vijf proefkaarten uit public/kaartproef/data.
// Beeld zoals op de pagina: kaartbreedte = scherm - 32 CSS-px, beeld = (breedte/zoom) x (hoogte/zoom) eenheden, gecentreerd
// op het doel en binnen de kaart gehouden. Meetzones: r >= 22,71 goed; r < 21,29 fout; daartussen de exacte controle.
// Een meting in Chromium of Node vervangt de iPhone-controle niet (plan v2 par. 5.6).
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
import fs from "fs";
import path from "path";
import { pathToFileURL, fileURLToPath } from "url";
import { doelenVan, besluit, relevant, grootsteAfstand, klein, oppEff, inVlak, minAfst, R } from "./tik-onafhankelijk.mjs";

export var PROEFKAARTEN = ["proef-nl", "proef-europa", "proef-caribisch-groot", "proef-caribisch-klein", "proef-wereld"];
var Z = [1, 2, 4, 8];

function beeld(K, z, c, BREED, MAXH) {
  var w = (K.beeld || K.breedte) / z, h = MAXH ? Math.min(K.hoogte / z, MAXH * w / BREED) : K.hoogte / z;
  var x = c[0] - w / 2, y = c[1] - h / 2;
  x = Math.min(Math.max(x, 0), K.breedte - w); y = Math.min(Math.max(y, 0), K.hoogte - h);
  return { x: x, y: y, w: w, h: h, s: BREED / w };
}
// masker van het tikgebied van doel in het beeld, met stap (px); geeft r = de grootste afstand van een rasterpunt in het
// masker tot het dichtstbijzijnde rasterpunt erbuiten, in CSS-px. De echte straal ligt binnen r +/- een halve diagonaal
// (0,71 px bij stap 1; 1,42 px bij stap 2).
function meet(doelen, doel, b, stap) {
  var pw = b.w * b.s, ph = b.h * b.s, w = Math.floor(pw / stap) + 1, h = Math.floor(ph / stap) + 1;
  var x0 = b.x * b.s, y0 = b.y * b.s, rel = relevant(doelen, b.s, x0, y0, x0 + pw, y0 + ph);
  var m = new Uint8Array(w * h);
  for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) if (besluit(rel, b.s, x0 + i * stap, y0 + j * stap) === doel.id) m[j * w + i] = 1;
  return grootsteAfstand(m, w, h) * stap;
}
// exacte controle: een vrije cirkel met straal 22 binnen het tikgebied van het doel en binnen het beeld
function exact(doelen, doel, b) {
  var s = b.s, x0 = b.x * s, y0 = b.y * s, x1 = x0 + b.w * s, y1 = y0 + b.h * s, kandidaten = [];
  if (doel.soort === "punt") kandidaten = [[doel.p[0] * s, doel.p[1] * s]];
  else if (doel.soort === "vlak") { if (klein(doel, s) || doel.ir * s >= R) kandidaten = [[doel.m[0] * s, doel.m[1] * s]]; }
  else doel.rs.forEach(function(r) { for (var i = 1; i < r.length; i++) { var a = r[i - 1], c = r[i], n = Math.max(1, Math.ceil(Math.hypot(c[0] - a[0], c[1] - a[1]) * s / 2)); for (var t = 0; t <= n; t++) kandidaten.push([(a[0] + (c[0] - a[0]) * t / n) * s, (a[1] + (c[1] - a[1]) * t / n) * s]); } });
  var eigen = oppEff(doel, s);
  for (var ci = 0; ci < kandidaten.length; ci++) {
    var c = kandidaten[ci];
    if (c[0] - R < x0 || c[0] + R > x1 || c[1] - R < y0 || c[1] + R > y1) continue;
    var vrij = true;
    for (var di = 0; di < doelen.length; di++) {
      var d = doelen[di];
      if (d === doel) continue;
      var u = [c[0] / s, c[1] / s], raakt;
      if (d.soort === "punt") raakt = Math.hypot(d.p[0] * s - c[0], d.p[1] * s - c[1]) <= 2 * R;
      else if (d.soort === "lijn") raakt = minAfst(u, d.rs) * s <= 2 * R;
      else raakt = (d.rs.length && (inVlak(u, d.rs) || minAfst(u, d.rs) * s <= R)) || (klein(d, s) && Math.hypot(d.m[0] * s - c[0], d.m[1] * s - c[1]) <= 2 * R);
      if (!raakt) continue;
      // raakt: alleen goed als het doel overal in de cirkel wint met "ingesloten doel wint"
      if (doel.soort === "lijn" || !(eigen < oppEff(d, s) / 2)) { vrij = false; break; }
    }
    if (vrij) return true;
  }
  return false;
}
// kaarten: lijst van { naam, K } (K = de default export van een kaartbestand)
export function meetKaarten(kaarten, scherm, maxh) {
  var BREED = scherm - 32, MAXH = maxh || 0, uit = [], rang = { fout: 0, exact: 1, goed: 2 };
  kaarten.forEach(function(kaart) {
    var K = kaart.K;
    K.lagen.forEach(function(laag) {
      var doelen = doelenVan(laag);
      doelen.forEach(function(doel) {
        var middens = doel.soort === "punt" ? [doel.p] : doel.soort === "vlak" ? [doel.m] : doel.rs.flatMap(function(r) { return r.filter(function(q, i) { return i % Math.max(1, Math.floor(r.length / 12)) === 0; }); });
        var per = {};
        Z.forEach(function(z) {
          var beste = { r: -1, oordeel: "fout" };
          for (var mi = 0; mi < middens.length; mi++) {
            var b = beeld(K, z, middens[mi], BREED, MAXH);
            var r = meet(doelen, doel, b, 2), oordeel;
            if (r - 1.42 >= 22.71) oordeel = "goed";            // grof raster (stap 2): echte straal >= r - 1,42 >= 22,71
            else { r = meet(doelen, doel, b, 1); oordeel = r >= 22.71 ? "goed" : r < 21.29 ? "fout" : (exact(doelen, doel, b) ? "exact" : "fout"); }
            if (rang[oordeel] > rang[beste.oordeel] || (rang[oordeel] === rang[beste.oordeel] && r > beste.r)) beste = { r: +r.toFixed(2), oordeel: oordeel };
            if (beste.oordeel === "goed") break;
          }
          per["x" + z] = beste;
        });
        uit.push({ kaart: kaart.naam, laag: laag.id, id: doel.id, naam: doel.naam, per: per });
      });
    });
  });
  return uit;
}
export async function laadKaarten(repo, namen) {
  var uit = [];
  for (var i = 0; i < namen.length; i++) uit.push({ naam: namen[i], K: (await import(pathToFileURL(path.join(repo, "public/kaartproef/data", namen[i] + ".js")).href)).default });
  return uit;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  var REPO = process.argv[2], SCHERM = +process.argv[3], UIT = process.argv[4], MAXH = +(process.argv[5] || 0);
  var NAMEN = process.argv[6] ? process.argv[6].split(",") : PROEFKAARTEN;
  var res = meetKaarten(await laadKaarten(REPO, NAMEN), SCHERM, MAXH);
  fs.writeFileSync(UIT, JSON.stringify(res));
  console.log("klaar " + SCHERM + ": " + res.length + " doelen");
}

// Meetkunde in het vlak, gedeeld door de bouwscripts van Topografie Meester (alleen bouwomgeving, niet in de app).
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
// Verhuisd uit maak-proefkaarten.mjs (plan D6-3); de functies zijn ongewijzigd. Een ring is een lijst [x, y], gesloten
// (eerste punt = laatste punt). Even-oneven: een ring binnen een oneven aantal andere ringen is een gat.
export function oppRing(r) { var s = 0; for (var i = 0; i < r.length - 1; i++) s += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]; return s / 2; }
export function binnen(p, r) {
  var c = false;
  for (var i = 0, j = r.length - 1; i < r.length; j = i++) {
    var a = r[i], b = r[j];
    if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c;
  }
  return c;
}
export function oppervlak(ringen) {
  // even-oneven: een ring binnen een oneven aantal andere ringen telt negatief (gat)
  var s = 0;
  ringen.forEach(function(r, i) {
    var diepte = 0;
    ringen.forEach(function(q, j) { if (i !== j && binnen(r[0], q)) diepte++; });
    s += (diepte % 2 ? -1 : 1) * Math.abs(oppRing(r));
  });
  return Math.abs(s);
}
export function zwaartepuntGrootste(ringen) {
  var best = null, bo = -1;
  ringen.forEach(function(r) { var o = Math.abs(oppRing(r)); if (o > bo) { bo = o; best = r; } });
  var a = 0, cx = 0, cy = 0;
  for (var i = 0; i < best.length - 1; i++) {
    var f = best[i][0] * best[i + 1][1] - best[i + 1][0] * best[i][1];
    a += f; cx += (best[i][0] + best[i + 1][0]) * f; cy += (best[i][1] + best[i + 1][1]) * f;
  }
  return [cx / (3 * a), cy / (3 * a)];
}
// Pool van ontoegankelijkheid (zoals polylabel): het punt binnen het vlak (even-oneven) dat het verst van de rand ligt
export function binnenVlak(p, ringen) { var n = 0; ringen.forEach(function(r) { if (binnen(p, r)) n++; }); return n % 2 === 1; }
export function randAfstand(p, ringen) { var m = Infinity; ringen.forEach(function(r) { m = Math.min(m, afstandTotLijn(p, r)); }); return m; }
export function getekendeAfstand(p, ringen) { var d = randAfstand(p, ringen); return binnenVlak(p, ringen) ? d : -d; }
export function pool(ringen, precisie) {
  var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  ringen.forEach(function(r) { r.forEach(function(q) { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); }); });
  var w = x1 - x0, h = y1 - y0, cel = Math.min(w, h);
  function maak(x, y, hh) { var d = getekendeAfstand([x, y], ringen); return { x: x, y: y, h: hh, d: d, max: d + hh * Math.SQRT2 }; }
  var best = maak(x0 + w / 2, y0 + h / 2, 0);
  var z = zwaartepuntGrootste(ringen), zc = maak(z[0], z[1], 0); if (zc.d > best.d) best = zc;
  if (cel === 0) return best;
  var rij = [], hh = cel / 2;
  for (var x = x0; x < x1; x += cel) for (var y = y0; y < y1; y += cel) rij.push(maak(x + hh, y + hh, hh));
  while (rij.length) {
    rij.sort(function(a, b) { return a.max - b.max; });
    var c = rij.pop();
    if (c.d > best.d) best = c;
    if (c.max - best.d <= precisie) continue;
    var k = c.h / 2;
    rij.push(maak(c.x - k, c.y - k, k), maak(c.x + k, c.y - k, k), maak(c.x - k, c.y + k, k), maak(c.x + k, c.y + k, k));
  }
  return best;
}

export function afstandTotLijnstuk(p, a, b) {
  var dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy;
  var t = l ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l)) : 0;
  var x = a[0] + t * dx - p[0], y = a[1] + t * dy - p[1];
  return Math.sqrt(x * x + y * y);
}
export function afstandTotLijn(p, r) {
  var m = Infinity;
  for (var i = 0; i < r.length - 1; i++) m = Math.min(m, afstandTotLijnstuk(p, r[i], r[i + 1]));
  return m;
}

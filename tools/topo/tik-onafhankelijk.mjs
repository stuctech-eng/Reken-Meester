// Onafhankelijke tikregel voor de tests (los geschreven van public/kaartproef/tikregel.js), versie 2:
// tikcirkel als de grootste ingeschreven cirkel op het scherm kleiner is dan 44 px (ir * s < 22).
// Geborgd uit T2a (bouwplan T2b-2 fase 6.1, par. 6): dezelfde rekenregels als ind.mjs, in de stijl van het project.
// Importeert niets: niet uit public/kaartproef/, niet uit tikregel.js en niet uit tik-meet.mjs.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.

export var R = 22, A = Math.PI * R * R, MARGE = 4;
export function ringenUit(d) {
  var r = [], cur = null, x = 0, y = 0, toks = d.match(/[MlZ][^MlZ]*/g) || [];
  for (var t = 0; t < toks.length; t++) {
    var tok = toks[t], c = tok[0], n = tok.slice(1).trim() ? tok.slice(1).trim().split(/[\s,]+/).map(Number) : [];
    if (c === "M") { x = n[0]; y = n[1]; cur = [[x, y]]; r.push(cur); }
    else if (c === "l") for (var i = 0; i < n.length; i += 2) { x += n[i]; y += n[i + 1]; cur.push([x, y]); }
    else { cur.push([cur[0][0], cur[0][1]]); x = cur[0][0]; y = cur[0][1]; }
  }
  return r;
}
export function seg(p, a, b) { var vx = b[0] - a[0], vy = b[1] - a[1], L = vx * vx + vy * vy; var t = L ? ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / L : 0; t = t < 0 ? 0 : t > 1 ? 1 : t; return Math.hypot(a[0] + t * vx - p[0], a[1] + t * vy - p[1]); }
export function minAfst(p, rs) { var m = Infinity; for (var k = 0; k < rs.length; k++) { var r = rs[k]; for (var i = 1; i < r.length; i++) m = Math.min(m, seg(p, r[i - 1], r[i])); } return m; }
export function pip(p, r) { var c = false; for (var i = 0, j = r.length - 1; i < r.length; j = i++) { var yi = r[i][1], yj = r[j][1]; if ((yi > p[1]) !== (yj > p[1]) && p[0] < (r[j][0] - r[i][0]) * (p[1] - yi) / (yj - yi) + r[i][0]) c = !c; } return c; }
export function inVlak(p, rs) { return rs.filter(function(r) { return pip(p, r); }).length % 2 === 1; }
export function doelenVan(laag) {
  return laag.items.map(function(it) {
    if (laag.soort === "punt") return { id: it.id, naam: it.naam, soort: "punt", p: [it.x, it.y], bb: [it.x, it.y, it.x, it.y] };
    var rs = ringenUit(it.d), bb = [Infinity, Infinity, -Infinity, -Infinity];
    for (var k = 0; k < rs.length; k++) { var r = rs[k]; for (var i = 0; i < r.length; i++) { var q = r[i]; bb[0] = Math.min(bb[0], q[0]); bb[1] = Math.min(bb[1], q[1]); bb[2] = Math.max(bb[2], q[0]); bb[3] = Math.max(bb[3], q[1]); } }
    if (laag.soort === "vlak") { bb[0] = Math.min(bb[0], it.mx); bb[1] = Math.min(bb[1], it.my); bb[2] = Math.max(bb[2], it.mx); bb[3] = Math.max(bb[3], it.my); }
    return { id: it.id, naam: it.naam, soort: laag.soort, rs: rs, opp: it.opp || 0, m: [it.mx, it.my], ir: it.ir || 0, bb: bb };
  });
}
export function klein(d, s) { return d.soort === "vlak" && d.ir * s < R; }
export function oppEff(d, s) { return d.soort === "punt" ? A : d.soort === "lijn" ? Infinity : d.opp * s * s + (klein(d, s) ? A : 0); }
// relevante doelen voor een gebied in CSS-px (met marge)
export function relevant(doelen, s, x0, y0, x1, y1) { return doelen.filter(function(d) { return d.bb[2] * s + 50 >= x0 && d.bb[0] * s - 50 <= x1 && d.bb[3] * s + 50 >= y0 && d.bb[1] * s - 50 <= y1; }); }
// geeft de id van het gekozen doel, "" bij geen doel, of "?" bij twijfel
export function besluit(doelen, s, x, y) {
  return besluitMet(doelen, s, x, y).id;
}
// als besluit, met de kandidaten (voor de vergelijking met tikregel.beslis)
export function besluitMet(doelen, s, x, y) {
  var u = [x / s, y / s], kand = [];
  for (var i = 0; i < doelen.length; i++) {
    var d = doelen[i];
    if (d.soort === "punt") { var ap = Math.hypot(d.p[0] * s - x, d.p[1] * s - y); if (ap <= R) kand.push({ id: d.id, a: ap, o: A, b: true }); continue; }
    if (d.soort === "lijn") { var al = minAfst(u, d.rs) * s; if (al <= R) kand.push({ id: d.id, a: al, o: Infinity, b: false }); continue; }
    var binnen = inVlak(u, d.rs), kl = klein(d, s), am = Math.hypot(d.m[0] * s - x, d.m[1] * s - y);
    if (!binnen && !(kl && am <= R)) continue;
    kand.push({ id: d.id, a: binnen ? 0 : (d.rs.length ? minAfst(u, d.rs) * s : am), o: d.opp * s * s + (kl ? A : 0), b: true });
  }
  var ids = kand.map(function(c) { return c.id; });
  if (!kand.length) return { id: "", kandidaten: ids };
  if (kand.length === 1) return { id: kand[0].id, kandidaten: ids };
  var k = null;
  for (var j = 0; j < kand.length; j++) { var c = kand[j]; if (c.b && (!k || c.o < k.o)) k = c; }
  if (k && kand.every(function(c2) { return c2 === k || k.o < c2.o / 2; })) return { id: k.id, kandidaten: ids };
  kand.sort(function(p, q) { return p.a - q.a || (p.id < q.id ? -1 : 1); });
  return { id: kand[1].a - kand[0].a > MARGE ? kand[0].id : "?", kandidaten: ids };
}
// Euclidische afstandstransformatie (Felzenszwalb)
function edt1(fv, n) {
  var d = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1), k = 0, q, s;
  v[0] = 0; z[0] = -Infinity; z[1] = Infinity;
  for (q = 1; q < n; q++) { do { var p = v[k]; s = ((fv[q] + q * q) - (fv[p] + p * p)) / (2 * q - 2 * p); if (s <= z[k]) k--; else break; } while (k >= 0); k++; v[k] = q; z[k] = s; z[k + 1] = Infinity; }
  k = 0; for (q = 0; q < n; q++) { while (z[k + 1] < q) k++; d[q] = (q - v[k]) * (q - v[k]) + fv[v[k]]; } return d;
}
// grootste afstand van een cel in het masker tot het midden van de dichtstbijzijnde cel buiten het masker (in cellen);
// de rand van het raster telt als buiten
export function grootsteAfstand(m, w, h) {
  var W = w + 2, H = h + 2, g = new Float64Array(W * H), i, j;
  for (j = 0; j < H; j++) for (i = 0; i < W; i++) g[j * W + i] = (i > 0 && j > 0 && i <= w && j <= h && m[(j - 1) * w + (i - 1)]) ? 1e12 : 0;
  for (i = 0; i < W; i++) { var c = new Float64Array(H); for (j = 0; j < H; j++) c[j] = g[j * W + i]; var dc = edt1(c, H); for (j = 0; j < H; j++) g[j * W + i] = dc[j]; }
  var mx = 0; for (j = 0; j < H; j++) { var dr = edt1(Float64Array.from(g.subarray(j * W, j * W + W)), W); for (i = 0; i < W; i++) if (dr[i] > mx) mx = dr[i]; }
  return Math.sqrt(mx);
}

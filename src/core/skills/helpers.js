// Gedeelde vraag-helpers voor alle onderdelen (optellen, later aftrekken).
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.

// ─────────────────────────────────────────────────────────────────
// DOMEIN-HELPERS (fase 1)
// ─────────────────────────────────────────────────────────────────

// Grootste gemene deler (Euclides)
export function gcd(a, b) {
  a = Math.abs(a); b = Math.abs(b);
  while (b) { var t = b; b = a % b; a = t; }
  return a || 1;
}

// Vereenvoudig breuk {n, d}
export function reduceFrac(n, d) {
  var g = gcd(n, d);
  return { n: n / g, d: d / g };
}

// Controleer of twee breuken gelijk zijn
export function fracEqual(f1, f2) {
  var r1 = reduceFrac(f1.n, f1.d);
  var r2 = reduceFrac(f2.n, f2.d);
  return r1.n === r2.n && r1.d === r2.d;
}

// Formatteer breuk als string "n/d" (vereenvoudigd; geheel getal als d===1)
export function fracStr(n, d) {
  var r = reduceFrac(n, d);
  if (r.d === 1) return String(r.n);
  return r.n + "/" + r.d;
}

// Formatteer centen als euro-string: 175 -> "€ 1,75"
export function centStr(centen) {
  var euros = Math.floor(centen / 100);
  var cent  = centen % 100;
  return "€ " + euros + "," + (cent < 10 ? "0" : "") + cent;
}

// Formatteer tienden als decimaal-string: 3 -> "0,3", 15 -> "1,5"
export function tiendStr(tienden) {
  var geheel = Math.floor(tienden / 10);
  var rest   = tienden % 10;
  return geheel + "," + rest;
}

// Formatteer honderdsten als decimaal-string: 5 -> "0,05", 175 -> "1,75"
export function honderdStr(honderdsten) {
  var geheel = Math.floor(honderdsten / 100);
  var rest   = honderdsten % 100;
  return geheel + "," + (rest < 10 ? "0" : "") + rest;
}

// Formatteer minuten als tijdstring: 75 -> "1u15", 5 -> "0u05"
export function timeStr(minuten) {
  var uren = Math.floor(minuten / 60);
  var min  = minuten % 60;
  return uren + "u" + (min < 10 ? "0" : "") + min;
}

// ─────────────────────────────────────────────────────────────────
// VRAAG-VALIDATIE EN VEILIGE GENERATOR
// ─────────────────────────────────────────────────────────────────

// Valideer een gegenereerde vraag: answer aanwezig, 4 unieke keuzes, answer ∈ choices
export function isValidQ(q) {
  if (!q || q.answer === undefined || q.answer === null) return false;
  if (!q.choices || q.choices.length !== 4) return false;
  if (q.choices.indexOf(q.answer) === -1) return false;
  var seen = {};
  for (var i = 0; i < q.choices.length; i++) {
    var k = String(q.choices[i]);
    if (seen[k]) return false;
    seen[k] = true;
  }
  return true;
}

// Genereer veilig: probeer generator maxTries keer; bij falen gebruik fallbackFn
export function generateSafe(generatorFn, fallbackFn, maxTries) {
  maxTries = maxTries || 5;
  for (var i = 0; i < maxTries; i++) {
    try {
      var q = generatorFn();
      if (isValidQ(q)) return q;
    } catch(e) {
      // probeer opnieuw
    }
  }
  return fallbackFn ? fallbackFn() : null;
}

export function rnd(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function shuffle(arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}

export function wrongChoices(answer, count, minVal) {
  var min = minVal !== undefined ? minVal : 1;
  var set = {};
  set[answer] = true;
  var result = [];
  var attempts = 0;
  while (result.length < count && attempts < 300) {
    attempts++;
    var spread = answer > 100 ? 15 : answer > 50 ? 8 : answer > 20 ? 5 : 3;
    var delta  = rnd(1, spread);
    var sign   = Math.random() > 0.5 ? 1 : -1;
    var w      = answer + sign * delta;
    if (w >= min && !set[w]) {
      set[w] = true;
      result.push(w);
    }
  }
  var fallback = answer + result.length + 1;
  while (result.length < count) {
    if (!set[fallback]) { result.push(fallback); set[fallback] = true; }
    fallback++;
  }
  return result;
}

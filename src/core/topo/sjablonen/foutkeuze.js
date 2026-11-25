// De foute keuzes van een vraag (plan T4 par. 8): minstens een buur van het juiste gebied, als die er bij de kandidaten is; de
// rest willekeurig. Zonder buur bij de kandidaten precies de keuze van voor T4 (willekeurig).
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.

import { shuffle } from "../../skills/helpers.js";

export function kiesFout(kandidaten, buren, n) {
  var b = kandidaten.filter(function(x) { return (buren || []).indexOf(x) >= 0; });
  if (!b.length) return shuffle(kandidaten).slice(0, n);
  var eerste = b[Math.floor(Math.random() * b.length)];
  return [eerste].concat(shuffle(kandidaten.filter(function(x) { return x !== eerste; })).slice(0, n - 1));
}

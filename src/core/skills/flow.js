// Gedeeld vraagverloop voor de rekenmodi met skills (aftrekken, straks vermenigvuldigen).
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// - Alle aanroepen van generate() in hetzelfde synchrone rekenmoment tellen als één getoonde vraag.
//   Dat dekt de herkansing in PracticeScreen.generateNext en de dubbele start in React StrictMode.
// - Geschiedenis per skill-ID: geen herhaling binnen de laatste 10 getoonde vragen. Bij skills met
//   minder mogelijke sommen: zo lang mogelijk geen herhaling (de generator stopt altijd).
// - Toestand (geschiedenis, subtype) staat per skill-ID; skill-ID's zijn uniek over alle modi
//   (afgedwongen door registerSkillId). De gemengde ronde heeft per modus een eigen toestand.

import { rnd, shuffle, wrongChoices } from "./helpers.js";

// ─────────────────────────────────────────────────────────────────
// VRAAGVERLOOP: rekenmoment, geschiedenis en subtypen
// ─────────────────────────────────────────────────────────────────

var tickId   = 0;
var tickOpen = false;

function currentTick() {
  if (!tickOpen) {
    tickOpen = true;
    tickId++;
    Promise.resolve().then(function() { tickOpen = false; });
  }
  return tickId;
}

// Een vraag wordt herkend aan vraagtekst + antwoord (ook bij fout spotten, waar de tekst vast is)
function qKey(q) {
  return q.question + "|" + String(q.answer);
}

var HIST_MAX  = 10;
var MAX_TRIES = 40;
var HISTORY   = {};
var SUBTYPE   = {};

// Subtypen wisselen per getoonde vraag (binnen hetzelfde moment blijft het subtype gelijk)
function pickSubtype(skillId, count, t) {
  var s = SUBTYPE[skillId];
  if (s && s.tick === t) return s.index;
  var index = s ? (s.index + 1) % count : rnd(0, count - 1);
  SUBTYPE[skillId] = { tick: t, index: index };
  return index;
}

function noRepeat(skillId, makeFn, subtypes) {
  return function() {
    var t        = currentTick();
    var sub      = subtypes ? pickSubtype(skillId, subtypes, t) : 0;
    var h        = HISTORY[skillId] || (HISTORY[skillId] = []);
    var sameTick = h.length > 0 && h[h.length - 1].tick === t;
    // Een eerdere vraag uit hetzelfde moment is weggegooid en telt niet als getoond
    var shown    = (sameTick ? h.slice(0, h.length - 1) : h).slice(-HIST_MAX);
    var best     = null;
    var bestIdx  = Infinity;
    for (var i = 0; i < MAX_TRIES; i++) {
      var q   = makeFn(sub);
      var k   = qKey(q);
      var idx = -1;
      for (var j = shown.length - 1; j >= 0; j--) {
        if (shown[j].key === k) { idx = j; break; }
      }
      if (idx === -1) { best = q; break; }
      if (idx < bestIdx) { bestIdx = idx; best = q; }
    }
    var entry = { tick: t, key: qKey(best) };
    if (sameTick) { h[h.length - 1] = entry; } else { h.push(entry); }
    // Eén plaats extra: een herkansing in hetzelfde moment moet nog met 10 getoonde vragen vergelijken
    if (h.length > HIST_MAX + 1) h.shift();
    return best;
  };
}

// ─────────────────────────────────────────────────────────────────
// GEDEELDE VRAAG-HELPERS
// ─────────────────────────────────────────────────────────────────

// Vier unieke keuzes, nooit negatief; typische fouten (extras) gaan voor
export function makeChoices(answer, extras) {
  var list = [answer];
  var seen = {};
  seen[String(answer)] = true;
  function add(x) {
    if (list.length < 4 && typeof x === "number" && x >= 0 && !seen[String(x)]) {
      seen[String(x)] = true;
      list.push(x);
    }
  }
  (extras || []).forEach(add);
  if (list.length < 4) wrongChoices(answer, 6, 0).forEach(add);
  var f = answer + 1;
  while (list.length < 4) { add(f); f++; }
  return shuffle(list);
}

// Cijfers van rechts naar links: 402 -> [2, 0, 4]
export function digitsOf(n) {
  var d = [];
  do { d.push(n % 10); n = Math.floor(n / 10); } while (n > 0);
  return d;
}

export function hasZeroDigit(n) {
  return digitsOf(n).indexOf(0) !== -1;
}

export function round10(n)  { return Math.round(n / 10) * 10; }
export function round100(n) { return Math.round(n / 100) * 100; }

// Schatkeuzes: alleen veelvouden van step, allemaal groter dan 0
export function estimateChoices(answer, step) {
  var opts = [answer - 2 * step, answer - step, answer + step, answer + 2 * step].filter(function(v) { return v > 0; });
  var extra = 3;
  while (opts.length < 3) { opts.push(answer + extra * step); extra++; }
  return shuffle([answer].concat(shuffle(opts).slice(0, 3)));
}

export function randomWith(fn) {
  for (var i = 0; i < 500; i++) {
    var r = fn();
    if (r) return r;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────
// SKILLS BOUWEN, UNIEKE ID'S EN DE GEMENGDE RONDE
// ─────────────────────────────────────────────────────────────────

// Elke skill-ID hoort bij precies één modus. Dezelfde modus mag opnieuw registreren
// (bijv. bij herladen van de module), een andere modus met dezelfde ID geeft een fout.
var SKILL_OWNER = {};

export function registerSkillId(owner, id) {
  if (Object.prototype.hasOwnProperty.call(SKILL_OWNER, id) && SKILL_OWNER[id] !== owner) {
    throw new Error("Dubbele skill-ID: " + id + " (" + SKILL_OWNER[id] + " en " + owner + ")");
  }
  SKILL_OWNER[id] = owner;
}

// Ruwe skills (met make en optioneel subtypes) -> skills met generate via het vraagverloop
export function createSkills(owner, rawSkills) {
  var byId = {};
  var list = rawSkills.map(function(s) {
    registerSkillId(owner, s.id);
    var skill = {
      id:         s.id,
      label:      s.label,
      group:      s.group,
      desc:       s.desc,
      strategy:   s.strategy,
      tip:        s.tip,
      uitleg:     s.uitleg,
      voorbeeld:  s.voorbeeld,
      minCorrect: s.minCorrect,
      // Skills met een eigen stapel (deck) regelen hun volgorde zelf; de rest via noRepeat
      generate:   s.deck ? s.make : noRepeat(s.id, s.make, s.subtypes),
    };
    byId[s.id] = skill;
    return skill;
  });
  return { list: list, byId: byId };
}

// ─────────────────────────────────────────────────────────────────
// KLEINE SETS: STAPEL (DECK)
// Elk item van de set komt precies één keer langs voordat de stapel opnieuw wordt geschud.
// Bij het schudden is het eerste item nooit gelijk aan het laatst getoonde.
// Aanroepen in hetzelfde rekenmoment tellen als één getoonde vraag: het eerder getrokken
// item gaat terug op de stapel en er wordt een ander item getrokken (herkansing, StrictMode).
// Staat los van noRepeat; gebruik via een ruwe skill met deck: true.
// ─────────────────────────────────────────────────────────────────

var DECKS = {};

export function deckPick(skillId, items) {
  var t    = currentTick();
  var d    = DECKS[skillId] || (DECKS[skillId] = { order: [], tick: -1, last: null, shown: null });
  var back = null;
  if (d.tick === t && d.last !== null) {
    back = d.last;
  } else {
    d.shown = d.last;
  }
  if (d.order.length === 0 && back !== null) {
    // Tweede aanroep in hetzelfde moment terwijl de ronde op is: geen nieuwe ronde beginnen,
    // de laatste som van deze ronde blijft de getoonde som (anders schuiven de rondes uit de pas)
    return items[back];
  }
  if (d.order.length === 0) {
    var all = [];
    for (var i = 0; i < items.length; i++) { if (i !== back) all.push(i); }
    var o = shuffle(all);
    if (o.length > 1 && o[0] === d.shown) { var tmp = o[0]; o[0] = o[1]; o[1] = tmp; }
    d.order = o;
  }
  // Nooit direct de vorige getoonde som, zolang er een andere in de ronde is
  var idx = back;
  if (d.order.length > 0) {
    var pos = (d.order[0] === d.shown && d.order.length > 1) ? 1 : 0;
    idx = d.order.splice(pos, 1)[0];
  }
  if (back !== null && back !== idx) d.order.unshift(back);
  d.tick = t;
  d.last = idx;
  return items[idx];
}

// Gemengde ronde: geschudde ronde langs alle blokken, binnen elk blok een geschudde ronde
// langs de skills. Eigen toestand per aanroep (dus per modus).
export function createMixer(rawSkills, blockGroups, skillsById) {
  var state    = { tick: -1, block: null, skillId: null, blockCycle: [], lastBlock: null, skillCycles: {} };
  var blockIds = blockGroups.map(function(g, i) { return i + 1; });

  function skillsOfBlock(b) {
    var group = blockGroups[b - 1];
    return rawSkills.filter(function(s) { return s.group === group; }).map(function(s) { return s.id; });
  }

  function nextBlock() {
    if (state.blockCycle.length === 0) {
      var c = shuffle(blockIds);
      if (c[0] === state.lastBlock) { var tmp = c[0]; c[0] = c[1]; c[1] = tmp; }
      state.blockCycle = c;
    }
    state.lastBlock = state.blockCycle.shift();
    return state.lastBlock;
  }

  function nextSkillInBlock(b) {
    var c = state.skillCycles[b];
    if (!c || c.length === 0) { c = state.skillCycles[b] = shuffle(skillsOfBlock(b)); }
    return c.shift();
  }

  function generate() {
    var t = currentTick();
    if (state.tick !== t) {
      state.tick    = t;
      state.block   = nextBlock();
      state.skillId = nextSkillInBlock(state.block);
    }
    return skillsById[state.skillId].generate();
  }

  return { generate: generate, state: state };
}

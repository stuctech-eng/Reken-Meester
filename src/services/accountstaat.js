// Welke speler is op dit toestel actief (plan IN, fase IN-2, §22.3 en §22.4).
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// rekenmeester_account (gedeeld door alle tabbladen):
//   "a:<uid>"            een anonieme speler
//   "k:<uid>"            een account (e-mail en wachtwoord)
//   "lokaal"             geen Firebase; de gegevens staan onder de eigenaar "lokaal"
//   "w:<fase>:<uid>"     een wissel is bezig (fase: inloggen, annuleren, uitloggen) vanaf deze uid
// rekenmeester_in1_uid: de eigenaar van alles wat een tabblad met IN-1 (67b13fc) schrijft; één keer gezet.
//
// Alleen leesAccount en zetAccount gebruiken de sleutel rekenmeester_account.

var ACCOUNT_KEY = "rekenmeester_account";
var IN1_KEY     = "rekenmeester_in1_uid";
var FASEN       = ["inloggen", "annuleren", "uitloggen"];

export var LOKAAL = "lokaal";

// { soort: "anoniem" | "account" | "lokaal", uid } of { soort: "wissel", fase, uid }
// of { soort: "ontbreekt" } (getItem gaf null), { soort: "ongeldig" } of { soort: "leesfout" } (getItem gooide)
export function leesAccount(storage) {
  var s;
  try {
    s = storage.getItem(ACCOUNT_KEY);
  } catch (e) {
    return { soort: "leesfout" };
  }
  if (s === null || s === undefined) return { soort: "ontbreekt" };
  if (s === LOKAAL) return { soort: "lokaal", uid: LOKAAL };
  var m = /^([ak]):(.+)$/.exec(s);
  if (m) return { soort: m[1] === "a" ? "anoniem" : "account", uid: m[2] };
  var w = /^w:([a-z]+):(.+)$/.exec(s);
  if (w && FASEN.indexOf(w[1]) !== -1) return { soort: "wissel", fase: w[1], uid: w[2] };
  return { soort: "ongeldig" };
}

// toestand: { soort: "anoniem" | "account" | "lokaal", uid } of { soort: "wissel", fase, uid }. Gooit bij een
// fout van setItem (de aanroeper breekt dan af).
export function zetAccount(storage, toestand) {
  var v;
  if (toestand.soort === "lokaal") v = LOKAAL;
  else if (toestand.soort === "anoniem") v = "a:" + toestand.uid;
  else if (toestand.soort === "account") v = "k:" + toestand.uid;
  else if (toestand.soort === "wissel" && FASEN.indexOf(toestand.fase) !== -1) v = "w:" + toestand.fase + ":" + toestand.uid;
  else throw new Error("ongeldige accounttoestand");
  storage.setItem(ACCOUNT_KEY, v);
}

// De toestand voor een eigenaar: lokaal zonder uid, anders anoniem of account
export function toestandVoor(uid, anoniem) {
  if (!uid || uid === LOKAAL) return { soort: "lokaal", uid: LOKAAL };
  return { soort: anoniem ? "anoniem" : "account", uid: uid };
}

export function isAccountSleutel(key) { return key === ACCOUNT_KEY; }

export function leesIn1Uid(storage) {
  try { return storage.getItem(IN1_KEY); } catch (e) { return null; }
}
// Alleen als hij nog ontbreekt
export function zetIn1UidEenmalig(storage, eigenaar) {
  if (storage.getItem(IN1_KEY) === null) storage.setItem(IN1_KEY, eigenaar);
}

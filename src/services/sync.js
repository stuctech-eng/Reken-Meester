// Firestore-opslag van de voortgang (plan IN, fase IN-1, §3g).
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// - laadServer: alleen Firestore, zonder terugval op localStorage; een fout gaat door naar boven.
// - slaOp: één transactie. Binnen de transactie: het document lezen, daarop alle bewerkingen uit de
//   wachtrijen van dit toestel toepassen die er nog niet in zitten (herbouw), en het hele document schrijven
//   met rev + 1. Verandert het document intussen (een ander toestel of tabblad), dan herhaalt Firestore de
//   hele functie: elke poging leest de serverstand en de wachtrijen opnieuw. Er wordt nooit blind geschreven.

import { doc, getDoc, runTransaction } from "firebase/firestore";
import { db } from "./firebase.js";
import { herbouw, normaliseer } from "../core/voortgang.js";

export async function laadServer(uid) {
  var snap = await getDoc(doc(db, "users", uid));
  return normaliseer(snap.exists() ? snap.data() : null);
}

// Eén poging binnen een transactie (los, zodat de test hem met een nagebootste transactie kan draaien)
export async function stapTransactie(tx, ref, plek) {
  var snap   = await tx.get(ref);
  var server = normaliseer(snap.exists() ? snap.data() : null);
  var h      = herbouw(server, plek.alle());
  if (h.toegepast === 0) return server;
  var next = h.stand;
  next.rev = server.rev + 1;
  tx.set(ref, next);
  return next;
}

export function slaOp(uid, plek) {
  var ref = doc(db, "users", uid);
  return runTransaction(db, function(tx) { return stapTransactie(tx, ref, plek); });
}

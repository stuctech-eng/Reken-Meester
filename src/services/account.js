// Account met e-mail en wachtwoord (plan IN, fase IN-2): koppelen, inloggen, uitloggen, wachtwoord vergeten,
// en de foutteksten in het Nederlands.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Deze functies doen alleen de aanroep bij Firebase Auth. De volgorde rond een wissel (het slot, de marker, de
// gegevens) staat in App.jsx.

import {
  EmailAuthProvider, linkWithCredential, signInWithEmailAndPassword, signOut,
  signInAnonymously, sendPasswordResetEmail
} from "firebase/auth";
import { auth } from "./firebase.js";

// Account maken: de anonieme speler krijgt e-mail en wachtwoord; de uid blijft gelijk
export async function maakAccount(email, wachtwoord) {
  if (!auth.currentUser) throw Object.assign(new Error("niet aangemeld"), { code: "app/geen-inlog" });
  var cred = EmailAuthProvider.credential(email.trim(), wachtwoord);
  var r = await linkWithCredential(auth.currentUser, cred);
  return r.user.uid;
}

// Inloggen: geeft de uid uit de uitkomst van deze aanroep (nooit uit een losse melding)
export async function logIn(email, wachtwoord) {
  var r = await signInWithEmailAndPassword(auth, email.trim(), wachtwoord);
  return r.user.uid;
}

export function logUit() { return signOut(auth); }

// Zelf anoniem aanmelden (na uitloggen of annuleren); geeft de uid uit deze aanroep
export async function startAnoniem() {
  var r = await signInAnonymously(auth);
  return r.user.uid;
}

export function stuurWachtwoordHerstel(email) { return sendPasswordResetEmail(auth, email.trim()); }

var TEKSTEN = {
  "auth/email-already-in-use":       "Dit e-mailadres heeft al een account. Kies \"Ik heb al een account\" om in te loggen.",
  "auth/credential-already-in-use":  "Dit e-mailadres heeft al een account. Kies \"Ik heb al een account\" om in te loggen.",
  "auth/provider-already-linked":    "Je hebt al een account.",
  "auth/wrong-password":             "Het wachtwoord of het e-mailadres klopt niet.",
  "auth/user-not-found":             "Het wachtwoord of het e-mailadres klopt niet.",
  "auth/invalid-credential":         "Het wachtwoord of het e-mailadres klopt niet.",
  "auth/invalid-login-credentials":  "Het wachtwoord of het e-mailadres klopt niet.",
  "auth/invalid-email":              "Dit is geen geldig e-mailadres.",
  "auth/missing-email":              "Vul je e-mailadres in.",
  "auth/missing-password":           "Vul je wachtwoord in.",
  "auth/weak-password":              "Het wachtwoord moet minstens 6 tekens hebben.",
  "auth/network-request-failed":     "Geen verbinding. Controleer je internet en probeer het opnieuw.",
  "auth/too-many-requests":          "Te vaak geprobeerd. Wacht even en probeer het dan opnieuw.",
  "auth/unauthorized-domain":        "Inloggen is op dit adres nog niet toegestaan (Firebase: unauthorized-domain).",
  "auth/operation-not-allowed":      "Inloggen met e-mail staat uit in Firebase.",
  "app/geen-inlog":                  "Je bent niet aangemeld. Laad de app opnieuw.",
};

// De Nederlandse tekst bij een fout; nooit leeg (een onbekende code staat erachter)
export function foutTekst(fout) {
  var code = (fout && fout.code) || "";
  return TEKSTEN[code] || ("Er ging iets mis" + (code ? " (" + code + ")" : "") + ". Probeer het opnieuw.");
}

import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAkEFyVPE6m1rc-DBL3x8ziTWbZ8HbHDq0",
  authDomain: "reken-geheugen.firebaseapp.com",
  projectId: "reken-geheugen",
  storageBucket: "reken-geheugen.firebasestorage.app",
  messagingSenderId: "867699460771",
  appId: "1:867699460771:web:ac60a1491a814cd771cd16"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);

// De eerste uid (plan IN, §3d). De eerste melding van Firebase kan null zijn (nieuw toestel); dan één keer
// anoniem aanmelden. De luisteraar wordt pas afgemeld als er een uid is (of de anonieme aanmelding mislukt),
// zodat een latere signOut niet vanzelf een nieuwe anonieme speler start.
export function initAuth() {
  return new Promise(function(resolve, reject) {
    var klaar = false;
    var anoniemGestart = false;
    var afmelden = null;
    var afmeldenNu = false;
    function stop() {
      if (afmelden) afmelden(); else afmeldenNu = true;
    }
    function geef(uid) {
      if (klaar) return;
      klaar = true;
      resolve(uid);
      stop();
    }
    afmelden = onAuthStateChanged(auth, function(user) {
      if (klaar) return;
      if (user) { geef(user.uid); return; }
      if (anoniemGestart) return;
      anoniemGestart = true;
      signInAnonymously(auth).then(function(result) {
        geef(result.user.uid);
      }, function(err) {
        if (klaar) return;
        klaar = true;
        reject(err);
        stop();
      });
    });
    if (afmeldenNu) afmelden();
  });
}

// De blijvende waarnemer (plan IN, §22.3 punt 1): meldt elke verandering van de inlog, doet zelf nooit een
// aanmelding. Geeft de functie om af te melden.
export function volgInlog(cb) {
  return onAuthStateChanged(auth, function(user) {
    cb(user ? { uid: user.uid, anoniem: !!user.isAnonymous, email: user.email || null } : null);
  });
}

// De inlog van dit moment, of null
export function huidigeInlog() {
  var u = auth.currentUser;
  return u ? { uid: u.uid, anoniem: !!u.isAnonymous, email: u.email || null } : null;
}

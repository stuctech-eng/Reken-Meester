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

export function initAuth() {
  return new Promise((resolve, reject) => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        resolve(user.uid);
      } else {
        try {
          const result = await signInAnonymously(auth);
          resolve(result.user.uid);
        } catch (err) {
          reject(err);
        }
      }
    });
  });
}

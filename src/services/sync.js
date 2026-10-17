import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase.js";
import { DEFAULT_SAVE, dMerge, dClone } from "../core/save.js";

const LS_KEY = "cumlaude_save";

export async function loadFromFirestore(uid) {
  try {
    const ref  = doc(db, "users", uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return dMerge(dClone(DEFAULT_SAVE), snap.data());
    }
    // Try local storage fallback
    const local = localStorage.getItem(LS_KEY);
    if (local) return dMerge(dClone(DEFAULT_SAVE), JSON.parse(local));
    return dClone(DEFAULT_SAVE);
  } catch {
    try {
      const local = localStorage.getItem(LS_KEY);
      if (local) return dMerge(dClone(DEFAULT_SAVE), JSON.parse(local));
    } catch {}
    return dClone(DEFAULT_SAVE);
  }
}

export async function saveToFirestore(uid, data) {
  try {
    const ref = doc(db, "users", uid);
    await setDoc(ref, data, { merge: true });
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(data));
    } catch {}
  }
}

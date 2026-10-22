import {
  doc, getDoc, setDoc, runTransaction,
  collection, query, orderBy, limit, getDocs, where
} from "firebase/firestore";
import { db } from "./firebase.js";

// Claim a unique username via transaction
export async function claimUsername(uid, displayName) {
  if (!displayName || displayName.length < 2 || displayName.length > 20) {
    throw new Error("Naam moet 2-20 tekens zijn");
  }
  const slug = displayName.toLowerCase().replace(/\s+/g, "_");
  const nameRef = doc(db, "usernames", slug);
  const userRef = doc(db, "users", uid);

  await runTransaction(db, async (tx) => {
    const nameSnap = await tx.get(nameRef);
    if (nameSnap.exists() && nameSnap.data().uid !== uid) {
      throw new Error("Deze naam is al bezet");
    }
    tx.set(nameRef, { uid, displayName });
    tx.set(userRef, { username: slug, displayName }, { merge: true });
  });
}

// Update global leaderboard
export async function updateGlobalLeaderboard(uid, displayName, totalXp, tier) {
  try {
    const ref = doc(db, "leaderboard_global", uid);
    await setDoc(ref, { uid, displayName, xp: totalXp, tier, updatedAt: Date.now() }, { merge: true });
  } catch {}
}

// Update module leaderboard (skills = beheerste vaardigheden, titel = titel van deze modus)
export async function updateSubjectLeaderboard(uid, displayName, subject, level, accuracy, skills, titel) {
  try {
    const ref = doc(db, "leaderboard_subject_" + subject, uid);
    await setDoc(ref, { uid, displayName, level, accuracy, skills, titel, updatedAt: Date.now() }, { merge: true });
  } catch {}
}

// Fetch top 10 global
export async function fetchGlobalTop10() {
  try {
    const q = query(
      collection(db, "leaderboard_global"),
      orderBy("xp", "desc"),
      limit(10)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d, i) => ({ rank: i + 1, ...d.data() }));
  } catch { return []; }
}

// Fetch top 10 for a subject (gesorteerd op beheerste vaardigheden)
export async function fetchSubjectTop10(subject) {
  try {
    const q = query(
      collection(db, "leaderboard_subject_" + subject),
      orderBy("skills", "desc"),
      limit(10)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d, i) => ({ rank: i + 1, ...d.data() }));
  } catch { return []; }
}

// My global rank
export async function fetchMyRankGlobal(uid, myXp) {
  try {
    const q = query(
      collection(db, "leaderboard_global"),
      where("xp", ">", myXp)
    );
    const snap = await getDocs(q);
    return snap.size + 1;
  } catch { return null; }
}

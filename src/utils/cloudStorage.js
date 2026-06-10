import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';

function userDoc(uid) {
  return doc(db, 'users', uid, 'data', 'schedule');
}

export async function loadEventsFromCloud(uid) {
  const snap = await getDoc(userDoc(uid));
  if (snap.exists()) return snap.data().events ?? null;
  return null;
}

export async function saveEventsToCloud(uid, events) {
  await setDoc(userDoc(uid), { events, updatedAt: Date.now() }, { merge: true });
}

// リアルタイム同期: データが変わったら callback を呼ぶ
export function subscribeEvents(uid, callback) {
  return onSnapshot(userDoc(uid), (snap) => {
    if (snap.exists()) {
      const events = snap.data().events;
      if (events) callback(events);
    }
  });
}

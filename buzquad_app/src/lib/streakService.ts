import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { firestore } from './firestore';

function today() { return new Date().toISOString().slice(0, 10); }
function yesterday() {
  const d = new Date(); d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export async function recordLoginStreak(uid: string): Promise<number> {
  const ref = doc(firestore, 'users', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return 0;
  const data = snap.data() as { loginStreak?: number; lastLoginDate?: string; streaksEnabled?: boolean };
  if (data.streaksEnabled === false) return 0;
  const t = today();
  if (data.lastLoginDate === t) return data.loginStreak ?? 0;
  const newStreak = data.lastLoginDate === yesterday() ? (data.loginStreak ?? 0) + 1 : 1;
  await updateDoc(ref, { loginStreak: newStreak, lastLoginDate: t });
  return newStreak;
}

export async function recordPostStreak(uid: string): Promise<number> {
  const ref = doc(firestore, 'users', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return 0;
  const data = snap.data() as { postStreak?: number; lastPostDate?: string; streaksEnabled?: boolean };
  if (data.streaksEnabled === false) return 0;
  const t = today();
  if (data.lastPostDate === t) return data.postStreak ?? 0;
  const newStreak = data.lastPostDate === yesterday() ? (data.postStreak ?? 0) + 1 : 1;
  await updateDoc(ref, { postStreak: newStreak, lastPostDate: t });
  return newStreak;
}

export const STREAK_MILESTONES = [7, 30, 100];

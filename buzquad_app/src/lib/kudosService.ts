import { addDoc, collection, doc, getDoc, getDocs, increment, limit, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { firestore } from './firestore';

export interface Kudos {
  id: string;
  fromUid: string;
  fromDisplayName: string;
  toUid: string;
  createdAt: unknown;
}

export interface CommunityAward {
  id: string;
  communityId: string;
  name: string;
  description?: string;
  emoji: string;
  recipientUid: string;
  grantedByUid: string;
  createdAt: unknown;
}

const DAILY_KUDOS_LIMIT = 5;

export async function sendKudos(fromUid: string, fromDisplayName: string, toUid: string): Promise<{ ok: boolean; reason?: string }> {
  if (fromUid === toUid) return { ok: false, reason: 'Cannot send kudos to yourself.' };
  const today = new Date().toISOString().slice(0, 10);
  const userRef = doc(firestore, 'users', fromUid);
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    const data = snap.data() as { kudosSentToday?: number; kudosSentDate?: string };
    if (data.kudosSentDate === today && (data.kudosSentToday ?? 0) >= DAILY_KUDOS_LIMIT) {
      return { ok: false, reason: `You've reached your daily limit of ${DAILY_KUDOS_LIMIT} kudos.` };
    }
  }
  await addDoc(collection(firestore, 'kudos'), { fromUid, fromDisplayName, toUid, createdAt: serverTimestamp() });
  await updateDoc(userRef, { kudosSentToday: increment(1), kudosSentDate: today });
  await updateDoc(doc(firestore, 'users', toUid), { kudosReceived: increment(1) });
  return { ok: true };
}

export async function getKudosReceived(uid: string): Promise<Kudos[]> {
  const q = query(collection(firestore, 'kudos'), where('toUid', '==', uid), orderBy('createdAt', 'desc'), limit(20));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Kudos, 'id'>) }));
}

export async function createCommunityAward(communityId: string, name: string, emoji: string, description: string, recipientUid: string, grantedByUid: string) {
  await addDoc(collection(firestore, 'community_awards'), {
    communityId, name, emoji, description, recipientUid, grantedByUid, createdAt: serverTimestamp(),
  });
}

export async function getCommunityAwards(uid: string): Promise<CommunityAward[]> {
  const q = query(collection(firestore, 'community_awards'), where('recipientUid', '==', uid), limit(20));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CommunityAward, 'id'>) }));
}

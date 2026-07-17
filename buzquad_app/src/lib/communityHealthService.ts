import {
  addDoc, collection, doc, getDocs, limit, onSnapshot,
  orderBy, query, serverTimestamp, updateDoc, where,
} from 'firebase/firestore';
import { firestore } from './firestore';

export interface HeldPost {
  id: string;
  communityId: string;
  authorUid: string;
  authorDisplayName: string;
  text: string;
  reason: 'word_filter' | 'spam' | 'reported';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: unknown;
}

export interface CommunityAutoModSettings {
  wordBlocklist: string[];
  newMemberCooldownHours: number; // 0 = disabled
  spamPostsPerMinute: number;     // 0 = disabled
}

/** Check if text contains blocked words. Returns matched word or null. */
export function checkWordBlocklist(text: string, blocklist: string[]): string | null {
  const lower = text.toLowerCase();
  return blocklist.find((w) => lower.includes(w.toLowerCase())) ?? null;
}

/** Submit a post to the held queue instead of publishing */
export async function holdPost(
  communityId: string,
  authorUid: string,
  authorDisplayName: string,
  text: string,
  reason: HeldPost['reason'],
): Promise<string> {
  const ref = await addDoc(collection(firestore, 'communities', communityId, 'held_posts'), {
    communityId, authorUid, authorDisplayName, text, reason,
    status: 'pending', createdAt: serverTimestamp(),
  });
  return ref.id;
}

export function listenToHeldPosts(communityId: string, cb: (posts: HeldPost[]) => void) {
  const q = query(
    collection(firestore, 'communities', communityId, 'held_posts'),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc'),
    limit(50),
  );
  return onSnapshot(q, (snap) =>
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<HeldPost, 'id'>) }))),
  );
}

export async function resolveHeldPost(
  communityId: string,
  postId: string,
  action: 'approved' | 'rejected',
  moderatorUid: string,
) {
  await updateDoc(doc(firestore, 'communities', communityId, 'held_posts', postId), {
    status: action, resolvedByUid: moderatorUid, resolvedAt: serverTimestamp(),
  });
}

/** Get auto-mod settings for a community (stored in community doc) */
export async function getAutoModSettings(communityId: string): Promise<CommunityAutoModSettings> {
  const snap = await getDocs(query(collection(firestore, 'communities'), where('__name__', '==', communityId)));
  if (snap.empty) return { wordBlocklist: [], newMemberCooldownHours: 0, spamPostsPerMinute: 0 };
  const data = snap.docs[0].data() as { autoMod?: CommunityAutoModSettings };
  return data.autoMod ?? { wordBlocklist: [], newMemberCooldownHours: 0, spamPostsPerMinute: 0 };
}

export async function saveAutoModSettings(communityId: string, settings: CommunityAutoModSettings) {
  await updateDoc(doc(firestore, 'communities', communityId), { autoMod: settings });
}

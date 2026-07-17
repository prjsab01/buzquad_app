import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { firestore } from './firestore';
import type { ActivityCategory, ActivityItem, ActivitySession, SessionMode } from '../types/activity';

// ── curated items ─────────────────────────────────────────────────────────────

export function listenToActivityItems(
  category: ActivityCategory,
  callback: (items: ActivityItem[]) => void,
  pageLimit = 30,
) {
  const q = query(
    collection(firestore, 'activity_items'),
    where('category', '==', category),
    orderBy('createdAt', 'desc'),
    limit(pageLimit),
  );
  return onSnapshot(q, (snap) => {
    callback(
      snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ActivityItem, 'id'>) })),
    );
  });
}

export async function addActivityItem(
  addedByUid: string,
  category: ActivityCategory,
  title: string,
  externalUrl: string,
  description?: string,
  thumbnailUrl?: string,
  author?: string,
  tags?: string[],
) {
  await addDoc(collection(firestore, 'activity_items'), {
    category,
    title,
    description: description ?? '',
    thumbnailUrl: thumbnailUrl ?? '',
    externalUrl,
    author: author ?? '',
    tags: tags ?? [],
    addedByUid,
    createdAt: serverTimestamp(),
  });
}

// ── sessions ──────────────────────────────────────────────────────────────────

export function listenToActiveSessions(
  category: ActivityCategory,
  callback: (sessions: ActivitySession[]) => void,
) {
  const q = query(
    collection(firestore, 'activity_sessions'),
    where('category', '==', category),
    where('active', '==', true),
    orderBy('createdAt', 'desc'),
    limit(20),
  );
  return onSnapshot(q, (snap) => {
    callback(
      snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ActivitySession, 'id'>) })),
    );
  });
}

export async function startSession(
  hostUid: string,
  hostDisplayName: string,
  itemId: string,
  itemTitle: string,
  category: ActivityCategory,
  mode: SessionMode,
): Promise<string> {
  const ref = await addDoc(collection(firestore, 'activity_sessions'), {
    itemId,
    itemTitle,
    category,
    hostUid,
    hostDisplayName,
    mode,
    participantUids: [hostUid],
    participantCount: 1,
    active: true,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function joinSession(sessionId: string, uid: string) {
  await updateDoc(doc(firestore, 'activity_sessions', sessionId), {
    participantUids: arrayUnion(uid),
    participantCount: increment(1),
  });
}

export async function endSession(sessionId: string) {
  await updateDoc(doc(firestore, 'activity_sessions', sessionId), { active: false });
}

import {
  addDoc,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  getDocs,
} from 'firebase/firestore';
import { firestore } from './firestore';
import type { AppNotification, NotificationType } from '../types/notification';

function notifCol(uid: string) {
  return collection(firestore, 'notifications', uid, 'items');
}

export function listenToNotifications(
  uid: string,
  callback: (notifs: AppNotification[]) => void,
  pageLimit = 30,
) {
  const q = query(notifCol(uid), orderBy('createdAt', 'desc'), limit(pageLimit));
  return onSnapshot(q, (snap) => {
    callback(
      snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AppNotification, 'id'>) })),
    );
  });
}

export function listenToUnreadCount(uid: string, callback: (count: number) => void) {
  const q = query(notifCol(uid), where('read', '==', false), limit(50));
  return onSnapshot(q, (snap) => callback(snap.size));
}

export async function markNotificationRead(uid: string, notifId: string) {
  await updateDoc(doc(firestore, 'notifications', uid, 'items', notifId), { read: true });
}

export async function markAllRead(uid: string) {
  const q = query(notifCol(uid), where('read', '==', false), limit(50));
  const snap = await getDocs(q);
  if (snap.empty) return;
  const batch = writeBatch(firestore);
  snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
  await batch.commit();
}

export async function createNotification(
  targetUid: string,
  type: NotificationType,
  text: string,
  opts: { fromUid?: string; fromDisplayName?: string; linkPath?: string } = {},
) {
  await addDoc(notifCol(targetUid), {
    type,
    text,
    fromUid: opts.fromUid ?? null,
    fromDisplayName: opts.fromDisplayName ?? null,
    linkPath: opts.linkPath ?? null,
    read: false,
    createdAt: serverTimestamp(),
  });
}

import {
  addDoc,
  collection,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  doc,
} from 'firebase/firestore';
import { firestore } from './firestore';
import type { BuzEvent, EventType } from '../types/event';

export function listenToEvents(
  callback: (events: BuzEvent[]) => void,
  pageLimit = 30,
) {
  const q = query(
    collection(firestore, 'events'),
    orderBy('startAt', 'asc'),
    limit(pageLimit),
  );
  return onSnapshot(q, (snap) => {
    callback(
      snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<BuzEvent, 'id'>) })),
    );
  });
}

export async function createEvent(
  hostUid: string,
  hostDisplayName: string,
  title: string,
  description: string,
  type: EventType,
  startAt: Date,
  timezone: string,
) {
  await addDoc(collection(firestore, 'events'), {
    title,
    description,
    type,
    hostUid,
    hostDisplayName,
    startAt: Timestamp.fromDate(startAt),
    timezone,
    rsvpCount: 0,
    createdAt: serverTimestamp(),
  });
}

export async function rsvpEvent(eventId: string) {
  await updateDoc(doc(firestore, 'events', eventId), {
    rsvpCount: increment(1),
  });
}

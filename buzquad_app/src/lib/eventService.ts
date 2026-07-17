import {
  addDoc,
  collection,
  doc,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { firestore } from './firestore';
import type { BuzEvent, EventType } from '../types/event';

export function listenToEventById(
  eventId: string,
  callback: (event: BuzEvent | null) => void,
) {
  return onSnapshot(doc(firestore, 'events', eventId), (snap) =>
    callback(snap.exists() ? { id: snap.id, ...(snap.data() as Omit<BuzEvent, 'id'>) } : null),
  );
}

export function listenToEventDiscussion(
  eventId: string,
  callback: (msgs: { id: string; authorDisplayName: string; text: string; createdAt: unknown }[]) => void,
) {
  const q = query(
    collection(firestore, 'events', eventId, 'discussion'),
    orderBy('createdAt', 'asc'),
    limit(100),
  );
  return onSnapshot(q, (snap) =>
    callback(snap.docs.map((d) => ({ id: d.id, ...(d.data() as { authorDisplayName: string; text: string; createdAt: unknown }) }))),
  );
}

export async function postEventMessage(
  eventId: string,
  authorUid: string,
  authorDisplayName: string,
  text: string,
) {
  await addDoc(collection(firestore, 'events', eventId, 'discussion'), {
    authorUid,
    authorDisplayName,
    text,
    createdAt: serverTimestamp(),
  });
}

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

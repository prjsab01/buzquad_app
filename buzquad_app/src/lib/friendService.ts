import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { firestore } from './firestore';

export type FriendRequestStatus = 'pending' | 'accepted' | 'rejected';

export interface FriendRequest {
  id: string;
  fromUid: string;
  fromDisplayName: string;
  toUid: string;
  status: FriendRequestStatus;
  createdAt: unknown;
}

export interface FriendEdge {
  uid: string;
  since: unknown;
}

// ── requests ──────────────────────────────────────────────────────────────────

export async function sendFriendRequest(
  fromUid: string,
  fromDisplayName: string,
  toUid: string,
): Promise<void> {
  await addDoc(collection(firestore, 'friend_requests'), {
    fromUid,
    fromDisplayName,
    toUid,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
}

/**
 * Accept a request *and* materialize the friendship on both sides
 * (`users/{a}/friends/{b}` and `users/{b}/friends/{a}`) in one batch.
 */
export async function acceptFriendRequest(requestId: string): Promise<void> {
  const reqRef = doc(firestore, 'friend_requests', requestId);
  const snap = await getDoc(reqRef);
  if (!snap.exists()) throw new Error('Friend request not found.');
  const data = snap.data() as Omit<FriendRequest, 'id'>;
  const { fromUid, toUid } = data;

  const batch = writeBatch(firestore);
  batch.update(reqRef, { status: 'accepted' });
  batch.set(doc(firestore, 'users', fromUid, 'friends', toUid), {
    uid: toUid,
    since: serverTimestamp(),
  });
  batch.set(doc(firestore, 'users', toUid, 'friends', fromUid), {
    uid: fromUid,
    since: serverTimestamp(),
  });
  await batch.commit();
}

export async function rejectFriendRequest(requestId: string): Promise<void> {
  await updateDoc(doc(firestore, 'friend_requests', requestId), { status: 'rejected' });
}

export async function cancelFriendRequest(requestId: string): Promise<void> {
  await deleteDoc(doc(firestore, 'friend_requests', requestId));
}

/** Listen to incoming pending requests for a user */
export function listenToIncomingRequests(
  uid: string,
  callback: (requests: FriendRequest[]) => void,
) {
  const q = query(
    collection(firestore, 'friend_requests'),
    where('toUid', '==', uid),
    where('status', '==', 'pending'),
  );
  return onSnapshot(q, (snap) =>
    callback(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FriendRequest, 'id'>) }))),
  );
}

/** Listen to outgoing pending requests from a user */
export function listenToOutgoingRequests(
  uid: string,
  callback: (requests: FriendRequest[]) => void,
) {
  const q = query(
    collection(firestore, 'friend_requests'),
    where('fromUid', '==', uid),
    where('status', '==', 'pending'),
  );
  return onSnapshot(q, (snap) =>
    callback(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FriendRequest, 'id'>) }))),
  );
}

// ── private circle (mutual friends) ───────────────────────────────────────────

/** Live list of a user's accepted friends. */
export function listenToFriends(uid: string, callback: (friends: FriendEdge[]) => void) {
  return onSnapshot(collection(firestore, 'users', uid, 'friends'), (snap) =>
    callback(snap.docs.map((d) => d.data() as FriendEdge)),
  );
}

/** One-shot fetch of friend UIDs. */
export async function getFriendUids(uid: string): Promise<string[]> {
  const snap = await getDocs(collection(firestore, 'users', uid, 'friends'));
  return snap.docs.map((d) => d.id);
}

/** Check whether two users are mutual friends (private circle members). */
export async function areFriends(a: string, b: string): Promise<boolean> {
  if (a === b) return true; // a user is always in their own circle
  const snap = await getDoc(doc(firestore, 'users', a, 'friends', b));
  return snap.exists();
}

/**
 * Live boolean: am I in this user's private circle (i.e. are we friends)?
 * Streams `users/{otherUid}/friends/{myUid}`.
 */
export function listenIsFriend(
  myUid: string,
  otherUid: string,
  callback: (isFriend: boolean) => void,
) {
  if (myUid === otherUid) {
    callback(true);
    return () => undefined;
  }
  return onSnapshot(doc(firestore, 'users', otherUid, 'friends', myUid), (snap) =>
    callback(snap.exists()),
  );
}

/** Symmetrically remove a friendship from both users' circles. */
export async function removeFriend(myUid: string, otherUid: string): Promise<void> {
  const batch = writeBatch(firestore);
  batch.delete(doc(firestore, 'users', myUid, 'friends', otherUid));
  batch.delete(doc(firestore, 'users', otherUid, 'friends', myUid));
  await batch.commit();
}

/**
 * Idempotent helper used to backfill a friendship if `acceptFriendRequest`
 * was called before this code shipped (legacy data: status === 'accepted'
 * but no `friends` subcollection entries).
 */
export async function ensureFriendEdges(a: string, b: string): Promise<void> {
  const batch = writeBatch(firestore);
  batch.set(doc(firestore, 'users', a, 'friends', b), { uid: b, since: serverTimestamp() });
  batch.set(doc(firestore, 'users', b, 'friends', a), { uid: a, since: serverTimestamp() });
  await batch.commit();
}

// Re-export for older imports that referenced setDoc directly.
export { setDoc };

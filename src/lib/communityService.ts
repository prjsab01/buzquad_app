import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { firestore } from './firestore';
import type { Community, CommunityMember } from '../types/community';

export function listenToCommunities(
  callback: (communities: Community[]) => void,
  pageLimit = 30,
) {
  const q = query(
    collection(firestore, 'communities'),
    orderBy('createdAt', 'desc'),
    limit(pageLimit),
  );
  return onSnapshot(q, (snap) => {
    callback(
      snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Community, 'id'>) })),
    );
  });
}

export async function createCommunity(
  ownerUid: string,
  name: string,
  description: string,
  type: Community['type'],
): Promise<string> {
  const ref = await addDoc(collection(firestore, 'communities'), {
    name,
    description,
    type,
    ownerUid,
    memberCount: 1,
    createdAt: serverTimestamp(),
  });
  await setDoc(doc(firestore, 'communities', ref.id, 'members', ownerUid), {
    uid: ownerUid,
    role: 'owner',
    joinedAt: serverTimestamp(),
  } satisfies Omit<CommunityMember, 'uid'> & { uid: string });
  return ref.id;
}

export async function joinCommunity(communityId: string, uid: string) {
  const memberRef = doc(firestore, 'communities', communityId, 'members', uid);
  const snap = await getDoc(memberRef);
  if (snap.exists()) return;
  await setDoc(memberRef, { uid, role: 'member', joinedAt: serverTimestamp() });
  await updateDoc(doc(firestore, 'communities', communityId), {
    memberCount: increment(1),
  });
}

export async function leaveCommunity(communityId: string, uid: string) {
  await deleteDoc(doc(firestore, 'communities', communityId, 'members', uid));
  await updateDoc(doc(firestore, 'communities', communityId), {
    memberCount: increment(-1),
  });
}

export async function getMembership(
  communityId: string,
  uid: string,
): Promise<CommunityMember | null> {
  const snap = await getDoc(
    doc(firestore, 'communities', communityId, 'members', uid),
  );
  return snap.exists() ? (snap.data() as CommunityMember) : null;
}

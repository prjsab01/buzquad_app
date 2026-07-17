import { ref, set, onValue, remove, get } from 'firebase/database';
import { rtdb } from './callService';

export interface Space {
  id: string;
  communityId: string;
  name: string;
  description?: string;
  topic?: string;
  mode: 'voice' | 'video' | 'activity';
  hostUid: string;
  hostDisplayName: string;
  participantCount: number;
  createdAt: number;
}

export interface SpaceParticipant {
  uid: string;
  displayName: string;
  listenOnly: boolean;
  joinedAt: number;
}

export function listenToSpaces(communityId: string, cb: (spaces: Space[]) => void) {
  const r = ref(rtdb, `spaces/${communityId}`);
  return onValue(r, (snap) => {
    if (!snap.exists()) { cb([]); return; }
    const val = snap.val() as Record<string, Omit<Space, 'id'>>;
    cb(Object.entries(val).map(([id, s]) => ({ id, ...s })));
  });
}

export async function createSpace(
  communityId: string,
  spaceId: string,
  data: Omit<Space, 'id' | 'participantCount' | 'createdAt'>,
) {
  await set(ref(rtdb, `spaces/${communityId}/${spaceId}`), {
    ...data,
    participantCount: 0,
    createdAt: Date.now(),
  });
}

export async function joinSpace(communityId: string, spaceId: string, uid: string, displayName: string, listenOnly = false) {
  await set(ref(rtdb, `spaces/${communityId}/${spaceId}/participants/${uid}`), {
    uid, displayName, listenOnly, joinedAt: Date.now(),
  });
  const countRef = ref(rtdb, `spaces/${communityId}/${spaceId}/participantCount`);
  const snap = await get(countRef);
  await set(countRef, (snap.val() ?? 0) + 1);
}

export async function leaveSpace(communityId: string, spaceId: string, uid: string) {
  await remove(ref(rtdb, `spaces/${communityId}/${spaceId}/participants/${uid}`));
  const countRef = ref(rtdb, `spaces/${communityId}/${spaceId}/participantCount`);
  const snap = await get(countRef);
  const newCount = Math.max(0, (snap.val() ?? 1) - 1);
  if (newCount === 0) {
    // Auto-close after last participant leaves
    await remove(ref(rtdb, `spaces/${communityId}/${spaceId}`));
  } else {
    await set(countRef, newCount);
  }
}

export async function closeSpace(communityId: string, spaceId: string) {
  await remove(ref(rtdb, `spaces/${communityId}/${spaceId}`));
}

export function listenToSpaceParticipants(communityId: string, spaceId: string, cb: (participants: SpaceParticipant[]) => void) {
  const r = ref(rtdb, `spaces/${communityId}/${spaceId}/participants`);
  return onValue(r, (snap) => {
    if (!snap.exists()) { cb([]); return; }
    const val = snap.val() as Record<string, SpaceParticipant>;
    cb(Object.values(val));
  });
}

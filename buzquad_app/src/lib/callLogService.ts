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
} from 'firebase/firestore';
import { firestore } from './firestore';

export type CallDirection = 'incoming' | 'outgoing';
export type CallStatus = 'completed' | 'missed' | 'declined' | 'failed' | 'in-progress';

export interface CallLog {
  id: string;
  peerUid: string;
  peerName: string;
  peerAvatar?: string | null;
  direction: CallDirection;
  status: CallStatus;
  roomId: string;
  startedAt: unknown;
  endedAt?: unknown;
  durationSec?: number;
}

function logCol(uid: string) {
  return collection(firestore, 'users', uid, 'call_logs');
}

/**
 * Create an in-progress call-log entry. Returns the doc id so the caller
 * can finalize it later with `finalizeCallLog`.
 */
export async function startCallLog(
  uid: string,
  data: Omit<CallLog, 'id' | 'startedAt' | 'status'> & { status?: CallStatus },
): Promise<string> {
  const ref = await addDoc(logCol(uid), {
    peerUid: data.peerUid,
    peerName: data.peerName,
    peerAvatar: data.peerAvatar ?? null,
    direction: data.direction,
    status: data.status ?? 'in-progress',
    roomId: data.roomId,
    startedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function finalizeCallLog(
  uid: string,
  logId: string,
  status: CallStatus,
  durationSec: number,
): Promise<void> {
  await updateDoc(doc(firestore, 'users', uid, 'call_logs', logId), {
    status,
    durationSec,
    endedAt: serverTimestamp(),
  });
}

/**
 * Convenience: log a terminal-state call in one shot (missed/declined/failed)
 * without the in-progress intermediate.
 */
export async function logTerminalCall(
  uid: string,
  data: Omit<CallLog, 'id' | 'startedAt' | 'status'> & { status: CallStatus },
): Promise<void> {
  await addDoc(logCol(uid), {
    peerUid: data.peerUid,
    peerName: data.peerName,
    peerAvatar: data.peerAvatar ?? null,
    direction: data.direction,
    status: data.status,
    roomId: data.roomId,
    durationSec: 0,
    startedAt: serverTimestamp(),
    endedAt: serverTimestamp(),
  });
}

export function listenCallLogs(
  uid: string,
  cb: (logs: CallLog[]) => void,
  pageLimit = 100,
) {
  const q = query(logCol(uid), orderBy('startedAt', 'desc'), limit(pageLimit));
  return onSnapshot(q, (snap) =>
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CallLog, 'id'>) }))),
  );
}

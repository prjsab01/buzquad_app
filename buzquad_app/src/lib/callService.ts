import {
  getDatabase,
  ref,
  set,
  onValue,
  push,
  remove,
  off,
  serverTimestamp,
  type DatabaseReference,
} from 'firebase/database';
import { firebaseApp } from './firebase';

export const rtdb = getDatabase(firebaseApp);

// Free public ICE servers — Google STUN + openrelay free TURN (no signup required).
// TURN is required for users behind symmetric NAT / corporate firewalls.
export const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:openrelay.metered.ca:80' },
  { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
];

// ── room helpers ──────────────────────────────────────────────────────────────

export function roomRef(roomId: string) {
  return ref(rtdb, `call_rooms/${roomId}`);
}

export function offerRef(roomId: string) {
  return ref(rtdb, `call_rooms/${roomId}/offer`);
}

export function answerRef(roomId: string) {
  return ref(rtdb, `call_rooms/${roomId}/answer`);
}

export function callerCandidatesRef(roomId: string) {
  return ref(rtdb, `call_rooms/${roomId}/callerCandidates`);
}

export function calleeCandidatesRef(roomId: string) {
  return ref(rtdb, `call_rooms/${roomId}/calleeCandidates`);
}

export function incomingCallRef(uid: string) {
  return ref(rtdb, `incoming_calls/${uid}`);
}

// ── signaling writes ──────────────────────────────────────────────────────────

export async function writeOffer(
  roomId: string,
  callerUid: string,
  calleeUid: string,
  offer: RTCSessionDescriptionInit,
) {
  await set(roomRef(roomId), {
    callerUid,
    calleeUid,
    offer: { type: offer.type, sdp: offer.sdp },
    createdAt: Date.now(),
  });
}

export async function writeAnswer(roomId: string, answer: RTCSessionDescriptionInit) {
  await set(answerRef(roomId), { type: answer.type, sdp: answer.sdp });
}

export async function addIceCandidate(
  candidatesRef: DatabaseReference,
  candidate: RTCIceCandidateInit,
) {
  await push(candidatesRef, {
    candidate: candidate.candidate,
    sdpMid: candidate.sdpMid,
    sdpMLineIndex: candidate.sdpMLineIndex,
  });
}

export async function cleanupRoom(roomId: string) {
  await remove(roomRef(roomId));
}

// ── incoming-call invite (separate from room signaling so callee can listen globally) ─

export interface IncomingCallInvite {
  roomId: string;
  fromUid: string;
  fromName: string;
  fromAvatar?: string | null;
  createdAt: number | object;
}

export async function inviteToCall(
  toUid: string,
  roomId: string,
  fromUid: string,
  fromName: string,
  fromAvatar?: string | null,
) {
  await set(incomingCallRef(toUid), {
    roomId,
    fromUid,
    fromName,
    fromAvatar: fromAvatar ?? null,
    createdAt: serverTimestamp(),
  });
}

export async function clearIncomingCall(uid: string) {
  await remove(incomingCallRef(uid));
}

export function listenIncomingCall(uid: string, cb: (invite: IncomingCallInvite | null) => void) {
  const r = incomingCallRef(uid);
  onValue(r, (snap) => {
    cb(snap.exists() ? (snap.val() as IncomingCallInvite) : null);
  });
  return () => off(r);
}

// ── signaling listeners ───────────────────────────────────────────────────────

export function onOffer(
  roomId: string,
  callback: (offer: RTCSessionDescriptionInit) => void,
) {
  const r = offerRef(roomId);
  onValue(r, (snap) => {
    if (snap.exists()) callback(snap.val() as RTCSessionDescriptionInit);
  });
  return () => off(r);
}

export function onAnswer(
  roomId: string,
  callback: (answer: RTCSessionDescriptionInit) => void,
) {
  const r = answerRef(roomId);
  onValue(r, (snap) => {
    if (snap.exists()) callback(snap.val() as RTCSessionDescriptionInit);
  });
  return () => off(r);
}

export function onRemoteCandidates(
  candidatesRef: DatabaseReference,
  callback: (candidate: RTCIceCandidateInit) => void,
) {
  const seen = new Set<string>();
  onValue(candidatesRef, (snap) => {
    if (!snap.exists()) return;
    snap.forEach((child) => {
      if (!seen.has(child.key!)) {
        seen.add(child.key!);
        callback(child.val() as RTCIceCandidateInit);
      }
    });
  });
  return () => off(candidatesRef);
}

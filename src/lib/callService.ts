import {
  getDatabase,
  ref,
  set,
  onValue,
  push,
  remove,
  off,
  type DatabaseReference,
} from 'firebase/database';
import { firebaseApp } from './firebase';

export const rtdb = getDatabase(firebaseApp);

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

// ── signaling listeners ───────────────────────────────────────────────────────

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

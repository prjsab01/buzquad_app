import {
  ref,
  set,
  onValue,
  onDisconnect,
  serverTimestamp,
  off,
  remove,
} from 'firebase/database';
import { rtdb } from './callService';

export interface UserStatus {
  emoji?: string;
  text?: string;
  expiresAt?: number; // unix ms, 0 = indefinite
}

// ── presence ──────────────────────────────────────────────────────────────────

export function goOnline(uid: string) {
  const presenceRef = ref(rtdb, `presence/${uid}`);
  set(presenceRef, { online: true, lastSeen: serverTimestamp() });
  onDisconnect(presenceRef).set({ online: false, lastSeen: serverTimestamp() });
}

export function goOffline(uid: string) {
  const presenceRef = ref(rtdb, `presence/${uid}`);
  set(presenceRef, { online: false, lastSeen: serverTimestamp() });
}

export function listenToPresence(
  uid: string,
  callback: (online: boolean) => void,
) {
  const presenceRef = ref(rtdb, `presence/${uid}`);
  onValue(presenceRef, (snap) => {
    callback(snap.exists() ? (snap.val().online as boolean) : false);
  });
  return () => off(presenceRef);
}

// ── custom status ─────────────────────────────────────────────────────────────

export function setUserStatus(uid: string, status: UserStatus | null) {
  const statusRef = ref(rtdb, `status/${uid}`);
  if (!status) {
    remove(statusRef);
  } else {
    set(statusRef, status);
  }
}

export function listenToUserStatus(
  uid: string,
  callback: (status: UserStatus | null) => void,
) {
  const statusRef = ref(rtdb, `status/${uid}`);
  onValue(statusRef, (snap) => {
    if (!snap.exists()) { callback(null); return; }
    const val = snap.val() as UserStatus;
    // Clear expired status
    if (val.expiresAt && val.expiresAt > 0 && Date.now() > val.expiresAt) {
      remove(statusRef);
      callback(null);
    } else {
      callback(val);
    }
  });
  return () => off(statusRef);
}

// ── typing indicators ─────────────────────────────────────────────────────────

export function setTyping(conversationId: string, uid: string, isTyping: boolean) {
  const typingRef = ref(rtdb, `typing/${conversationId}/${uid}`);
  if (isTyping) {
    set(typingRef, true);
    onDisconnect(typingRef).remove();
  } else {
    remove(typingRef);
  }
}

export function listenToTyping(
  conversationId: string,
  myUid: string,
  callback: (someoneTyping: boolean) => void,
) {
  const typingRef = ref(rtdb, `typing/${conversationId}`);
  onValue(typingRef, (snap) => {
    if (!snap.exists()) { callback(false); return; }
    const typists = snap.val() as Record<string, boolean>;
    callback(Object.keys(typists).some((uid) => uid !== myUid && typists[uid]));
  });
  return () => off(typingRef);
}

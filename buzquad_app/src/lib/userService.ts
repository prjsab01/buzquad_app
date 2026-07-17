import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
  runTransaction,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { firestore } from './firestore';
import type { UserProfile } from '../types/user';

const RESERVED_USERNAMES = new Set([
  'admin',
  'root',
  'support',
  'system',
  'firebase',
  'auth',
  'api',
  'app',
  'login',
  'logout',
  'help',
  'about',
  'contact',
  'settings',
]);

const usernamePattern = /^[a-z0-9_.]{3,20}$/;

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

export function validateUsername(value: string) {
  const username = normalizeUsername(value);

  if (!username) {
    return { valid: false, message: 'Username is required.' };
  }

  if (!usernamePattern.test(username)) {
    return {
      valid: false,
      message: 'Username must be 3–20 characters and may include letters, numbers, underscores, and dots only.',
    };
  }

  if (RESERVED_USERNAMES.has(username)) {
    return { valid: false, message: 'This username is reserved. Please choose another one.' };
  }

  if (username.startsWith('.') || username.endsWith('.')) {
    return { valid: false, message: 'Username cannot start or end with a dot.' };
  }

  if (username.includes('..')) {
    return { valid: false, message: 'Username cannot contain consecutive dots.' };
  }

  return { valid: true };
}

export async function isUsernameAvailable(username: string) {
  const normalized = normalizeUsername(username);
  if (!normalized) {
    return false;
  }

  const docRef = doc(firestore, 'usernames', normalized);
  const snapshot = await getDoc(docRef);
  return !snapshot.exists();
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const docRef = doc(firestore, 'users', uid);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as UserProfile;
}

// ── follow / unfollow ────────────────────────────────────────────────────────

export async function followUser(fromUid: string, toUid: string) {
  await setDoc(doc(firestore, 'follows', `${fromUid}_${toUid}`), {
    fromUid,
    toUid,
    createdAt: serverTimestamp(),
  });
}

export async function unfollowUser(fromUid: string, toUid: string) {
  await deleteDoc(doc(firestore, 'follows', `${fromUid}_${toUid}`));
}

export async function isFollowing(fromUid: string, toUid: string): Promise<boolean> {
  const snap = await getDoc(doc(firestore, 'follows', `${fromUid}_${toUid}`));
  return snap.exists();
}

export function listenToFollowerCount(
  uid: string,
  callback: (count: number) => void,
) {
  const q = query(collection(firestore, 'follows'), where('toUid', '==', uid));
  return onSnapshot(q, (snap) => callback(snap.size));
}

export async function claimUsername(
  uid: string,
  username: string,
  profile: Partial<UserProfile>,
): Promise<void> {
  const normalizedUsername = normalizeUsername(username);
  const usernameRef = doc(firestore, 'usernames', normalizedUsername);
  const userRef = doc(firestore, 'users', uid);

  await runTransaction(firestore, async (transaction) => {
    const usernameSnapshot = await transaction.get(usernameRef);
    const userSnapshot = await transaction.get(userRef);

    const existingProfile = userSnapshot.exists() ? (userSnapshot.data() as UserProfile) : null;

    if (usernameSnapshot.exists()) {
      const existingUid = usernameSnapshot.data().uid as string;
      if (existingUid !== uid) {
        throw new Error('Username is already claimed by another user.');
      }
    }

    if (existingProfile && existingProfile.username && existingProfile.username !== normalizedUsername) {
      const previousUsernameRef = doc(firestore, 'usernames', existingProfile.username);
      transaction.delete(previousUsernameRef);
    }

    transaction.set(usernameRef, {
      uid,
      createdAt: serverTimestamp(),
    });

    transaction.set(userRef, {
      uid,
      username: normalizedUsername,
      displayName: profile.displayName || '',
      bio: profile.bio || '',
      pronouns: profile.pronouns || '',
      location: profile.location || '',
      avatarUrl: profile.avatarUrl || '',
      createdAt: existingProfile?.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
}

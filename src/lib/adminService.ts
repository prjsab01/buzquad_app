import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore';
import { firestore } from './firestore';
import type { UserProfile } from '../types/user';

export interface AdminUser extends UserProfile {
  suspended?: boolean;
}

export async function listUsers(pageLimit = 50): Promise<AdminUser[]> {
  const q = query(
    collection(firestore, 'users'),
    orderBy('createdAt', 'desc'),
    limit(pageLimit),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as unknown as AdminUser));
}

export async function setUserSuspended(uid: string, suspended: boolean) {
  await updateDoc(doc(firestore, 'users', uid), { suspended });
}

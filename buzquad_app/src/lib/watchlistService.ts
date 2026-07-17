import { addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { firestore } from './firestore';

export type WatchlistItemStatus = 'want' | 'in-progress' | 'done';
export type WatchlistItemType = 'movie' | 'book' | 'series' | 'game' | 'other';

export interface WatchlistItem {
  id: string;
  title: string;
  coverUrl?: string;
  type: WatchlistItemType;
  addedByUid: string;
  addedByName: string;
  status: WatchlistItemStatus;
  rating?: number;
  notes?: string;
  createdAt: unknown;
}

export interface Watchlist {
  id: string;
  name: string;
  ownerUid: string;
  memberUids: string[];
  visibility: 'private' | 'shared' | 'public';
  createdAt: unknown;
}

export async function createWatchlist(ownerUid: string, name: string, visibility: Watchlist['visibility'] = 'private'): Promise<string> {
  const ref = await addDoc(collection(firestore, 'watchlists'), {
    name, ownerUid, memberUids: [ownerUid], visibility, createdAt: serverTimestamp(),
  });
  return ref.id;
}

export function listenToMyWatchlists(uid: string, cb: (lists: Watchlist[]) => void) {
  const q = query(collection(firestore, 'watchlists'), where('memberUids', 'array-contains', uid));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Watchlist, 'id'>) }))));
}

export function listenToWatchlistItems(listId: string, cb: (items: WatchlistItem[]) => void) {
  const q = query(collection(firestore, 'watchlists', listId, 'items'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<WatchlistItem, 'id'>) }))));
}

export async function addWatchlistItem(listId: string, item: Omit<WatchlistItem, 'id' | 'createdAt'>) {
  await addDoc(collection(firestore, 'watchlists', listId, 'items'), { ...item, createdAt: serverTimestamp() });
}

export async function updateWatchlistItem(listId: string, itemId: string, patch: Partial<WatchlistItem>) {
  await updateDoc(doc(firestore, 'watchlists', listId, 'items', itemId), patch);
}

export async function deleteWatchlistItem(listId: string, itemId: string) {
  await deleteDoc(doc(firestore, 'watchlists', listId, 'items', itemId));
}

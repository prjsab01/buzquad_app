import {
  addDoc,
  collection,
  doc,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { firestore } from './firestore';
import type { Poll, PollType } from '../types/poll';

export function listenToPolls(
  callback: (polls: Poll[]) => void,
  pageLimit = 30,
) {
  const q = query(
    collection(firestore, 'polls'),
    orderBy('createdAt', 'desc'),
    limit(pageLimit),
  );
  return onSnapshot(q, (snap) => {
    callback(
      snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Poll, 'id'>) })),
    );
  });
}

export async function createPoll(
  authorUid: string,
  authorDisplayName: string,
  question: string,
  type: PollType,
  optionTexts: string[],
) {
  const options = optionTexts.map((text, i) => ({
    id: String(i),
    text,
    voteCount: 0,
  }));
  await addDoc(collection(firestore, 'polls'), {
    question,
    type,
    options,
    authorUid,
    authorDisplayName,
    totalVotes: 0,
    createdAt: serverTimestamp(),
  });
}

export async function votePoll(pollId: string, optionId: string) {
  const pollRef = doc(firestore, 'polls', pollId);
  // Firestore doesn't support updating nested array items by id directly,
  // so we use a map field approach via dot notation on the options array index.
  await updateDoc(pollRef, {
    [`options.${optionId}.voteCount`]: increment(1),
    totalVotes: increment(1),
  });
}

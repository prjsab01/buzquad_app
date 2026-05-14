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
  increment,
} from 'firebase/firestore';
import { firestore } from './firestore';
import type { Post } from '../types/post';

export function listenToPublicFeed(
  callback: (posts: Post[]) => void,
  pageLimit = 30,
) {
  const q = query(
    collection(firestore, 'posts'),
    orderBy('createdAt', 'desc'),
    limit(pageLimit),
  );

  return onSnapshot(q, (snapshot) => {
    const posts = snapshot.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        authorUid: data.authorUid as string,
        authorUsername: data.authorUsername as string,
        authorDisplayName: data.authorDisplayName as string,
        text: data.text as string,
        createdAt: data.createdAt ?? null,
        likeCount: (data.likeCount as number) ?? 0,
      } satisfies Post;
    });
    callback(posts);
  });
}

export async function createPost(
  authorUid: string,
  authorUsername: string,
  authorDisplayName: string,
  text: string,
) {
  await addDoc(collection(firestore, 'posts'), {
    authorUid,
    authorUsername,
    authorDisplayName,
    text,
    createdAt: serverTimestamp(),
    likeCount: 0,
  });
}

export async function likePost(postId: string) {
  await updateDoc(doc(firestore, 'posts', postId), {
    likeCount: increment(1),
  });
}

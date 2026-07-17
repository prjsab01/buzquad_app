import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  increment,
  where,
  runTransaction,
} from 'firebase/firestore';
import { firestore } from './firestore';
import type { Post } from '../types/post';

export interface PostComment {
  id: string;
  authorUid: string;
  authorDisplayName: string;
  text: string;
  createdAt: unknown;
}

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
        commentCount: (data.commentCount as number) ?? 0,
        imageUrl: data.imageUrl as string | undefined,
        reactions: data.reactions as Record<string, Record<string, boolean>> | undefined,
        linkPreview: data.linkPreview as import('../types/post').LinkPreview | undefined,
        tags: data.tags as string[] | undefined,
        contentWarning: data.contentWarning as string | undefined,
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
  imageUrl?: string,
  linkPreview?: import('../types/post').LinkPreview,
  contentWarning?: string,
  tags?: string[],
) {
  await addDoc(collection(firestore, 'posts'), {
    authorUid,
    authorUsername,
    authorDisplayName,
    text,
    ...(imageUrl ? { imageUrl } : {}),
    ...(linkPreview ? { linkPreview } : {}),
    ...(contentWarning ? { contentWarning } : {}),
    ...(tags && tags.length ? { tags } : {}),
    createdAt: serverTimestamp(),
    likeCount: 0,
  });
}

export async function likePost(postId: string) {
  await updateDoc(doc(firestore, 'posts', postId), {
    likeCount: increment(1),
  });
}

/** Increment post view count in RTDB (free-tier safe, ephemeral counter) */
export function recordPostView(postId: string, uid: string) {
  import('./callService').then(({ rtdb }) => {
    import('firebase/database').then(({ ref, runTransaction }) => {
      const viewRef = ref(rtdb, `post_views/${postId}/${uid}`);
      runTransaction(viewRef, (current) => (current === null ? true : current));
    });
  });
}

/** Get approximate view count for a post from RTDB (author-only use) */
export async function getPostViewCount(postId: string): Promise<number> {
  const { rtdb } = await import('./callService');
  const { ref, get } = await import('firebase/database');
  const snap = await get(ref(rtdb, `post_views/${postId}`));
  if (!snap.exists()) return 0;
  return Object.keys(snap.val() as Record<string, boolean>).length;
}

/** Toggle an emoji reaction on a post. Reactions stored as reactions.<emoji>.<uid> = true */
export async function toggleReaction(postId: string, uid: string, emoji: string) {
  const postRef = doc(firestore, 'posts', postId);
  await runTransaction(firestore, async (tx) => {
    const snap = await tx.get(postRef);
    if (!snap.exists()) return;
    const reactions = (snap.data().reactions ?? {}) as Record<string, Record<string, boolean>>;
    const emojiMap = reactions[emoji] ?? {};
    if (emojiMap[uid]) {
      delete emojiMap[uid];
    } else {
      emojiMap[uid] = true;
    }
    if (Object.keys(emojiMap).length === 0) {
      delete reactions[emoji];
    } else {
      reactions[emoji] = emojiMap;
    }
    tx.update(postRef, { reactions });
  });
}

/** Fetch a link preview via the OG Worker (if configured) */
export async function fetchLinkPreview(url: string): Promise<{
  title?: string; description?: string; image?: string; favicon?: string; domain?: string;
} | null> {
  const workerUrl = import.meta.env.VITE_OG_WORKER_URL as string | undefined;
  if (!workerUrl) return null;
  try {
    const res = await fetch(`${workerUrl}?url=${encodeURIComponent(url)}`);
    if (!res.ok) return null;
    return await res.json() as { title?: string; description?: string; image?: string; favicon?: string; domain?: string; };
  } catch {
    return null;
  }
}

/** Fetch posts from a list of followed UIDs (client-side, free-tier safe, max 10 UIDs per query) */
export async function fetchFollowingFeed(
  followedUids: string[],
  pageLimit = 30,
): Promise<Post[]> {
  if (followedUids.length === 0) return [];
  // Firestore `in` supports up to 30 values
  const chunks: string[][] = [];
  for (let i = 0; i < followedUids.length; i += 30) chunks.push(followedUids.slice(i, i + 30));
  const results = await Promise.all(
    chunks.map((chunk) =>
      getDocs(query(
        collection(firestore, 'posts'),
        where('authorUid', 'in', chunk),
        orderBy('createdAt', 'desc'),
        limit(pageLimit),
      )),
    ),
  );
  const posts: Post[] = results.flatMap((snap) =>
    snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Post, 'id'>) })),
  );
  posts.sort((a, b) => {
    const ta = (a.createdAt as { seconds: number } | null)?.seconds ?? 0;
    const tb = (b.createdAt as { seconds: number } | null)?.seconds ?? 0;
    return tb - ta;
  });
  return posts.slice(0, pageLimit);
}

export async function addComment(
  postId: string,
  authorUid: string,
  authorDisplayName: string,
  text: string,
) {
  await addDoc(collection(firestore, 'posts', postId, 'comments'), {
    authorUid,
    authorDisplayName,
    text,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(firestore, 'posts', postId), { commentCount: increment(1) });
}

export function listenToComments(
  postId: string,
  callback: (comments: PostComment[]) => void,
) {
  const q = query(
    collection(firestore, 'posts', postId, 'comments'),
    orderBy('createdAt', 'asc'),
    limit(50),
  );
  return onSnapshot(q, (snap) =>
    callback(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PostComment, 'id'>) }))),
  );
}

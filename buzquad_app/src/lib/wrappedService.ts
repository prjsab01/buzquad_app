import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { firestore } from './firestore';
import type { UserProfile } from '../types/user';

export interface WrappedData {
  year: number;
  totalPosts: number;
  totalReactionsReceived: number;
  mostUsedReactionGiven: string;
  topCommunity: string;
  longestStreak: number;
  eventsAttended: number;
  kudosReceived: number;
  firstPostDate: string | null;
  mostLikedPostText: string | null;
  mostLikedPostLikes: number;
}

export async function generateWrapped(uid: string, profile: UserProfile, year: number): Promise<WrappedData> {
  const yearStart = new Date(`${year}-01-01`).getTime() / 1000;
  const yearEnd   = new Date(`${year}-12-31T23:59:59`).getTime() / 1000;

  // Posts this year
  const postsSnap = await getDocs(query(
    collection(firestore, 'posts'),
    where('authorUid', '==', uid),
    orderBy('createdAt', 'asc'),
    limit(200),
  ));
  const posts = postsSnap.docs
    .map((d) => ({ id: d.id, ...d.data() as { text: string; likeCount: number; reactions?: Record<string, Record<string, boolean>>; createdAt: { seconds: number } } }))
    .filter((p) => p.createdAt?.seconds >= yearStart && p.createdAt?.seconds <= yearEnd);

  const totalPosts = posts.length;
  const firstPost = posts[0];
  const mostLiked = posts.reduce((best, p) => p.likeCount > (best?.likeCount ?? 0) ? p : best, posts[0]);

  // Reactions received
  const totalReactionsReceived = posts.reduce((sum, p) => {
    return sum + Object.values(p.reactions ?? {}).reduce((s, uids) => s + Object.keys(uids).length, 0);
  }, 0);

  // Most used reaction given (from all posts reactions where uid is in the map)
  const reactionCounts: Record<string, number> = {};
  const allPostsSnap = await getDocs(query(collection(firestore, 'posts'), limit(100)));
  allPostsSnap.docs.forEach((d) => {
    const reactions = (d.data().reactions ?? {}) as Record<string, Record<string, boolean>>;
    Object.entries(reactions).forEach(([emoji, uids]) => {
      if (uids[uid]) reactionCounts[emoji] = (reactionCounts[emoji] ?? 0) + 1;
    });
  });
  const mostUsedReactionGiven = Object.entries(reactionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '❤️';

  // Events attended (RSVPs)
  const rsvpSnap = await getDocs(query(collection(firestore, 'events'), limit(50)));
  const eventsAttended = rsvpSnap.docs.filter((d) => {
    const data = d.data() as { rsvpUids?: string[] };
    return data.rsvpUids?.includes(uid);
  }).length;

  return {
    year,
    totalPosts,
    totalReactionsReceived,
    mostUsedReactionGiven,
    topCommunity: '—',
    longestStreak: profile.loginStreak ?? 0,
    eventsAttended,
    kudosReceived: profile.kudosReceived ?? 0,
    firstPostDate: firstPost?.createdAt ? new Date(firstPost.createdAt.seconds * 1000).toLocaleDateString() : null,
    mostLikedPostText: mostLiked?.text ? mostLiked.text.replace(/<[^>]+>/g, '').slice(0, 80) : null,
    mostLikedPostLikes: mostLiked?.likeCount ?? 0,
  };
}

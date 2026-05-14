import type { Timestamp } from 'firebase/firestore';

export interface Post {
  id: string;
  authorUid: string;
  authorUsername: string;
  authorDisplayName: string;
  text: string;
  createdAt: Timestamp | null;
  likeCount: number;
}

import type { Timestamp } from 'firebase/firestore';

export interface LinkPreview {
  title?: string;
  description?: string;
  image?: string;
  favicon?: string;
  domain?: string;
}

export interface Post {
  id: string;
  authorUid: string;
  authorUsername: string;
  authorDisplayName: string;
  text: string;
  imageUrl?: string;
  linkPreview?: LinkPreview;
  reactions?: Record<string, Record<string, boolean>>;
  createdAt: Timestamp | null;
  likeCount: number;
  commentCount?: number;
  tags?: string[];
  contentWarning?: string;
}

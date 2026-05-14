export type ActivityCategory =
  | 'books'
  | 'movies'
  | 'reels'
  | 'series'
  | 'music'
  | 'games'
  | 'podcasts';

export interface ActivityItem {
  id: string;
  category: ActivityCategory;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  externalUrl: string;       // YouTube link, Odysee link, PDF link, game URL, etc.
  author?: string;           // book author, channel name, artist, etc.
  tags?: string[];
  addedByUid: string;        // admin who curated this
  createdAt: unknown;
}

export type SessionMode = 'solo' | '1:1' | 'group' | 'circle' | 'community';

export interface ActivitySession {
  id: string;
  itemId: string;
  itemTitle: string;
  category: ActivityCategory;
  hostUid: string;
  hostDisplayName: string;
  mode: SessionMode;
  participantUids: string[];
  participantCount: number;
  active: boolean;
  createdAt: unknown;
}

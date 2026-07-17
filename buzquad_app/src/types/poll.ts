export type PollType = 'single' | 'multiple' | 'yesno';

export interface PollOption {
  id: string;
  text: string;
  voteCount: number;
}

export interface Poll {
  id: string;
  question: string;
  type: PollType;
  options: PollOption[];
  authorUid: string;
  authorDisplayName: string;
  communityId?: string;
  expiresAt?: unknown;
  totalVotes: number;
  createdAt: unknown;
}

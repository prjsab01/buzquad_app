export type CommunityType = 'public' | 'private' | 'invite-only';

export interface Community {
  id: string;
  name: string;
  description: string;
  type: CommunityType;
  ownerUid: string;
  memberCount: number;
  createdAt: unknown;
}

export interface CommunityMember {
  uid: string;
  role: 'owner' | 'admin' | 'moderator' | 'member';
  joinedAt: unknown;
}

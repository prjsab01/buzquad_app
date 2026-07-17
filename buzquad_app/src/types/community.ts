export type CommunityType = 'public' | 'private' | 'invite-only';
export type CommunityKind = 'community' | 'group' | 'channel';

export interface Community {
  id: string;
  name: string;
  description: string;
  type: CommunityType;
  kind: CommunityKind;
  ownerUid: string;
  memberCount: number;
  createdAt: unknown;
  autoMod?: {
    wordBlocklist: string[];
    newMemberCooldownHours: number;
    spamPostsPerMinute: number;
  };
}

export interface CommunityMember {
  uid: string;
  role: 'owner' | 'admin' | 'moderator' | 'member';
  joinedAt: unknown;
}

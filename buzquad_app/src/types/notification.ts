export type NotificationType =
  | 'follow'
  | 'friend_request'
  | 'mention'
  | 'reply'
  | 'reaction'
  | 'event_invite'
  | 'poll_vote'
  | 'community_invite'
  | 'call_invite'
  | 'system';

export interface AppNotification {
  id: string;
  type: NotificationType;
  fromUid?: string;
  fromDisplayName?: string;
  text: string;
  linkPath?: string;
  read: boolean;
  createdAt: unknown;
}

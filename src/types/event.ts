export type EventType = 'meeting' | 'watch-party' | 'study' | 'gaming' | 'ama' | 'other';

export interface BuzEvent {
  id: string;
  title: string;
  description: string;
  type: EventType;
  hostUid: string;
  hostDisplayName: string;
  startAt: unknown;
  timezone: string;
  communityId?: string;
  rsvpCount: number;
  createdAt: unknown;
}

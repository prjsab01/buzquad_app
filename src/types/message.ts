import type { Timestamp } from 'firebase/firestore';

export interface Message {
  id: string;
  conversationId: string;
  senderUid: string;
  text: string;
  sentAt: Timestamp | null;
}

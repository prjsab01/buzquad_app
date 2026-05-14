import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { firestore } from './firestore';
import { normalizeUsername } from './userService';
import type { Message } from '../types/message';

export interface ConversationSummary {
  id: string;
  members: string[];
  updatedAt: unknown;
  lastMessage?: string;
  partnerDisplayName?: string;
  partnerUsername?: string;
}

export function buildConversationId(uidA: string, uidB: string) {
  return [uidA, uidB].sort().join('_');
}

export async function createOrGetConversation(uid: string, participantUid: string) {
  const conversationId = buildConversationId(uid, participantUid);
  const conversationRef = doc(firestore, 'conversations', conversationId);
  const snapshot = await getDoc(conversationRef);

  if (!snapshot.exists()) {
    await setDoc(conversationRef, {
      id: conversationId,
      members: [uid, participantUid],
      updatedAt: serverTimestamp(),
    });
  }

  return conversationId;
}

export async function findUidByUsername(username: string) {
  const normalizedUsername = normalizeUsername(username);
  const usernameRef = doc(firestore, 'usernames', normalizedUsername);
  const snapshot = await getDoc(usernameRef);

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data().uid as string;
}

export function listenToUserConversations(uid: string, callback: (conversations: ConversationSummary[]) => void) {
  const conversationsQuery = query(
    collection(firestore, 'conversations'),
    where('members', 'array-contains', uid),
    orderBy('updatedAt', 'desc'),
  );

  return onSnapshot(conversationsQuery, async (snapshot) => {
    const list: ConversationSummary[] = await Promise.all(
      snapshot.docs.map(async (docSnapshot) => {
        const data = docSnapshot.data() as { members: string[]; updatedAt: unknown; lastMessage?: string };
        const partnerUid = data.members.find((m) => m !== uid);
        let partnerDisplayName: string | undefined;
        let partnerUsername: string | undefined;
        if (partnerUid) {
          const partnerSnap = await getDoc(doc(firestore, 'users', partnerUid));
          if (partnerSnap.exists()) {
            const p = partnerSnap.data() as { displayName?: string; username?: string };
            partnerDisplayName = p.displayName;
            partnerUsername = p.username;
          }
        }
        return {
          id: docSnapshot.id,
          members: data.members,
          updatedAt: data.updatedAt,
          lastMessage: data.lastMessage,
          partnerDisplayName,
          partnerUsername,
        };
      }),
    );
    callback(list);
  });
}

export function listenToConversationMessages(conversationId: string, callback: (messages: Message[]) => void) {
  const conversationRef = doc(firestore, 'conversations', conversationId);
  const messagesQuery = query(collection(conversationRef, 'messages'), orderBy('sentAt', 'asc'));

  return onSnapshot(messagesQuery, (snapshot) => {
    const messages = snapshot.docs.map((docSnapshot) => {
      const data = docSnapshot.data();
      return {
        id: docSnapshot.id,
        conversationId,
        senderUid: data.senderUid as string,
        text: data.text as string,
        sentAt: data.sentAt ?? null,
      };
    });

    callback(messages);
  });
}

export async function sendMessage(conversationId: string, senderUid: string, text: string) {
  const conversationRef = doc(firestore, 'conversations', conversationId);
  const messagesRef = collection(conversationRef, 'messages');

  await addDoc(messagesRef, {
    senderUid,
    text,
    sentAt: serverTimestamp(),
  });

  await updateDoc(conversationRef, {
    updatedAt: serverTimestamp(),
    lastMessage: text.length > 60 ? text.slice(0, 60) + '…' : text,
  });
}

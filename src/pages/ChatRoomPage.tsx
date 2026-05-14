import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';
import { listenToConversationMessages, sendMessage } from '../lib/messageService';
import type { Message } from '../types/message';

export default function ChatRoomPage() {
  const { user, loading } = useFirebaseAuth();
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messageEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!conversationId || !user) {
      return;
    }

    const unsubscribe = listenToConversationMessages(conversationId, setMessages);
    return () => unsubscribe();
  }, [conversationId, user]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (loading) {
    return (
      <section className="mx-auto max-w-5xl p-6">
        <p className="text-slate-600">Loading chat…</p>
      </section>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!conversationId) {
    navigate('/inbox');
    return null;
  }

  const handleSend = async () => {
    const trimmed = newMessage.trim();
    if (!trimmed) {
      return;
    }

    setSending(true);
    try {
      await sendMessage(conversationId, user.uid, trimmed);
      setNewMessage('');
    } catch (sendError) {
      console.error(sendError);
    } finally {
      setSending(false);
    }
  };

  const partnerLabel = useMemo(() => {
    const parts = conversationId?.split('_') ?? [];
    return parts.filter((part) => part !== user.uid).join(', ') || 'Chat';
  }, [conversationId, user.uid]);

  return (
    <section className="mx-auto max-w-5xl p-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-3xl font-semibold text-slate-900">Chat</h2>
            <p className="text-slate-600">Conversation with {partnerLabel}</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/inbox')}
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
          >
            Back to inbox
          </button>
        </div>

        <div className="min-h-[320px] overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 p-4">
          {messages.length === 0 ? (
            <div className="flex min-h-[220px] items-center justify-center text-slate-500">
              No messages yet. Send the first message to get started.
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => {
                const isMine = message.senderUid === user.uid;
                return (
                  <div
                    key={message.id}
                    className={`max-w-[85%] rounded-3xl px-4 py-3 ${isMine ? 'ml-auto bg-slate-900 text-white' : 'bg-white text-slate-900'} shadow-sm`}
                  >
                    <p>{message.text}</p>
                    <p className="mt-2 text-xs text-slate-400">{message.sentAt ? new Date((message.sentAt as any).seconds * 1000).toLocaleTimeString() : 'Sending…'}</p>
                  </div>
                );
              })}
              <div ref={messageEndRef} />
            </div>
          )}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
          <textarea
            value={newMessage}
            onChange={(event) => setNewMessage(event.target.value)}
            rows={3}
            placeholder="Type your message…"
            className="min-h-[120px] resize-none rounded-3xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !newMessage.trim()}
            className="inline-flex h-14 items-center justify-center rounded-3xl bg-slate-900 px-6 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
      </div>
    </section>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';
import { listenToConversationMessages, sendMessage } from '../lib/messageService';
import { setTyping, listenToTyping, listenToPresence } from '../lib/presenceService';
import { createNotification } from '../lib/notificationService';
import { getUserProfile } from '../lib/userService';
import { inviteToCall } from '../lib/callService';
import { useUpload } from '../hooks/useUpload';
import RichTextEditor, { sanitizeHtml, htmlToPlainText } from './RichTextEditor';
import type { Message } from '../types/message';

export default function ChatRoomPage() {
  const { user, loading } = useFirebaseAuth();
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { upload, uploading } = useUpload();

  const partnerUid = conversationId && user
    ? conversationId.split('_').find((p) => p !== user.uid) ?? null
    : null;

  useEffect(() => {
    if (!conversationId || !user) return;
    return listenToConversationMessages(conversationId, setMessages);
  }, [conversationId, user]);

  useEffect(() => {
    if (!partnerUid) return;
    return listenToPresence(partnerUid, setPartnerOnline);
  }, [partnerUid]);

  useEffect(() => {
    if (!conversationId || !user) return;
    return listenToTyping(conversationId, user.uid, setPartnerTyping);
  }, [conversationId, user]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (loading) return <section className="mx-auto max-w-5xl p-6"><p className="text-app-2">Loading chat…</p></section>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!conversationId) { navigate('/inbox'); return null; }

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async () => {
    const trimmed = htmlToPlainText(newMessage).trim();
    if (!trimmed && !imageFile) return;
    setSending(true);
    try {
      let imageUrl: string | undefined;
      if (imageFile) {
        const result = await upload(imageFile, 'chat');
        if (!result) return;
        imageUrl = result.publicUrl;
      }
      await sendMessage(conversationId, user.uid, newMessage || '', imageUrl);
      setNewMessage('');
      clearImage();
      setTyping(conversationId, user.uid, false);
      if (partnerUid) {
        const myProfile = await getUserProfile(user.uid);
        await createNotification(partnerUid, 'reply', `${myProfile?.displayName ?? 'Someone'} sent you a message`, {
          fromUid: user.uid,
          fromDisplayName: myProfile?.displayName,
          linkPath: `/chat/${conversationId}`,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="mx-auto max-w-5xl p-6">
      <div className="flex flex-col gap-4 card p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-3xl font-semibold text-app">Chat</h2>
            <p className="text-app-2">
              Conversation with {partnerUid ?? 'Chat'}
              {partnerOnline && <span className="ml-2 text-xs text-green-600">● online</span>}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!partnerUid}
              onClick={async () => {
                if (!partnerUid) return;
                const roomId = `${[user.uid, partnerUid].sort().join('_')}_${Date.now()}`;
                try {
                  await inviteToCall(
                    partnerUid,
                    roomId,
                    user.uid,
                    user.displayName ?? 'Someone',
                    user.photoURL,
                  );
                } catch (err) {
                  console.warn('[call] failed to send invite', err);
                }
                navigate(`/call/${roomId}?role=caller&peer=${partnerUid}`);
              }}
              className="inline-flex items-center justify-center rounded-xl border border-app bg-subtle px-4 py-2 text-sm font-semibold text-app transition hover:bg-subtle disabled:opacity-50"
              aria-label="Start audio/video call with this person"
            >
              📞 Call
            </button>
            <button type="button" onClick={() => navigate('/inbox')}
              className="inline-flex items-center justify-center rounded-xl border border-app bg-subtle px-4 py-2 text-sm font-semibold text-app transition hover:bg-subtle">
              Back to inbox
            </button>
          </div>
        </div>

        <div className="min-h-[320px] overflow-y-auto rounded-3xl border border-app bg-subtle p-4">
          {messages.length === 0 ? (
            <div className="flex min-h-[220px] items-center justify-center text-app-3">
              No messages yet. Send the first message to get started.
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => {
                const isMine = message.senderUid === user.uid;
                return (
                  <div key={message.id}
                    className={`max-w-[85%] rounded-3xl px-4 py-3 shadow-sm ${isMine ? 'ml-auto bg-slate-900 text-white' : 'bg-card text-app'}`}>
                    {message.text && <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeHtml(message.text) }} />}
                    {message.imageUrl && (
                      <img src={message.imageUrl} alt="" className="mt-2 max-h-60 rounded-2xl object-cover" />
                    )}
                    <p className="mt-2 text-xs text-app-3">
                      {message.sentAt ? new Date((message.sentAt as { seconds: number }).seconds * 1000).toLocaleTimeString() : 'Sending…'}
                    </p>
                  </div>
                );
              })}
              <div ref={messageEndRef} />
            </div>
          )}
          {partnerTyping && <p className="mt-2 text-xs italic text-app-3">typing…</p>}
        </div>

        {imagePreview && (
          <div className="relative inline-block">
            <img src={imagePreview} alt="preview" className="max-h-32 rounded-xl object-cover" />
            <button onClick={clearImage} className="absolute -top-2 -right-2 rounded-full bg-slate-900 px-1.5 py-0.5 text-xs text-white">✕</button>
          </div>
        )}

        <div className="flex gap-2 items-end">
          <button type="button" onClick={() => fileInputRef.current?.click()}
            className="shrink-0 rounded-xl border border-app px-3 py-2.5 text-sm text-app-2 hover:bg-subtle">
            📷
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImagePick} />
          <RichTextEditor
            value={newMessage}
            onChange={(html) => {
              setNewMessage(html);
              setTyping(conversationId, user.uid, htmlToPlainText(html).length > 0);
            }}
            placeholder="Type your message..."
            minHeight="48px"
            compact
            className="flex-1"
          />
          <button type="button" onClick={handleSend}
            disabled={sending || uploading || (!htmlToPlainText(newMessage).trim() && !imageFile)}
            className="shrink-0 inline-flex h-12 items-center justify-center rounded-3xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60">
            {sending || uploading ? '…' : 'Send'}
          </button>
        </div>
      </div>
    </section>
  );
}

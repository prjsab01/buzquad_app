import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';
import {
  createOrGetConversation,
  findUidByUsername,
  listenToUserConversations,
  type ConversationSummary,
} from '../lib/messageService';

export default function InboxPage() {
  const { user, loading } = useFirebaseAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [targetUsername, setTargetUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsub = listenToUserConversations(user.uid, setConversations);
    return () => unsub();
  }, [user]);

  if (loading) {
    return <section className="mx-auto max-w-2xl p-6"><p className="text-slate-600">Loading messages…</p></section>;
  }

  if (!user) return <Navigate to="/auth" replace />;

  const handleStartChat = async () => {
    setError(null);
    if (!targetUsername.trim()) { setError('Enter a username.'); return; }
    setCreating(true);
    try {
      const participantUid = await findUidByUsername(targetUsername);
      if (!participantUid) { setError('User not found.'); return; }
      if (participantUid === user.uid) { setError('Cannot chat with yourself.'); return; }
      const id = await createOrGetConversation(user.uid, participantUid);
      navigate(`/chat/${id}`);
    } catch (e) {
      setError((e as Error).message || 'Unable to create conversation.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <section className="mx-auto max-w-2xl p-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-900">Inbox</h2>

        <div className="mt-4 flex gap-2">
          <input
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            value={targetUsername}
            onChange={(e) => setTargetUsername(e.target.value)}
            placeholder="Start chat by username…"
            onKeyDown={(e) => e.key === 'Enter' && handleStartChat()}
          />
          <button
            type="button"
            disabled={creating}
            onClick={handleStartChat}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
          >
            {creating ? '…' : 'Chat'}
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <div className="mt-6 space-y-2">
          {conversations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-500">
              No conversations yet.
            </div>
          ) : (
            conversations.map((conv) => (
              <Link
                key={conv.id}
                to={`/chat/${conv.id}`}
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-slate-100"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700">
                  {conv.partnerDisplayName?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900 truncate">
                    {conv.partnerDisplayName ?? 'Unknown user'}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {conv.partnerUsername ? `@${conv.partnerUsername}` : ''}
                  </p>
                  {conv.lastMessage && (
                    <p className="mt-0.5 truncate text-sm text-slate-600">{conv.lastMessage}</p>
                  )}
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

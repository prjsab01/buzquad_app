import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { addDoc, collection, getDocs, query, serverTimestamp, where } from 'firebase/firestore';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';
import {
  listenToEventById,
  listenToEventDiscussion,
  postEventMessage,
  rsvpEvent,
} from '../lib/eventService';
import { firestore } from '../lib/firestore';
import RichTextEditor, { sanitizeHtml, htmlToPlainText } from './RichTextEditor';
import type { BuzEvent } from '../types/event';

function formatDate(val: unknown): string {
  if (!val) return '';
  const ts = val as { toDate?: () => Date };
  const d = ts.toDate ? ts.toDate() : new Date(val as string);
  return d.toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' });
}

interface DiscussionMsg {
  id: string;
  authorDisplayName: string;
  text: string;
  createdAt: unknown;
}

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useFirebaseAuth();
  const navigate = useNavigate();

  const [event, setEvent] = useState<BuzEvent | null>(null);
  const [discussion, setDiscussion] = useState<DiscussionMsg[]>([]);
  const [msgText, setMsgText] = useState('');
  const [sending, setSending] = useState(false);
  const [rsvped, setRsvped] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkInMode, setCheckInMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    return listenToEventById(id, (ev) => {
      if (!ev) { navigate('/events'); return; }
      setEvent(ev);
      setLoading(false);
    });
  }, [id, navigate]);

  useEffect(() => {
    if (!id) return;
    return listenToEventDiscussion(id, setDiscussion);
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [discussion]);

  useEffect(() => {
    if (!id || !user) return;
    getDocs(query(collection(firestore, 'event_checkins'), where('eventId', '==', id), where('uid', '==', user.uid)))
      .then((snap) => setCheckedIn(!snap.empty));
  }, [id, user]);

  const handleRsvp = async () => {
    if (!id || rsvped) return;
    await rsvpEvent(id);
    setRsvped(true);
  };

  const handleCheckIn = async () => {
    if (!id || !user || checkedIn) return;
    await addDoc(collection(firestore, 'event_checkins'), {
      eventId: id, uid: user.uid, displayName: user.displayName ?? 'Unknown',
      checkedInAt: serverTimestamp(),
    });
    setCheckedIn(true);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !user || !htmlToPlainText(msgText).trim()) return;
    setSending(true);
    try {
      await postEventMessage(id, user.uid, user.displayName ?? 'Unknown', msgText.trim());
      setMsgText('');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <section className="mx-auto max-w-3xl p-6 text-app-3">Loading…</section>;
  if (!event) return null;

  return (
    <section className="mx-auto max-w-3xl p-6 space-y-6">

      {/* Event header */}
      <div className="card p-6 shadow-sm">
        <Link to="/events" className="text-xs text-app-3 hover:underline">← Events</Link>
        <h2 className="mt-2 text-2xl font-semibold text-app">{event.title}</h2>
        <p className="mt-1 text-sm text-app-3 capitalize">{event.type} · {formatDate(event.startAt)}</p>
        {event.timezone && <p className="text-xs text-app-3">{event.timezone}</p>}
        {event.description && <p className="mt-3 text-sm text-app-2">{event.description}</p>}
        <p className="mt-3 text-xs text-app-3">Hosted by {event.hostDisplayName}</p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="text-sm text-app-2">{event.rsvpCount} RSVP{event.rsvpCount !== 1 ? 's' : ''}</span>
          {user && (
            <button
              onClick={handleRsvp}
              disabled={rsvped}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-60 ${
                rsvped ? 'border border-slate-300 text-app-3' : 'bg-slate-900 text-white hover:bg-slate-700'
              }`}
            >
              {rsvped ? '✓ RSVP\'d' : 'RSVP'}
            </button>
          )}
          {user && (
            <button
              onClick={handleCheckIn}
              disabled={checkedIn}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-60 ${
                checkedIn ? 'border border-green-400 text-green-600' : 'border border-slate-300 text-app-2 hover:bg-subtle'
              }`}
            >
              {checkedIn ? '✓ Checked in' : '📍 Check in'}
            </button>
          )}
          {user && event.hostUid === user.uid && (
            <button
              onClick={() => setCheckInMode((v) => !v)}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-app-2 hover:bg-subtle"
            >
              {checkInMode ? 'Hide QR' : '📲 Show QR'}
            </button>
          )}
        </div>
        {checkInMode && (
          <div className="mt-4 p-4 rounded-xl border border-dashed text-center" style={{ borderColor: 'var(--border)' }}>
            <p className="text-xs text-app-3 mb-2">Share this link for attendees to check in:</p>
            <code className="text-xs break-all" style={{ color: 'var(--brand)' }}>
              {window.location.href}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(window.location.href)}
              className="mt-2 block mx-auto text-xs underline" style={{ color: 'var(--text-3)' }}
            >Copy link</button>
          </div>
        )}
      </div>

      {/* Discussion */}
      <div className="card shadow-sm">
        <div className="border-b border-app px-6 py-4">
          <h3 className="font-semibold text-app">Discussion</h3>
        </div>

        <div className="max-h-80 overflow-y-auto p-4 space-y-3">
          {discussion.length === 0 ? (
            <p className="text-center text-sm text-app-3 py-6">No messages yet. Start the conversation!</p>
          ) : (
            discussion.map((m) => (
              <div key={m.id} className="flex gap-3">
                <div className="h-7 w-7 shrink-0 rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold text-app-2">
                  {m.authorDisplayName[0]?.toUpperCase() ?? '?'}
                </div>
                <div>
                  <p className="text-xs font-medium text-app-2">{m.authorDisplayName}</p>
                <div className="text-sm text-app" dangerouslySetInnerHTML={{ __html: sanitizeHtml(m.text) }} />
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {user ? (
          <form onSubmit={handleSend} className="border-t border-app p-4 flex gap-2 items-end">
            <RichTextEditor
              value={msgText}
              onChange={setMsgText}
              placeholder="Add to the discussion…"
              minHeight="48px"
              compact
              className="flex-1"
            />
            <button
              type="submit"
              disabled={sending || !htmlToPlainText(msgText).trim()}
              className="shrink-0 rounded-xl bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {sending ? '…' : 'Send'}
            </button>
          </form>
        ) : (
          <p className="border-t border-app p-4 text-center text-sm text-app-3">
            <Link to="/auth" className="underline">Sign in</Link> to join the discussion.
          </p>
        )}
      </div>
    </section>
  );
}

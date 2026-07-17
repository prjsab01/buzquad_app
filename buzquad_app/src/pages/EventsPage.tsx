import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';
import { createEvent, listenToEvents, rsvpEvent } from '../lib/eventService';
import type { BuzEvent, EventType } from '../types/event';

function formatDate(val: unknown): string {
  if (!val) return '';
  // Firestore Timestamp
  const ts = val as { toDate?: () => Date };
  const d = ts.toDate ? ts.toDate() : new Date(val as string);
  return d.toLocaleString();
}

export default function EventsPage() {
  const { user } = useFirebaseAuth();
  const [events, setEvents] = useState<BuzEvent[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<EventType>('meeting');
  const [startAt, setStartAt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return listenToEvents(setEvents);
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim() || !startAt) return;
    setSubmitting(true);
    setError(null);
    try {
      await createEvent(
        user.uid,
        user.displayName ?? user.email ?? 'Unknown',
        title.trim(),
        description.trim(),
        type,
        new Date(startAt),
        Intl.DateTimeFormat().resolvedOptions().timeZone,
      );
      setTitle('');
      setDescription('');
      setStartAt('');
      setShowForm(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mx-auto max-w-5xl p-6">
      <div className="space-y-6 card p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-semibold text-app">Events</h2>
            <p className="mt-1 text-app-2">Upcoming events, sessions, and meetups.</p>
          </div>
          {user && (
            <button
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-700"
              onClick={() => setShowForm((v) => !v)}
            >
              {showForm ? 'Cancel' : '+ New Event'}
            </button>
          )}
        </div>

        {showForm && (
          <form className="space-y-3 rounded-xl border border-app bg-subtle p-4" onSubmit={handleCreate}>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Event title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <textarea
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <div className="flex gap-3">
              <select
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={type}
                onChange={(e) => setType(e.target.value as EventType)}
              >
                <option value="meeting">Meeting</option>
                <option value="watch-party">Watch Party</option>
                <option value="study">Study Session</option>
                <option value="gaming">Gaming</option>
                <option value="ama">AMA</option>
                <option value="other">Other</option>
              </select>
              <input
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
              type="submit"
              disabled={submitting}
            >
              {submitting ? 'Creating…' : 'Create Event'}
            </button>
          </form>
        )}

        {events.length === 0 ? (
          <p className="text-app-3">No upcoming events. Create one!</p>
        ) : (
          <div className="space-y-4">
            {events.map((ev) => (
              <article key={ev.id} className="rounded-2xl border border-app bg-subtle p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-app">{ev.title}</h3>
                    <p className="text-xs text-app-3 capitalize">{ev.type} · {formatDate(ev.startAt)}</p>
                  </div>
                  <span className="text-xs text-app-3">{ev.rsvpCount} RSVP{ev.rsvpCount !== 1 ? 's' : ''}</span>
                </div>
                {ev.description && <p className="mt-2 text-sm text-app-2">{ev.description}</p>}
                <p className="mt-1 text-xs text-app-3">Hosted by {ev.hostDisplayName}</p>
                <div className="mt-3 flex items-center gap-2">
                  <Link
                    to={`/events/${ev.id}`}
                    className="rounded-lg border border-app px-3 py-1.5 text-xs text-app-2 hover:bg-subtle"
                  >
                    View
                  </Link>
                  {user && (
                    <button
                      className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
                      onClick={() => rsvpEvent(ev.id)}
                    >
                      RSVP
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

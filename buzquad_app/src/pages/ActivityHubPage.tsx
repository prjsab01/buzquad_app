import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Film,
  Gamepad2,
  Headphones,
  Music,
  Play,
  Podcast,
  Plus,
  Radio,
  Users,
  X,
} from 'lucide-react';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';
import {
  addActivityItem,
  endSession,
  joinSession,
  listenToActivityItems,
  listenToActiveSessions,
  startSession,
} from '../lib/activityService';
import type { ActivityCategory, ActivityItem, ActivitySession, SessionMode } from '../types/activity';

// ── tab config ────────────────────────────────────────────────────────────────

const TABS: { key: ActivityCategory; label: string; Icon: React.ElementType }[] = [
  { key: 'books',   label: 'Books',   Icon: BookOpen },
  { key: 'movies',  label: 'Movies',  Icon: Film },
  { key: 'reels',   label: 'Reels',   Icon: Play },
  { key: 'series',  label: 'Series',  Icon: Radio },
  { key: 'music',   label: 'Music',   Icon: Music },
  { key: 'games',   label: 'Games',   Icon: Gamepad2 },
  { key: 'podcasts',label: 'Podcasts',Icon: Podcast },
];

const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS ?? '')
  .split(',')
  .map((e: string) => e.trim().toLowerCase());

// ── sub-components ────────────────────────────────────────────────────────────

function ItemCard({
  item,
  onStart,
  canStart,
}: {
  item: ActivityItem;
  onStart: (item: ActivityItem) => void;
  canStart: boolean;
}) {
  return (
    <article className="flex flex-col rounded-2xl border border-app bg-subtle overflow-hidden">
      {item.thumbnailUrl && (
        <img
          src={item.thumbnailUrl}
          alt={item.title}
          className="h-36 w-full object-cover"
          loading="lazy"
        />
      )}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-semibold text-app leading-snug">{item.title}</h3>
        {item.author && <p className="text-xs text-app-3">{item.author}</p>}
        {item.description && (
          <p className="text-sm text-app-2 line-clamp-2">{item.description}</p>
        )}
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.tags.map((t) => (
              <span key={t} className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-app-2">
                {t}
              </span>
            ))}
          </div>
        )}
        <div className="mt-auto flex gap-2 pt-2">
          <a
            href={item.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-app-2 hover:bg-subtle"
          >
            Open
          </a>
          {canStart && (
            <button
              onClick={() => onStart(item)}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
            >
              Start Session
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function SessionCard({
  session,
  uid,
  onJoin,
  onEnd,
}: {
  session: ActivitySession;
  uid: string;
  onJoin: (id: string) => void;
  onEnd: (id: string) => void;
}) {
  const isHost = session.hostUid === uid;
  const isParticipant = session.participantUids.includes(uid);
  return (
    <div className="flex items-center justify-between rounded-xl border border-app bg-card px-4 py-3 gap-3">
      <div className="min-w-0">
        <p className="truncate font-medium text-app text-sm">{session.itemTitle}</p>
        <p className="text-xs text-app-3">
          {session.hostDisplayName} · {session.mode} · {session.participantCount} joined
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        {!isParticipant && (
          <button
            onClick={() => onJoin(session.id)}
            className="flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs text-white hover:bg-slate-700"
          >
            <Users size={12} /> Join
          </button>
        )}
        {isHost && (
          <button
            onClick={() => onEnd(session.id)}
            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
          >
            End
          </button>
        )}
        {isParticipant && !isHost && (
          <span className="rounded-lg bg-subtle px-3 py-1.5 text-xs text-app-3">Joined</span>
        )}
      </div>
    </div>
  );
}

// ── start session modal ───────────────────────────────────────────────────────

function StartSessionModal({
  item,
  onConfirm,
  onClose,
}: {
  item: ActivityItem;
  onConfirm: (mode: SessionMode) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<SessionMode>('solo');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-app">Start Session</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <p className="text-sm text-app-2 mb-4 truncate">{item.title}</p>
        <label className="block text-xs font-medium text-app-2 mb-1">Mode</label>
        <select
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm mb-4"
          value={mode}
          onChange={(e) => setMode(e.target.value as SessionMode)}
        >
          <option value="solo">Solo</option>
          <option value="1:1">1:1</option>
          <option value="group">Small Group</option>
          <option value="circle">Private Circle</option>
          <option value="community">Community</option>
        </select>
        <button
          onClick={() => onConfirm(mode)}
          className="w-full rounded-xl bg-slate-900 py-2 text-sm text-white hover:bg-slate-700"
        >
          Start
        </button>
      </div>
    </div>
  );
}

// ── add item form (admin only) ────────────────────────────────────────────────

function AddItemForm({
  category,
  uid,
  onClose,
}: {
  category: ActivityCategory;
  uid: string;
  onClose: () => void;
}) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [author, setAuthor] = useState('');
  const [tags, setTags] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !url.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await addActivityItem(
        uid,
        category,
        title.trim(),
        url.trim(),
        description.trim() || undefined,
        thumbnail.trim() || undefined,
        author.trim() || undefined,
        tags.split(',').map((t) => t.trim()).filter(Boolean),
      );
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-app">Add {category} item</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <form className="space-y-3" onSubmit={handleSubmit}>
          <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Title *" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="External URL *" value={url} onChange={(e) => setUrl(e.target.value)} required />
          <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Author / Channel" value={author} onChange={(e) => setAuthor(e.target.value)} />
          <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Thumbnail URL" value={thumbnail} onChange={(e) => setThumbnail(e.target.value)} />
          <textarea className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Tags (comma-separated)" value={tags} onChange={(e) => setTags(e.target.value)} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button className="w-full rounded-xl bg-slate-900 py-2 text-sm text-white disabled:opacity-50" type="submit" disabled={submitting}>
            {submitting ? 'Adding…' : 'Add Item'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function ActivityHubPage() {
  const { user } = useFirebaseAuth();
  const [activeTab, setActiveTab] = useState<ActivityCategory>('books');
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [sessions, setSessions] = useState<ActivitySession[]>([]);
  const [search, setSearch] = useState('');
  const [startingItem, setStartingItem] = useState<ActivityItem | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const isAdmin = useMemo(
    () => !!user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase()),
    [user],
  );

  useEffect(() => {
    setSearch('');
    const unsubItems = listenToActivityItems(activeTab, setItems);
    const unsubSessions = listenToActiveSessions(activeTab, setSessions);
    return () => { unsubItems(); unsubSessions(); };
  }, [activeTab]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.author?.toLowerCase().includes(q) ||
        i.tags?.some((t) => t.toLowerCase().includes(q)),
    );
  }, [items, search]);

  const handleStartConfirm = async (mode: SessionMode) => {
    if (!user || !startingItem) return;
    await startSession(
      user.uid,
      user.displayName ?? user.email ?? 'Unknown',
      startingItem.id,
      startingItem.title,
      activeTab,
      mode,
    );
    setStartingItem(null);
  };

  const handleJoin = async (sessionId: string) => {
    if (!user) return;
    await joinSession(sessionId, user.uid);
  };

  return (
    <section className="mx-auto max-w-6xl p-6">
      <div className="card shadow-sm">

        {/* header */}
        <div className="flex items-center justify-between border-b border-app px-6 py-5">
          <div>
            <h2 className="text-3xl font-semibold text-app">Activity Hub</h2>
            <p className="mt-1 text-app-2 text-sm">Browse, start, or join shared activity sessions.</p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-700"
            >
              <Plus size={14} /> Add Item
            </button>
          )}
        </div>

        {/* tabs */}
        <div className="flex overflow-x-auto border-b border-app px-6">
          {TABS.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-medium transition ${
                activeTab === key
                  ? 'border-slate-900 text-app'
                  : 'border-transparent text-app-3 hover:text-app-2'
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-6">

          {/* search */}
          <input
            className="w-full rounded-xl border border-app bg-subtle px-4 py-2.5 text-sm outline-none focus:border-slate-400"
            placeholder={`Search ${activeTab}…`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {/* active sessions */}
          {sessions.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-app-3">
                Active Sessions
              </h3>
              <div className="space-y-2">
                {sessions.map((s) => (
                  <SessionCard
                    key={s.id}
                    session={s}
                    uid={user?.uid ?? ''}
                    onJoin={handleJoin}
                    onEnd={endSession}
                  />
                ))}
              </div>
            </div>
          )}

          {/* curated items */}
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-app-3">
              {search ? `Results for "${search}"` : `All ${activeTab}`}
            </h3>
            {filtered.length === 0 ? (
              <div className="rounded-xl border border-dashed border-app py-12 text-center text-app-3 text-sm">
                {items.length === 0
                  ? isAdmin
                    ? 'No items yet. Use "Add Item" to curate content for this category.'
                    : 'No content curated for this category yet. Check back soon!'
                  : 'No results match your search.'}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    canStart={!!user}
                    onStart={setStartingItem}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* modals */}
      {startingItem && (
        <StartSessionModal
          item={startingItem}
          onConfirm={handleStartConfirm}
          onClose={() => setStartingItem(null)}
        />
      )}
      {showAddForm && user && (
        <AddItemForm
          category={activeTab}
          uid={user.uid}
          onClose={() => setShowAddForm(false)}
        />
      )}
    </section>
  );
}

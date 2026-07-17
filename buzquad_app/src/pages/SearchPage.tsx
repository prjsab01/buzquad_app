import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  collection, getDocs, limit, orderBy, query, startAt, endAt,
} from 'firebase/firestore';
import { firestore } from '../lib/firestore';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';
import { sanitizeHtml } from './RichTextEditor';
import type { UserProfile } from '../types/user';
import type { Post } from '../types/post';
import type { Community } from '../types/community';
import type { BuzEvent } from '../types/event';
import type { Poll } from '../types/poll';

type Tab = 'users' | 'posts' | 'communities' | 'events' | 'polls';

const RECENT_KEY = 'bq_recent_searches';
function loadRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as string[]; } catch { return []; }
}
function saveRecent(term: string) {
  const prev = loadRecent().filter((t) => t !== term);
  localStorage.setItem(RECENT_KEY, JSON.stringify([term, ...prev].slice(0, 10)));
}

export default function SearchPage() {
  const { user } = useFirebaseAuth();
  const [tab, setTab] = useState<Tab>('users');
  const [q, setQ] = useState('');
  const [results, setResults] = useState<unknown[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [recent, setRecent] = useState<string[]>(loadRecent);

  useEffect(() => { setRecent(loadRecent()); }, []);

  const handleSearch = async (term: string) => {
    const t = term.trim();
    if (!t) return;
    setSearching(true); setSearched(false); setResults([]);
    saveRecent(t); setRecent(loadRecent());
    try {
      const end = t.toLowerCase() + '\uf8ff';
      const lower = t.toLowerCase();

      if (tab === 'users') {
        const snap = await getDocs(query(collection(firestore, 'users'), orderBy('username'), startAt(lower), endAt(end), limit(20)));
        setResults(snap.docs.map((d) => ({ uid: d.id, ...(d.data() as Omit<UserProfile, 'uid'>) })));
      } else if (tab === 'posts') {
        const snap = await getDocs(query(collection(firestore, 'posts'), orderBy('createdAt', 'desc'), limit(100)));
        setResults(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Post, 'id'>) }))
          .filter((p) => (p as Post).text?.toLowerCase().includes(lower) || (p as Post).authorUsername?.toLowerCase().includes(lower)));
      } else if (tab === 'communities') {
        const snap = await getDocs(query(collection(firestore, 'communities'), orderBy('name'), startAt(t), endAt(t + '\uf8ff'), limit(20)));
        setResults(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Community, 'id'>) })));
      } else if (tab === 'events') {
        const snap = await getDocs(query(collection(firestore, 'events'), orderBy('title'), startAt(t), endAt(t + '\uf8ff'), limit(20)));
        setResults(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<BuzEvent, 'id'>) })));
      } else if (tab === 'polls') {
        const snap = await getDocs(query(collection(firestore, 'polls'), orderBy('question'), startAt(t), endAt(t + '\uf8ff'), limit(20)));
        setResults(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Poll, 'id'>) })));
      }
    } finally { setSearching(false); setSearched(true); }
  };

  const onSubmit = (e: React.FormEvent) => { e.preventDefault(); handleSearch(q); };

  const TABS: { value: Tab; label: string }[] = [
    { value: 'users', label: 'People' },
    { value: 'posts', label: 'Posts' },
    { value: 'communities', label: 'Communities' },
    { value: 'events', label: 'Events' },
    { value: 'polls', label: 'Polls' },
  ];

  return (
    <section className="mx-auto max-w-3xl p-6 animate-slide-up">
      <div className="card shadow-sm">
        <div className="border-b px-6 py-5" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-2xl font-semibold" style={{ color: 'var(--text)' }}>Search</h2>
        </div>

        {/* Tabs */}
        <div className="flex border-b overflow-x-auto" style={{ borderColor: 'var(--border)' }}>
          {TABS.map(({ value, label }) => (
            <button key={value} onClick={() => { setTab(value); setResults([]); setSearched(false); }}
              className="border-b-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition"
              style={{
                borderBottomColor: tab === value ? 'var(--brand)' : 'transparent',
                color: tab === value ? 'var(--text)' : 'var(--text-3)',
              }}>
              {label}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-4">
          <form onSubmit={onSubmit} className="flex gap-2">
            <input
              className="flex-1 rounded-xl border px-4 py-2.5 text-sm outline-none"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)', color: 'var(--text)' }}
              placeholder={`Search ${tab}…`}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search query"
            />
            <button type="submit" disabled={searching}
              className="btn btn-primary rounded-xl px-4 py-2.5 text-sm disabled:opacity-50">
              {searching ? '…' : '🔍 Search'}
            </button>
          </form>

          {/* Recent searches */}
          {!searched && recent.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-3)' }}>Recent searches</p>
              <div className="flex flex-wrap gap-2">
                {recent.map((r) => (
                  <button key={r} onClick={() => { setQ(r); handleSearch(r); }}
                    className="rounded-full border px-3 py-1 text-xs transition"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-2)' }}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          {searched && results.length === 0 && (
            <div className="py-8 text-center space-y-3">
              <p className="text-sm" style={{ color: 'var(--text-3)' }}>No results found for "{q}"</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {TABS.filter((t) => t.value !== tab).map(({ value, label }) => (
                  <button key={value} onClick={() => { setTab(value); handleSearch(q); }}
                    className="rounded-lg border px-3 py-1.5 text-xs transition"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-2)' }}>
                    Try {label} instead
                  </button>
                ))}
              </div>
            </div>
          )}

          {results.length > 0 && (
            <ul className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {tab === 'users' && (results as UserProfile[]).map((u) => (
                <li key={u.uid} className="flex items-center gap-3 py-3">
                  <div className="h-9 w-9 rounded-full flex items-center justify-center text-sm font-semibold text-white"
                    style={{ background: 'var(--brand)' }}>
                    {u.displayName?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate" style={{ color: 'var(--text)' }}>{u.displayName}</p>
                    <p className="text-xs" style={{ color: 'var(--text-3)' }}>@{u.username}</p>
                  </div>
                  <Link to={`/profile?uid=${u.uid}`}
                    className="rounded-lg border px-3 py-1.5 text-xs transition"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-2)' }}>
                    View
                  </Link>
                </li>
              ))}

              {tab === 'posts' && (results as Post[]).map((p) => (
                <li key={p.id} className="py-3 space-y-1">
                  <p className="text-xs" style={{ color: 'var(--text-3)' }}>@{p.authorUsername}</p>
                  <div className="text-sm line-clamp-2" style={{ color: 'var(--text)' }}
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(p.text) }} />
                  <Link to={`/post/${p.id}`} className="text-xs underline" style={{ color: 'var(--brand)' }}>View post</Link>
                </li>
              ))}

              {tab === 'communities' && (results as Community[]).map((c) => (
                <li key={c.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-sm" style={{ color: 'var(--text)' }}>{c.name}</p>
                    <p className="text-xs capitalize" style={{ color: 'var(--text-3)' }}>{c.type} · {c.memberCount} members</p>
                  </div>
                  <Link to={`/communities/${c.id}`}
                    className="rounded-lg border px-3 py-1.5 text-xs transition"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-2)' }}>
                    View
                  </Link>
                </li>
              ))}

              {tab === 'events' && (results as BuzEvent[]).map((e) => (
                <li key={e.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-sm" style={{ color: 'var(--text)' }}>{e.title}</p>
                    <p className="text-xs capitalize" style={{ color: 'var(--text-3)' }}>{e.type} · {e.rsvpCount} RSVPs</p>
                  </div>
                  <div className="flex gap-2">
                    <Link to={`/events/${e.id}`}
                      className="rounded-lg border px-3 py-1.5 text-xs transition"
                      style={{ borderColor: 'var(--border)', color: 'var(--text-2)' }}>
                      View
                    </Link>
                  </div>
                </li>
              ))}

              {tab === 'polls' && (results as Poll[]).map((p) => (
                <li key={p.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-sm" style={{ color: 'var(--text)' }}>{p.question}</p>
                    <p className="text-xs" style={{ color: 'var(--text-3)' }}>{p.totalVotes} votes</p>
                  </div>
                  <Link to="/polls"
                    className="rounded-lg border px-3 py-1.5 text-xs transition"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-2)' }}>
                    View
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

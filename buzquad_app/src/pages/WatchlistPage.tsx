import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';
import {
  createWatchlist, listenToMyWatchlists, listenToWatchlistItems,
  addWatchlistItem, updateWatchlistItem, deleteWatchlistItem,
  type Watchlist, type WatchlistItem, type WatchlistItemStatus, type WatchlistItemType,
} from '../lib/watchlistService';

const STATUS_LABELS: Record<WatchlistItemStatus, string> = { want: 'Want to', 'in-progress': 'In progress', done: 'Done' };
const TYPE_ICONS: Record<WatchlistItemType, string> = { movie: '🎬', book: '📚', series: '📺', game: '🎮', other: '📌' };

export default function WatchlistPage() {
  const { user, loading } = useFirebaseAuth();
  const [lists, setLists] = useState<Watchlist[]>([]);
  const [selected, setSelected] = useState<Watchlist | null>(null);
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [newListName, setNewListName] = useState('');
  const [creating, setCreating] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [addTitle, setAddTitle] = useState('');
  const [addType, setAddType] = useState<WatchlistItemType>('movie');
  const [addStatus, setAddStatus] = useState<WatchlistItemStatus>('want');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!user) return;
    return listenToMyWatchlists(user.uid, setLists);
  }, [user]);

  useEffect(() => {
    if (!selected) return;
    return listenToWatchlistItems(selected.id, setItems);
  }, [selected]);

  if (loading) return <div className="p-8 text-center" style={{ color: 'var(--text-3)' }}>Loading…</div>;
  if (!user) return <Navigate to="/auth" replace />;

  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    setCreating(true);
    try {
      await createWatchlist(user.uid, newListName.trim());
      setNewListName('');
    } finally { setCreating(false); }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !addTitle.trim()) return;
    setAdding(true);
    try {
      await addWatchlistItem(selected.id, {
        title: addTitle.trim(), type: addType, status: addStatus,
        addedByUid: user.uid, addedByName: user.displayName ?? 'Unknown',
      });
      setAddTitle(''); setShowAdd(false);
    } finally { setAdding(false); }
  };

  const cycleStatus = async (item: WatchlistItem) => {
    if (!selected) return;
    const next: WatchlistItemStatus = item.status === 'want' ? 'in-progress' : item.status === 'in-progress' ? 'done' : 'want';
    await updateWatchlistItem(selected.id, item.id, { status: next });
  };

  return (
    <section className="mx-auto max-w-5xl p-4 animate-slide-up">
      <div className="flex gap-4 h-[calc(100vh-10rem)]">
        {/* Sidebar */}
        <div className="w-56 shrink-0 flex flex-col gap-2">
          <h2 className="text-lg font-bold px-1" style={{ color: 'var(--text)' }}>Watchlists</h2>
          <div className="flex gap-1">
            <input value={newListName} onChange={(e) => setNewListName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateList()}
              placeholder="New list…" className="input flex-1 text-sm py-1.5" aria-label="New list name" />
            <button onClick={handleCreateList} disabled={creating || !newListName.trim()}
              className="btn btn-primary rounded-lg px-2.5 text-sm" aria-label="Create list">+</button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1">
            {lists.length === 0 && <p className="text-xs px-2 py-4" style={{ color: 'var(--text-3)' }}>No lists yet.</p>}
            {lists.map((l) => (
              <button key={l.id} onClick={() => setSelected(l)}
                className="w-full text-left rounded-xl px-3 py-2.5 text-sm transition"
                style={{
                  background: selected?.id === l.id ? 'var(--brand)' : 'transparent',
                  color: selected?.id === l.id ? '#fff' : 'var(--text-2)',
                }}>
                <p className="font-medium truncate">{l.name}</p>
                <p className="text-xs opacity-70 capitalize">{l.visibility}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          {selected ? (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold" style={{ color: 'var(--text)' }}>{selected.name}</h3>
                <button onClick={() => setShowAdd((v) => !v)} className="btn btn-primary rounded-xl text-sm px-4 py-2">
                  {showAdd ? 'Cancel' : '+ Add item'}
                </button>
              </div>

              {showAdd && (
                <form onSubmit={handleAddItem} className="card p-4 flex flex-wrap gap-3 items-end animate-slide-up">
                  <input value={addTitle} onChange={(e) => setAddTitle(e.target.value)}
                    placeholder="Title *" className="input flex-1 min-w-40" aria-label="Item title" required />
                  <select value={addType} onChange={(e) => setAddType(e.target.value as WatchlistItemType)}
                    className="input w-32" aria-label="Item type">
                    {(Object.keys(TYPE_ICONS) as WatchlistItemType[]).map((t) => (
                      <option key={t} value={t}>{TYPE_ICONS[t]} {t}</option>
                    ))}
                  </select>
                  <select value={addStatus} onChange={(e) => setAddStatus(e.target.value as WatchlistItemStatus)}
                    className="input w-36" aria-label="Item status">
                    {(Object.keys(STATUS_LABELS) as WatchlistItemStatus[]).map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                  <button type="submit" disabled={adding} className="btn btn-primary rounded-xl px-4 py-2 text-sm">
                    {adding ? '…' : 'Add'}
                  </button>
                </form>
              )}

              {items.length === 0 ? (
                <div className="flex-1 flex items-center justify-center rounded-2xl border border-dashed text-sm"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-3)' }}>
                  No items yet. Add something to watch or read!
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-2">
                  {items.map((item) => (
                    <div key={item.id} className="card p-4 flex items-center gap-3">
                      <span className="text-2xl">{TYPE_ICONS[item.type]}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate" style={{ color: 'var(--text)' }}>{item.title}</p>
                        <p className="text-xs" style={{ color: 'var(--text-3)' }}>Added by {item.addedByName}</p>
                      </div>
                      <button onClick={() => cycleStatus(item)}
                        className="rounded-full border px-3 py-1 text-xs font-medium transition"
                        style={{ borderColor: 'var(--border)', color: 'var(--text-2)' }}
                        aria-label={`Status: ${STATUS_LABELS[item.status]}`}>
                        {STATUS_LABELS[item.status]}
                      </button>
                      <div className="flex gap-1">
                        {[1,2,3,4,5].map((star) => (
                          <button key={star} onClick={() => updateWatchlistItem(selected.id, item.id, { rating: star })}
                            className="text-sm transition"
                            style={{ color: (item.rating ?? 0) >= star ? '#f59e0b' : 'var(--border-strong)' }}
                            aria-label={`Rate ${star} stars`}>★</button>
                        ))}
                      </div>
                      <button onClick={() => deleteWatchlistItem(selected.id, item.id)}
                        className="text-xs hover:text-red-500 transition" style={{ color: 'var(--text-3)' }}
                        aria-label="Delete item">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center rounded-2xl border border-dashed text-sm"
              style={{ borderColor: 'var(--border)', color: 'var(--text-3)' }}>
              Select a list or create a new one
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

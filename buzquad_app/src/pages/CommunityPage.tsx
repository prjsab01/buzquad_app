import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';
import { createCommunity, getMembership, joinCommunity, leaveCommunity, listenToCommunities } from '../lib/communityService';
import type { Community, CommunityKind } from '../types/community';

const KIND_LABELS: Record<CommunityKind, string> = {
  community: 'Communities',
  group: 'Groups',
  channel: 'Channels',
};

const KIND_ICONS: Record<CommunityKind, string> = {
  community: '🏘️',
  group: '👥',
  channel: '📢',
};

export default function CommunityPage() {
  const { user } = useFirebaseAuth();
  const [all, setAll] = useState<Community[]>([]);
  const [memberships, setMemberships] = useState<Record<string, boolean>>({});
  const [activeKind, setActiveKind] = useState<CommunityKind>('community');
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<Community['type']>('public');
  const [kind, setKind] = useState<CommunityKind>('community');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => listenToCommunities(setAll), []);

  useEffect(() => {
    if (!user || all.length === 0) return;
    all.forEach(async (c) => {
      const m = await getMembership(c.id, user.uid);
      setMemberships((prev) => ({ ...prev, [c.id]: !!m }));
    });
  }, [user, all]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await createCommunity(user.uid, name.trim(), description.trim(), type, kind);
      setName(''); setDescription(''); setType('public'); setShowForm(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoinLeave = async (communityId: string, isMember: boolean) => {
    if (!user) return;
    if (isMember) {
      await leaveCommunity(communityId, user.uid);
      setMemberships((prev) => ({ ...prev, [communityId]: false }));
    } else {
      await joinCommunity(communityId, user.uid);
      setMemberships((prev) => ({ ...prev, [communityId]: true }));
    }
  };

  const filtered = all.filter((c) => (c.kind ?? 'community') === activeKind);

  return (
    <section className="mx-auto max-w-5xl p-6">
      <div className="space-y-6 card p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-semibold text-app">Communities</h2>
            <p className="mt-1 text-app-2">Browse, join, or create hubs.</p>
          </div>
          {user && (
            <button className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-700"
              onClick={() => { setKind(activeKind); setShowForm((v) => !v); }}>
              {showForm ? 'Cancel' : `+ New ${KIND_LABELS[activeKind].slice(0, -1)}`}
            </button>
          )}
        </div>

        {/* Kind tabs */}
        <div className="flex border-b border-app">
          {(Object.keys(KIND_LABELS) as CommunityKind[]).map((k) => (
            <button key={k} onClick={() => setActiveKind(k)}
              className={`border-b-2 px-4 py-2 text-sm font-medium transition ${
                activeKind === k ? 'border-slate-900 text-app' : 'border-transparent text-app-3 hover:text-app-2'
              }`}>
              {KIND_ICONS[k]} {KIND_LABELS[k]}
            </button>
          ))}
        </div>

        {showForm && (
          <form className="space-y-3 rounded-xl border border-app bg-subtle p-4" onSubmit={handleCreate}>
            <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder={`${KIND_LABELS[kind].slice(0, -1)} name`} value={name}
              onChange={(e) => setName(e.target.value)} required />
            <textarea className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Description" rows={2} value={description}
              onChange={(e) => setDescription(e.target.value)} />
            <div className="flex gap-3">
              <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={type} onChange={(e) => setType(e.target.value as Community['type'])}>
                <option value="public">Public</option>
                <option value="private">Private</option>
                <option value="invite-only">Invite-only</option>
              </select>
              <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={kind} onChange={(e) => setKind(e.target.value as CommunityKind)}>
                <option value="community">Community</option>
                <option value="group">Group</option>
                <option value="channel">Channel</option>
              </select>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
              type="submit" disabled={submitting}>
              {submitting ? 'Creating…' : `Create ${KIND_LABELS[kind].slice(0, -1)}`}
            </button>
          </form>
        )}

        {filtered.length === 0 ? (
          <p className="text-app-3">No {KIND_LABELS[activeKind].toLowerCase()} yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {filtered.map((c) => {
              const isMember = !!memberships[c.id];
              return (
                <article key={c.id} className="rounded-2xl border border-app bg-subtle p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-app">{c.name}</h3>
                      <span className="text-xs text-app-3 capitalize">{c.type}</span>
                    </div>
                    <span className="text-xs text-app-3">{c.memberCount} member{c.memberCount !== 1 ? 's' : ''}</span>
                  </div>
                  <p className="mt-2 text-sm text-app-2">{c.description}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <Link to={`/communities/${c.id}`}
                      className="rounded-lg border border-app px-3 py-1.5 text-xs text-app-2 hover:bg-subtle">
                      View
                    </Link>
                    {user && (
                      <button
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                          isMember ? 'border border-slate-300 text-app-2 hover:bg-subtle' : 'bg-slate-900 text-white hover:bg-slate-700'
                        }`}
                        onClick={() => handleJoinLeave(c.id, isMember)}>
                        {isMember ? 'Leave' : 'Join'}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

import { useEffect, useState } from 'react';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';
import {
  createCommunity,
  getMembership,
  joinCommunity,
  leaveCommunity,
  listenToCommunities,
} from '../lib/communityService';
import type { Community } from '../types/community';

export default function CommunityPage() {
  const { user } = useFirebaseAuth();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [memberships, setMemberships] = useState<Record<string, boolean>>({});
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<Community['type']>('public');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return listenToCommunities(setCommunities);
  }, []);

  useEffect(() => {
    if (!user || communities.length === 0) return;
    communities.forEach(async (c) => {
      const m = await getMembership(c.id, user.uid);
      setMemberships((prev) => ({ ...prev, [c.id]: !!m }));
    });
  }, [user, communities]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await createCommunity(user.uid, name.trim(), description.trim(), type);
      setName('');
      setDescription('');
      setType('public');
      setShowForm(false);
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

  return (
    <section className="mx-auto max-w-5xl p-6">
      <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-semibold text-slate-900">Communities</h2>
            <p className="mt-1 text-slate-600">Browse, join, or create community hubs.</p>
          </div>
          {user && (
            <button
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-700"
              onClick={() => setShowForm((v) => !v)}
            >
              {showForm ? 'Cancel' : '+ New Community'}
            </button>
          )}
        </div>

        {showForm && (
          <form className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4" onSubmit={handleCreate}>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Community name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <textarea
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <select
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={type}
              onChange={(e) => setType(e.target.value as Community['type'])}
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
              <option value="invite-only">Invite-only</option>
            </select>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
              type="submit"
              disabled={submitting}
            >
              {submitting ? 'Creating…' : 'Create Community'}
            </button>
          </form>
        )}

        {communities.length === 0 ? (
          <p className="text-slate-500">No communities yet. Be the first to create one!</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {communities.map((c) => {
              const isMember = !!memberships[c.id];
              return (
                <article key={c.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-slate-900">{c.name}</h3>
                      <span className="text-xs text-slate-500 capitalize">{c.type}</span>
                    </div>
                    <span className="text-xs text-slate-400">{c.memberCount} member{c.memberCount !== 1 ? 's' : ''}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{c.description}</p>
                  {user && (
                    <button
                      className={`mt-3 rounded-lg px-3 py-1.5 text-xs font-medium ${
                        isMember
                          ? 'border border-slate-300 text-slate-700 hover:bg-slate-100'
                          : 'bg-slate-900 text-white hover:bg-slate-700'
                      }`}
                      onClick={() => handleJoinLeave(c.id, isMember)}
                    >
                      {isMember ? 'Leave' : 'Join'}
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

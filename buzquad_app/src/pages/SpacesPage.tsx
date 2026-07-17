import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';
import {
  listenToSpaces, createSpace, joinSpace, leaveSpace, closeSpace,
  listenToSpaceParticipants, type Space, type SpaceParticipant,
} from '../lib/spacesService';

const MODE_ICONS: Record<Space['mode'], string> = { voice: '🎙️', video: '📹', activity: '⚡' };

export default function SpacesPage() {
  const { communityId } = useParams<{ communityId: string }>();
  const { user, loading } = useFirebaseAuth();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [activeSpace, setActiveSpace] = useState<string | null>(null);
  const [participants, setParticipants] = useState<SpaceParticipant[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  const [mode, setMode] = useState<Space['mode']>('voice');
  const [creating, setCreating] = useState(false);

  const cid = communityId ?? '';

  useEffect(() => {
    if (!cid) return;
    return listenToSpaces(cid, setSpaces);
  }, [cid]);

  useEffect(() => {
    if (!activeSpace || !cid) return;
    return listenToSpaceParticipants(cid, activeSpace, setParticipants);
  }, [activeSpace, cid]);

  if (loading) return <div className="p-8 text-center" style={{ color: 'var(--text-3)' }}>Loading…</div>;
  if (!user) return <Navigate to="/auth" replace />;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !cid) return;
    if (spaces.length >= 3) { alert('Free-tier cap: max 3 active spaces per community.'); return; }
    setCreating(true);
    try {
      const id = crypto.randomUUID();
      await createSpace(cid, id, {
        communityId: cid, name: name.trim(), topic: topic.trim() || undefined,
        mode, hostUid: user.uid, hostDisplayName: user.displayName ?? 'Unknown',
      });
      setName(''); setTopic(''); setShowCreate(false);
    } finally { setCreating(false); }
  };

  const handleJoin = async (spaceId: string, listenOnly = false) => {
    if (!cid) return;
    await joinSpace(cid, spaceId, user.uid, user.displayName ?? 'Unknown', listenOnly);
    setActiveSpace(spaceId);
  };

  const handleLeave = async () => {
    if (!activeSpace || !cid) return;
    await leaveSpace(cid, activeSpace, user.uid);
    setActiveSpace(null);
    setParticipants([]);
  };

  const handleClose = async (spaceId: string) => {
    if (!cid) return;
    await closeSpace(cid, spaceId);
    if (activeSpace === spaceId) { setActiveSpace(null); setParticipants([]); }
  };

  return (
    <section className="mx-auto max-w-3xl p-4 animate-slide-up space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Spaces</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--text-3)' }}>{spaces.length}/3 active</span>
          <button onClick={() => setShowCreate((v) => !v)} className="btn btn-primary rounded-xl text-sm px-4 py-2">
            {showCreate ? 'Cancel' : '+ New Space'}
          </button>
        </div>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="card p-5 space-y-3 animate-slide-up">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Space name *"
            className="input w-full" required aria-label="Space name" />
          <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic (optional)"
            className="input w-full" aria-label="Space topic" />
          <div className="flex gap-2">
            {(['voice', 'video', 'activity'] as Space['mode'][]).map((m) => (
              <button key={m} type="button" onClick={() => setMode(m)}
                className="rounded-lg border px-3 py-1.5 text-sm capitalize transition"
                style={{
                  borderColor: mode === m ? 'var(--brand)' : 'var(--border)',
                  background: mode === m ? 'var(--brand)' : 'transparent',
                  color: mode === m ? '#fff' : 'var(--text-2)',
                }}>
                {MODE_ICONS[m]} {m}
              </button>
            ))}
          </div>
          <button type="submit" disabled={creating || !name.trim()} className="btn btn-primary rounded-xl px-5 py-2 text-sm">
            {creating ? 'Creating…' : 'Create Space'}
          </button>
        </form>
      )}

      {spaces.length === 0 ? (
        <div className="card p-10 text-center text-sm" style={{ color: 'var(--text-3)' }}>
          No active spaces. Create one to get started!
        </div>
      ) : (
        <div className="space-y-3">
          {spaces.map((space) => (
            <div key={space.id} className="card p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{MODE_ICONS[space.mode]}</span>
                    <h3 className="font-semibold" style={{ color: 'var(--text)' }}>{space.name}</h3>
                    <span className="rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{ background: 'var(--bg-subtle)', color: 'var(--text-3)' }}>
                      {space.participantCount} in room
                    </span>
                  </div>
                  {space.topic && <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>🎵 {space.topic}</p>}
                  <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>Hosted by {space.hostDisplayName}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {activeSpace === space.id ? (
                    <button onClick={handleLeave} className="btn btn-danger rounded-xl text-sm px-3 py-1.5">Leave</button>
                  ) : (
                    <>
                      <button onClick={() => handleJoin(space.id)} className="btn btn-primary rounded-xl text-sm px-3 py-1.5">Join</button>
                      <button onClick={() => handleJoin(space.id, true)}
                        className="rounded-xl border px-3 py-1.5 text-sm transition"
                        style={{ borderColor: 'var(--border)', color: 'var(--text-2)' }}>
                        👂 Listen
                      </button>
                    </>
                  )}
                  {space.hostUid === user.uid && (
                    <button onClick={() => handleClose(space.id)}
                      className="rounded-xl border px-3 py-1.5 text-xs transition"
                      style={{ borderColor: 'var(--border)', color: 'var(--text-3)' }}
                      aria-label="Close space">
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {activeSpace === space.id && participants.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                  {participants.map((p) => (
                    <div key={p.uid} className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs"
                      style={{ background: 'var(--bg-subtle)', color: 'var(--text-2)' }}>
                      <span className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                        style={{ background: 'var(--brand)' }}>
                        {p.displayName[0]?.toUpperCase()}
                      </span>
                      {p.displayName}
                      {p.listenOnly && <span style={{ color: 'var(--text-3)' }}>👂</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-center" style={{ color: 'var(--text-3)' }}>
        Free-tier cap: max 3 active spaces per community. Spaces auto-close when empty.
      </p>
    </section>
  );
}

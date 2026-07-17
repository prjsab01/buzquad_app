import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { firestore } from '../lib/firestore';
import { getMembership, joinCommunity, leaveCommunity } from '../lib/communityService';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';
import {
  checkWordBlocklist, holdPost, listenToHeldPosts, resolveHeldPost,
  type HeldPost,
} from '../lib/communityHealthService';
import RichTextEditor, { sanitizeHtml, htmlToPlainText } from './RichTextEditor';
import type { Community, CommunityMember } from '../types/community';

interface CommunityPost {
  id: string;
  authorUid: string;
  authorDisplayName: string;
  text: string;
  likeCount: number;
  createdAt: unknown;
}

export default function CommunityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useFirebaseAuth();
  const navigate = useNavigate();

  const [community, setCommunity] = useState<Community | null>(null);
  const [members, setMembers] = useState<(CommunityMember & { displayName?: string })[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [isMember, setIsMember] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [postText, setPostText] = useState('');
  const [posting, setPosting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posts' | 'moderation'>('posts');
  const [heldPosts, setHeldPosts] = useState<HeldPost[]>([]);

  // Load community doc
  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(firestore, 'communities', id), (snap) => {
      if (!snap.exists()) { navigate('/communities'); return; }
      setCommunity({ id: snap.id, ...(snap.data() as Omit<Community, 'id'>) });
      setLoading(false);
    });
    return unsub;
  }, [id, navigate]);

  // Load members with display names
  useEffect(() => {
    if (!id) return;
    getDocs(collection(firestore, 'communities', id, 'members')).then(async (snap) => {
      const raw = snap.docs.map((d) => d.data() as CommunityMember);
      const enriched = await Promise.all(
        raw.map(async (m) => {
          const userSnap = await getDoc(doc(firestore, 'users', m.uid));
          const displayName = userSnap.exists()
            ? (userSnap.data() as { displayName?: string }).displayName
            : undefined;
          return { ...m, displayName };
        }),
      );
      setMembers(enriched);
    });
  }, [id]);

  // Live posts
  useEffect(() => {
    if (!id) return;
    const q = query(
      collection(firestore, 'communities', id, 'posts'),
      orderBy('createdAt', 'desc'),
    );
    return onSnapshot(q, (snap) =>
      setPosts(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CommunityPost, 'id'>) }))),
    );
  }, [id]);

  // Membership check
  useEffect(() => {
    if (!id || !user) return;
    getMembership(id, user.uid).then((m) => {
      setIsMember(!!m);
      setIsOwner(m?.role === 'owner');
    });
  }, [id, user]);

  // Held posts for moderation (owner/admin only)
  useEffect(() => {
    if (!id || !isOwner) return;
    return listenToHeldPosts(id, setHeldPosts);
  }, [id, isOwner]);

  const handleJoinLeave = async () => {
    if (!id || !user) return;
    if (isMember) {
      await leaveCommunity(id, user.uid);
      setIsMember(false);
    } else {
      await joinCommunity(id, user.uid);
      setIsMember(true);
    }
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !user || !htmlToPlainText(postText).trim()) return;
    setPosting(true);
    try {
      // §55 Auto-mod: check word blocklist
      const blocklist = community?.autoMod?.wordBlocklist ?? [];
      const matched = checkWordBlocklist(htmlToPlainText(postText), blocklist);
      if (matched) {
        await holdPost(id, user.uid, user.displayName ?? 'Unknown', postText.trim(), 'word_filter');
        setPostText('');
        alert('Your post is held for moderator review.');
        return;
      }
      await addDoc(collection(firestore, 'communities', id, 'posts'), {
        authorUid: user.uid,
        authorDisplayName: user.displayName ?? 'Unknown',
        text: postText.trim(),
        likeCount: 0,
        createdAt: serverTimestamp(),
      });
      setPostText('');
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (postId: string) => {
    if (!id) return;
    await updateDoc(doc(firestore, 'communities', id, 'posts', postId), {
      likeCount: increment(1),
    });
  };

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(`${window.location.origin}/communities/${id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return <section className="mx-auto max-w-4xl p-6 text-app-3">Loading…</section>;
  }
  if (!community) return null;

  return (
    <section className="mx-auto max-w-4xl p-6 space-y-6">

      {/* Header */}
      <div className="card p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link to="/communities" className="text-xs text-app-3 hover:underline">← Communities</Link>
            <h2 className="mt-1 text-2xl font-semibold text-app">{community.name}</h2>
            <p className="mt-1 text-sm text-app-3 capitalize">{community.kind ?? 'community'} · {community.type} · {community.memberCount} member{community.memberCount !== 1 ? 's' : ''}</p>
            {community.description && <p className="mt-2 text-sm text-app-2">{community.description}</p>}
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={handleCopyInvite}
              className="rounded-lg border border-app px-3 py-1.5 text-xs text-app-2 hover:bg-subtle"
            >
              {copied ? '✓ Copied!' : '🔗 Invite link'}
            </button>
            <Link to={`/spaces/${id}`}
              className="rounded-lg border border-app px-3 py-1.5 text-xs text-app-2 hover:bg-subtle">
              🎙️ Spaces
            </Link>
            {user && (
              <button
                onClick={handleJoinLeave}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                  isMember
                    ? 'border border-slate-300 text-app-2 hover:bg-subtle'
                    : 'bg-slate-900 text-white hover:bg-slate-700'
                }`}
              >
                {isMember ? 'Leave' : 'Join'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_260px]">

        {/* Posts feed */}
        <div className="space-y-4">
          {/* §55 Moderation tab for owners */}
          {isOwner && (
            <div className="flex gap-1 rounded-xl p-1" style={{ background: 'var(--bg-subtle)', width: 'fit-content' }}>
              {(['posts', 'moderation'] as const).map((t) => (
                <button key={t} onClick={() => setActiveTab(t)}
                  className="rounded-lg px-4 py-1.5 text-sm font-medium capitalize transition"
                  style={{
                    background: activeTab === t ? 'var(--bg-card)' : 'transparent',
                    color: activeTab === t ? 'var(--text)' : 'var(--text-3)',
                  }}>
                  {t}{t === 'moderation' && heldPosts.length > 0 ? ` (${heldPosts.length})` : ''}
                </button>
              ))}
            </div>
          )}

          {activeTab === 'moderation' && isOwner ? (
            <div className="space-y-3">
              {heldPosts.length === 0 ? (
                <div className="card p-6 text-center text-sm" style={{ color: 'var(--text-3)' }}>No posts pending review.</div>
              ) : heldPosts.map((hp) => (
                <div key={hp.id} className="card p-4 space-y-2">
                  <p className="text-xs" style={{ color: 'var(--text-3)' }}>{hp.authorDisplayName} • held: {hp.reason}</p>
                  <p className="text-sm" style={{ color: 'var(--text)' }}>{hp.text}</p>
                  <div className="flex gap-2">
                    <button onClick={() => resolveHeldPost(id!, hp.id, 'approved', user!.uid)}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium text-white" style={{ background: 'var(--success)' }}>
                      Approve
                    </button>
                    <button onClick={() => resolveHeldPost(id!, hp.id, 'rejected', user!.uid)}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium text-white bg-red-500">
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {user && isMember && (
                <form onSubmit={handlePost} className="card p-4 shadow-sm space-y-3">
                  <RichTextEditor value={postText} onChange={setPostText}
                    placeholder="Post something to this community…" minHeight="80px" />
                  <button type="submit" disabled={posting || !htmlToPlainText(postText).trim()}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-700 disabled:opacity-50">
                    {posting ? 'Posting…' : 'Post'}
                  </button>
                </form>
              )}

          {posts.length === 0 ? (
            <div className="card p-8 text-center text-app-3 text-sm shadow-sm">
              No posts yet. {isMember ? 'Be the first to post!' : 'Join to post.'}
            </div>
          ) : (
            posts.map((p) => (
              <article key={p.id} className="card p-5 shadow-sm">
                <p className="text-xs text-app-3 mb-2">{p.authorDisplayName}</p>
                <div className="text-sm text-app" dangerouslySetInnerHTML={{ __html: sanitizeHtml(p.text) }} />
                <button
                  onClick={() => handleLike(p.id)}
                  className="mt-3 text-xs text-app-3 hover:text-app-2"
                >
                  ❤️ {p.likeCount}
                </button>
              </article>
            ))
          )}
          </>
          )}
        </div>

        {/* Members sidebar */}
        <div className="card p-5 shadow-sm h-fit">
          <h3 className="text-sm font-semibold text-app mb-3">Members ({members.length})</h3>
          <ul className="space-y-2">
            {members.map((m) => (
              <li key={m.uid} className="flex items-center justify-between">
                <Link to={`/profile?uid=${m.uid}`} className="text-sm text-app-2 hover:underline">
                  {m.displayName ?? m.uid.slice(0, 8) + '…'}
                </Link>
                <span className="text-xs text-app-3 capitalize">{m.role}</span>
              </li>
            ))}
          </ul>
        </div>

      </div>
    </section>
  );
}

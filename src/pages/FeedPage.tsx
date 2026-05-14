import { useEffect, useRef, useState } from 'react';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';
import { getUserProfile } from '../lib/userService';
import { createPost, likePost, listenToPublicFeed } from '../lib/postService';
import type { Post } from '../types/post';
import type { UserProfile } from '../types/user';

export default function FeedPage() {
  const { user } = useFirebaseAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (user) {
      getUserProfile(user.uid).then(setProfile).catch(() => null);
    }
  }, [user]);

  useEffect(() => {
    const unsub = listenToPublicFeed(setPosts);
    return () => unsub();
  }, []);

  const handlePost = async () => {
    const text = draft.trim();
    if (!text || !user || !profile) return;
    setPosting(true);
    setError(null);
    try {
      await createPost(user.uid, profile.username, profile.displayName, text);
      setDraft('');
    } catch (e) {
      setError((e as Error).message || 'Failed to post.');
    } finally {
      setPosting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handlePost();
  };

  return (
    <section className="mx-auto max-w-2xl p-4">
      {user && profile && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <textarea
            ref={textareaRef}
            rows={3}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What's on your mind?"
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          />
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-slate-400">{draft.length}/500 · Ctrl+Enter to post</span>
            <button
              type="button"
              onClick={handlePost}
              disabled={posting || !draft.trim() || draft.length > 500}
              className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {posting ? 'Posting…' : 'Post'}
            </button>
          </div>
        </div>
      )}

      {!user && (
        <div className="mb-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-slate-600">
          Sign in to post and interact with the feed.
        </div>
      )}

      <div className="space-y-4">
        {posts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500">
            No posts yet. Be the first to post!
          </div>
        ) : (
          posts.map((post) => (
            <article key={post.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700">
                  {post.authorDisplayName?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{post.authorDisplayName}</p>
                  <p className="text-xs text-slate-500">@{post.authorUsername}</p>
                </div>
                <span className="ml-auto text-xs text-slate-400">
                  {post.createdAt ? new Date((post.createdAt as any).seconds * 1000).toLocaleString() : 'Just now'}
                </span>
              </div>
              <p className="mt-4 whitespace-pre-wrap text-slate-800">{post.text}</p>
              <div className="mt-4 flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => likePost(post.id)}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-100"
                >
                  ♥ {post.likeCount}
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';
import { getUserProfile } from '../lib/userService';
import {
  createPost, likePost, listenToPublicFeed,
  fetchFollowingFeed, addComment, listenToComments,
  toggleReaction, fetchLinkPreview, recordPostView, getPostViewCount,
  type PostComment,
} from '../lib/postService';
import { submitReport } from '../lib/reportService';
import { useUpload } from '../hooks/useUpload';
import { firestore } from '../lib/firestore';
import { saveDraft, deleteDraft, loadDrafts } from './DraftsPage';
import RichTextEditor, { sanitizeHtml, htmlToPlainText } from './RichTextEditor';
import type { Post, LinkPreview } from '../types/post';
import type { UserProfile } from '../types/user';

type FeedTab = 'public' | 'following';

const QUICK_EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '🔥'];

// §54 Suggest hashtags from text by matching against common tags
const COMMON_TAGS = ['#music','#books','#gaming','#tech','#fitness','#art','#food','#travel','#coding','#movies','#design','#science','#sports','#photography','#fashion'];
function suggestHashtags(text: string): string[] {
  const words = text.toLowerCase().split(/\s+/);
  return COMMON_TAGS.filter((tag) => {
    const t = tag.slice(1);
    return words.some((w) => t.startsWith(w) && w.length >= 3);
  }).slice(0, 5);
}

function ReactionBar({ post, currentUid }: { post: Post; currentUid?: string }) {
  const [showPicker, setShowPicker] = useState(false);
  const reactions = post.reactions ?? {};
  const counts = Object.entries(reactions).map(([emoji, uids]) => ({
    emoji,
    count: Object.keys(uids).length,
    mine: currentUid ? !!uids[currentUid] : false,
  })).filter((r) => r.count > 0);

  const handleToggle = (emoji: string) => {
    if (!currentUid) return;
    toggleReaction(post.id, currentUid, emoji).catch(() => null);
    setShowPicker(false);
  };

  return (
    <div className="relative flex flex-wrap items-center gap-1.5">
      {counts.map(({ emoji, count, mine }) => (
        <button
          key={emoji}
          onClick={() => handleToggle(emoji)}
          className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition ${
            mine ? 'border-slate-400 bg-subtle font-semibold' : 'border-app hover:bg-subtle'
          }`}
          aria-label={`${emoji} ${count}`}
        >
          {emoji} {count}
        </button>
      ))}
      <button
        onClick={() => setShowPicker((v) => !v)}
        className="rounded-full border border-app px-2 py-0.5 text-xs text-app-3 hover:bg-subtle"
        aria-label="Add reaction"
      >
        😊+
      </button>
      {showPicker && (
        <div className="absolute bottom-8 left-0 z-10 flex gap-1 card p-2 shadow-lg">
          {QUICK_EMOJIS.map((e) => (
            <button key={e} onClick={() => handleToggle(e)}
              className="rounded-xl p-1.5 text-lg hover:bg-subtle transition"
              aria-label={e}
            >{e}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function LinkPreviewCard({ preview }: { preview: LinkPreview }) {
  return (
    <div className="mt-3 flex gap-3 rounded-xl border border-app bg-subtle p-3 overflow-hidden">
      {preview.image && (
        <img src={preview.image} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
      )}
      <div className="min-w-0">
        {preview.domain && <p className="text-[10px] text-app-3 uppercase tracking-wide">{preview.domain}</p>}
        {preview.title && <p className="text-sm font-medium text-app line-clamp-1">{preview.title}</p>}
        {preview.description && <p className="text-xs text-app-3 line-clamp-2">{preview.description}</p>}
      </div>
    </div>
  );
}

function PostCard({
  post,
  currentUid,
  onLike,
  onMoreLikeThis,
}: {
  post: Post;
  currentUid: string | undefined;
  onLike: (id: string) => void;
  onMoreLikeThis?: (tags: string[]) => void;
}) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [cwRevealed, setCwRevealed] = useState(false);
  const [viewCount, setViewCount] = useState<number | null>(null);

  // Record view on mount
  useEffect(() => {
    if (currentUid) recordPostView(post.id, currentUid);
    // Load view count only for the author
    if (currentUid === post.authorUid) {
      getPostViewCount(post.id).then(setViewCount).catch(() => null);
    }
  }, [post.id, currentUid, post.authorUid]);

  useEffect(() => {
    if (!showComments) return;
    return listenToComments(post.id, setComments);
  }, [showComments, post.id]);

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUid || !commentText.trim()) return;
    setSubmitting(true);
    try {
      const profile = await getUserProfile(currentUid);
      await addComment(post.id, currentUid, profile?.displayName ?? 'Unknown', commentText.trim());
      setCommentText('');
    } finally {
      setSubmitting(false);
    }
  };

  if (hidden) return null;

  return (
    <article className="card p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <Link to={`/profile?uid=${post.authorUid}`}>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-app-2 hover:ring-2 hover:ring-slate-400">
            {post.authorDisplayName?.[0]?.toUpperCase() ?? '?'}
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          <Link to={`/profile?uid=${post.authorUid}`} className="font-semibold text-app hover:underline">
            {post.authorDisplayName}
          </Link>
          <p className="text-xs text-app-3">@{post.authorUsername}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-app-3">
            {post.createdAt ? new Date((post.createdAt as { seconds: number }).seconds * 1000).toLocaleString() : 'Just now'}
          </span>
          <button
            onClick={() => setHidden(true)}
            className="text-xs text-app-3 hover:text-app-2"
            title="Hide post"
            aria-label="Hide post"
          >✕</button>
        </div>
      </div>

      {/* §46 Content warning */}
      {post.contentWarning && !cwRevealed ? (
        <div className="mt-4 rounded-xl border border-dashed p-4 text-center" style={{ borderColor: 'var(--border)' }}>
          <p className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>⚠️ Content warning: {post.contentWarning}</p>
          <button onClick={() => setCwRevealed(true)}
            className="mt-2 text-xs underline" style={{ color: 'var(--brand)' }}>Show anyway</button>
        </div>
      ) : (
        <>
          <p className="mt-4 whitespace-pre-wrap text-slate-800"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.text) }}
          />
          {post.imageUrl && (
            <img src={post.imageUrl} alt="" className="mt-3 max-h-80 w-full rounded-xl object-cover" />
          )}
        </>
      )}
      {post.linkPreview && <LinkPreviewCard preview={post.linkPreview} />}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => onLike(post.id)}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-app-2 transition hover:bg-subtle"
          aria-label={`Like post, ${post.likeCount} likes`}
        >
          ♥ {post.likeCount}
        </button>
        <button
          type="button"
          onClick={() => setShowComments((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-app-2 transition hover:bg-subtle"
          aria-label={`Comments, ${post.commentCount ?? 0} comments`}
        >
          💬 {post.commentCount ?? 0}
        </button>
        <ReactionBar post={post} currentUid={currentUid} />
        {currentUid && currentUid !== post.authorUid && (
          <button
            type="button"
            onClick={() => submitReport(currentUid, 'post', post.id, 'inappropriate', undefined, post.authorUid).catch(() => null)}
            className="ml-auto text-xs text-app-3 hover:text-red-500"
            title="Report post"
            aria-label="Report post"
          >
            🚩
          </button>
        )}
        {onMoreLikeThis && (
          <button
            type="button"
            onClick={() => onMoreLikeThis(post.tags ?? [])}
            className="text-xs text-app-3 hover:text-app-2"
            title="More like this"
            aria-label="More like this"
          >
            🔍 More like this
          </button>
        )}
        {/* §53 Share button */}
        <button
          type="button"
          onClick={() => {
            const url = `${window.location.origin}/post/${post.id}`;
            if (navigator.share) {
              navigator.share({ title: `Post by ${post.authorDisplayName}`, url });
            } else {
              navigator.clipboard.writeText(url);
            }
          }}
          className="text-xs text-app-3 hover:text-app-2"
          aria-label="Share post"
        >
          🔗 Share
        </button>
      </div>

      {/* Author-only analytics */}
      {currentUid === post.authorUid && viewCount != null && (
        <div className="mt-2 flex items-center gap-3 text-xs text-app-3">
          <span>👁 {viewCount} view{viewCount !== 1 ? 's' : ''}</span>
          {Object.entries(post.reactions ?? {}).map(([emoji, uids]) => (
            <span key={emoji}>{emoji} {Object.keys(uids).length}</span>
          ))}
        </div>
      )}

      {showComments && (
        <div className="mt-4 space-y-3 border-t border-app pt-4">
          {comments.length === 0 && (
            <p className="text-xs text-app-3">No comments yet.</p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2">
              <div className="h-6 w-6 shrink-0 rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold text-app-2">
                {c.authorDisplayName[0]?.toUpperCase() ?? '?'}
              </div>
              <div>
                <p className="text-xs font-medium text-app-2">{c.authorDisplayName}</p>
                <p className="text-sm text-app">{c.text}</p>
              </div>
            </div>
          ))}
          {currentUid && (
            <form onSubmit={handleComment} className="flex gap-2 mt-2">
              <input
                className="flex-1 rounded-xl border border-app bg-subtle px-3 py-1.5 text-sm outline-none focus:border-slate-400"
                placeholder="Add a comment…"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                aria-label="Comment text"
              />
              <button
                type="submit"
                disabled={submitting || !commentText.trim()}
                className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {submitting ? '…' : 'Post'}
              </button>
            </form>
          )}
        </div>
      )}
    </article>
  );
}

// Detect first URL in text
function extractUrl(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s]+/);
  return m ? m[0] : null;
}

export default function FeedPage() {
  const { user } = useFirebaseAuth();
  const [searchParams] = useSearchParams();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tab, setTab] = useState<FeedTab>('public');
  const [publicPosts, setPublicPosts] = useState<Post[]>([]);
  const [followingPosts, setFollowingPosts] = useState<Post[]>([]);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [linkPreview, setLinkPreview] = useState<LinkPreview | null>(null);
  const [previewDismissed, setPreviewDismissed] = useState(false);
  const [hasDrafts, setHasDrafts] = useState(() => loadDrafts().length > 0);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [contentWarning, setContentWarning] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { upload, uploading } = useUpload();

  useEffect(() => {
    if (user) getUserProfile(user.uid).then(setProfile).catch(() => null);
  }, [user]);

  // §53 Pre-fill composer from share target
  useEffect(() => {
    const shared = searchParams.get('share');
    if (shared) setDraft(shared);
  }, [searchParams]);

  useEffect(() => {
    return listenToPublicFeed(setPublicPosts);
  }, []);

  useEffect(() => {
    if (tab !== 'following' || !user) return;
    setFollowingLoading(true);
    getDocs(query(collection(firestore, 'follows'), where('fromUid', '==', user.uid)))
      .then(async (snap) => {
        const uids = snap.docs.map((d) => d.data().toUid as string);
        const posts = await fetchFollowingFeed(uids);
        setFollowingPosts(posts);
      })
      .finally(() => setFollowingLoading(false));
  }, [tab, user]);

  // Auto-save draft (debounced 2s)
  const handleDraftChange = useCallback((text: string) => {
    setDraft(text);
    setPreviewDismissed(false);
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    const plain = htmlToPlainText(text);
    if (plain.trim().length > 10) {
      draftTimerRef.current = setTimeout(() => {
        saveDraft(text);
        setHasDrafts(true);
      }, 2000);
    }
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    const url = extractUrl(plain);
    if (url) {
      previewTimerRef.current = setTimeout(async () => {
        const preview = await fetchLinkPreview(url);
        if (preview) setLinkPreview(preview);
      }, 800);
    } else {
      setLinkPreview(null);
    }
  }, []);

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5 MB.'); return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setError(null);
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePost = async () => {
    const text = draft;
    if (!htmlToPlainText(text).trim() || !user || !profile) return;
    setPosting(true);
    setError(null);
    try {
      let imageUrl: string | undefined;
      if (imageFile) {
        const result = await upload(imageFile, 'posts');
        if (!result) { setError('Image upload failed.'); return; }
        imageUrl = result.publicUrl;
      }
      const preview = (!previewDismissed && linkPreview) ? linkPreview : undefined;
      await createPost(user.uid, profile.username, profile.displayName, text, imageUrl, preview, contentWarning.trim() || undefined);
      setDraft('');
      setLinkPreview(null);
      setPreviewDismissed(false);
      setContentWarning('');
      clearImage();
      // Remove draft from localStorage after posting
      const drafts = loadDrafts();
      const match = drafts.find((d) => d.text === text);
      if (match) { deleteDraft(match.id); setHasDrafts(loadDrafts().length > 0); }
    } catch (e) {
      setError((e as Error).message || 'Failed to post.');
    } finally {
      setPosting(false);
    }
  };

  const posts = tab === 'public' ? publicPosts : followingPosts;

  return (
    <section className="mx-auto max-w-2xl p-4">
      {/* Compose */}
      {user && profile && (
        <div className="mb-6 card p-4 shadow-sm">
          <RichTextEditor
            value={draft}
            onChange={handleDraftChange}
            placeholder="What's on your mind?"
            minHeight="80px"
          />
          {imagePreview && (
            <div className="relative mt-2 inline-block">
              <img src={imagePreview} alt="preview" className="max-h-40 rounded-xl object-cover" />
              <button onClick={clearImage} className="absolute -top-2 -right-2 rounded-full bg-slate-900 px-1.5 py-0.5 text-xs text-white" aria-label="Remove image">✕</button>
            </div>
          )}
          {linkPreview && !previewDismissed && (
            <div className="relative mt-2">
              <LinkPreviewCard preview={linkPreview} />
              <button
                onClick={() => setPreviewDismissed(true)}
                className="absolute -top-2 -right-2 rounded-full bg-slate-900 px-1.5 py-0.5 text-xs text-white"
                aria-label="Dismiss link preview"
              >✕</button>
            </div>
          )}
          {error && <p className="mt-2 text-sm text-red-600" role="alert">{error}</p>}
          {/* §54 Hashtag suggestions */}
          {(() => { const tags = suggestHashtags(htmlToPlainText(draft)); return tags.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="text-xs text-app-3">Suggested:</span>
              {tags.map((tag) => (
                <button key={tag} type="button"
                  onClick={() => setDraft((d) => d + ' ' + tag)}
                  className="rounded-full border border-app px-2 py-0.5 text-xs text-app-3 hover:bg-subtle">
                  {tag}
                </button>
              ))}
            </div>
          ) : null; })()}
          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="rounded-lg border border-app px-3 py-1.5 text-xs text-app-2 hover:bg-subtle"
                aria-label="Attach photo">
                📷 Photo
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImagePick} aria-hidden="true" />
              {hasDrafts && (
                <a href="/drafts" className="rounded-lg border border-app px-3 py-1.5 text-xs text-app-3 hover:bg-subtle">
                  📝 Drafts
                </a>
              )}
              <span className="text-xs text-app-3">{htmlToPlainText(draft).length}/500</span>
              {/* §46 CW toggle */}
              <button type="button" onClick={() => setContentWarning((v) => v ? '' : 'Sensitive')}
                className={`rounded-lg border px-2.5 py-1.5 text-xs transition ${
                  contentWarning ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-app text-app-3 hover:bg-subtle'
                }`} aria-label="Add content warning">
                ⚠️ CW
              </button>
            </div>
            {contentWarning && (
              <input value={contentWarning} onChange={(e) => setContentWarning(e.target.value)}
                placeholder="Content warning label (e.g. Spoiler, Sensitive)"
                className="mt-2 w-full rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs outline-none"
                aria-label="Content warning label" />
            )}
            <button type="button" onClick={handlePost}
              disabled={posting || uploading || !htmlToPlainText(draft).trim() || htmlToPlainText(draft).length > 500}
              className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60">
              {posting || uploading ? 'Posting…' : 'Post'}
            </button>
          </div>
        </div>
      )}

      {!user && (
        <div className="mb-6 rounded-2xl border border-dashed border-slate-300 bg-subtle p-4 text-center text-app-2">
          <Link to="/auth" className="underline">Sign in</Link> to post and interact with the feed.
        </div>
      )}

      {/* §51 Getting started card for new users */}
      {user && profile && !profile.onboardingStep && (
        <div className="mb-4 card p-4 border-l-4 animate-slide-up" style={{ borderLeftColor: 'var(--brand)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Getting started with Buzquad</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {[['Complete your profile', '/profile'], ['Join a community', '/communities'], ['Start a chat', '/inbox'], ['Explore Activity Hub', '/activity']].map(([label, to]) => (
              <Link key={to} to={to}
                className="rounded-lg border px-3 py-1.5 text-xs transition"
                style={{ borderColor: 'var(--border)', color: 'var(--text-2)' }}>
                {label} →
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-4 flex border-b border-app" role="tablist">
        {(['public', 'following'] as FeedTab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} role="tab" aria-selected={tab === t}
            className={`border-b-2 px-4 py-2 text-sm font-medium capitalize transition ${
              tab === t ? 'border-slate-900 text-app' : 'border-transparent text-app-3 hover:text-app-2'
            }`}>
            {t === 'following' ? 'Following' : 'Public'}
          </button>
        ))}
      </div>

      {/* Posts */}
      {tagFilter && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border px-3 py-2 text-sm"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
          <span style={{ color: 'var(--text-2)' }}>Showing posts tagged <strong>{tagFilter}</strong></span>
          <button onClick={() => setTagFilter(null)} className="ml-auto text-xs" style={{ color: 'var(--text-3)' }}
            aria-label="Clear filter">✕ Clear</button>
        </div>
      )}
      <div className="space-y-4">
        {tab === 'following' && followingLoading ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-subtle p-8 text-center text-app-3">Loading…</div>
        ) : tab === 'following' && !user ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-subtle p-8 text-center text-app-3">
            <Link to="/auth" className="underline">Sign in</Link> to see posts from people you follow.
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-subtle p-8 text-center text-app-3">
            {tab === 'following' ? 'Follow some people to see their posts here.' : 'No posts yet. Be the first to post!'}
          </div>
        ) : (
          posts.map((post) => (
            <PostCard key={post.id} post={post} currentUid={user?.uid} onLike={likePost}
              onMoreLikeThis={(tags) => setTagFilter(tags[0] ?? null)} />
          ))
        )}
      </div>
    </section>
  );
}

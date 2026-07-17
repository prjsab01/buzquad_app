import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '../lib/firestore';
import { sanitizeHtml } from './RichTextEditor';
import type { Post } from '../types/post';

export default function PostDetailPage() {
  const { postId } = useParams<{ postId: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!postId) return;
    getDoc(doc(firestore, 'posts', postId)).then((snap) => {
      setPost(snap.exists() ? { id: snap.id, ...(snap.data() as Omit<Post, 'id'>) } : null);
      setLoading(false);
    });
  }, [postId]);

  if (loading) return <div className="p-8 text-center" style={{ color: 'var(--text-3)' }}>Loading…</div>;
  if (!post) return (
    <section className="mx-auto max-w-2xl p-6 text-center" style={{ color: 'var(--text-3)' }}>
      Post not found. <Link to="/feed" className="underline" style={{ color: 'var(--brand)' }}>Back to feed</Link>
    </section>
  );

  return (
    <section className="mx-auto max-w-2xl p-6 animate-slide-up">
      <Link to="/feed" className="text-xs mb-4 block" style={{ color: 'var(--text-3)' }}>← Feed</Link>
      <article className="card p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <Link to={`/profile?uid=${post.authorUid}`}>
            <div className="h-9 w-9 rounded-full flex items-center justify-center text-sm font-semibold text-white"
              style={{ background: 'var(--brand)' }}>
              {post.authorDisplayName?.[0]?.toUpperCase() ?? '?'}
            </div>
          </Link>
          <div>
            <Link to={`/profile?uid=${post.authorUid}`} className="font-semibold hover:underline" style={{ color: 'var(--text)' }}>
              {post.authorDisplayName}
            </Link>
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>@{post.authorUsername}</p>
          </div>
        </div>
        <div className="text-sm" style={{ color: 'var(--text)' }}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.text) }} />
        {post.imageUrl && (
          <img src={post.imageUrl} alt="" className="max-h-96 w-full rounded-xl object-cover" />
        )}
        <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--text-3)' }}>
          <span>♥ {post.likeCount}</span>
          <span>💬 {post.commentCount ?? 0}</span>
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: `Post by ${post.authorDisplayName}`, url: window.location.href });
              } else {
                navigator.clipboard.writeText(window.location.href);
              }
            }}
            className="ml-auto text-xs underline" style={{ color: 'var(--brand)' }}
            aria-label="Share post"
          >
            Share
          </button>
        </div>
      </article>
    </section>
  );
}

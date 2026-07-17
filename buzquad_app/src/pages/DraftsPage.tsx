import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';
import { createPost } from '../lib/postService';
import { getUserProfile } from '../lib/userService';
import { sanitizeHtml, htmlToPlainText } from './RichTextEditor';

export interface Draft {
  id: string;
  text: string;
  savedAt: number; // unix ms
}

export const DRAFTS_KEY = 'buzquad_drafts';

export function loadDrafts(): Draft[] {
  try {
    return JSON.parse(localStorage.getItem(DRAFTS_KEY) ?? '[]') as Draft[];
  } catch {
    return [];
  }
}

export function saveDraft(text: string) {
  const drafts = loadDrafts();
  const existing = drafts.find((d) => d.text === text);
  if (existing) { existing.savedAt = Date.now(); }
  else { drafts.unshift({ id: crypto.randomUUID(), text, savedAt: Date.now() }); }
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts.slice(0, 20)));
}

export function deleteDraft(id: string) {
  const drafts = loadDrafts().filter((d) => d.id !== id);
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
}

export default function DraftsPage() {
  const { user, loading } = useFirebaseAuth();
  const [drafts, setDrafts] = useState<Draft[]>(loadDrafts);
  const [publishing, setPublishing] = useState<string | null>(null);

  if (loading) return <div className="p-8 text-app-3">Loading…</div>;
  if (!user) return <Navigate to="/auth" replace />;

  const handleDelete = (id: string) => {
    deleteDraft(id);
    setDrafts(loadDrafts());
  };

  const handlePublish = async (draft: Draft) => {
    setPublishing(draft.id);
    try {
      const profile = await getUserProfile(user.uid);
      if (!profile) return;
      await createPost(user.uid, profile.username, profile.displayName, draft.text);
      deleteDraft(draft.id);
      setDrafts(loadDrafts());
    } finally {
      setPublishing(null);
    }
  };

  return (
    <section className="mx-auto max-w-2xl p-4">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-app">Drafts</h2>
        <Link to="/feed" className="text-sm text-app-3 hover:text-app">← Back to feed</Link>
      </div>

      {drafts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-subtle p-10 text-center text-app-3">
          No saved drafts. Start composing a post and it will auto-save here.
        </div>
      ) : (
        <div className="space-y-4">
          {drafts.map((draft) => (
            <div key={draft.id} className="card p-5 shadow-sm">
              <div
                className="text-slate-800 text-sm"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(draft.text) }}
              />
              <p className="mt-2 text-xs text-app-3">
                {htmlToPlainText(draft.text).length} chars · Saved {new Date(draft.savedAt).toLocaleString()}
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => handlePublish(draft)}
                  disabled={publishing === draft.id}
                  className="rounded-xl bg-slate-900 px-4 py-1.5 text-sm text-white hover:bg-slate-700 disabled:opacity-50"
                >
                  {publishing === draft.id ? 'Publishing…' : 'Publish now'}
                </button>
                <button
                  onClick={() => handleDelete(draft.id)}
                  className="rounded-xl border border-app px-4 py-1.5 text-sm text-app-2 hover:bg-subtle"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

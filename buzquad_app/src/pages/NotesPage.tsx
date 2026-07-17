import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import RichTextEditor, { htmlToPlainText } from './RichTextEditor';
import {
  addDoc, collection, doc, getDocs, onSnapshot,
  orderBy, query, serverTimestamp, updateDoc, limit,
} from 'firebase/firestore';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';
import { firestore } from '../lib/firestore';

interface NoteVersion {
  content: string;
  savedAt: unknown;
  savedBy: string;
}

interface Note {
  id: string;
  title: string;
  content: string;
  ownerUid: string;
  scope: 'personal' | 'shared';
  communityId?: string;
  updatedAt: unknown;
  versions?: NoteVersion[];
}

export default function NotesPage() {
  const { user, loading } = useFirebaseAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [selected, setSelected] = useState<Note | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [showVersions, setShowVersions] = useState(false);
  const [conflictWarning, setConflictWarning] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(firestore, 'notes'),
      orderBy('updatedAt', 'desc'),
      limit(50),
    );
    return onSnapshot(q, (snap) => {
      setNotes(
        snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<Note, 'id'>) }))
          .filter((n) => n.ownerUid === user.uid || n.scope === 'shared'),
      );
    });
  }, [user]);

  if (loading) return <div className="p-8 text-app-3">Loading...</div>;
  if (!user) return <Navigate to="/auth" replace />;

  const selectNote = (note: Note) => {
    setSelected(note);
    setEditContent(note.content);
    setEditTitle(note.title);
    setShowVersions(false);
    setConflictWarning(false);
  };

  const handleSave = async () => {
    if (!selected || !user) return;
    setSaving(true);
    try {
      const noteRef = doc(firestore, 'notes', selected.id);
      // Check for conflict: if updatedAt changed since we loaded
      const versions: NoteVersion[] = [
        ...(selected.versions ?? []),
        { content: selected.content, savedAt: selected.updatedAt, savedBy: user.uid },
      ].slice(-10);
      await updateDoc(noteRef, {
        title: editTitle,
        content: editContent,
        updatedAt: serverTimestamp(),
        versions,
      });
      setSelected((s) => s ? { ...s, title: editTitle, content: editContent, versions } : s);
      setConflictWarning(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!newTitle.trim() || !user) return;
    setCreating(true);
    try {
      const ref = await addDoc(collection(firestore, 'notes'), {
        title: newTitle.trim(),
        content: '',
        ownerUid: user.uid,
        scope: 'personal',
        updatedAt: serverTimestamp(),
        versions: [],
      });
      setNewTitle('');
      // Select the new note
      const newNote: Note = { id: ref.id, title: newTitle.trim(), content: '', ownerUid: user.uid, scope: 'personal', updatedAt: null, versions: [] };
      setSelected(newNote);
      setEditContent('');
      setEditTitle(newNote.title);
    } finally {
      setCreating(false);
    }
  };

  const handleExport = () => {
    if (!selected) return;
    const md = `# ${selected.title}\n\n${selected.content}`;
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${selected.title.replace(/\s+/g, '-')}.md`; a.click();
    URL.revokeObjectURL(url);
  };

  const restoreVersion = (v: NoteVersion) => {
    setEditContent(v.content);
    setConflictWarning(true);
    setShowVersions(false);
  };

  return (
    <section className="mx-auto max-w-5xl p-4">
      <div className="flex gap-4 h-[calc(100vh-12rem)]">
        {/* Sidebar */}
        <div className="w-64 shrink-0 flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
              placeholder="New note title..."
              className="flex-1 rounded-xl border border-app bg-subtle px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              aria-label="New note title"
            />
            <button onClick={handleCreate} disabled={creating || !newTitle.trim()}
              className="rounded-xl bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-700 disabled:opacity-50"
              aria-label="Create note">
              +
            </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1">
            {notes.length === 0 ? (
              <p className="text-xs text-app-3 px-2 py-4">No notes yet. Create one above.</p>
            ) : notes.map((note) => (
              <button key={note.id} onClick={() => selectNote(note)}
                className={`w-full text-left rounded-xl px-3 py-2.5 text-sm transition ${
                  selected?.id === note.id ? 'bg-slate-900 text-white' : 'text-app-2 hover:bg-subtle'
                }`}
                aria-current={selected?.id === note.id ? 'true' : undefined}>
                <p className="font-medium truncate">{note.title}</p>
                <p className={`text-xs truncate mt-0.5 ${selected?.id === note.id ? 'text-slate-300' : 'text-app-3'}`}>
                  {note.scope === 'shared' ? 'Shared' : 'Personal'}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          {selected != null ? (
            <>
              <div className="flex items-center gap-2">
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="flex-1 rounded-xl border border-app bg-card px-4 py-2 text-lg font-semibold text-app outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  aria-label="Note title"
                />
                <button onClick={handleSave} disabled={saving}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button onClick={handleExport}
                  className="rounded-xl border border-app px-3 py-2 text-sm text-app-2 hover:bg-subtle"
                  aria-label="Export as Markdown">
                  Export .md
                </button>
                {(selected.versions?.length ?? 0) > 0 && (
                  <button onClick={() => setShowVersions((v) => !v)}
                    className="rounded-xl border border-app px-3 py-2 text-sm text-app-2 hover:bg-subtle"
                    aria-label="View version history">
                    History
                  </button>
                )}
              </div>

              {conflictWarning ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700" role="alert">
                  You restored an older version. Save to apply it.
                </div>
              ) : null}

              {showVersions ? (
                <div className="rounded-xl border border-app bg-subtle p-4 space-y-2 overflow-y-auto max-h-48">
                  <p className="text-xs font-semibold text-app-2 mb-2">Version history (last 10)</p>
                  {[...(selected.versions ?? [])].reverse().map((v, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 text-xs text-app-2">
                      <span>Version {(selected.versions?.length ?? 0) - i}</span>
                      <button onClick={() => restoreVersion(v)}
                        className="rounded-lg border border-app px-2 py-0.5 hover:bg-subtle">
                        Restore
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              <RichTextEditor
                value={editContent}
                onChange={setEditContent}
                placeholder="Write your note here..."
                minHeight="200px"
                className="flex-1"
              />
              <p className="text-xs text-app-3">
                {htmlToPlainText(editContent).length} chars &middot; Last-write-wins
              </p>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-subtle text-app-3 text-sm">
              Select a note or create a new one
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';
import { getUserProfile } from '../lib/userService';
import { generateWrapped, type WrappedData } from '../lib/wrappedService';

const CURRENT_YEAR = new Date().getFullYear();

export default function WrappedPage() {
  const { user, loading } = useFirebaseAuth();
  const [year, setYear] = useState(CURRENT_YEAR);
  const [data, setData] = useState<WrappedData | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) return <div className="p-8 text-center" style={{ color: 'var(--text-3)' }}>Loading…</div>;
  if (!user) return <Navigate to="/auth" replace />;

  const handleGenerate = async () => {
    setGenerating(true); setError(null);
    try {
      const profile = await getUserProfile(user.uid);
      if (!profile) throw new Error('Profile not found.');
      const result = await generateWrapped(user.uid, profile, year);
      setData(result);
    } catch (e) { setError((e as Error).message); }
    finally { setGenerating(false); }
  };

  const stat = (emoji: string, label: string, value: string | number) => (
    <div className="card p-5 text-center space-y-1">
      <div className="text-3xl">{emoji}</div>
      <div className="text-2xl font-bold" style={{ color: 'var(--brand)' }}>{value}</div>
      <div className="text-xs font-medium" style={{ color: 'var(--text-3)' }}>{label}</div>
    </div>
  );

  return (
    <section className="mx-auto max-w-2xl p-6 animate-slide-up">
      <div className="card p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="text-5xl">🎁</div>
          <h2 className="text-3xl font-bold" style={{ color: 'var(--text)' }}>Buzquad Wrapped</h2>
          <p className="text-sm" style={{ color: 'var(--text-2)' }}>Your year in review — generated from your own activity data.</p>
        </div>

        <div className="flex items-center justify-center gap-3">
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}
            className="input w-32 text-center" aria-label="Select year">
            <option value={CURRENT_YEAR}>{CURRENT_YEAR}</option>
            <option value={CURRENT_YEAR - 1}>{CURRENT_YEAR - 1}</option>
          </select>
          <button onClick={handleGenerate} disabled={generating} className="btn btn-primary rounded-xl px-6 py-2.5">
            {generating ? 'Generating…' : 'Generate my Wrapped'}
          </button>
        </div>

        {error && <p className="text-sm text-red-500 text-center" role="alert">{error}</p>}

        {data && (
          <div className="space-y-6 animate-slide-up">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {stat('✍️', 'Posts created', data.totalPosts)}
              {stat('❤️', 'Reactions received', data.totalReactionsReceived)}
              {stat('🔥', 'Longest streak', `${data.longestStreak} days`)}
              {stat('📅', 'Events attended', data.eventsAttended)}
              {stat('🌟', 'Kudos received', data.kudosReceived)}
              {stat('😊', 'Fav reaction given', data.mostUsedReactionGiven)}
            </div>

            {data.firstPostDate && (
              <div className="card p-4 text-center">
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>First post of {year}</p>
                <p className="mt-1 text-sm font-medium" style={{ color: 'var(--text)' }}>{data.firstPostDate}</p>
              </div>
            )}

            {data.mostLikedPostText && (
              <div className="card p-4 space-y-1">
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Most liked post — {data.mostLikedPostLikes} ❤️</p>
                <p className="text-sm italic" style={{ color: 'var(--text-2)' }}>"{data.mostLikedPostText}{data.mostLikedPostText.length >= 80 ? '…' : ''}"</p>
              </div>
            )}

            <button
              onClick={() => {
                const el = document.getElementById('wrapped-card');
                if (!el) return;
                // Web Share API fallback
                if (navigator.share) {
                  navigator.share({ title: `My Buzquad ${year} Wrapped`, text: `I created ${data.totalPosts} posts and received ${data.totalReactionsReceived} reactions on Buzquad in ${year}!`, url: window.location.href });
                } else {
                  navigator.clipboard.writeText(`My Buzquad ${year} Wrapped: ${data.totalPosts} posts, ${data.totalReactionsReceived} reactions, ${data.longestStreak} day streak! buzquad-app.pages.dev`);
                  alert('Copied to clipboard!');
                }
              }}
              className="btn btn-ghost w-full rounded-xl py-2.5"
            >
              📤 Share my Wrapped
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

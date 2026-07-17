import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { doc, updateDoc, getDocs, collection, query, orderBy, limit } from 'firebase/firestore';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';
import {
  claimUsername,
  getUserProfile,
  isUsernameAvailable,
  normalizeUsername,
  validateUsername,
} from '../lib/userService';
import { joinCommunity } from '../lib/communityService';
import { firestore } from '../lib/firestore';
import type { Community } from '../types/community';

const INTEREST_OPTIONS = [
  { id: 'music', label: '🎵 Music' },
  { id: 'books', label: '📚 Books' },
  { id: 'gaming', label: '🎮 Gaming' },
  { id: 'tech', label: '💻 Tech' },
  { id: 'fitness', label: '🏃 Fitness' },
  { id: 'art', label: '🎨 Art' },
  { id: 'food', label: '🍜 Food' },
  { id: 'travel', label: '✈️ Travel' },
  { id: 'movies', label: '🎬 Movies' },
  { id: 'science', label: '🔬 Science' },
  { id: 'coding', label: '⌨️ Coding' },
  { id: 'podcasts', label: '🎙️ Podcasts' },
  { id: 'sports', label: '⚽ Sports' },
  { id: 'nature', label: '🌿 Nature' },
  { id: 'photography', label: '📷 Photography' },
  { id: 'language', label: '🗣️ Languages' },
];

type Step = 'profile' | 'interests' | 'communities' | 'done';

export default function OnboardingPage() {
  const { user, loading } = useFirebaseAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('profile');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [pronouns, setPronouns] = useState('');
  const [location, setLocation] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [suggestedCommunities, setSuggestedCommunities] = useState<Community[]>([]);
  const [joiningIds, setJoiningIds] = useState<Set<string>>(new Set());
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const userDisplayName = useMemo(() => user?.displayName || user?.email || 'there', [user]);

  useEffect(() => {
    if (!user) return;
    getUserProfile(user.uid).then((profile) => {
      if (profile) {
        setUsername(profile.username ?? '');
        setDisplayName(profile.displayName ?? '');
        setBio(profile.bio ?? '');
        setPronouns(profile.pronouns ?? '');
        setLocation(profile.location ?? '');
        setInterests(profile.interests ?? []);
        if (profile.onboardingStep && profile.onboardingStep >= 2) setStep('done');
      } else {
        setDisplayName(user.displayName ?? '');
      }
    }).catch(() => null);
  }, [user]);

  useEffect(() => {
    if (!username) { setIsAvailable(null); return; }
    const timer = window.setTimeout(async () => {
      const v = validateUsername(username);
      if (!v.valid) { setIsAvailable(false); setError(v.message ?? 'Invalid username.'); return; }
      setChecking(true); setError(null);
      try {
        const available = await isUsernameAvailable(username);
        setIsAvailable(available);
        if (!available) setError('Username is already taken.');
      } catch { setError('Could not check availability.'); setIsAvailable(null); }
      finally { setChecking(false); }
    }, 550);
    return () => window.clearTimeout(timer);
  }, [username]);

  if (loading) return <section className="mx-auto max-w-2xl p-6"><p className="text-app-2">Loading...</p></section>;
  if (!user) return <Navigate to="/auth" replace />;

  const handleProfileSave = async () => {
    setError(null);
    const v = validateUsername(username);
    if (!v.valid) { setError(v.message ?? 'Invalid username.'); return; }
    if (isAvailable === false) { setError('Choose a different username.'); return; }
    setSaving(true);
    try {
      await claimUsername(user.uid, normalizeUsername(username), {
        displayName: displayName || user.displayName || '',
        bio, pronouns, location,
      });
      await updateDoc(doc(firestore, 'users', user.uid), { onboardingStep: 1 });
      setStep('interests');
    } catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  };

  const toggleInterest = (id: string) => {
    setInterests((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  };

  const handleInterestsSave = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(firestore, 'users', user.uid), { interests, onboardingStep: 2 });
      const snap = await getDocs(query(collection(firestore, 'communities'), orderBy('memberCount', 'desc'), limit(6)));
      setSuggestedCommunities(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Community, 'id'>) })));
      setStep('communities');
    } catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  };

  const handleJoinToggle = async (communityId: string) => {
    if (!user || joinedIds.has(communityId)) return;
    setJoiningIds((s) => new Set(s).add(communityId));
    try {
      await joinCommunity(communityId, user.uid);
      setJoinedIds((s) => new Set(s).add(communityId));
    } finally {
      setJoiningIds((s) => { const n = new Set(s); n.delete(communityId); return n; });
    }
  };

  if (step === 'profile') {
    return (
      <section className="mx-auto max-w-2xl p-6">
        <div className="card p-8 shadow-sm space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-app">Welcome, {userDisplayName}!</h2>
            <p className="mt-1 text-app-3 text-sm">Set up your profile. Step 1 of 3.</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-app-2 mb-1" htmlFor="ob-username">Username *</label>
              <input id="ob-username"
                className="w-full rounded-xl border border-app bg-subtle px-4 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                value={username} onChange={(e) => setUsername(e.target.value)}
                placeholder="your_handle (3-20 chars)" aria-describedby="ob-username-hint" />
              <p id="ob-username-hint" className="mt-1 text-xs">
                {checking ? <span className="text-app-3">Checking...</span>
                  : isAvailable === true ? <span className="text-green-600">Available</span>
                  : isAvailable === false ? <span className="text-red-500">Unavailable</span>
                  : <span className="text-app-3">Letters, numbers, _ and . only</span>}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-app-2 mb-1" htmlFor="ob-name">Display name</label>
              <input id="ob-name"
                className="w-full rounded-xl border border-app bg-subtle px-4 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your public name" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-app-2 mb-1" htmlFor="ob-pronouns">Pronouns</label>
                <input id="ob-pronouns"
                  className="w-full rounded-xl border border-app bg-subtle px-4 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  value={pronouns} onChange={(e) => setPronouns(e.target.value)} placeholder="they/them" />
              </div>
              <div>
                <label className="block text-sm font-medium text-app-2 mb-1" htmlFor="ob-location">Location</label>
                <input id="ob-location"
                  className="w-full rounded-xl border border-app bg-subtle px-4 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City or timezone" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-app-2 mb-1" htmlFor="ob-bio">Bio</label>
              <textarea id="ob-bio"
                className="w-full resize-none rounded-xl border border-app bg-subtle px-4 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                rows={3} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="A short bio about yourself" />
            </div>
          </div>
          {error != null ? <p className="text-sm text-red-600" role="alert">{error}</p> : null}
          <button onClick={handleProfileSave} disabled={saving || !username.trim()}
            className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50">
            {saving ? 'Saving...' : 'Continue'}
          </button>
        </div>
      </section>
    );
  }

  if (step === 'interests') {
    return (
      <section className="mx-auto max-w-2xl p-6">
        <div className="card p-8 shadow-sm space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-app">What are you into?</h2>
            <p className="mt-1 text-app-3 text-sm">Pick at least 3 interests to personalise your feed. Step 2 of 3.</p>
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Interest options">
            {INTEREST_OPTIONS.map((opt) => {
              const selected = interests.includes(opt.id);
              return (
                <button key={opt.id} onClick={() => toggleInterest(opt.id)}
                  aria-pressed={selected}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    selected ? 'border-slate-900 bg-slate-900 text-white' : 'border-app text-app-2 hover:bg-subtle'
                  }`}>
                  {opt.label}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-app-3" aria-live="polite">
            {interests.length} selected{interests.length < 3 ? ` — pick at least ${3 - interests.length} more` : ''}
          </p>
          {error != null ? <p className="text-sm text-red-600" role="alert">{error}</p> : null}
          <div className="flex gap-3">
            <button onClick={handleInterestsSave} disabled={saving || interests.length < 3}
              className="flex-1 rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50">
              {saving ? 'Saving...' : 'Continue'}
            </button>
            <button onClick={() => navigate('/feed')}
              className="rounded-xl border border-app px-5 py-3 text-sm text-app-3 hover:bg-subtle">
              Skip
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (step === 'communities') {
    return (
      <section className="mx-auto max-w-2xl p-6">
        <div className="card p-8 shadow-sm space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-app">Join some communities</h2>
            <p className="mt-1 text-app-3 text-sm">Based on your interests. You can always join more later. Step 3 of 3.</p>
          </div>
          {suggestedCommunities.length === 0 ? (
            <p className="text-sm text-app-3">No communities yet — be the first to create one!</p>
          ) : (
            <div className="space-y-3">
              {suggestedCommunities.map((c) => {
                const joined = joinedIds.has(c.id);
                const joining = joiningIds.has(c.id);
                return (
                  <div key={c.id} className="flex items-center justify-between gap-4 rounded-xl border border-app bg-subtle px-4 py-3">
                    <div className="min-w-0">
                      <p className="font-medium text-app truncate">{c.name}</p>
                      <p className="text-xs text-app-3 truncate">{c.description}</p>
                      <p className="text-xs text-app-3">{c.memberCount} member{c.memberCount !== 1 ? 's' : ''}</p>
                    </div>
                    <button onClick={() => handleJoinToggle(c.id)} disabled={joining || joined}
                      className={`shrink-0 rounded-xl px-4 py-1.5 text-sm font-medium transition disabled:opacity-60 ${
                        joined ? 'bg-green-100 text-green-700' : 'bg-slate-900 text-white hover:bg-slate-700'
                      }`}
                      aria-label={joined ? `Joined ${c.name}` : `Join ${c.name}`}>
                      {joining ? '...' : joined ? 'Joined' : 'Join'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={() => setStep('done')}
              className="flex-1 rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-700">
              Continue
            </button>
            <button onClick={() => setStep('done')}
              className="rounded-xl border border-app px-5 py-3 text-sm text-app-3 hover:bg-subtle">
              Skip
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-2xl p-6">
      <div className="card p-8 shadow-sm text-center space-y-4">
        <p className="text-4xl" aria-hidden="true">🎉</p>
        <h2 className="text-2xl font-semibold text-app">You're all set!</h2>
        <p className="text-app-3 text-sm">Your profile is ready. Start exploring Buzquad.</p>
        <div className="flex gap-3 justify-center pt-2">
          <Link to="/feed" className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-700">
            Go to Feed
          </Link>
          <Link to="/communities" className="rounded-xl border border-app px-6 py-3 text-sm text-app-2 hover:bg-subtle">
            Explore Communities
          </Link>
        </div>
      </div>
    </section>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';
import {
  claimUsername,
  getUserProfile,
  isUsernameAvailable,
  normalizeUsername,
  validateUsername,
} from '../lib/userService';

export default function OnboardingPage() {
  const { user, loading } = useFirebaseAuth();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [pronouns, setPronouns] = useState('');
  const [location, setLocation] = useState('');
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const userDisplayName = useMemo(() => user?.displayName || user?.email || 'Buzquad user', [user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const loadProfile = async () => {
      try {
        const profile = await getUserProfile(user.uid);
        if (profile) {
          setUsername(profile.username);
          setDisplayName(profile.displayName);
          setBio(profile.bio || '');
          setPronouns(profile.pronouns || '');
          setLocation(profile.location || '');
        } else {
          setDisplayName(user.displayName || '');
        }
      } catch (loadError) {
        setError('Unable to load onboarding profile. Please refresh.');
      }
    };

    loadProfile();
  }, [user]);

  useEffect(() => {
    if (!username) {
      setIsAvailable(null);
      return;
    }

    const timer = window.setTimeout(async () => {
      const validation = validateUsername(username);
      if (!validation.valid) {
        setIsAvailable(false);
        setError(validation.message ?? 'Username is invalid.');
        return;
      }

      setChecking(true);
      setError(null);
      try {
        const available = await isUsernameAvailable(username);
        setIsAvailable(available);
        if (!available) {
          setError('Username is already taken.');
        }
      } catch {
        setError('Unable to verify username availability right now.');
        setIsAvailable(null);
      } finally {
        setChecking(false);
      }
    }, 550);

    return () => window.clearTimeout(timer);
  }, [username]);

  if (loading) {
    return (
      <section className="mx-auto max-w-4xl p-6">
        <p className="text-slate-600">Loading onboarding state…</p>
      </section>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handleSave = async () => {
    setError(null);
    setSuccess(null);

    const normalized = normalizeUsername(username);
    const validation = validateUsername(username);
    if (!validation.valid) {
      setError(validation.message ?? 'Username is invalid.');
      return;
    }

    if (!isAvailable && isAvailable !== null) {
      setError('Choose a different username before continuing.');
      return;
    }

    try {
      await claimUsername(user.uid, normalized, {
        displayName: displayName || user.displayName || '',
        bio,
        pronouns,
        location,
      });
      setSuccess('Username claimed and onboarding profile saved successfully.');
      setSaved(true);
    } catch (saveError) {
      setError((saveError as Error).message || 'Unable to save onboarding data.');
    }
  };

  return (
    <section className="mx-auto max-w-4xl p-6">
      <h2 className="text-3xl font-semibold text-slate-900">Onboarding</h2>
      <p className="mt-4 text-slate-700">
        Welcome back, {userDisplayName}. This onboarding page guides you through username claim and profile setup.
      </p>

      <div className="mt-8 space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-6">
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Username
            <input
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Choose a handle (3–20 characters)"
            />
          </label>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            {checking ? (
              <span className="text-slate-500">Checking availability…</span>
            ) : isAvailable === true ? (
              <span className="text-emerald-600">Username is available.</span>
            ) : isAvailable === false ? (
              <span className="text-amber-600">Username is unavailable.</span>
            ) : (
              <span className="text-slate-500">Enter a username to check availability.</span>
            )}
          </div>

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Display name
            <input
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Your public display name"
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Pronouns
            <input
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              value={pronouns}
              onChange={(event) => setPronouns(event.target.value)}
              placeholder="e.g. they/them, she/her, he/him"
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Location
            <input
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="City, region, or timezone"
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Bio
            <textarea
              className="min-h-[120px] rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              placeholder="Add a short bio about yourself"
            />
          </label>
        </div>

        <div className="space-y-3">
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {success ? <p className="text-sm text-emerald-600">{success}</p> : null}

          <button
            type="button"
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            onClick={handleSave}
          >
            Save onboarding profile
          </button>
          {saved ? (
            <p className="text-sm text-slate-600">You can continue to explore the app or refine your profile later.</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

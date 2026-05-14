import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';
import { getUserProfile } from '../lib/userService';
import type { UserProfile } from '../types/user';

export default function ProfilePage() {
  const { user: currentUser, signOutUser } = useFirebaseAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    setLoading(true);
    getUserProfile(currentUser.uid)
      .then((result) => {
        setProfile(result);
        setLoading(false);
      })
      .catch((err) => {
        setError('Unable to load profile.');
        setLoading(false);
        console.error(err);
      });
  }, [currentUser]);

  if (!currentUser) {
    return (
      <section className="mx-auto max-w-5xl p-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-3xl font-semibold text-slate-900">Profile</h2>
          <p className="mt-4 text-slate-700">Sign in to view your profile and access personal settings.</p>
          <Link className="mt-6 inline-flex rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800" to="/auth">
            Go to sign in
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-5xl p-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-3xl font-semibold text-slate-900">Your profile</h2>
            <p className="mt-2 text-slate-700">Manage your profile details, username, and onboarding status.</p>
          </div>
          <button
            onClick={signOutUser}
            className="inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Sign out
          </button>
        </div>

        {loading ? (
          <div className="mt-8 text-slate-600">Loading profile...</div>
        ) : error ? (
          <p className="mt-8 text-red-600">{error}</p>
        ) : profile ? (
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Account</p>
              <p className="mt-4 text-lg font-semibold text-slate-900">{profile.displayName}</p>
              <p className="mt-2 text-slate-600">{profile.username ? `@${profile.username}` : 'Username not set'}</p>
              <p className="mt-3 text-slate-600">{currentUser?.email || 'Email not available'}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Profile details</p>
              <div className="mt-4 space-y-3 text-slate-700">
                <p><span className="font-semibold text-slate-900">Location:</span> {profile.location || 'Not specified'}</p>
                <p><span className="font-semibold text-slate-900">Pronouns:</span> {profile.pronouns || 'Not specified'}</p>
                <p><span className="font-semibold text-slate-900">About:</span> {profile.bio || 'No bio added yet.'}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-slate-700">
            <p className="text-lg font-semibold text-slate-900">Profile data is missing.</p>
            <p className="mt-3">Complete onboarding to save your community profile and username.</p>
            <Link className="mt-6 inline-flex rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800" to="/onboarding">
              Finish onboarding
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

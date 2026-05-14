import { Link } from 'react-router-dom';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';

export default function AuthPage() {
  const { user, loading, error, signInWithGoogle, signOutUser } = useFirebaseAuth();

  return (
    <section className="mx-auto max-w-4xl p-6">
      <h2 className="text-3xl font-semibold text-slate-900">Authentication</h2>
      <p className="mt-4 text-slate-700">
        Sign in with Google to continue to Buzquad. After first login, users will complete onboarding and profile setup.
      </p>

      <div className="mt-8 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {loading ? (
          <div className="text-slate-600">Checking auth state...</div>
        ) : user ? (
          <div className="space-y-4">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Signed in as</p>
              <p className="mt-2 text-xl font-medium text-slate-900">{user.displayName || user.email}</p>
              <p className="text-sm text-slate-600">{user.email}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
                to="/onboarding"
              >
                Continue to onboarding
              </Link>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
                onClick={signOutUser}
              >
                Sign out
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <button
              type="button"
              onClick={signInWithGoogle}
              className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Sign in with Google
            </button>
            <p className="text-sm text-slate-600">
              Buzquad uses Firebase Auth with Google sign-in. If you haven’t created a Firebase project yet, add the required environment variables from
              `.env.example`.
            </p>
          </div>
        )}

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    </section>
  );
}

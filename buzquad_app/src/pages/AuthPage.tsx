import { Link } from 'react-router-dom';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';

export default function AuthPage() {
  const { user, loading, error, signInWithGoogle, signOutUser } = useFirebaseAuth();

  return (
    <section className="mx-auto max-w-md p-6 animate-slide-up">
      <div className="card p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500 text-2xl mx-auto shadow-md">⚡</div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Welcome to Buzquad</h2>
          <p className="text-sm" style={{ color: 'var(--text-2)' }}>Sign in with Google to get started.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-4">
            <div className="h-6 w-6 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
          </div>
        ) : user ? (
          <div className="space-y-4">
            <div className="rounded-xl p-4" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
              <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--text-3)' }}>Signed in as</p>
              <p className="mt-1 font-semibold" style={{ color: 'var(--text)' }}>{user.displayName || user.email}</p>
              <p className="text-sm" style={{ color: 'var(--text-2)' }}>{user.email}</p>
            </div>
            <div className="flex flex-col gap-3">
              <Link className="btn btn-primary w-full rounded-xl py-3" to="/onboarding">
                Continue to onboarding →
              </Link>
              <button type="button" className="btn btn-ghost w-full rounded-xl py-3" onClick={signOutUser}>
                Sign out
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <button
              type="button"
              onClick={signInWithGoogle}
              className="btn w-full rounded-xl py-3 text-sm font-semibold gap-3"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text)' }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
            <p className="text-xs text-center" style={{ color: 'var(--text-3)' }}>
              By signing in you agree to our{' '}
              <Link to="/terms" className="underline" style={{ color: 'var(--brand)' }}>Terms</Link>
              {' '}and{' '}
              <Link to="/privacy" className="underline" style={{ color: 'var(--brand)' }}>Privacy Policy</Link>.
            </p>
          </div>
        )}

        {error && <p className="text-sm text-red-500 text-center" role="alert">{error}</p>}
      </div>
    </section>
  );
}

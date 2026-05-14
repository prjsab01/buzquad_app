import { lazy, Suspense } from 'react';
import { Link, Route, Routes } from 'react-router-dom';

const AdminPage = lazy(() => import('./pages/AdminPage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const ChatRoomPage = lazy(() => import('./pages/ChatRoomPage'));
const CallPage = lazy(() => import('./pages/CallPage'));
const CommunityPage = lazy(() => import('./pages/CommunityPage'));
const EventsPage = lazy(() => import('./pages/EventsPage'));
const FeedPage = lazy(() => import('./pages/FeedPage'));
const InboxPage = lazy(() => import('./pages/InboxPage'));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'));
const ActivityHubPage = lazy(() => import('./pages/ActivityHubPage'));
const BackupPage = lazy(() => import('./pages/BackupPage'));
const PollsPage = lazy(() => import('./pages/PollsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));

function HomePage() {
  return (
    <section className="mx-auto max-w-5xl p-6">
      <h1 className="text-4xl font-semibold text-slate-900">Buzquad</h1>
      <p className="mt-4 text-lg text-slate-700">
        Welcome to the Buzquad app scaffold. This repo includes the React + TypeScript starter for the social collaboration platform.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link className="rounded-xl bg-slate-900 px-6 py-4 text-white shadow-lg transition hover:bg-slate-700" to="/auth">
          Sign in / Get started
        </Link>
        <Link className="rounded-xl border border-slate-200 px-6 py-4 text-slate-900 transition hover:bg-slate-50" to="/about">
          Product vision
        </Link>
      </div>
    </section>
  );
}

function AboutPage() {
  return (
    <section className="mx-auto max-w-4xl p-6">
      <h2 className="text-3xl font-semibold text-slate-900">Product vision</h2>
      <p className="mt-4 text-slate-700">
        Buzquad is a responsive PWA and Android-capable social collaboration platform. The initial scaffold includes routing, state readiness, and the foundation for auth, feed, and community modules.
      </p>
    </section>
  );
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20 text-slate-400 text-sm">
      Loading…
    </div>
  );
}

function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-lg font-semibold">Buzquad</div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
            <Link className="transition hover:text-slate-900" to="/">Home</Link>
            <Link className="transition hover:text-slate-900" to="/about">About</Link>
            <Link className="transition hover:text-slate-900" to="/auth">Auth</Link>
            <Link className="transition hover:text-slate-900" to="/onboarding">Onboarding</Link>
            <Link className="transition hover:text-slate-900" to="/inbox">Inbox</Link>
            <Link className="transition hover:text-slate-900" to="/feed">Feed</Link>
            <Link className="transition hover:text-slate-900" to="/profile">Profile</Link>
            <Link className="transition hover:text-slate-900" to="/communities">Communities</Link>
            <Link className="transition hover:text-slate-900" to="/events">Events</Link>
            <Link className="transition hover:text-slate-900" to="/polls">Polls</Link>
            <Link className="transition hover:text-slate-900" to="/activity">Activity</Link>
            <Link className="transition hover:text-slate-900" to="/backup">Backup</Link>
            <Link className="transition hover:text-slate-900" to="/admin">Admin</Link>
          </div>
        </nav>
      </header>

      <main className="py-10">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/inbox" element={<InboxPage />} />
            <Route path="/chat/:conversationId" element={<ChatRoomPage />} />
            <Route path="/call/:roomId" element={<CallPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/feed" element={<FeedPage />} />
            <Route path="/communities" element={<CommunityPage />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/polls" element={<PollsPage />} />
            <Route path="/activity" element={<ActivityHubPage />} />
            <Route path="/backup" element={<BackupPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}

export default App;

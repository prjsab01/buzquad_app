import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, Route, Routes, useNavigate } from 'react-router-dom';
import { useFirebaseAuth } from './hooks/useFirebaseAuth';
import { useTheme } from './hooks/useTheme';
import { listenToUnreadCount } from './lib/notificationService';
import { goOnline, goOffline } from './lib/presenceService';
import CommandPalette from './pages/CommandPalette';
import IncomingCallBanner from './components/IncomingCallBanner';

const AdminPage         = lazy(() => import('./pages/AdminPage'));
const AuthPage          = lazy(() => import('./pages/AuthPage'));
const ChatRoomPage      = lazy(() => import('./pages/ChatRoomPage'));
const CallPage          = lazy(() => import('./pages/CallPage'));
const CallLogsPage      = lazy(() => import('./pages/CallLogsPage'));
const CommunityPage     = lazy(() => import('./pages/CommunityPage'));
const CommunityDetailPage = lazy(() => import('./pages/CommunityDetailPage'));
const DraftsPage        = lazy(() => import('./pages/DraftsPage'));
const EventsPage        = lazy(() => import('./pages/EventsPage'));
const EventDetailPage   = lazy(() => import('./pages/EventDetailPage'));
const FeedPage          = lazy(() => import('./pages/FeedPage'));
const FriendsPage       = lazy(() => import('./pages/FriendsPage'));
const InboxPage         = lazy(() => import('./pages/InboxPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const OnboardingPage    = lazy(() => import('./pages/OnboardingPage'));
const ActivityHubPage   = lazy(() => import('./pages/ActivityHubPage'));
const BackupPage        = lazy(() => import('./pages/BackupPage'));
const PollsPage         = lazy(() => import('./pages/PollsPage'));
const ProfilePage       = lazy(() => import('./pages/ProfilePage'));
const SearchPage        = lazy(() => import('./pages/SearchPage'));
const SettingsPage      = lazy(() => import('./pages/SettingsPage'));
const NotesPage         = lazy(() => import('./pages/NotesPage'));
const WatchlistPage     = lazy(() => import('./pages/WatchlistPage'));
const WrappedPage       = lazy(() => import('./pages/WrappedPage'));
const SpacesPage        = lazy(() => import('./pages/SpacesPage'));
const PostDetailPage    = lazy(() => import('./pages/PostDetailPage'));
const InvitePage        = lazy(() => import('./pages/InvitePage'));
import { HelpPage, PrivacyPage, TermsPage, ShortcutsPage } from './pages/StaticPages';

const APK_URL = import.meta.env.VITE_APK_DOWNLOAD_URL as string | undefined;

function HomePage() {
  return (
    <section className="mx-auto max-w-4xl p-6 animate-slide-up">
      <div className="card p-10 text-center space-y-6">
        <div className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-500 text-4xl mx-auto shadow-lg">
          ⚡
        </div>
        <div>
          <h1 className="text-5xl font-bold" style={{ color: 'var(--text)' }}>Buzquad</h1>
          <p className="mt-3 text-lg max-w-xl mx-auto" style={{ color: 'var(--text-2)' }}>
            Social · Messaging · Communities · Activity — one coherent platform, entirely free.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            className="btn btn-primary px-8 py-3 text-base rounded-xl shadow-md hover:shadow-lg transition-shadow"
            to="/auth"
          >
            Get started →
          </Link>
          <Link
            className="btn btn-ghost px-8 py-3 text-base rounded-xl"
            to="/about"
          >
            Learn more
          </Link>
        </div>
        {APK_URL && (
          <div className="rounded-2xl border p-5 text-left max-w-sm mx-auto" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>📱 Android App — v1.0.0</p>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-2)' }}>
              936 KB · Enable "Install from unknown sources" before installing.
            </p>
            <a
              href={APK_URL}
              download
              className="btn btn-primary mt-3 w-full rounded-xl text-sm"
            >
              ⬇ Download APK
            </a>
            <p className="mt-2 text-[10px] font-mono break-all" style={{ color: 'var(--text-3)' }}>
              SHA-256: 500c583f696d36e2498d1fe560fc7212deca25a44e5458ebbe92c0990603be56
            </p>
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-sm" style={{ color: 'var(--text-2)' }}>
          {['💬 Messaging', '🏘️ Communities', '⚡ Activity Hub', '📞 Calls'].map((f) => (
            <div key={f} className="rounded-xl p-3 font-medium" style={{ background: 'var(--bg-subtle)' }}>{f}</div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AboutPage() {
  return (
    <section className="mx-auto max-w-3xl p-6 animate-slide-up">
      <div className="card p-8 space-y-4">
        <h2 className="text-3xl font-bold" style={{ color: 'var(--text)' }}>Product vision</h2>
        <p style={{ color: 'var(--text-2)' }}>
          Buzquad blends the best of Discord, Slack, WhatsApp, Instagram, and more into one coherent free-tier PWA + Android app.
          Built entirely on free infrastructure — Firebase, Cloudflare, and Cloudinary.
        </p>
      </div>
    </section>
  );
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="h-8 w-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
    </div>
  );
}

const NAV_LINKS = [
  { to: '/feed',        label: 'Feed' },
  { to: '/search',      label: 'Search' },
  { to: '/communities', label: 'Communities' },
  { to: '/inbox',       label: 'Inbox' },
  { to: '/friends',     label: 'Friends' },
  { to: '/calls',       label: 'Calls' },
  { to: '/events',      label: 'Events' },
  { to: '/polls',       label: 'Polls' },
  { to: '/activity',    label: 'Activity' },
  { to: '/notes',       label: 'Notes' },
  { to: '/watchlist',   label: 'Watchlist' },
  { to: '/backup',      label: 'Backup' },
];

const MOBILE_NAV = [
  { to: '/feed',          label: 'Feed',    icon: '🏠' },
  { to: '/communities',   label: 'Groups',  icon: '🏘️' },
  { to: '/inbox',         label: 'Inbox',   icon: '💬' },
  { to: '/notifications', label: 'Alerts',  icon: '🔔' },
  { to: '/profile',       label: 'Profile', icon: '👤' },
];

function ThemeToggle({ isDark, toggle }: { isDark: boolean; toggle: () => void }) {
  return (
    <button
      onClick={toggle}
      className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:opacity-80"
      style={{ background: 'var(--bg-subtle)', color: 'var(--text-2)' }}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  );
}

function AppShell() {
  const { user } = useFirebaseAuth();
  const { isDark, toggle } = useTheme();
  const [unread, setUnread] = useState(0);
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [offlineQueue, setOfflineQueue] = useState(0);
  const navigate = useNavigate();

  // §52 Listen for SW flush messages
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'FLUSH_OFFLINE_QUEUE') setOfflineQueue(0);
    };
    navigator.serviceWorker?.addEventListener('message', handler);
    return () => navigator.serviceWorker?.removeEventListener('message', handler);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setInstallPrompt(e); setShowInstallBanner(true); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    let gPressed = false;
    let gTimer: ReturnType<typeof setTimeout>;
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable;
      if (inInput) return;
      if (e.key === 'k' && !e.metaKey && !e.ctrlKey) { e.preventDefault(); setPaletteOpen(true); return; }
      if (e.key === 'Escape') { setPaletteOpen(false); return; }
      if (e.key === 'm') { navigate('/inbox'); return; }
      if (e.key === '/') { e.preventDefault(); (document.querySelector('input[type="search"], input[placeholder*="earch"]') as HTMLInputElement | null)?.focus(); return; }
      if (e.key === 'n') { navigate('/feed'); return; }
      if (e.key === 'g') {
        gPressed = true;
        clearTimeout(gTimer);
        gTimer = setTimeout(() => { gPressed = false; }, 1000);
        return;
      }
      if (gPressed) {
        clearTimeout(gTimer);
        gPressed = false;
        if (e.key === 'h') navigate('/feed');
        else if (e.key === 'c') navigate('/communities');
        else if (e.key === 'a') navigate('/activity');
        else if (e.key === 'e') navigate('/events');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navigate]);

  const handleInstall = async () => {
    if (!installPrompt) return;
    (installPrompt as unknown as { prompt: () => void }).prompt();
    setShowInstallBanner(false);
  };

  useEffect(() => {
    if (!user) return;
    goOnline(user.uid);
    return () => goOffline(user.uid);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return listenToUnreadCount(user.uid, setUnread);
  }, [user]);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Skip to content */}
      <a href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[200] focus:rounded-xl focus:px-4 focus:py-2 focus:text-sm focus:text-white focus:outline-none"
        style={{ background: 'var(--brand)' }}>
        Skip to main content
      </a>
      <div aria-live="polite" aria-atomic="true" className="sr-only" id="live-region" />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <IncomingCallBanner />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b backdrop-blur-md" style={{ background: 'color-mix(in srgb, var(--bg-card) 90%, transparent)', borderColor: 'var(--border)' }}>
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-bold text-lg shrink-0" style={{ color: 'var(--text)' }}>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-white text-sm font-bold shadow-sm">B</span>
            <span className="hidden sm:block">Buzquad</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-1 text-sm font-medium overflow-x-auto">
            {NAV_LINKS.map(({ to, label }) => (
              <Link key={to} to={to}
                className="rounded-lg px-3 py-1.5 transition-colors whitespace-nowrap"
                style={{ color: 'var(--text-2)' }}
                onMouseEnter={(e) => { (e.target as HTMLElement).style.color = 'var(--text)'; (e.target as HTMLElement).style.background = 'var(--bg-subtle)'; }}
                onMouseLeave={(e) => { (e.target as HTMLElement).style.color = 'var(--text-2)'; (e.target as HTMLElement).style.background = 'transparent'; }}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Command palette trigger */}
            <button
              onClick={() => setPaletteOpen(true)}
              className="hidden sm:flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors"
              style={{ borderColor: 'var(--border)', color: 'var(--text-3)', background: 'var(--bg-subtle)' }}
              aria-label="Open command palette (K)"
            >
              🔍 <kbd className="text-[10px] font-mono">K</kbd>
            </button>

            {/* Theme toggle */}
            <ThemeToggle isDark={isDark} toggle={toggle} />

            {/* Notifications */}
            <Link to="/notifications" className="relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
              style={{ color: 'var(--text-2)', background: 'var(--bg-subtle)' }}
              aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ''}`}>
              🔔
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </Link>

            {/* Profile / Sign in */}
            {user ? (
              <Link to="/profile"
                className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm"
                style={{ background: 'var(--brand)' }}
                aria-label="Your profile">
                {user.displayName?.[0]?.toUpperCase() ?? '?'}
              </Link>
            ) : (
              <Link to="/auth" className="btn btn-primary rounded-lg px-4 py-1.5 text-sm">
                Sign in
              </Link>
            )}

            {user && (
              <Link to="/admin" className="hidden lg:flex items-center rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors"
                style={{ color: 'var(--text-3)', background: 'var(--bg-subtle)' }}
                aria-label="Admin dashboard"
                title="Admin dashboard">
                🛡️
              </Link>
            )}
          </div>
        </nav>
      </header>

      {/* PWA install banner */}
      {showInstallBanner && (
        <div className="flex items-center justify-between gap-3 px-6 py-3 text-sm text-white animate-slide-up" style={{ background: 'var(--brand)' }}>
          <span>Install Buzquad as an app for the best experience.</span>
          <div className="flex gap-2 shrink-0">
            <button onClick={handleInstall}
              className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold"
              style={{ color: 'var(--brand)' }}>
              Install
            </button>
            <button onClick={() => setShowInstallBanner(false)}
              className="rounded-lg border border-white/30 px-3 py-1.5 text-xs text-white hover:bg-white/10">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* §52 Offline queue banner */}
      {offlineQueue > 0 && (
        <div className="flex items-center justify-between gap-3 px-6 py-2 text-xs" style={{ background: 'var(--bg-subtle)', color: 'var(--text-2)', borderBottom: '1px solid var(--border)' }}>
          <span>📤 {offlineQueue} item{offlineQueue !== 1 ? 's' : ''} queued — waiting for connection</span>
        </div>
      )}

      <main id="main-content" className="py-6 pb-24 sm:pb-8">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/"                    element={<HomePage />} />
            <Route path="/about"               element={<AboutPage />} />
            <Route path="/auth"                element={<AuthPage />} />
            <Route path="/onboarding"          element={<OnboardingPage />} />
            <Route path="/feed"                element={<FeedPage />} />
            <Route path="/search"              element={<SearchPage />} />
            <Route path="/inbox"               element={<InboxPage />} />
            <Route path="/chat/:conversationId" element={<ChatRoomPage />} />
            <Route path="/call/:roomId"        element={<CallPage />} />
            <Route path="/calls"               element={<CallLogsPage />} />
            <Route path="/profile"             element={<ProfilePage />} />
            <Route path="/profile/:username"   element={<ProfilePage />} />
            <Route path="/friends"             element={<FriendsPage />} />
            <Route path="/communities"         element={<CommunityPage />} />
            <Route path="/communities/:id"     element={<CommunityDetailPage />} />
            <Route path="/events"              element={<EventsPage />} />
            <Route path="/events/:id"          element={<EventDetailPage />} />
            <Route path="/polls"               element={<PollsPage />} />
            <Route path="/activity"            element={<ActivityHubPage />} />
            <Route path="/notifications"       element={<NotificationsPage />} />
            <Route path="/backup"              element={<BackupPage />} />
            <Route path="/settings"            element={<SettingsPage />} />
            <Route path="/admin"               element={<AdminPage />} />
            <Route path="/drafts"              element={<DraftsPage />} />
            <Route path="/notes"               element={<NotesPage />} />
            <Route path="/watchlist"           element={<WatchlistPage />} />
            <Route path="/wrapped"             element={<WrappedPage />} />
            <Route path="/spaces/:communityId" element={<SpacesPage />} />
            <Route path="/post/:postId"        element={<PostDetailPage />} />
            <Route path="/u/:username"         element={<ProfilePage />} />
            <Route path="/invite/:code"        element={<InvitePage />} />
            <Route path="/help"                element={<HelpPage />} />
            <Route path="/help/shortcuts"      element={<ShortcutsPage />} />
            <Route path="/privacy"             element={<PrivacyPage />} />
            <Route path="/terms"               element={<TermsPage />} />
          </Routes>
        </Suspense>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 mt-4" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 text-xs" style={{ color: 'var(--text-3)' }}>
          <span>© {new Date().getFullYear()} Buzquad</span>
          <div className="flex gap-4">
            {[['Help', '/help'], ['Shortcuts', '/help/shortcuts'], ['Privacy', '/privacy'], ['Terms', '/terms'], ['About', '/about']].map(([label, to]) => (
              <Link key={to} to={to} className="transition-colors hover:underline" style={{ color: 'var(--text-3)' }}
                onMouseEnter={(e) => { (e.target as HTMLElement).style.color = 'var(--text)'; }}
                onMouseLeave={(e) => { (e.target as HTMLElement).style.color = 'var(--text-3)'; }}>
                {label}
              </Link>
            ))}
          </div>
        </div>
      </footer>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-50 flex sm:hidden border-t backdrop-blur-md"
        style={{ background: 'color-mix(in srgb, var(--bg-card) 95%, transparent)', borderColor: 'var(--border)' }}>
        {MOBILE_NAV.map(({ to, label, icon }) => (
          <Link key={to} to={to}
            className="flex flex-1 flex-col items-center gap-0.5 py-2 transition-colors"
            style={{ color: 'var(--text-3)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--brand)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; }}>
            <span className="text-xl leading-none">{icon}</span>
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

export default function App() {
  return <AppShell />;
}

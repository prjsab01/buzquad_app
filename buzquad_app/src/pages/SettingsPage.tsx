import { useEffect, useState } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';
import { useTheme, ACCENT_COLORS, type ThemeMode, type Density, type FontStyle } from '../hooks/useTheme';
import { firestore } from '../lib/firestore';
import type { UserProfile } from '../types/user';

type Tab = 'basic' | 'advanced';
type PrivacyMode = 'public' | 'private' | 'circle-only';

function Toggle({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <label className="flex items-center justify-between gap-4 cursor-pointer">
      <span className="text-sm" style={{ color: 'var(--text-2)' }}>{label}</span>
      <button
        role="switch"
        aria-checked={on}
        onClick={onToggle}
        className="relative h-6 w-11 rounded-full transition-colors"
        style={{ background: on ? 'var(--brand)' : 'var(--border-strong)' }}
        aria-label={label}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-5' : 'left-0.5'}`} />
      </button>
    </label>
  );
}

export default function SettingsPage() {
  const { user, signOutUser } = useFirebaseAuth();
  const { settings: appearance, update: updateAppearance, accentColors } = useTheme();
  const [tab, setTab] = useState<Tab>('basic');
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Privacy
  const [privacyMode, setPrivacyMode] = useState<PrivacyMode>('public');
  const [showActivity, setShowActivity] = useState(true);
  const [showOnline, setShowOnline] = useState(true);

  // Notifications §43
  const [notifLevel, setNotifLevel] = useState<'all' | 'mentions' | 'important' | 'muted'>('all');
  const [digestFreq, setDigestFreq] = useState<'realtime' | 'daily' | 'weekly'>('realtime');
  const [dndStart, setDndStart] = useState('22:00');
  const [dndEnd, setDndEnd] = useState('08:00');
  const [dndEnabled, setDndEnabled] = useState(false);

  // Content filters §46
  const [keywordFilters, setKeywordFilters] = useState('');
  const [cwPref, setCwPref] = useState<'hide' | 'show' | 'selective'>('hide');

  // Streaks §49
  const [streaksEnabled, setStreaksEnabled] = useState(true);

  // i18n §50
  const [language, setLanguage] = useState('en');

  // Progressive disclosure §51
  const [advancedMode, setAdvancedMode] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(firestore, 'users', user.uid)).then((snap) => {
      if (!snap.exists()) return;
      const p = snap.data() as UserProfile;
      setProfile(p);
      if (p.privacyMode) setPrivacyMode(p.privacyMode as PrivacyMode);
      if (p.showActivity != null) setShowActivity(p.showActivity);
      if (p.showOnline != null) setShowOnline(p.showOnline);
      if (p.notifLevel) setNotifLevel(p.notifLevel as typeof notifLevel);
      if (p.digestFrequency) setDigestFreq(p.digestFrequency as typeof digestFreq);
      if (p.dndStart) setDndStart(p.dndStart);
      if (p.dndEnd) setDndEnd(p.dndEnd);
      if (p.keywordFilters) setKeywordFilters(p.keywordFilters.join(', '));
      if (p.contentWarningPref) setCwPref(p.contentWarningPref as typeof cwPref);
      if (p.streaksEnabled != null) setStreaksEnabled(p.streaksEnabled);
      if (p.language) setLanguage(p.language);
      if (p.advancedMode != null) setAdvancedMode(p.advancedMode);
    });
  }, [user]);

  if (!user) {
    return <section className="mx-auto max-w-lg p-6 text-center" style={{ color: 'var(--text-3)' }}>Sign in to access settings.</section>;
  }

  const handleSave = async () => {
    setSaving(true); setError(null); setSaved(false);
    try {
      await updateDoc(doc(firestore, 'users', user.uid), {
        privacyMode, showActivity, showOnline,
        notifLevel, digestFrequency: digestFreq,
        ...(dndEnabled ? { dndStart, dndEnd } : {}),
        keywordFilters: keywordFilters.split(',').map((k) => k.trim()).filter(Boolean),
        contentWarningPref: cwPref,
        streaksEnabled, language, advancedMode,
        theme: appearance.mode, accentColor: appearance.accent,
        density: appearance.density, fontStyle: appearance.font,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  };

  const section = (title: string, children: React.ReactNode) => (
    <div className="card p-6 space-y-4">
      <h3 className="text-base font-semibold" style={{ color: 'var(--text)' }}>{title}</h3>
      {children}
    </div>
  );

  const chipRow = <T extends string>(options: { value: T; label: string }[], current: T, set: (v: T) => void) => (
    <div className="flex flex-wrap gap-2">
      {options.map(({ value, label }) => (
        <button key={value} onClick={() => set(value)}
          className="rounded-lg border px-3 py-1.5 text-sm transition"
          style={{
            borderColor: current === value ? 'var(--brand)' : 'var(--border)',
            background: current === value ? 'var(--brand)' : 'transparent',
            color: current === value ? '#fff' : 'var(--text-2)',
          }}>
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <section className="mx-auto max-w-2xl p-6 space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Settings</h2>
        <div className="flex gap-1 rounded-xl p-1" style={{ background: 'var(--bg-subtle)' }}>
          {(['basic', 'advanced'] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className="rounded-lg px-4 py-1.5 text-sm font-medium capitalize transition"
              style={{
                background: tab === t ? 'var(--bg-card)' : 'transparent',
                color: tab === t ? 'var(--text)' : 'var(--text-3)',
                boxShadow: tab === t ? 'var(--shadow-sm)' : 'none',
              }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Account */}
      {section('Account', (
        <>
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full flex items-center justify-center text-lg font-bold text-white"
              style={{ background: 'var(--brand)' }}>
              {user.displayName?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div>
              <p className="font-semibold" style={{ color: 'var(--text)' }}>{user.displayName}</p>
              <p className="text-sm" style={{ color: 'var(--text-3)' }}>{user.email}</p>
            </div>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>
            Change avatar/cover on your <a href="/profile" className="underline" style={{ color: 'var(--brand)' }}>Profile page</a>.
          </p>
        </>
      ))}

      {/* §42 Appearance */}
      {section('Appearance', (
        <div className="space-y-5">
          <div>
            <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-2)' }}>Theme</p>
            {chipRow<ThemeMode>([
              { value: 'system', label: '💻 System' },
              { value: 'light',  label: '☀️ Light' },
              { value: 'dark',   label: '🌙 Dark' },
              { value: 'oled',   label: '⬛ OLED' },
            ], appearance.mode, (v) => updateAppearance({ mode: v }))}
          </div>
          <div>
            <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-2)' }}>Accent color</p>
            <div className="flex flex-wrap gap-2">
              {accentColors.map(({ id, label, value }) => (
                <button key={id} onClick={() => updateAppearance({ accent: value })}
                  title={label}
                  aria-label={`Accent color: ${label}`}
                  className="h-8 w-8 rounded-full border-2 transition"
                  style={{
                    background: value,
                    borderColor: appearance.accent === value ? 'var(--text)' : 'transparent',
                    transform: appearance.accent === value ? 'scale(1.2)' : 'scale(1)',
                  }} />
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-2)' }}>Density</p>
            {chipRow<Density>([
              { value: 'comfortable', label: 'Comfortable' },
              { value: 'compact',     label: 'Compact' },
              { value: 'cozy',        label: 'Cozy' },
            ], appearance.density, (v) => updateAppearance({ density: v }))}
          </div>
          {tab === 'advanced' && (
            <div>
              <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-2)' }}>Font</p>
              {chipRow<FontStyle>([
                { value: 'system',   label: 'System' },
                { value: 'serif',    label: 'Serif' },
                { value: 'dyslexic', label: 'Dyslexia-friendly' },
              ], appearance.font, (v) => updateAppearance({ font: v }))}
            </div>
          )}
        </div>
      ))}

      {/* §41 Accessibility */}
      {section('Accessibility', (
        <div className="space-y-3">
          <Toggle on={appearance.reduceMotion} onToggle={() => updateAppearance({ reduceMotion: !appearance.reduceMotion })} label="Reduce motion" />
          <Toggle on={appearance.highContrast} onToggle={() => updateAppearance({ highContrast: !appearance.highContrast })} label="High contrast" />
          <Toggle on={appearance.largeText} onToggle={() => updateAppearance({ largeText: !appearance.largeText })} label="Large text" />
          <Toggle on={appearance.disableAutoplay} onToggle={() => updateAppearance({ disableAutoplay: !appearance.disableAutoplay })} label="Disable autoplay for embeds" />
        </div>
      ))}

      {/* Privacy */}
      {section('Privacy', (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-2)' }}>Profile visibility</p>
            {chipRow<PrivacyMode>([
              { value: 'public',      label: '🌍 Public' },
              { value: 'private',     label: '🔒 Private' },
              { value: 'circle-only', label: '👥 Circle only' },
            ], privacyMode, setPrivacyMode)}
          </div>
          <Toggle on={showActivity} onToggle={() => setShowActivity((v) => !v)} label="Show activity status" />
          <Toggle on={showOnline} onToggle={() => setShowOnline((v) => !v)} label="Show online presence" />
        </div>
      ))}

      {/* §43 Notifications */}
      {section('Notifications', (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-2)' }}>Default notification level</p>
            {chipRow([
              { value: 'all',       label: 'All activity' },
              { value: 'mentions',  label: 'Mentions & DMs' },
              { value: 'important', label: 'Important only' },
              { value: 'muted',     label: 'Muted' },
            ], notifLevel, setNotifLevel)}
          </div>
          <div>
            <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-2)' }}>Notification digest</p>
            {chipRow([
              { value: 'realtime', label: 'Real-time' },
              { value: 'daily',    label: 'Daily digest' },
              { value: 'weekly',   label: 'Weekly digest' },
            ], digestFreq, setDigestFreq)}
          </div>
          {tab === 'advanced' && (
            <div className="space-y-3">
              <Toggle on={dndEnabled} onToggle={() => setDndEnabled((v) => !v)} label="Do not disturb schedule" />
              {dndEnabled && (
                <div className="flex gap-3 items-center">
                  <div>
                    <label className="text-xs" style={{ color: 'var(--text-3)' }}>From</label>
                    <input type="time" value={dndStart} onChange={(e) => setDndStart(e.target.value)}
                      className="input mt-1 w-32" aria-label="DND start time" />
                  </div>
                  <div>
                    <label className="text-xs" style={{ color: 'var(--text-3)' }}>To</label>
                    <input type="time" value={dndEnd} onChange={(e) => setDndEnd(e.target.value)}
                      className="input mt-1 w-32" aria-label="DND end time" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {/* §46 Content filters */}
      {tab === 'advanced' && section('Content filters', (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-2)' }}>Content warnings</p>
            {chipRow([
              { value: 'hide',       label: 'Hide until tapped' },
              { value: 'show',       label: 'Always show' },
              { value: 'selective',  label: 'Selective' },
            ], cwPref, setCwPref)}
          </div>
          <div>
            <label className="text-sm font-medium block mb-1" style={{ color: 'var(--text-2)' }}>
              Keyword filters <span className="font-normal text-xs" style={{ color: 'var(--text-3)' }}>(comma-separated)</span>
            </label>
            <input className="input" value={keywordFilters}
              onChange={(e) => setKeywordFilters(e.target.value)}
              placeholder="e.g. spoiler, politics, crypto"
              aria-label="Keyword filters" />
          </div>
        </div>
      ))}

      {/* §49 Streaks */}
      {tab === 'advanced' && section('Engagement', (
        <Toggle on={streaksEnabled} onToggle={() => setStreaksEnabled((v) => !v)} label="Enable streak tracking" />
      ))}

      {/* §50 Language */}
      {tab === 'advanced' && section('Language & region', (
        <div>
          <label className="text-sm font-medium block mb-1" style={{ color: 'var(--text-2)' }}>Language</label>
          <select className="input w-auto" value={language} onChange={(e) => setLanguage(e.target.value)}
            aria-label="Language">
            <option value="en">English</option>
          </select>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-3)' }}>More languages coming soon.</p>
        </div>
      ))}

      {/* §51 Progressive disclosure */}
      {tab === 'advanced' && section('Advanced features', (
        <Toggle on={advancedMode} onToggle={() => setAdvancedMode((v) => !v)}
          label="Show advanced features (collections, spaces, portfolio, analytics)" />
      ))}

      {/* Save */}
      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={saving} className="btn btn-primary rounded-xl px-6 py-2.5">
          {saving ? 'Saving…' : 'Save settings'}
        </button>
        {saved && <span className="text-sm" style={{ color: 'var(--success)' }}>✓ Saved</span>}
        {error && <span className="text-sm text-red-500">{error}</span>}
      </div>

      {/* Sign out */}
      <div className="card p-6 space-y-3" style={{ borderColor: 'var(--danger)' }}>
        <h3 className="text-base font-semibold text-red-500">Sign out</h3>
        <p className="text-sm" style={{ color: 'var(--text-2)' }}>Sign out of Buzquad on this device.</p>
        <button onClick={signOutUser} className="btn btn-danger rounded-xl px-5 py-2">Sign out</button>
      </div>
    </section>
  );
}

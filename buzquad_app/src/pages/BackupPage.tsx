import { useEffect, useState } from 'react';
import { Download, HardDrive, Settings, AlertTriangle, CheckCircle } from 'lucide-react';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';
import {
  getBackupSettings,
  saveBackupSettings,
  runChatBackup,
  getDriveAccessToken,
  getDriveAccountEmail,
  type BackupSettings,
  type BackupFormat,
  type BackupFrequency,
} from '../lib/backupService';

const FREQ_LABELS: Record<BackupFrequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
};

const SIZE_PRESETS = [50, 100, 250, 500, 1000];

function LastBackupInfo({ settings }: { settings: BackupSettings }) {
  const ts = settings.lastBackupAt as { toDate?: () => Date };
  const d: Date = ts.toDate ? ts.toDate() : new Date(String(settings.lastBackupAt));
  return (
    <p className="text-xs text-app-3">
      {'Last backup: '}{d.toLocaleString()}
      {settings.lastDriveFileUrl ? (
        <span> &middot; <a href={settings.lastDriveFileUrl} target="_blank" rel="noopener noreferrer" className="underline">View</a></span>
      ) : null}
    </p>
  );
}

export default function BackupPage() {
  const { user } = useFirebaseAuth();

  const [settings, setSettings] = useState<BackupSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);

  const [frequency, setFrequency] = useState<BackupFrequency>('monthly');
  const [sizeLimitMB, setSizeLimitMB] = useState(100);
  const [includeMedia, setIncludeMedia] = useState(false);
  const [driveEmail, setDriveEmail] = useState('');

  const [scope, setScope] = useState<'monthly' | 'all'>('monthly');
  const [format, setFormat] = useState<BackupFormat>('json');
  const [destination, setDestination] = useState<'download' | 'drive'>('drive');
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [driveUrl, setDriveUrl] = useState<string | null>(null);
  const [lastSizeMB, setLastSizeMB] = useState<number | null>(null);
  const [sizeWarning, setSizeWarning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [connectingDrive, setConnectingDrive] = useState(false);

  useEffect(() => {
    if (!user) return;
    getBackupSettings(user.uid).then((s) => {
      if (s) {
        setSettings(s);
        setFrequency(s.frequency ?? 'monthly');
        setSizeLimitMB(s.sizeLimitMB ?? 100);
        setIncludeMedia(s.includeMedia ?? false);
        setDriveEmail(s.driveAccountEmail ?? '');
        if (s.notifiedSizeLimit) setSizeWarning(true);
      }
      setLoadingSettings(false);
    });
  }, [user]);

  if (!user) {
    return <section className="mx-auto max-w-lg p-6 text-center text-app-3">Sign in to access backup settings.</section>;
  }

  const handleConnectDrive = async () => {
    setConnectingDrive(true);
    setError(null);
    try {
      const token = await getDriveAccessToken();
      const email = await getDriveAccountEmail(token);
      setDriveEmail(email);
      await saveBackupSettings(user.uid, { driveAccountEmail: email });
      setSettings((s) => ({ ...(s ?? {} as BackupSettings), driveAccountEmail: email }));
    } catch (e) { setError((e as Error).message); }
    finally { setConnectingDrive(false); }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    setSettingsSaved(false);
    try {
      await saveBackupSettings(user.uid, { frequency, sizeLimitMB, includeMedia, driveAccountEmail: driveEmail });
      setSettings((s) => ({ ...(s ?? {} as BackupSettings), frequency, sizeLimitMB, includeMedia, driveAccountEmail: driveEmail }));
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
    } catch (e) { setError((e as Error).message); }
    finally { setSavingSettings(false); }
  };

  const handleBackup = async () => {
    setRunning(true);
    setStatus(null);
    setError(null);
    setDriveUrl(null);
    setLastSizeMB(null);
    setSizeWarning(false);
    try {
      const result = await runChatBackup(user.uid, {
        scope,
        format,
        destination,
        includeMedia,
        settings,
      }, setStatus);
      if (result.driveUrl) setDriveUrl(result.driveUrl);
      if (result.sizeMB != null) setLastSizeMB(result.sizeMB);
      if (result.sizeWarning) setSizeWarning(true);
      setStatus('Backup complete!');
      const updated = await getBackupSettings(user.uid);
      if (updated) setSettings(updated);
    } catch (e) { setError((e as Error).message); setStatus(null); }
    finally { setRunning(false); }
  };

  const usedMB = settings?.totalSizeMB ?? 0;
  const limitMB = sizeLimitMB;
  const usagePct = Math.min(100, Math.round((usedMB / limitMB) * 100));
  const usageColor = usagePct >= 90 ? 'bg-red-500' : usagePct >= 70 ? 'bg-amber-400' : 'bg-green-500';

  return (
    <section className="mx-auto max-w-2xl p-6 space-y-6">

      {sizeWarning ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Storage limit reached</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Your cumulative backup size ({usedMB} MB) has reached your {limitMB} MB limit.
              Consider increasing the limit or clearing old backups from your Google Drive.
            </p>
          </div>
        </div>
      ) : null}

      <div className="card p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2">
          <Settings size={18} className="text-app-2" />
          <h2 className="text-lg font-semibold text-app">Backup Settings</h2>
        </div>

        {loadingSettings ? (
          <p className="text-sm text-app-3">Loading settings...</p>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-app-2 mb-2">Google Drive account</label>
              <div className="flex items-center gap-3">
                <div className="flex-1 rounded-xl border border-app bg-subtle px-4 py-2.5 text-sm text-app-2 min-h-[42px] flex items-center">
                  {driveEmail || <span className="text-app-3">Not connected</span>}
                </div>
                <button onClick={handleConnectDrive} disabled={connectingDrive}
                  className="shrink-0 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-app-2 hover:bg-subtle disabled:opacity-50">
                  {connectingDrive ? 'Connecting...' : driveEmail ? 'Change account' : 'Connect Drive'}
                </button>
              </div>
              <p className="mt-1 text-xs text-app-3">
                Backups are saved to a "Buzquad Backups" folder in this Google Drive account.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-app-2 mb-2">Backup frequency</label>
              <div className="flex gap-2">
                {(Object.keys(FREQ_LABELS) as BackupFrequency[]).map((f) => (
                  <button key={f} onClick={() => setFrequency(f)}
                    className={`rounded-lg border px-4 py-2 text-sm ${
                      frequency === f ? 'border-slate-900 bg-slate-900 text-white' : 'border-app text-app-2 hover:bg-subtle'
                    }`}>
                    {FREQ_LABELS[f]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-app-2 mb-2">
                Storage limit — notify me when backups exceed
              </label>
              <div className="flex flex-wrap gap-2">
                {SIZE_PRESETS.map((mb) => (
                  <button key={mb} onClick={() => setSizeLimitMB(mb)}
                    className={`rounded-lg border px-4 py-2 text-sm ${
                      sizeLimitMB === mb ? 'border-slate-900 bg-slate-900 text-white' : 'border-app text-app-2 hover:bg-subtle'
                    }`}>
                    {mb >= 1000 ? `${mb / 1000} GB` : `${mb} MB`}
                  </button>
                ))}
                <div className="flex items-center gap-2">
                  <input
                    type="number" min={1} max={10000} value={sizeLimitMB}
                    onChange={(e) => setSizeLimitMB(Number(e.target.value))}
                    className="w-24 rounded-lg border border-app bg-subtle px-3 py-2 text-sm outline-none focus:border-slate-400"
                  />
                  <span className="text-sm text-app-3">MB custom</span>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-xs text-app-3">
                  <span>Used: {usedMB} MB</span>
                  <span>Limit: {limitMB} MB</span>
                </div>
                <div className="h-2 w-full rounded-full bg-subtle overflow-hidden">
                  <div className={`h-2 rounded-full transition-all ${usageColor}`} style={{ width: `${usagePct}%` }} />
                </div>
                <p className="text-xs text-app-3">{usagePct}% of your limit used across all backups</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-app-2">Include media references</p>
                <p className="text-xs text-app-3 mt-0.5">
                  Include image URLs in the backup (links only).
                </p>
              </div>
              <button onClick={() => setIncludeMedia((v) => !v)}
                className={`relative h-6 w-11 rounded-full transition ${includeMedia ? 'bg-slate-900' : 'bg-slate-300'}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-card shadow transition-all ${includeMedia ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>

            {error != null ? <p className="text-sm text-red-600">{error}</p> : null}
            {settingsSaved ? (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle size={14} /> Settings saved.
              </div>
            ) : null}

            <button onClick={handleSaveSettings} disabled={savingSettings}
              className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50">
              {savingSettings ? 'Saving...' : 'Save settings'}
            </button>
          </>
        )}
      </div>

      <div className="card p-6 shadow-sm space-y-5">
        <h2 className="text-lg font-semibold text-app">Run Backup Now</h2>

        <div>
          <label className="block text-sm font-medium text-app-2 mb-2">Period</label>
          <div className="flex gap-2">
            {(['monthly', 'all'] as const).map((s) => (
              <button key={s} onClick={() => setScope(s)}
                className={`rounded-lg border px-4 py-2 text-sm ${
                  scope === s ? 'border-slate-900 bg-slate-900 text-white' : 'border-app text-app-2 hover:bg-subtle'
                }`}>
                {s === 'monthly' ? 'This month' : 'All time'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-app-2 mb-2">Format</label>
          <div className="flex gap-2">
            {(['json', 'html'] as BackupFormat[]).map((f) => (
              <button key={f} onClick={() => setFormat(f)}
                className={`rounded-lg border px-4 py-2 text-sm uppercase ${
                  format === f ? 'border-slate-900 bg-slate-900 text-white' : 'border-app text-app-2 hover:bg-subtle'
                }`}>
                {f}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-app-3">JSON is machine-readable. HTML is human-readable in any browser.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-app-2 mb-2">Destination</label>
          <div className="flex gap-2">
            <button onClick={() => setDestination('drive')}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm ${
                destination === 'drive' ? 'border-slate-900 bg-slate-900 text-white' : 'border-app text-app-2 hover:bg-subtle'
              }`}>
              <HardDrive size={14} /> Google Drive
            </button>
            <button onClick={() => setDestination('download')}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm ${
                destination === 'download' ? 'border-slate-900 bg-slate-900 text-white' : 'border-app text-app-2 hover:bg-subtle'
              }`}>
              <Download size={14} /> Download to device
            </button>
          </div>
          {destination === 'drive' && !driveEmail ? (
            <p className="mt-2 text-xs text-amber-600">Connect a Google Drive account in settings above first.</p>
          ) : null}
        </div>

        <button onClick={handleBackup}
          disabled={running || (destination === 'drive' && !driveEmail)}
          className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50">
          {running ? (status ?? 'Working...') : 'Start Backup'}
        </button>

        {status != null && !running ? (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
            <CheckCircle size={15} />
            <span>{status}{lastSizeMB != null ? ` (${lastSizeMB} MB)` : ''}</span>
          </div>
        ) : null}

        {driveUrl != null ? (
          <a href={driveUrl} target="_blank" rel="noopener noreferrer"
            className="block rounded-lg bg-subtle border border-app px-4 py-2.5 text-sm text-app-2 hover:bg-subtle">
            View backup in Google Drive
          </a>
        ) : null}

        {error != null ? (
          <p className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</p>
        ) : null}

        {settings?.lastBackupAt != null ? (
          <LastBackupInfo settings={settings} />
        ) : null}

        <div className="rounded-xl bg-subtle border border-app p-4 text-xs text-app-3 space-y-1">
          <p>Chat history is exported directly from Firestore to your chosen destination.</p>
          <p>Include media adds image URLs only - actual image files stay in Cloudinary.</p>
          <p>Backups are saved to a Buzquad Backups folder in your Google Drive.</p>
          <p>Buzquad never retains a copy of your backup.</p>
        </div>
      </div>
    </section>
  );
}

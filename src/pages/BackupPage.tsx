import { useState } from 'react';
import { Download, HardDrive, Info } from 'lucide-react';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';
import { runBackup, type BackupFormat, type BackupScope } from '../lib/backupService';

export default function BackupPage() {
  const { user } = useFirebaseAuth();
  const [scope, setScope] = useState<BackupScope>('all');
  const [format, setFormat] = useState<BackupFormat>('json');
  const [destination, setDestination] = useState<'download' | 'drive'>('download');
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [driveUrl, setDriveUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return (
      <section className="mx-auto max-w-lg p-6 text-center text-slate-500">
        Sign in to access backup settings.
      </section>
    );
  }

  const handleBackup = async () => {
    setRunning(true);
    setStatus(null);
    setError(null);
    setDriveUrl(null);
    try {
      const result = await runBackup(user.uid, scope, format, destination, setStatus);
      if (result.driveUrl) setDriveUrl(result.driveUrl);
      setStatus('Backup complete!');
    } catch (err) {
      setError((err as Error).message);
      setStatus(null);
    } finally {
      setRunning(false);
    }
  };

  return (
    <section className="mx-auto max-w-2xl p-6">
      <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-3xl font-semibold text-slate-900">Backup & Export</h2>
          <p className="mt-1 text-sm text-slate-600">
            Export your Buzquad data to a file or save it to your Google Drive.
          </p>
        </div>

        {/* scope */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">What to export</label>
          <div className="flex flex-wrap gap-2">
            {(['all', 'profile', 'messages'] as BackupScope[]).map((s) => (
              <button
                key={s}
                onClick={() => setScope(s)}
                className={`rounded-lg border px-4 py-2 text-sm capitalize ${
                  scope === s
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {s === 'all' ? 'Everything' : s}
              </button>
            ))}
          </div>
        </div>

        {/* format */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Format</label>
          <div className="flex gap-2">
            {(['json', 'html'] as BackupFormat[]).map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={`rounded-lg border px-4 py-2 text-sm uppercase ${
                  format === f
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            JSON is machine-readable. HTML is human-readable in any browser.
          </p>
        </div>

        {/* destination */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Destination</label>
          <div className="flex gap-2">
            <button
              onClick={() => setDestination('download')}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm ${
                destination === 'download'
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Download size={14} /> Download to device
            </button>
            <button
              onClick={() => setDestination('drive')}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm ${
                destination === 'drive'
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <HardDrive size={14} /> Save to Google Drive
            </button>
          </div>
          {destination === 'drive' && (
            <div className="mt-2 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
              <Info size={13} className="mt-0.5 shrink-0" />
              <span>
                Requires <code>VITE_GOOGLE_OAUTH_CLIENT_ID</code> in your environment and a
                Google OAuth 2.0 client configured for this domain. A popup will ask you to
                authorize Drive access — the file is saved to your own Drive, not shared with anyone.
              </span>
            </div>
          )}
        </div>

        {/* action */}
        <button
          onClick={handleBackup}
          disabled={running}
          className="w-full rounded-xl bg-slate-900 py-3 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {running ? status ?? 'Working…' : 'Start Backup'}
        </button>

        {/* feedback */}
        {status && !running && (
          <p className="rounded-lg bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-700">
            {status}
          </p>
        )}
        {driveUrl && (
          <a
            href={driveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-lg bg-slate-50 border border-slate-200 px-4 py-2 text-sm text-slate-700 underline"
          >
            View backup on Google Drive →
          </a>
        )}
        {error && (
          <p className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {/* info */}
        <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 text-xs text-slate-500 space-y-1">
          <p>• Your data is exported directly from Firestore to your device or Drive.</p>
          <p>• Media files (images, audio) are not included — only text and metadata.</p>
          <p>• Buzquad never retains a copy of your backup.</p>
          <p>• Large accounts may take a few seconds to export.</p>
        </div>
      </div>
    </section>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, PhoneIncoming, PhoneMissed, PhoneOff } from 'lucide-react';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';
import { listenCallLogs, type CallLog } from '../lib/callLogService';

function fmtDuration(s?: number) {
  if (!s || s <= 0) return '—';
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

function fmtDate(ts: unknown) {
  if (!ts || typeof ts !== 'object') return '';
  const seconds = (ts as { seconds?: number }).seconds;
  if (!seconds) return '';
  const d = new Date(seconds * 1000);
  return d.toLocaleString();
}

function statusBadge(log: CallLog) {
  const base = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold';
  switch (log.status) {
    case 'missed':
      return <span className={`${base} bg-red-100 text-red-700`}>Missed</span>;
    case 'declined':
      return <span className={`${base} bg-orange-100 text-orange-700`}>Declined</span>;
    case 'failed':
      return <span className={`${base} bg-yellow-100 text-yellow-800`}>Failed</span>;
    case 'in-progress':
      return <span className={`${base} bg-blue-100 text-blue-700`}>In progress</span>;
    default:
      return <span className={`${base} bg-green-100 text-green-700`}>Completed</span>;
  }
}

function directionIcon(log: CallLog) {
  if (log.status === 'missed') return <PhoneMissed size={18} className="text-red-500" />;
  if (log.status === 'declined') return <PhoneOff size={18} className="text-orange-500" />;
  if (log.direction === 'incoming') return <PhoneIncoming size={18} className="text-green-600" />;
  return <Phone size={18} className="text-app-2" />;
}

export default function CallLogsPage() {
  const { user } = useFirebaseAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    return listenCallLogs(user.uid, (l) => {
      setLogs(l);
      setLoading(false);
    });
  }, [user]);

  if (!user) {
    return (
      <section className="mx-auto max-w-2xl p-6">
        <div className="card p-8 text-app-2">Sign in to see your call history.</div>
      </section>
    );
  }

  const callBack = (log: CallLog) => {
    const roomId = `${[user.uid, log.peerUid].sort().join('_')}_${Date.now()}`;
    navigate(`/call/${roomId}?role=caller&peer=${log.peerUid}`);
  };

  return (
    <section className="mx-auto max-w-2xl p-6">
      <div className="card p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-app mb-1">Call history</h2>
        <p className="text-sm text-app-3 mb-5">Your recent calls — incoming, outgoing, missed, and declined.</p>

        {loading ? (
          <p className="text-app-3 text-sm">Loading…</p>
        ) : logs.length === 0 ? (
          <p className="text-app-3 text-sm">No calls yet.</p>
        ) : (
          <ul className="space-y-2">
            {logs.map((log) => (
              <li key={log.id} className="flex items-center gap-3 rounded-xl border border-app p-3">
                {log.peerAvatar ? (
                  <img src={log.peerAvatar} alt="" className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: 'var(--brand)' }}>
                    {log.peerName?.[0]?.toUpperCase() ?? '?'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {directionIcon(log)}
                    <button
                      onClick={() => navigate(`/profile?uid=${log.peerUid}`)}
                      className="font-semibold text-app truncate hover:underline"
                    >
                      {log.peerName}
                    </button>
                    {statusBadge(log)}
                  </div>
                  <p className="text-xs text-app-3 truncate">
                    {fmtDate(log.startedAt)}
                    {log.status === 'completed' && ` · ${fmtDuration(log.durationSec)}`}
                  </p>
                </div>
                <button
                  onClick={() => callBack(log)}
                  className="shrink-0 rounded-lg border border-app px-3 py-1.5 text-xs font-medium text-app-2 hover:bg-subtle"
                  aria-label={`Call ${log.peerName} back`}
                >
                  📞 Call back
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

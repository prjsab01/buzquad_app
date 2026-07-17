import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, PhoneOff } from 'lucide-react';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';
import { clearIncomingCall, listenIncomingCall, type IncomingCallInvite } from '../lib/callService';
import { startRinger, stopRinger } from '../lib/ringer';
import { logTerminalCall } from '../lib/callLogService';

const AUTO_DISMISS_MS = 60_000;

/**
 * Global listener for an incoming call invite on `incoming_calls/{my_uid}`.
 * Plays a ringtone, shows an Accept/Decline banner, auto-dismisses after 60s
 * as a missed call. Logs missed/declined to call_logs.
 */
export default function IncomingCallBanner() {
  const { user } = useFirebaseAuth();
  const [invite, setInvite] = useState<IncomingCallInvite | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    return listenIncomingCall(user.uid, setInvite);
  }, [user]);

  // Ringtone + auto-dismiss (logged as missed).
  useEffect(() => {
    if (!invite || !user) return;
    startRinger('incoming');
    const t = setTimeout(() => {
      stopRinger();
      void logTerminalCall(user.uid, {
        peerUid: invite.fromUid,
        peerName: invite.fromName,
        peerAvatar: invite.fromAvatar ?? null,
        direction: 'incoming',
        status: 'missed',
        roomId: invite.roomId,
      });
      void clearIncomingCall(user.uid);
    }, AUTO_DISMISS_MS);
    return () => {
      stopRinger();
      clearTimeout(t);
    };
  }, [invite, user]);

  if (!invite || !user) return null;

  const accept = () => {
    stopRinger();
    void clearIncomingCall(user.uid);
    navigate(`/call/${invite.roomId}?role=callee&peer=${invite.fromUid}`);
  };

  const decline = () => {
    stopRinger();
    void logTerminalCall(user.uid, {
      peerUid: invite.fromUid,
      peerName: invite.fromName,
      peerAvatar: invite.fromAvatar ?? null,
      direction: 'incoming',
      status: 'declined',
      roomId: invite.roomId,
    });
    void clearIncomingCall(user.uid);
  };

  return (
    <div
      role="alertdialog"
      aria-label={`Incoming call from ${invite.fromName}`}
      className="fixed top-20 right-4 z-[150] w-80 max-w-[calc(100vw-2rem)] rounded-2xl shadow-2xl animate-slide-up"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-3 p-4">
        {invite.fromAvatar ? (
          <img src={invite.fromAvatar} alt="" className="h-12 w-12 rounded-full object-cover" />
        ) : (
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white"
            style={{ background: 'var(--brand)' }}
          >
            {invite.fromName?.[0]?.toUpperCase() ?? '?'}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>
            Incoming call
          </p>
          <p className="font-semibold truncate" style={{ color: 'var(--text)' }}>
            {invite.fromName}
          </p>
        </div>
      </div>
      <div className="flex gap-2 px-4 pb-4">
        <button
          onClick={accept}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
          aria-label="Accept call"
        >
          <Phone size={16} /> Accept
        </button>
        <button
          onClick={decline}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          aria-label="Decline call"
        >
          <PhoneOff size={16} /> Decline
        </button>
      </div>
    </div>
  );
}

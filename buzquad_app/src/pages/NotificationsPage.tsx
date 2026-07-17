import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Check } from 'lucide-react';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';
import {
  listenToNotifications,
  markAllRead,
  markNotificationRead,
} from '../lib/notificationService';
import type { AppNotification } from '../types/notification';

const TYPE_ICON: Record<string, string> = {
  follow: '👤', friend_request: '🤝', mention: '@', reply: '💬',
  reaction: '❤️', event_invite: '📅', poll_vote: '📊',
  community_invite: '🏘️', call_invite: '📞', system: '🔔',
};

function timeAgo(val: unknown): string {
  if (!val) return '';
  const ts = val as { toDate?: () => Date };
  const d = ts.toDate ? ts.toDate() : new Date(val as string);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationsPage() {
  const { user } = useFirebaseAuth();
  const [notifs, setNotifs] = useState<AppNotification[]>([]);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    if (!user) return;
    return listenToNotifications(user.uid, setNotifs);
  }, [user]);

  if (!user) {
    return (
      <section className="mx-auto max-w-lg p-6 text-center text-app-3">
        Sign in to see notifications.
      </section>
    );
  }

  const unreadCount = notifs.filter((n) => !n.read).length;

  const handleMarkAll = async () => {
    setMarking(true);
    await markAllRead(user.uid);
    setMarking(false);
  };

  return (
    <section className="mx-auto max-w-2xl p-6">
      <div className="card shadow-sm">
        <div className="flex items-center justify-between border-b border-app px-6 py-5">
          <div className="flex items-center gap-2">
            <Bell size={20} className="text-app-2" />
            <h2 className="text-xl font-semibold text-app">Notifications</h2>
            {unreadCount > 0 && (
              <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAll}
              disabled={marking}
              className="flex items-center gap-1 text-xs text-app-3 hover:text-app disabled:opacity-50"
            >
              <Check size={13} /> Mark all read
            </button>
          )}
        </div>

        {notifs.length === 0 ? (
          <div className="py-16 text-center text-app-3 text-sm">
            No notifications yet.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {notifs.map((n) => (
              <li
                key={n.id}
                className={`flex items-start gap-3 px-6 py-4 transition ${!n.read ? 'bg-subtle' : ''}`}
              >
                <span className="mt-0.5 text-lg">{TYPE_ICON[n.type] ?? '🔔'}</span>
                <div className="flex-1 min-w-0">
                  {n.linkPath ? (
                    <Link to={n.linkPath} className="text-sm text-app hover:underline">
                      {n.text}
                    </Link>
                  ) : (
                    <p className="text-sm text-app">{n.text}</p>
                  )}
                  <p className="mt-0.5 text-xs text-app-3">{timeAgo(n.createdAt)}</p>
                </div>
                {!n.read && (
                  <button
                    onClick={() => markNotificationRead(user.uid, n.id)}
                    className="shrink-0 rounded-full bg-slate-200 p-1 hover:bg-slate-300"
                    title="Mark as read"
                  >
                    <Check size={11} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

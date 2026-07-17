import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';
import {
  acceptFriendRequest,
  cancelFriendRequest,
  listenToFriends,
  listenToIncomingRequests,
  listenToOutgoingRequests,
  rejectFriendRequest,
  removeFriend,
  type FriendEdge,
  type FriendRequest,
} from '../lib/friendService';
import { getUserProfile } from '../lib/userService';
import { createNotification } from '../lib/notificationService';
import type { UserProfile } from '../types/user';

type Tab = 'friends' | 'incoming' | 'outgoing';

export default function FriendsPage() {
  const { user } = useFirebaseAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('friends');
  const [friends, setFriends] = useState<FriendEdge[]>([]);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [profiles, setProfiles] = useState<Record<string, UserProfile | null>>({});

  useEffect(() => {
    if (!user) return;
    return listenToFriends(user.uid, setFriends);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return listenToIncomingRequests(user.uid, setIncoming);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return listenToOutgoingRequests(user.uid, setOutgoing);
  }, [user]);

  // Fetch display data for everyone shown on the page.
  useEffect(() => {
    const uids = new Set<string>();
    friends.forEach((f) => uids.add(f.uid));
    incoming.forEach((r) => uids.add(r.fromUid));
    outgoing.forEach((r) => uids.add(r.toUid));
    uids.forEach((uid) => {
      if (profiles[uid] !== undefined) return;
      getUserProfile(uid).then((p) => setProfiles((prev) => ({ ...prev, [uid]: p })));
    });
  }, [friends, incoming, outgoing, profiles]);

  if (!user) {
    return (
      <section className="mx-auto max-w-3xl p-6">
        <div className="card p-8">
          <p className="text-app-2">Sign in to manage your private circle.</p>
          <Link to="/auth" className="mt-4 inline-flex rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white">
            Sign in
          </Link>
        </div>
      </section>
    );
  }

  const handleAccept = async (req: FriendRequest) => {
    await acceptFriendRequest(req.id);
    await createNotification(req.fromUid, 'friend_request', `${user.displayName ?? 'Someone'} accepted your friend request`, {
      fromUid: user.uid,
      fromDisplayName: user.displayName ?? undefined,
      linkPath: `/profile?uid=${user.uid}`,
    });
  };

  const handleReject = async (req: FriendRequest) => {
    await rejectFriendRequest(req.id);
  };

  const handleCancel = async (req: FriendRequest) => {
    if (!window.confirm('Cancel this friend request?')) return;
    await cancelFriendRequest(req.id);
  };

  const handleRemove = async (otherUid: string) => {
    const p = profiles[otherUid];
    if (!window.confirm(`Remove ${p?.displayName ?? 'this user'} from your private circle?`)) return;
    await removeFriend(user.uid, otherUid);
  };

  const renderUserRow = (
    uid: string,
    rightSlot: React.ReactNode,
    subtitle?: string,
  ) => {
    const p = profiles[uid];
    return (
      <li key={uid} className="flex items-center gap-3 p-3 rounded-xl border border-app">
        {p?.avatarUrl ? (
          <img src={p.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: 'var(--brand)' }}>
            {p?.displayName?.[0]?.toUpperCase() ?? '?'}
          </div>
        )}
        <button
          onClick={() => navigate(`/profile?uid=${uid}`)}
          className="flex-1 min-w-0 text-left"
          aria-label={`View ${p?.displayName ?? 'user'}'s profile`}
        >
          <p className="font-semibold text-app truncate">{p?.displayName ?? '…'}</p>
          {p?.username && <p className="text-xs text-app-3 truncate">@{p.username}</p>}
          {subtitle && <p className="text-xs text-app-3 truncate">{subtitle}</p>}
        </button>
        <div className="flex gap-2 shrink-0">{rightSlot}</div>
      </li>
    );
  };

  return (
    <section className="mx-auto max-w-3xl p-6">
      <div className="card p-6 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-semibold text-app">Private circle</h2>
          <span className="text-xs text-app-3">{friends.length} friend{friends.length !== 1 ? 's' : ''}</span>
        </div>
        <p className="text-sm text-app-3 mb-5">
          Friends are mutual. Only people in your circle can see content you mark <em>circle-only</em>.
        </p>

        <div role="tablist" aria-label="Friend tabs" className="flex gap-2 mb-5 border-b border-app">
          {([
            ['friends',  `Friends (${friends.length})`],
            ['incoming', `Incoming (${incoming.length})`],
            ['outgoing', `Sent (${outgoing.length})`],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition ${
                tab === key
                  ? 'border-slate-900 text-app'
                  : 'border-transparent text-app-3 hover:text-app-2'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'friends' && (
          friends.length === 0 ? (
            <p className="text-app-3 text-sm">
              Your private circle is empty. Send a friend request from someone's profile to get started.
            </p>
          ) : (
            <ul className="space-y-2">
              {friends.map((f) =>
                renderUserRow(
                  f.uid,
                  <button
                    onClick={() => handleRemove(f.uid)}
                    className="rounded-lg border border-app px-3 py-1.5 text-xs text-app-2 hover:bg-subtle"
                    aria-label="Remove from circle"
                  >
                    Remove
                  </button>,
                ),
              )}
            </ul>
          )
        )}

        {tab === 'incoming' && (
          incoming.length === 0 ? (
            <p className="text-app-3 text-sm">No incoming friend requests.</p>
          ) : (
            <ul className="space-y-2">
              {incoming.map((req) =>
                renderUserRow(
                  req.fromUid,
                  <>
                    <button
                      onClick={() => void handleAccept(req)}
                      className="rounded-lg bg-green-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-800"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => void handleReject(req)}
                      className="rounded-lg border border-app px-3 py-1.5 text-xs text-app-2 hover:bg-subtle"
                    >
                      Reject
                    </button>
                  </>,
                ),
              )}
            </ul>
          )
        )}

        {tab === 'outgoing' && (
          outgoing.length === 0 ? (
            <p className="text-app-3 text-sm">No pending sent requests.</p>
          ) : (
            <ul className="space-y-2">
              {outgoing.map((req) =>
                renderUserRow(
                  req.toUid,
                  <button
                    onClick={() => void handleCancel(req)}
                    className="rounded-lg border border-app px-3 py-1.5 text-xs text-app-2 hover:bg-subtle"
                  >
                    Cancel
                  </button>,
                ),
              )}
            </ul>
          )
        )}
      </div>
    </section>
  );
}

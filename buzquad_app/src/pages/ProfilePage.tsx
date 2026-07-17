import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { doc, onSnapshot, collection, query, where, getCountFromServer, getDocs, updateDoc } from 'firebase/firestore';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';
import { followUser, unfollowUser, isFollowing } from '../lib/userService';
import { createNotification } from '../lib/notificationService';
import { createOrGetConversation } from '../lib/messageService';
import { sendFriendRequest, cancelFriendRequest, listenToOutgoingRequests, listenToIncomingRequests, acceptFriendRequest, rejectFriendRequest, listenIsFriend, listenToFriends } from '../lib/friendService';
import { useUpload } from '../hooks/useUpload';
import { setUserStatus, listenToUserStatus, type UserStatus } from '../lib/presenceService';
import { sendKudos } from '../lib/kudosService';
import { inviteToCall } from '../lib/callService';
import type { FriendRequest } from '../lib/friendService';
import { firestore } from '../lib/firestore';
import type { UserProfile, SpotlightItem } from '../types/user';

const STATUS_PRESETS: UserStatus[] = [
  { emoji: '🟢', text: 'Available' },
  { emoji: '🎧', text: 'Listening to music' },
  { emoji: '📚', text: 'Reading' },
  { emoji: '🏃', text: 'Away from keyboard' },
  { emoji: '📕', text: 'Do not disturb' },
  { emoji: '💻', text: 'Invisible' },
];

const EXPIRY_OPTIONS = [
  { label: '30 min', ms: 30 * 60 * 1000 },
  { label: '1 hour', ms: 60 * 60 * 1000 },
  { label: 'Today', ms: 0 },
  { label: 'Indefinite', ms: -1 },
];

export default function ProfilePage() {
  const { user: currentUser, signOutUser } = useFirebaseAuth();
  const [searchParams] = useSearchParams();
  const { username: usernameParam } = useParams<{ username?: string }>();
  const navigate = useNavigate();

  const viewUid = searchParams.get('uid');
  const [resolvedUid, setResolvedUid] = useState<string | null>(null);

  useEffect(() => {
    if (viewUid) { setResolvedUid(viewUid); return; }
    if (usernameParam) {
      getDocs(query(collection(firestore, 'usernames'), where('__name__', '==', usernameParam.toLowerCase())))
        .then((snap) => {
          setResolvedUid(!snap.empty ? (snap.docs[0].data().uid as string) : null);
        })
        .catch(() => setResolvedUid(null));
      return;
    }
    setResolvedUid(currentUser?.uid ?? null);
  }, [viewUid, usernameParam, currentUser]);

  const targetUid = resolvedUid;
  const isOwnProfile = (!viewUid && !usernameParam) || targetUid === currentUser?.uid;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);
  const [outgoingRequest, setOutgoingRequest] = useState<FriendRequest | null>(null);
  const [incomingRequest, setIncomingRequest] = useState<FriendRequest | null>(null);
  const [friendLoading, setFriendLoading] = useState(false);
  const [isFriend, setIsFriend] = useState(false);
  const [friendCount, setFriendCount] = useState(0);
  const [editingBio, setEditingBio] = useState(false);
  const [bioDraft, setBioDraft] = useState('');
  const [locationDraft, setLocationDraft] = useState('');
  const [pronounsDraft, setPronounsDraft] = useState('');
  const [savingBio, setSavingBio] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [kudosSent, setKudosSent] = useState(false);
  const [kudosMsg, setKudosMsg] = useState<string | null>(null);
  const [myStatus, setMyStatus] = useState<UserStatus | null>(null);
  const [showStatusEditor, setShowStatusEditor] = useState(false);
  const [statusEmoji, setStatusEmoji] = useState('');
  const [statusText, setStatusText] = useState('');
  const [statusExpiry, setStatusExpiry] = useState(-1);
  const [showSpotlightEditor, setShowSpotlightEditor] = useState(false);
  const [spotlightItems, setSpotlightItems] = useState<SpotlightItem[]>([]);
  const [spotlightTitle, setSpotlightTitle] = useState('');
  const [spotlightDesc, setSpotlightDesc] = useState('');
  const [spotlightUrl, setSpotlightUrl] = useState('');
  const [spotlightType, setSpotlightType] = useState<SpotlightItem['type']>('link');
  // §48 Portfolio
  const [portfolioItems, setPortfolioItems] = useState<import('../types/user').PortfolioItem[]>([]);
  const [showPortfolioEditor, setShowPortfolioEditor] = useState(false);
  const [pTitle, setPTitle] = useState('');
  const [pDesc, setPDesc] = useState('');
  const [pUrl, setPUrl] = useState('');
  const [pType, setPType] = useState<import('../types/user').PortfolioItem['type']>('project');
  const { upload, uploading: mediaUploading } = useUpload();
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!currentUser) return;
    return listenToUserStatus(currentUser.uid, setMyStatus);
  }, [currentUser]);

  useEffect(() => {
    if (profile?.spotlight) setSpotlightItems(profile.spotlight);
    if (profile?.portfolio) setPortfolioItems(profile.portfolio);
  }, [profile]);

  useEffect(() => {
    if (!targetUid) { setLoading(false); return; }
    setLoading(true);
    return onSnapshot(
      doc(firestore, 'users', targetUid),
      (snap) => { setProfile(snap.exists() ? (snap.data() as UserProfile) : null); setLoading(false); },
      (err) => { setError('Unable to load profile.'); setLoading(false); console.error(err); },
    );
  }, [targetUid]);

  useEffect(() => {
    if (!currentUser || !targetUid || isOwnProfile) return;
    isFollowing(currentUser.uid, targetUid).then(setFollowing);
  }, [currentUser, targetUid, isOwnProfile]);

  useEffect(() => {
    if (!targetUid) return;
    getCountFromServer(query(collection(firestore, 'follows'), where('toUid', '==', targetUid)))
      .then((snap) => setFollowerCount(snap.data().count));
  }, [targetUid]);

  useEffect(() => {
    if (!currentUser || !targetUid || isOwnProfile) return;
    return listenToOutgoingRequests(currentUser.uid, (reqs) => {
      setOutgoingRequest(reqs.find((r) => r.toUid === targetUid) ?? null);
    });
  }, [currentUser, targetUid, isOwnProfile]);

  useEffect(() => {
    if (!currentUser || !targetUid || isOwnProfile) return;
    return listenToIncomingRequests(currentUser.uid, (reqs) => {
      setIncomingRequest(reqs.find((r) => r.fromUid === targetUid) ?? null);
    });
  }, [currentUser, targetUid, isOwnProfile]);

  // Live friend-status check (am I in the target's circle?)
  useEffect(() => {
    if (!currentUser || !targetUid) return;
    return listenIsFriend(currentUser.uid, targetUid, setIsFriend);
  }, [currentUser, targetUid]);

  // Friend count of the *target* (so we can show it on any profile).
  useEffect(() => {
    if (!targetUid) return;
    return listenToFriends(targetUid, (list) => setFriendCount(list.length));
  }, [targetUid]);

  const handleFollow = async () => {
    if (!currentUser || !targetUid) return;
    setFollowLoading(true);
    try {
      if (following) {
        await unfollowUser(currentUser.uid, targetUid);
        setFollowing(false);
        setFollowerCount((c) => Math.max(0, c - 1));
      } else {
        await followUser(currentUser.uid, targetUid);
        setFollowing(true);
        setFollowerCount((c) => c + 1);
        await createNotification(targetUid, 'follow', `${currentUser.displayName ?? 'Someone'} followed you`, {
          fromUid: currentUser.uid,
          fromDisplayName: currentUser.displayName ?? undefined,
          linkPath: `/profile?uid=${currentUser.uid}`,
        });
      }
    } finally {
      setFollowLoading(false);
    }
  };

  const handleFriendRequest = async () => {
    if (!currentUser || !targetUid) return;
    setFriendLoading(true);
    try {
      if (incomingRequest) {
        await acceptFriendRequest(incomingRequest.id);
        await createNotification(targetUid, 'friend_request', `${currentUser.displayName ?? 'Someone'} accepted your friend request`, {
          fromUid: currentUser.uid,
          fromDisplayName: currentUser.displayName ?? undefined,
          linkPath: `/profile?uid=${currentUser.uid}`,
        });
      } else if (outgoingRequest) {
        await cancelFriendRequest(outgoingRequest.id);
      } else {
        await sendFriendRequest(currentUser.uid, currentUser.displayName ?? 'Someone', targetUid);
        await createNotification(targetUid, 'friend_request', `${currentUser.displayName ?? 'Someone'} sent you a friend request`, {
          fromUid: currentUser.uid,
          fromDisplayName: currentUser.displayName ?? undefined,
          linkPath: `/profile?uid=${currentUser.uid}`,
        });
      }
    } finally {
      setFriendLoading(false);
    }
  };

  const friendButtonLabel = incomingRequest ? 'Accept request' : outgoingRequest ? 'Cancel request' : 'Add friend';

  const handleMessage = async () => {
    if (!currentUser || !targetUid) return;
    const convId = await createOrGetConversation(currentUser.uid, targetUid);
    navigate(`/chat/${convId}`);
  };

  const handleSendKudos = async () => {
    if (!currentUser || !targetUid) return;
    const result = await sendKudos(currentUser.uid, currentUser.displayName ?? 'Someone', targetUid);
    if (result.ok) {
      setKudosSent(true);
      await createNotification(targetUid, 'reaction', `${currentUser.displayName ?? 'Someone'} sent you kudos ⭐`, {
        fromUid: currentUser.uid, linkPath: `/profile?uid=${currentUser.uid}`,
      });
    } else {
      setKudosMsg(result.reason ?? 'Could not send kudos.');
      setTimeout(() => setKudosMsg(null), 3000);
    }
  };

  const handleSetStatus = () => {
    if (!currentUser) return;
    if (!statusEmoji && !statusText) {
      setUserStatus(currentUser.uid, null);
    } else {
      const expiresAt = statusExpiry === -1 ? 0
        : statusExpiry === 0 ? new Date().setHours(23, 59, 59, 999)
        : Date.now() + statusExpiry;
      setUserStatus(currentUser.uid, { emoji: statusEmoji || undefined, text: statusText || undefined, expiresAt });
    }
    setShowStatusEditor(false);
  };

  const handleAddSpotlight = async () => {
    if (!currentUser || !spotlightTitle.trim()) return;
    const newItem: SpotlightItem = {
      id: crypto.randomUUID(),
      type: spotlightType,
      title: spotlightTitle.trim(),
      description: spotlightDesc.trim() || undefined,
      url: spotlightUrl.trim() || undefined,
    };
    const updated = [...spotlightItems, newItem].slice(0, 3);
    await updateDoc(doc(firestore, 'users', currentUser.uid), { spotlight: updated });
    setSpotlightItems(updated);
    setSpotlightTitle(''); setSpotlightDesc(''); setSpotlightUrl('');
    setShowSpotlightEditor(false);
  };

  const handleRemoveSpotlight = async (id: string) => {
    if (!currentUser) return;
    const target = spotlightItems.find((s) => s.id === id);
    if (!window.confirm(`Remove "${target?.title ?? 'this item'}" from your spotlight?`)) return;
    const updated = spotlightItems.filter((s) => s.id !== id);
    await updateDoc(doc(firestore, 'users', currentUser.uid), { spotlight: updated });
    setSpotlightItems(updated);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    const result = await upload(file, 'avatars');
    if (!result) return;
    await updateDoc(doc(firestore, 'users', currentUser.uid), { avatarUrl: result.publicUrl });
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    const result = await upload(file, 'covers');
    if (!result) return;
    await updateDoc(doc(firestore, 'users', currentUser.uid), { coverUrl: result.publicUrl });
  };

  // §48 Portfolio
  const handleAddPortfolio = async () => {
    if (!currentUser || !pTitle.trim()) return;
    const newItem: import('../types/user').PortfolioItem = {
      id: crypto.randomUUID(),
      title: pTitle.trim(),
      description: pDesc.trim() || undefined,
      externalUrl: pUrl.trim() || undefined,
      type: pType,
    };
    const updated = [...portfolioItems, newItem].slice(0, 20);
    await updateDoc(doc(firestore, 'users', currentUser.uid), { portfolio: updated });
    setPortfolioItems(updated);
    setPTitle(''); setPDesc(''); setPUrl(''); setShowPortfolioEditor(false);
  };

  const handleRemovePortfolio = async (id: string) => {
    if (!currentUser) return;
    const target = portfolioItems.find((p) => p.id === id);
    if (!window.confirm(`Remove "${target?.title ?? 'this item'}" from your portfolio?`)) return;
    const updated = portfolioItems.filter((p) => p.id !== id);
    await updateDoc(doc(firestore, 'users', currentUser.uid), { portfolio: updated });
    setPortfolioItems(updated);
  };

  const handleStartBioEdit = () => {
    setBioDraft(profile?.bio ?? '');
    setLocationDraft(profile?.location ?? '');
    setPronounsDraft(profile?.pronouns ?? '');
    setEditingBio(true);
  };

  const handleSaveBio = async () => {
    if (!currentUser) return;
    setSavingBio(true);
    try {
      await updateDoc(doc(firestore, 'users', currentUser.uid), {
        bio: bioDraft.trim(),
        location: locationDraft.trim(),
        pronouns: pronounsDraft.trim(),
      });
      setEditingBio(false);
    } finally {
      setSavingBio(false);
    }
  };

  const handleCopyProfileLink = async () => {
    if (!targetUid) return;
    const url = profile?.username
      ? `${window.location.origin}/u/${profile.username}`
      : `${window.location.origin}/profile?uid=${targetUid}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      window.prompt('Copy this profile link:', url);
    }
  };

  const handleSignOut = () => {
    if (!window.confirm('Sign out of Buzquad?')) return;
    signOutUser();
  };

  // Privacy gate: respect `privacyMode` on the *target* profile.
  // - 'public'      → everyone can see everything (default)
  // - 'circle-only' → only friends + self see bio/location/spotlight/portfolio
  // - 'private'     → only self sees those fields
  const privacyMode = profile?.privacyMode ?? 'public';
  const canSeePrivate =
    isOwnProfile ||
    privacyMode === 'public' ||
    (privacyMode === 'circle-only' && isFriend);

  if (!currentUser && !viewUid && !usernameParam) {
    return (
      <section className="mx-auto max-w-5xl p-6">
        <div className="card p-8 shadow-sm">
          <h2 className="text-3xl font-semibold text-app">Profile</h2>
          <p className="mt-4 text-app-2">Sign in to view your profile.</p>
          <Link className="mt-6 inline-flex rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800" to="/auth">
            Sign in
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-5xl p-6">
      <div className="card shadow-sm overflow-hidden">

        {/* Cover image */}
        <div className="relative h-32 bg-gradient-to-r from-slate-200 to-slate-300">
          {profile?.coverUrl && (
            <img src={profile.coverUrl} alt="cover" className="h-full w-full object-cover" />
          )}
          {isOwnProfile && (
            <>
              <button
                onClick={() => coverInputRef.current?.click()}
                disabled={mediaUploading}
                className="absolute bottom-2 right-2 rounded-lg bg-black/40 px-2.5 py-1 text-xs text-white hover:bg-black/60 backdrop-blur"
                aria-label="Change cover image"
              >
                {mediaUploading ? '...' : '📷 Cover'}
              </button>
              <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
            </>
          )}
        </div>

        <div className="p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-end gap-4 -mt-14">
              {/* Avatar */}
              <div className="relative shrink-0">
                {profile?.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="avatar" className="h-20 w-20 rounded-full object-cover ring-4 ring-white" />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-200 text-3xl font-semibold text-app-2 ring-4 ring-white">
                    {profile?.displayName?.[0]?.toUpperCase() ?? '?'}
                  </div>
                )}
                {isOwnProfile && (
                  <label
                    className="absolute -bottom-1 -right-1 cursor-pointer rounded-full bg-slate-900 px-1.5 py-0.5 text-[10px] text-white hover:bg-slate-700"
                    aria-label="Change avatar"
                  >
                    {mediaUploading ? '...' : 'Edit'}
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={mediaUploading} />
                  </label>
                )}
              </div>
              <div className="pb-1">
                <h2 className="text-2xl font-semibold text-app">
                  {isOwnProfile ? (profile?.displayName ?? 'Your profile') : (profile?.displayName ?? 'Profile')}
                </h2>
                {profile?.username && <p className="text-app-3">@{profile.username}</p>}
                <p className="text-sm text-app-3">
                  {followerCount} follower{followerCount !== 1 ? 's' : ''}
                  {' · '}
                  <Link to="/friends" className="hover:underline" aria-label="View friends">
                    {friendCount} friend{friendCount !== 1 ? 's' : ''}
                  </Link>
                </p>
                {isOwnProfile && myStatus && (
                  <p className="mt-1 text-sm text-app-2">{myStatus.emoji} {myStatus.text}</p>
                )}
              </div>
            </div>

            <div className="flex gap-2 flex-wrap mt-2 sm:mt-0">
              {isOwnProfile && (
                <button
                  onClick={() => { setStatusEmoji(myStatus?.emoji ?? ''); setStatusText(myStatus?.text ?? ''); setShowStatusEditor(true); }}
                  className="rounded-xl border border-app px-3 py-1.5 text-xs text-app-2 hover:bg-subtle"
                  aria-label="Set status"
                >
                  {myStatus ? `${myStatus.emoji ?? ''} ${myStatus.text ?? ''}`.trim() : '😶 Set status'}
                </button>
              )}
              <button
                onClick={handleCopyProfileLink}
                className="rounded-xl border border-app px-3 py-1.5 text-xs text-app-2 hover:bg-subtle"
                aria-label="Copy profile link"
              >
                {copiedLink ? '✓ Copied' : '🔗 Copy link'}
              </button>
              {!isOwnProfile && currentUser && (
                <>
                  <button
                    onClick={handleFollow}
                    disabled={followLoading}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${
                      following
                        ? 'border border-slate-300 text-app-2 hover:bg-subtle'
                        : 'bg-slate-900 text-white hover:bg-slate-700'
                    }`}
                  >
                    {followLoading ? '…' : following ? 'Unfollow' : 'Follow'}
                  </button>
                  <button
                    onClick={handleFriendRequest}
                    disabled={friendLoading || isFriend}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${
                      isFriend
                        ? 'border border-green-300 text-green-700'
                        : incomingRequest
                        ? 'bg-green-700 text-white hover:bg-green-800'
                        : outgoingRequest
                        ? 'border border-slate-300 text-app-3 hover:bg-subtle'
                        : 'border border-slate-300 text-app-2 hover:bg-subtle'
                    }`}
                    aria-label={isFriend ? 'Already in your circle' : friendButtonLabel}
                  >
                    {friendLoading ? '…' : isFriend ? '✓ In circle' : friendButtonLabel}
                  </button>
                  {incomingRequest && !isFriend && (
                    <button
                      onClick={async () => {
                        if (!incomingRequest) return;
                        setFriendLoading(true);
                        try { await rejectFriendRequest(incomingRequest.id); }
                        finally { setFriendLoading(false); }
                      }}
                      disabled={friendLoading}
                      className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-app-2 transition hover:bg-subtle disabled:opacity-50"
                      aria-label="Reject friend request"
                    >
                      Reject
                    </button>
                  )}
                  <button
                    onClick={handleMessage}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-app-2 transition hover:bg-subtle"
                  >
                    Message
                  </button>
                  <button
                    onClick={async () => {
                      if (!currentUser || !targetUid) return;
                      const roomId = `${[currentUser.uid, targetUid].sort().join('_')}_${Date.now()}`;
                      try {
                        await inviteToCall(
                          targetUid,
                          roomId,
                          currentUser.uid,
                          currentUser.displayName ?? 'Someone',
                          currentUser.photoURL,
                        );
                      } catch (err) {
                        console.warn('[call] failed to send invite', err);
                      }
                      navigate(`/call/${roomId}?role=caller&peer=${targetUid}`);
                    }}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-app-2 transition hover:bg-subtle"
                    aria-label="Start audio/video call"
                  >
                    📞 Call
                  </button>
                  <button
                    onClick={handleSendKudos}
                    disabled={kudosSent}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-app-2 transition hover:bg-subtle disabled:opacity-60"
                    title="Send kudos (max 5/day)"
                  >
                    {kudosSent ? '⭐ Kudos sent!' : '⭐ Kudos'}
                  </button>
                  {kudosMsg && <span className="text-xs text-red-500">{kudosMsg}</span>}
                </>
              )}
              {isOwnProfile && (
                <>
                  <Link to="/friends"
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-app-2 transition hover:bg-subtle">
                    👥 Friends
                  </Link>
                  <Link to="/wrapped"
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-app-2 transition hover:bg-subtle">
                    🎁 Wrapped
                  </Link>
                  <Link to="/settings"
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-app-2 transition hover:bg-subtle">
                    ⚙️ Settings
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                  >
                    Sign out
                  </button>
                </>
              )}
            </div>
          </div>

          {loading ? (
            <div className="mt-8 grid gap-6 sm:grid-cols-2" aria-busy="true" aria-label="Loading profile">
              {[0, 1].map((i) => (
                <div key={i} className="rounded-2xl border border-app bg-subtle p-6 animate-pulse">
                  <div className="h-3 w-24 rounded bg-slate-300/60 mb-4" />
                  <div className="h-3 w-full rounded bg-slate-300/60 mb-2" />
                  <div className="h-3 w-5/6 rounded bg-slate-300/60 mb-2" />
                  <div className="h-3 w-2/3 rounded bg-slate-300/60" />
                </div>
              ))}
            </div>
          ) : error ? (
            <p className="mt-8 text-red-600" role="alert">{error}</p>
          ) : profile ? (
            <>
              <div className="mt-8 grid gap-6 sm:grid-cols-2">
                <div className="rounded-2xl border border-app bg-subtle p-6">
                  <p className="text-sm uppercase tracking-[0.2em] text-app-3">Account</p>
                  <div className="mt-4 space-y-2 text-app-2">
                    <p><span className="font-semibold text-app">Email:</span> {isOwnProfile ? currentUser?.email : '—'}</p>
                    <p><span className="font-semibold text-app">Username:</span> {profile.username ? `@${profile.username}` : 'Not set'}</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-app bg-subtle p-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm uppercase tracking-[0.2em] text-app-3">Profile details</p>
                    {isOwnProfile && !editingBio && (
                      <button
                        onClick={handleStartBioEdit}
                        className="rounded-lg border border-app px-2.5 py-1 text-xs text-app-2 hover:bg-subtle"
                        aria-label="Edit profile details"
                      >
                        ✏️ Edit
                      </button>
                    )}
                  </div>
                  {editingBio && isOwnProfile ? (
                    <div className="mt-4 space-y-3">
                      <input
                        value={locationDraft}
                        onChange={(e) => setLocationDraft(e.target.value)}
                        placeholder="Location"
                        maxLength={80}
                        className="w-full rounded-xl border border-app px-3 py-2 text-sm outline-none focus:border-slate-400"
                        aria-label="Location"
                      />
                      <input
                        value={pronounsDraft}
                        onChange={(e) => setPronounsDraft(e.target.value)}
                        placeholder="Pronouns (she/her, they/them, …)"
                        maxLength={30}
                        className="w-full rounded-xl border border-app px-3 py-2 text-sm outline-none focus:border-slate-400"
                        aria-label="Pronouns"
                      />
                      <textarea
                        value={bioDraft}
                        onChange={(e) => setBioDraft(e.target.value)}
                        placeholder="A short bio about you"
                        maxLength={280}
                        rows={3}
                        className="w-full rounded-xl border border-app px-3 py-2 text-sm outline-none focus:border-slate-400 resize-none"
                        aria-label="Bio"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveBio}
                          disabled={savingBio}
                          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
                        >
                          {savingBio ? 'Saving…' : 'Save'}
                        </button>
                        <button
                          onClick={() => setEditingBio(false)}
                          className="rounded-xl border border-app px-4 py-2 text-sm text-app-2 hover:bg-subtle"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : !canSeePrivate ? (
                    <p className="mt-4 text-sm text-app-3">
                      🔒 {profile.displayName ?? 'This user'} keeps their details visible only to their private circle.
                    </p>
                  ) : (
                    <div className="mt-4 space-y-2 text-app-2">
                      <p><span className="font-semibold text-app">Location:</span> {profile.location || 'Not specified'}</p>
                      <p><span className="font-semibold text-app">Pronouns:</span> {profile.pronouns || 'Not specified'}</p>
                      <p><span className="font-semibold text-app">About:</span> {profile.bio || 'No bio added yet.'}</p>
                    </div>
                  )}
                </div>
              </div>

              {canSeePrivate && (spotlightItems.length > 0 || isOwnProfile) && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-app-2">Spotlight</p>
                    {isOwnProfile && spotlightItems.length < 3 && (
                      <button
                        onClick={() => setShowSpotlightEditor(true)}
                        className="rounded-lg border border-app px-3 py-1 text-xs text-app-2 hover:bg-subtle"
                        aria-label="Add spotlight item"
                      >
                        + Add
                      </button>
                    )}
                  </div>
                  {spotlightItems.length === 0 ? (
                    <p className="text-xs text-app-3">Pin up to 3 items to your profile spotlight.</p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-3">
                      {spotlightItems.map((item) => (
                        <div key={item.id} className="relative rounded-xl border border-app bg-subtle p-4">
                          <p className="text-[10px] uppercase tracking-wide text-app-3 mb-1">{item.type}</p>
                          <p className="font-medium text-app text-sm line-clamp-1">{item.title}</p>
                          {item.description && <p className="text-xs text-app-3 mt-0.5 line-clamp-2">{item.description}</p>}
                          {item.url && (
                            <a href={item.url} target="_blank" rel="noopener noreferrer"
                              className="mt-2 block text-xs text-app-3 underline truncate">{item.url}</a>
                          )}
                          {isOwnProfile && (
                            <button
                              onClick={() => handleRemoveSpotlight(item.id)}
                              className="absolute top-2 right-2 text-slate-300 hover:text-red-400 text-xs"
                              aria-label={`Remove ${item.title} from spotlight`}
                            >✕</button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* §48 Portfolio */}
              {canSeePrivate && (portfolioItems.length > 0 || isOwnProfile) && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-app-2">Portfolio</p>
                    {isOwnProfile && portfolioItems.length < 20 && (
                      <button onClick={() => setShowPortfolioEditor(true)}
                        className="rounded-lg border border-app px-3 py-1 text-xs text-app-2 hover:bg-subtle"
                        aria-label="Add portfolio item">+ Add</button>
                    )}
                  </div>
                  {portfolioItems.length === 0 ? (
                    <p className="text-xs text-app-3">Showcase your projects, designs, writing, and more.</p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {portfolioItems.map((item) => (
                        <div key={item.id} className="relative rounded-xl border border-app bg-subtle p-4">
                          <p className="text-[10px] uppercase tracking-wide text-app-3 mb-1">{item.type}</p>
                          <p className="font-medium text-app text-sm line-clamp-1">{item.title}</p>
                          {item.description && <p className="text-xs text-app-3 mt-0.5 line-clamp-2">{item.description}</p>}
                          {item.externalUrl && (
                            <a href={item.externalUrl} target="_blank" rel="noopener noreferrer"
                              className="mt-2 block text-xs underline truncate" style={{ color: 'var(--brand)' }}>
                              {item.externalUrl}
                            </a>
                          )}
                          {isOwnProfile && (
                            <button onClick={() => handleRemovePortfolio(item.id)}
                              className="absolute top-2 right-2 text-xs hover:text-red-400"
                              style={{ color: 'var(--text-3)' }}
                              aria-label={`Remove ${item.title}`}>✕</button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="mt-8 rounded-2xl border border-app bg-subtle p-6 text-app-2">
              <p className="text-lg font-semibold text-app">Profile data is missing.</p>
              {isOwnProfile && (
                <>
                  <p className="mt-3">Complete onboarding to save your profile and username.</p>
                  <Link className="mt-6 inline-flex rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800" to="/onboarding">
                    Finish onboarding
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Spotlight editor modal */}
      {showSpotlightEditor && isOwnProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowSpotlightEditor(false)}>
          <div className="w-full max-w-sm card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}
            role="dialog" aria-label="Add spotlight item" aria-modal="true">
            <h3 className="text-lg font-semibold text-app mb-4">Add to Spotlight</h3>
            <div className="space-y-3">
              <div className="flex gap-2">
                {(['link', 'post', 'community'] as SpotlightItem['type'][]).map((t) => (
                  <button key={t} onClick={() => setSpotlightType(t)}
                    className={`rounded-lg border px-3 py-1.5 text-xs capitalize transition ${
                      spotlightType === t ? 'border-slate-900 bg-slate-900 text-white' : 'border-app text-app-2 hover:bg-subtle'
                    }`}>{t}</button>
                ))}
              </div>
              <input value={spotlightTitle} onChange={(e) => setSpotlightTitle(e.target.value)}
                placeholder="Title *" maxLength={60}
                className="w-full rounded-xl border border-app px-3 py-2 text-sm outline-none focus:border-slate-400"
                aria-label="Spotlight title" />
              <input value={spotlightDesc} onChange={(e) => setSpotlightDesc(e.target.value)}
                placeholder="Short description (optional)" maxLength={120}
                className="w-full rounded-xl border border-app px-3 py-2 text-sm outline-none focus:border-slate-400"
                aria-label="Spotlight description" />
              {spotlightType === 'link' && (
                <input value={spotlightUrl} onChange={(e) => setSpotlightUrl(e.target.value)}
                  placeholder="https://..." type="url"
                  className="w-full rounded-xl border border-app px-3 py-2 text-sm outline-none focus:border-slate-400"
                  aria-label="Spotlight URL" />
              )}
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleAddSpotlight} disabled={!spotlightTitle.trim()}
                className="flex-1 rounded-xl bg-slate-900 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50">
                Add
              </button>
              <button onClick={() => setShowSpotlightEditor(false)}
                className="rounded-xl border border-app px-4 py-2 text-sm text-app-2 hover:bg-subtle">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status editor modal */}
      {showStatusEditor && isOwnProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowStatusEditor(false)}>
          <div className="w-full max-w-sm card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}
            role="dialog" aria-label="Set status" aria-modal="true">
            <h3 className="text-lg font-semibold text-app mb-4">Set your status</h3>
            <div className="flex gap-2 mb-3">
              <input value={statusEmoji} onChange={(e) => setStatusEmoji(e.target.value)} placeholder="😀"
                className="w-14 rounded-xl border border-app px-2 py-2 text-center text-lg outline-none focus:border-slate-400"
                maxLength={2} aria-label="Status emoji" />
              <input value={statusText} onChange={(e) => setStatusText(e.target.value)} placeholder="What's your status?"
                className="flex-1 rounded-xl border border-app px-3 py-2 text-sm outline-none focus:border-slate-400"
                maxLength={60} aria-label="Status text" />
            </div>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {STATUS_PRESETS.map((p) => (
                <button key={p.text} onClick={() => { setStatusEmoji(p.emoji ?? ''); setStatusText(p.text ?? ''); }}
                  className="rounded-full border border-app px-2.5 py-1 text-xs hover:bg-subtle">
                  {p.emoji} {p.text}
                </button>
              ))}
            </div>
            <div className="mb-4">
              <p className="text-xs text-app-3 mb-1">Clear after</p>
              <div className="flex gap-1.5 flex-wrap">
                {EXPIRY_OPTIONS.map((opt) => (
                  <button key={opt.label} onClick={() => setStatusExpiry(opt.ms)}
                    className={`rounded-full border px-2.5 py-1 text-xs transition ${
                      statusExpiry === opt.ms ? 'border-slate-900 bg-slate-900 text-white' : 'border-app hover:bg-subtle'
                    }`}>{opt.label}</button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleSetStatus}
                className="flex-1 rounded-xl bg-slate-900 py-2 text-sm font-semibold text-white hover:bg-slate-700">Save</button>
              <button onClick={() => { setUserStatus(currentUser!.uid, null); setShowStatusEditor(false); }}
                className="rounded-xl border border-app px-4 py-2 text-sm text-app-2 hover:bg-subtle">Clear</button>
            </div>
          </div>
        </div>
      )}

      {/* §48 Portfolio editor modal */}
      {showPortfolioEditor && isOwnProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowPortfolioEditor(false)}>
          <div className="w-full max-w-sm card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}
            role="dialog" aria-label="Add portfolio item" aria-modal="true">
            <h3 className="text-lg font-semibold text-app mb-4">Add Portfolio Item</h3>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {(['project','design','writing','code','art','music','video','other'] as import('../types/user').PortfolioItem['type'][]).map((t) => (
                  <button key={t} onClick={() => setPType(t)}
                    className={`rounded-lg border px-2.5 py-1 text-xs capitalize transition ${
                      pType === t ? 'border-slate-900 bg-slate-900 text-white' : 'border-app text-app-2 hover:bg-subtle'
                    }`}>{t}</button>
                ))}
              </div>
              <input value={pTitle} onChange={(e) => setPTitle(e.target.value)} placeholder="Title *" maxLength={80}
                className="w-full rounded-xl border border-app px-3 py-2 text-sm outline-none focus:border-slate-400"
                aria-label="Portfolio title" />
              <textarea value={pDesc} onChange={(e) => setPDesc(e.target.value)} placeholder="Description (optional)" maxLength={200}
                rows={2} className="w-full rounded-xl border border-app px-3 py-2 text-sm outline-none focus:border-slate-400 resize-none"
                aria-label="Portfolio description" />
              <input value={pUrl} onChange={(e) => setPUrl(e.target.value)} placeholder="https://... (optional)" type="url"
                className="w-full rounded-xl border border-app px-3 py-2 text-sm outline-none focus:border-slate-400"
                aria-label="Portfolio URL" />
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleAddPortfolio} disabled={!pTitle.trim()}
                className="flex-1 rounded-xl bg-slate-900 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50">Add</button>
              <button onClick={() => setShowPortfolioEditor(false)}
                className="rounded-xl border border-app px-4 py-2 text-sm text-app-2 hover:bg-subtle">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

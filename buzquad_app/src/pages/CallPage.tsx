import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Monitor, MessageSquare, Wand2 } from 'lucide-react';
import type { User } from 'firebase/auth';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';
import {
  ICE_SERVERS,
  addIceCandidate,
  calleeCandidatesRef,
  callerCandidatesRef,
  cleanupRoom,
  clearIncomingCall,
  onAnswer,
  onOffer,
  onRemoteCandidates,
  writeAnswer,
  writeOffer,
} from '../lib/callService';
import { startRinger, stopRinger } from '../lib/ringer';
import { finalizeCallLog, startCallLog } from '../lib/callLogService';
import { createOrGetConversation } from '../lib/messageService';
import { getUserProfile } from '../lib/userService';
import {
  BACKGROUND_PRESETS,
  VirtualBackgroundProcessor,
  type BackgroundMode,
} from '../lib/virtualBackground';

const OFFER_TIMEOUT_MS = 45_000;

type CallState =
  | 'permission-error'
  | 'lobby'
  | 'calling'
  | 'ringing'
  | 'connected'
  | 'ended'
  | 'error';

// ── inner component (all params guaranteed non-null) ──────────────────────────

function ActiveCall({
  roomId,
  role,
  peerUid,
  user,
}: {
  roomId: string;
  role: 'caller' | 'callee';
  peerUid: string;
  user: User;
}) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const camStreamRef = useRef<MediaStream | null>(null);
  const processedStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<VirtualBackgroundProcessor | null>(null);
  const videoSenderRef = useRef<RTCRtpSender | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const unsubsRef = useRef<Array<() => void>>([]);
  const offerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logIdRef = useRef<string | null>(null);
  const peerNameRef = useRef<string>('Someone');
  const peerAvatarRef = useRef<string | null>(null);
  const startedAtRef = useRef<number>(0);
  const navigate = useNavigate();

  const [callState, setCallState] = useState<CallState>('lobby');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [bgMode, setBgMode] = useState<BackgroundMode>({ kind: 'none' });
  const [bgPickerOpen, setBgPickerOpen] = useState(false);
  const [bgLoading, setBgLoading] = useState(false);

  // ── lobby media acquisition ─────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        camStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      } catch (err) {
        console.error('[call] getUserMedia failed', err);
        if (!cancelled) {
          setError((err as Error).message);
          setCallState('permission-error');
        }
      }
    })();
    // Fetch peer profile for display + logging.
    getUserProfile(peerUid)
      .then((p) => {
        peerNameRef.current = p?.displayName ?? 'Someone';
        peerAvatarRef.current = p?.avatarUrl ?? null;
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── helpers ─────────────────────────────────────────────────────────────────

  function activeOutgoingVideoTrack(): MediaStreamTrack | undefined {
    if (screenStreamRef.current) return screenStreamRef.current.getVideoTracks()[0];
    if (processedStreamRef.current) return processedStreamRef.current.getVideoTracks()[0];
    return camStreamRef.current?.getVideoTracks()[0];
  }

  function localPreviewStream(): MediaStream | null {
    if (screenStreamRef.current) return screenStreamRef.current;
    if (processedStreamRef.current) return processedStreamRef.current;
    return camStreamRef.current;
  }

  function refreshLocalPreview() {
    if (localVideoRef.current) localVideoRef.current.srcObject = localPreviewStream();
  }

  function createPC(): RTCPeerConnection {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pc.ontrack = (e) => {
      if (remoteVideoRef.current && e.streams[0]) {
        remoteVideoRef.current.srcObject = e.streams[0];
      }
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        if (callState !== 'connected') {
          setCallState('connected');
          startedAtRef.current = Date.now();
          stopRinger();
          if (!timerRef.current) {
            timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
          }
          // Persist a call-log entry once we're actually talking.
          void startCallLog(user.uid, {
            peerUid,
            peerName: peerNameRef.current,
            peerAvatar: peerAvatarRef.current,
            direction: role === 'caller' ? 'outgoing' : 'incoming',
            roomId,
          })
            .then((id) => {
              logIdRef.current = id;
            })
            .catch((err) => console.warn('[call] log start failed', err));
        }
      }
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        void teardown(true, 'completed');
      }
    };
    return pc;
  }

  // ── joining ─────────────────────────────────────────────────────────────────

  async function startCall() {
    if (!camStreamRef.current) return;
    try {
      const pc = createPC();
      pcRef.current = pc;
      // Add tracks. Video uses whichever track is currently active (raw / processed).
      const audioTrack = camStreamRef.current.getAudioTracks()[0];
      const videoTrack = activeOutgoingVideoTrack();
      if (audioTrack) {
        audioTrack.enabled = audioEnabled;
        pc.addTrack(audioTrack, camStreamRef.current);
      }
      if (videoTrack) {
        videoTrack.enabled = videoEnabled;
        const sender = pc.addTrack(videoTrack, camStreamRef.current);
        videoSenderRef.current = sender;
      }
      pc.onicecandidate = (e) => {
        if (e.candidate) void addIceCandidate(callerCandidatesRef(roomId), e.candidate.toJSON());
      };
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await writeOffer(roomId, user.uid, peerUid, offer);
      setCallState('calling');
      startRinger('outgoing');
      unsubsRef.current.push(
        onAnswer(roomId, async (answer) => {
          if (pc.signalingState !== 'have-local-offer') return;
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        }),
      );
      unsubsRef.current.push(
        onRemoteCandidates(calleeCandidatesRef(roomId), async (c) => {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(c));
          } catch (err) {
            console.warn('[call] failed to add remote ICE candidate', err);
          }
        }),
      );
    } catch (err) {
      setError((err as Error).message);
      setCallState('error');
    }
  }

  async function answerCall() {
    if (!camStreamRef.current) return;
    try {
      const pc = createPC();
      pcRef.current = pc;
      const audioTrack = camStreamRef.current.getAudioTracks()[0];
      const videoTrack = activeOutgoingVideoTrack();
      if (audioTrack) {
        audioTrack.enabled = audioEnabled;
        pc.addTrack(audioTrack, camStreamRef.current);
      }
      if (videoTrack) {
        videoTrack.enabled = videoEnabled;
        const sender = pc.addTrack(videoTrack, camStreamRef.current);
        videoSenderRef.current = sender;
      }
      pc.onicecandidate = (e) => {
        if (e.candidate) void addIceCandidate(calleeCandidatesRef(roomId), e.candidate.toJSON());
      };

      const offerInit = await new Promise<RTCSessionDescriptionInit>((resolve, reject) => {
        const unsub = onOffer(roomId, (o) => {
          unsub();
          if (offerTimeoutRef.current) clearTimeout(offerTimeoutRef.current);
          resolve(o);
        });
        unsubsRef.current.push(unsub);
        offerTimeoutRef.current = setTimeout(() => {
          unsub();
          reject(new Error('Caller did not send an offer in time.'));
        }, OFFER_TIMEOUT_MS);
      });

      await pc.setRemoteDescription(new RTCSessionDescription(offerInit));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await writeAnswer(roomId, answer);
      setCallState('ringing');
      unsubsRef.current.push(
        onRemoteCandidates(callerCandidatesRef(roomId), async (c) => {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(c));
          } catch (err) {
            console.warn('[call] failed to add remote ICE candidate', err);
          }
        }),
      );
    } catch (err) {
      setError((err as Error).message);
      setCallState('error');
    }
  }

  function handleJoin() {
    if (role === 'caller') void startCall();
    else void answerCall();
  }

  // ── teardown ────────────────────────────────────────────────────────────────

  async function teardown(removeRoom: boolean, status: 'completed' | 'failed' | 'declined') {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (offerTimeoutRef.current) {
      clearTimeout(offerTimeoutRef.current);
      offerTimeoutRef.current = null;
    }
    stopRinger();
    unsubsRef.current.forEach((u) => {
      try {
        u();
      } catch {
        /* ignore */
      }
    });
    unsubsRef.current = [];
    processorRef.current?.stop();
    processorRef.current = null;
    processedStreamRef.current = null;
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    camStreamRef.current?.getTracks().forEach((t) => t.stop());
    camStreamRef.current = null;
    try {
      pcRef.current?.close();
    } catch {
      /* ignore */
    }
    pcRef.current = null;
    if (logIdRef.current) {
      const dur = startedAtRef.current
        ? Math.max(0, Math.round((Date.now() - startedAtRef.current) / 1000))
        : 0;
      void finalizeCallLog(user.uid, logIdRef.current, status, dur).catch((err) =>
        console.warn('[call] log finalize failed', err),
      );
      logIdRef.current = null;
    }
    if (removeRoom) {
      try {
        await cleanupRoom(roomId);
      } catch {
        /* ignore */
      }
      try {
        await Promise.all([clearIncomingCall(user.uid), clearIncomingCall(peerUid)]);
      } catch {
        /* ignore */
      }
    }
    setCallState('ended');
  }

  async function handleHangup() {
    await teardown(true, callState === 'connected' ? 'completed' : 'declined');
  }

  // ── toggles ─────────────────────────────────────────────────────────────────

  function toggleAudio() {
    const next = !audioEnabled;
    setAudioEnabled(next);
    camStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = next;
    });
  }

  function toggleVideo() {
    const next = !videoEnabled;
    setVideoEnabled(next);
    // Toggle enabled on every video track we own (raw cam + processed if active).
    camStreamRef.current?.getVideoTracks().forEach((t) => {
      t.enabled = next;
    });
    processedStreamRef.current?.getVideoTracks().forEach((t) => {
      t.enabled = next;
    });
    // The sender's track too (it may be the processed one).
    const senderTrack = videoSenderRef.current?.track;
    if (senderTrack && senderTrack.kind === 'video') senderTrack.enabled = next;
  }

  async function toggleScreenShare() {
    if (!videoSenderRef.current) {
      // Not in a call yet (in lobby) — screen share doesn't make sense.
      return;
    }
    if (!screenSharing) {
      try {
        const screen = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = screen;
        const screenTrack = screen.getVideoTracks()[0];
        await videoSenderRef.current.replaceTrack(screenTrack);
        refreshLocalPreview();
        // When the user clicks the browser's "Stop sharing" button, end share.
        screenTrack.onended = () => {
          void endScreenShare();
        };
        setScreenSharing(true);
      } catch {
        /* user cancelled the prompt */
      }
    } else {
      await endScreenShare();
    }
  }

  async function endScreenShare() {
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    setScreenSharing(false);
    const restoreTrack = activeOutgoingVideoTrack();
    if (videoSenderRef.current && restoreTrack) {
      try {
        await videoSenderRef.current.replaceTrack(restoreTrack);
      } catch (err) {
        console.warn('[call] failed to restore camera after screen share', err);
      }
    }
    refreshLocalPreview();
  }

  // ── virtual background ──────────────────────────────────────────────────────

  async function applyBackground(mode: BackgroundMode) {
    setBgMode(mode);
    setBgPickerOpen(false);
    if (!camStreamRef.current) return;

    if (mode.kind === 'none') {
      // Tear down processor and restore raw cam.
      processorRef.current?.stop();
      processorRef.current = null;
      processedStreamRef.current = null;
      if (videoSenderRef.current && !screenSharing) {
        const raw = camStreamRef.current.getVideoTracks()[0];
        if (raw) await videoSenderRef.current.replaceTrack(raw);
      }
      refreshLocalPreview();
      return;
    }

    setBgLoading(true);
    try {
      if (!processorRef.current) {
        processorRef.current = new VirtualBackgroundProcessor(camStreamRef.current);
        const ok = await processorRef.current.init();
        if (!ok) {
          processorRef.current = null;
          setError('Could not load background processor (offline?).');
          setBgMode({ kind: 'none' });
          return;
        }
        processedStreamRef.current = processorRef.current.start();
      }
      processorRef.current.setMode(mode);
      const processedTrack = processedStreamRef.current?.getVideoTracks()[0];
      if (videoSenderRef.current && processedTrack && !screenSharing) {
        await videoSenderRef.current.replaceTrack(processedTrack);
      }
      refreshLocalPreview();
    } finally {
      setBgLoading(false);
    }
  }

  // ── in-call message ─────────────────────────────────────────────────────────

  async function openConversation() {
    try {
      const convId = await createOrGetConversation(user.uid, peerUid);
      // Open in a new window so the call isn't disrupted.
      window.open(`/chat/${convId}`, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.warn('[call] open conversation failed', err);
    }
  }

  // ── unmount cleanup ─────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      // Don't remove the room — we may have navigated away mid-call.
      void teardown(false, 'completed');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function fmt(s: number) {
    return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  }

  // ── render ──────────────────────────────────────────────────────────────────

  if (callState === 'permission-error') {
    return (
      <section className="mx-auto max-w-lg p-10 text-center">
        <p className="text-2xl font-semibold text-app">Couldn't access camera or microphone</p>
        <p className="mt-2 text-app-3">{error ?? 'Please grant permission and try again.'}</p>
        <button
          onClick={() => navigate('/inbox')}
          className="mt-6 inline-block rounded-xl bg-slate-900 px-6 py-3 text-white"
        >
          Back to Inbox
        </button>
      </section>
    );
  }

  if (callState === 'ended') {
    return (
      <section className="mx-auto max-w-lg p-10 text-center">
        <p className="text-2xl font-semibold text-app">Call ended</p>
        <p className="mt-2 text-app-3">Duration: {fmt(duration)}</p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => navigate('/calls')}
            className="rounded-xl border border-app px-5 py-3 text-app-2 hover:bg-subtle"
          >
            View call history
          </button>
          <button
            onClick={() => navigate('/inbox')}
            className="rounded-xl bg-slate-900 px-5 py-3 text-white"
          >
            Back to Inbox
          </button>
        </div>
      </section>
    );
  }

  // Lobby — shown before user clicks Join.
  if (callState === 'lobby') {
    return (
      <section className="mx-auto max-w-2xl p-4">
        <div className="card p-6 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-app-3">
            {role === 'caller' ? 'Calling' : 'Answering call from'}
          </p>
          <h2 className="text-2xl font-semibold text-app mb-4">{peerNameRef.current}</h2>

          <div className="relative overflow-hidden rounded-2xl bg-slate-900 aspect-video">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
            />
            {!videoEnabled && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 text-white">
                <div className="text-center">
                  <VideoOff size={48} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm opacity-80">Camera off</p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={toggleAudio}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${
                audioEnabled ? 'border border-app text-app-2 hover:bg-subtle' : 'bg-red-500 text-white'
              }`}
              aria-label={audioEnabled ? 'Mute microphone' : 'Unmute microphone'}
              aria-pressed={!audioEnabled}
            >
              {audioEnabled ? <Mic size={16} /> : <MicOff size={16} />}
              {audioEnabled ? 'Mic on' : 'Mic off'}
            </button>
            <button
              onClick={toggleVideo}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${
                videoEnabled ? 'border border-app text-app-2 hover:bg-subtle' : 'bg-red-500 text-white'
              }`}
              aria-label={videoEnabled ? 'Turn off camera' : 'Turn on camera'}
              aria-pressed={!videoEnabled}
            >
              {videoEnabled ? <Video size={16} /> : <VideoOff size={16} />}
              {videoEnabled ? 'Camera on' : 'Camera off'}
            </button>
            <button
              onClick={() => setBgPickerOpen((v) => !v)}
              disabled={bgLoading}
              className="flex items-center gap-2 rounded-xl border border-app px-4 py-2 text-sm font-medium text-app-2 hover:bg-subtle disabled:opacity-50"
              aria-label="Choose video background"
              aria-expanded={bgPickerOpen}
            >
              <Wand2 size={16} />
              {bgLoading ? 'Loading…' : 'Background'}
            </button>
          </div>

          {bgPickerOpen && <BackgroundPicker current={bgMode} onPick={applyBackground} />}

          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={() => void handleHangup()}
              className="rounded-xl border border-red-300 px-5 py-3 text-sm font-semibold text-red-600 hover:bg-red-50"
            >
              Cancel
            </button>
            <button
              onClick={handleJoin}
              disabled={!camStreamRef.current}
              className="rounded-xl bg-green-600 px-6 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              {role === 'caller' ? 'Start call' : 'Answer'}
            </button>
          </div>
        </div>
      </section>
    );
  }

  // Active call.
  return (
    <section className="mx-auto max-w-4xl p-4">
      <div className="relative overflow-hidden rounded-2xl bg-slate-900" style={{ minHeight: '60vh' }}>
        <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" style={{ minHeight: '60vh' }} />
        <div className="absolute bottom-4 right-4 h-32 w-24 overflow-hidden rounded-xl border-2 border-white/30 shadow-lg">
          <video ref={localVideoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
          {!videoEnabled && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/95 text-white">
              <VideoOff size={20} className="opacity-60" />
            </div>
          )}
        </div>

        <div className="absolute inset-x-0 top-4 flex justify-center">
          {callState === 'calling' && <span className="rounded-full bg-black/50 px-4 py-1.5 text-sm text-white">Calling {peerNameRef.current}…</span>}
          {callState === 'ringing' && <span className="rounded-full bg-black/50 px-4 py-1.5 text-sm text-white">Connecting…</span>}
          {callState === 'connected' && <span className="rounded-full bg-black/50 px-4 py-1.5 text-sm text-white">{fmt(duration)} · {peerNameRef.current}</span>}
          {callState === 'error' && <span className="rounded-full bg-red-600/80 px-4 py-1.5 text-sm text-white">{error ?? 'Call error'}</span>}
        </div>

        {bgPickerOpen && (
          <div className="absolute left-4 bottom-24 right-4 z-10 max-h-72 overflow-y-auto rounded-2xl bg-black/80 p-3 backdrop-blur">
            <BackgroundPicker current={bgMode} onPick={applyBackground} dark />
          </div>
        )}

        <div className="absolute inset-x-0 bottom-6 flex flex-wrap justify-center gap-3 px-4">
          <button
            onClick={toggleAudio}
            className={`rounded-full p-3 shadow-lg ${audioEnabled ? 'bg-white/20 text-white' : 'bg-red-500 text-white'}`}
            aria-label={audioEnabled ? 'Mute microphone' : 'Unmute microphone'}
            aria-pressed={!audioEnabled}
          >
            {audioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
          </button>
          <button
            onClick={toggleVideo}
            className={`rounded-full p-3 shadow-lg ${videoEnabled ? 'bg-white/20 text-white' : 'bg-red-500 text-white'}`}
            aria-label={videoEnabled ? 'Turn off camera' : 'Turn on camera'}
            aria-pressed={!videoEnabled}
          >
            {videoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
          </button>
          <button
            onClick={() => void toggleScreenShare()}
            className={`rounded-full p-3 shadow-lg ${screenSharing ? 'bg-blue-500 text-white' : 'bg-white/20 text-white'}`}
            aria-label={screenSharing ? 'Stop sharing screen' : 'Share screen'}
            aria-pressed={screenSharing}
          >
            <Monitor size={20} />
          </button>
          <button
            onClick={() => setBgPickerOpen((v) => !v)}
            disabled={bgLoading || screenSharing}
            className={`rounded-full p-3 shadow-lg ${bgMode.kind !== 'none' ? 'bg-purple-500 text-white' : 'bg-white/20 text-white'} disabled:opacity-50`}
            aria-label="Change video background"
            aria-pressed={bgMode.kind !== 'none'}
            title={screenSharing ? 'Disabled during screen share' : 'Video background'}
          >
            <Wand2 size={20} />
          </button>
          <button
            onClick={() => void openConversation()}
            className="rounded-full bg-white/20 p-3 text-white shadow-lg"
            aria-label="Open chat with this person"
          >
            <MessageSquare size={20} />
          </button>
          <button
            onClick={() => void handleHangup()}
            className="rounded-full bg-red-600 p-3 text-white shadow-lg hover:bg-red-700"
            aria-label="Hang up"
          >
            <PhoneOff size={20} />
          </button>
        </div>
      </div>
    </section>
  );
}

// ── background picker ────────────────────────────────────────────────────────

function BackgroundPicker({
  current,
  onPick,
  dark,
}: {
  current: BackgroundMode;
  onPick: (m: BackgroundMode) => void;
  dark?: boolean;
}) {
  const isActive = (m: BackgroundMode) => {
    if (current.kind !== m.kind) return false;
    if (m.kind === 'image' && current.kind === 'image') return m.imageUrl === current.imageUrl;
    return true;
  };
  const chip = (label: string, active: boolean, onClick: () => void, preview?: React.ReactNode) => (
    <button
      onClick={onClick}
      className={`relative h-16 w-24 overflow-hidden rounded-xl border-2 ${
        active
          ? 'border-purple-500'
          : dark
          ? 'border-white/20 hover:border-white/40'
          : 'border-app hover:border-slate-400'
      }`}
      aria-pressed={active}
      aria-label={label}
    >
      {preview}
      <span
        className={`absolute inset-x-0 bottom-0 px-1 py-0.5 text-[10px] font-medium ${
          dark ? 'bg-black/60 text-white' : 'bg-white/80 text-app'
        }`}
      >
        {label}
      </span>
    </button>
  );
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {chip('None', isActive({ kind: 'none' }), () => onPick({ kind: 'none' }),
        <div className="h-full w-full bg-slate-200" />)}
      {chip('Blur', isActive({ kind: 'blur' }), () => onPick({ kind: 'blur', radius: 14 }),
        <div className="h-full w-full" style={{ background: 'linear-gradient(135deg,#e2e8f0,#94a3b8)', filter: 'blur(2px)' }} />)}
      {BACKGROUND_PRESETS.map((p) =>
        chip(
          p.label,
          isActive({ kind: 'image', imageUrl: p.url }),
          () => onPick({ kind: 'image', imageUrl: p.url }),
          <img src={p.url} alt="" className="h-full w-full object-cover" loading="lazy" />,
        ),
      )}
    </div>
  );
}

// ── guard wrapper ─────────────────────────────────────────────────────────────

export default function CallPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const role = searchParams.get('role') as 'caller' | 'callee' | null;
  // `peer` is preferred; fall back to legacy `callee` for older links.
  const peerUid = searchParams.get('peer') ?? searchParams.get('callee') ?? '';
  const { user } = useFirebaseAuth();

  if (!roomId || !role || !user || !peerUid) {
    return (
      <section className="mx-auto max-w-lg p-6 text-center text-app-3">
        Invalid call link. Missing room ID, role, peer, or authentication.
      </section>
    );
  }

  return <ActiveCall roomId={roomId} role={role} peerUid={peerUid} user={user} />;
}

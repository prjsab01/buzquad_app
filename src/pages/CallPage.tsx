import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Monitor } from 'lucide-react';
import { off, onValue } from 'firebase/database';
import type { User } from 'firebase/auth';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';
import {
  addIceCandidate,
  calleeCandidatesRef,
  callerCandidatesRef,
  cleanupRoom,
  offerRef,
  onAnswer,
  onRemoteCandidates,
  writeAnswer,
  writeOffer,
} from '../lib/callService';

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

type CallState = 'idle' | 'calling' | 'ringing' | 'connected' | 'ended' | 'error';

// ── inner component (all params guaranteed non-null) ──────────────────────────

function ActiveCall({
  roomId,
  role,
  calleeUid,
  user,
}: {
  roomId: string;
  role: 'caller' | 'callee';
  calleeUid: string;
  user: User;
}) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [callState, setCallState] = useState<CallState>('idle');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);

  function createPC(): RTCPeerConnection {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pc.ontrack = (e) => {
      if (remoteVideoRef.current && e.streams[0]) {
        remoteVideoRef.current.srcObject = e.streams[0];
      }
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setCallState('connected');
        timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
      }
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        void handleHangup(false);
      }
    };
    return pc;
  }

  async function getLocalStream(): Promise<MediaStream> {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    return stream;
  }

  async function startCall() {
    setError(null);
    try {
      const stream = await getLocalStream();
      const pc = createPC();
      pcRef.current = pc;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      pc.onicecandidate = async (e) => {
        if (e.candidate) await addIceCandidate(callerCandidatesRef(roomId), e.candidate.toJSON());
      };
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await writeOffer(roomId, user.uid, calleeUid, offer);
      setCallState('calling');
      const unsubAnswer = onAnswer(roomId, async (answer) => {
        if (pc.signalingState !== 'have-local-offer') return;
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        unsubAnswer();
      });
      onRemoteCandidates(calleeCandidatesRef(roomId), async (c) => {
        try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch { /* ignore */ }
      });
    } catch (err) {
      setError((err as Error).message);
      setCallState('error');
    }
  }

  async function answerCall() {
    setError(null);
    try {
      const stream = await getLocalStream();
      const pc = createPC();
      pcRef.current = pc;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      pc.onicecandidate = async (e) => {
        if (e.candidate) await addIceCandidate(calleeCandidatesRef(roomId), e.candidate.toJSON());
      };
      const offerSnap = await new Promise<RTCSessionDescriptionInit>((resolve) => {
        onValue(offerRef(roomId), (snap) => {
          if (snap.exists()) {
            off(offerRef(roomId));
            resolve(snap.val() as RTCSessionDescriptionInit);
          }
        });
      });
      await pc.setRemoteDescription(new RTCSessionDescription(offerSnap));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await writeAnswer(roomId, answer);
      setCallState('ringing');
      onRemoteCandidates(callerCandidatesRef(roomId), async (c) => {
        try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch { /* ignore */ }
      });
    } catch (err) {
      setError((err as Error).message);
      setCallState('error');
    }
  }

  async function handleHangup(cleanup = true) {
    if (timerRef.current) clearInterval(timerRef.current);
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    pcRef.current?.close();
    if (cleanup && role === 'caller') await cleanupRoom(roomId);
    setCallState('ended');
  }

  function toggleAudio() {
    localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !t.enabled; });
    setAudioEnabled((v) => !v);
  }

  function toggleVideo() {
    localStreamRef.current?.getVideoTracks().forEach((t) => { t.enabled = !t.enabled; });
    setVideoEnabled((v) => !v);
  }

  async function toggleScreenShare() {
    if (!pcRef.current || !localStreamRef.current) return;
    if (!screenSharing) {
      try {
        const screen = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screen.getVideoTracks()[0];
        const sender = pcRef.current.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) await sender.replaceTrack(screenTrack);
        if (localVideoRef.current) localVideoRef.current.srcObject = screen;
        screenTrack.onended = () => void toggleScreenShare();
        setScreenSharing(true);
      } catch { /* user cancelled */ }
    } else {
      const camTrack = localStreamRef.current.getVideoTracks()[0];
      const sender = pcRef.current.getSenders().find((s) => s.track?.kind === 'video');
      if (sender && camTrack) await sender.replaceTrack(camTrack);
      if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
      setScreenSharing(false);
    }
  }

  useEffect(() => {
    if (role === 'caller') void startCall();
    else void answerCall();
    return () => { void handleHangup(false); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function fmt(s: number) {
    return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  }

  if (callState === 'ended') {
    return (
      <section className="mx-auto max-w-lg p-10 text-center">
        <p className="text-2xl font-semibold text-slate-900">Call ended</p>
        <p className="mt-2 text-slate-500">Duration: {fmt(duration)}</p>
        <a href="/inbox" className="mt-6 inline-block rounded-xl bg-slate-900 px-6 py-3 text-white">
          Back to Inbox
        </a>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-4xl p-4">
      <div className="relative overflow-hidden rounded-2xl bg-slate-900" style={{ minHeight: '60vh' }}>
        <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" style={{ minHeight: '60vh' }} />
        <video ref={localVideoRef} autoPlay playsInline muted className="absolute bottom-4 right-4 h-32 w-24 rounded-xl border-2 border-white/30 object-cover shadow-lg" />

        <div className="absolute inset-x-0 top-4 flex justify-center">
          {callState === 'calling' && <span className="rounded-full bg-black/50 px-4 py-1.5 text-sm text-white">Calling…</span>}
          {callState === 'ringing' && <span className="rounded-full bg-black/50 px-4 py-1.5 text-sm text-white">Connecting…</span>}
          {callState === 'connected' && <span className="rounded-full bg-black/50 px-4 py-1.5 text-sm text-white">{fmt(duration)}</span>}
          {callState === 'error' && <span className="rounded-full bg-red-600/80 px-4 py-1.5 text-sm text-white">{error ?? 'Call error'}</span>}
        </div>

        <div className="absolute inset-x-0 bottom-6 flex justify-center gap-4">
          <button onClick={toggleAudio} className={`rounded-full p-3 shadow-lg ${audioEnabled ? 'bg-white/20 text-white' : 'bg-red-500 text-white'}`}>
            {audioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
          </button>
          <button onClick={toggleVideo} className={`rounded-full p-3 shadow-lg ${videoEnabled ? 'bg-white/20 text-white' : 'bg-red-500 text-white'}`}>
            {videoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
          </button>
          <button onClick={() => void toggleScreenShare()} className={`rounded-full p-3 shadow-lg ${screenSharing ? 'bg-blue-500 text-white' : 'bg-white/20 text-white'}`}>
            <Monitor size={20} />
          </button>
          <button onClick={() => void handleHangup(true)} className="rounded-full bg-red-600 p-3 text-white shadow-lg hover:bg-red-700">
            <PhoneOff size={20} />
          </button>
        </div>
      </div>
    </section>
  );
}

// ── guard wrapper ─────────────────────────────────────────────────────────────

export default function CallPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const role = searchParams.get('role') as 'caller' | 'callee' | null;
  const calleeUid = searchParams.get('callee') ?? '';
  const { user } = useFirebaseAuth();

  if (!roomId || !role || !user) {
    return (
      <section className="mx-auto max-w-lg p-6 text-center text-slate-500">
        Invalid call link. Missing room ID, role, or authentication.
      </section>
    );
  }

  return <ActiveCall roomId={roomId} role={role} calleeUid={calleeUid} user={user} />;
}

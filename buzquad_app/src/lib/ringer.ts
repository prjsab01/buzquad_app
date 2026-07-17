/**
 * Web Audio ringer — generates a classic two-tone ringtone (incoming) or
 * a single ringback beep loop (outgoing) without bundling any audio files.
 *
 * Free, zero-asset, works offline. Honors user gesture requirements: the
 * AudioContext is created lazily on first start() so it succeeds inside
 * a click handler.
 */

type Pattern = 'incoming' | 'outgoing';

let ctx: AudioContext | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let activeOscillators: OscillatorNode[] = [];

function ensureCtx(): AudioContext {
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') {
    void ctx.resume();
  }
  return ctx;
}

function beep(freq: number, durationMs: number, gain = 0.15) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.frequency.value = freq;
  osc.type = 'sine';
  g.gain.value = 0;
  osc.connect(g).connect(ctx.destination);
  const now = ctx.currentTime;
  // 20ms attack/release ramp to avoid clicks.
  g.gain.linearRampToValueAtTime(gain, now + 0.02);
  g.gain.setValueAtTime(gain, now + (durationMs - 20) / 1000);
  g.gain.linearRampToValueAtTime(0, now + durationMs / 1000);
  osc.start(now);
  osc.stop(now + durationMs / 1000 + 0.05);
  activeOscillators.push(osc);
  osc.onended = () => {
    activeOscillators = activeOscillators.filter((o) => o !== osc);
  };
}

function playIncomingBurst() {
  // Classic ring: two short 480/620 Hz dual tones over ~1s, repeated.
  beep(480, 250);
  setTimeout(() => beep(620, 250), 280);
  setTimeout(() => beep(480, 250), 560);
  setTimeout(() => beep(620, 250), 840);
}

function playOutgoingBurst() {
  // Single quieter ringback tone.
  beep(440, 400, 0.08);
  setTimeout(() => beep(480, 400, 0.08), 450);
}

export function startRinger(pattern: Pattern) {
  ensureCtx();
  stopRinger();
  const fire = pattern === 'incoming' ? playIncomingBurst : playOutgoingBurst;
  fire();
  // Repeat every 3 seconds.
  timer = setInterval(fire, 3000);
}

export function stopRinger() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  activeOscillators.forEach((o) => {
    try {
      o.stop();
    } catch {
      /* already stopped */
    }
  });
  activeOscillators = [];
}

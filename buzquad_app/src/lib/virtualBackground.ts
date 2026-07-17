/**
 * Virtual-background processor for the local video track.
 *
 * Loads MediaPipe Selfie Segmentation from jsdelivr CDN on demand (≈ 1.2 MB,
 * cached by the browser after first use, fully free / Apache-2.0). The
 * processor takes the raw camera MediaStream and produces a new MediaStream
 * whose video track has the chosen background applied — blur, image, or
 * solid color. The processed track is then attached to the WebRTC sender
 * via `replaceTrack`, so the remote peer sees the modified video too.
 *
 * If MediaPipe fails to load (offline, blocked CDN, etc.) the caller
 * should fall back to the original stream.
 */

const MEDIAPIPE_URL =
  'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1.1675465747/selfie_segmentation.js';

export type BackgroundMode =
  | { kind: 'none' }
  | { kind: 'blur'; radius?: number }
  | { kind: 'image'; imageUrl: string }
  | { kind: 'color'; color: string };

// Curated free background images (royalty-free Unsplash CDN URLs).
export const BACKGROUND_PRESETS: { id: string; label: string; url: string }[] = [
  { id: 'office',  label: 'Cozy office',  url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1280&q=70' },
  { id: 'beach',   label: 'Beach',        url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1280&q=70' },
  { id: 'forest',  label: 'Forest',       url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1280&q=70' },
  { id: 'space',   label: 'Space',        url: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1280&q=70' },
  { id: 'mountain',label: 'Mountains',    url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1280&q=70' },
  { id: 'abstract',label: 'Abstract',     url: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=1280&q=70' },
];

interface SelfieSegmentation {
  setOptions(opts: { modelSelection: number; selfieMode?: boolean }): void;
  onResults(cb: (results: { image: HTMLVideoElement | HTMLImageElement; segmentationMask: CanvasImageSource }) => void): void;
  send(input: { image: HTMLVideoElement }): Promise<void>;
  close(): void;
}

interface MediaPipeModule {
  SelfieSegmentation: new (config: { locateFile: (file: string) => string }) => SelfieSegmentation;
}

let modulePromise: Promise<MediaPipeModule | null> | null = null;

function loadMediaPipe(): Promise<MediaPipeModule | null> {
  if (modulePromise) return modulePromise;
  modulePromise = new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(null);
      return;
    }
    const existing = (window as unknown as Record<string, unknown>).SelfieSegmentation;
    if (existing) {
      resolve({ SelfieSegmentation: existing as MediaPipeModule['SelfieSegmentation'] });
      return;
    }
    const script = document.createElement('script');
    script.src = MEDIAPIPE_URL;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.onload = () => {
      const mod = (window as unknown as Record<string, unknown>).SelfieSegmentation;
      if (mod) {
        resolve({ SelfieSegmentation: mod as MediaPipeModule['SelfieSegmentation'] });
      } else {
        console.warn('[virtualBg] MediaPipe loaded but SelfieSegmentation symbol missing');
        resolve(null);
      }
    };
    script.onerror = () => {
      console.warn('[virtualBg] failed to load MediaPipe from CDN');
      resolve(null);
    };
    document.head.appendChild(script);
  });
  return modulePromise;
}

export class VirtualBackgroundProcessor {
  private segmentation: SelfieSegmentation | null = null;
  private inputVideo: HTMLVideoElement;
  private canvas: HTMLCanvasElement;
  private gl: CanvasRenderingContext2D;
  private backgroundImage: HTMLImageElement | null = null;
  private mode: BackgroundMode = { kind: 'none' };
  private rafId: number | null = null;
  private outputStream: MediaStream | null = null;
  private sourceStream: MediaStream;
  private running = false;
  private lastImageUrl = '';

  constructor(sourceStream: MediaStream) {
    this.sourceStream = sourceStream;
    this.inputVideo = document.createElement('video');
    this.inputVideo.playsInline = true;
    this.inputVideo.muted = true;
    this.inputVideo.srcObject = sourceStream;
    this.canvas = document.createElement('canvas');
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable.');
    this.gl = ctx;
  }

  async init(): Promise<boolean> {
    const mod = await loadMediaPipe();
    if (!mod) return false;
    this.segmentation = new mod.SelfieSegmentation({
      locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1.1675465747/${f}`,
    });
    this.segmentation.setOptions({ modelSelection: 1, selfieMode: true });
    this.segmentation.onResults((res) => this.draw(res));
    await this.inputVideo.play().catch(() => undefined);
    // Match canvas to video size once the video reports dimensions.
    await new Promise<void>((resolve) => {
      if (this.inputVideo.videoWidth > 0) {
        resolve();
        return;
      }
      const handler = () => {
        this.inputVideo.removeEventListener('loadedmetadata', handler);
        resolve();
      };
      this.inputVideo.addEventListener('loadedmetadata', handler);
    });
    this.canvas.width = this.inputVideo.videoWidth || 640;
    this.canvas.height = this.inputVideo.videoHeight || 480;
    return true;
  }

  setMode(mode: BackgroundMode) {
    this.mode = mode;
    if (mode.kind === 'image' && mode.imageUrl !== this.lastImageUrl) {
      this.lastImageUrl = mode.imageUrl;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = mode.imageUrl;
      img.onload = () => {
        this.backgroundImage = img;
      };
      img.onerror = () => {
        console.warn('[virtualBg] background image failed to load');
        this.backgroundImage = null;
      };
    }
  }

  /** Start the processing loop. Returns the processed MediaStream. */
  start(): MediaStream {
    if (this.outputStream) return this.outputStream;
    this.running = true;
    this.outputStream = this.canvas.captureStream(30);
    const loop = async () => {
      if (!this.running) return;
      if (this.segmentation && this.inputVideo.readyState >= 2) {
        try {
          await this.segmentation.send({ image: this.inputVideo });
        } catch (err) {
          console.warn('[virtualBg] send failed', err);
        }
      }
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
    return this.outputStream;
  }

  private draw(results: { image: HTMLVideoElement | HTMLImageElement; segmentationMask: CanvasImageSource }) {
    const ctx = this.gl;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.save();
    ctx.clearRect(0, 0, w, h);

    // 1) Draw the person silhouette using the mask as a destination-in alpha.
    ctx.drawImage(results.segmentationMask, 0, 0, w, h);
    ctx.globalCompositeOperation = 'source-in';
    ctx.drawImage(results.image, 0, 0, w, h);

    // 2) Paint the background BEHIND the person.
    ctx.globalCompositeOperation = 'destination-over';
    if (this.mode.kind === 'blur') {
      // Use canvas filter to draw a blurred copy of the original frame.
      const radius = this.mode.radius ?? 12;
      ctx.filter = `blur(${radius}px)`;
      ctx.drawImage(results.image, 0, 0, w, h);
      ctx.filter = 'none';
    } else if (this.mode.kind === 'image' && this.backgroundImage) {
      ctx.drawImage(this.backgroundImage, 0, 0, w, h);
    } else if (this.mode.kind === 'color') {
      ctx.fillStyle = this.mode.color;
      ctx.fillRect(0, 0, w, h);
    } else {
      // 'none' or fallback: draw the original frame.
      ctx.drawImage(results.image, 0, 0, w, h);
    }

    ctx.restore();
  }

  /** Stop processing and release resources. Does NOT stop the source stream. */
  stop() {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    try {
      this.segmentation?.close();
    } catch {
      /* ignore */
    }
    this.segmentation = null;
    this.outputStream?.getTracks().forEach((t) => t.stop());
    this.outputStream = null;
  }

  /** Used by callers that want to react to track changes. */
  get sourceVideoTrack(): MediaStreamTrack | undefined {
    return this.sourceStream.getVideoTracks()[0];
  }
}

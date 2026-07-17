import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs,
  increment, limit, onSnapshot, orderBy, query,
  runTransaction, serverTimestamp, setDoc, where,
} from 'firebase/firestore';
import { firestore } from './firestore';

// ── types ─────────────────────────────────────────────────────────────────────

export type ReelSource = 'pexels' | 'youtube' | 'admin';

export interface Reel {
  id: string;           // "pexels_<id>" | "yt_<videoId>" | "admin_<firestoreId>"
  source: ReelSource;
  title: string;
  videoUrl: string;     // direct .mp4 (Pexels) or YouTube embed URL
  thumbnailUrl: string;
  authorName: string;
  authorUrl?: string;
  duration?: number;    // seconds
  width?: number;
  height?: number;
  tags?: string[];
  externalUrl: string;
}

export interface ReelComment {
  id: string;
  reelId: string;
  authorUid: string;
  authorDisplayName: string;
  text: string;
  createdAt: unknown;
}

export interface ReelMeta {
  likeCount: number;
  commentCount: number;
  saveCount: number;
}

// ── Pexels API ────────────────────────────────────────────────────────────────
// Confirmed response shape from live API call:
//   GET https://api.pexels.com/videos/search?query=...&per_page=15&orientation=portrait
//   Headers: { Authorization: <key> }
//   Response: { page, per_page, total_results, next_page, videos: PexelsVideo[] }
//   PexelsVideo.tags = [] (empty array, not objects)
//   PexelsVideo.video_files[].file_type = "video/mp4"
//   Portrait files: width < height (e.g. 360×640, 540×960, 720×1280, 1080×1920)

const PEXELS_KEY = import.meta.env.VITE_PEXELS_API_KEY as string | undefined;

interface PexelsVideoFile {
  id: number;
  quality: string | null;
  file_type: string;
  width: number;
  height: number;
  fps: number;
  link: string;
  size: number;
}

interface PexelsVideo {
  id: number;
  width: number;
  height: number;
  duration: number;
  url: string;
  image: string;
  user: { id: number; name: string; url: string };
  video_files: PexelsVideoFile[];
  video_pictures: { id: number; nr: number; picture: string }[];
  tags: string[];
}

interface PexelsResponse {
  page: number;
  per_page: number;
  total_results: number;
  next_page?: string;
  videos: PexelsVideo[];
}

/** Pick 540×960 mp4 for bandwidth efficiency; fallback to lowest portrait mp4 */
function pickMp4(files: PexelsVideoFile[]): string {
  const portrait = files.filter((f) => f.file_type === 'video/mp4' && f.height > f.width);
  if (!portrait.length) return files.find((f) => f.file_type === 'video/mp4')?.link ?? '';
  const sorted = [...portrait].sort((a, b) => a.height - b.height);
  // Prefer 540p (height ≤ 960) for free-tier bandwidth; fallback to smallest
  return (sorted.find((f) => f.height <= 960) ?? sorted[0]).link;
}

function pexelsToReel(v: PexelsVideo): Reel {
  return {
    id: `pexels_${v.id}`,
    source: 'pexels',
    title: v.user.name,
    videoUrl: pickMp4(v.video_files),
    thumbnailUrl: v.image,
    authorName: v.user.name,
    authorUrl: v.user.url,
    duration: v.duration,
    width: v.width,
    height: v.height,
    tags: Array.isArray(v.tags) ? v.tags.map((t) => (typeof t === 'string' ? t : (t as { name: string }).name)) : [],
    externalUrl: v.url,
  };
}

export async function fetchPexelsReels(searchQuery = 'short clip', page = 1, perPage = 15): Promise<Reel[]> {
  if (!PEXELS_KEY) return [];
  try {
    const res = await fetch(
      `https://api.pexels.com/videos/search?query=${encodeURIComponent(searchQuery)}&per_page=${perPage}&page=${page}&orientation=portrait`,
      { headers: { Authorization: PEXELS_KEY } },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as PexelsResponse;
    return (data.videos ?? []).filter((v) => v.height > v.width).map(pexelsToReel);
  } catch {
    return [];
  }
}

export async function fetchPexelsPopular(page = 1, perPage = 15): Promise<Reel[]> {
  if (!PEXELS_KEY) return [];
  try {
    const res = await fetch(
      `https://api.pexels.com/videos/popular?per_page=${perPage}&page=${page}&min_width=360&min_height=640`,
      { headers: { Authorization: PEXELS_KEY } },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as PexelsResponse;
    return (data.videos ?? []).filter((v) => v.height > v.width).map(pexelsToReel);
  } catch {
    return [];
  }
}

// ── YouTube Shorts ────────────────────────────────────────────────────────────

export function youtubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&modestbranding=1&rel=0&playsinline=1`;
}

export function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:shorts\/|watch\?v=|embed\/))([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

export function adminItemToReel(item: {
  id: string; title: string; externalUrl: string;
  thumbnailUrl?: string; author?: string; tags?: string[];
}): Reel {
  const ytId = extractYouTubeId(item.externalUrl);
  return {
    id: `admin_${item.id}`,
    source: ytId ? 'youtube' : 'admin',
    title: item.title,
    videoUrl: ytId ? youtubeEmbedUrl(ytId) : item.externalUrl,
    thumbnailUrl: item.thumbnailUrl || (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : ''),
    authorName: item.author ?? 'Buzquad',
    tags: item.tags ?? [],
    externalUrl: item.externalUrl,
  };
}

// ── Firestore reel interactions ───────────────────────────────────────────────

const metaRef = (reelId: string) => doc(firestore, 'reel_meta', reelId);

export async function toggleReelLike(reelId: string, uid: string): Promise<{ liked: boolean; likeCount: number }> {
  const likeDocRef = doc(firestore, 'reel_likes', `${reelId}_${uid}`);
  let liked = false; let likeCount = 0;
  await runTransaction(firestore, async (tx) => {
    const [likeSnap, metaSnap] = await Promise.all([tx.get(likeDocRef), tx.get(metaRef(reelId))]);
    const current = (metaSnap.data()?.likeCount as number) ?? 0;
    if (likeSnap.exists()) {
      tx.delete(likeDocRef);
      tx.set(metaRef(reelId), { likeCount: Math.max(0, current - 1) }, { merge: true });
      liked = false; likeCount = Math.max(0, current - 1);
    } else {
      tx.set(likeDocRef, { reelId, uid, createdAt: serverTimestamp() });
      tx.set(metaRef(reelId), { likeCount: current + 1 }, { merge: true });
      liked = true; likeCount = current + 1;
    }
  });
  return { liked, likeCount };
}

export async function isReelLiked(reelId: string, uid: string): Promise<boolean> {
  return (await getDoc(doc(firestore, 'reel_likes', `${reelId}_${uid}`))).exists();
}

export async function getReelMeta(reelId: string): Promise<ReelMeta> {
  const snap = await getDoc(metaRef(reelId));
  if (!snap.exists()) return { likeCount: 0, commentCount: 0, saveCount: 0 };
  const d = snap.data() as Partial<ReelMeta>;
  return { likeCount: d.likeCount ?? 0, commentCount: d.commentCount ?? 0, saveCount: d.saveCount ?? 0 };
}

export async function addReelComment(reelId: string, authorUid: string, authorDisplayName: string, text: string) {
  await addDoc(collection(firestore, 'reel_comments'), { reelId, authorUid, authorDisplayName, text, createdAt: serverTimestamp() });
  await setDoc(metaRef(reelId), { commentCount: increment(1) }, { merge: true });
}

export function listenToReelComments(reelId: string, cb: (comments: ReelComment[]) => void) {
  const q = query(collection(firestore, 'reel_comments'), where('reelId', '==', reelId), orderBy('createdAt', 'asc'), limit(50));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ReelComment, 'id'>) }))));
}

export async function toggleReelSave(reelId: string, uid: string, reel: Reel): Promise<boolean> {
  const saveRef = doc(firestore, 'reel_saves', `${reelId}_${uid}`);
  const snap = await getDoc(saveRef);
  if (snap.exists()) {
    await deleteDoc(saveRef);
    await setDoc(metaRef(reelId), { saveCount: increment(-1) }, { merge: true });
    return false;
  }
  await setDoc(saveRef, { reelId, uid, title: reel.title, thumbnailUrl: reel.thumbnailUrl, source: reel.source, externalUrl: reel.externalUrl, savedAt: serverTimestamp() });
  await setDoc(metaRef(reelId), { saveCount: increment(1) }, { merge: true });
  return true;
}

export async function isReelSaved(reelId: string, uid: string): Promise<boolean> {
  return (await getDoc(doc(firestore, 'reel_saves', `${reelId}_${uid}`))).exists();
}

export async function getSavedReels(uid: string): Promise<Reel[]> {
  const q = query(collection(firestore, 'reel_saves'), where('uid', '==', uid), orderBy('savedAt', 'desc'), limit(50));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...(d.data() as Reel), id: (d.data() as { reelId: string }).reelId }));
}

export async function reportReel(reelId: string, reporterUid: string, reason: string) {
  await addDoc(collection(firestore, 'reports'), { contentType: 'reel', contentId: reelId, reporterUid, reason, createdAt: serverTimestamp() });
}

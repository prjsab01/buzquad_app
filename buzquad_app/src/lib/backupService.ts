import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
} from 'firebase/firestore';
import { firestore } from './firestore';
import type { Message } from '../types/message';

export type BackupFormat = 'json' | 'html';
export type BackupScope = 'all' | 'profile' | 'messages';
export type BackupFrequency = 'daily' | 'weekly' | 'monthly';

export interface BackupSettings {
  driveAccountEmail: string;       // Google account email used for Drive
  sizeLimitMB: number;             // notify when cumulative backup size exceeds this
  frequency: BackupFrequency;
  includeMedia: boolean;           // include imageUrl references in backup
  totalSizeMB: number;             // running total of all backups uploaded
  lastBackupAt: unknown;           // Firestore Timestamp
  lastDriveFileUrl: string;        // URL of most recent Drive backup file
  notifiedSizeLimit: boolean;      // true once we've shown the size limit notification
}

const DEFAULT_SETTINGS: Omit<BackupSettings, 'driveAccountEmail'> = {
  sizeLimitMB: 100,
  frequency: 'monthly',
  includeMedia: false,
  totalSizeMB: 0,
  lastBackupAt: null,
  lastDriveFileUrl: '',
  notifiedSizeLimit: false,
};

// ── settings persistence ──────────────────────────────────────────────────────

export async function getBackupSettings(uid: string): Promise<BackupSettings | null> {
  const snap = await getDoc(doc(firestore, 'backup_settings', uid));
  return snap.exists() ? (snap.data() as BackupSettings) : null;
}

export async function saveBackupSettings(uid: string, settings: Partial<BackupSettings>) {
  await setDoc(doc(firestore, 'backup_settings', uid), {
    ...DEFAULT_SETTINGS,
    driveAccountEmail: '',
    ...settings,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

// ── data fetchers ─────────────────────────────────────────────────────────────

async function fetchProfile(uid: string) {
  const snap = await getDoc(doc(firestore, 'users', uid));
  return snap.exists() ? snap.data() : {};
}

/** Fetch messages from the current calendar month only */
async function fetchMonthlyMessages(
  uid: string,
  includeMedia: boolean,
  monthOffset = 0, // 0 = current month, -1 = last month, etc.
) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + monthOffset;
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59);

  const convSnap = await getDocs(
    query(collection(firestore, 'conversations'), where('members', 'array-contains', uid)),
  );

  const result: {
    conversationId: string;
    partner: string;
    messages: (Message & { imageUrl?: string })[];
  }[] = [];

  for (const convDoc of convSnap.docs) {
    const data = convDoc.data() as { members: string[] };
    const partnerUid = data.members.find((m) => m !== uid) ?? '';

    let partner = partnerUid;
    try {
      const partnerSnap = await getDoc(doc(firestore, 'users', partnerUid));
      if (partnerSnap.exists()) {
        partner = (partnerSnap.data() as { displayName?: string }).displayName ?? partnerUid;
      }
    } catch { /* fallback to uid */ }

    const msgSnap = await getDocs(
      query(
        collection(firestore, 'conversations', convDoc.id, 'messages'),
        where('sentAt', '>=', Timestamp.fromDate(start)),
        where('sentAt', '<=', Timestamp.fromDate(end)),
        orderBy('sentAt', 'asc'),
      ),
    );

    if (msgSnap.empty) continue;

    const messages = msgSnap.docs.map((d) => {
      const msg: Message & { imageUrl?: string } = {
        id: d.id,
        conversationId: convDoc.id,
        senderUid: d.data().senderUid as string,
        text: d.data().text as string,
        sentAt: d.data().sentAt ?? null,
      };
      if (includeMedia && d.data().imageUrl) msg.imageUrl = d.data().imageUrl as string;
      return msg;
    });

    result.push({ conversationId: convDoc.id, partner, messages });
  }

  return result;
}

async function fetchAllMessages(uid: string, includeMedia: boolean) {
  const convSnap = await getDocs(
    query(collection(firestore, 'conversations'), where('members', 'array-contains', uid)),
  );

  const result: { conversationId: string; partner: string; messages: (Message & { imageUrl?: string })[] }[] = [];

  for (const convDoc of convSnap.docs) {
    const data = convDoc.data() as { members: string[] };
    const partnerUid = data.members.find((m) => m !== uid) ?? '';
    let partner = partnerUid;
    try {
      const partnerSnap = await getDoc(doc(firestore, 'users', partnerUid));
      if (partnerSnap.exists()) partner = (partnerSnap.data() as { displayName?: string }).displayName ?? partnerUid;
    } catch { /* fallback */ }

    const msgSnap = await getDocs(
      query(collection(firestore, 'conversations', convDoc.id, 'messages'), orderBy('sentAt', 'asc')),
    );

    const messages = msgSnap.docs.map((d) => {
      const msg: Message & { imageUrl?: string } = {
        id: d.id,
        conversationId: convDoc.id,
        senderUid: d.data().senderUid as string,
        text: d.data().text as string,
        sentAt: d.data().sentAt ?? null,
      };
      if (includeMedia && d.data().imageUrl) msg.imageUrl = d.data().imageUrl as string;
      return msg;
    });

    result.push({ conversationId: convDoc.id, partner, messages });
  }

  return result;
}

// ── formatters ────────────────────────────────────────────────────────────────

function toJSON(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

function toHTML(
  profile: Record<string, unknown>,
  conversations: { conversationId: string; partner: string; messages: (Message & { imageUrl?: string })[] }[],
  label: string,
): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const rows = conversations.map((c) => `
    <section>
      <h2>Chat with ${esc(c.partner)}</h2>
      ${c.messages.map((m) => `
        <div class="msg">
          <strong>${esc(m.senderUid)}</strong>
          <span class="time">${m.sentAt ? new Date((m.sentAt as { seconds: number }).seconds * 1000).toLocaleString() : ''}</span>
          <p>${esc(m.text ?? '')}</p>
          ${m.imageUrl ? `<img src="${esc(m.imageUrl)}" alt="image" style="max-width:300px;border-radius:8px;margin-top:4px">` : ''}
        </div>`).join('')}
    </section>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Buzquad Backup — ${esc(label)}</title>
<style>
  body{font-family:sans-serif;max-width:800px;margin:2rem auto;padding:0 1rem;color:#0f172a}
  h1{color:#0f172a}h2{color:#334155;border-bottom:1px solid #e2e8f0;padding-bottom:.5rem;margin-top:2rem}
  .msg{margin:.75rem 0;padding:.5rem;background:#f8fafc;border-radius:8px}
  .msg strong{color:#1e293b}.msg .time{color:#94a3b8;font-size:.75rem;margin-left:.5rem}
  .msg p{margin:.25rem 0}pre{background:#f1f5f9;padding:1rem;border-radius:8px;overflow:auto}
</style>
</head>
<body>
<h1>Buzquad Chat Backup</h1>
<p style="color:#64748b">Period: ${esc(label)} · Exported: ${new Date().toLocaleString()}</p>
<h2>Profile</h2>
<pre>${esc(JSON.stringify(profile, null, 2))}</pre>
${rows}
</body></html>`;
}

// ── size helpers ──────────────────────────────────────────────────────────────

function byteSize(content: string): number {
  return new Blob([content]).size;
}

function bytesToMB(bytes: number): number {
  return Math.round((bytes / (1024 * 1024)) * 100) / 100;
}

// ── local download ────────────────────────────────────────────────────────────

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Google Drive ──────────────────────────────────────────────────────────────

export async function getDriveAccessToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    const CLIENT_ID = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID as string;
    if (!CLIENT_ID) {
      reject(new Error('VITE_GOOGLE_OAUTH_CLIENT_ID is not set. Add it to your environment to enable Google Drive backup.'));
      return;
    }
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: `${window.location.origin}/auth/drive-callback`,
      response_type: 'token',
      scope: 'https://www.googleapis.com/auth/drive.file email profile',
      include_granted_scopes: 'true',
    });
    const popup = window.open(
      `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
      'drive-auth', 'width=500,height=600',
    );
    if (!popup) { reject(new Error('Popup blocked. Allow popups for this site.')); return; }
    const interval = setInterval(() => {
      try {
        const url = popup.location.href;
        if (url.includes('access_token=')) {
          clearInterval(interval); popup.close();
          const hash = new URLSearchParams(url.split('#')[1]);
          const token = hash.get('access_token');
          if (token) resolve(token);
          else reject(new Error('No access token in response.'));
        }
      } catch { /* cross-origin */ }
      if (popup.closed) { clearInterval(interval); reject(new Error('Auth popup closed before completing.')); }
    }, 500);
  });
}

/** Get the email of the authenticated Google account from the access token */
export async function getDriveAccountEmail(accessToken: string): Promise<string> {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json() as { email?: string };
    return data.email ?? '';
  } catch { return ''; }
}

/** Get or create a "Buzquad Backups" folder in Drive, return its ID */
async function getOrCreateDriveFolder(accessToken: string): Promise<string> {
  // Search for existing folder
  const search = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name%3D'Buzquad+Backups'+and+mimeType%3D'application%2Fvnd.google-apps.folder'+and+trashed%3Dfalse&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  const searchData = await search.json() as { files?: { id: string }[] };
  if (searchData.files && searchData.files.length > 0) return searchData.files[0].id;

  // Create folder
  const create = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Buzquad Backups', mimeType: 'application/vnd.google-apps.folder' }),
  });
  const folder = await create.json() as { id: string };
  return folder.id;
}

async function uploadToDrive(
  content: string,
  filename: string,
  mime: string,
  accessToken: string,
): Promise<{ url: string; sizeMB: number }> {
  const folderId = await getOrCreateDriveFolder(accessToken);
  const metadata = { name: filename, mimeType: mime, parents: [folderId] };
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([content], { type: mime }));

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` }, body: form },
  );
  if (!res.ok) {
    const err = await res.json() as { error?: { message?: string } };
    throw new Error(err.error?.message ?? `Drive upload failed (${res.status})`);
  }
  const file = await res.json() as { id: string };
  return {
    url: `https://drive.google.com/file/d/${file.id}/view`,
    sizeMB: bytesToMB(byteSize(content)),
  };
}

// ── main export ───────────────────────────────────────────────────────────────

export interface BackupResult {
  driveUrl?: string;
  sizeMB?: number;
  sizeWarning?: boolean; // true if cumulative size exceeded limit
}

export async function runChatBackup(
  uid: string,
  options: {
    scope: 'monthly' | 'all';
    format: BackupFormat;
    destination: 'download' | 'drive';
    includeMedia: boolean;
    accessToken?: string;
    settings?: BackupSettings | null;
  },
  onStatus: (msg: string) => void,
): Promise<BackupResult> {
  onStatus('Fetching profile…');
  const profile = await fetchProfile(uid);

  onStatus('Fetching chat history…');
  const conversations = options.scope === 'monthly'
    ? await fetchMonthlyMessages(uid, options.includeMedia)
    : await fetchAllMessages(uid, options.includeMedia);

  onStatus('Generating export…');
  const now = new Date();
  const monthLabel = options.scope === 'monthly'
    ? `${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`
    : 'All time';
  const timestamp = now.toISOString().slice(0, 10);
  const ext = options.format === 'json' ? 'json' : 'html';
  const mime = options.format === 'json' ? 'application/json' : 'text/html';
  const filename = `buzquad-chat-${options.scope === 'monthly' ? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}` : timestamp}.${ext}`;

  const content = options.format === 'json'
    ? toJSON({ exportedAt: now.toISOString(), period: monthLabel, includeMedia: options.includeMedia, profile, conversations })
    : toHTML(profile as Record<string, unknown>, conversations, monthLabel);

  if (options.destination === 'download') {
    onStatus('Downloading…');
    downloadBlob(content, filename, mime);
    return { sizeMB: bytesToMB(byteSize(content)) };
  }

  // Drive upload
  onStatus('Connecting to Google Drive…');
  const token = options.accessToken ?? await getDriveAccessToken();
  onStatus('Uploading to Google Drive…');
  const { url, sizeMB } = await uploadToDrive(content, filename, mime, token);

  // Update cumulative size and last backup metadata in Firestore
  const prevTotal = options.settings?.totalSizeMB ?? 0;
  const newTotal = Math.round((prevTotal + sizeMB) * 100) / 100;
  const limitMB = options.settings?.sizeLimitMB ?? 100;
  const sizeWarning = newTotal >= limitMB;

  await saveBackupSettings(uid, {
    totalSizeMB: newTotal,
    lastBackupAt: serverTimestamp(),
    lastDriveFileUrl: url,
    notifiedSizeLimit: sizeWarning,
  });

  return { driveUrl: url, sizeMB, sizeWarning };
}

// Keep old runBackup for backward compat
export async function runBackup(
  uid: string,
  scope: BackupScope,
  format: BackupFormat,
  destination: 'download' | 'drive',
  onStatus: (msg: string) => void,
): Promise<{ driveUrl?: string }> {
  return runChatBackup(uid, { scope: scope === 'profile' ? 'all' : 'monthly', format, destination, includeMedia: false }, onStatus);
}

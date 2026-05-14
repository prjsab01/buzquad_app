import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { firestore } from './firestore';
import type { Message } from '../types/message';

export type BackupFormat = 'json' | 'html';
export type BackupScope = 'all' | 'profile' | 'messages';

// ── data fetchers ─────────────────────────────────────────────────────────────

async function fetchProfile(uid: string) {
  const snap = await getDoc(doc(firestore, 'users', uid));
  return snap.exists() ? snap.data() : {};
}

async function fetchAllMessages(uid: string) {
  const convSnap = await getDocs(
    query(collection(firestore, 'conversations'), where('members', 'array-contains', uid)),
  );

  const result: { conversationId: string; partner: string; messages: Message[] }[] = [];

  for (const convDoc of convSnap.docs) {
    const data = convDoc.data() as { members: string[] };
    const partnerUid = data.members.find((m) => m !== uid) ?? '';

    // Fetch partner display name
    let partner = partnerUid;
    try {
      const partnerSnap = await getDoc(doc(firestore, 'users', partnerUid));
      if (partnerSnap.exists()) {
        partner = (partnerSnap.data() as { displayName?: string }).displayName ?? partnerUid;
      }
    } catch { /* use uid as fallback */ }

    const msgSnap = await getDocs(
      query(
        collection(firestore, 'conversations', convDoc.id, 'messages'),
        orderBy('sentAt', 'asc'),
      ),
    );

    const messages = msgSnap.docs.map((d) => ({
      id: d.id,
      conversationId: convDoc.id,
      senderUid: d.data().senderUid as string,
      text: d.data().text as string,
      sentAt: d.data().sentAt ?? null,
    })) as Message[];

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
  conversations: { conversationId: string; partner: string; messages: Message[] }[],
): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const rows = conversations
    .map(
      (c) => `
      <section>
        <h2>Chat with ${esc(c.partner)}</h2>
        ${c.messages
          .map(
            (m) =>
              `<p><strong>${esc(m.senderUid)}</strong>: ${esc(m.text)}</p>`,
          )
          .join('')}
      </section>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Buzquad Backup</title>
<style>body{font-family:sans-serif;max-width:800px;margin:2rem auto;padding:0 1rem}h1{color:#0f172a}h2{color:#334155;border-bottom:1px solid #e2e8f0;padding-bottom:.5rem}p{margin:.25rem 0}</style>
</head>
<body>
<h1>Buzquad Backup — ${new Date().toLocaleDateString()}</h1>
<h2>Profile</h2>
<pre>${esc(JSON.stringify(profile, null, 2))}</pre>
${rows}
</body></html>`;
}

// ── local download ────────────────────────────────────────────────────────────

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Google Drive upload ───────────────────────────────────────────────────────

async function uploadToDrive(
  content: string,
  filename: string,
  mime: string,
  accessToken: string,
): Promise<string> {
  // Create file metadata
  const metadata = { name: filename, mimeType: mime };
  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' }),
  );
  form.append('file', new Blob([content], { type: mime }));

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    },
  );

  if (!res.ok) {
    const err = await res.json() as { error?: { message?: string } };
    throw new Error(err.error?.message ?? `Drive upload failed (${res.status})`);
  }

  const file = await res.json() as { id: string };
  return `https://drive.google.com/file/d/${file.id}/view`;
}

// ── Google OAuth popup ────────────────────────────────────────────────────────

export async function getDriveAccessToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    const CLIENT_ID = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID as string;
    if (!CLIENT_ID) {
      reject(new Error('VITE_GOOGLE_OAUTH_CLIENT_ID is not set. Add it to .env to enable Google Drive backup.'));
      return;
    }

    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: `${window.location.origin}/auth/drive-callback`,
      response_type: 'token',
      scope: 'https://www.googleapis.com/auth/drive.file',
      include_granted_scopes: 'true',
    });

    const popup = window.open(
      `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
      'drive-auth',
      'width=500,height=600',
    );

    if (!popup) { reject(new Error('Popup blocked. Allow popups for this site.')); return; }

    const interval = setInterval(() => {
      try {
        const url = popup.location.href;
        if (url.includes('access_token=')) {
          clearInterval(interval);
          popup.close();
          const hash = new URLSearchParams(url.split('#')[1]);
          const token = hash.get('access_token');
          if (token) resolve(token);
          else reject(new Error('No access token in response.'));
        }
      } catch { /* cross-origin — still loading */ }

      if (popup.closed) {
        clearInterval(interval);
        reject(new Error('Auth popup closed before completing.'));
      }
    }, 500);
  });
}

// ── main export function ──────────────────────────────────────────────────────

export async function runBackup(
  uid: string,
  scope: BackupScope,
  format: BackupFormat,
  destination: 'download' | 'drive',
  onStatus: (msg: string) => void,
): Promise<{ driveUrl?: string }> {
  onStatus('Fetching data…');

  const profile = scope !== 'messages' ? await fetchProfile(uid) : {};
  const conversations = scope !== 'profile' ? await fetchAllMessages(uid) : [];

  onStatus('Generating export…');

  const timestamp = new Date().toISOString().slice(0, 10);
  const ext = format === 'json' ? 'json' : 'html';
  const mime = format === 'json' ? 'application/json' : 'text/html';
  const filename = `buzquad-backup-${timestamp}.${ext}`;

  const content =
    format === 'json'
      ? toJSON({ exportedAt: new Date().toISOString(), profile, conversations })
      : toHTML(profile as Record<string, unknown>, conversations);

  if (destination === 'download') {
    onStatus('Downloading…');
    downloadBlob(content, filename, mime);
    return {};
  }

  // Google Drive
  onStatus('Connecting to Google Drive…');
  const token = await getDriveAccessToken();
  onStatus('Uploading to Google Drive…');
  const driveUrl = await uploadToDrive(content, filename, mime, token);
  return { driveUrl };
}

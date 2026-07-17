/**
 * Cloudflare Worker — Firebase custom claims setter
 *
 * POST /set-admin-claim
 *   Authorization: Bearer <Firebase ID token of the requesting admin>
 *   Body: { targetUid: string, isAdmin: boolean }
 *
 * Required Worker secrets (set via wrangler secret put):
 *   FIREBASE_PROJECT_ID    e.g. "buzquad"
 *   FIREBASE_CLIENT_EMAIL  from Firebase service account JSON
 *   FIREBASE_PRIVATE_KEY   from Firebase service account JSON (full PEM)
 *   ADMIN_EMAILS           comma-separated bootstrap admin emails
 *   ALLOWED_ORIGIN         e.g. "https://buzquad.pages.dev"
 */

export interface Env {
  FIREBASE_PROJECT_ID: string;
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_PRIVATE_KEY: string;
  ADMIN_EMAILS: string;
  ALLOWED_ORIGIN: string;
}

function b64Decode(b64: string): ArrayBuffer {
  const s = b64.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(s);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

function pemToDer(pem: string): ArrayBuffer {
  return b64Decode(pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, ''));
}

async function verifyFirebaseToken(
  token: string,
  projectId: string,
): Promise<{ uid: string; email?: string } | null> {
  try {
    const [headerB64, payloadB64, sigB64] = token.split('.');
    const header = JSON.parse(atob(headerB64.replace(/-/g, '+').replace(/_/g, '/')));
    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
    const now = Math.floor(Date.now() / 1000);
    if (
      payload.aud !== projectId ||
      payload.iss !== `https://securetoken.google.com/${projectId}` ||
      payload.exp < now || payload.iat > now + 300 || !payload.sub
    ) return null;
    const keys: Record<string, string> = await (
      await fetch('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com',
        { cf: { cacheTtl: 3600 } } as RequestInit)
    ).json();
    const certPem = keys[header.kid];
    if (!certPem) return null;
    const pubKey = await crypto.subtle.importKey(
      'spki', pemToDer(certPem),
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify'],
    );
    const valid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5', pubKey, b64Decode(sigB64),
      new TextEncoder().encode(`${headerB64}.${payloadB64}`),
    );
    return valid ? { uid: payload.sub as string, email: payload.email as string | undefined } : null;
  } catch { return null; }
}

async function getAccessToken(clientEmail: string, privateKeyPem: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const enc = (o: unknown) =>
    btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const signingInput = `${enc({ alg: 'RS256', typ: 'JWT' })}.${enc({
    iss: clientEmail, sub: clientEmail,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/firebase https://www.googleapis.com/auth/cloud-platform',
  })}`;
  const privateKey = await crypto.subtle.importKey(
    'pkcs8', pemToDer(privateKeyPem),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, new TextEncoder().encode(signingInput));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${signingInput}.${sigB64}`,
  });
  const data = await res.json() as { access_token?: string };
  if (!data.access_token) throw new Error('Failed to get Google access token');
  return data.access_token;
}

async function setCustomClaims(
  projectId: string, accessToken: string,
  targetUid: string, claims: Record<string, unknown>,
): Promise<void> {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:update`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ localId: targetUid, customAttributes: JSON.stringify(claims) }),
    },
  );
  if (!res.ok) {
    const err = await res.json() as { error?: { message?: string } };
    throw new Error(err.error?.message ?? `Firebase API error (${res.status})`);
  }
}

function ch(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cors = ch(env.ALLOWED_ORIGIN || '*');
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });

    const token = (request.headers.get('Authorization') ?? '').replace('Bearer ', '');
    if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json', ...cors } });

    const caller = await verifyFirebaseToken(token, env.FIREBASE_PROJECT_ID);
    if (!caller) return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { 'Content-Type': 'application/json', ...cors } });

    const adminEmails = (env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase());
    if (!caller.email || !adminEmails.includes(caller.email.toLowerCase())) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json', ...cors } });
    }

    const body = await request.json() as { targetUid?: string; isAdmin?: boolean };
    if (!body.targetUid) return new Response(JSON.stringify({ error: 'targetUid required' }), { status: 400, headers: { 'Content-Type': 'application/json', ...cors } });

    try {
      const accessToken = await getAccessToken(env.FIREBASE_CLIENT_EMAIL, env.FIREBASE_PRIVATE_KEY);
      await setCustomClaims(env.FIREBASE_PROJECT_ID, accessToken, body.targetUid, { admin: !!body.isAdmin });
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json', ...cors } });
    } catch (err) {
      return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { 'Content-Type': 'application/json', ...cors } });
    }
  },
};

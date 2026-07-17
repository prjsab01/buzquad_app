# Buzquad

A social + collaboration + messaging + activity platform — PWA and Android app from a single codebase.

Built with React + TypeScript + Vite, Firebase, Cloudflare Pages, and Cloudinary.

**Live:** https://buzquad-app.pages.dev

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| State | Zustand, TanStack Query |
| Auth | Firebase Auth (Google sign-in) |
| Database | Cloud Firestore + Firebase Realtime Database |
| Media | Cloudinary (free tier) |
| Hosting | Cloudflare Pages |
| Android | Bubblewrap / Trusted Web Activity |
| Testing | Vitest v2 |

---

## Setting up on a new device

After cloning this repo on a new machine, complete these steps **before** starting development:

### 1. Rotate the Firebase Admin SDK key (mandatory)

The Admin SDK service account key in this repo was valid on the previous machine. You must regenerate it to get a fresh, uncompromised key:

1. Go to [Firebase Console](https://console.firebase.google.com) → your project → Project Settings → Service accounts
2. Click **Generate new private key** → confirm → download the JSON file
3. Rename it to `buzquad-firebase-adminsdk-fbsvc-<newid>.json` (or any name) and place it in the project root
4. Delete the old JSON file from the repo
5. Update any references to the filename in scripts if needed

> The old key remains valid in Firebase until you explicitly revoke it. To revoke: Service accounts → find the key → Actions → Delete.

### 2. Re-authenticate Firebase CLI

```bash
npx firebase login
```

This replaces the previous machine's session. You only need this for deploying rules/hosting — not for running the dev server.

### 3. Install dependencies and start

```bash
cd buzquad_app
npm install
npm run dev
```

---

## Local development

### Prerequisites

- Node.js 18+
- npm 9+
- A Firebase project (free Spark plan)
- A Cloudinary account (free tier)

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy env template
cp .env.example .env

# 3. Fill in .env with your values (see Environment variables below)

# 4. Start dev server
npm run dev
# Opens at http://localhost:4173
```

### Build

```bash
npm run build
# Output in dist/
```

### Tests

```bash
npm run test          # run once
npm run test:watch    # watch mode
```

31 tests across 4 files. Tests are self-contained pure-logic tests (no Firebase connection required).

---

## Environment variables

Copy `.env.example` to `.env` and fill in:

```env
# Firebase
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_DATABASE_URL=

# Cloudinary (free tier — no credit card)
VITE_CLOUDINARY_CLOUD_NAME=
VITE_CLOUDINARY_UPLOAD_PRESET=

# Admin bootstrap (comma-separated emails)
VITE_ADMIN_EMAILS=you@example.com

# Optional: Cloudflare Worker for server-side admin claims
VITE_CLAIMS_WORKER_URL=

# Optional: APK download URL (GitHub Releases)
VITE_APK_DOWNLOAD_URL=
```

---

## Firebase setup

1. Create a project at https://console.firebase.google.com (Spark / free plan)
2. Enable **Google sign-in** under Authentication → Sign-in method
3. Enable **Cloud Firestore** (production mode)
4. Enable **Realtime Database**
5. Add a web app and copy the config values into `.env`
6. Deploy security rules:
   ```bash
   npx firebase deploy --only firestore,database
   ```

---

## Cloudinary setup

1. Sign up at https://cloudinary.com (free tier: 25 GB storage, 25 GB bandwidth)
2. Dashboard → Settings → Upload → Upload presets → Add upload preset
3. Set signing mode to **Unsigned**
4. Copy the preset name and cloud name into `.env`

---

## Deployment (Cloudflare Pages)

1. Push to GitHub
2. Connect repo to Cloudflare Pages (Build command: `npm run build`, Output: `dist`)
3. Add all `VITE_*` environment variables in Cloudflare Pages → Settings → Environment variables
4. Every push to `main` auto-deploys

### Deploy Cloudflare Workers

```bash
# OG preview Worker (link previews in posts)
cd workers/og-preview && wrangler deploy
# Then set VITE_OG_WORKER_URL in Cloudflare Pages env vars

# Admin claims Worker (server-side admin enforcement)
cd workers/admin-claims
wrangler secret put FIREBASE_PROJECT_ID
wrangler secret put FIREBASE_CLIENT_EMAIL
wrangler secret put FIREBASE_PRIVATE_KEY
wrangler secret put ADMIN_EMAILS
wrangler secret put ALLOWED_ORIGIN
wrangler deploy
# Then set VITE_CLAIMS_WORKER_URL in Cloudflare Pages env vars
```

---

## Seed dev data

```bash
# Install seed deps (not in main bundle)
npm install --save-dev tsx firebase-admin

# Set service account env vars
export FIREBASE_PROJECT_ID=your-project-id
export FIREBASE_CLIENT_EMAIL=your-service-account@...
export FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

npm run seed
```

Creates sample users, communities, posts, events, and polls in your dev Firestore.

**Warning:** Only run against a dev/test project. Never against production.

---

## Android APK

The same web codebase is packaged as an Android app via Trusted Web Activity (TWA).

See `ANDROID_PACKAGING.md` for full build instructions.

To distribute:
1. Build the APK following `ANDROID_PACKAGING.md`
2. Upload to GitHub Releases
3. Set `VITE_APK_DOWNLOAD_URL` in `.env` and Cloudflare Pages
4. The APK download button appears automatically on the landing page

---

## Admin setup

1. Set `VITE_ADMIN_EMAILS=your@email.com` in `.env` and Cloudflare Pages
2. Sign in with that Google account
3. The Admin link appears in the nav
4. For server-side enforcement, deploy `workers/admin-claims/` via Wrangler and set `VITE_CLAIMS_WORKER_URL`

---

## Project structure

```
src/
  __tests__/        Vitest test files
  hooks/            useFirebaseAuth, useUpload
  lib/              Service layer (Firestore, RTDB, Cloudinary)
  pages/            All route pages
  types/            TypeScript interfaces
  App.tsx           Router, layout, nav
scripts/
  seed.ts           Dev data seed script
workers/
  admin-claims/     Cloudflare Worker for Firebase custom claims
public/
  manifest.json     PWA manifest
  sw.js             Service worker
  offline.html      Offline fallback
firestore.rules     Firestore security rules
firestore.indexes.json  Composite indexes
database.rules.json Realtime Database rules
```

---

## Features

- Google sign-in + username claim with availability checker
- Public and private profiles with avatar + cover image upload
- Cover image, spotlight section (pin up to 3 items), custom status with expiry
- Public feed with rich text, images, emoji reactions, link previews, comments, following feed
- Post analytics (view count + reaction breakdown, author-only)
- Drafts with auto-save and publish from drafts page
- Communities, Groups, Channels with rich-text posts and member management
- 1:1 and group messaging with rich text, image sharing, typing indicators, presence
- WebRTC 1:1 video/audio calls with screen sharing
- Events with RSVP, discussion threads, and calendar view
- Polls (single, multiple, yes/no) with live results
- Activity Hub (books, movies, reels, series, music, games, podcasts) with sessions
- Shared notes with version history and Markdown export
- Follow / friend request system with notifications
- In-app notifications with unread badge and mark-all-read
- Search (users, posts, communities) with rich HTML rendering
- Backup to Google Drive (JSON/HTML export) with size tracking
- Admin dashboard with user management, report queue, audit log, custom claims
- Keyboard shortcuts + command palette (K shortcut)
- Accessibility: skip-to-content, aria-live, focus rings, aria-labels
- PWA installable from browser with offline fallback
- Android APK via TWA (v1.0.0 available on GitHub Releases)
- Cloudflare Workers: OG preview (link metadata), admin claims (server-side enforcement)

---

## Free-tier constraints

This app is designed to run entirely within free-tier limits:

- Firebase Spark plan (no credit card)
- Cloudinary free tier (25 GB storage/bandwidth)
- Cloudflare Pages free tier
- No paid RTC infrastructure (native browser WebRTC only)
- Media stored in Cloudinary, not Firestore
- All lists paginated, no unbounded collection scans

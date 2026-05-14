# Buzquad App

Buzquad is a social collaboration PWA and Android-capable platform built with React, TypeScript, Vite, and Firebase.

## Local development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env.local` and fill in Firebase config values from your Firebase project.
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open the app at the displayed localhost URL.

## Build and test locally

Always build locally before pushing changes:
```bash
npm run build
```

## Firebase Auth setup

1. Create a Firebase project at https://console.firebase.google.com/
2. Enable Google sign-in under Authentication > Sign-in method.
3. Add a web app and copy the config values.
4. Add config values to `.env.local` using the keys from `.env.example`.

## PWA support

- `public/manifest.json` — web app manifest for installability
- `public/sw.js` — service worker registered by `src/main.tsx`
- `public/offline.html` — offline fallback page
- `public/icons/` — SVG app icons used by the manifest

When served from a secure origin or local development server, supported browsers can install the app as a PWA.

## Project structure

- `src/App.tsx` — app routes and layout
- `src/lib/firebase.ts` — Firebase app and auth initialization
- `src/lib/firestore.ts` — Firestore initialization
- `src/lib/userService.ts` — username validation and profile persistence
- `src/hooks/useFirebaseAuth.ts` — auth state hook
- `src/pages/AuthPage.tsx` — Google sign-in flow
- `src/pages/OnboardingPage.tsx` — username claim and onboarding profile flow
- `src/pages/ProfilePage.tsx` — user profile display and session management
- `src/pages/FeedPage.tsx` — home feed placeholder for posts and updates
- `src/pages/CommunityPage.tsx` — community hub scaffolding and discovery
- `src/pages/InboxPage.tsx` — inbox and conversation starter
- `src/pages/ChatRoomPage.tsx` — real-time chat room UI
- `src/lib/messageService.ts` — Firestore conversation and message helpers

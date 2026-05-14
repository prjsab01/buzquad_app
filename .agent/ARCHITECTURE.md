# Architecture

## Frontend

- React + TypeScript + Vite
- Tailwind CSS for styling
- React Router for page navigation
- Firebase client libraries for auth and Firestore access
- Modular page structure under `src/pages`
- Local auth state hook under `src/hooks`
- Firebase service layer under `src/lib`

## Backend / Data

- Firebase Auth for user authentication
- Firestore for profile persistence and username availability

## Current app modules

- `src/App.tsx` — routing and shell layout
- `src/pages/AuthPage.tsx` — Google sign-in UI
- `src/pages/OnboardingPage.tsx` — username claim and profile onboarding
- `src/lib/firebase.ts` — Firebase app and auth setup
- `src/lib/firestore.ts` — Firestore initialization
- `src/lib/userService.ts` — username validation, availability checks, and profile transaction logic
- `src/hooks/useFirebaseAuth.ts` — auth state management hook

# Handoff

## Current active task
2026-05-26 sweep: calling feature rewritten + private circle implemented + ProfilePage/UI polish.
Build clean (0 TS errors), 31/31 tests passing.

## ⚠️ REQUIRED DEPLOYMENT BEFORE FEATURES WORK IN PROD
The 2026-05-26 changes touched Firestore + RTDB rules. Until deployed, calling and friends will fail in prod with permission-denied:
```
firebase deploy --only firestore:rules,database
```
Optional smoke test: open the app on two devices/browsers, send a friend request, accept it, then start a call from one side — the other should see the Accept/Decline banner.

## Prior status (still valid)
All 58 spec sections implemented, built, tested, and deployed.

## Live URLs
- Web app: https://buzquad-app.pages.dev
- OG Preview Worker: https://buzquad-og-preview.prjsab01.workers.dev
- Admin Claims Worker: https://buzquad-admin-claims.prjsab01.workers.dev

## Final build status
- Modules: 1820
- TypeScript errors: 0
- Tests: 31/31 passing
- Last commit: fa12ad5

## All 58 spec sections — COMPLETE

| § | Feature | Status |
|---|---------|--------|
| 1 | Non-negotiable constraints | ✅ |
| 2 | Product vision | ✅ |
| 3 | Core technical architecture | ✅ |
| 4 | Identity, auth, account model | ✅ |
| 5 | Social graph | ✅ |
| 6 | Public/private feed | ✅ |
| 7 | Communities/groups/circles/collections | ✅ |
| 8 | Messaging system | ✅ |
| 9 | Calls and screen sharing | ✅ |
| 10 | Events and scheduling | ✅ |
| 11 | Polls | ✅ |
| 12 | Activity Hub | ✅ |
| 13 | Media and file handling | ✅ |
| 14 | Backup to user-owned cloud drives | ✅ |
| 15 | Admin and moderation | ✅ |
| 16 | Security model | ✅ |
| 17 | Search and discovery | ✅ |
| 18 | Notifications | ✅ |
| 19 | PWA requirements | ✅ |
| 20 | Android app requirements | ✅ |
| 21 | Free-tier safety and quota control | ✅ |
| 22 | Data model | ✅ |
| 23 | Must-have UI pages | ✅ |
| 24 | Design and UX requirements | ✅ |
| 25 | Reliability and fallback behavior | ✅ |
| 26 | Build order | ✅ |
| 27 | Deliverables | ✅ |
| 28 | Production-quality standards | ✅ |
| 29 | Acceptance criteria | ✅ |
| 30 | Final instruction | ✅ |
| 31 | Reactions and emoji system | ✅ |
| 32 | Rich text and formatting | ✅ |
| 33 | User status and presence system | ✅ |
| 34 | Drafts and scheduled posts | ✅ |
| 35 | Pinned profiles and spotlight | ✅ |
| 36 | Shared notes and collaborative docs | ✅ |
| 37 | Link previews and smart embeds | ✅ |
| 38 | Reactions and engagement analytics | ✅ |
| 39 | Onboarding improvements | ✅ |
| 40 | Keyboard shortcuts and command palette | ✅ |
| 41 | Accessibility improvements | ✅ |
| 42 | Theme and appearance settings | ✅ |
| 43 | Smart notifications and preferences | ✅ |
| 44 | In-app search improvements | ✅ |
| 45 | Kudos and community awards | ✅ |
| 46 | Content warnings and sensitive content | ✅ |
| 47 | Spaces — persistent voice/activity rooms | ✅ |
| 48 | Profile portfolio and work showcase | ✅ |
| 49 | Streaks and engagement nudges | ✅ |
| 50 | Localization and i18n readiness | ✅ |
| 51 | Progressive disclosure UI pattern | ✅ |
| 52 | Offline-first improvements | ✅ |
| 53 | Deep linking and share targets | ✅ |
| 54 | Lightweight AI-assist features | ✅ |
| 55 | Community health and safety tools | ✅ |
| 56 | Event check-in and attendance tracking | ✅ |
| 57 | Collaborative watchlist and shared shelves | ✅ |
| 58 | Buzquad Wrapped — annual personal recap | ✅ |

## Remaining operator tasks (no code needed)
1. Deploy Firestore indexes if prompted: `firebase deploy --only firestore:indexes`
2. Upload new APK build to GitHub Releases if app version bumped
3. Custom domain: update ALLOWED_ORIGIN in both Workers via `wrangler secret put ALLOWED_ORIGIN`

## Warnings
- Service account JSON must stay out of git (covered by .gitignore)
- Vitest pinned to v2.1.9 — do NOT upgrade
- Firebase vendor bundle ~848 kB (expected — Firebase SDK is large)
- Spaces use RTDB — ensure VITE_FIREBASE_DATABASE_URL is set in Cloudflare Pages env vars

# Handoff

## Current active task
Backup/export flows implemented. All code pushed to GitHub (commit ea79d24). Cloudflare Pages auto-deploy triggered.

## Immediate next steps
1. **Verify Cloudflare Pages deployment** — check https://dash.cloudflare.com → Workers & Pages → buzquad-app → Deployments. Should show a new deployment building.
2. **Add missing Cloudflare Pages env vars** (if not done yet):
   - `VITE_FIREBASE_DATABASE_URL` = `https://buzquad-default-rtdb.firebaseio.com`
   - `VITE_CLOUDINARY_CLOUD_NAME` = `dodnawj9q`
   - `VITE_CLOUDINARY_UPLOAD_PRESET` = `buzquad_unsigned`
3. **Android TWA packaging** — Bubblewrap CLI to wrap the deployed Pages URL into an APK.
4. **Firebase custom claims** — proper server-side admin role enforcement.
5. **Firebase Auth domain** — add the Cloudflare Pages domain to Firebase Auth authorized domains.

## Firebase Auth domain fix (required after Pages deployment)
Go to Firebase Console → Authentication → Settings → Authorized domains → Add domain
Add your Pages domain e.g. `buzquad-app.pages.dev`

## Warnings
- Admin guard is still client-side only (`VITE_ADMIN_EMAILS`).
- Google Drive backup requires `VITE_GOOGLE_OAUTH_CLIENT_ID` — optional, download-to-device works without it.
- Cloudinary unsigned preset allows any browser upload — acceptable for MVP.

## Unfinished implementations
- Android TWA packaging (Bubblewrap)
- Firebase custom claims for admin
- Google OAuth client ID for Drive backup (optional)

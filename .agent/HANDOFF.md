# Handoff

## Current active task
Switched media uploads from Cloudflare R2 (requires credit card) to Cloudinary free tier (no credit card). Build clean at 1790 modules, 0 errors.

## Immediate next steps
1. **Set up Cloudinary** — sign up free at https://cloudinary.com, create unsigned upload preset, add vars to `.env` (see .env.example).
2. **Add VITE_FIREBASE_DATABASE_URL to .env** — value: `https://buzquad-default-rtdb.firebaseio.com`
3. **Backup/export flows** — Google Drive + OneDrive export of chat/profile history.
4. **Push to GitHub** and complete Cloudflare Pages deployment.
5. **Android TWA packaging** — Bubblewrap CLI instructions.

## Cloudinary setup (5 minutes, free, no card)
1. Go to https://cloudinary.com → Sign Up Free
2. Dashboard → Settings (gear icon) → Upload tab
3. Scroll to "Upload presets" → Add upload preset
4. Set "Signing mode" to **Unsigned** → Save
5. Copy the preset name
6. Copy your Cloud Name from the dashboard top-left
7. Add to `.env`:
   ```
   VITE_CLOUDINARY_CLOUD_NAME=your-cloud-name
   VITE_CLOUDINARY_UPLOAD_PRESET=your-preset-name
   ```

## Warnings
- Admin guard is still client-side only (`VITE_ADMIN_EMAILS`).
- VITE_FIREBASE_DATABASE_URL must be in .env before calling features work.
- Cloudinary free tier: 25 GB storage, 25 GB bandwidth/month — sufficient for early users.
- Cloudinary unsigned preset means anyone with the preset name can upload — acceptable for MVP, add signed uploads later if needed.

## Unfinished implementations
- Backup/export flows (Google Drive / OneDrive)
- Android TWA packaging
- Firebase custom claims for admin
- GitHub push + Cloudflare Pages deployment

# Android TWA Packaging — Buzquad

Package the Buzquad PWA into an Android APK using Bubblewrap (Trusted Web Activity).
No Android Studio required. Command-line only.

---

## Prerequisites

Install these once on your machine:

```bash
# Node.js 18+ (already installed)
# Java JDK 11 or 17 — required by Bubblewrap
```

**Install Java JDK 17 (free, no account needed):**
Download from https://adoptium.net/temurin/releases/?version=17
- Choose: Windows x64 → .msi installer
- Install with defaults
- Verify: `java -version` should show 17.x

**Install Bubblewrap CLI:**
```bash
npm install -g @bubblewrap/cli
```

---

## Step 1 — Initialize the TWA project

Run from your project root (`buzquad_app/buzquad_app/`):

```bash
mkdir android-twa
cd android-twa
bubblewrap init --manifest https://buzquad-app.pages.dev/manifest.json
```

When prompted, accept or fill in:

| Prompt | Value |
|--------|-------|
| Application name | `Buzquad` |
| Short name | `Buzquad` |
| Package ID | `dev.pages.buzquad.app` |
| Start URL | `https://buzquad-app.pages.dev/` |
| Display mode | `standalone` |
| Status bar color | `#0f172a` |
| Nav bar color | `#0f172a` |
| Splash screen color | `#0f172a` |
| Icon URL | `https://buzquad-app.pages.dev/icons/icon-512.svg` |
| Maskable icon URL | `https://buzquad-app.pages.dev/icons/icon-512.svg` |
| Signing key path | (press Enter for default `./android.keystore`) |
| Signing key alias | `buzquad` |
| Key password | choose a password and remember it |
| Store password | same password |

---

## Step 2 — Build the APK

```bash
bubblewrap build
```

This produces:
- `app-release-signed.apk` — the installable APK
- `app-release-bundle.aab` — for Play Store (optional)

Build takes 3–5 minutes on first run (downloads Android SDK automatically).

---

## Step 3 — Test the APK

Transfer `app-release-signed.apk` to an Android device and install it:
- Enable "Install from unknown sources" in Android Settings → Security
- Open the APK file to install
- The app opens as a full-screen TWA (no browser chrome)

---

## Step 4 — Host the APK for download

The APK needs to be downloadable from the app itself.
Since we're using Cloudinary for media, upload the APK there:

```bash
# Upload via Cloudinary dashboard:
# 1. Go to https://cloudinary.com → Media Library
# 2. Upload → Select app-release-signed.apk
# 3. Copy the secure URL
# 4. Update VITE_APK_DOWNLOAD_URL in .env and Cloudflare Pages vars
```

Or host it anywhere with a direct download link (GitHub Releases, etc.):
```bash
# GitHub Releases (free, no card):
# 1. Go to https://github.com/prjsab01/buzquad_app/releases/new
# 2. Tag: v1.0.0, Title: Buzquad v1.0.0
# 3. Attach app-release-signed.apk
# 4. Publish release
# 5. Copy the download URL
```

---

## Step 5 — Digital Asset Links (required for TWA to work without browser bar)

Create this file in your project:

**`public/.well-known/assetlinks.json`**

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "dev.pages.buzquad.app",
    "sha256_cert_fingerprints": ["YOUR_SHA256_FINGERPRINT"]
  }
}]
```

Get your SHA256 fingerprint:
```bash
cd android-twa
bubblewrap fingerprint add
# or manually:
keytool -list -v -keystore android.keystore -alias buzquad
# Copy the SHA256 fingerprint from the output
```

Replace `YOUR_SHA256_FINGERPRINT` with the value, then commit and push.
Cloudflare Pages will serve it at `https://buzquad-app.pages.dev/.well-known/assetlinks.json`.

---

## Updating the APK

When you push new code, the TWA automatically loads the latest web version.
Only rebuild the APK if you change:
- App name, icon, or package ID
- Splash screen
- Permissions

To rebuild:
```bash
cd android-twa
bubblewrap build
```

---

## Checklist

- [ ] Java JDK 17 installed
- [ ] `npm install -g @bubblewrap/cli`
- [ ] `bubblewrap init` completed
- [ ] `bubblewrap build` produced APK
- [ ] APK tested on Android device
- [ ] APK hosted (Cloudinary or GitHub Releases)
- [ ] `VITE_APK_DOWNLOAD_URL` set in .env and Cloudflare Pages
- [ ] `public/.well-known/assetlinks.json` created with correct fingerprint
- [ ] Committed and pushed

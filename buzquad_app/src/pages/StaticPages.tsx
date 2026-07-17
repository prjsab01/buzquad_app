export function ShortcutsPage() {
  const shortcuts = [
    { keys: 'K', desc: 'Open command palette' },
    { keys: 'N', desc: 'Go to feed (new post)' },
    { keys: 'M', desc: 'Go to inbox' },
    { keys: '/', desc: 'Focus search bar' },
    { keys: 'G then H', desc: 'Go to home feed' },
    { keys: 'G then C', desc: 'Go to communities' },
    { keys: 'G then A', desc: 'Go to activity hub' },
    { keys: 'G then E', desc: 'Go to events' },
    { keys: 'Escape', desc: 'Close any open modal or palette' },
    { keys: 'Enter', desc: 'Send message (in chat)' },
    { keys: 'Shift + Enter', desc: 'New line in message (in chat)' },
    { keys: 'Ctrl/Cmd + B', desc: 'Bold text (in editor)' },
    { keys: 'Ctrl/Cmd + I', desc: 'Italic text (in editor)' },
  ];
  return (
    <section className="mx-auto max-w-2xl p-6">
      <div className="card p-8 shadow-sm">
        <h2 className="text-2xl font-semibold text-app">Keyboard Shortcuts</h2>
        <p className="mt-2 text-sm text-app-3">
          Shortcuts are active when no text input is focused (except in-editor shortcuts).
        </p>
        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-b border-app text-left text-xs uppercase tracking-wider text-app-3">
              <th className="pb-2 pr-8">Shortcut</th>
              <th className="pb-2">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {shortcuts.map(({ keys, desc }) => (
              <tr key={keys}>
                <td className="py-2.5 pr-8">
                  <kbd className="rounded bg-subtle px-2 py-0.5 font-mono text-xs text-app-2">{keys}</kbd>
                </td>
                <td className="py-2.5 text-app-2">{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function HelpPage() {
  return (
    <section className="mx-auto max-w-3xl p-6 space-y-6">
      <div className="card p-8 shadow-sm prose prose-slate max-w-none">
        <h2 className="text-2xl font-semibold text-app">Help &amp; FAQ</h2>
        <h3 className="mt-6 font-semibold text-slate-800">Getting started</h3>
        <p className="text-app-2">Sign in with your Google account, claim a unique username, and complete onboarding to set up your profile.</p>
        <h3 className="mt-4 font-semibold text-slate-800">Installing the app</h3>
        <p className="text-app-2">Buzquad is a Progressive Web App. On mobile, tap your browser's "Add to Home Screen" option. On Android, you can also download the APK from the home page.</p>
        <h3 className="mt-4 font-semibold text-slate-800">Privacy controls</h3>
        <p className="text-app-2">Go to Settings to control your profile visibility (public, private, or circle-only) and presence indicators.</p>
        <h3 className="mt-4 font-semibold text-slate-800">Calls</h3>
        <p className="text-app-2">1:1 calls use your browser's built-in WebRTC. Allow microphone and camera permissions when prompted. Calls are peer-to-peer and not recorded.</p>
        <h3 className="mt-4 font-semibold text-slate-800">Backup</h3>
        <p className="text-app-2">Use the Backup page to export your chat history as JSON or HTML and save it to Google Drive.</p>
        <h3 className="mt-4 font-semibold text-slate-800">Keyboard shortcuts</h3>
        <p className="text-app-2">
          Buzquad supports keyboard shortcuts for power users.{' '}
          <a href="/help/shortcuts" className="underline text-slate-800">View all shortcuts</a>.
        </p>
        <h3 className="mt-4 font-semibold text-slate-800">Contact</h3>
        <p className="text-app-2">For support, reach out via the community or file an issue on the project repository.</p>
      </div>
    </section>
  );
}

export function PrivacyPage() {
  return (
    <section className="mx-auto max-w-3xl p-6">
      <div className="card p-8 shadow-sm prose prose-slate max-w-none">
        <h2 className="text-2xl font-semibold text-app">Privacy Policy</h2>
        <p className="mt-4 text-app-2">Last updated: 2025.</p>
        <h3 className="mt-6 font-semibold text-slate-800">Data we collect</h3>
        <p className="text-app-2">We collect your Google account display name, email address, and profile photo when you sign in. You may also provide a username, bio, location, and pronouns during onboarding.</p>
        <h3 className="mt-4 font-semibold text-slate-800">How we use your data</h3>
        <p className="text-app-2">Your data is used to provide the Buzquad service — displaying your profile, enabling messaging, and powering social features. We do not sell your data.</p>
        <h3 className="mt-4 font-semibold text-slate-800">Data storage</h3>
        <p className="text-app-2">Data is stored in Google Firebase (Firestore and Realtime Database) and Cloudflare R2. Media files are stored in Cloudinary. All providers operate under their own privacy policies.</p>
        <h3 className="mt-4 font-semibold text-slate-800">Your rights</h3>
        <p className="text-app-2">You can export your data at any time using the Backup page. You can delete your account by contacting support.</p>
        <h3 className="mt-4 font-semibold text-slate-800">Cookies</h3>
        <p className="text-app-2">We use Firebase Auth session cookies for authentication only. No third-party advertising cookies are used.</p>
      </div>
    </section>
  );
}

export function TermsPage() {
  return (
    <section className="mx-auto max-w-3xl p-6">
      <div className="card p-8 shadow-sm prose prose-slate max-w-none">
        <h2 className="text-2xl font-semibold text-app">Terms of Service</h2>
        <p className="mt-4 text-app-2">Last updated: 2025.</p>
        <h3 className="mt-6 font-semibold text-slate-800">Acceptance</h3>
        <p className="text-app-2">By using Buzquad you agree to these terms. If you do not agree, do not use the service.</p>
        <h3 className="mt-4 font-semibold text-slate-800">Acceptable use</h3>
        <p className="text-app-2">You may not use Buzquad to harass, threaten, or harm others; distribute illegal content; spam; or attempt to compromise the security of the platform.</p>
        <h3 className="mt-4 font-semibold text-slate-800">Content</h3>
        <p className="text-app-2">You retain ownership of content you post. By posting, you grant Buzquad a licence to display that content to other users as part of the service.</p>
        <h3 className="mt-4 font-semibold text-slate-800">Termination</h3>
        <p className="text-app-2">We reserve the right to suspend or terminate accounts that violate these terms.</p>
        <h3 className="mt-4 font-semibold text-slate-800">Limitation of liability</h3>
        <p className="text-app-2">Buzquad is provided "as is" without warranties. We are not liable for any damages arising from use of the service.</p>
      </div>
    </section>
  );
}

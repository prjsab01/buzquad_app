import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getIdToken } from 'firebase/auth';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';
import { listUsers, setUserSuspended, type AdminUser } from '../lib/adminService';

const CLAIMS_WORKER_URL = import.meta.env.VITE_CLAIMS_WORKER_URL as string | undefined;

// Bootstrap client-side guard — also enforced by custom claims once Worker is deployed
const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS ?? '')
  .split(',').map((e: string) => e.trim()).filter(Boolean);

export default function AdminPage() {
  const { user, isAdmin, loading } = useFirebaseAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionUid, setActionUid] = useState<string | null>(null);

  // Allow access if custom claim is set OR bootstrap email matches
  const hasAccess =
    user && (isAdmin || ADMIN_EMAILS.includes(user.email ?? ''));

  useEffect(() => {
    if (!hasAccess) return;
    listUsers()
      .then(setUsers)
      .catch((e) => setError((e as Error).message))
      .finally(() => setFetching(false));
  }, [hasAccess]);

  if (loading) return <section className="mx-auto max-w-4xl p-6"><p className="text-slate-600">Loading…</p></section>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!hasAccess) return <Navigate to="/" replace />;

  const handleToggleSuspend = async (u: AdminUser) => {
    setActionUid(u.uid);
    try {
      await setUserSuspended(u.uid, !u.suspended);
      setUsers((prev) => prev.map((p) => p.uid === u.uid ? { ...p, suspended: !u.suspended } : p));
    } catch (e) { setError((e as Error).message); }
    finally { setActionUid(null); }
  };

  const handleToggleAdmin = async (u: AdminUser) => {
    if (!CLAIMS_WORKER_URL) {
      setError('VITE_CLAIMS_WORKER_URL is not set. Deploy the admin-claims Worker first.');
      return;
    }
    setActionUid(u.uid);
    try {
      const token = await getIdToken(user);
      const res = await fetch(`${CLAIMS_WORKER_URL}/set-admin-claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ targetUid: u.uid, isAdmin: !u.isAdmin }),
      });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? 'Failed to update admin claim');
      }
      setUsers((prev) => prev.map((p) => p.uid === u.uid ? { ...p, isAdmin: !u.isAdmin } : p));
    } catch (e) { setError((e as Error).message); }
    finally { setActionUid(null); }
  };

  return (
    <section className="mx-auto max-w-5xl p-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Admin Dashboard</h2>
            <p className="mt-1 text-sm text-slate-500">{users.length} users loaded</p>
          </div>
          {!isAdmin && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-700">
              Bootstrap admin — deploy claims Worker for full enforcement
            </span>
          )}
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        {fetching ? (
          <p className="mt-6 text-slate-600">Loading users…</p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="pb-3 pr-4">User</th>
                  <th className="pb-3 pr-4">Username</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Role</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.uid}>
                    <td className="py-3 pr-4 font-medium text-slate-900">{u.displayName || '—'}</td>
                    <td className="py-3 pr-4 text-slate-600">@{u.username || '—'}</td>
                    <td className="py-3 pr-4">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${u.suspended ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {u.suspended ? 'Suspended' : 'Active'}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${u.isAdmin ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                        {u.isAdmin ? 'Admin' : 'User'}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <button
                          disabled={actionUid === u.uid}
                          onClick={() => handleToggleSuspend(u)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-60 ${u.suspended ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-red-600 text-white hover:bg-red-700'}`}
                        >
                          {actionUid === u.uid ? '…' : u.suspended ? 'Unsuspend' : 'Suspend'}
                        </button>
                        <button
                          disabled={actionUid === u.uid || !CLAIMS_WORKER_URL}
                          onClick={() => handleToggleAdmin(u)}
                          title={!CLAIMS_WORKER_URL ? 'Deploy claims Worker to enable' : ''}
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                        >
                          {u.isAdmin ? 'Revoke Admin' : 'Grant Admin'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && <p className="mt-6 text-center text-slate-500">No users found.</p>}
          </div>
        )}
      </div>
    </section>
  );
}

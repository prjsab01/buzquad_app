import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';
import { listUsers, setUserSuspended, type AdminUser } from '../lib/adminService';

// Simple client-side admin guard — enforce properly via Firebase custom claims + Firestore rules in production.
const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS ?? '').split(',').map((e: string) => e.trim()).filter(Boolean);

export default function AdminPage() {
  const { user, loading } = useFirebaseAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionUid, setActionUid] = useState<string | null>(null);

  const isAdmin = user && (ADMIN_EMAILS.length === 0 || ADMIN_EMAILS.includes(user.email ?? ''));

  useEffect(() => {
    if (!isAdmin) return;
    listUsers()
      .then(setUsers)
      .catch((e) => setError((e as Error).message))
      .finally(() => setFetching(false));
  }, [isAdmin]);

  if (loading) return <section className="mx-auto max-w-4xl p-6"><p className="text-slate-600">Loading…</p></section>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  const handleToggleSuspend = async (u: AdminUser) => {
    setActionUid(u.uid);
    try {
      await setUserSuspended(u.uid, !u.suspended);
      setUsers((prev) => prev.map((p) => p.uid === u.uid ? { ...p, suspended: !u.suspended } : p));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setActionUid(null);
    }
  };

  return (
    <section className="mx-auto max-w-4xl p-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-900">Admin Dashboard</h2>
        <p className="mt-1 text-sm text-slate-500">User management · {users.length} users loaded</p>

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
                  <th className="pb-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.uid} className="py-3">
                    <td className="py-3 pr-4 font-medium text-slate-900">{u.displayName || '—'}</td>
                    <td className="py-3 pr-4 text-slate-600">@{u.username || '—'}</td>
                    <td className="py-3 pr-4">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${u.suspended ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {u.suspended ? 'Suspended' : 'Active'}
                      </span>
                    </td>
                    <td className="py-3">
                      <button
                        type="button"
                        disabled={actionUid === u.uid}
                        onClick={() => handleToggleSuspend(u)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-60 ${u.suspended ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-red-600 text-white hover:bg-red-700'}`}
                      >
                        {actionUid === u.uid ? '…' : u.suspended ? 'Unsuspend' : 'Suspend'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && (
              <p className="mt-6 text-center text-slate-500">No users found.</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

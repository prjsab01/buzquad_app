import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getIdToken } from 'firebase/auth';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';
import { listUsers, setUserSuspended, type AdminUser } from '../lib/adminService';
import {
  fetchReports, resolveReport, takedownPost, fetchAuditLogs,
  type Report, type AuditLog,
} from '../lib/reportService';

const CLAIMS_WORKER_URL = import.meta.env.VITE_CLAIMS_WORKER_URL as string | undefined;
const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS ?? '')
  .split(',').map((e: string) => e.trim()).filter(Boolean);

type AdminTab = 'users' | 'reports' | 'audit';

function timeAgo(val: unknown): string {
  if (!val) return '';
  const ts = val as { toDate?: () => Date };
  const d = ts.toDate ? ts.toDate() : new Date(val as string);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function AdminPage() {
  const { user, isAdmin, loading } = useFirebaseAuth();
  const [tab, setTab] = useState<AdminTab>('users');

  // Users tab
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [fetchingUsers, setFetchingUsers] = useState(true);
  const [actionUid, setActionUid] = useState<string | null>(null);

  // Reports tab
  const [reports, setReports] = useState<Report[]>([]);
  const [fetchingReports, setFetchingReports] = useState(false);
  const [reportAction, setReportAction] = useState<string | null>(null);

  // Audit tab
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [fetchingAudit, setFetchingAudit] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const hasAccess = user && (isAdmin || ADMIN_EMAILS.includes(user.email ?? ''));

  useEffect(() => {
    if (!hasAccess) return;
    listUsers()
      .then(setUsers)
      .catch((e) => setError((e as Error).message))
      .finally(() => setFetchingUsers(false));
  }, [hasAccess]);

  useEffect(() => {
    if (!hasAccess || tab !== 'reports') return;
    setFetchingReports(true);
    fetchReports('pending')
      .then(setReports)
      .catch((e) => setError((e as Error).message))
      .finally(() => setFetchingReports(false));
  }, [hasAccess, tab]);

  useEffect(() => {
    if (!hasAccess || tab !== 'audit') return;
    setFetchingAudit(true);
    fetchAuditLogs()
      .then(setAuditLogs)
      .catch((e) => setError((e as Error).message))
      .finally(() => setFetchingAudit(false));
  }, [hasAccess, tab]);

  if (loading) return <section className="mx-auto max-w-4xl p-6"><p className="text-app-2">Loading…</p></section>;
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
    if (!CLAIMS_WORKER_URL) { setError('Deploy the admin-claims Worker first.'); return; }
    setActionUid(u.uid);
    try {
      const token = await getIdToken(user);
      const res = await fetch(`${CLAIMS_WORKER_URL}/set-admin-claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ targetUid: u.uid, isAdmin: !u.isAdmin }),
      });
      if (!res.ok) { const err = await res.json() as { error?: string }; throw new Error(err.error ?? 'Failed'); }
      setUsers((prev) => prev.map((p) => p.uid === u.uid ? { ...p, isAdmin: !u.isAdmin } : p));
    } catch (e) { setError((e as Error).message); }
    finally { setActionUid(null); }
  };

  const handleResolve = async (report: Report, action: 'resolved' | 'dismissed') => {
    setReportAction(report.id);
    try {
      await resolveReport(report.id, user.uid, action);
      setReports((prev) => prev.filter((r) => r.id !== report.id));
    } catch (e) { setError((e as Error).message); }
    finally { setReportAction(null); }
  };

  const handleTakedown = async (report: Report) => {
    if (report.targetType !== 'post') return;
    setReportAction(report.id);
    try {
      await takedownPost(report.targetId, user.uid);
      await resolveReport(report.id, user.uid, 'resolved');
      setReports((prev) => prev.filter((r) => r.id !== report.id));
    } catch (e) { setError((e as Error).message); }
    finally { setReportAction(null); }
  };

  const TABS: { key: AdminTab; label: string }[] = [
    { key: 'users', label: `Users (${users.length})` },
    { key: 'reports', label: `Reports (${reports.length})` },
    { key: 'audit', label: 'Audit Log' },
  ];

  return (
    <section className="mx-auto max-w-5xl p-4 space-y-4">
      <div className="card p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold text-app">Admin Dashboard</h2>
          {!isAdmin && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-700">
              Bootstrap admin — deploy claims Worker for full enforcement
            </span>
          )}
        </div>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {/* Tabs */}
        <div className="flex border-b border-app mb-6">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`border-b-2 px-4 py-2 text-sm font-medium transition ${
                tab === t.key ? 'border-slate-900 text-app' : 'border-transparent text-app-3 hover:text-app-2'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Users tab */}
        {tab === 'users' && (
          fetchingUsers ? <p className="text-app-2">Loading users…</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-app text-left text-xs uppercase tracking-wider text-app-3">
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
                      <td className="py-3 pr-4 font-medium text-app">{u.displayName || '—'}</td>
                      <td className="py-3 pr-4 text-app-2">@{u.username || '—'}</td>
                      <td className="py-3 pr-4">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${u.suspended ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {u.suspended ? 'Suspended' : 'Active'}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${u.isAdmin ? 'bg-purple-100 text-purple-700' : 'bg-subtle text-app-2'}`}>
                          {u.isAdmin ? 'Admin' : 'User'}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          <button disabled={actionUid === u.uid} onClick={() => handleToggleSuspend(u)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-60 ${u.suspended ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-red-600 text-white hover:bg-red-700'}`}>
                            {actionUid === u.uid ? '…' : u.suspended ? 'Unsuspend' : 'Suspend'}
                          </button>
                          <button disabled={actionUid === u.uid || !CLAIMS_WORKER_URL} onClick={() => handleToggleAdmin(u)}
                            title={!CLAIMS_WORKER_URL ? 'Deploy claims Worker to enable' : ''}
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-app-2 hover:bg-subtle disabled:opacity-40">
                            {u.isAdmin ? 'Revoke Admin' : 'Grant Admin'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && <p className="mt-6 text-center text-app-3">No users found.</p>}
            </div>
          )
        )}

        {/* Reports tab */}
        {tab === 'reports' && (
          fetchingReports ? <p className="text-app-2">Loading reports…</p> : reports.length === 0 ? (
            <p className="text-center text-app-3 py-8">No pending reports. 🎉</p>
          ) : (
            <div className="space-y-3">
              {reports.map((r) => (
                <div key={r.id} className="rounded-xl border border-app bg-subtle p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-app capitalize">
                        {r.targetType} report · <span className="text-app-3">{r.reason}</span>
                      </p>
                      <p className="mt-0.5 text-xs text-app-3">
                        Target ID: <code className="font-mono">{r.targetId}</code>
                      </p>
                      {r.note && <p className="mt-1 text-xs text-app-2">"{r.note}"</p>}
                      <p className="mt-1 text-xs text-app-3">{timeAgo(r.createdAt)}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {r.targetType === 'post' && (
                        <button disabled={reportAction === r.id} onClick={() => handleTakedown(r)}
                          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60">
                          {reportAction === r.id ? '…' : 'Remove post'}
                        </button>
                      )}
                      <button disabled={reportAction === r.id} onClick={() => handleResolve(r, 'resolved')}
                        className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-60">
                        Resolve
                      </button>
                      <button disabled={reportAction === r.id} onClick={() => handleResolve(r, 'dismissed')}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-app-2 hover:bg-subtle disabled:opacity-60">
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Audit log tab */}
        {tab === 'audit' && (
          fetchingAudit ? <p className="text-app-2">Loading audit log…</p> : auditLogs.length === 0 ? (
            <p className="text-center text-app-3 py-8">No audit log entries yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-app text-left text-xs uppercase tracking-wider text-app-3">
                    <th className="pb-3 pr-4">Action</th>
                    <th className="pb-3 pr-4">Admin</th>
                    <th className="pb-3 pr-4">Detail</th>
                    <th className="pb-3">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="py-3 pr-4 font-mono text-xs text-app-2">{log.action}</td>
                      <td className="py-3 pr-4 text-xs text-app-3 font-mono">{log.adminUid.slice(0, 8)}…</td>
                      <td className="py-3 pr-4 text-xs text-app-2">{log.detail ?? '—'}</td>
                      <td className="py-3 text-xs text-app-3">{timeAgo(log.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </section>
  );
}

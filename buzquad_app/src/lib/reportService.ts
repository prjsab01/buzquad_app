import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { firestore } from './firestore';

export type ReportReason = 'spam' | 'harassment' | 'misinformation' | 'inappropriate' | 'other';
export type ReportStatus = 'pending' | 'resolved' | 'dismissed';

export interface Report {
  id: string;
  reporterUid: string;
  targetType: 'post' | 'comment' | 'user' | 'message';
  targetId: string;
  targetAuthorUid?: string;
  reason: ReportReason;
  note?: string;
  status: ReportStatus;
  createdAt: unknown;
}

export interface AuditLog {
  id: string;
  adminUid: string;
  action: string;
  targetUid?: string;
  targetId?: string;
  detail?: string;
  createdAt: unknown;
}

export async function submitReport(
  reporterUid: string,
  targetType: Report['targetType'],
  targetId: string,
  reason: ReportReason,
  note?: string,
  targetAuthorUid?: string,
) {
  await addDoc(collection(firestore, 'reports'), {
    reporterUid,
    targetType,
    targetId,
    targetAuthorUid: targetAuthorUid ?? null,
    reason,
    note: note ?? null,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
}

export async function fetchReports(status: ReportStatus = 'pending', pageLimit = 50): Promise<Report[]> {
  const q = query(
    collection(firestore, 'reports'),
    where('status', '==', status),
    orderBy('createdAt', 'desc'),
    limit(pageLimit),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Report, 'id'>) }));
}

export async function resolveReport(reportId: string, adminUid: string, action: 'resolved' | 'dismissed') {
  await updateDoc(doc(firestore, 'reports', reportId), { status: action });
  await writeAuditLog(adminUid, `report_${action}`, undefined, reportId, `Report ${reportId} ${action}`);
}

export async function takedownPost(postId: string, adminUid: string) {
  await deleteDoc(doc(firestore, 'posts', postId));
  await writeAuditLog(adminUid, 'post_takedown', undefined, postId, `Post ${postId} removed`);
}

export async function fetchAuditLogs(pageLimit = 50): Promise<AuditLog[]> {
  const q = query(
    collection(firestore, 'admin_audit_logs'),
    orderBy('createdAt', 'desc'),
    limit(pageLimit),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AuditLog, 'id'>) }));
}

async function writeAuditLog(
  adminUid: string,
  action: string,
  targetUid?: string,
  targetId?: string,
  detail?: string,
) {
  await addDoc(collection(firestore, 'admin_audit_logs'), {
    adminUid,
    action,
    targetUid: targetUid ?? null,
    targetId: targetId ?? null,
    detail: detail ?? null,
    createdAt: serverTimestamp(),
  });
}

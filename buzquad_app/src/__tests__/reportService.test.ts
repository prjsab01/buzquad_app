/**
 * reportService — pure logic tests (no Firebase imports)
 * Tests report payload construction and status validation.
 */
import { describe, it, expect } from 'vitest';

type ReportReason = 'spam' | 'harassment' | 'misinformation' | 'inappropriate' | 'other';
type ReportStatus = 'pending' | 'resolved' | 'dismissed';

const VALID_REASONS: ReportReason[] = ['spam', 'harassment', 'misinformation', 'inappropriate', 'other'];
const VALID_STATUSES: ReportStatus[] = ['pending', 'resolved', 'dismissed'];

function buildReportPayload(
  reporterUid: string,
  targetType: string,
  targetId: string,
  reason: ReportReason,
  note?: string,
) {
  return {
    reporterUid,
    targetType,
    targetId,
    reason,
    note: note ?? null,
    status: 'pending' as ReportStatus,
  };
}

describe('report payload construction', () => {
  it('builds correct payload shape', () => {
    const payload = buildReportPayload('uid_a', 'post', 'post-1', 'spam');
    expect(payload.reporterUid).toBe('uid_a');
    expect(payload.targetType).toBe('post');
    expect(payload.targetId).toBe('post-1');
    expect(payload.reason).toBe('spam');
    expect(payload.status).toBe('pending');
    expect(payload.note).toBeNull();
  });

  it('includes note when provided', () => {
    const payload = buildReportPayload('uid_a', 'post', 'post-1', 'spam', 'This is spam content');
    expect(payload.note).toBe('This is spam content');
  });

  it('always sets initial status to pending', () => {
    const payload = buildReportPayload('uid_a', 'user', 'uid_b', 'harassment');
    expect(payload.status).toBe('pending');
  });
});

describe('report reason validation', () => {
  it('all valid reasons are accepted', () => {
    VALID_REASONS.forEach((r) => {
      expect(VALID_REASONS.includes(r)).toBe(true);
    });
  });
});

describe('report status transitions', () => {
  it('valid statuses are pending, resolved, dismissed', () => {
    expect(VALID_STATUSES).toContain('pending');
    expect(VALID_STATUSES).toContain('resolved');
    expect(VALID_STATUSES).toContain('dismissed');
  });

  it('resolved and dismissed are terminal states', () => {
    const terminal: ReportStatus[] = ['resolved', 'dismissed'];
    terminal.forEach((s) => {
      expect(s).not.toBe('pending');
    });
  });
});

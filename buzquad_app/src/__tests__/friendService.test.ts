/**
 * friendService — pure logic tests (no Firebase imports)
 * Tests FriendRequest status transitions and validation logic.
 */
import { describe, it, expect } from 'vitest';

type FriendRequestStatus = 'pending' | 'accepted' | 'rejected';

// Inline the status transition logic
function canAccept(status: FriendRequestStatus): boolean {
  return status === 'pending';
}

function canCancel(status: FriendRequestStatus, actorUid: string, fromUid: string): boolean {
  return status === 'pending' && actorUid === fromUid;
}

function canReject(status: FriendRequestStatus, actorUid: string, toUid: string): boolean {
  return status === 'pending' && actorUid === toUid;
}

describe('FriendRequest status logic', () => {
  it('can accept a pending request', () => {
    expect(canAccept('pending')).toBe(true);
  });

  it('cannot accept an already accepted request', () => {
    expect(canAccept('accepted')).toBe(false);
  });

  it('cannot accept a rejected request', () => {
    expect(canAccept('rejected')).toBe(false);
  });

  it('sender can cancel their own pending request', () => {
    expect(canCancel('pending', 'uid_a', 'uid_a')).toBe(true);
  });

  it('recipient cannot cancel a request they received', () => {
    expect(canCancel('pending', 'uid_b', 'uid_a')).toBe(false);
  });

  it('cannot cancel an already accepted request', () => {
    expect(canCancel('accepted', 'uid_a', 'uid_a')).toBe(false);
  });

  it('recipient can reject a pending request', () => {
    expect(canReject('pending', 'uid_b', 'uid_b')).toBe(true);
  });

  it('sender cannot reject their own request', () => {
    expect(canReject('pending', 'uid_a', 'uid_b')).toBe(false);
  });
});

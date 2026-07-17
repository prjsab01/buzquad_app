/**
 * postService — pure logic tests (no Firebase imports)
 * Tests the fetchFollowingFeed chunking algorithm in isolation.
 */
import { describe, it, expect } from 'vitest';

// Inline the chunking logic from fetchFollowingFeed
function chunkUids(uids: string[], size: number): string[][] {
  const chunks: string[][] = [];
  for (let i = 0; i < uids.length; i += size) chunks.push(uids.slice(i, i + size));
  return chunks;
}

function sortPostsByDate(posts: { createdAt: { seconds: number } | null }[]) {
  return [...posts].sort((a, b) => {
    const ta = a.createdAt?.seconds ?? 0;
    const tb = b.createdAt?.seconds ?? 0;
    return tb - ta;
  });
}

describe('fetchFollowingFeed — chunking logic', () => {
  it('returns no chunks for empty uid list', () => {
    expect(chunkUids([], 30)).toEqual([]);
  });

  it('returns one chunk when uids <= 30', () => {
    const uids = Array.from({ length: 20 }, (_, i) => `uid_${i}`);
    const chunks = chunkUids(uids, 30);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toHaveLength(20);
  });

  it('returns two chunks when uids = 35', () => {
    const uids = Array.from({ length: 35 }, (_, i) => `uid_${i}`);
    const chunks = chunkUids(uids, 30);
    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toHaveLength(30);
    expect(chunks[1]).toHaveLength(5);
  });

  it('returns three chunks when uids = 61', () => {
    const uids = Array.from({ length: 61 }, (_, i) => `uid_${i}`);
    expect(chunkUids(uids, 30)).toHaveLength(3);
  });
});

describe('post sorting', () => {
  it('sorts posts newest first', () => {
    const posts = [
      { createdAt: { seconds: 100 } },
      { createdAt: { seconds: 300 } },
      { createdAt: { seconds: 200 } },
    ];
    const sorted = sortPostsByDate(posts);
    expect(sorted[0].createdAt?.seconds).toBe(300);
    expect(sorted[2].createdAt?.seconds).toBe(100);
  });

  it('handles null createdAt', () => {
    const posts = [{ createdAt: null }, { createdAt: { seconds: 100 } }];
    const sorted = sortPostsByDate(posts);
    expect(sorted[0].createdAt?.seconds).toBe(100);
  });
});

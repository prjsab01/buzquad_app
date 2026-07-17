/**
 * Seed script — populates dev Firestore with sample data.
 *
 * Usage:
 *   npx tsx scripts/seed.ts
 *
 * Prerequisites:
 *   npm install --save-dev tsx
 *   Set GOOGLE_APPLICATION_CREDENTIALS to your Firebase service account JSON path,
 *   OR set FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY env vars.
 *
 * WARNING: Only run against a dev/test Firebase project. Never run against production.
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// ── init ──────────────────────────────────────────────────────────────────────

if (!getApps().length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  } else {
    // Falls back to GOOGLE_APPLICATION_CREDENTIALS
    initializeApp();
  }
}

const db = getFirestore();

// ── helpers ───────────────────────────────────────────────────────────────────

function now(offsetDays = 0): Timestamp {
  return Timestamp.fromDate(new Date(Date.now() + offsetDays * 86400000));
}

// ── seed data ─────────────────────────────────────────────────────────────────

const USERS = [
  { uid: 'seed_user_1', username: 'alice_dev', displayName: 'Alice Dev', bio: 'Building cool things.', location: 'San Francisco', pronouns: 'she/her' },
  { uid: 'seed_user_2', username: 'bob_builds', displayName: 'Bob Builds', bio: 'Full-stack tinkerer.', location: 'London', pronouns: 'he/him' },
  { uid: 'seed_user_3', username: 'carol_codes', displayName: 'Carol Codes', bio: 'Open source enthusiast.', location: 'Berlin', pronouns: 'they/them' },
];

const COMMUNITIES = [
  { id: 'seed_comm_1', name: 'Dev Corner', description: 'A place for developers.', type: 'public', kind: 'community', ownerUid: 'seed_user_1', memberCount: 3 },
  { id: 'seed_comm_2', name: 'Book Club', description: 'Reading together.', type: 'public', kind: 'group', ownerUid: 'seed_user_2', memberCount: 2 },
  { id: 'seed_comm_3', name: 'Announcements', description: 'Official updates.', type: 'public', kind: 'channel', ownerUid: 'seed_user_1', memberCount: 3 },
];

const POSTS = [
  { authorUid: 'seed_user_1', authorUsername: 'alice_dev', authorDisplayName: 'Alice Dev', text: 'Just shipped a new feature! 🚀 Loving the Buzquad stack.', likeCount: 5 },
  { authorUid: 'seed_user_2', authorUsername: 'bob_builds', authorDisplayName: 'Bob Builds', text: 'Anyone else using Cloudflare Workers for their backend? Game changer.', likeCount: 3 },
  { authorUid: 'seed_user_3', authorUsername: 'carol_codes', authorDisplayName: 'Carol Codes', text: 'Reading "The Pragmatic Programmer" this week. Highly recommend.', likeCount: 7 },
];

const EVENTS = [
  { title: 'Dev Meetup', description: 'Monthly dev catch-up.', type: 'meeting', hostUid: 'seed_user_1', hostDisplayName: 'Alice Dev', timezone: 'UTC', rsvpCount: 2 },
  { title: 'Book Club Session', description: 'Discussing chapter 5.', type: 'study', hostUid: 'seed_user_2', hostDisplayName: 'Bob Builds', timezone: 'UTC', rsvpCount: 1 },
];

const POLLS = [
  {
    authorUid: 'seed_user_1', authorUsername: 'alice_dev', authorDisplayName: 'Alice Dev',
    question: 'What is your preferred frontend framework?',
    options: [
      { text: 'React', votes: 8 },
      { text: 'Vue', votes: 3 },
      { text: 'Svelte', votes: 5 },
    ],
    totalVotes: 16, type: 'single',
  },
];

// ── write ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log('🌱 Seeding Firestore…');
  const batch = db.batch();

  // Users + usernames
  for (const u of USERS) {
    batch.set(db.collection('users').doc(u.uid), { ...u, createdAt: now(-30), updatedAt: now() });
    batch.set(db.collection('usernames').doc(u.username), { uid: u.uid, createdAt: now(-30) });
  }

  // Communities + members
  for (const c of COMMUNITIES) {
    const { id, ...data } = c;
    batch.set(db.collection('communities').doc(id), { ...data, createdAt: now(-20) });
    batch.set(db.collection('communities').doc(id).collection('members').doc(data.ownerUid), {
      uid: data.ownerUid, role: 'owner', joinedAt: now(-20),
    });
  }

  // Posts
  for (const p of POSTS) {
    const ref = db.collection('posts').doc();
    batch.set(ref, { ...p, commentCount: 0, createdAt: now(-Math.floor(Math.random() * 10)) });
  }

  // Events
  for (const e of EVENTS) {
    const ref = db.collection('events').doc();
    batch.set(ref, { ...e, startAt: now(7), createdAt: now(-5) });
  }

  // Polls
  for (const p of POLLS) {
    const ref = db.collection('polls').doc();
    batch.set(ref, { ...p, createdAt: now(-3) });
  }

  await batch.commit();
  console.log('✅ Seed complete.');
}

seed().catch((err) => { console.error('❌ Seed failed:', err); process.exit(1); });

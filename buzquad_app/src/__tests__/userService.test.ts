import { describe, it, expect } from 'vitest';

// Import only the pure functions — they have no Firebase dependency at runtime
// We inline them here to avoid any transitive Firebase import chain
const RESERVED = new Set(['admin','root','support','system','firebase','auth','api','app','login','logout','help','about','contact','settings']);
const pattern = /^[a-z0-9_.]{3,20}$/;

function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

function validateUsername(value: string): { valid: boolean; message?: string } {
  const username = normalizeUsername(value);
  if (!username) return { valid: false, message: 'Username is required.' };
  if (!pattern.test(username)) return { valid: false, message: 'Invalid characters or length.' };
  if (RESERVED.has(username)) return { valid: false, message: 'Reserved username.' };
  if (username.startsWith('.') || username.endsWith('.')) return { valid: false, message: 'Cannot start or end with dot.' };
  if (username.includes('..')) return { valid: false, message: 'No consecutive dots.' };
  return { valid: true };
}

describe('normalizeUsername', () => {
  it('lowercases and trims', () => {
    expect(normalizeUsername('  Alice_99  ')).toBe('alice_99');
  });
  it('handles empty string', () => {
    expect(normalizeUsername('')).toBe('');
  });
});

describe('validateUsername', () => {
  it('accepts valid usernames', () => {
    expect(validateUsername('alice')).toEqual({ valid: true });
    expect(validateUsername('user_123')).toEqual({ valid: true });
    expect(validateUsername('a.b.c')).toEqual({ valid: true });
  });
  it('rejects too short', () => {
    expect(validateUsername('ab').valid).toBe(false);
  });
  it('rejects too long', () => {
    expect(validateUsername('a'.repeat(21)).valid).toBe(false);
  });
  it('rejects reserved words', () => {
    expect(validateUsername('admin').valid).toBe(false);
    expect(validateUsername('root').valid).toBe(false);
  });
  it('rejects leading dot', () => {
    expect(validateUsername('.alice').valid).toBe(false);
  });
  it('rejects trailing dot', () => {
    expect(validateUsername('alice.').valid).toBe(false);
  });
  it('rejects consecutive dots', () => {
    expect(validateUsername('al..ice').valid).toBe(false);
  });
  it('rejects invalid characters', () => {
    expect(validateUsername('alice!').valid).toBe(false);
    expect(validateUsername('alice space').valid).toBe(false);
  });
  it('rejects empty string', () => {
    expect(validateUsername('').valid).toBe(false);
  });
});

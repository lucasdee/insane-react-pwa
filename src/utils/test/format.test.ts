import { describe, expect, it } from 'vitest';
import { formatDate, userLabel } from '../format';

describe('formatDate', () => {
  it('formats an ISO date in the locale, with the full year', () => {
    const expected = new Date('2026-01-15T10:00:00.000Z').toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    expect(formatDate('2026-01-15T10:00:00.000Z')).toBe(expected);
    expect(formatDate('2026-01-15T10:00:00.000Z')).toContain('2026');
  });
});

describe('userLabel', () => {
  it('shows the display name and username, or just the username', () => {
    expect(userLabel({ uuid: 'u', username: 'bob', displayName: 'Bob B' })).toBe('Bob B (@bob)');
    expect(userLabel({ uuid: 'u', username: 'carol', displayName: null })).toBe('@carol');
    expect(userLabel({ uuid: 'u', username: 'dan' })).toBe('@dan');
  });
});

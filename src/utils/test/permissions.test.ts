import { describe, expect, it } from 'vitest';
import {
  assignableRoles,
  canAssign,
  canEditMemo,
  isAuthor,
  roleDescriptions,
} from '../permissions';
import type { Memo, Role } from '../../api/types';

describe('isAuthor', () => {
  const memo = { authorUuid: 'u-1' } as Memo;

  it.each<[string | undefined, boolean]>([
    ['u-1', true],
    ['u-2', false],
    [undefined, false],
  ])('user %s: %s', (userUuid, expected) => {
    expect(isAuthor(memo, userUuid)).toBe(expected);
  });
});

describe('memo permissions', () => {
  it.each<[Role, Role[]]>([
    ['ADMIN', ['USER', 'MOD', 'ADMIN']],
    ['MOD', ['USER']],
    ['USER', []],
  ])('%s can assign %j', (role, roles) => {
    expect(assignableRoles(role)).toEqual(roles);
    expect(canAssign(role)).toBe(roles.length > 0);
  });

  it.each<[Role, boolean, boolean]>([
    ['ADMIN', false, true],
    ['MOD', false, true],
    ['USER', false, false],
    ['ADMIN', true, true],
    ['MOD', true, true],
    ['USER', true, true],
  ])('%s (author: %s) can edit: %s', (role, author, expected) => {
    expect(canEditMemo(role, author)).toBe(expected);
  });

  it('describes every role', () => {
    expect(Object.keys(roleDescriptions).sort()).toEqual(['ADMIN', 'MOD', 'USER']);
  });
});

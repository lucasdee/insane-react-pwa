import { describe, expect, it } from 'vitest';
import {
  assignableRoles,
  canAssign,
  canDeleteMemo,
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

  it.each<[Role, boolean, boolean, boolean]>([
    ['ADMIN', false, true, true],
    ['MOD', false, true, false],
    ['USER', false, false, false],
    ['ADMIN', true, true, true],
    ['MOD', true, true, true],
    ['USER', true, true, true],
  ])('%s (author: %s) can edit: %s, delete: %s', (role, author, edit, remove) => {
    expect(canEditMemo(role, author)).toBe(edit);
    expect(canDeleteMemo(role, author)).toBe(remove);
  });

  it('describes every role', () => {
    expect(Object.keys(roleDescriptions).sort()).toEqual(['ADMIN', 'MOD', 'USER']);
  });
});

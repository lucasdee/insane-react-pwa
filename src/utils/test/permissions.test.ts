import { describe, expect, it } from 'vitest';
import {
  assignableRoles,
  canAssign,
  canDeleteMemo,
  canEditMemo,
  canRemoveAssignment,
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

  describe('canRemoveAssignment', () => {
    const memo = { authorUuid: 'author' } as Memo;
    const check = (
      role: Role,
      assignment: { userUuid: string; assignedByUuid: string; role: Role },
      userUuid: string | undefined = 'me',
    ) => canRemoveAssignment({ assignment, memo, userUuid, role });

    it.each<[Role, Role, boolean]>([
      ['ADMIN', 'USER', true],
      ['ADMIN', 'MOD', true],
      ['ADMIN', 'ADMIN', true],
      ['MOD', 'USER', true],
      ['MOD', 'MOD', false],
      ['MOD', 'ADMIN', false],
      ['USER', 'USER', false],
    ])('a %s may remove a %s someone else assigned: %s', (role, target, expected) => {
      expect(check(role, { userUuid: 'other', assignedByUuid: 'third', role: target })).toBe(
        expected,
      );
    });

    it.each<[Role, Role, boolean]>([
      ['USER', 'USER', true],
      ['USER', 'MOD', false],
      ['USER', 'ADMIN', false],
      ['MOD', 'MOD', true],
      ['MOD', 'ADMIN', false],
    ])('a %s may remove a %s they assigned: %s', (role, target, expected) => {
      expect(check(role, { userUuid: 'other', assignedByUuid: 'me', role: target })).toBe(expected);
    });

    it.each<Role>(['USER', 'MOD', 'ADMIN'])('a %s may leave', (role) => {
      expect(check(role, { userUuid: 'me', assignedByUuid: 'third', role })).toBe(true);
    });

    it('nobody may remove the author, not even the author', () => {
      const author = { userUuid: 'author', assignedByUuid: 'author', role: 'ADMIN' as const };
      expect(check('ADMIN', author)).toBe(false);
      expect(check('ADMIN', author, 'author')).toBe(false);
    });

    it('offers nothing before the signed-in user is known', () => {
      const assignment = { userUuid: 'other', assignedByUuid: 'me', role: 'USER' as const };
      expect(canRemoveAssignment({ assignment, memo, userUuid: undefined, role: 'ADMIN' })).toBe(
        false,
      );
    });
  });

  it('describes every role', () => {
    expect(Object.keys(roleDescriptions).sort()).toEqual(['ADMIN', 'MOD', 'USER']);
  });
});

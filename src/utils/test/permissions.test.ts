import { describe, expect, it } from 'vitest';
import {
  assignableRoles,
  canAssign,
  canEditTags,
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
  it.each<[Role, boolean, Role[]]>([
    ['ADMIN', true, ['USER', 'MOD', 'ADMIN']],
    ['MOD', true, ['USER']],
    ['USER', false, []],
  ])('%s: edit tags %s, assign %j', (role, editTags, roles) => {
    expect(canEditTags(role)).toBe(editTags);
    expect(assignableRoles(role)).toEqual(roles);
    expect(canAssign(role)).toBe(roles.length > 0);
  });

  it('describes every role', () => {
    expect(Object.keys(roleDescriptions).sort()).toEqual(['ADMIN', 'MOD', 'USER']);
  });
});

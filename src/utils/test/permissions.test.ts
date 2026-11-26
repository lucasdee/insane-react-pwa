import { describe, expect, it } from 'vitest';
import { assignableRoles, canAssign, canEditTags, roleDescriptions } from '../permissions';
import type { Role } from '../../api/types';

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

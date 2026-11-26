import type { Role } from '../api/types';

// What a user may do with a memo depends on their role on that memo (not their
// global role). These mirror the API's rules, so the UI only offers allowed actions;
// the API still enforces them.

/** The memo's ADMINs and MODs can replace its tags. */
export const canEditTags = (role: Role): boolean => role === 'ADMIN' || role === 'MOD';

/** The roles a user may give others on a memo: ADMINs any, MODs only USER, USERs none. */
export const assignableRoles = (role: Role): Role[] => {
  if (role === 'ADMIN') return ['USER', 'MOD', 'ADMIN'];
  if (role === 'MOD') return ['USER'];
  return [];
};

export const canAssign = (role: Role): boolean => assignableRoles(role).length > 0;

/** What each role on a memo allows, for the assign dialog. */
export const roleDescriptions: Record<Role, string> = {
  USER: 'Can read the memo',
  MOD: 'Can also edit tags and assign users',
  ADMIN: 'Can also assign MODs and ADMINs',
};

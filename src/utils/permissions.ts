import type { Memo, MemoAssignment, Role } from '../api/types';

/** Whether the user with this uuid wrote the memo. */
export const isAuthor = (memo: Memo, userUuid: string | undefined): boolean =>
  userUuid !== undefined && memo.authorUuid === userUuid;

// What a user may do with a memo depends on whether they wrote it and on their role on
// that memo (not their global role). These mirror the API's rules, so the UI only
// offers allowed actions; the API still enforces them.

/** The memo's author, ADMINs and MODs can change its title, content and tags. */
export const canEditMemo = (role: Role, author: boolean): boolean =>
  author || role === 'ADMIN' || role === 'MOD';

/** The memo's author and ADMINs can delete it. */
export const canDeleteMemo = (role: Role, author: boolean): boolean => author || role === 'ADMIN';

/** The roles a user may give others on a memo: ADMINs any, MODs only USER, USERs none. */
export const assignableRoles = (role: Role): Role[] => {
  if (role === 'ADMIN') return ['USER', 'MOD', 'ADMIN'];
  if (role === 'MOD') return ['USER'];
  return [];
};

export const canAssign = (role: Role): boolean => assignableRoles(role).length > 0;

const ROLE_ORDER: Role[] = ['USER', 'MOD', 'ADMIN'];

type RemoveCheck = {
  /** The assignment to remove. */
  assignment: Pick<MemoAssignment, 'userUuid' | 'assignedByUuid' | 'role'>;
  memo: Memo;
  /** The signed-in user's uuid and their role on the memo. */
  userUuid: string | undefined;
  role: Role;
};

/**
 * Whether the user may remove an assignment to a memo. Nobody may remove the author's.
 * Anyone may remove their own (leave the memo), and ones they made if their role is at
 * least as high as the assignee's. ADMINs may remove any, MODs those with the USER role.
 */
export const canRemoveAssignment = ({ assignment, memo, userUuid, role }: RemoveCheck): boolean => {
  if (userUuid === undefined || assignment.userUuid === memo.authorUuid) return false;
  if (assignment.userUuid === userUuid) return true;
  if (
    assignment.assignedByUuid === userUuid &&
    ROLE_ORDER.indexOf(role) >= ROLE_ORDER.indexOf(assignment.role)
  ) {
    return true;
  }
  if (role === 'ADMIN') return true;
  return role === 'MOD' && assignment.role === 'USER';
};

/** What each role on a memo allows, for the assign dialog. */
export const roleDescriptions: Record<Role, string> = {
  USER: 'Can read the memo',
  MOD: 'Can also edit the memo and assign users',
  ADMIN: 'Can also delete the memo and assign MODs and ADMINs',
};

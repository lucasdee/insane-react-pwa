import { authFetch } from './session';
import type {
  Memo,
  MemoAssignment,
  MemoCreateRequest,
  MemoListQuery,
  MemoOnUser,
  MemoOnUserCreateRequest,
  MemoUpdateRequest,
  TagCount,
} from './types';

const memoPath = (memoUuid: string) => `/memos/${encodeURIComponent(memoUuid)}`;

/** The memos assigned to the signed-in user (including their own), with their role on each. */
export const listMemos = (query: MemoListQuery = {}) =>
  authFetch<MemoOnUser[]>('/memos', { query });

/** Creates a memo. Its author becomes its ADMIN. */
export const createMemo = (body: MemoCreateRequest) =>
  authFetch<Memo>('/memos/create', { method: 'POST', body });

/** The signed-in user's assignment to a memo, with the memo. */
export const getMemo = (memoUuid: string) => authFetch<MemoOnUser>(memoPath(memoUuid));

/**
 * Changes a memo's title, content and tags; fields left out stay. Only its author, MODs
 * and ADMINs can do this.
 */
export const updateMemo = (memoUuid: string, body: MemoUpdateRequest) =>
  authFetch<Memo>(memoPath(memoUuid), { method: 'PATCH', body });

/**
 * Deletes a memo for everyone it is assigned to, with its assignments and tag links.
 * Only its author and ADMINs can do this.
 */
export const deleteMemo = (memoUuid: string) =>
  authFetch<void>(memoPath(memoUuid), { method: 'DELETE' });

/** Replaces all of a memo's tags. Only its author, MODs and ADMINs can do this. */
export const replaceMemoTags = (memoUuid: string, tags: string[]) =>
  authFetch<Memo>(`${memoPath(memoUuid)}/tags`, { method: 'PUT', body: { tags } });

/** Assigns a memo to another user. MODs can assign USER; ADMINs any role. */
export const assignMemo = (body: MemoOnUserCreateRequest) =>
  authFetch<MemoOnUser>('/memos/assign', { method: 'POST', body });

/** Everyone a memo is assigned to, oldest assignment first. */
export const listAssignments = (memoUuid: string) =>
  authFetch<MemoAssignment[]>(`${memoPath(memoUuid)}/assignments`);

/**
 * Removes a user's assignment to a memo; removing your own leaves the memo. See
 * `canRemoveAssignment` for who may. The author's assignment can't be removed.
 */
export const removeAssignment = (memoUuid: string, userUuid: string) =>
  authFetch<void>(`${memoPath(memoUuid)}/assignments/${encodeURIComponent(userUuid)}`, {
    method: 'DELETE',
  });

/** The tags on the signed-in user's memos, sorted by name, with how many memos carry each. */
export const listTags = () => authFetch<TagCount[]>('/tags');

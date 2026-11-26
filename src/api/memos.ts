import { authFetch } from './session';
import type {
  Memo,
  MemoCreateRequest,
  MemoListQuery,
  MemoOnUser,
  MemoOnUserCreateRequest,
  TagCount,
} from './types';

/** The memos assigned to the signed-in user (including their own), with their role on each. */
export const listMemos = (query: MemoListQuery = {}) =>
  authFetch<MemoOnUser[]>('/memos', { query });

/** Creates a memo. Its author becomes its ADMIN. */
export const createMemo = (body: MemoCreateRequest) =>
  authFetch<Memo>('/memos/create', { method: 'POST', body });

/** Replaces all of a memo's tags. Needs the MOD or ADMIN role on the memo. */
export const replaceMemoTags = (memoUuid: string, tags: string[]) =>
  authFetch<Memo>(`/memos/${encodeURIComponent(memoUuid)}/tags`, {
    method: 'PUT',
    body: { tags },
  });

/** Assigns a memo to another user. MODs can assign USER; ADMINs any role. */
export const assignMemo = (body: MemoOnUserCreateRequest) =>
  authFetch<MemoOnUser>('/memos/assign', { method: 'POST', body });

/** The tags on the signed-in user's memos, sorted by name, with how many memos carry each. */
export const listTags = () => authFetch<TagCount[]>('/tags');

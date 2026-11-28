import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  assignMemo,
  createMemo,
  deleteMemo,
  getMemo,
  listAssignments,
  listMemos,
  listTags,
  removeAssignment,
  updateMemo,
} from '../api/memos';
import { ApiError, hasStatus } from '../api/errors';
import type { MemoListItem, MemoOnUser, MemoUpdateRequest } from '../api/types';

export const memosKey = ['memos'] as const;
export const tagsKey = ['tags'] as const;
/** One memo. It starts with `memosKey`, so refetching the memos refetches it too. */
export const memoKey = (memoUuid: string) => [...memosKey, memoUuid] as const;
/** A memo's assignees. It starts with `memoKey`, so it is refetched and dropped with it. */
export const assignmentsKey = (memoUuid: string) => [...memoKey(memoUuid), 'assignments'] as const;

/** Keeps entries that include their memo, newest first (the API doesn't order them). */
export const newestFirst = (items: MemoOnUser[]): MemoListItem[] =>
  items
    .filter((item): item is MemoListItem => item.memo !== undefined)
    .sort((a, b) => b.memo.createdAt.localeCompare(a.memo.createdAt));

/** The signed-in user's memos, newest first. */
export const useMemosQuery = () =>
  useQuery({ queryKey: memosKey, queryFn: () => listMemos(), select: newestFirst });

/** One memo with the signed-in user's role on it. */
export const useMemoQuery = (memoUuid: string) =>
  useQuery({
    queryKey: memoKey(memoUuid),
    queryFn: async (): Promise<MemoListItem> => {
      const item = await getMemo(memoUuid);
      // The API always includes the memo here; this only narrows the type.
      if (!item.memo) throw new ApiError(500, 'The memo is missing from the response');
      return { ...item, memo: item.memo };
    },
  });

/** The tags on the user's memos, for suggestions. */
export const useTagsQuery = () => useQuery({ queryKey: tagsKey, queryFn: listTags });

/** Memos and tag counts change together, so refetch both. */
const useInvalidateMemos = () => {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: memosKey }),
      queryClient.invalidateQueries({ queryKey: tagsKey }),
    ]);
};

export const useCreateMemo = () => {
  const invalidate = useInvalidateMemos();
  return useMutation({ mutationFn: createMemo, onSuccess: invalidate });
};

export const useUpdateMemo = () => {
  const invalidate = useInvalidateMemos();
  return useMutation({
    mutationFn: ({ memoUuid, changes }: { memoUuid: string; changes: MemoUpdateRequest }) =>
      updateMemo(memoUuid, changes),
    onSuccess: invalidate,
  });
};

/**
 * For a memo the user no longer has: it leaves the cached list right away, and its own
 * queries (the memo and its assignees) are dropped, so a page still showing it doesn't
 * refetch them; memos and tags are then refetched without waiting, so callers can
 * navigate away at once.
 */
const useForgetMemo = () => {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateMemos();
  return (memoUuid: string) => {
    queryClient.setQueryData<MemoOnUser[]>(memosKey, (items) =>
      items?.filter((item) => item.memoUuid !== memoUuid),
    );
    queryClient.removeQueries({ queryKey: memoKey(memoUuid) });
    void invalidate();
  };
};

/** Deletes a memo, then forgets it like `useForgetMemo`. */
export const useDeleteMemo = () => {
  const forget = useForgetMemo();
  return useMutation({
    mutationFn: deleteMemo,
    onSuccess: (_data, memoUuid) => forget(memoUuid),
  });
};

/**
 * Assigning doesn't change the caller's own list, so only the memo's assignees are
 * refetched.
 */
export const useAssignMemo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: assignMemo,
    onSuccess: (_data, { memoUuid }) =>
      queryClient.invalidateQueries({ queryKey: assignmentsKey(memoUuid) }),
  });
};

/** Everyone a memo is assigned to, oldest assignment first. */
export const useAssignmentsQuery = (memoUuid: string) =>
  useQuery({ queryKey: assignmentsKey(memoUuid), queryFn: () => listAssignments(memoUuid) });

type RemoveAssignmentVariables = {
  memoUuid: string;
  userUuid: string;
  /** Whether the user removes their own assignment, i.e. leaves the memo. */
  leaving: boolean;
};

/**
 * Removes an assignment and refetches the memo's assignees. Leaving a memo forgets it
 * like deleting does, as the user no longer has access. A 404 means someone else
 * already removed it, so the assignees are refetched then too.
 */
export const useRemoveAssignment = () => {
  const queryClient = useQueryClient();
  const forget = useForgetMemo();
  const refetchAssignments = (memoUuid: string) =>
    queryClient.invalidateQueries({ queryKey: assignmentsKey(memoUuid) });
  return useMutation({
    mutationFn: ({ memoUuid, userUuid }: RemoveAssignmentVariables) =>
      removeAssignment(memoUuid, userUuid),
    onSuccess: (_data, { memoUuid, leaving }) => {
      if (leaving) {
        forget(memoUuid);
        return;
      }
      return refetchAssignments(memoUuid);
    },
    onError: (error, { memoUuid }) => {
      if (hasStatus(error, 404)) void refetchAssignments(memoUuid);
    },
  });
};

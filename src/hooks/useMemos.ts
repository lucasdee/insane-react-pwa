import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { assignMemo, createMemo, listMemos, listTags, replaceMemoTags } from '../api/memos';
import type { MemoListItem, MemoOnUser } from '../api/types';

export const memosKey = ['memos'] as const;
export const tagsKey = ['tags'] as const;

/** Keeps entries that include their memo, newest first (the API doesn't order them). */
export const newestFirst = (items: MemoOnUser[]): MemoListItem[] =>
  items
    .filter((item): item is MemoListItem => item.memo !== undefined)
    .sort((a, b) => b.memo.createdAt.localeCompare(a.memo.createdAt));

/** The signed-in user's memos, newest first. */
export const useMemosQuery = () =>
  useQuery({ queryKey: memosKey, queryFn: () => listMemos(), select: newestFirst });

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

export const useReplaceTags = () => {
  const invalidate = useInvalidateMemos();
  return useMutation({
    mutationFn: ({ memoUuid, tags }: { memoUuid: string; tags: string[] }) =>
      replaceMemoTags(memoUuid, tags),
    onSuccess: invalidate,
  });
};

/** Assigning doesn't change the caller's own list, so nothing is refetched. */
export const useAssignMemo = () => useMutation({ mutationFn: assignMemo });

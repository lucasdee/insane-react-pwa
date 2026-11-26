import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import {
  memosKey,
  newestFirst,
  tagsKey,
  useAssignMemo,
  useCreateMemo,
  useMemosQuery,
  useReplaceTags,
  useTagsQuery,
} from '../useMemos';
import { mockApi, otherUsers, seedMemo } from '../../test/handlers';
import { createTestQueryClient } from '../../test/renderWithProviders';
import type { MemoOnUser } from '../../api/types';

let queryClient: QueryClient;

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

beforeEach(() => {
  mockApi.session = true;
  queryClient = createTestQueryClient();
});

const entry = (uuid: string, createdAt: string, withMemo = true): MemoOnUser => ({
  memoUuid: uuid,
  userUuid: 'u',
  assignedByUuid: 'u',
  assignedAt: createdAt,
  role: 'USER',
  memo: withMemo
    ? { uuid, title: uuid, content: 'c', authorUuid: 'u', createdAt, tags: [] }
    : undefined,
});

describe('newestFirst', () => {
  it('sorts by memo creation date, newest first, dropping entries without a memo', () => {
    const items = [
      entry('old', '2026-01-01T00:00:00.000Z'),
      entry('none', '2026-12-01T00:00:00.000Z', false),
      entry('new', '2026-03-01T00:00:00.000Z'),
      entry('mid', '2026-02-01T00:00:00.000Z'),
    ];

    expect(newestFirst(items).map((i) => i.memo.uuid)).toEqual(['new', 'mid', 'old']);
  });
});

describe('useMemosQuery', () => {
  it("loads the user's memos, newest first", async () => {
    seedMemo({ title: 'First' });
    seedMemo({ title: 'Second' });

    const { result } = renderHook(() => useMemosQuery(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.map((i) => i.memo.title)).toEqual(['Second', 'First']);
  });
});

describe('useTagsQuery', () => {
  it('loads the tag counts', async () => {
    seedMemo({ tags: ['home'] });

    const { result } = renderHook(() => useTagsQuery(), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual([{ name: 'home', memoCount: 1 }]));
  });
});

describe('mutations', () => {
  it('useCreateMemo creates a memo and refetches memos and tags', async () => {
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useCreateMemo(), { wrapper });

    await act(() => result.current.mutateAsync({ title: 'New', content: 'Body', tags: ['x'] }));

    expect(mockApi.memos.map((m) => m.memo.title)).toEqual(['New']);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: memosKey });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: tagsKey });
  });

  it('useReplaceTags replaces the tags and refetches memos and tags', async () => {
    const { memo } = seedMemo({ tags: ['old'] });
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useReplaceTags(), { wrapper });

    const saved = await act(() =>
      result.current.mutateAsync({ memoUuid: memo.uuid, tags: ['new'] }),
    );

    expect(saved.tags).toEqual(['new']);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: memosKey });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: tagsKey });
  });

  it('useAssignMemo assigns without refetching the list', async () => {
    const { memo } = seedMemo();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useAssignMemo(), { wrapper });

    await act(() =>
      result.current.mutateAsync({ memoUuid: memo.uuid, userUuid: otherUsers[0].uuid }),
    );

    expect(mockApi.memos[0].assignees).toEqual([{ userUuid: otherUsers[0].uuid, role: 'USER' }]);
    expect(invalidate).not.toHaveBeenCalled();
  });
});

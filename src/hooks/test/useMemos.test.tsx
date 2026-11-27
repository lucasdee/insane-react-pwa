import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import {
  memoKey,
  memosKey,
  newestFirst,
  tagsKey,
  useAssignMemo,
  useCreateMemo,
  useDeleteMemo,
  useMemoQuery,
  useMemosQuery,
  useReplaceTags,
  useTagsQuery,
  useUpdateMemo,
} from '../useMemos';
import { api, authoredBy, mockApi, otherUsers, seedMemo } from '../../test/handlers';
import { server } from '../../test/server';
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
    ? {
        uuid,
        title: uuid,
        content: 'c',
        authorUuid: 'u',
        authorUsername: 'u',
        authorDisplayName: null,
        createdAt,
        tags: [],
      }
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

describe('useMemoQuery', () => {
  it('loads one memo with the user’s role on it', async () => {
    const { memo } = seedMemo({ title: 'Groceries', role: 'MOD' });

    const { result } = renderHook(() => useMemoQuery(memo.uuid), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({ role: 'MOD', memo });
  });

  it('is refetched along with the memo list', () => {
    expect(memoKey('m-1').slice(0, memosKey.length)).toEqual(memosKey);
  });

  it('fails if the response has no memo', async () => {
    const { memo } = seedMemo();
    server.use(
      http.get(api('/memos/:memoUuid'), () =>
        HttpResponse.json({ memoUuid: memo.uuid, role: 'USER' }),
      ),
    );

    const { result } = renderHook(() => useMemoQuery(memo.uuid), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
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

  it('useUpdateMemo saves the changes and refetches memos and tags', async () => {
    const { memo } = seedMemo({ title: 'Old' });
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useUpdateMemo(), { wrapper });

    const saved = await act(() =>
      result.current.mutateAsync({ memoUuid: memo.uuid, changes: { title: 'New' } }),
    );

    expect(saved.title).toBe('New');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: memosKey });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: tagsKey });
  });

  it('useDeleteMemo drops the memo from the cache, then refetches memos and tags', async () => {
    const { memo } = seedMemo({ title: 'Gone' });
    seedMemo({ title: 'Kept' });
    const list = renderHook(() => useMemosQuery(), { wrapper });
    await waitFor(() => expect(list.result.current.data).toHaveLength(2));
    queryClient.setQueryData(memoKey(memo.uuid), { memoUuid: memo.uuid });
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useDeleteMemo(), { wrapper });

    await act(() => result.current.mutateAsync(memo.uuid));

    expect(mockApi.memos.map((m) => m.memo.title)).toEqual(['Kept']);
    expect(list.result.current.data?.map((i) => i.memo.title)).toEqual(['Kept']);
    expect(queryClient.getQueryState(memoKey(memo.uuid))).toBeUndefined();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: memosKey });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: tagsKey });
  });

  it('useDeleteMemo leaves the cache alone when the API refuses', async () => {
    const { memo } = seedMemo({ role: 'MOD', ...authoredBy(otherUsers[0]) });
    queryClient.setQueryData(memoKey(memo.uuid), { memoUuid: memo.uuid });
    const { result } = renderHook(() => useDeleteMemo(), { wrapper });

    await act(() => result.current.mutateAsync(memo.uuid).catch(() => undefined));

    expect(result.current.isError).toBe(true);
    expect(queryClient.getQueryData(memoKey(memo.uuid))).toEqual({ memoUuid: memo.uuid });
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

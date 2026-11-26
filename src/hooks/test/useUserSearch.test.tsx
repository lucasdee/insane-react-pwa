import { beforeEach, describe, expect, it } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { USER_SEARCH_LIMIT, useUserSearch } from '../useUserSearch';
import { server } from '../../test/server';
import { api, mockApi, otherUsers } from '../../test/handlers';
import { createTestQueryClient } from '../../test/renderWithProviders';

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={createTestQueryClient()}>{children}</QueryClientProvider>
);

/** Records the query strings of GET /users requests. */
const recordSearches = () => {
  const searches: string[] = [];
  server.use(
    http.get(api('/users'), ({ request }) => {
      searches.push(new URL(request.url).search);
      return HttpResponse.json(otherUsers.slice(0, 1));
    }),
  );
  return searches;
};

beforeEach(() => {
  mockApi.session = true;
});

describe('useUserSearch', () => {
  it('does not search for empty or blank text', async () => {
    const searches = recordSearches();

    const { result } = renderHook(() => useUserSearch('   '), { wrapper });

    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(result.current.search).toBe('');
    expect(result.current.fetchStatus).toBe('idle');
    expect(searches).toEqual([]);
  });

  it('searches the trimmed text once typing pauses, with a limit', async () => {
    const searches = recordSearches();
    const { result, rerender } = renderHook(({ text }) => useUserSearch(text), {
      wrapper,
      initialProps: { text: '' },
    });
    rerender({ text: 'b' });
    rerender({ text: 'bo' });
    rerender({ text: ' bob ' });

    await waitFor(() => expect(result.current.data).toEqual(otherUsers.slice(0, 1)));
    expect(result.current.search).toBe('bob');
    expect(searches).toEqual([`?search=bob&limit=${USER_SEARCH_LIMIT}`]);
  });

  it('cuts the search to the 64 characters the API accepts', async () => {
    const searches = recordSearches();

    const { result } = renderHook(() => useUserSearch('x'.repeat(80)), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(searches).toEqual([`?search=${'x'.repeat(64)}&limit=${USER_SEARCH_LIMIT}`]);
  });
});

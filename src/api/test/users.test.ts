import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { getMe, searchUsers } from '../users';
import { server } from '../../test/server';
import { api, mockApi, otherUsers, testUser } from '../../test/handlers';

describe('getMe', () => {
  it('returns the signed-in user', async () => {
    mockApi.session = true;

    expect(await getMe()).toEqual(testUser);
  });
});

describe('searchUsers', () => {
  it('sends the search, limit and offset as query parameters', async () => {
    mockApi.session = true;
    let url: URL | undefined;
    server.use(
      http.get(api('/users'), ({ request }) => {
        url = new URL(request.url);
        return HttpResponse.json([otherUsers[0]]);
      }),
    );

    expect(await searchUsers({ search: 'bo', limit: 5, offset: 10 })).toEqual([otherUsers[0]]);
    expect(url?.search).toBe('?search=bo&limit=5&offset=10');
  });

  it('lists users without a search', async () => {
    mockApi.session = true;

    expect(await searchUsers()).toEqual(otherUsers);
  });
});

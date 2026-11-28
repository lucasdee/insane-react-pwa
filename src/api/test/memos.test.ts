import { beforeEach, describe, expect, it } from 'vitest';
import { http, HttpResponse, type JsonBodyType } from 'msw';
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
} from '../memos';
import { server } from '../../test/server';
import { api, authoredBy, mockApi, otherUsers, seedMemo, testUser } from '../../test/handlers';

beforeEach(() => {
  mockApi.session = true;
});

/** Captures the next request to `method path`, answering with `body`. */
const capture = (method: 'get' | 'post' | 'patch', path: string, body: JsonBodyType = {}) => {
  const seen: { url?: URL; body?: unknown } = {};
  server.use(
    http[method](api(path), async ({ request }) => {
      seen.url = new URL(request.url);
      seen.body = method === 'get' ? undefined : await request.json();
      return HttpResponse.json(body);
    }),
  );
  return seen;
};

describe('listMemos', () => {
  it("returns the user's memos with their role on each", async () => {
    const { memo } = seedMemo({ title: 'Groceries', role: 'MOD' });

    const items = await listMemos();

    expect(items).toEqual([
      expect.objectContaining({ memoUuid: memo.uuid, userUuid: testUser.uuid, role: 'MOD', memo }),
    ]);
  });

  it('sends tag filters as repeated query parameters', async () => {
    const seen = capture('get', '/memos', []);

    await listMemos({ tags: ['home', 'work'], match: 'any' });

    expect(seen.url?.search).toBe('?tags=home&tags=work&match=any');
  });
});

describe('createMemo', () => {
  it('posts the memo and returns it as created', async () => {
    const memo = await createMemo({ title: 'Plan', content: 'Do things', tags: ['Home', 'home'] });

    expect(memo).toMatchObject({ title: 'Plan', content: 'Do things', tags: ['home'] });
    expect(mockApi.memos).toHaveLength(1);
  });
});

describe('getMemo', () => {
  it('returns the user’s assignment with the memo', async () => {
    const { memo } = seedMemo({ title: 'Groceries', role: 'MOD' });

    expect(await getMemo(memo.uuid)).toMatchObject({ memoUuid: memo.uuid, role: 'MOD', memo });
  });

  it('encodes the uuid', async () => {
    const seen = capture('get', '/memos/:memoUuid', {});

    await getMemo('a/b');

    expect(seen.url?.pathname).toBe('/memos/a%2Fb');
  });

  it('rejects with 403 for a memo the user cannot see', async () => {
    await expect(getMemo('missing')).rejects.toMatchObject({ status: 403 });
  });
});

describe('updateMemo', () => {
  it('patches only the given fields, encoding the uuid', async () => {
    const seen = capture('patch', '/memos/:memoUuid', { uuid: 'a/b' });

    await updateMemo('a/b', { title: 'New' });

    expect(seen.url?.pathname).toBe('/memos/a%2Fb');
    expect(seen.body).toEqual({ title: 'New' });
  });

  it('returns the updated memo', async () => {
    const { memo } = seedMemo({ title: 'Old', content: 'Same', tags: ['old'] });

    expect(await updateMemo(memo.uuid, { title: 'New', tags: ['B', 'a'] })).toMatchObject({
      title: 'New',
      content: 'Same',
      tags: ['a', 'b'],
    });
  });

  it('rejects with 403 when the user may not edit the memo', async () => {
    const { memo } = seedMemo({ role: 'USER', ...authoredBy(otherUsers[0]) });

    await expect(updateMemo(memo.uuid, { title: 'New' })).rejects.toMatchObject({ status: 403 });
  });
});

describe('deleteMemo', () => {
  it('deletes the memo, encoding its uuid', async () => {
    let pathname: string | undefined;
    server.use(
      http.delete(api('/memos/:memoUuid'), ({ request }) => {
        pathname = new URL(request.url).pathname;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    expect(await deleteMemo('a/b')).toBeUndefined();
    expect(pathname).toBe('/memos/a%2Fb');
  });

  it('removes the memo', async () => {
    const { memo } = seedMemo();

    await deleteMemo(memo.uuid);

    expect(mockApi.memos).toEqual([]);
  });

  it('rejects with 403 when the user may not delete the memo', async () => {
    const { memo } = seedMemo({ role: 'MOD', ...authoredBy(otherUsers[0]) });

    await expect(deleteMemo(memo.uuid)).rejects.toMatchObject({ status: 403 });
    expect(mockApi.memos).toHaveLength(1);
  });
});

describe('assignMemo', () => {
  it('posts the assignment and returns it', async () => {
    const { memo } = seedMemo();
    const bob = otherUsers[0];

    const assigned = await assignMemo({ memoUuid: memo.uuid, userUuid: bob.uuid, role: 'MOD' });

    expect(assigned).toMatchObject({ memoUuid: memo.uuid, userUuid: bob.uuid, role: 'MOD' });
  });

  it('rejects with the API error, e.g. 409 for a repeated assignment', async () => {
    const { memo } = seedMemo();
    const request = { memoUuid: memo.uuid, userUuid: otherUsers[0].uuid };
    await assignMemo(request);

    await expect(assignMemo(request)).rejects.toMatchObject({ status: 409 });
  });
});

describe('listAssignments', () => {
  it('returns everyone the memo is assigned to, with who assigned them', async () => {
    const entry = seedMemo();
    const bob = otherUsers[0];
    entry.assignees.push({ userUuid: bob.uuid, role: 'MOD' });

    expect(await listAssignments(entry.memo.uuid)).toEqual([
      expect.objectContaining({ userUuid: testUser.uuid, username: 'alice', role: 'ADMIN' }),
      expect.objectContaining({
        userUuid: bob.uuid,
        username: 'bob',
        displayName: 'Bob Builder',
        role: 'MOD',
        assignedByUuid: testUser.uuid,
        assignedByUsername: 'alice',
        assignedByDisplayName: 'Alice Liddell',
      }),
    ]);
  });

  it('encodes the uuid', async () => {
    const seen = capture('get', '/memos/:memoUuid/assignments', []);

    await listAssignments('a/b');

    expect(seen.url?.pathname).toBe('/memos/a%2Fb/assignments');
  });

  it('rejects with 403 for a memo the user cannot see', async () => {
    await expect(listAssignments('00000000-0000-4000-8000-999999999999')).rejects.toMatchObject({
      status: 403,
    });
  });
});

describe('removeAssignment', () => {
  it('deletes the assignment, encoding both uuids', async () => {
    let pathname: string | undefined;
    server.use(
      http.delete(api('/memos/:memoUuid/assignments/:userUuid'), ({ request }) => {
        pathname = new URL(request.url).pathname;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    expect(await removeAssignment('a/b', 'c/d')).toBeUndefined();
    expect(pathname).toBe('/memos/a%2Fb/assignments/c%2Fd');
  });

  it('removes the user from the memo', async () => {
    const entry = seedMemo();
    entry.assignees.push({ userUuid: otherUsers[0].uuid, role: 'USER' });

    await removeAssignment(entry.memo.uuid, otherUsers[0].uuid);

    expect(entry.assignees).toEqual([]);
  });

  it('rejects with 403 for the author, and 404 for a user who is not assigned', async () => {
    const { memo } = seedMemo();

    await expect(removeAssignment(memo.uuid, testUser.uuid)).rejects.toMatchObject({
      status: 403,
    });
    await expect(removeAssignment(memo.uuid, otherUsers[0].uuid)).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe('listTags', () => {
  it('counts the tags on the memos, sorted by name', async () => {
    seedMemo({ tags: ['work', 'home'] });
    seedMemo({ tags: ['home'] });

    expect(await listTags()).toEqual([
      { name: 'home', memoCount: 2 },
      { name: 'work', memoCount: 1 },
    ]);
  });
});

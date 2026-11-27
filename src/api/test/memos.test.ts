import { beforeEach, describe, expect, it } from 'vitest';
import { http, HttpResponse, type JsonBodyType } from 'msw';
import {
  assignMemo,
  createMemo,
  getMemo,
  listMemos,
  listTags,
  replaceMemoTags,
  updateMemo,
} from '../memos';
import { server } from '../../test/server';
import { api, authoredBy, mockApi, otherUsers, seedMemo, testUser } from '../../test/handlers';

beforeEach(() => {
  mockApi.session = true;
});

/** Captures the next request to `method path`, answering with `body`. */
const capture = (
  method: 'get' | 'post' | 'put' | 'patch',
  path: string,
  body: JsonBodyType = {},
) => {
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

describe('replaceMemoTags', () => {
  it('puts the tags to the memo, encoding its uuid', async () => {
    const seen = capture('put', '/memos/:memoUuid/tags', { uuid: 'a/b' });

    await replaceMemoTags('a/b', ['x']);

    expect(seen.url?.pathname).toBe('/memos/a%2Fb/tags');
    expect(seen.body).toEqual({ tags: ['x'] });
  });

  it('returns the updated memo', async () => {
    const { memo } = seedMemo({ tags: ['old'] });

    expect(await replaceMemoTags(memo.uuid, ['New', 'b'])).toMatchObject({ tags: ['b', 'new'] });
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

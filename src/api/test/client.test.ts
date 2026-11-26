import { afterEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { apiFetch, buildUrl } from '../client';
import { ApiError } from '../errors';
import { server } from '../../test/server';
import { api } from '../../test/handlers';
import { API_URL } from '../../config';

describe('buildUrl', () => {
  it('prefixes the API URL', () => {
    expect(buildUrl('/memos')).toBe(`${API_URL}/memos`);
  });

  it('repeats array values and leaves out undefined ones', () => {
    expect(buildUrl('/memos', { tags: ['a', 'b'], match: 'any', skip: undefined, limit: 5 })).toBe(
      `${API_URL}/memos?tags=a&tags=b&match=any&limit=5`,
    );
  });

  it('adds no "?" when every value is undefined', () => {
    expect(buildUrl('/users', { search: undefined })).toBe(`${API_URL}/users`);
  });
});

describe('apiFetch', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends cookies, which hold the refresh token', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({}));

    await apiFetch('/thing');

    expect(fetchSpy).toHaveBeenCalledWith(
      `${API_URL}/thing`,
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('returns the parsed JSON body', async () => {
    let seen: Request | undefined;
    server.use(
      http.get(api('/thing'), ({ request }) => {
        seen = request;
        return HttpResponse.json({ ok: true });
      }),
    );

    expect(await apiFetch('/thing')).toEqual({ ok: true });
    expect(seen?.method).toBe('GET');
    expect(seen?.headers.get('Accept')).toBe('application/json');
    expect(seen?.headers.get('Content-Type')).toBeNull();
  });

  it('sends a body as JSON, with extra headers', async () => {
    let body: unknown;
    let headers: Headers | undefined;
    server.use(
      http.put(api('/thing'), async ({ request }) => {
        body = await request.json();
        headers = request.headers;
        return HttpResponse.json({});
      }),
    );

    await apiFetch('/thing', { method: 'PUT', body: { a: 1 }, headers: { 'X-Test': 'yes' } });

    expect(body).toEqual({ a: 1 });
    expect(headers?.get('Content-Type')).toBe('application/json');
    expect(headers?.get('X-Test')).toBe('yes');
  });

  it('returns undefined for 204 No Content', async () => {
    server.use(http.post(api('/thing'), () => new HttpResponse(null, { status: 204 })));

    expect(await apiFetch('/thing', { method: 'POST' })).toBeUndefined();
  });

  it('throws an ApiError with the status and message of an error response', async () => {
    server.use(
      http.get(api('/thing'), () => HttpResponse.json({ message: 'Nope' }, { status: 403 })),
    );

    const error = await apiFetch('/thing').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 403, message: 'Nope', details: undefined });
  });

  it('keeps the field details of a 422 response', async () => {
    const details = { 'body.title': { message: 'Too short', value: 'a' } };
    server.use(
      http.post(api('/thing'), () =>
        HttpResponse.json({ message: 'Validation failed', details }, { status: 422 }),
      ),
    );

    await expect(apiFetch('/thing', { method: 'POST', body: {} })).rejects.toMatchObject({
      status: 422,
      message: 'Validation failed',
      details,
    });
  });

  it.each([
    ['a non-JSON body', () => new HttpResponse('oops', { status: 502, statusText: 'Bad Gateway' })],
    [
      'a body without a message',
      () => HttpResponse.json({ error: 1 }, { status: 502, statusText: 'Bad Gateway' }),
    ],
  ])('falls back to the status text for %s', async (_label, respond) => {
    server.use(http.get(api('/thing'), respond));

    await expect(apiFetch('/thing')).rejects.toMatchObject({ status: 502, message: 'Bad Gateway' });
  });

  it('says "Request failed" when there is no status text either', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 500 }));

    await expect(apiFetch('/thing')).rejects.toMatchObject({
      status: 500,
      message: 'Request failed',
    });
  });

  it('turns a network failure into an ApiError with status 0', async () => {
    server.use(http.get(api('/thing'), () => HttpResponse.error()));

    await expect(apiFetch('/thing')).rejects.toMatchObject({ status: 0, message: 'Network error' });
  });

  it('rethrows the abort error when the request was aborted', async () => {
    server.use(http.get(api('/thing'), () => HttpResponse.json({})));
    const controller = new AbortController();
    controller.abort();

    const error = await apiFetch('/thing', { signal: controller.signal }).catch((e: unknown) => e);

    expect(error).not.toBeInstanceOf(ApiError);
    expect((error as Error).name).toBe('AbortError');
  });
});

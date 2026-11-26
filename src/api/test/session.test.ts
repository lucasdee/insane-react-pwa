import { afterEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import {
  REFRESH_LOCK,
  REFRESH_MARGIN_MS,
  authFetch,
  expireSession,
  onSessionExpired,
  refreshSession,
} from '../session';
import { tokenStore } from '../tokenStore';
import { ApiError } from '../errors';
import { server } from '../../test/server';
import { api, authResponse, mockApi } from '../../test/handlers';

/** Counts calls to /auth/refresh, answering with `respond` (a fresh token by default). */
const countRefreshes = (respond = () => HttpResponse.json(authResponse())) => {
  const calls = { count: 0 };
  server.use(
    http.post(api('/auth/refresh'), () => {
      calls.count++;
      return respond();
    }),
  );
  return calls;
};

/** Answers GET /thing with the Authorization header it got. */
const echoAuthorization = () =>
  server.use(
    http.get(api('/thing'), ({ request }) =>
      HttpResponse.json({ authorization: request.headers.get('Authorization') }),
    ),
  );

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('refreshSession', () => {
  it('stores the new access token', async () => {
    mockApi.session = true;

    await refreshSession();

    expect(tokenStore.get()?.value).toMatch(/^access-token-/);
    expect(tokenStore.get()!.expiresOn).toBeGreaterThan(Date.now());
  });

  it('sends one request for concurrent calls', async () => {
    const refreshes = countRefreshes();

    await Promise.all([refreshSession(), refreshSession(), refreshSession()]);

    expect(refreshes.count).toBe(1);
  });

  it('sends a new request once the previous one has finished', async () => {
    const refreshes = countRefreshes();

    await refreshSession();
    await refreshSession();

    expect(refreshes.count).toBe(2);
  });

  it('throws an ApiError when there is no valid session', async () => {
    await expect(refreshSession()).rejects.toMatchObject({ status: 401 });
    expect(tokenStore.get()).toBeNull();
  });

  it('holds a Web Lock while refreshing, where the browser supports it', async () => {
    const request = vi.fn((_name: string, callback: () => Promise<void>) => callback());
    vi.stubGlobal('navigator', { ...navigator, locks: { request } });
    mockApi.session = true;

    await refreshSession();

    expect(request).toHaveBeenCalledWith(REFRESH_LOCK, expect.any(Function));
    expect(tokenStore.get()).not.toBeNull();
  });
});

describe('authFetch', () => {
  it('gets an access token first when there is none, and sends it', async () => {
    const refreshes = countRefreshes(() =>
      HttpResponse.json({ ...authResponse(), accessToken: 'fresh' }),
    );
    echoAuthorization();

    expect(await authFetch('/thing')).toEqual({ authorization: 'Bearer fresh' });
    expect(refreshes.count).toBe(1);
  });

  it('uses a valid token without refreshing', async () => {
    tokenStore.set('current', Date.now() + 5 * 60_000);
    const refreshes = countRefreshes();
    echoAuthorization();

    expect(await authFetch('/thing')).toEqual({ authorization: 'Bearer current' });
    expect(refreshes.count).toBe(0);
  });

  it('refreshes a token that is about to expire', async () => {
    tokenStore.set('old', Date.now() + REFRESH_MARGIN_MS - 1000);
    const refreshes = countRefreshes(() =>
      HttpResponse.json({ ...authResponse(), accessToken: 'new' }),
    );
    echoAuthorization();

    expect(await authFetch('/thing')).toEqual({ authorization: 'Bearer new' });
    expect(refreshes.count).toBe(1);
  });

  it('refreshes and retries once when the API answers 401', async () => {
    tokenStore.set('revoked', Date.now() + 5 * 60_000);
    countRefreshes(() => HttpResponse.json({ ...authResponse(), accessToken: 'new' }));
    server.use(
      http.get(api('/thing'), ({ request }) =>
        request.headers.get('Authorization') === 'Bearer new'
          ? HttpResponse.json({ ok: true })
          : HttpResponse.json({ message: 'Invalid token' }, { status: 401 }),
      ),
    );

    expect(await authFetch('/thing')).toEqual({ ok: true });
  });

  it('gives up when the retry is rejected too', async () => {
    tokenStore.set('revoked', Date.now() + 5 * 60_000);
    const refreshes = countRefreshes();
    server.use(
      http.get(api('/thing'), () =>
        HttpResponse.json({ message: 'Invalid token' }, { status: 401 }),
      ),
    );

    await expect(authFetch('/thing')).rejects.toMatchObject({ status: 401 });
    expect(refreshes.count).toBe(1);
  });

  it('does not refresh for other errors', async () => {
    tokenStore.set('current', Date.now() + 5 * 60_000);
    const refreshes = countRefreshes();
    server.use(
      http.get(api('/thing'), () => HttpResponse.json({ message: 'No' }, { status: 403 })),
    );

    await expect(authFetch('/thing')).rejects.toMatchObject({ status: 403, message: 'No' });
    expect(refreshes.count).toBe(0);
  });

  it('ends the session when the refresh token is rejected', async () => {
    const expired = vi.fn();
    const unsubscribe = onSessionExpired(expired);

    await expect(authFetch('/thing')).rejects.toBeInstanceOf(ApiError);

    expect(expired).toHaveBeenCalledOnce();
    expect(tokenStore.get()).toBeNull();
    unsubscribe();
  });

  it('keeps the session when the refresh fails for another reason', async () => {
    const expired = vi.fn();
    const unsubscribe = onSessionExpired(expired);
    countRefreshes(() => HttpResponse.json({ message: 'Down' }, { status: 503 }));

    await expect(authFetch('/thing')).rejects.toMatchObject({ status: 503 });

    expect(expired).not.toHaveBeenCalled();
    unsubscribe();
  });
});

describe('onSessionExpired and expireSession', () => {
  it('notifies listeners until they unsubscribe, and forgets the token', () => {
    const listener = vi.fn();
    const unsubscribe = onSessionExpired(listener);
    tokenStore.set('t', Date.now() + 60_000);

    expireSession();
    unsubscribe();
    expireSession();

    expect(listener).toHaveBeenCalledOnce();
    expect(tokenStore.get()).toBeNull();
  });
});

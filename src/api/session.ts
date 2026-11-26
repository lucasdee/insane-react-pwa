import { apiFetch, type RequestOptions } from './client';
import { hasStatus } from './errors';
import { tokenStore } from './tokenStore';
import type { AuthResponse } from './types';

/** Access tokens this close to expiry are refreshed before use. */
export const REFRESH_MARGIN_MS = 30_000;

/** Web Lock that serializes refreshes across tabs. */
export const REFRESH_LOCK = 'insane-react-pwa:auth-refresh';

type Listener = () => void;
const expiredListeners = new Set<Listener>();

/** Calls `listener` whenever the session can't be refreshed any more. Returns an unsubscribe. */
export const onSessionExpired = (listener: Listener): (() => void) => {
  expiredListeners.add(listener);
  return () => {
    expiredListeners.delete(listener);
  };
};

/** Forgets the access token and tells the listeners the session is over. */
export const expireSession = () => {
  tokenStore.clear();
  expiredListeners.forEach((listener) => listener());
};

export const storeTokens = (auth: AuthResponse) => {
  tokenStore.set(auth.accessToken, auth.accessTokenExpiresOn);
};

let inFlight: Promise<void> | null = null;

const requestRefresh = async () => {
  storeTokens(await apiFetch<AuthResponse>('/auth/refresh', { method: 'POST' }));
};

/**
 * Gets a new access token with the refresh-token cookie, which the API rotates on
 * every use and rejects when two requests use it at once. So concurrent calls in
 * this tab share one request, and a Web Lock (where supported) keeps other tabs
 * from refreshing at the same moment. Throws an ApiError (401 when there is no
 * valid session).
 */
export const refreshSession = (): Promise<void> => {
  if (!inFlight) {
    const locks = globalThis.navigator?.locks;
    const refresh = locks ? locks.request(REFRESH_LOCK, requestRefresh) : requestRefresh();
    inFlight = refresh.finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
};

/** Refreshes, and ends the session if the API says it is no longer valid. */
const refreshOrExpire = async () => {
  try {
    await refreshSession();
  } catch (error) {
    if (hasStatus(error, 401)) expireSession();
    throw error;
  }
};

const isExpiring = () => {
  const token = tokenStore.get();
  return !token || token.expiresOn - Date.now() < REFRESH_MARGIN_MS;
};

/**
 * Calls the API as the signed-in user. Refreshes the access token first when it is
 * missing or about to expire, and once more if the API still answers 401.
 */
export const authFetch = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  if (isExpiring()) await refreshOrExpire();

  const send = () =>
    apiFetch<T>(path, {
      ...options,
      headers: { ...options.headers, Authorization: `Bearer ${tokenStore.get()?.value ?? ''}` },
    });

  try {
    return await send();
  } catch (error) {
    if (!hasStatus(error, 401)) throw error;
    await refreshOrExpire();
    return send();
  }
};

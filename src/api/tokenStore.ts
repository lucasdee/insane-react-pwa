/**
 * The current access token. It is kept in memory only, never in storage, so a
 * script injected into the page can't read it later; a reload gets a new one
 * through the refresh-token cookie.
 */
type StoredToken = { value: string; expiresOn: number };

let current: StoredToken | null = null;

export const tokenStore = {
  get: (): StoredToken | null => current,
  /** `expiresOn` is in epoch milliseconds, as the API returns it. */
  set: (value: string, expiresOn: number) => {
    current = { value, expiresOn };
  },
  clear: () => {
    current = null;
  },
};

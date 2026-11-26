import { apiFetch } from './client';
import { storeTokens } from './session';
import { tokenStore } from './tokenStore';
import type { AuthResponse, LoginRequest, RegisterRequest, User } from './types';

/** Creates an account. It does not sign in: call `login` afterwards. */
export const register = (body: RegisterRequest) =>
  apiFetch<User>('/auth/register', { method: 'POST', body });

/** Signs in: stores the access token; the API sets the refresh-token cookie. */
export const login = async (body: LoginRequest): Promise<void> => {
  storeTokens(await apiFetch<AuthResponse>('/auth/login', { method: 'POST', body }));
};

/** Revokes the session's refresh token. The access token is forgotten even if this fails. */
export const logout = async (): Promise<void> => {
  try {
    await apiFetch<void>('/auth/logout', { method: 'POST' });
  } finally {
    tokenStore.clear();
  }
};

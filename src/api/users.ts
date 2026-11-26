import { authFetch } from './session';
import type { User, UserSearchQuery, UserSummary } from './types';

export const getMe = () => authFetch<User>('/users/me');

/** Other users, ordered by username, optionally filtered by username or display name. */
export const searchUsers = (query: UserSearchQuery = {}, signal?: AbortSignal) =>
  authFetch<UserSummary[]>('/users', { query, signal });

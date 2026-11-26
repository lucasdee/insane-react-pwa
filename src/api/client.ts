import { API_URL } from '../config';
import { ApiError, type ValidationDetail } from './errors';

export type QueryValue = string | number | boolean | undefined | (string | number)[];

export type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  /** Sent as JSON. */
  body?: unknown;
  /** Arrays are repeated (`?tags=a&tags=b`); undefined values are left out. */
  query?: Record<string, QueryValue>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

export const buildUrl = (path: string, query?: Record<string, QueryValue>): string => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined) continue;
    for (const item of Array.isArray(value) ? value : [value]) params.append(key, String(item));
  }
  const search = params.toString();
  return `${API_URL}${path}${search ? `?${search}` : ''}`;
};

type ErrorBody = { message?: unknown; details?: Record<string, ValidationDetail> };

const toApiError = async (response: Response): Promise<ApiError> => {
  let body: ErrorBody = {};
  try {
    body = (await response.json()) as ErrorBody;
  } catch {
    // Not JSON: fall back to the status text below.
  }
  const message =
    typeof body.message === 'string' ? body.message : response.statusText || 'Request failed';
  return new ApiError(response.status, message, body.details);
};

/**
 * Calls the API without authentication. Sends cookies (the refresh token lives in
 * one), throws an ApiError for any non-2xx response or network failure, and
 * returns the parsed JSON body (undefined for 204).
 */
export const apiFetch = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const { method = 'GET', body, query, headers = {}, signal } = options;
  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      credentials: 'include',
      signal,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ApiError(0, 'Network error');
  }

  if (!response.ok) throw await toApiError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
};

import { QueryClient } from '@tanstack/react-query';
import { isApiError } from './api/errors';

/** Retries a failed query twice, except for client errors (4xx), which a retry won't fix. */
export const shouldRetry = (failureCount: number, error: unknown): boolean => {
  if (failureCount >= 2) return false;
  return !(isApiError(error) && error.status >= 400 && error.status < 500);
};

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: shouldRetry, staleTime: 30_000 },
      mutations: { retry: false },
    },
  });

/** One invalid field of a 422 response, keyed like `body.username`. */
export type ValidationDetail = { message: string; value?: unknown };

/** An error response from the API, or a request that never got one (`status` 0). */
export class ApiError extends Error {
  readonly status: number;
  readonly details?: Record<string, ValidationDetail>;

  constructor(status: number, message: string, details?: Record<string, ValidationDetail>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export const isApiError = (error: unknown): error is ApiError => error instanceof ApiError;

/** Whether `error` is an ApiError with one of the given statuses. */
export const hasStatus = (error: unknown, ...statuses: number[]): error is ApiError =>
  isApiError(error) && statuses.includes(error.status);

/**
 * The field messages of a 422 response, keyed by top-level field name: `body.username`
 * and `username` both become `username`, and an invalid list item such as
 * `body.tags.$1` becomes `tags`. The first message for a field wins.
 */
export const fieldErrors = (error: unknown): Record<string, string> => {
  if (!isApiError(error) || !error.details) return {};
  const errors: Record<string, string> = {};
  for (const [key, detail] of Object.entries(error.details)) {
    const field = key.replace(/^body\./, '').split(/[.[]/)[0];
    errors[field] ??= detail.message;
  }
  return errors;
};

/** A message to show for any error thrown while talking to the API. */
export const errorMessage = (error: unknown): string => {
  if (isApiError(error)) {
    if (error.status === 0) return 'Cannot reach the server. Check your connection and try again.';
    if (error.status === 429) return 'Too many attempts. Please wait a while and try again.';
    if (error.status >= 500) return 'Something went wrong on the server. Please try again.';
    return error.message;
  }
  return 'Something went wrong. Please try again.';
};

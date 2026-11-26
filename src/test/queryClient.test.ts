import { describe, expect, it } from 'vitest';
import { createQueryClient, shouldRetry } from '../queryClient';
import { ApiError } from '../api/errors';

describe('shouldRetry', () => {
  it.each([
    [0, new ApiError(0, 'Network error'), true],
    [1, new ApiError(503, 'Unavailable'), true],
    [0, new Error('boom'), true],
    [2, new ApiError(503, 'Unavailable'), false],
    [0, new ApiError(400, 'Bad'), false],
    [0, new ApiError(404, 'Not found'), false],
    [0, new ApiError(499, 'Client'), false],
  ])('after %i failures, %o -> %s', (failures, error, expected) => {
    expect(shouldRetry(failures, error)).toBe(expected);
  });
});

describe('createQueryClient', () => {
  it('retries queries with shouldRetry and never retries mutations', () => {
    const defaults = createQueryClient().getDefaultOptions();

    expect(defaults.queries?.retry).toBe(shouldRetry);
    expect(defaults.mutations?.retry).toBe(false);
  });
});

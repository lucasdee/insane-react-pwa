import { describe, expect, it } from 'vitest';
import { ApiError, errorMessage, fieldErrors, hasStatus, isApiError } from '../errors';

describe('ApiError', () => {
  it('is an Error with a status and optional details', () => {
    const error = new ApiError(422, 'Validation failed', { 'body.x': { message: 'bad' } });

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ApiError');
    expect(error.status).toBe(422);
    expect(error.message).toBe('Validation failed');
    expect(error.details).toEqual({ 'body.x': { message: 'bad' } });
  });
});

describe('isApiError and hasStatus', () => {
  it('recognize ApiErrors only', () => {
    expect(isApiError(new ApiError(400, 'x'))).toBe(true);
    expect(isApiError(new Error('x'))).toBe(false);
    expect(isApiError({ status: 400 })).toBe(false);
  });

  it('hasStatus matches any of the given statuses', () => {
    const error = new ApiError(409, 'Conflict');

    expect(hasStatus(error, 409)).toBe(true);
    expect(hasStatus(error, 401, 409)).toBe(true);
    expect(hasStatus(error, 401)).toBe(false);
    expect(hasStatus(new Error('x'), 409)).toBe(false);
  });
});

describe('fieldErrors', () => {
  it('maps 422 details to messages keyed by field name', () => {
    const error = new ApiError(422, 'Validation failed', {
      'body.username': { message: 'Too short', value: 'a' },
      search: { message: 'Too long' },
    });

    expect(fieldErrors(error)).toEqual({ username: 'Too short', search: 'Too long' });
  });

  it('reports an invalid list item under its list, keeping the first message', () => {
    const error = new ApiError(422, 'Validation failed', {
      'body.tags.$1': { message: 'Bad tag' },
      'body.tags': { message: 'Too many tags' },
    });

    expect(fieldErrors(error)).toEqual({ tags: 'Bad tag' });
  });

  it('is empty for errors without details', () => {
    expect(fieldErrors(new ApiError(401, 'x'))).toEqual({});
    expect(fieldErrors(new Error('x'))).toEqual({});
    expect(fieldErrors(undefined)).toEqual({});
  });
});

describe('errorMessage', () => {
  it.each([
    [
      new ApiError(0, 'Network error'),
      'Cannot reach the server. Check your connection and try again.',
    ],
    [
      new ApiError(429, 'Too many requests'),
      'Too many attempts. Please wait a while and try again.',
    ],
    [new ApiError(500, 'Internal'), 'Something went wrong on the server. Please try again.'],
    [new ApiError(503, 'Unavailable'), 'Something went wrong on the server. Please try again.'],
    [new ApiError(403, 'Only ADMINs can do that'), 'Only ADMINs can do that'],
    [new Error('boom'), 'Something went wrong. Please try again.'],
  ])('describes %o', (error, message) => {
    expect(errorMessage(error)).toBe(message);
  });
});

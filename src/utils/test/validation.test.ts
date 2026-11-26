import { describe, expect, it } from 'vitest';
import {
  hasErrors,
  validateDisplayName,
  validateEmail,
  validateLogin,
  validatePassword,
  validateRegister,
  validateUsername,
} from '../validation';

describe('validateUsername', () => {
  it.each([
    ['ab', 'Please provide a username that is at least 3 characters long'],
    ['a'.repeat(65), 'Please provide a username that is at most 64 characters long'],
    ['abc', undefined],
    ['a'.repeat(64), undefined],
  ])('%s -> %s', (username, message) => {
    expect(validateUsername(username)).toBe(message);
  });
});

describe('validatePassword', () => {
  it.each([
    ['12345', 'Please provide a password that is at least 6 characters long'],
    ['a'.repeat(73), 'Please provide a password that is at most 72 characters long'],
    ['123456', undefined],
    ['a'.repeat(72), undefined],
  ])('%s -> %s', (password, message) => {
    expect(validatePassword(password)).toBe(message);
  });

  it('rejects passwords over 72 bytes even within 72 characters', () => {
    // "ą" takes 2 bytes in UTF-8: 40 characters, 80 bytes.
    expect(validatePassword('ą'.repeat(40))).toMatch(/at most 72 bytes/);
    expect(validatePassword('ą'.repeat(36))).toBeUndefined();
  });
});

describe('validateEmail', () => {
  it.each([
    ['', 'Please provide a valid email address'],
    ['alice', 'Please provide a valid email address'],
    ['alice@example', 'Please provide a valid email address'],
    [
      `${'a'.repeat(120)}@example.com`,
      'Please provide an email address that is at most 128 characters long',
    ],
    ['alice@example.com', undefined],
  ])('%s -> %s', (email, message) => {
    expect(validateEmail(email)).toBe(message);
  });
});

describe('validateDisplayName', () => {
  it('allows an empty name and up to 64 characters', () => {
    expect(validateDisplayName('')).toBeUndefined();
    expect(validateDisplayName('a'.repeat(64))).toBeUndefined();
    expect(validateDisplayName('a'.repeat(65))).toBe(
      'Please provide a display name that is at most 64 characters long',
    );
  });
});

describe('validateLogin', () => {
  it('only requires both fields', () => {
    expect(validateLogin({ username: '', password: '' })).toEqual({
      username: 'Please enter your username',
      password: 'Please enter your password',
    });
    expect(validateLogin({ username: 'a', password: 'b' })).toEqual({});
  });
});

describe('validateRegister', () => {
  const valid = {
    username: 'alice',
    email: 'alice@example.com',
    displayName: '',
    password: 'secret123',
    confirmPassword: 'secret123',
  };

  it('accepts valid values', () => {
    expect(validateRegister(valid)).toEqual({});
  });

  it('reports every invalid field', () => {
    expect(
      validateRegister({
        username: 'a',
        email: 'nope',
        displayName: 'x'.repeat(65),
        password: '123',
        confirmPassword: '1234',
      }),
    ).toEqual({
      username: expect.stringMatching(/at least 3/),
      email: 'Please provide a valid email address',
      displayName: expect.stringMatching(/at most 64/),
      password: expect.stringMatching(/at least 6/),
      confirmPassword: 'The passwords do not match',
    });
  });
});

describe('hasErrors', () => {
  it('is true when any field has an error', () => {
    expect(hasErrors({})).toBe(false);
    expect(hasErrors({ username: 'x' })).toBe(true);
  });
});

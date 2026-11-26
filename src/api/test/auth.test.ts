import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { login, logout, register } from '../auth';
import { tokenStore } from '../tokenStore';
import { server } from '../../test/server';
import { TEST_PASSWORD, api, mockApi, testUser } from '../../test/handlers';

describe('register', () => {
  it('posts the new account and returns the created user', async () => {
    const user = await register({
      username: 'newbie',
      email: 'newbie@example.com',
      password: 'secret123',
      displayName: 'New Bie',
    });

    expect(user).toMatchObject({ username: 'newbie', email: 'newbie@example.com' });
    expect(tokenStore.get()).toBeNull();
  });
});

describe('login', () => {
  it('stores the access token from the API', async () => {
    await login({ username: testUser.username, password: TEST_PASSWORD });

    expect(tokenStore.get()?.value).toMatch(/^access-token-/);
    expect(mockApi.session).toBe(true);
  });

  it('rejects wrong credentials with a 401 ApiError', async () => {
    await expect(login({ username: 'alice', password: 'wrong' })).rejects.toMatchObject({
      status: 401,
      message: 'Invalid credentials',
    });
    expect(tokenStore.get()).toBeNull();
  });
});

describe('logout', () => {
  it('revokes the session and forgets the access token', async () => {
    mockApi.session = true;
    tokenStore.set('t', Date.now() + 60_000);

    await logout();

    expect(mockApi.session).toBe(false);
    expect(tokenStore.get()).toBeNull();
  });

  it('forgets the access token even when the API call fails', async () => {
    server.use(http.post(api('/auth/logout'), () => HttpResponse.error()));
    tokenStore.set('t', Date.now() + 60_000);

    await expect(logout()).rejects.toMatchObject({ status: 0 });
    expect(tokenStore.get()).toBeNull();
  });
});

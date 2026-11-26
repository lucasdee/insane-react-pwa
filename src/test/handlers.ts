import { http, HttpResponse } from 'msw';
import { API_URL } from '../config';
import type { AuthResponse, LoginRequest, RegisterRequest, User, UserSummary } from '../api/types';

/** The full URL of an API path, for `http.get(api('/users/me'), ...)`. */
export const api = (path: string) => `${API_URL}${path}`;

export const TEST_PASSWORD = 'secret123';

export const testUser: User = {
  uuid: '11111111-1111-4111-8111-111111111111',
  username: 'alice',
  email: 'alice@example.com',
  displayName: 'Alice Liddell',
  role: 'USER',
  createdAt: '2026-01-15T10:00:00.000Z',
};

export const otherUsers: UserSummary[] = [
  { uuid: '22222222-2222-4222-8222-222222222222', username: 'bob', displayName: 'Bob Builder' },
  { uuid: '33333333-3333-4333-8333-333333333333', username: 'carol', displayName: null },
];

const MINUTE = 60_000;

let issued = 0;

/** An AuthResponse with a fresh token, valid for `minutes`. */
export const authResponse = (minutes = 5): AuthResponse => ({
  accessToken: `access-token-${++issued}`,
  accessTokenExpiresOn: Date.now() + minutes * MINUTE,
  refreshTokenExpiresOn: Date.now() + 7 * 24 * 60 * MINUTE,
});

/**
 * State of the fake API. `session` stands for a valid refresh-token cookie: while it
 * is set, /auth/refresh succeeds. Tests change it directly, e.g. to start signed in.
 */
export const mockApi = {
  session: false,
  user: { ...testUser } as User,
  password: TEST_PASSWORD,
  /** Access tokens the fake API accepts. */
  validTokens: new Set<string>(),
};

export const resetMockApi = () => {
  mockApi.session = false;
  mockApi.user = { ...testUser };
  mockApi.password = TEST_PASSWORD;
  mockApi.validTokens.clear();
};

const issueTokens = () => {
  mockApi.session = true;
  const auth = authResponse();
  mockApi.validTokens.add(auth.accessToken);
  return HttpResponse.json(auth);
};

const isAuthorized = (request: Request) => {
  const token = request.headers.get('Authorization')?.replace(/^Bearer /, '');
  return !!token && mockApi.validTokens.has(token);
};

const unauthorized = (message = 'Invalid token') => HttpResponse.json({ message }, { status: 401 });

/** Handlers for every endpoint the app calls, behaving like the real API. */
export const handlers = [
  http.post(api('/auth/register'), async ({ request }) => {
    const body = (await request.json()) as RegisterRequest;
    mockApi.user = {
      ...testUser,
      username: body.username,
      email: body.email,
      displayName: body.displayName ?? null,
    };
    mockApi.password = body.password;
    return HttpResponse.json(mockApi.user, { status: 201 });
  }),

  http.post(api('/auth/login'), async ({ request }) => {
    const { username, password } = (await request.json()) as LoginRequest;
    if (username !== mockApi.user.username || password !== mockApi.password) {
      return unauthorized('Invalid credentials');
    }
    return issueTokens();
  }),

  http.post(api('/auth/refresh'), () =>
    mockApi.session ? issueTokens() : unauthorized('No refresh token in cookie'),
  ),

  http.post(api('/auth/logout'), () => {
    if (!mockApi.session) return unauthorized('No refresh token in cookie');
    mockApi.session = false;
    mockApi.validTokens.clear();
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(api('/users/me'), ({ request }) =>
    isAuthorized(request) ? HttpResponse.json(mockApi.user) : unauthorized(),
  ),

  http.get(api('/users'), ({ request }) => {
    if (!isAuthorized(request)) return unauthorized();
    const search = new URL(request.url).searchParams.get('search')?.toLowerCase() ?? '';
    return HttpResponse.json(
      otherUsers.filter(
        (u) => u.username.includes(search) || (u.displayName ?? '').toLowerCase().includes(search),
      ),
    );
  }),
];

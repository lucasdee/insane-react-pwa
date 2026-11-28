import { http, HttpResponse } from 'msw';
import { API_URL } from '../config';
import type {
  AuthResponse,
  LoginRequest,
  Memo,
  MemoAssignment,
  MemoCreateRequest,
  MemoOnUser,
  MemoOnUserCreateRequest,
  MemoUpdateRequest,
  RegisterRequest,
  Role,
  User,
  UserSummary,
} from '../api/types';

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
 * Another user a memo is assigned to, and who assigned them: the signed-in user unless
 * `assignedByUuid` says otherwise.
 */
export type MockAssignee = { userUuid: string; role: Role; assignedByUuid?: string };

/**
 * A memo in the fake API: the signed-in user's role on it, and who else it is assigned
 * to. Its author is assigned as ADMIN even when not listed in `assignees`.
 */
export type MockMemo = { memo: Memo; role: Role; assignees: MockAssignee[] };

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
  /** The signed-in user's memos. */
  memos: [] as MockMemo[],
};

let memoCount = 0;

/** The author fields of a memo written by `user`. */
export const authoredBy = (
  user: UserSummary,
): Pick<Memo, 'authorUuid' | 'authorUsername' | 'authorDisplayName'> => ({
  authorUuid: user.uuid,
  authorUsername: user.username,
  authorDisplayName: user.displayName ?? null,
});

/**
 * Adds a memo to the signed-in user's list. It is theirs unless the author fields
 * say otherwise, e.g. `seedMemo({ ...authoredBy(otherUsers[0]), role: 'USER' })`.
 */
export const seedMemo = (
  overrides: Partial<
    Pick<
      Memo,
      | 'title'
      | 'content'
      | 'tags'
      | 'createdAt'
      | 'authorUuid'
      | 'authorUsername'
      | 'authorDisplayName'
    >
  > & { role?: Role } = {},
): MockMemo => {
  const n = ++memoCount;
  const { role = 'ADMIN', ...memo } = overrides;
  const entry: MockMemo = {
    memo: {
      uuid: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
      title: `Memo ${n}`,
      content: `Content of memo ${n}`,
      ...authoredBy(mockApi.user),
      createdAt: new Date(Date.UTC(2026, 0, n)).toISOString(),
      tags: [],
      ...memo,
    },
    role,
    assignees: [],
  };
  mockApi.memos.push(entry);
  return entry;
};

/** Tags the way the API stores them: lowercased, unique, sorted. */
const storedTags = (tags: string[] = []) =>
  [...new Set(tags.map((tag) => tag.trim().toLowerCase()))].sort();

export const resetMockApi = () => {
  mockApi.session = false;
  mockApi.user = { ...testUser };
  mockApi.password = TEST_PASSWORD;
  mockApi.validTokens.clear();
  mockApi.memos = [];
  memoCount = 0;
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

const forbidden = (message: string) => HttpResponse.json({ message }, { status: 403 });

const NO_ACCESS = 'Memo not found or you do not have access to it';

const findMemo = (uuid: unknown) => mockApi.memos.find((entry) => entry.memo.uuid === uuid);

/** Like the API: a memo's author, MODs and ADMINs may edit it and replace its tags. */
const canEdit = ({ memo, role }: MockMemo) =>
  memo.authorUuid === mockApi.user.uuid || role === 'MOD' || role === 'ADMIN';

const listEntry = ({ memo, role }: MockMemo): MemoOnUser => ({
  memoUuid: memo.uuid,
  userUuid: mockApi.user.uuid,
  assignedByUuid: mockApi.user.uuid,
  assignedAt: memo.createdAt,
  role,
  memo,
});

/** Everyone the fake API knows: the signed-in user and the others. */
const knownUser = (uuid: string): UserSummary => {
  const found = [mockApi.user, ...otherUsers].find((u) => u.uuid === uuid);
  return found ?? { uuid, username: 'unknown', displayName: null };
};

/**
 * Everyone a memo is assigned to, like `GET /memos/{memoUuid}/assignments`: its author,
 * the signed-in user (assigned by the author) and the other assignees.
 */
const assignmentsOf = ({ memo, role, assignees }: MockMemo): MemoAssignment[] => {
  const me = mockApi.user.uuid;
  const rows: MockAssignee[] = [];
  if (memo.authorUuid !== me && !assignees.some((a) => a.userUuid === memo.authorUuid)) {
    rows.push({ userUuid: memo.authorUuid, role: 'ADMIN', assignedByUuid: memo.authorUuid });
  }
  rows.push({ userUuid: me, role, assignedByUuid: memo.authorUuid });
  rows.push(...assignees);
  return rows.map(({ userUuid, role, assignedByUuid = me }) => {
    const user = knownUser(userUuid);
    const by = knownUser(assignedByUuid);
    return {
      userUuid,
      username: user.username,
      displayName: user.displayName ?? null,
      role,
      assignedAt: memo.createdAt,
      assignedByUuid,
      assignedByUsername: by.username,
      assignedByDisplayName: by.displayName ?? null,
    };
  });
};

const ROLE_ORDER: Role[] = ['USER', 'MOD', 'ADMIN'];

/** Like the API: who may remove an assignment other than the author's. */
const mayRemove = (myRole: Role, target: MemoAssignment) => {
  const me = mockApi.user.uuid;
  if (target.userUuid === me) return true;
  if (
    target.assignedByUuid === me &&
    ROLE_ORDER.indexOf(myRole) >= ROLE_ORDER.indexOf(target.role)
  ) {
    return true;
  }
  return myRole === 'ADMIN' || (myRole === 'MOD' && target.role === 'USER');
};

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

  http.get(api('/memos'), ({ request }) =>
    isAuthorized(request) ? HttpResponse.json(mockApi.memos.map(listEntry)) : unauthorized(),
  ),

  http.post(api('/memos/create'), async ({ request }) => {
    if (!isAuthorized(request)) return unauthorized();
    const body = (await request.json()) as MemoCreateRequest;
    const { memo } = seedMemo({ title: body.title, content: body.content, role: 'ADMIN' });
    memo.tags = storedTags(body.tags);
    memo.createdAt = new Date().toISOString();
    return HttpResponse.json(memo, { status: 201 });
  }),

  http.get(api('/memos/:memoUuid'), ({ request, params }) => {
    if (!isAuthorized(request)) return unauthorized();
    const entry = findMemo(params.memoUuid);
    return entry ? HttpResponse.json(listEntry(entry)) : forbidden(NO_ACCESS);
  }),

  http.patch(api('/memos/:memoUuid'), async ({ request, params }) => {
    if (!isAuthorized(request)) return unauthorized();
    const entry = findMemo(params.memoUuid);
    if (!entry) return forbidden(NO_ACCESS);
    if (!canEdit(entry)) return forbidden("Only the memo's author, ADMINs and MODs can edit it");
    const { title, content, tags } = (await request.json()) as MemoUpdateRequest;
    entry.memo = {
      ...entry.memo,
      ...(title !== undefined && { title }),
      ...(content !== undefined && { content }),
      ...(tags !== undefined && { tags: storedTags(tags) }),
    };
    return HttpResponse.json(entry.memo);
  }),

  http.delete(api('/memos/:memoUuid'), ({ request, params }) => {
    if (!isAuthorized(request)) return unauthorized();
    const entry = findMemo(params.memoUuid);
    if (!entry) return forbidden(NO_ACCESS);
    if (entry.memo.authorUuid !== mockApi.user.uuid && entry.role !== 'ADMIN') {
      return forbidden("Only the memo's author and ADMINs can delete it");
    }
    mockApi.memos = mockApi.memos.filter((other) => other !== entry);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(api('/memos/assign'), async ({ request }) => {
    if (!isAuthorized(request)) return unauthorized();
    const { memoUuid, userUuid, role = 'USER' } = (await request.json()) as MemoOnUserCreateRequest;
    const entry = findMemo(memoUuid);
    if (!entry) return forbidden(NO_ACCESS);
    if (entry.role === 'USER') {
      return forbidden('Only users with sufficient permissions can assign memos to other users');
    }
    if (entry.role === 'MOD' && role !== 'USER') {
      return forbidden(`Only the memo's ADMINs can assign the ${role} role`);
    }
    if (!otherUsers.some((u) => u.uuid === userUuid)) {
      return HttpResponse.json({ message: 'User not found' }, { status: 404 });
    }
    if (entry.assignees.some((a) => a.userUuid === userUuid)) {
      return HttpResponse.json(
        { message: 'The user is already assigned to the memo' },
        { status: 409 },
      );
    }
    entry.assignees.push({ userUuid, role });
    const assigned: MemoOnUser = {
      memoUuid,
      userUuid,
      assignedByUuid: mockApi.user.uuid,
      assignedAt: new Date().toISOString(),
      role,
    };
    return HttpResponse.json(assigned, { status: 201 });
  }),

  http.get(api('/memos/:memoUuid/assignments'), ({ request, params }) => {
    if (!isAuthorized(request)) return unauthorized();
    const entry = findMemo(params.memoUuid);
    return entry ? HttpResponse.json(assignmentsOf(entry)) : forbidden(NO_ACCESS);
  }),

  http.delete(api('/memos/:memoUuid/assignments/:userUuid'), ({ request, params }) => {
    if (!isAuthorized(request)) return unauthorized();
    const entry = findMemo(params.memoUuid);
    if (!entry) return forbidden(NO_ACCESS);
    const target = assignmentsOf(entry).find((a) => a.userUuid === params.userUuid);
    if (!target) {
      return HttpResponse.json(
        { message: 'The user is not assigned to the memo' },
        { status: 404 },
      );
    }
    if (target.userUuid === entry.memo.authorUuid) {
      return forbidden("The memo's author can't be removed from it");
    }
    if (!mayRemove(entry.role, target)) {
      return forbidden(
        "Only the memo's ADMINs, its MODs (for USERs) and whoever assigned the user, with a role at least as high, can remove this assignment",
      );
    }
    if (target.userUuid === mockApi.user.uuid) {
      mockApi.memos = mockApi.memos.filter((other) => other !== entry);
    } else {
      entry.assignees = entry.assignees.filter((a) => a.userUuid !== target.userUuid);
    }
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(api('/tags'), ({ request }) => {
    if (!isAuthorized(request)) return unauthorized();
    const counts = new Map<string, number>();
    for (const { memo } of mockApi.memos) {
      for (const tag of memo.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    return HttpResponse.json(
      [...counts]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, memoCount]) => ({ name, memoCount })),
    );
  }),

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

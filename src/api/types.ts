// The API's request and response types, generated from its OpenAPI spec
// (see scripts/sync-api-types.mjs). Nothing here is written by hand.
import type { Api, Memo, MemoOnUser, User } from './generated/api';

export type {
  AuthResponse,
  LoginRequest,
  Memo,
  MemoCreateRequest,
  MemoOnUser,
  MemoOnUserCreateRequest,
  MemoTagsUpdateRequest,
  RegisterRequest,
  TagCount,
  TagName,
  User,
  UserSummary,
} from './generated/api';

/** A user's global role, or their role on a memo. */
export type Role = User['role'];

type GeneratedApi = Api<unknown>;

/** Query parameters of `GET /users`. */
export type UserSearchQuery = NonNullable<Parameters<GeneratedApi['users']['searchUsers']>[0]>;

/** Query parameters of `GET /memos`. */
export type MemoListQuery = NonNullable<Parameters<GeneratedApi['memos']['listMyMemos']>[0]>;

/** A list entry from `GET /memos`, which always includes the memo. */
export type MemoListItem = MemoOnUser & { memo: Memo };

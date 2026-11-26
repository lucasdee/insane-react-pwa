import { createContext } from 'react';
import type { LoginRequest, RegisterRequest, User } from '../api/types';

/** `loading` until the app knows whether the refresh-token cookie holds a session. */
export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

/** Why a signed-in user became anonymous: they logged out, or their session ended. */
export type SignOutReason = 'logout' | 'expired';

export type AuthContextValue = {
  status: AuthStatus;
  /** The signed-in user, while `status` is `authenticated`. */
  user: User | null;
  /** Set when the user was signed in during this visit and no longer is. */
  signedOutBy?: SignOutReason;
  login: (credentials: LoginRequest) => Promise<void>;
  /** Creates the account, then signs in with it. */
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

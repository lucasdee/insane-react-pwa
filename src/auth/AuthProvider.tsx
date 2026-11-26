import { useCallback, useEffect, useMemo, useState, type FC, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as authApi from '../api/auth';
import { onSessionExpired, refreshSession } from '../api/session';
import { getMe } from '../api/users';
import type { LoginRequest, RegisterRequest, User } from '../api/types';
import {
  AuthContext,
  type AuthContextValue,
  type AuthStatus,
  type SignOutReason,
} from './AuthContext';

type State = { status: AuthStatus; user: User | null; signedOutBy?: SignOutReason };

const ANONYMOUS: State = { status: 'anonymous', user: null };

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const [state, setState] = useState<State>({ status: 'loading', user: null });

  // A reload loses the in-memory access token: get a new one from the cookie.
  useEffect(() => {
    let active = true;
    const restore = async () => {
      try {
        await refreshSession();
        const user = await getMe();
        if (active) setState({ status: 'authenticated', user });
      } catch {
        if (active) setState(ANONYMOUS);
      }
    };
    void restore();
    return () => {
      active = false;
    };
  }, []);

  const signOutLocally = useCallback(
    (signedOutBy: SignOutReason) => {
      queryClient.clear();
      setState({ ...ANONYMOUS, signedOutBy });
    },
    [queryClient],
  );

  useEffect(() => onSessionExpired(() => signOutLocally('expired')), [signOutLocally]);

  const login = useCallback(async (credentials: LoginRequest) => {
    await authApi.login(credentials);
    const user = await getMe();
    setState({ status: 'authenticated', user });
  }, []);

  const register = useCallback(
    async (data: RegisterRequest) => {
      await authApi.register(data);
      await login({ username: data.username, password: data.password });
    },
    [login],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Already signed out on the server, or unreachable: sign out here anyway.
    }
    signOutLocally('logout');
  }, [signOutLocally]);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, login, register, logout }),
    [state, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

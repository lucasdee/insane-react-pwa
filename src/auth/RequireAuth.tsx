import type { FC, ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from './useAuth';
import FullPageSpinner from '../components/FullPageSpinner';
import type { FromState } from './PublicOnly';

/**
 * Renders its children (or the nested routes) only for a signed-in user. Others go
 * to /login, which brings them back here after signing in; a user who just logged
 * out goes to the home screen instead.
 */
export const RequireAuth: FC<{ children?: ReactNode }> = ({ children }) => {
  const { status, signedOutBy } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <FullPageSpinner />;
  if (status === 'anonymous') {
    if (signedOutBy === 'logout') return <Navigate to='/' replace />;
    const state: FromState = { from: location.pathname + location.search };
    return <Navigate to='/login' replace state={state} />;
  }
  return children ?? <Outlet />;
};

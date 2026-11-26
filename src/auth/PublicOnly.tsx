import type { FC, ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from './useAuth';
import FullPageSpinner from '../components/FullPageSpinner';

/** Location state: the page RequireAuth sent the visitor away from, to return to after signing in. */
export type FromState = { from?: string };

/** The page a signed-in user lands on. */
export const HOME_FOR_USERS = '/profile';

/**
 * Renders its children (or the nested routes) only for visitors who are not signed
 * in. A signed-in user, including one who just signed in on this page, goes back to
 * where RequireAuth sent them from, or to their profile.
 */
export const PublicOnly: FC<{ children?: ReactNode }> = ({ children }) => {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <FullPageSpinner />;
  if (status === 'authenticated') {
    const from = (location.state as FromState | null)?.from;
    return <Navigate to={from ?? HOME_FOR_USERS} replace />;
  }
  return children ?? <Outlet />;
};

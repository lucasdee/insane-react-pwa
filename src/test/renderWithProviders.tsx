import type { ReactElement, ReactNode } from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation, type MemoryRouterProps } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../auth/AuthProvider';

export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

/** Shows the current location, so tests can check where navigation went. */
export const LocationProbe = () => {
  const location = useLocation();
  return <output data-testid='location'>{location.pathname + location.search}</output>;
};

type Options = {
  /** Where the router starts: a URL, or a location with state. */
  route?: NonNullable<MemoryRouterProps['initialEntries']>[number];
  queryClient?: QueryClient;
  /** Leave out the AuthProvider, for components that don't need it. */
  withoutAuth?: boolean;
};

/**
 * Renders `ui` with everything the app provides in main.tsx (React Query, a router
 * and the AuthProvider), plus a LocationProbe. Returns a user-event instance too.
 */
export const renderWithProviders = (ui: ReactElement, options: Options = {}) => {
  const { route = '/', queryClient = createTestQueryClient(), withoutAuth = false } = options;
  const content: ReactNode = withoutAuth ? ui : <AuthProvider>{ui}</AuthProvider>;
  const user = userEvent.setup();
  const result = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        {content}
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { ...result, user, queryClient };
};

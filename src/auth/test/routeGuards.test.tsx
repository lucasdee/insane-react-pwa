import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router';
import { RequireAuth } from '../RequireAuth';
import { PublicOnly } from '../PublicOnly';
import { mockApi } from '../../test/handlers';
import { renderWithProviders } from '../../test/renderWithProviders';

const TestRoutes = () => (
  <Routes>
    <Route
      path='/login'
      element={
        <PublicOnly>
          <p>login page</p>
        </PublicOnly>
      }
    />
    <Route element={<PublicOnly />}>
      <Route path='/welcome' element={<p>welcome page</p>} />
    </Route>
    <Route
      path='/secret'
      element={
        <RequireAuth>
          <p>secret page</p>
        </RequireAuth>
      }
    />
    <Route element={<RequireAuth />}>
      <Route path='/profile' element={<p>profile page</p>} />
    </Route>
  </Routes>
);

const location = () => screen.getByTestId('location');

describe('RequireAuth', () => {
  it('shows a spinner while the session is being restored', () => {
    renderWithProviders(<TestRoutes />, { route: '/secret' });

    expect(screen.getByRole('progressbar', { name: 'Loading' })).toBeInTheDocument();
  });

  it('sends anonymous visitors to /login', async () => {
    renderWithProviders(<TestRoutes />, { route: '/secret?x=1' });

    expect(await screen.findByText('login page')).toBeInTheDocument();
    expect(location()).toHaveTextContent('/login');
  });

  it('renders its children for a signed-in user', async () => {
    mockApi.session = true;
    renderWithProviders(<TestRoutes />, { route: '/secret' });

    expect(await screen.findByText('secret page')).toBeInTheDocument();
  });

  it('renders the nested route for a signed-in user', async () => {
    mockApi.session = true;
    renderWithProviders(<TestRoutes />, { route: '/profile' });

    expect(await screen.findByText('profile page')).toBeInTheDocument();
  });
});

describe('PublicOnly', () => {
  it('shows a spinner while the session is being restored', () => {
    renderWithProviders(<TestRoutes />, { route: '/login' });

    expect(screen.getByRole('progressbar', { name: 'Loading' })).toBeInTheDocument();
  });

  it('renders its children or nested route for anonymous visitors', async () => {
    renderWithProviders(<TestRoutes />, { route: '/welcome' });

    expect(await screen.findByText('welcome page')).toBeInTheDocument();
  });

  it('sends a signed-in user to their profile', async () => {
    mockApi.session = true;
    renderWithProviders(<TestRoutes />, { route: '/login' });

    expect(await screen.findByText('profile page')).toBeInTheDocument();
    expect(location()).toHaveTextContent('/profile');
  });

  it('sends a signed-in user back to the page RequireAuth sent them from', async () => {
    mockApi.session = true;
    renderWithProviders(<TestRoutes />, {
      route: { pathname: '/login', state: { from: '/secret?x=1' } },
    });

    expect(await screen.findByText('secret page')).toBeInTheDocument();
    expect(location()).toHaveTextContent('/secret?x=1');
  });
});

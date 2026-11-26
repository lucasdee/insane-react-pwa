import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, screen } from '@testing-library/react';
import App from '../App';
import useOnlineStatus from '../hooks/useOnlineStatus';
import { TEST_PASSWORD, mockApi } from './handlers';
import { expireSession } from '../api/session';
import { renderWithProviders } from './renderWithProviders';

vi.mock('../hooks/useOnlineStatus', () => ({ default: vi.fn(() => true) }));

const location = () => screen.getByTestId('location');

afterEach(() => {
  vi.mocked(useOnlineStatus).mockReturnValue(true);
});

describe('App', () => {
  it('shows the offline screen without a connection', () => {
    vi.mocked(useOnlineStatus).mockReturnValue(false);

    renderWithProviders(<App />);

    expect(screen.getByRole('heading', { name: /offline mode/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Log in' })).not.toBeInTheDocument();
  });

  it('shows the home screen with login and register buttons', async () => {
    renderWithProviders(<App />);

    expect(await screen.findByRole('link', { name: 'Log in' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Register' })).toBeInTheDocument();
  });

  it('shows the profile by default after logging in from the home screen', async () => {
    const { user } = renderWithProviders(<App />);

    await user.click(await screen.findByRole('link', { name: 'Log in' }));
    await user.type(screen.getByLabelText('Username'), 'alice');
    await user.type(screen.getByLabelText('Password'), TEST_PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByRole('heading', { name: 'Alice Liddell' })).toBeInTheDocument();
    expect(location()).toHaveTextContent('/profile');
  });

  it('sends a signed-in user from the home screen to their profile', async () => {
    mockApi.session = true;
    renderWithProviders(<App />);

    expect(await screen.findByRole('heading', { name: 'Alice Liddell' })).toBeInTheDocument();
    expect(location()).toHaveTextContent('/profile');
  });

  it('asks an anonymous visitor of a protected page to log in, then shows that page', async () => {
    const { user } = renderWithProviders(<App />, { route: '/profile' });

    await screen.findByRole('heading', { name: 'Log in' });
    expect(location()).toHaveTextContent('/login');
    await user.type(screen.getByLabelText('Username'), 'alice');
    await user.type(screen.getByLabelText('Password'), TEST_PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByRole('heading', { name: 'Alice Liddell' })).toBeInTheDocument();
    expect(location()).toHaveTextContent('/profile');
  });

  it('asks to log in again when the session expires, then returns to the page', async () => {
    mockApi.session = true;
    const { user } = renderWithProviders(<App />, { route: '/profile' });
    await screen.findByRole('heading', { name: 'Alice Liddell' });

    act(() => expireSession());

    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument();
    expect(screen.getByText('Your session has expired. Please log in again.')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Username'), 'alice');
    await user.type(screen.getByLabelText('Password'), TEST_PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByRole('heading', { name: 'Alice Liddell' })).toBeInTheDocument();
    expect(location()).toHaveTextContent('/profile');
  });

  it('sends unknown paths to the home screen', async () => {
    renderWithProviders(<App />, { route: '/no/such/page' });

    expect(await screen.findByRole('link', { name: 'Register' })).toBeInTheDocument();
    expect(location()).toHaveTextContent(/^\/$/);
  });
});

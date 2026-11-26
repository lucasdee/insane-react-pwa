import { describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { useState } from 'react';
import { useAuth } from '../useAuth';
import { expireSession } from '../../api/session';
import { tokenStore } from '../../api/tokenStore';
import { server } from '../../test/server';
import { TEST_PASSWORD, api, mockApi, testUser } from '../../test/handlers';
import { renderWithProviders } from '../../test/renderWithProviders';

/** Shows the auth state and offers its actions as buttons. */
const Consumer = () => {
  const { status, user, signedOutBy, login, register, logout } = useAuth();
  const [error, setError] = useState('');
  const run = (action: () => Promise<void>) => () =>
    action().catch((e: Error) => setError(e.message));

  return (
    <div>
      <p>status: {status}</p>
      <p>user: {user?.username ?? 'none'}</p>
      <p>signed out by: {signedOutBy ?? 'nothing'}</p>
      {error && <p role='alert'>{error}</p>}
      <button onClick={run(() => login({ username: 'alice', password: TEST_PASSWORD }))}>
        login
      </button>
      <button onClick={run(() => login({ username: 'alice', password: 'wrong' }))}>
        bad login
      </button>
      <button
        onClick={run(() =>
          register({ username: 'newbie', email: 'n@example.com', password: 'secret123' }),
        )}
      >
        register
      </button>
      <button onClick={run(logout)}>logout</button>
    </div>
  );
};

const renderConsumer = () => renderWithProviders(<Consumer />);

const waitForStatus = (status: string) => screen.findByText(`status: ${status}`);

describe('AuthProvider', () => {
  it('starts loading, then is anonymous without a session', async () => {
    renderConsumer();

    expect(screen.getByText('status: loading')).toBeInTheDocument();
    await waitForStatus('anonymous');
    expect(screen.getByText('user: none')).toBeInTheDocument();
    expect(screen.getByText('signed out by: nothing')).toBeInTheDocument();
  });

  it('restores the session from the refresh-token cookie', async () => {
    mockApi.session = true;
    renderConsumer();

    await waitForStatus('authenticated');
    expect(screen.getByText(`user: ${testUser.username}`)).toBeInTheDocument();
  });

  it('is anonymous when the profile cannot be loaded after a refresh', async () => {
    mockApi.session = true;
    server.use(http.get(api('/users/me'), () => HttpResponse.json({}, { status: 500 })));
    renderConsumer();

    await waitForStatus('anonymous');
  });

  it('logs in and loads the user', async () => {
    const { user } = renderConsumer();
    await waitForStatus('anonymous');

    await user.click(screen.getByRole('button', { name: 'login' }));

    await waitForStatus('authenticated');
    expect(screen.getByText('user: alice')).toBeInTheDocument();
  });

  it('rejects a failed login and stays anonymous', async () => {
    const { user } = renderConsumer();
    await waitForStatus('anonymous');

    await user.click(screen.getByRole('button', { name: 'bad login' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials');
    expect(screen.getByText('status: anonymous')).toBeInTheDocument();
  });

  it('registers and then logs in with the new account', async () => {
    const { user } = renderConsumer();
    await waitForStatus('anonymous');

    await user.click(screen.getByRole('button', { name: 'register' }));

    await waitForStatus('authenticated');
    expect(screen.getByText('user: newbie')).toBeInTheDocument();
  });

  it('logs out: revokes the session and clears cached data', async () => {
    mockApi.session = true;
    const { user, queryClient } = renderConsumer();
    await waitForStatus('authenticated');
    queryClient.setQueryData(['memos'], ['cached']);

    await user.click(screen.getByRole('button', { name: 'logout' }));

    await waitForStatus('anonymous');
    expect(screen.getByText('signed out by: logout')).toBeInTheDocument();
    expect(mockApi.session).toBe(false);
    expect(queryClient.getQueryData(['memos'])).toBeUndefined();
    expect(tokenStore.get()).toBeNull();
  });

  it('logs out locally even when the API cannot be reached', async () => {
    mockApi.session = true;
    server.use(http.post(api('/auth/logout'), () => HttpResponse.error()));
    const { user } = renderConsumer();
    await waitForStatus('authenticated');

    await user.click(screen.getByRole('button', { name: 'logout' }));

    await waitForStatus('anonymous');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('becomes anonymous when the session expires', async () => {
    mockApi.session = true;
    const { queryClient } = renderConsumer();
    await waitForStatus('authenticated');
    queryClient.setQueryData(['memos'], ['cached']);

    act(() => expireSession());

    await waitForStatus('anonymous');
    expect(screen.getByText('signed out by: expired')).toBeInTheDocument();
    expect(queryClient.getQueryData(['memos'])).toBeUndefined();
  });

  it('ignores the restore result after unmounting', async () => {
    mockApi.session = true;
    const { unmount } = renderConsumer();

    unmount();

    // Nothing to assert on screen: this must simply not throw or warn.
    await waitFor(() => expect(tokenStore.get()).not.toBeNull());
  });
});

describe('useAuth', () => {
  it('throws outside an AuthProvider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const Lonely = () => {
      useAuth();
      return null;
    };

    expect(() => render(<Lonely />)).toThrow('useAuth must be used inside an AuthProvider');
    vi.restoreAllMocks();
  });
});

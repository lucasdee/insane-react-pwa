import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { AppRoutes } from '../../App';
import { server } from '../../test/server';
import { api, mockApi } from '../../test/handlers';
import { renderWithProviders } from '../../test/renderWithProviders';

const renderSignedIn = async () => {
  mockApi.session = true;
  const result = renderWithProviders(<AppRoutes />, { route: '/profile' });
  await screen.findByRole('heading', { name: 'Alice Liddell' });
  return result;
};

describe('AppLayout', () => {
  it('shows the app bar with navigation above the page', async () => {
    await renderSignedIn();

    expect(screen.getByRole('banner')).toHaveTextContent('insane-react-pwa');
    expect(screen.getByRole('link', { name: 'Profile' })).toHaveClass('active');
    expect(screen.getByRole('link', { name: 'Memos' })).not.toHaveClass('active');
    expect(screen.getByRole('main')).toContainElement(
      screen.getByRole('heading', { name: 'Alice Liddell' }),
    );
  });

  it('navigates to the memos', async () => {
    const { user } = await renderSignedIn();

    await user.click(screen.getByRole('link', { name: 'Memos' }));

    expect(await screen.findByRole('heading', { name: 'My memos' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Memos' })).toHaveClass('active');
  });

  it('logs out and returns to the home screen', async () => {
    const { user } = await renderSignedIn();

    await user.click(screen.getByRole('button', { name: 'Log out' }));

    expect(await screen.findByRole('link', { name: 'Register' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/);
    expect(mockApi.session).toBe(false);
  });

  it('returns to the home screen even when the logout request fails', async () => {
    server.use(http.post(api('/auth/logout'), () => HttpResponse.error()));
    const { user } = await renderSignedIn();

    await user.click(screen.getByRole('button', { name: 'Log out' }));

    expect(await screen.findByRole('link', { name: 'Register' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/);
  });
});

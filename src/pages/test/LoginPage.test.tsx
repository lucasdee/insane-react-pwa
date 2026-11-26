import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { AppRoutes } from '../../App';
import { server } from '../../test/server';
import { TEST_PASSWORD, api, testUser } from '../../test/handlers';
import { renderWithProviders } from '../../test/renderWithProviders';

/** Renders the app's routes at /login and waits for the form. */
const renderLogin = async () => {
  const result = renderWithProviders(<AppRoutes />, { route: '/login' });
  await screen.findByRole('heading', { name: 'Log in' });
  return result;
};

const fillAndSubmit = async (
  user: Awaited<ReturnType<typeof renderLogin>>['user'],
  username: string,
  password: string,
) => {
  if (username) await user.type(screen.getByLabelText('Username'), username);
  if (password) await user.type(screen.getByLabelText('Password'), password);
  await user.click(screen.getByRole('button', { name: 'Log in' }));
};

describe('LoginPage', () => {
  it('requires both fields before sending anything', async () => {
    let requests = 0;
    server.use(
      http.post(api('/auth/login'), () => {
        requests++;
        return HttpResponse.json({});
      }),
    );
    const { user } = await renderLogin();

    await fillAndSubmit(user, '', '');

    expect(screen.getByText('Please enter your username')).toBeInTheDocument();
    expect(screen.getByText('Please enter your password')).toBeInTheDocument();
    expect(requests).toBe(0);
  });

  it('logs in and shows the profile', async () => {
    const { user } = await renderLogin();

    await fillAndSubmit(user, testUser.username, TEST_PASSWORD);

    expect(await screen.findByRole('heading', { name: testUser.displayName! })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/profile');
  });

  it('says so when the credentials are wrong, and lets the user try again', async () => {
    const { user } = await renderLogin();

    await fillAndSubmit(user, testUser.username, 'wrong-password');

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid username or password.');
    expect(screen.getByRole('button', { name: 'Log in' })).toBeEnabled();
    expect(screen.getByTestId('location')).toHaveTextContent('/login');
  });

  it.each([
    [429, 'Too many attempts. Please wait a while and try again.'],
    [500, 'Something went wrong on the server. Please try again.'],
  ])('explains a %i response', async (status, message) => {
    server.use(
      http.post(api('/auth/login'), () => HttpResponse.json({ message: 'x' }, { status })),
    );
    const { user } = await renderLogin();

    await fillAndSubmit(user, 'alice', 'whatever');

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
  });

  it('shows field errors from the API', async () => {
    server.use(
      http.post(api('/auth/login'), () =>
        HttpResponse.json(
          {
            message: 'Validation failed',
            details: { 'body.username': { message: 'Please provide a valid username' } },
          },
          { status: 422 },
        ),
      ),
    );
    const { user } = await renderLogin();

    await fillAndSubmit(user, 'alice', 'whatever');

    expect(await screen.findByText('Please provide a valid username')).toBeInTheDocument();
  });

  it('links to the register page', async () => {
    const { user } = await renderLogin();

    await user.click(screen.getByRole('link', { name: 'Register' }));

    expect(await screen.findByRole('heading', { name: 'Register' })).toBeInTheDocument();
  });
});

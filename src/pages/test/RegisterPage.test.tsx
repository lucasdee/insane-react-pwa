import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { AppRoutes } from '../../App';
import { server } from '../../test/server';
import { api } from '../../test/handlers';
import { renderWithProviders } from '../../test/renderWithProviders';
import type { RegisterRequest } from '../../api/types';

type Values = Partial<
  Record<'username' | 'email' | 'displayName' | 'password' | 'confirm', string>
>;

const VALID: Values = {
  username: 'newbie',
  email: 'newbie@example.com',
  password: 'secret123',
  confirm: 'secret123',
};

const labels = {
  username: 'Username',
  email: 'Email',
  displayName: 'Display name (optional)',
  password: 'Password',
  confirm: 'Confirm password',
} as const;

const renderRegister = async () => {
  const result = renderWithProviders(<AppRoutes />, { route: '/register' });
  await screen.findByRole('heading', { name: 'Register' });
  return result;
};

const fillAndSubmit = async (
  user: Awaited<ReturnType<typeof renderRegister>>['user'],
  values: Values,
) => {
  for (const [field, value] of Object.entries(values)) {
    if (value) await user.type(screen.getByLabelText(labels[field as keyof Values]), value);
  }
  await user.click(screen.getByRole('button', { name: 'Create account' }));
};

/** Records the bodies posted to /auth/register, answering with `respond` if given. */
const captureRegister = (respond?: () => Response) => {
  const bodies: RegisterRequest[] = [];
  server.use(
    http.post(api('/auth/register'), async ({ request }) => {
      bodies.push((await request.clone().json()) as RegisterRequest);
      return respond ? respond() : undefined;
    }),
  );
  return bodies;
};

describe('RegisterPage', () => {
  it('checks every field before sending anything', async () => {
    const bodies = captureRegister();
    const { user } = await renderRegister();

    await fillAndSubmit(user, { username: 'ab', email: 'nope', password: '123', confirm: '1234' });

    expect(screen.getByText(/username that is at least 3/)).toBeInTheDocument();
    expect(screen.getByText('Please provide a valid email address')).toBeInTheDocument();
    expect(screen.getByText(/password that is at least 6/)).toBeInTheDocument();
    expect(screen.getByText('The passwords do not match')).toBeInTheDocument();
    expect(bodies).toHaveLength(0);
  });

  it('creates the account, signs in and shows the profile', async () => {
    const bodies = captureRegister();
    const { user } = await renderRegister();

    await fillAndSubmit(user, { ...VALID, displayName: '  New Bie  ' });

    expect(await screen.findByRole('heading', { name: 'New Bie' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/profile');
    expect(bodies).toEqual([
      {
        username: 'newbie',
        email: 'newbie@example.com',
        password: 'secret123',
        displayName: 'New Bie',
      },
    ]);
  });

  it('leaves out an empty display name', async () => {
    const bodies = captureRegister();
    const { user } = await renderRegister();

    await fillAndSubmit(user, VALID);

    expect(await screen.findByRole('heading', { name: 'newbie' })).toBeInTheDocument();
    expect(bodies[0]).not.toHaveProperty('displayName');
  });

  it('marks a taken username', async () => {
    captureRegister(() =>
      HttpResponse.json({ message: 'Username is already taken' }, { status: 409 }),
    );
    const { user } = await renderRegister();

    await fillAndSubmit(user, VALID);

    expect(await screen.findByText('This username is already taken')).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toHaveAttribute('aria-invalid', 'true');
  });

  it('marks an email address that is already registered', async () => {
    captureRegister(() =>
      HttpResponse.json(
        { message: 'A resource with the same unique value already exists' },
        { status: 409 },
      ),
    );
    const { user } = await renderRegister();

    await fillAndSubmit(user, VALID);

    expect(
      await screen.findByText('An account with this email address already exists'),
    ).toBeInTheDocument();
  });

  it('shows field errors from the API', async () => {
    captureRegister(() =>
      HttpResponse.json(
        {
          message: 'Validation failed',
          details: { 'body.email': { message: 'Please provide a valid email address' } },
        },
        { status: 422 },
      ),
    );
    const { user } = await renderRegister();

    await fillAndSubmit(user, VALID);

    expect(await screen.findByText('Please provide a valid email address')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows other errors above the form', async () => {
    captureRegister(() => HttpResponse.json({ message: 'Slow down' }, { status: 429 }));
    const { user } = await renderRegister();

    await fillAndSubmit(user, VALID);

    expect(await screen.findByRole('alert')).toHaveTextContent('Too many attempts');
    expect(screen.getByRole('button', { name: 'Create account' })).toBeEnabled();
  });

  it('links to the login page', async () => {
    const { user } = await renderRegister();

    await user.click(screen.getByRole('link', { name: 'Log in' }));

    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument();
  });
});

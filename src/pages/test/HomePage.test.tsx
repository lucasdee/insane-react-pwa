import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import HomePage from '../HomePage';
import { renderWithProviders } from '../../test/renderWithProviders';

describe('HomePage', () => {
  it('shows the app name and what it is for', () => {
    renderWithProviders(<HomePage />, { withoutAuth: true });

    expect(screen.getByRole('heading', { name: 'insane-react-pwa' })).toBeInTheDocument();
    expect(screen.getByText(/store & share notes/i)).toBeInTheDocument();
  });

  it.each([
    ['Log in', '/login'],
    ['Register', '/register'],
  ])('the %s button goes to %s', async (name, path) => {
    const { user } = renderWithProviders(<HomePage />, { withoutAuth: true });

    await user.click(screen.getByRole('link', { name }));

    expect(screen.getByTestId('location')).toHaveTextContent(path);
  });
});

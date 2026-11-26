import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProfilePage from '../ProfilePage';
import { AuthContext, type AuthContextValue } from '../../auth/AuthContext';
import { testUser } from '../../test/handlers';
import type { User } from '../../api/types';

const renderProfile = (user: User | null) => {
  const value: AuthContextValue = {
    status: user ? 'authenticated' : 'anonymous',
    user,
    login: async () => {},
    register: async () => {},
    logout: async () => {},
  };
  return render(
    <AuthContext.Provider value={value}>
      <ProfilePage />
    </AuthContext.Provider>,
  );
};

/** The value shown under a label of the details list. */
const valueOf = (label: string) => screen.getByText(label).nextElementSibling;

describe('ProfilePage', () => {
  it("shows the user's account details", () => {
    renderProfile(testUser);

    expect(screen.getByRole('heading', { name: 'Alice Liddell' })).toBeInTheDocument();
    expect(screen.getByText('@alice')).toBeInTheDocument();
    expect(valueOf('Email')).toHaveTextContent('alice@example.com');
    expect(valueOf('Role')).toHaveTextContent('USER');
    expect(valueOf('Member since')).toHaveTextContent('2026');
    expect(valueOf('User ID')).toHaveTextContent(testUser.uuid);
  });

  it('uses the username when there is no display name', () => {
    renderProfile({ ...testUser, displayName: null, username: 'bob' });

    expect(screen.getByRole('heading', { name: 'bob' })).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('renders nothing without a user', () => {
    const { container } = renderProfile(null);

    expect(container).toBeEmptyDOMElement();
  });
});

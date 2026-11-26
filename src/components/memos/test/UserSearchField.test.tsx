import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import UserSearchField from '../UserSearchField';
import { server } from '../../../test/server';
import { api, mockApi, otherUsers } from '../../../test/handlers';
import { renderWithProviders } from '../../../test/renderWithProviders';
import type { UserSummary } from '../../../api/types';

const [bob, carol] = otherUsers;

const Harness = ({ onChange = () => {} }: { onChange?: (user: UserSummary | null) => void }) => {
  const [user, setUser] = useState<UserSummary | null>(null);
  return (
    <>
      <UserSearchField
        value={user}
        onChange={(next) => {
          setUser(next);
          onChange(next);
        }}
      />
      <p>picked: {user?.username ?? 'nobody'}</p>
    </>
  );
};

const input = () => screen.getByRole('combobox', { name: 'User' });

beforeEach(() => {
  mockApi.session = true;
});

describe('UserSearchField', () => {
  it('asks for input before searching', async () => {
    const { user } = renderWithProviders(<Harness />, { withoutAuth: true });

    await user.click(input());

    expect(screen.getByText('Type a username or display name')).toBeInTheDocument();
  });

  it('searches as you type and lists matches with their display names', async () => {
    const searches: string[] = [];
    server.use(
      http.get(api('/users'), ({ request }) => {
        searches.push(new URL(request.url).searchParams.get('search')!);
        return HttpResponse.json([bob]);
      }),
    );
    const { user } = renderWithProviders(<Harness />, { withoutAuth: true });

    await user.type(input(), 'bob');

    expect(await screen.findByRole('option', { name: 'Bob Builder (@bob)' })).toBeInTheDocument();
    expect(searches).toEqual(['bob']);
  });

  it('shows the username alone for users without a display name', async () => {
    const { user } = renderWithProviders(<Harness />, { withoutAuth: true });

    await user.type(input(), 'car');

    expect(await screen.findByRole('option', { name: '@carol' })).toBeInTheDocument();
  });

  it('says when nobody matches', async () => {
    const { user } = renderWithProviders(<Harness />, { withoutAuth: true });

    await user.type(input(), 'zzz');

    expect(await screen.findByText('No users found')).toBeInTheDocument();
  });

  it('shows that it is searching while waiting', async () => {
    const { user } = renderWithProviders(<Harness />, { withoutAuth: true });

    await user.type(input(), 'bo');

    expect(screen.getByText('Searching…')).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: 'Bob Builder (@bob)' })).toBeInTheDocument();
  });

  it('picks a user, and unpicks them when the text is edited', async () => {
    const onChange = vi.fn();
    const { user } = renderWithProviders(<Harness onChange={onChange} />, { withoutAuth: true });

    await user.type(input(), 'car');
    await user.click(await screen.findByRole('option', { name: '@carol' }));

    expect(onChange).toHaveBeenLastCalledWith(carol);
    expect(input()).toHaveValue('@carol');
    expect(screen.getByText('picked: carol')).toBeInTheDocument();

    await user.type(input(), 'x');

    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(screen.getByText('picked: nobody')).toBeInTheDocument();
  });

  it('shows an error instead of the hint', () => {
    renderWithProviders(<UserSearchField value={null} onChange={() => {}} error='Pick one' />, {
      withoutAuth: true,
    });

    expect(screen.getByText('Pick one')).toBeInTheDocument();
    expect(screen.queryByText('Search by username or display name')).not.toBeInTheDocument();
  });
});

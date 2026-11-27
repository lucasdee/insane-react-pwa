import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import MemoCard from '../MemoCard';
import type { MemoListItem, Role } from '../../../api/types';

const item = (role: Role, tags = ['home', 'work']): MemoListItem => ({
  memoUuid: 'm-1',
  userUuid: 'u-1',
  assignedByUuid: 'u-1',
  assignedAt: '2026-02-01T00:00:00.000Z',
  role,
  memo: {
    uuid: 'm-1',
    title: 'Groceries',
    content: 'Milk\nEggs',
    authorUuid: 'u-1',
    authorUsername: 'alice',
    authorDisplayName: 'Alice',
    createdAt: '2026-02-01T00:00:00.000Z',
    tags,
  },
});

const renderCard = (memo: MemoListItem, currentUserUuid = 'u-1') => {
  const onEditTags = vi.fn();
  const onAssign = vi.fn();
  const onDelete = vi.fn();
  render(
    <MemoryRouter>
      <MemoCard
        item={memo}
        currentUserUuid={currentUserUuid}
        onEditTags={onEditTags}
        onAssign={onAssign}
        onDelete={onDelete}
      />
    </MemoryRouter>,
  );
  return {
    onEditTags,
    onAssign,
    onDelete,
    card: screen.getByRole('article', { name: 'Groceries' }),
  };
};

describe('MemoCard', () => {
  it('shows the memo, its tags and the user’s role on it', () => {
    const { card } = renderCard(item('USER'));

    expect(within(card).getByRole('heading', { name: 'Groceries' })).toBeInTheDocument();
    expect(within(card).getByText(/Milk\s+Eggs/)).toBeInTheDocument();
    expect(within(card).getByText('Your role: USER')).toBeInTheDocument();
    expect(within(card).getByText(/2026/)).toBeInTheDocument();
    const tags = within(card).getByRole('list', { name: 'Tags' });
    expect(
      within(tags)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['home', 'work']);
  });

  it('tells the user they wrote the memo', () => {
    const { card } = renderCard(item('ADMIN'));

    expect(within(card).getByText('You’re the author')).toBeInTheDocument();
    expect(within(card).queryByText(/^By /)).not.toBeInTheDocument();
  });

  it('names the author of someone else’s memo', () => {
    const { card } = renderCard(item('USER'), 'u-2');

    expect(within(card).getByText('By Alice (@alice)')).toBeInTheDocument();
    expect(within(card).queryByText('You’re the author')).not.toBeInTheDocument();
  });

  it('shows no tag list for a memo without tags', () => {
    const { card } = renderCard(item('USER', []));

    expect(within(card).queryByRole('list', { name: 'Tags' })).not.toBeInTheDocument();
  });

  it('links the title to the memo', () => {
    const { card } = renderCard(item('USER'), 'u-2');

    expect(within(card).getByRole('link', { name: 'Groceries' })).toHaveAttribute(
      'href',
      '/memos/m-1',
    );
  });

  it.each<[Role, boolean, boolean, boolean, boolean]>([
    ['ADMIN', false, true, true, true],
    ['MOD', false, true, true, false],
    ['USER', false, false, false, false],
    ['USER', true, true, false, true],
    ['MOD', true, true, true, true],
  ])(
    'a memo %s (author: %s) sees Edit and Edit tags: %s, Assign: %s, Delete: %s',
    (role, author, edit, assign, remove) => {
      const { card } = renderCard(item(role), author ? 'u-1' : 'u-2');

      expect(!!within(card).queryByRole('link', { name: 'Edit' })).toBe(edit);
      expect(!!within(card).queryByRole('button', { name: 'Edit tags' })).toBe(edit);
      expect(!!within(card).queryByRole('button', { name: 'Assign' })).toBe(assign);
      expect(!!within(card).queryByRole('button', { name: 'Delete' })).toBe(remove);
    },
  );

  it('links Edit to the memo', () => {
    const { card } = renderCard(item('MOD'), 'u-2');

    expect(within(card).getByRole('link', { name: 'Edit' })).toHaveAttribute('href', '/memos/m-1');
  });

  it('calls back with the memo from its actions', async () => {
    const user = userEvent.setup();
    const memo = item('ADMIN');
    const { card, onEditTags, onAssign, onDelete } = renderCard(memo);

    await user.click(within(card).getByRole('button', { name: 'Edit tags' }));
    await user.click(within(card).getByRole('button', { name: 'Assign' }));
    await user.click(within(card).getByRole('button', { name: 'Delete' }));

    expect(onEditTags).toHaveBeenCalledWith(memo);
    expect(onAssign).toHaveBeenCalledWith(memo);
    expect(onDelete).toHaveBeenCalledWith(memo);
  });
});

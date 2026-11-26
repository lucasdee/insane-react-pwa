import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    createdAt: '2026-02-01T00:00:00.000Z',
    tags,
  },
});

const renderCard = (memo: MemoListItem) => {
  const onEditTags = vi.fn();
  const onAssign = vi.fn();
  render(<MemoCard item={memo} onEditTags={onEditTags} onAssign={onAssign} />);
  return { onEditTags, onAssign, card: screen.getByRole('article', { name: 'Groceries' }) };
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

  it('shows no tag list for a memo without tags', () => {
    const { card } = renderCard(item('USER', []));

    expect(within(card).queryByRole('list', { name: 'Tags' })).not.toBeInTheDocument();
  });

  it.each<[Role, boolean, boolean]>([
    ['ADMIN', true, true],
    ['MOD', true, true],
    ['USER', false, false],
  ])('a memo %s sees Edit tags: %s, Assign: %s', (role, editTags, assign) => {
    const { card } = renderCard(item(role));

    expect(!!within(card).queryByRole('button', { name: 'Edit tags' })).toBe(editTags);
    expect(!!within(card).queryByRole('button', { name: 'Assign' })).toBe(assign);
  });

  it('calls back with the memo from its actions', async () => {
    const user = userEvent.setup();
    const memo = item('ADMIN');
    const { card, onEditTags, onAssign } = renderCard(memo);

    await user.click(within(card).getByRole('button', { name: 'Edit tags' }));
    await user.click(within(card).getByRole('button', { name: 'Assign' }));

    expect(onEditTags).toHaveBeenCalledWith(memo);
    expect(onAssign).toHaveBeenCalledWith(memo);
  });
});

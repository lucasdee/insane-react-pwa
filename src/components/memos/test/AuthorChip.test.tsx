import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import AuthorChip from '../AuthorChip';
import type { Memo } from '../../../api/types';

const memo: Memo = {
  uuid: 'm-1',
  title: 'Groceries',
  content: 'Milk',
  authorUuid: 'u-1',
  authorUsername: 'carol',
  authorDisplayName: null,
  createdAt: '2026-02-01T00:00:00.000Z',
  tags: [],
};

describe('AuthorChip', () => {
  it('tells the author it is their memo', () => {
    render(<AuthorChip memo={memo} currentUserUuid='u-1' />);

    expect(screen.getByText('You’re the author')).toBeInTheDocument();
  });

  it('names the author to anyone else', () => {
    render(<AuthorChip memo={memo} currentUserUuid='u-2' />);

    expect(screen.getByText('By @carol')).toBeInTheDocument();
  });

  it('names the author while the signed-in user is unknown', () => {
    render(<AuthorChip memo={memo} currentUserUuid={undefined} />);

    expect(screen.getByText('By @carol')).toBeInTheDocument();
  });
});

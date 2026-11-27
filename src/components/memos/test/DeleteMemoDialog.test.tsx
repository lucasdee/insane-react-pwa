import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import DeleteMemoDialog from '../DeleteMemoDialog';
import { server } from '../../../test/server';
import { api, authoredBy, mockApi, otherUsers, seedMemo } from '../../../test/handlers';
import { renderWithProviders } from '../../../test/renderWithProviders';
import type { Memo } from '../../../api/types';

beforeEach(() => {
  mockApi.session = true;
});

const renderDialog = (memo: Memo | null) => {
  const onClose = vi.fn();
  const onDeleted = vi.fn();
  const result = renderWithProviders(
    <DeleteMemoDialog memo={memo} onClose={onClose} onDeleted={onDeleted} />,
    { withoutAuth: true },
  );
  return { ...result, onClose, onDeleted };
};

const dialog = () => screen.getByRole('dialog');
const confirm = () => within(dialog()).getByRole('button', { name: 'Delete' });

describe('DeleteMemoDialog', () => {
  it('is closed without a memo', () => {
    renderDialog(null);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('asks before deleting, saying it can’t be undone', () => {
    const { memo } = seedMemo({ title: 'Groceries' });
    renderDialog(memo);

    expect(within(dialog()).getByRole('heading', { name: 'Delete “Groceries”?' })).toBeVisible();
    expect(within(dialog()).getByText(/for everyone it is shared with/)).toBeInTheDocument();
    expect(within(dialog()).getByText(/can’t be undone/)).toBeInTheDocument();
  });

  it('deletes the memo and reports it', async () => {
    const { memo } = seedMemo({ title: 'Groceries' });
    const { user, onDeleted } = renderDialog(memo);

    await user.click(confirm());

    await vi.waitFor(() => expect(onDeleted).toHaveBeenCalledWith(memo));
    expect(mockApi.memos).toEqual([]);
  });

  it('shows why the API refused, e.g. a 403', async () => {
    const { memo } = seedMemo({ role: 'MOD', ...authoredBy(otherUsers[0]) });
    const { user, onDeleted } = renderDialog(memo);

    await user.click(confirm());

    expect(await within(dialog()).findByRole('alert')).toHaveTextContent(
      "Only the memo's author and ADMINs can delete it",
    );
    expect(onDeleted).not.toHaveBeenCalled();
    expect(mockApi.memos).toHaveLength(1);
  });

  it('shows a network failure', async () => {
    server.use(http.delete(api('/memos/:memoUuid'), () => HttpResponse.error()));
    const { memo } = seedMemo();
    const { user } = renderDialog(memo);

    await user.click(confirm());

    expect(await within(dialog()).findByRole('alert')).toHaveTextContent('Cannot reach the server');
  });

  it('closes on Cancel without deleting', async () => {
    const { memo } = seedMemo();
    const { user, onClose, onDeleted } = renderDialog(memo);

    await user.click(within(dialog()).getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalled();
    expect(onDeleted).not.toHaveBeenCalled();
    expect(mockApi.memos).toHaveLength(1);
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import EditTagsDialog from '../EditTagsDialog';
import { server } from '../../../test/server';
import { api, mockApi, seedMemo } from '../../../test/handlers';
import { renderWithProviders } from '../../../test/renderWithProviders';
import type { Memo } from '../../../api/types';

beforeEach(() => {
  mockApi.session = true;
});

const renderDialog = (memo: Memo | null) => {
  const onClose = vi.fn();
  const onSaved = vi.fn();
  const result = renderWithProviders(
    <EditTagsDialog memo={memo} onClose={onClose} onSaved={onSaved} />,
    { withoutAuth: true },
  );
  return { ...result, onClose, onSaved };
};

const dialog = () => screen.getByRole('dialog');
const tagsInput = () => within(dialog()).getByRole('combobox', { name: 'Tags' });
const save = () => within(dialog()).getByRole('button', { name: 'Save tags' });

describe('EditTagsDialog', () => {
  it('is closed without a memo', () => {
    renderDialog(null);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('starts with the memo’s tags and saves the edited list', async () => {
    const { memo } = seedMemo({ title: 'Groceries', tags: ['home'] });
    const { user, onSaved } = renderDialog(memo);

    expect(within(dialog()).getByRole('heading', { name: /Groceries/ })).toBeInTheDocument();
    expect(within(dialog()).getByText('home')).toBeInTheDocument();
    await user.type(tagsInput(), 'Food{Enter}');
    await user.click(save());

    await vi.waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(onSaved.mock.calls[0][0]).toMatchObject({ uuid: memo.uuid, tags: ['food', 'home'] });
    expect(mockApi.memos[0].memo.tags).toEqual(['food', 'home']);
  });

  it('can remove every tag', async () => {
    const { memo } = seedMemo({ tags: ['home'] });
    const { user, onSaved } = renderDialog(memo);

    await user.click(within(dialog()).getByTestId('CancelIcon'));
    await user.click(save());

    await vi.waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(mockApi.memos[0].memo.tags).toEqual([]);
  });

  it('suggests the user’s existing tags', async () => {
    seedMemo({ tags: ['work'] });
    const { memo } = seedMemo({ tags: [] });
    const { user } = renderDialog(memo);

    await user.click(tagsInput());

    expect(await screen.findByRole('option', { name: 'work' })).toBeInTheDocument();
  });

  it('shows why the API refused, e.g. a 403', async () => {
    const { memo } = seedMemo({ tags: ['home'], role: 'USER' });
    const { user, onSaved } = renderDialog(memo);

    await user.click(save());

    expect(await within(dialog()).findByRole('alert')).toHaveTextContent(
      "Only the memo's ADMINs and MODs can change its tags",
    );
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('shows a 422 about the tags on the field', async () => {
    const { memo } = seedMemo({ tags: ['home'] });
    server.use(
      http.put(api('/memos/:memoUuid/tags'), () =>
        HttpResponse.json(
          { message: 'Validation failed', details: { 'body.tags.$0': { message: 'Bad tag' } } },
          { status: 422 },
        ),
      ),
    );
    const { user } = renderDialog(memo);

    await user.click(save());

    expect(await within(dialog()).findByText('Bad tag')).toBeInTheDocument();
    expect(within(dialog()).queryByRole('alert')).not.toBeInTheDocument();
  });

  it('closes on Cancel', async () => {
    const { memo } = seedMemo();
    const { user, onClose } = renderDialog(memo);

    await user.click(within(dialog()).getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalled();
  });
});

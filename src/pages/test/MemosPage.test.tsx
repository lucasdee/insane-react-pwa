import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { AppRoutes } from '../../App';
import { server } from '../../test/server';
import { api, authoredBy, mockApi, otherUsers, seedMemo } from '../../test/handlers';
import { renderWithProviders } from '../../test/renderWithProviders';

beforeEach(() => {
  mockApi.session = true;
});

const renderMemos = (route: Parameters<typeof renderWithProviders>[1] = {}) =>
  renderWithProviders(<AppRoutes />, { route: '/memos', ...route });

const card = (title: string) => screen.getByRole('article', { name: title });

/** Waits until no dialog is open (MUI animates closing). */
const waitForNoDialog = () =>
  waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

describe('MemosPage', () => {
  it('shows a spinner, then the memos newest first', async () => {
    seedMemo({ title: 'Older', createdAt: '2026-01-01T00:00:00.000Z' });
    seedMemo({ title: 'Newer', createdAt: '2026-05-01T00:00:00.000Z' });
    renderMemos();

    expect(await screen.findByRole('progressbar', { name: 'Loading memos' })).toBeInTheDocument();
    await screen.findByRole('article', { name: 'Newer' });
    expect(screen.getAllByRole('article').map((a) => a.getAttribute('aria-labelledby'))).toEqual(
      mockApi.memos.map((m) => `memo-title-${m.memo.uuid}`).reverse(),
    );
  });

  it('offers creating a memo when there are none', async () => {
    const { user } = renderMemos();

    expect(await screen.findByText('No memos yet')).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Create your first memo' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/memos/new');
  });

  it('links to the new memo page', async () => {
    const { user } = renderMemos();
    await screen.findByText('No memos yet');

    await user.click(screen.getByRole('link', { name: 'New memo' }));

    expect(await screen.findByRole('heading', { name: 'New memo' })).toBeInTheDocument();
  });

  it('shows an error with a retry button when loading fails', async () => {
    let fail = true;
    server.use(
      http.get(api('/memos'), () =>
        fail ? HttpResponse.json({ message: 'Down' }, { status: 503 }) : undefined,
      ),
    );
    seedMemo({ title: 'Back again' });
    const { user } = renderMemos();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not load your memos. Something went wrong on the server.',
    );
    fail = false;
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByRole('article', { name: 'Back again' })).toBeInTheDocument();
  });

  it('marks the user’s own memos and names the author of the others', async () => {
    seedMemo({ title: 'Mine' });
    seedMemo({ title: 'From Bob', role: 'MOD', ...authoredBy(otherUsers[0]) });
    renderMemos();
    await screen.findByRole('article', { name: 'Mine' });

    expect(within(card('Mine')).getByText('You’re the author')).toBeInTheDocument();
    expect(within(card('From Bob')).getByText('By Bob Builder (@bob)')).toBeInTheDocument();
    expect(within(card('From Bob')).queryByText('You’re the author')).not.toBeInTheDocument();
  });

  it('only offers the actions each memo’s role allows', async () => {
    seedMemo({ title: 'Mine', role: 'ADMIN' });
    seedMemo({ title: 'Shared with me', role: 'USER' });
    renderMemos();
    await screen.findByRole('article', { name: 'Mine' });

    expect(within(card('Mine')).getByRole('button', { name: 'Edit tags' })).toBeInTheDocument();
    expect(within(card('Mine')).getByRole('button', { name: 'Assign' })).toBeInTheDocument();
    expect(within(card('Shared with me')).queryByRole('button')).not.toBeInTheDocument();
  });

  it('edits tags in a dialog and shows the saved tags', async () => {
    seedMemo({ title: 'Groceries', tags: ['home'] });
    const { user } = renderMemos();
    await screen.findByRole('article', { name: 'Groceries' });

    await user.click(within(card('Groceries')).getByRole('button', { name: 'Edit tags' }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByRole('combobox', { name: 'Tags' }), 'food{Enter}');
    await user.click(within(dialog).getByRole('button', { name: 'Save tags' }));

    expect(await screen.findByText('Tags saved')).toBeInTheDocument();
    await waitForNoDialog();
    const tags = await within(card('Groceries')).findByRole('list', { name: 'Tags' });
    await within(tags).findByText('food');
    expect(
      within(tags)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['food', 'home']);
  });

  it('closes the tags dialog on Cancel without saving', async () => {
    seedMemo({ title: 'Groceries', tags: ['home'] });
    const { user } = renderMemos();
    await screen.findByRole('article', { name: 'Groceries' });

    await user.click(within(card('Groceries')).getByRole('button', { name: 'Edit tags' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));

    await waitForNoDialog();
    expect(mockApi.memos[0].memo.tags).toEqual(['home']);
  });

  it('assigns a memo in a dialog and confirms it', async () => {
    const entry = seedMemo({ title: 'Plan' });
    const { user } = renderMemos();
    await screen.findByRole('article', { name: 'Plan' });

    await user.click(within(card('Plan')).getByRole('button', { name: 'Assign' }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByRole('combobox', { name: 'User' }), 'bob');
    await user.click(await screen.findByRole('option', { name: 'Bob Builder (@bob)' }));
    await user.click(within(dialog).getByRole('button', { name: 'Assign' }));

    expect(await screen.findByText('Assigned to Bob Builder (@bob) as USER')).toBeInTheDocument();
    expect(entry.assignees).toHaveLength(1);
    await waitForNoDialog();
  });

  it('closes the assign dialog on Cancel', async () => {
    seedMemo({ title: 'Plan' });
    const { user } = renderMemos();
    await screen.findByRole('article', { name: 'Plan' });

    await user.click(within(card('Plan')).getByRole('button', { name: 'Assign' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));

    await waitForNoDialog();
  });

  it('opens "New memo" while a message is showing', async () => {
    const { user } = renderMemos({
      route: { pathname: '/memos', state: { notice: 'Created “Plan”' } },
    });
    expect(await screen.findByText('Created “Plan”')).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'New memo' }));

    expect(await screen.findByRole('heading', { name: 'New memo' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/memos/new');
  });

  it('keeps a message when the user clicks elsewhere', async () => {
    seedMemo({ title: 'Plan' });
    const { user } = renderMemos({
      route: { pathname: '/memos', state: { notice: 'Created “Plan”' } },
    });
    await screen.findByRole('article', { name: 'Plan' });

    await user.click(screen.getByRole('heading', { name: 'My memos' }));

    expect(screen.getByText('Created “Plan”')).toBeInTheDocument();
  });

  it('shows a message passed in by another page, then forgets it', async () => {
    const { user } = renderMemos({
      route: { pathname: '/memos', state: { notice: 'Created “Plan”' } },
    });

    expect(await screen.findByText('Created “Plan”')).toBeInTheDocument();
    // Escape closes the snackbar (its onClose with reason "escapeKeyDown").
    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByText('Created “Plan”')).not.toBeInTheDocument());
    expect(screen.getByTestId('location')).toHaveTextContent('/memos');
  });
});

import { beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { AppRoutes } from '../../App';
import { server } from '../../test/server';
import { api, authoredBy, mockApi, otherUsers, seedMemo, type MockMemo } from '../../test/handlers';
import { renderWithProviders } from '../../test/renderWithProviders';
import type { MemoUpdateRequest } from '../../api/types';

beforeEach(() => {
  mockApi.session = true;
});

const bob = otherUsers[0];

const renderEditor = (memoUuid: string) =>
  renderWithProviders(<AppRoutes />, { route: `/memos/${memoUuid}` });

/** Renders the editor for `entry` and waits until its form is shown. */
const openEditor = async (entry: MockMemo) => {
  const result = renderEditor(entry.memo.uuid);
  await screen.findByRole('heading', { name: 'Edit memo' });
  return result;
};

const save = (user: ReturnType<typeof renderEditor>['user']) =>
  user.click(screen.getByRole('button', { name: 'Save changes' }));

/** Records the bodies patched to /memos/:memoUuid; the default handler still answers. */
const capturePatch = () => {
  const bodies: MemoUpdateRequest[] = [];
  server.use(
    http.patch(api('/memos/:memoUuid'), async ({ request }) => {
      bodies.push((await request.clone().json()) as MemoUpdateRequest);
      return undefined;
    }),
  );
  return bodies;
};

describe('MemoEditorPage', () => {
  it('shows a spinner, then the memo in a form for its author', async () => {
    const entry = seedMemo({ title: 'Groceries', content: 'Milk', tags: ['home'] });
    renderEditor(entry.memo.uuid);

    expect(await screen.findByRole('progressbar', { name: 'Loading memo' })).toBeInTheDocument();
    await screen.findByRole('heading', { name: 'Edit memo' });
    expect(screen.getByLabelText('Title')).toHaveValue('Groceries');
    expect(screen.getByLabelText('Content')).toHaveValue('Milk');
    expect(screen.getByText('home')).toBeInTheDocument();
    expect(screen.getByText('You’re the author')).toBeInTheDocument();
    expect(screen.getByText('Your role: ADMIN')).toBeInTheDocument();
  });

  it('saves the changes and returns to the list with a confirmation', async () => {
    const bodies = capturePatch();
    const entry = seedMemo({ title: 'Groceries', content: 'Milk', tags: ['home'] });
    const { user } = await openEditor(entry);

    await user.clear(screen.getByLabelText('Title'));
    await user.type(screen.getByLabelText('Title'), '  Shopping ');
    await user.type(screen.getByLabelText('Content'), ', eggs');
    await user.type(screen.getByRole('combobox', { name: 'Tags' }), 'Food{Enter}');
    await save(user);

    expect(await screen.findByText('Saved “Shopping”')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/memos$/);
    expect(await screen.findByRole('article', { name: 'Shopping' })).toBeInTheDocument();
    expect(bodies).toEqual([{ title: 'Shopping', content: 'Milk, eggs', tags: ['home', 'food'] }]);
    expect(entry.memo).toMatchObject({ title: 'Shopping', tags: ['food', 'home'] });
  });

  it.each(['MOD', 'ADMIN'] as const)(
    'lets a %s edit someone else’s memo, naming its author',
    async (role) => {
      const entry = seedMemo({ title: 'Plan', content: 'Steps', role, ...authoredBy(bob) });
      const { user } = await openEditor(entry);

      expect(screen.getByText('By Bob Builder (@bob)')).toBeInTheDocument();
      await user.type(screen.getByLabelText('Content'), ' and more');
      await save(user);

      expect(await screen.findByText('Saved “Plan”')).toBeInTheDocument();
      expect(entry.memo).toMatchObject({ content: 'Steps and more', ...authoredBy(bob) });
    },
  );

  it('shows a USER someone else’s memo read-only', async () => {
    const entry = seedMemo({
      title: 'Plan',
      content: 'Line one\nLine two',
      tags: ['work'],
      role: 'USER',
      ...authoredBy(bob),
    });
    renderEditor(entry.memo.uuid);

    expect(await screen.findByRole('heading', { name: 'Plan' })).toBeInTheDocument();
    expect(screen.getByText('By Bob Builder (@bob)')).toBeInTheDocument();
    expect(screen.getByText('Your role: USER')).toBeInTheDocument();
    expect(screen.getByText(/Only its author, MODs and ADMINs can edit it/)).toBeInTheDocument();
    expect(screen.getByText(/Line one\s+Line two/)).toBeInTheDocument();
    const tags = screen.getByRole('list', { name: 'Tags' });
    expect(within(tags).getByText('work')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument();
  });

  it('lets the author edit even with the USER role on the memo', async () => {
    const entry = seedMemo({ title: 'Mine', role: 'USER' });

    await openEditor(entry);

    expect(screen.getByLabelText('Title')).toHaveValue('Mine');
  });

  it('checks the fields before sending anything', async () => {
    const bodies = capturePatch();
    const entry = seedMemo({ title: 'Groceries' });
    const { user } = await openEditor(entry);

    await user.clear(screen.getByLabelText('Title'));
    await save(user);

    expect(screen.getByText(/title that is at least 3/)).toBeInTheDocument();
    expect(bodies).toEqual([]);
  });

  it('shows field errors from the API', async () => {
    server.use(
      http.patch(api('/memos/:memoUuid'), () =>
        HttpResponse.json(
          { message: 'Validation failed', details: { 'body.content': { message: 'Too long' } } },
          { status: 422 },
        ),
      ),
    );
    const entry = seedMemo({ title: 'Groceries' });
    const { user } = await openEditor(entry);

    await save(user);

    expect(await screen.findByText('Too long')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent(`/memos/${entry.memo.uuid}`);
  });

  it('shows why the API refused to save, e.g. a 403', async () => {
    server.use(
      http.patch(api('/memos/:memoUuid'), () =>
        HttpResponse.json({ message: 'You may not edit this' }, { status: 403 }),
      ),
    );
    const entry = seedMemo({ title: 'Groceries' });
    const { user } = await openEditor(entry);

    await save(user);

    expect(await screen.findByRole('alert')).toHaveTextContent('You may not edit this');
  });

  it('says so when the memo does not exist or is not shared with the user', async () => {
    renderEditor('00000000-0000-4000-8000-999999999999');

    expect(
      await screen.findByText('This memo doesn’t exist, or you don’t have access to it.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('shows other load errors with a retry button', async () => {
    let fail = true;
    server.use(
      http.get(api('/memos/:memoUuid'), () =>
        fail ? HttpResponse.json({ message: 'Down' }, { status: 503 }) : undefined,
      ),
    );
    const entry = seedMemo({ title: 'Back again' });
    const { user } = renderEditor(entry.memo.uuid);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not load the memo. Something went wrong on the server.',
    );
    fail = false;
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByRole('heading', { name: 'Edit memo' })).toBeInTheDocument();
  });

  it('goes back to the list on Cancel without saving', async () => {
    const bodies = capturePatch();
    const entry = seedMemo({ title: 'Groceries' });
    const { user } = await openEditor(entry);

    await user.type(screen.getByLabelText('Title'), ' changed');
    await user.click(screen.getByRole('link', { name: 'Cancel' }));

    expect(await screen.findByRole('heading', { name: 'My memos' })).toBeInTheDocument();
    expect(bodies).toEqual([]);
    expect(entry.memo.title).toBe('Groceries');
  });

  it('links back to the list', async () => {
    const entry = seedMemo({ title: 'Groceries' });
    const { user } = await openEditor(entry);

    await user.click(screen.getByRole('link', { name: 'Back to memos' }));

    expect(await screen.findByRole('heading', { name: 'My memos' })).toBeInTheDocument();
  });
});

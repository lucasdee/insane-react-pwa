import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import MemoAssignees from '../MemoAssignees';
import { server } from '../../../test/server';
import {
  api,
  authoredBy,
  mockApi,
  otherUsers,
  seedMemo,
  testUser,
  type MockMemo,
} from '../../../test/handlers';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { formatDate } from '../../../utils/format';
import type { MemoListItem } from '../../../api/types';

beforeEach(() => {
  mockApi.session = true;
});

const [bob, carol] = otherUsers;

/** The memo as the editor page has it, with the signed-in user's role on it. */
const itemOf = ({ memo, role }: MockMemo): MemoListItem => ({
  memoUuid: memo.uuid,
  userUuid: testUser.uuid,
  assignedByUuid: memo.authorUuid,
  assignedAt: memo.createdAt,
  role,
  memo,
});

const renderAssignees = (entry: MockMemo) => {
  const onLeft = vi.fn();
  const result = renderWithProviders(<MemoAssignees item={itemOf(entry)} onLeft={onLeft} />);
  return { ...result, onLeft };
};

/** The assignee rows, once they are shown with the signed-in user known. */
const rows = async () => {
  const list = await screen.findByRole('list', { name: 'Assignees' });
  await within(list).findByText('You');
  return within(list).getAllByRole('listitem');
};

/** The row of the assignee labelled `label`. */
const row = (label: string) =>
  screen.getAllByRole('listitem').find((item) => within(item).queryByText(label))!;

const removeButton = (label: string) => screen.queryByRole('button', { name: `Remove ${label}` });

describe('MemoAssignees', () => {
  it('lists each assignee with their role and who assigned them', async () => {
    const entry = seedMemo({ title: 'Plan', role: 'MOD', ...authoredBy(bob) });
    entry.assignees.push({ userUuid: carol.uuid, role: 'USER' });
    renderAssignees(entry);

    expect(await rows()).toHaveLength(3);
    expect(screen.getByRole('heading', { name: 'Shared with' })).toBeInTheDocument();
    const date = formatDate(entry.memo.createdAt);

    const author = row('Bob Builder (@bob)');
    expect(within(author).getByText('Author')).toBeInTheDocument();
    expect(within(author).getByText('ADMIN')).toBeInTheDocument();
    expect(within(author).queryByText(/Assigned by/)).not.toBeInTheDocument();

    const me = row('Alice Liddell (@alice)');
    expect(within(me).getByText('You')).toBeInTheDocument();
    expect(within(me).getByText('MOD')).toBeInTheDocument();
    expect(within(me).getByText(`Assigned by Bob Builder (@bob) on ${date}`)).toBeInTheDocument();

    const other = row('@carol');
    expect(within(other).getByText('USER')).toBeInTheDocument();
    expect(within(other).getByText(`Assigned by you on ${date}`)).toBeInTheDocument();
  });

  it('offers an ADMIN Remove on everyone but the author, and Leave on their own row', async () => {
    const entry = seedMemo({ role: 'ADMIN', ...authoredBy(bob) });
    entry.assignees.push({ userUuid: carol.uuid, role: 'ADMIN', assignedByUuid: bob.uuid });
    renderAssignees(entry);
    await rows();

    expect(removeButton('@carol')).toBeInTheDocument();
    expect(removeButton('Bob Builder (@bob)')).not.toBeInTheDocument();
    expect(
      within(row('Alice Liddell (@alice)')).getByRole('button', { name: 'Leave' }),
    ).toBeVisible();
  });

  it('offers a MOD Remove only on USERs', async () => {
    const entry = seedMemo({ role: 'MOD', ...authoredBy(bob) });
    entry.assignees.push(
      { userUuid: carol.uuid, role: 'USER', assignedByUuid: bob.uuid },
      { userUuid: '44444444-4444-4444-8444-444444444444', role: 'MOD', assignedByUuid: bob.uuid },
    );
    renderAssignees(entry);
    await rows();

    expect(removeButton('@carol')).toBeInTheDocument();
    expect(removeButton('@unknown')).not.toBeInTheDocument();
  });

  it('offers a USER only Leave', async () => {
    const entry = seedMemo({ role: 'USER', ...authoredBy(bob) });
    entry.assignees.push({ userUuid: carol.uuid, role: 'USER', assignedByUuid: bob.uuid });
    renderAssignees(entry);
    await rows();

    expect(screen.queryByRole('button', { name: /^Remove/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Leave' })).toBeInTheDocument();
  });

  it('offers the author no Leave', async () => {
    const entry = seedMemo();
    entry.assignees.push({ userUuid: carol.uuid, role: 'USER' });
    renderAssignees(entry);
    await rows();

    expect(screen.queryByRole('button', { name: 'Leave' })).not.toBeInTheDocument();
    expect(removeButton('@carol')).toBeInTheDocument();
  });

  it('removes an assignee after confirming, and says so', async () => {
    const entry = seedMemo({ title: 'Plan' });
    entry.assignees.push({ userUuid: bob.uuid, role: 'MOD' });
    const { user } = renderAssignees(entry);
    await rows();

    await user.click(removeButton('Bob Builder (@bob)')!);
    const dialog = screen.getByRole('dialog');
    expect(
      within(dialog).getByRole('heading', { name: 'Remove Bob Builder (@bob)?' }),
    ).toBeVisible();
    expect(
      within(dialog).getByText('Bob Builder (@bob) will lose access to “Plan”.'),
    ).toBeVisible();
    await user.click(within(dialog).getByRole('button', { name: 'Remove' }));

    expect(await screen.findByText('Removed Bob Builder (@bob)')).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(1));
    expect(entry.assignees).toEqual([]);
  });

  it('keeps the assignee when removing is cancelled', async () => {
    const entry = seedMemo();
    entry.assignees.push({ userUuid: bob.uuid, role: 'USER' });
    const { user } = renderAssignees(entry);
    await rows();

    await user.click(removeButton('Bob Builder (@bob)')!);
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(entry.assignees).toHaveLength(1);
  });

  it('leaves the memo after confirming', async () => {
    const entry = seedMemo({ title: 'Plan', role: 'USER', ...authoredBy(bob) });
    const { user, onLeft } = renderAssignees(entry);
    await rows();

    await user.click(screen.getByRole('button', { name: 'Leave' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Leave “Plan”?' })).toBeVisible();
    expect(within(dialog).getByText(/no longer show up in your list/)).toBeVisible();
    await user.click(within(dialog).getByRole('button', { name: 'Leave' }));

    await waitFor(() => expect(onLeft).toHaveBeenCalledWith(entry.memo));
    expect(mockApi.memos).toEqual([]);
  });

  it('says so when the assignee was already removed, and refreshes the list', async () => {
    const entry = seedMemo();
    entry.assignees.push({ userUuid: bob.uuid, role: 'USER' });
    const { user } = renderAssignees(entry);
    await rows();
    entry.assignees = [];

    await user.click(removeButton('Bob Builder (@bob)')!);
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Remove' }));

    expect(
      await within(screen.getByRole('dialog')).findByText(
        'This user is no longer assigned to the memo.',
      ),
    ).toBeInTheDocument();
    // The open dialog hides the rest of the page from the accessibility tree.
    const list = screen.getByRole('list', { name: 'Assignees', hidden: true });
    await waitFor(() =>
      expect(within(list).queryByText('Bob Builder (@bob)')).not.toBeInTheDocument(),
    );
    expect(within(list).getAllByRole('listitem', { hidden: true })).toHaveLength(1);
  });

  it('shows why the API refused to remove someone', async () => {
    server.use(
      http.delete(api('/memos/:memoUuid/assignments/:userUuid'), () =>
        HttpResponse.json({ message: 'Not allowed' }, { status: 403 }),
      ),
    );
    const entry = seedMemo();
    entry.assignees.push({ userUuid: bob.uuid, role: 'USER' });
    const { user } = renderAssignees(entry);
    await rows();

    await user.click(removeButton('Bob Builder (@bob)')!);
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Remove' }));

    expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent(
      'Not allowed',
    );
    expect(entry.assignees).toHaveLength(1);
  });

  it('shows load errors with a retry button', async () => {
    let fail = true;
    server.use(
      http.get(api('/memos/:memoUuid/assignments'), () =>
        fail ? HttpResponse.json({ message: 'Down' }, { status: 503 }) : undefined,
      ),
    );
    const entry = seedMemo();
    const { user } = renderAssignees(entry);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not load who the memo is shared with.',
    );
    fail = false;
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await rows()).toHaveLength(1);
  });
});

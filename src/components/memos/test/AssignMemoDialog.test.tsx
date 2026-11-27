import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import AssignMemoDialog from '../AssignMemoDialog';
import { server } from '../../../test/server';
import { api, mockApi, otherUsers, seedMemo, type MockMemo } from '../../../test/handlers';
import { renderWithProviders } from '../../../test/renderWithProviders';
import type { MemoListItem, Role } from '../../../api/types';

const [bob] = otherUsers;

beforeEach(() => {
  mockApi.session = true;
});

const asItem = ({ memo, role }: MockMemo): MemoListItem => ({
  memoUuid: memo.uuid,
  userUuid: 'me',
  assignedByUuid: 'me',
  assignedAt: memo.createdAt,
  role,
  memo,
});

const renderDialog = (item: MemoListItem | null) => {
  const onClose = vi.fn();
  const onAssigned = vi.fn();
  const result = renderWithProviders(
    <AssignMemoDialog item={item} onClose={onClose} onAssigned={onAssigned} />,
    { withoutAuth: true },
  );
  return { ...result, onClose, onAssigned };
};

const dialog = () => screen.getByRole('dialog');

const pickBob = async (user: ReturnType<typeof renderDialog>['user']) => {
  await user.type(within(dialog()).getByRole('combobox', { name: 'User' }), 'bob');
  await user.click(await screen.findByRole('option', { name: 'Bob Builder (@bob)' }));
};

const chooseRole = async (user: ReturnType<typeof renderDialog>['user'], role: Role) => {
  await user.click(within(dialog()).getByRole('combobox', { name: 'Role' }));
  await user.click(screen.getByRole('option', { name: role }));
};

const submit = (user: ReturnType<typeof renderDialog>['user']) =>
  user.click(within(dialog()).getByRole('button', { name: 'Assign' }));

describe('AssignMemoDialog', () => {
  it('is closed without a memo', () => {
    renderDialog(null);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it.each<[Role, Role[]]>([
    ['ADMIN', ['USER', 'MOD', 'ADMIN']],
    ['MOD', ['USER']],
  ])('a memo %s can give the roles %j', async (role, roles) => {
    const { user } = renderDialog(asItem(seedMemo({ role })));

    await user.click(within(dialog()).getByRole('combobox', { name: 'Role' }));

    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(roles);
  });

  it('asks to choose a user first', async () => {
    const { user, onAssigned } = renderDialog(asItem(seedMemo({ title: 'Plan' })));

    expect(within(dialog()).getByRole('heading', { name: /Plan/ })).toBeInTheDocument();
    await submit(user);

    expect(within(dialog()).getByText('Please choose a user')).toBeInTheDocument();
    expect(onAssigned).not.toHaveBeenCalled();
  });

  it('assigns the chosen user as USER by default', async () => {
    const entry = seedMemo();
    const { user, onAssigned } = renderDialog(asItem(entry));

    expect(within(dialog()).getByText('Can read the memo')).toBeInTheDocument();
    await pickBob(user);
    await submit(user);

    await vi.waitFor(() => expect(onAssigned).toHaveBeenCalledWith(bob, 'USER'));
    expect(entry.assignees).toEqual([{ userUuid: bob.uuid, role: 'USER' }]);
  });

  it('assigns with another role an ADMIN chooses', async () => {
    const entry = seedMemo({ role: 'ADMIN' });
    const { user, onAssigned } = renderDialog(asItem(entry));

    await pickBob(user);
    await chooseRole(user, 'MOD');
    expect(
      within(dialog()).getByText('Can also edit the memo and assign users'),
    ).toBeInTheDocument();
    await submit(user);

    await vi.waitFor(() => expect(onAssigned).toHaveBeenCalledWith(bob, 'MOD'));
    expect(entry.assignees).toEqual([{ userUuid: bob.uuid, role: 'MOD' }]);
  });

  it('says when the user is already assigned', async () => {
    const entry = seedMemo();
    entry.assignees.push({ userUuid: bob.uuid, role: 'USER' });
    const { user, onAssigned } = renderDialog(asItem(entry));

    await pickBob(user);
    await submit(user);

    expect(await within(dialog()).findByRole('alert')).toHaveTextContent(
      'Bob Builder (@bob) is already assigned to this memo.',
    );
    expect(onAssigned).not.toHaveBeenCalled();
  });

  it.each([
    [404, { message: 'User not found' }, 'This user no longer exists.'],
    [
      403,
      { message: "Only the memo's ADMINs can assign the MOD role" },
      "Only the memo's ADMINs can assign the MOD role",
    ],
  ])('explains a %i', async (status, body, message) => {
    server.use(http.post(api('/memos/assign'), () => HttpResponse.json(body, { status })));
    const { user } = renderDialog(asItem(seedMemo()));

    await pickBob(user);
    await submit(user);

    expect(await within(dialog()).findByRole('alert')).toHaveTextContent(message);
  });

  it('clears the user error once a user is chosen', async () => {
    const { user } = renderDialog(asItem(seedMemo()));

    await submit(user);
    await pickBob(user);

    expect(within(dialog()).queryByText('Please choose a user')).not.toBeInTheDocument();
  });

  it('closes on Cancel', async () => {
    const { user, onClose } = renderDialog(asItem(seedMemo()));

    await user.click(within(dialog()).getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalled();
  });
});

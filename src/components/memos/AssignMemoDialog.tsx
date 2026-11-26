import { useState, type FC, type FormEvent } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import UserSearchField from './UserSearchField';
import { useAssignMemo } from '../../hooks/useMemos';
import { errorMessage, hasStatus } from '../../api/errors';
import { assignableRoles, roleDescriptions } from '../../utils/permissions';
import { userLabel } from '../../utils/format';
import type { MemoListItem, Role, UserSummary } from '../../api/types';

type Props = {
  /** The memo to assign, with the signed-in user's role on it; open while set. */
  item: MemoListItem | null;
  onClose: () => void;
  onAssigned: (user: UserSummary, role: Role) => void;
};

/** Gives another user access to a memo, with a role the caller's own role allows. */
const AssignMemoDialog: FC<Props> = ({ item, onClose, onAssigned }) => (
  <Dialog open={item !== null} onClose={onClose} fullWidth maxWidth='sm'>
    {item && (
      <AssignForm key={item.memo.uuid} item={item} onClose={onClose} onAssigned={onAssigned} />
    )}
  </Dialog>
);

/** A message for a failed assignment. */
const assignErrorMessage = (error: unknown, user: UserSummary) => {
  if (hasStatus(error, 409)) return `${userLabel(user)} is already assigned to this memo.`;
  if (hasStatus(error, 404)) return 'This user no longer exists.';
  return errorMessage(error);
};

const AssignForm: FC<Props & { item: MemoListItem }> = ({ item, onClose, onAssigned }) => {
  const roles = assignableRoles(item.role);
  const [user, setUser] = useState<UserSummary | null>(null);
  const [role, setRole] = useState<Role>('USER');
  const [userError, setUserError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | undefined>();
  const assign = useAssignMemo();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setFormError(undefined);
    if (!user) {
      setUserError('Please choose a user');
      return;
    }

    assign.mutate(
      { memoUuid: item.memo.uuid, userUuid: user.uuid, role },
      {
        onSuccess: () => onAssigned(user, role),
        onError: (error) => setFormError(assignErrorMessage(error, user)),
      },
    );
  };

  return (
    <form onSubmit={submit} noValidate>
      <DialogTitle>Assign “{item.memo.title}”</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {formError && <Alert severity='error'>{formError}</Alert>}
          <UserSearchField
            value={user}
            onChange={(next) => {
              setUser(next);
              setUserError(undefined);
            }}
            error={userError}
            autoFocus
          />
          <TextField
            select
            label='Role'
            value={role}
            onChange={(event) => setRole(event.target.value as Role)}
            helperText={roleDescriptions[role]}
          >
            {roles.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button type='submit' variant='contained' loading={assign.isPending}>
          Assign
        </Button>
      </DialogActions>
    </form>
  );
};

export default AssignMemoDialog;

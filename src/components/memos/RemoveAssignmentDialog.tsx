import type { FC } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
} from '@mui/material';
import { useRemoveAssignment } from '../../hooks/useMemos';
import { errorMessage, hasStatus } from '../../api/errors';
import { userLabel } from '../../utils/format';
import type { Memo, MemoAssignment } from '../../api/types';

type Props = {
  memo: Memo;
  /** The assignment to remove; the dialog is open while this is set. */
  assignment: MemoAssignment | null;
  /** Whether it is the signed-in user's own assignment, i.e. they leave the memo. */
  leaving: boolean;
  onClose: () => void;
  onRemoved: (assignment: MemoAssignment) => void;
};

/** Asks before removing someone's assignment to a memo, or before leaving it. */
const RemoveAssignmentDialog: FC<Props> = ({ assignment, ...props }) => (
  <Dialog open={assignment !== null} onClose={props.onClose} fullWidth maxWidth='xs'>
    {assignment && (
      <RemoveAssignmentConfirm key={assignment.userUuid} assignment={assignment} {...props} />
    )}
  </Dialog>
);

/** A message for a failed removal. */
const removeErrorMessage = (error: unknown) =>
  hasStatus(error, 404) ? 'This user is no longer assigned to the memo.' : errorMessage(error);

const RemoveAssignmentConfirm: FC<Props & { assignment: MemoAssignment }> = ({
  memo,
  assignment,
  leaving,
  onClose,
  onRemoved,
}) => {
  const remove = useRemoveAssignment();
  const label = userLabel({
    uuid: assignment.userUuid,
    username: assignment.username,
    displayName: assignment.displayName,
  });

  return (
    <>
      <DialogTitle>{leaving ? `Leave “${memo.title}”?` : `Remove ${label}?`}</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          {remove.isError && <Alert severity='error'>{removeErrorMessage(remove.error)}</Alert>}
          <DialogContentText>
            {leaving
              ? 'The memo will no longer show up in your list, and you’ll lose access to it until someone assigns you again.'
              : `${label} will lose access to “${memo.title}”.`}
          </DialogContentText>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          color='error'
          variant='contained'
          loading={remove.isPending}
          onClick={() =>
            remove.mutate(
              { memoUuid: memo.uuid, userUuid: assignment.userUuid, leaving },
              { onSuccess: () => onRemoved(assignment) },
            )
          }
        >
          {leaving ? 'Leave' : 'Remove'}
        </Button>
      </DialogActions>
    </>
  );
};

export default RemoveAssignmentDialog;

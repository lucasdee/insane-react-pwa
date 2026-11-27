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
import { useDeleteMemo } from '../../hooks/useMemos';
import { errorMessage } from '../../api/errors';
import type { Memo } from '../../api/types';

type Props = {
  /** The memo to delete; the dialog is open while this is set. */
  memo: Memo | null;
  onClose: () => void;
  onDeleted: (memo: Memo) => void;
};

/** Asks before deleting a memo. Only offered to the memo's author and ADMINs. */
const DeleteMemoDialog: FC<Props> = ({ memo, onClose, onDeleted }) => (
  <Dialog open={memo !== null} onClose={onClose} fullWidth maxWidth='xs'>
    {memo && (
      <DeleteMemoConfirm key={memo.uuid} memo={memo} onClose={onClose} onDeleted={onDeleted} />
    )}
  </Dialog>
);

const DeleteMemoConfirm: FC<Props & { memo: Memo }> = ({ memo, onClose, onDeleted }) => {
  const deleteMemo = useDeleteMemo();

  return (
    <>
      <DialogTitle>Delete “{memo.title}”?</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          {deleteMemo.isError && <Alert severity='error'>{errorMessage(deleteMemo.error)}</Alert>}
          <DialogContentText>
            The memo is deleted for everyone it is shared with. This can’t be undone.
          </DialogContentText>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          color='error'
          variant='contained'
          loading={deleteMemo.isPending}
          onClick={() => deleteMemo.mutate(memo.uuid, { onSuccess: () => onDeleted(memo) })}
        >
          Delete
        </Button>
      </DialogActions>
    </>
  );
};

export default DeleteMemoDialog;

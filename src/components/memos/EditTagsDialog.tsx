import { useState, type FC, type FormEvent } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
} from '@mui/material';
import TagInput from './TagInput';
import { useReplaceTags, useTagsQuery } from '../../hooks/useMemos';
import { errorMessage, fieldErrors } from '../../api/errors';
import { validateTags } from '../../utils/validation';
import type { Memo } from '../../api/types';

type Props = {
  /** The memo to edit; the dialog is open while this is set. */
  memo: Memo | null;
  onClose: () => void;
  onSaved: (memo: Memo) => void;
};

/** Replaces a memo's tags. Only offered to the memo's ADMINs and MODs. */
const EditTagsDialog: FC<Props> = ({ memo, onClose, onSaved }) => (
  <Dialog open={memo !== null} onClose={onClose} fullWidth maxWidth='sm'>
    {memo && <EditTagsForm key={memo.uuid} memo={memo} onClose={onClose} onSaved={onSaved} />}
  </Dialog>
);

const EditTagsForm: FC<Props & { memo: Memo }> = ({ memo, onClose, onSaved }) => {
  const [tags, setTags] = useState(memo.tags);
  const [error, setError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | undefined>();
  const replaceTags = useReplaceTags();
  const { data: tagCounts = [] } = useTagsQuery();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const invalid = validateTags(tags);
    setError(invalid);
    setFormError(undefined);
    if (invalid) return;

    replaceTags.mutate(
      { memoUuid: memo.uuid, tags },
      {
        onSuccess: onSaved,
        onError: (err) => {
          const tagsError = fieldErrors(err).tags;
          setError(tagsError);
          if (!tagsError) setFormError(errorMessage(err));
        },
      },
    );
  };

  return (
    <form onSubmit={submit} noValidate>
      <DialogTitle>Edit tags of “{memo.title}”</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {formError && <Alert severity='error'>{formError}</Alert>}
          <TagInput
            value={tags}
            onChange={(next) => {
              setTags(next);
              setError(undefined);
            }}
            suggestions={tagCounts.map((tag) => tag.name)}
            error={error}
            autoFocus
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button type='submit' variant='contained' loading={replaceTags.isPending}>
          Save tags
        </Button>
      </DialogActions>
    </form>
  );
};

export default EditTagsDialog;

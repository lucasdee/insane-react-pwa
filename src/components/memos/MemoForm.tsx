import { useState, type FC, type FormEvent } from 'react';
import { Link as RouterLink } from 'react-router';
import { Alert, Button, Stack, TextField } from '@mui/material';
import TagInput from './TagInput';
import { useTagsQuery } from '../../hooks/useMemos';
import { errorMessage, fieldErrors } from '../../api/errors';
import { hasErrors, validateMemo, type FieldErrors, type MemoValues } from '../../utils/validation';

const EMPTY: MemoValues = { title: '', content: '', tags: [] };

type Props = {
  initialValues?: MemoValues;
  submitLabel: string;
  /**
   * Saves the checked values, with title and content trimmed. A rejection shows its
   * field errors on the fields, or its message above the form.
   */
  onSubmit: (values: MemoValues) => Promise<unknown>;
  /** Where Cancel goes. */
  cancelTo: string;
  autoFocus?: boolean;
};

/** A memo's title, content and tags, checked like the API checks them before saving. */
const MemoForm: FC<Props> = ({
  initialValues = EMPTY,
  submitLabel,
  onSubmit,
  cancelTo,
  autoFocus,
}) => {
  const { data: tagCounts = [] } = useTagsQuery();
  const [values, setValues] = useState<MemoValues>(initialValues);
  const [errors, setErrors] = useState<FieldErrors<keyof MemoValues>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof MemoValues>(field: K, value: MemoValues[K]) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const invalid = validateMemo(values);
    setErrors(invalid);
    setFormError(null);
    if (hasErrors(invalid)) return;

    setSaving(true);
    try {
      await onSubmit({ ...values, title: values.title.trim(), content: values.content.trim() });
    } catch (error) {
      const invalidFields = fieldErrors(error);
      setErrors(invalidFields);
      if (!hasErrors(invalidFields)) setFormError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack component='form' spacing={2} noValidate onSubmit={submit}>
      {formError && <Alert severity='error'>{formError}</Alert>}
      <TextField
        label='Title'
        autoFocus={autoFocus}
        value={values.title}
        onChange={(event) => set('title', event.target.value)}
        error={!!errors.title}
        helperText={errors.title}
      />
      <TextField
        label='Content'
        multiline
        minRows={5}
        value={values.content}
        onChange={(event) => set('content', event.target.value)}
        error={!!errors.content}
        helperText={errors.content}
      />
      <TagInput
        value={values.tags}
        onChange={(tags) => set('tags', tags)}
        suggestions={tagCounts.map((tag) => tag.name)}
        error={errors.tags}
      />
      <Stack direction='row' spacing={1} sx={{ justifyContent: 'flex-end' }}>
        <Button component={RouterLink} to={cancelTo}>
          Cancel
        </Button>
        <Button type='submit' variant='contained' loading={saving}>
          {submitLabel}
        </Button>
      </Stack>
    </Stack>
  );
};

export default MemoForm;

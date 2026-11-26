import { useState, type FC, type FormEvent } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router';
import { Alert, Button, Container, Paper, Stack, TextField, Typography } from '@mui/material';
import TagInput from '../components/memos/TagInput';
import { useCreateMemo, useTagsQuery } from '../hooks/useMemos';
import { errorMessage, fieldErrors } from '../api/errors';
import { hasErrors, validateMemo, type FieldErrors, type MemoValues } from '../utils/validation';
import type { MemosPageState } from './MemosPage';

/** Creates a memo; the user becomes its ADMIN. Returns to the list on success. */
const CreateMemoPage: FC = () => {
  const navigate = useNavigate();
  const createMemo = useCreateMemo();
  const { data: tagCounts = [] } = useTagsQuery();
  const [values, setValues] = useState<MemoValues>({ title: '', content: '', tags: [] });
  const [errors, setErrors] = useState<FieldErrors<keyof MemoValues>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const set = <K extends keyof MemoValues>(field: K, value: MemoValues[K]) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const invalid = validateMemo(values);
    setErrors(invalid);
    setFormError(null);
    if (hasErrors(invalid)) return;

    const title = values.title.trim();
    createMemo.mutate(
      { title, content: values.content.trim(), tags: values.tags },
      {
        onSuccess: () => {
          const state: MemosPageState = { notice: `Created “${title}”` };
          navigate('/memos', { state });
        },
        onError: (error) => {
          const invalidFields = fieldErrors(error);
          setErrors(invalidFields);
          if (!hasErrors(invalidFields)) setFormError(errorMessage(error));
        },
      },
    );
  };

  return (
    <Container maxWidth='md' sx={{ py: 4 }}>
      <Paper sx={{ p: { xs: 3, sm: 4 } }}>
        <Typography variant='h5' component='h1' gutterBottom>
          New memo
        </Typography>
        <Stack component='form' spacing={2} noValidate onSubmit={submit}>
          {formError && <Alert severity='error'>{formError}</Alert>}
          <TextField
            label='Title'
            autoFocus
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
            <Button component={RouterLink} to='/memos'>
              Cancel
            </Button>
            <Button type='submit' variant='contained' loading={createMemo.isPending}>
              Create memo
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Container>
  );
};

export default CreateMemoPage;

import type { FC } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AuthorChip from '../components/memos/AuthorChip';
import MemoForm from '../components/memos/MemoForm';
import { useMemoQuery, useUpdateMemo } from '../hooks/useMemos';
import { useAuth } from '../auth/useAuth';
import { errorMessage, hasStatus } from '../api/errors';
import { canEditMemo, isAuthor } from '../utils/permissions';
import { formatDate } from '../utils/format';
import type { MemoListItem } from '../api/types';
import type { MemoValues } from '../utils/validation';
import type { MemosPageState } from './MemosPage';

/**
 * One memo: an edit form for its author, MODs and ADMINs, read-only for everyone
 * else. Returns to the list after saving.
 */
const MemoEditorPage: FC = () => {
  const { memoUuid = '' } = useParams();
  const { data: item, isPending, isError, error, refetch, isRefetching } = useMemoQuery(memoUuid);

  return (
    <Container maxWidth='md' sx={{ py: 4 }}>
      <Button component={RouterLink} to='/memos' startIcon={<ArrowBackIcon />} sx={{ mb: 2 }}>
        Back to memos
      </Button>

      {isPending && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress aria-label='Loading memo' />
        </Box>
      )}

      {isError &&
        // The API answers 403 for missing memos too, so it doesn't reveal which exist.
        (hasStatus(error, 403, 404) ? (
          <Alert severity='warning'>This memo doesn’t exist, or you don’t have access to it.</Alert>
        ) : (
          <Alert
            severity='error'
            action={
              <Button color='inherit' size='small' onClick={() => refetch()} loading={isRefetching}>
                Retry
              </Button>
            }
          >
            Could not load the memo. {errorMessage(error)}
          </Alert>
        ))}

      {item && <MemoDetails key={item.memo.uuid} item={item} />}
    </Container>
  );
};

const MemoDetails: FC<{ item: MemoListItem }> = ({ item }) => {
  const { memo, role } = item;
  const { user } = useAuth();
  const navigate = useNavigate();
  const updateMemo = useUpdateMemo();
  const editable = canEditMemo(role, isAuthor(memo, user?.uuid));

  const save = async (values: MemoValues) => {
    await updateMemo.mutateAsync({ memoUuid: memo.uuid, changes: values });
    const state: MemosPageState = { notice: `Saved “${values.title}”` };
    navigate('/memos', { state });
  };

  return (
    <Paper sx={{ p: { xs: 3, sm: 4 } }}>
      <Typography variant='h5' component='h1' gutterBottom sx={{ wordBreak: 'break-word' }}>
        {editable ? 'Edit memo' : memo.title}
      </Typography>
      <Stack direction='row' sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 3 }}>
        <Typography variant='body2' color='text.secondary'>
          {formatDate(memo.createdAt)}
        </Typography>
        <AuthorChip memo={memo} currentUserUuid={user?.uuid} />
        <Chip label={`Your role: ${role}`} size='small' />
      </Stack>

      {editable ? (
        <MemoForm
          initialValues={{ title: memo.title, content: memo.content, tags: memo.tags }}
          submitLabel='Save changes'
          onSubmit={save}
          cancelTo='/memos'
        />
      ) : (
        <>
          <Alert severity='info' sx={{ mb: 2 }}>
            You can read this memo. Only its author, MODs and ADMINs can edit it.
          </Alert>
          <Typography sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {memo.content}
          </Typography>
          {memo.tags.length > 0 && (
            <Stack
              component='ul'
              aria-label='Tags'
              direction='row'
              sx={{ flexWrap: 'wrap', gap: 1, mt: 2, p: 0, listStyle: 'none' }}
            >
              {memo.tags.map((tag) => (
                <li key={tag}>
                  <Chip label={tag} size='small' variant='outlined' />
                </li>
              ))}
            </Stack>
          )}
        </>
      )}
    </Paper>
  );
};

export default MemoEditorPage;

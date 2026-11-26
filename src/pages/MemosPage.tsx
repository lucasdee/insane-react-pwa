import { useState, type FC } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import MemoCard from '../components/memos/MemoCard';
import EditTagsDialog from '../components/memos/EditTagsDialog';
import AssignMemoDialog from '../components/memos/AssignMemoDialog';
import { useMemosQuery } from '../hooks/useMemos';
import { errorMessage } from '../api/errors';
import { userLabel } from '../utils/format';
import type { MemoListItem } from '../api/types';

/** Location state another page can pass to show a message here, e.g. after creating a memo. */
export type MemosPageState = { notice?: string };

/** The memos assigned to the signed-in user, newest first. */
const MemosPage: FC = () => {
  const { data: items, isPending, isError, error, refetch, isRefetching } = useMemosQuery();
  const location = useLocation();
  const navigate = useNavigate();
  const [editing, setEditing] = useState<MemoListItem | null>(null);
  const [assigning, setAssigning] = useState<MemoListItem | null>(null);
  const [localNotice, setLocalNotice] = useState<string | null>(null);

  const stateNotice = (location.state as MemosPageState | null)?.notice;
  const notice = localNotice ?? stateNotice ?? null;

  const closeNotice = () => {
    setLocalNotice(null);
    // Forget the message passed in, so it doesn't come back on reload.
    if (stateNotice) navigate(location.pathname, { replace: true, state: null });
  };

  return (
    <Container maxWidth='md' sx={{ py: 4 }}>
      <Stack direction='row' sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant='h4' component='h1'>
          My memos
        </Typography>
        <Button component={RouterLink} to='/memos/new' variant='contained' startIcon={<AddIcon />}>
          New memo
        </Button>
      </Stack>

      {isPending && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress aria-label='Loading memos' />
        </Box>
      )}

      {isError && (
        <Alert
          severity='error'
          action={
            <Button color='inherit' size='small' onClick={() => refetch()} loading={isRefetching}>
              Retry
            </Button>
          }
        >
          Could not load your memos. {errorMessage(error)}
        </Alert>
      )}

      {items?.length === 0 && (
        <Paper variant='outlined' sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant='h6' component='p' gutterBottom>
            No memos yet
          </Typography>
          <Typography color='text.secondary' sx={{ mb: 2 }}>
            Memos you create, and memos others assign to you, show up here.
          </Typography>
          <Button component={RouterLink} to='/memos/new' variant='outlined'>
            Create your first memo
          </Button>
        </Paper>
      )}

      {items && items.length > 0 && (
        <Stack spacing={2}>
          {items.map((item) => (
            <MemoCard
              key={item.memo.uuid}
              item={item}
              onEditTags={setEditing}
              onAssign={setAssigning}
            />
          ))}
        </Stack>
      )}

      <EditTagsDialog
        memo={editing?.memo ?? null}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          setLocalNotice('Tags saved');
        }}
      />
      <AssignMemoDialog
        item={assigning}
        onClose={() => setAssigning(null)}
        onAssigned={(user, role) => {
          setAssigning(null);
          setLocalNotice(`Assigned to ${userLabel(user)} as ${role}`);
        }}
      />
      <Snackbar
        open={notice !== null}
        message={notice}
        autoHideDuration={4000}
        onClose={closeNotice}
      />
    </Container>
  );
};

export default MemosPage;

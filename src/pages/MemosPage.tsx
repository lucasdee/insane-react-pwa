import { useEffect, useState, type FC } from 'react';
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
import AssignMemoDialog from '../components/memos/AssignMemoDialog';
import DeleteMemoDialog from '../components/memos/DeleteMemoDialog';
import { useMemosQuery } from '../hooks/useMemos';
import { useAuth } from '../auth/useAuth';
import { errorMessage } from '../api/errors';
import { userLabel } from '../utils/format';
import type { MemoListItem } from '../api/types';

/** Location state another page can pass to show a message here, e.g. after creating a memo. */
export type MemosPageState = { notice?: string };

/** The memos assigned to the signed-in user, newest first. */
const MemosPage: FC = () => {
  const { data: items, isPending, isError, error, refetch, isRefetching } = useMemosQuery();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [assigning, setAssigning] = useState<MemoListItem | null>(null);
  const [deleting, setDeleting] = useState<MemoListItem | null>(null);
  const stateNotice = (location.state as MemosPageState | null)?.notice;
  const [notice, setNotice] = useState<string | null>(stateNotice ?? null);

  // Take over a message passed in and drop it from the history entry right away, so it
  // doesn't come back on reload or Back. Done here, not when the message closes: a
  // navigation then could undo one the user started meanwhile, e.g. to "New memo".
  useEffect(() => {
    if (stateNotice) navigate(location.pathname, { replace: true, state: null });
  }, [stateNotice, location.pathname, navigate]);

  const closeNotice = (_event: unknown, reason?: string) => {
    // A click elsewhere shouldn't cut the message short; it still hides after a while.
    if (reason !== 'clickaway') setNotice(null);
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
              currentUserUuid={user?.uuid}
              onAssign={setAssigning}
              onDelete={setDeleting}
            />
          ))}
        </Stack>
      )}

      <AssignMemoDialog
        item={assigning}
        onClose={() => setAssigning(null)}
        onAssigned={(user, role) => {
          setAssigning(null);
          setNotice(`Assigned to ${userLabel(user)} as ${role}`);
        }}
      />
      <DeleteMemoDialog
        memo={deleting?.memo ?? null}
        onClose={() => setDeleting(null)}
        onDeleted={(memo) => {
          setDeleting(null);
          setNotice(`Deleted “${memo.title}”`);
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

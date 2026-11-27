import type { FC } from 'react';
import { useNavigate } from 'react-router';
import { Container, Paper, Typography } from '@mui/material';
import MemoForm from '../components/memos/MemoForm';
import { useCreateMemo } from '../hooks/useMemos';
import type { MemoValues } from '../utils/validation';
import type { MemosPageState } from './MemosPage';

/** Creates a memo; the user becomes its ADMIN. Returns to the list on success. */
const CreateMemoPage: FC = () => {
  const navigate = useNavigate();
  const createMemo = useCreateMemo();

  const create = async (values: MemoValues) => {
    await createMemo.mutateAsync(values);
    const state: MemosPageState = { notice: `Created “${values.title}”` };
    navigate('/memos', { state });
  };

  return (
    <Container maxWidth='md' sx={{ py: 4 }}>
      <Paper sx={{ p: { xs: 3, sm: 4 } }}>
        <Typography variant='h5' component='h1' gutterBottom>
          New memo
        </Typography>
        <MemoForm submitLabel='Create memo' onSubmit={create} cancelTo='/memos' autoFocus />
      </Paper>
    </Container>
  );
};

export default CreateMemoPage;

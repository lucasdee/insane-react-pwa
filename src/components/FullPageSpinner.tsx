import type { FC } from 'react';
import { Box, CircularProgress } from '@mui/material';

const FullPageSpinner: FC = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
    <CircularProgress aria-label='Loading' />
  </Box>
);

export default FullPageSpinner;

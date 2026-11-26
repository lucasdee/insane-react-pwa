import type { FC } from 'react';
import { Link as RouterLink } from 'react-router';
import { Button, Stack, Typography } from '@mui/material';
import CenteredCard from '../components/CenteredCard';

const HomePage: FC = () => (
  <CenteredCard title='insane-react-pwa'>
    <Typography color='text.secondary' sx={{ mb: 3 }}>
      Store &amp; share notes, lists, links and others!
    </Typography>
    <Stack spacing={2}>
      <Button component={RouterLink} to='/login' variant='contained' size='large'>
        Log in
      </Button>
      <Button component={RouterLink} to='/register' variant='outlined' size='large'>
        Register
      </Button>
    </Stack>
  </CenteredCard>
);

export default HomePage;

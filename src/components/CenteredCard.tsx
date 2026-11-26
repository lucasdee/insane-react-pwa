import type { FC, ReactNode } from 'react';
import { Container, Paper, Typography } from '@mui/material';

type Props = { title: string; children: ReactNode };

/** A titled card in the middle of the page, for the home, login and register screens. */
const CenteredCard: FC<Props> = ({ title, children }) => (
  <Container maxWidth='xs' sx={{ py: { xs: 4, sm: 8 } }}>
    <Paper sx={{ p: { xs: 3, sm: 4 } }}>
      <Typography variant='h5' component='h1' gutterBottom>
        {title}
      </Typography>
      {children}
    </Paper>
  </Container>
);

export default CenteredCard;

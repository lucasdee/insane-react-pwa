import type { FC, ReactNode } from 'react';
import { Avatar, Chip, Container, Paper, Stack, Typography } from '@mui/material';
import { useAuth } from '../auth/useAuth';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

/** The signed-in user's account. Only rendered inside RequireAuth, so `user` is set. */
const ProfilePage: FC = () => {
  const { user } = useAuth();
  if (!user) return null;

  const name = user.displayName || user.username;

  return (
    <Container maxWidth='sm' sx={{ py: 4 }}>
      <Paper sx={{ p: { xs: 3, sm: 4 } }}>
        <Stack direction='row' spacing={2} sx={{ alignItems: 'center', mb: 3 }}>
          <Avatar sx={{ width: 56, height: 56 }}>{name[0].toUpperCase()}</Avatar>
          <div>
            <Typography variant='h5' component='h1'>
              {name}
            </Typography>
            <Typography color='text.secondary'>@{user.username}</Typography>
          </div>
        </Stack>
        <Stack component='dl' spacing={1.5} sx={{ m: 0 }}>
          <ProfileField label='Email'>{user.email}</ProfileField>
          <ProfileField label='Role'>
            <Chip label={user.role} size='small' />
          </ProfileField>
          <ProfileField label='Member since'>{formatDate(user.createdAt)}</ProfileField>
          <ProfileField label='User ID'>
            <Typography component='span' sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
              {user.uuid}
            </Typography>
          </ProfileField>
        </Stack>
      </Paper>
    </Container>
  );
};

const ProfileField: FC<{ label: string; children: ReactNode }> = ({ label, children }) => (
  <div>
    <Typography component='dt' variant='body2' color='text.secondary'>
      {label}
    </Typography>
    <Typography component='dd' sx={{ m: 0 }}>
      {children}
    </Typography>
  </div>
);

export default ProfilePage;

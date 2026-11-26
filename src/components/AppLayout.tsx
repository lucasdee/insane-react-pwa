import { useState, type FC } from 'react';
import { NavLink, Outlet } from 'react-router';
import { AppBar, Box, Button, Toolbar, Typography } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '../auth/useAuth';

const navLinks = [
  { to: '/profile', label: 'Profile' },
  { to: '/memos', label: 'Memos' },
];

/**
 * The signed-in part of the app: a top bar with navigation and logout, then the page.
 * After logging out, RequireAuth takes the user to the home screen.
 */
const AppLayout: FC = () => {
  const { logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
  };

  return (
    <>
      <AppBar position='sticky'>
        <Toolbar sx={{ gap: 1 }}>
          <Typography variant='h6' component='span' sx={{ flexGrow: 1 }}>
            insane-react-pwa
          </Typography>
          <Box component='nav' sx={{ display: 'flex', gap: 1 }}>
            {navLinks.map(({ to, label }) => (
              <Button
                key={to}
                component={NavLink}
                to={to}
                color='inherit'
                sx={{ '&.active': { textDecoration: 'underline', textUnderlineOffset: 6 } }}
              >
                {label}
              </Button>
            ))}
          </Box>
          <Button
            color='inherit'
            startIcon={<LogoutIcon />}
            onClick={handleLogout}
            loading={loggingOut}
          >
            Log out
          </Button>
        </Toolbar>
      </AppBar>
      <Box component='main'>
        <Outlet />
      </Box>
    </>
  );
};

export default AppLayout;

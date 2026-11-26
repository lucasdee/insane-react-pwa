import type { FC } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import useOnlineStatus from './hooks/useOnlineStatus';
import Offline from './components/Offline';
import InstallPrompt from './components/InstallPrompt';
import AppLayout from './components/AppLayout';
import { PublicOnly } from './auth/PublicOnly';
import { RequireAuth } from './auth/RequireAuth';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import MemosPage from './pages/MemosPage';
import CreateMemoPage from './pages/CreateMemoPage';

export const AppRoutes: FC = () => (
  <Routes>
    <Route element={<PublicOnly />}>
      <Route index element={<HomePage />} />
      <Route path='login' element={<LoginPage />} />
      <Route path='register' element={<RegisterPage />} />
    </Route>
    <Route element={<RequireAuth />}>
      <Route element={<AppLayout />}>
        <Route path='profile' element={<ProfilePage />} />
        <Route path='memos' element={<MemosPage />} />
        <Route path='memos/new' element={<CreateMemoPage />} />
      </Route>
    </Route>
    <Route path='*' element={<Navigate to='/' replace />} />
  </Routes>
);

const App: FC = () => {
  const isOnline = useOnlineStatus();

  if (!isOnline) return <Offline />;

  return (
    <>
      <AppRoutes />
      <InstallPrompt />
    </>
  );
};

export default App;

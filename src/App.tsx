import { useState } from 'react';
import useOnlineStatus from './hooks/useOnlineStatus';
import Offline from './components/Offline';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import './App.css';
import InstallPrompt from './components/InstallPrompt';
import { Button } from '@mui/material';

function App() {
  const isOnline = useOnlineStatus();
  const [count, setCount] = useState(0);

  return (
    <>
      {!isOnline ? (
        <Offline />
      ) : (
        <>
          <div>
            <a href='https://vite.dev' target='_blank'>
              <img src={viteLogo} className='logo' alt='Vite logo' />
            </a>
            <a href='https://react.dev' target='_blank'>
              <img src={reactLogo} className='logo react' alt='React logo' />
            </a>
          </div>
          <h1>Vite + React</h1>
          <div className='card'>
            <button onClick={() => setCount((count) => count + 1)}>count is {count}</button>
            <p>
              Edit <code>src/App.tsx</code> and save to test HMR
            </p>
          </div>
          <p className='read-the-docs'>Click on the Vite and React logos to learn more</p>
          <Button variant='contained' color='primary' onClick={() => alert('Hello, World!')}>
            Hello, World!
          </Button>
          <InstallPrompt />
        </>
      )}
    </>
  );
}

export default App;

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/** Intercepts every request the app makes in tests. Override per test with `server.use(...)`. */
export const server = setupServer(...handlers);

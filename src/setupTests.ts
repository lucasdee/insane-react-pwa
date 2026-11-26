import { afterAll, afterEach, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
// Registers the jest-dom matchers on Vitest's `expect` and adds their types.
import '@testing-library/jest-dom/vitest';
import { server } from './test/server';
import { resetMockApi } from './test/handlers';
import { tokenStore } from './api/tokenStore';

// Every request must hit a handler: an unexpected call fails the test.
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMockApi();
  tokenStore.clear();
});

afterAll(() => server.close());

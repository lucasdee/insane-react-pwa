import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
// Registers the jest-dom matchers on Vitest's `expect` and adds their types.
import '@testing-library/jest-dom/vitest';

afterEach(() => {
  cleanup();
});

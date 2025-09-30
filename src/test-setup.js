import '@testing-library/jest-dom';
import { expect, afterEach, beforeAll, afterAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from './__mocks__/server';

// Extend expect with jest-dom matchers
expect.extend({});

// Mock Firebase before importing it anywhere
global.fetch = fetch;

// Mock environment variables - use same logic as main application
const getApiBase = () => {
  const apiBase = import.meta.env.VITE_API_BASE;
  if (apiBase) {
    return apiBase;
  }
  // Fallback for tests
  const port = import.meta.env.VITE_API_PORT || '3003';
  return `http://localhost:${port}/api`;
};

const testApiBase = getApiBase();
const testPort = import.meta.env.VITE_API_PORT || '3003';

Object.defineProperty(window, 'location', {
  value: {
    href: `http://localhost:${testPort}`,
    origin: `http://localhost:${testPort}`,
    pathname: '/',
    search: '',
    hash: '',
  },
  writable: true,
});

// Mock VITE_API_BASE for testing
if (!import.meta.env.VITE_API_BASE) {
  Object.defineProperty(import.meta.env, 'VITE_API_BASE', {
    value: testApiBase,
    writable: true,
  });
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor(cb) {
    this.cb = cb;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Mock scrollTo
window.scrollTo = () => {};

// Setup and teardown MSW
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  cleanup();
});
afterAll(() => server.close());
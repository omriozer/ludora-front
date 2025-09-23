import { describe, it, expect } from 'vitest';

describe('Basic test setup', () => {
  it('should work', () => {
    expect(1 + 1).toBe(2);
  });

  it('should have access to DOM methods', () => {
    const div = document.createElement('div');
    div.textContent = 'Hello World';
    expect(div.textContent).toBe('Hello World');
  });
});
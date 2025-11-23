// Frontend logging utility for development mode only

const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';

// Main logging function
export const printLog = (...args) => {
  // Only log in development mode
  if (!isDev) {
    return;
  }

  // Always log to console with special formatting for easy identification
  console.log(`🐛 DEBUG:`, ...args);
};

// Specific log functions for different levels
export const printError = (...args) => {
  if (!isDev) return;
  console.error(...args);
};

export const printWarn = (...args) => {
  if (!isDev) return;
  console.warn(...args);
};

export const printInfo = (...args) => {
  if (!isDev) return;
  console.info(...args);
};

// Initialize logging
if (isDev) {
  printLog('=== Frontend Debug Log Started ===');
}
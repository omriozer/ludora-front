// Frontend logging utility for development mode only
// Sends logs to backend database via API

const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';

// Send log to backend API using centralized apiRequest
// Currently disabled due to 500 error
// const sendLogToBackend = async (message, logType = 'debug') => {
//   try {
//     await apiRequest('/logs', {
//       method: 'POST',
//       body: JSON.stringify({
//         source_type: 'app',
//         log_type: logType,
//         message: message
//       })
//     });
//   } catch (error) {
//     // If backend logging fails, don't break the app (silently fail)
//     // Only log to console if it's not a connection error to avoid spam
//     if (!error.message.includes('Failed to fetch')) {
//       console.error('Failed to send log to backend:', error);
//     }
//   }
// };

// Main logging function
export const printLog = (...args) => {
  // Only log in development mode
  if (!isDev) {
    return;
  }

  // Always log to console with special formatting for easy identification
  console.log(`🐛 DEBUG:`, ...args);

  // Backend logging temporarily disabled due to 500 error
  // sendLogToBackend(logEntry, 'debug');
};

// Specific log functions for different levels
export const printError = (...args) => {
  if (!isDev) return;

  console.error(...args);
  // Backend logging temporarily disabled
};

export const printWarn = (...args) => {
  if (!isDev) return;

  console.warn(...args);
  // Backend logging temporarily disabled
};

export const printInfo = (...args) => {
  if (!isDev) return;

  console.info(...args);
  // Backend logging temporarily disabled
};

// Initialize logging
if (isDev) {
  printLog('=== Frontend Debug Log Started ===');
}
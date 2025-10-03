// Frontend logging utility for development mode only
// Sends logs to backend database via API

const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';
import { apiRequest } from '@/services/apiClient';

// Send log to backend API using centralized apiRequest
const sendLogToBackend = async (message, logType = 'debug') => {
  try {
    await apiRequest('/logs', {
      method: 'POST',
      body: JSON.stringify({
        source_type: 'app',
        log_type: logType,
        message: message
      })
    });
  } catch (error) {
    // If backend logging fails, don't break the app (silently fail)
    // Only log to console if it's not a connection error to avoid spam
    if (!error.message.includes('Failed to fetch')) {
      console.error('Failed to send log to backend:', error);
    }
  }
};

// Main logging function
export const printLog = (...args) => {
  // Only log in development mode
  if (!isDev) {
    return;
  }

  const timestamp = new Date().toISOString();
  const message = args.map(arg => {
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg, null, 2);
      } catch (e) {
        return String(arg);
      }
    }
    return String(arg);
  }).join(' ');

  const logEntry = `[${timestamp}] ${message}`;

  // Always log to console with special formatting for easy identification
  console.log(`🐛 DEBUG:`, ...args);

  // Backend logging temporarily disabled due to 500 error
  // sendLogToBackend(logEntry, 'debug');
};

// Specific log functions for different levels
export const printError = (...args) => {
  if (!isDev) return;

  const message = args.map(arg => {
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg, null, 2);
      } catch (e) {
        return String(arg);
      }
    }
    return String(arg);
  }).join(' ');

  console.error(...args);
  // sendLogToBackend(`[ERROR] ${message}`, 'error');
};

export const printWarn = (...args) => {
  if (!isDev) return;

  const message = args.map(arg => {
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg, null, 2);
      } catch (e) {
        return String(arg);
      }
    }
    return String(arg);
  }).join(' ');

  console.warn(...args);
  // sendLogToBackend(`[WARN] ${message}`, 'warn');
};

export const printInfo = (...args) => {
  if (!isDev) return;

  const message = args.map(arg => {
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg, null, 2);
      } catch (e) {
        return String(arg);
      }
    }
    return String(arg);
  }).join(' ');

  console.info(...args);
  // sendLogToBackend(`[INFO] ${message}`, 'info');
};

// Initialize logging
if (isDev) {
  printLog('=== Frontend Debug Log Started ===');
}
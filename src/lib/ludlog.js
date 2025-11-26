/**
 * Strategic Logging System for Ludora Frontend
 *
 * This module provides minimal, strategic logging for critical system events.
 * Only use where truly necessary - most debug logging should be removed.
 *
 * @module ludlog
 */

// Import debug user management from existing module
import { isDebugUser } from './debugUsers.js';

// Determine if we should actually log
const isDevelopment = import.meta.env.MODE === 'development';
const isProduction = import.meta.env.MODE === 'production';

/**
 * Should we log? (Development or debug user)
 */
const shouldLog = () => isDevelopment || isDebugUser();

/**
 * Should we force log? (Production critical events)
 */
const shouldForceLog = () => true; // Always log .prod events

/**
 * Colors for different log categories in development
 */
const styles = {
  auth: 'color: #00bcd4; font-weight: bold',       // Cyan
  payment: 'color: #ff9800; font-weight: bold',    // Orange
  api: 'color: #9c27b0; font-weight: bold',        // Purple
  ui: 'color: #4caf50; font-weight: bold',         // Green
  state: 'color: #2196f3; font-weight: bold',      // Blue
  navigation: 'color: #795548; font-weight: bold', // Brown
  db: 'color: #607d8b; font-weight: bold',         // Blue Grey (for IndexedDB)
  media: 'color: #ffeb3b; font-weight: bold',      // Yellow
  game: 'color: #e91e63; font-weight: bold',       // Pink
  general: 'color: #607d8b; font-weight: bold',    // Blue Grey
  error: 'color: #f44336; font-weight: bold',      // Red
  timestamp: 'color: #9e9e9e',                     // Grey
  reset: 'color: inherit; font-weight: normal',
  prod: 'color: #ff1744; font-weight: bold'        // Red accent for production logs
};

/**
 * Format log output with timestamp and category
 * @private
 */
function formatLog(category, message, data, forceProduction = false) {
  // Check if we should log at all
  if (!forceProduction && !shouldLog()) return;
  if (forceProduction && !shouldForceLog()) return;

  const timestamp = new Date().toISOString();
  const prodMarker = forceProduction ? ' [PROD]' : '';

  if (isDevelopment && !forceProduction) {
    // Colorful output for development
    const style = styles[category] || styles.general;

    console.log(
      `%c[${timestamp}]${prodMarker}%c %c[${category.toUpperCase()}]%c ${message}`,
      styles.timestamp,
      styles.reset,
      style,
      styles.reset
    );

    if (data && Object.keys(data).length > 0) {
      console.log('  └─', data);
    }
  } else {
    // Structured output for production (JSON format for log aggregators)
    const logEntry = {
      timestamp,
      level: forceProduction ? 'critical' : 'info',
      category,
      message,
      ...(data && { data }),
      ...(forceProduction && { production: true })
    };
    console.log(JSON.stringify(logEntry));
  }
}

/**
 * Format error output with stack traces
 * @private
 */
function formatError(category, message, error, context, forceProduction = false) {
  // Check if we should log at all
  if (!forceProduction && !shouldLog()) return;
  if (forceProduction && !shouldForceLog()) return;

  const timestamp = new Date().toISOString();
  const prodMarker = forceProduction ? ' [PROD]' : '';

  if (isDevelopment && !forceProduction) {
    // Detailed error output for development
    const style = styles[category] || styles.general;

    console.error(
      `%c[${timestamp}]${prodMarker} [ERROR]%c %c[${category.toUpperCase()}]%c ${message}`,
      styles.error,
      styles.reset,
      style,
      styles.reset
    );

    if (context && Object.keys(context).length > 0) {
      console.error('  ├─ Context:', context);
    }

    if (error) {
      if (error.stack) {
        console.error('  ├─ Stack:', error.stack);
      } else {
        console.error('  ├─ Error:', error);
      }
    }

    console.error('  └─ ────────────────────────');
  } else {
    // Structured error output for production
    const errorEntry = {
      timestamp,
      level: 'error',
      category,
      message,
      ...(context && { context }),
      ...(error && {
        error: {
          message: error.message || String(error),
          stack: error.stack,
          name: error.name,
          code: error.code
        }
      }),
      ...(forceProduction && { production: true })
    };
    console.error(JSON.stringify(errorEntry));
  }
}

/**
 * Create a logging function with .prod chaining
 * @private
 */
function createLogMethod(category, isError = false) {
  const logFn = isError
    ? (message, error, context) => formatError(category, message, error, context, false)
    : (message, data) => formatLog(category, message, data, false);

  // Add .prod property for forced production logging
  logFn.prod = isError
    ? (message, error, context) => formatError(category, message, error, context, true)
    : (message, data) => formatLog(category, message, data, true);

  return logFn;
}

/**
 * Strategic logging interface with semantic categories
 *
 * Usage:
 *   ludlog.auth('Login attempt', { userId });           // Dev only
 *   ludlog.auth.prod('Critical auth failure', { ip });  // Always logs
 */
const ludlog = {
  // Authentication & Authorization (critical security events)
  auth: createLogMethod('auth'),

  // Payment Processing (always critical in production)
  payment: createLogMethod('payment'),

  // API Critical Events (major failures, not routine requests)
  api: createLogMethod('api'),

  // UI Critical Events (crashes, not routine interactions)
  ui: createLogMethod('ui'),

  // State Management (critical state corruption, not routine updates)
  state: createLogMethod('state'),

  // Navigation Critical Events (access control failures, not routine navigation)
  navigation: createLogMethod('navigation'),

  // Database Critical Events (IndexedDB failures, not routine operations)
  db: createLogMethod('db'),

  // Media Operations (loading failures, not routine playback)
  media: createLogMethod('media'),

  // Game Events (critical game state issues)
  game: createLogMethod('game'),

  // General Purpose (use sparingly)
  general: createLogMethod('general')
};

/**
 * Strategic error logging interface with semantic categories
 *
 * Usage:
 *   luderror.api('Request failed', err, { endpoint });           // Dev only
 *   luderror.api.prod('Critical API failure', err, { endpoint }); // Always logs
 */
const luderror = {
  // Authentication & Authorization Errors (security breaches)
  auth: createLogMethod('auth', true),

  // Payment Processing Errors (always critical)
  payment: createLogMethod('payment', true),

  // API Critical Errors (not routine 4xx responses)
  api: createLogMethod('api', true),

  // UI Component Errors (crashes, not minor issues)
  ui: createLogMethod('ui', true),

  // State Management Errors (corruption, not validation)
  state: createLogMethod('state', true),

  // Navigation Errors (route failures, not 404s)
  navigation: createLogMethod('navigation', true),

  // Database Errors (IndexedDB failures)
  db: createLogMethod('db', true),

  // Media Errors (loading failures, not user skips)
  media: createLogMethod('media', true),

  // Game Errors (critical failures, not game over)
  game: createLogMethod('game', true),

  // General Errors (critical failures, inconsistencies)
  general: createLogMethod('general', true)
};

// ES Module exports
export {
  ludlog,
  luderror
};

// Default export for convenience
export default {
  ludlog,
  luderror
};
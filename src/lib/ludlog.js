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
import { isDev, isProd } from '../utils/environment';

// Determine if we should actually log
const isDevelopment = isDev();
const isProduction = isProd();

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
  try {
    // Check if we should log at all
    if (!forceProduction && !shouldLog()) return;
    if (forceProduction && !shouldForceLog()) return;

    // Defensive parameter sanitization
    const safeCategory = (typeof category === 'string' ? category : 'general').toLowerCase();
    const safeMessage = typeof message === 'string' ? message : String(message || 'Unknown log message');
    const timestamp = new Date().toISOString();
    const prodMarker = forceProduction ? ' [PROD]' : '';

    if (isDevelopment && !forceProduction) {
      // Colorful output for development
      const style = styles[safeCategory] || styles.general || styles.reset;

      console.log(
        `%c[${timestamp}]${prodMarker}%c %c[${safeCategory.toUpperCase()}]%c ${safeMessage}`,
        styles.timestamp || styles.reset,
        styles.reset,
        style,
        styles.reset
      );

      if (data && typeof data === 'object' && Object.keys(data).length > 0) {
        console.log('  └─', data);
      }
    } else {
      // Structured output for production (JSON format for log aggregators)
      const logEntry = {
        timestamp,
        level: forceProduction ? 'critical' : 'info',
        category: safeCategory,
        message: safeMessage,
        ...(data && typeof data === 'object' && { data }),
        ...(forceProduction && { production: true })
      };
      console.log(JSON.stringify(logEntry));
    }
  } catch (error) {
    // Logging system should never crash the app - fail silently with fallback
    try {
      console.error('[LUDLOG ERROR] Logging system failed:', error.message);
    } catch (fallbackError) {
      // Even the fallback error logging failed - this should never happen
      // but we handle it to ensure absolute safety
    }
  }
}

/**
 * Format error output with stack traces
 * @private
 */
function formatError(category, message, error, context, forceProduction = false) {
  try {
    // Check if we should log at all
    if (!forceProduction && !shouldLog()) return;
    if (forceProduction && !shouldForceLog()) return;

    // Defensive parameter sanitization
    const safeCategory = (typeof category === 'string' ? category : 'general').toLowerCase();
    const safeMessage = typeof message === 'string' ? message : String(message || 'Unknown error message');
    const timestamp = new Date().toISOString();
    const prodMarker = forceProduction ? ' [PROD]' : '';

    if (isDevelopment && !forceProduction) {
      // Detailed error output for development
      const style = styles[safeCategory] || styles.general || styles.reset;

      console.error(
        `%c[${timestamp}]${prodMarker} [ERROR]%c %c[${safeCategory.toUpperCase()}]%c ${safeMessage}`,
        styles.error || styles.reset,
        styles.reset,
        style,
        styles.reset
      );

      if (context && typeof context === 'object' && Object.keys(context).length > 0) {
        console.error('  ├─ Context:', context);
      }

      if (error) {
        if (error && typeof error === 'object' && error.stack) {
          console.error('  ├─ Stack:', error.stack);
        } else {
          console.error('  ├─ Error:', String(error || 'Unknown error'));
        }
      }

      console.error('  └─ ────────────────────────');
    } else {
      // Structured error output for production
      const errorEntry = {
        timestamp,
        level: 'error',
        category: safeCategory,
        message: safeMessage,
        ...(context && typeof context === 'object' && { context }),
        ...(error && {
          error: {
            message: (error && error.message) ? String(error.message) : String(error || 'Unknown error'),
            stack: (error && error.stack) ? error.stack : null,
            name: (error && error.name) ? error.name : null,
            code: (error && error.code) ? error.code : null
          }
        }),
        ...(forceProduction && { production: true })
      };
      console.error(JSON.stringify(errorEntry));
    }
  } catch (loggingError) {
    // Logging system should never crash the app - fail silently with fallback
    try {
      console.error('[LUDERROR ERROR] Error logging system failed:', loggingError.message);
    } catch (fallbackError) {
      // Even the fallback error logging failed - this should never happen
      // but we handle it to ensure absolute safety
    }
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
const ludlogBase = {
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

// Create a Proxy to handle unknown categories gracefully
const ludlog = new Proxy(ludlogBase, {
  get(target, property) {
    // Return known categories directly
    if (target[property]) {
      return target[property];
    }

    // For unknown categories, return a generic logger with the requested category name
    if (typeof property === 'string') {
      return createLogMethod(property);
    }

    // For symbols and other property types, return undefined
    return undefined;
  }
});

/**
 * Strategic error logging interface with semantic categories
 *
 * Usage:
 *   luderror.api('Request failed', err, { endpoint });           // Dev only
 *   luderror.api.prod('Critical API failure', err, { endpoint }); // Always logs
 */
const luderrorBase = {
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

// Create a Proxy to handle unknown categories gracefully
const luderror = new Proxy(luderrorBase, {
  get(target, property) {
    // Return known categories directly
    if (target[property]) {
      return target[property];
    }

    // For unknown categories, return a generic error logger with the requested category name
    if (typeof property === 'string') {
      return createLogMethod(property, true);
    }

    // For symbols and other property types, return undefined
    return undefined;
  }
});

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
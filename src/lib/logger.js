/**
 * Professional Logging System for Ludora Frontend
 *
 * This module provides structured logging with semantic categories
 * while maintaining 100% backward compatibility with existing clog/cerror
 *
 * @module logger
 */

// Import debug user management from existing module
import { isDebugUser } from './debugUsers.js';

// Determine if we should actually log
const isDevelopment = import.meta.env.MODE === 'development';
const shouldLog = () => isDevelopment || isDebugUser();

/**
 * DEPRECATED: Legacy logging function - kept for backward compatibility
 * @deprecated Use log.category() methods instead
 * @returns {null} Always returns null
 */
export function clog(...args) {
  return null; // No-op for backward compatibility
}

/**
 * DEPRECATED: Legacy error logging function - kept for backward compatibility
 * @deprecated Use error.category() methods instead
 * @returns {null} Always returns null
 */
export function cerror(...args) {
  return shouldLog() && console.error(...args)
}

/**
 * Colors for different log categories in development
 */
const styles = {
  auth: 'color: #00bcd4; font-weight: bold',       // Cyan
  payment: 'color: #ff9800; font-weight: bold',    // Orange
  api: 'color: #9c27b0; font-weight: bold',        // Purple
  ui: 'color: #4caf50; font-weight: bold',         // Green
  state: 'color: #2196f3; font-weight: bold',      // Blue
  navigation: 'color: #795548; font-weight: bold',  // Brown
  websocket: 'color: #ff5722; font-weight: bold',  // Deep Orange
  media: 'color: #ffeb3b; font-weight: bold',      // Yellow
  game: 'color: #e91e63; font-weight: bold',       // Pink
  general: 'color: #607d8b; font-weight: bold',    // Blue Grey
  error: 'color: #f44336; font-weight: bold',      // Red
  timestamp: 'color: #9e9e9e',                     // Grey
  reset: 'color: inherit; font-weight: normal'
};

/**
 * Format log output with timestamp and category
 * @private
 */
function formatLog(category, message, data, level = 'info') {
  if (!shouldLog()) return;

  const timestamp = new Date().toISOString();

  if (isDevelopment) {
    // Colorful output for development
    const style = styles[category] || styles.general;
    const levelStyle = level === 'error' ? styles.error : '';

    console.log(
      `%c[${timestamp}]%c %c[${category.toUpperCase()}]%c ${message}`,
      styles.timestamp,
      styles.reset,
      style,
      styles.reset
    );

    if (data && Object.keys(data).length > 0) {
      console.log('  └─', data);
    }
  } else {
    // Structured output for production (useful for debugging issues)
    const logEntry = {
      timestamp,
      level,
      category,
      message,
      ...(data && { data })
    };

    // In production, only log if user is a debug user
    if (isDebugUser()) {
      console.log(JSON.stringify(logEntry));
    }
  }
}

/**
 * Format error output with stack traces
 * @private
 */
function formatError(category, message, error, context) {
  if (!shouldLog()) return;

  const timestamp = new Date().toISOString();

  if (isDevelopment) {
    // Detailed error output for development
    const style = styles[category] || styles.general;

    console.error(
      `%c[${timestamp}] [ERROR]%c %c[${category.toUpperCase()}]%c ${message}`,
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
      })
    };

    // In production, only log errors if user is a debug user
    if (isDebugUser()) {
      console.error(JSON.stringify(errorEntry));
    }
  }
}

/**
 * Main logging interface with semantic categories
 */
export const log = {
  // Authentication & Authorization
  auth: (message, data) => formatLog('auth', message, data),

  // Payment Processing
  payment: (message, data) => formatLog('payment', message, data),

  // API Requests & Responses
  api: (message, data) => formatLog('api', message, data),

  // UI Events & Interactions
  ui: (message, data) => formatLog('ui', message, data),

  // State Management (Redux, Context)
  state: (message, data) => formatLog('state', message, data),

  // Navigation & Routing
  navigation: (message, data) => formatLog('navigation', message, data),

  // WebSocket & Real-time Events
  websocket: (message, data) => formatLog('websocket', message, data),

  // Media (Images, Videos, Audio)
  media: (message, data) => formatLog('media', message, data),

  // Game-specific Events
  game: (message, data) => formatLog('game', message, data),

  // General Purpose
  general: (message, data) => formatLog('general', message, data),

  // Performance Metrics
  perf: (operation, duration, metadata = {}) => {
    formatLog('api', `${operation} completed`, {
      duration_ms: duration,
      ...metadata
    });
  },

  // Component Lifecycle (React specific)
  component: (componentName, event, data) => {
    formatLog('ui', `[${componentName}] ${event}`, data);
  },

  // Custom category
  custom: (category, message, data) => formatLog(category, message, data)
};

/**
 * Error logging interface with semantic categories
 */
export const error = {
  // Authentication & Authorization Errors
  auth: (message, err, context) => formatError('auth', message, err, context),

  // Payment Processing Errors
  payment: (message, err, context) => formatError('payment', message, err, context),

  // API Errors
  api: (message, err, context) => formatError('api', message, err, context),

  // UI/Component Errors
  ui: (message, err, context) => formatError('ui', message, err, context),

  // State Management Errors
  state: (message, err, context) => formatError('state', message, err, context),

  // Navigation Errors
  navigation: (message, err, context) => formatError('navigation', message, err, context),

  // WebSocket Errors
  websocket: (message, err, context) => formatError('websocket', message, err, context),

  // Media Errors
  media: (message, err, context) => formatError('media', message, err, context),

  // Game Errors
  game: (message, err, context) => formatError('game', message, err, context),

  // General Errors
  general: (message, err, context) => formatError('general', message, err, context),

  // Validation Errors
  validation: (message, err, context) => formatError('validation', message, err, context),

  // React Component Errors
  component: (componentName, err, context) =>
    formatError('ui', `[${componentName}] Component error`, err, context),

  // Custom category
  custom: (category, message, err, context) => formatError(category, message, err, context)
};

/**
 * React Component Logger Wrapper
 * Provides component-specific logging with automatic component name tracking
 */
export class ComponentLogger {
  constructor(componentName) {
    this.componentName = componentName;
  }

  log(message, data) {
    log.component(this.componentName, message, data);
  }

  error(message, err, context) {
    error.component(this.componentName, err, { ...context, message });
  }

  mount(props) {
    log.component(this.componentName, 'mounted', { props });
  }

  unmount() {
    log.component(this.componentName, 'unmounted', {});
  }

  render(reason) {
    log.component(this.componentName, 'rendering', { reason });
  }

  stateChange(prevState, newState) {
    log.component(this.componentName, 'state changed', {
      prev: prevState,
      new: newState
    });
  }
}

/**
 * API Request Logger
 * Automatically logs API requests with timing
 */
export class ApiLogger {
  constructor(endpoint) {
    this.endpoint = endpoint;
    this.startTime = performance.now();
  }

  request(method, data) {
    log.api(`${method} ${this.endpoint}`, {
      method,
      endpoint: this.endpoint,
      ...(data && { data })
    });
  }

  response(status, data) {
    const duration = performance.now() - this.startTime;
    log.api(`Response from ${this.endpoint}`, {
      endpoint: this.endpoint,
      status,
      duration_ms: duration.toFixed(2),
      ...(data && { data })
    });
  }

  error(err, context) {
    const duration = performance.now() - this.startTime;
    error.api(`API error: ${this.endpoint}`, err, {
      endpoint: this.endpoint,
      duration_ms: duration.toFixed(2),
      ...context
    });
  }
}

/**
 * Performance Logger
 * Measures and logs performance metrics
 */
export class PerfLogger {
  constructor(operation) {
    this.operation = operation;
    this.marks = new Map();
  }

  start(label = 'default') {
    this.marks.set(label, performance.now());
  }

  end(label = 'default', metadata = {}) {
    const startTime = this.marks.get(label);
    if (!startTime) {
      error.general('Performance mark not found', new Error(`Mark "${label}" not found`));
      return;
    }

    const duration = performance.now() - startTime;
    log.perf(`${this.operation}${label !== 'default' ? ` (${label})` : ''}`, duration, metadata);
    this.marks.delete(label);
  }

  measure(fn, label = 'default', metadata = {}) {
    this.start(label);
    const result = fn();
    this.end(label, metadata);
    return result;
  }

  async measureAsync(fn, label = 'default', metadata = {}) {
    this.start(label);
    const result = await fn();
    this.end(label, metadata);
    return result;
  }
}

// Export utility function
export { shouldLog };

// Default export for convenience
export default {
  log,
  error,
  ComponentLogger,
  ApiLogger,
  PerfLogger,
  // Legacy functions (deprecated)
  clog,
  cerror,
  shouldLog
};
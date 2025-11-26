/**
 * Ludora Unified Logging System
 *
 * Provides semantic logging with .prod chaining for production-critical events
 *
 * @module ludlog
 */

// Import debug user management from existing module
import { isDebugUser } from './debugUsers.js';

// Determine if we should actually log
const isDevelopment = import.meta.env.MODE === 'development';
const shouldLog = () => isDevelopment || isDebugUser();

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
  validation: 'color: #9e5c9c; font-weight: bold', // Purple variant
  perf: 'color: #03dac6; font-weight: bold',       // Teal
  component: 'color: #673ab7; font-weight: bold',  // Deep Purple
  timestamp: 'color: #9e9e9e',                     // Grey
  reset: 'color: inherit; font-weight: normal',
  prod: 'color: #ff1744; font-weight: bold'        // Red accent for production logs
};

/**
 * Format log output with timestamp and category
 * @private
 */
function formatLog(category, message, data, force = false) {
  // Production-critical logs always go through
  if (!force && !shouldLog()) return;

  const timestamp = new Date().toISOString();
  const isProduction = force ? ' [PROD]' : '';

  if (isDevelopment || force) {
    // Colorful output for development and production-critical
    const style = styles[category] || styles.general;
    const prodStyle = force ? styles.prod : '';

    console.log(
      `%c[${timestamp}]%c %c[${category.toUpperCase()}${isProduction}]%c ${message}`,
      styles.timestamp,
      styles.reset,
      force ? prodStyle : style,
      styles.reset
    );

    if (data && Object.keys(data).length > 0) {
      console.log('  └─', data);
    }
  } else if (isDebugUser()) {
    // Structured output for debug users in production
    const logEntry = {
      timestamp,
      level: 'info',
      category,
      message,
      force,
      ...(data && { data })
    };

    console.log(JSON.stringify(logEntry));
  }
}

/**
 * Format error output with stack traces
 * @private
 */
function formatError(category, message, error, context, force = false) {
  // Production-critical errors always go through
  if (!force && !shouldLog()) return;

  const timestamp = new Date().toISOString();
  const isProduction = force ? ' [PROD]' : '';

  if (isDevelopment || force) {
    // Detailed error output for development and production-critical
    const style = styles[category] || styles.general;
    const prodStyle = force ? styles.prod : '';

    console.error(
      `%c[${timestamp}] [ERROR]%c %c[${category.toUpperCase()}${isProduction}]%c ${message}`,
      styles.error,
      styles.reset,
      force ? prodStyle : style,
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
  } else if (isDebugUser()) {
    // Structured error output for debug users in production
    const errorEntry = {
      timestamp,
      level: 'error',
      category,
      message,
      force,
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

    console.error(JSON.stringify(errorEntry));
  }
}

/**
 * Create logging methods with .prod chaining
 * @private
 */
function createLogMethod(category) {
  const method = (message, data) => formatLog(category, message, data);
  method.prod = (message, data) => formatLog(category, message, data, true);
  return method;
}

/**
 * Create error methods with .prod chaining
 * @private
 */
function createErrorMethod(category) {
  const method = (message, err, context) => formatError(category, message, err, context);
  method.prod = (message, err, context) => formatError(category, message, err, context, true);
  return method;
}

/**
 * Main logging interface with semantic categories and .prod chaining
 */
export const ludlog = {
  // Authentication & Authorization
  auth: createLogMethod('auth'),

  // Payment Processing
  payment: createLogMethod('payment'),

  // API Requests & Responses
  api: createLogMethod('api'),

  // UI Events & Interactions
  ui: createLogMethod('ui'),

  // State Management (Redux, Context)
  state: createLogMethod('state'),

  // Navigation & Routing
  navigation: createLogMethod('navigation'),

  // WebSocket & Real-time Events
  websocket: createLogMethod('websocket'),

  // Media (Images, Videos, Audio)
  media: createLogMethod('media'),

  // Game-specific Events
  game: createLogMethod('game'),

  // General Purpose
  general: createLogMethod('general'),

  // Performance Metrics
  perf: createLogMethod('perf'),

  // Component Lifecycle (React specific)
  component: createLogMethod('component'),

  // Validation Events
  validation: createLogMethod('validation'),

  // Custom category
  custom: (category, message, data, force = false) => formatLog(category, message, data, force),
};

// Add .prod variant for custom
ludlog.custom.prod = (category, message, data) => formatLog(category, message, data, true);

/**
 * Error logging interface with semantic categories and .prod chaining
 */
export const luderror = {
  // Authentication & Authorization Errors
  auth: createErrorMethod('auth'),

  // Payment Processing Errors
  payment: createErrorMethod('payment'),

  // API Errors
  api: createErrorMethod('api'),

  // UI/Component Errors
  ui: createErrorMethod('ui'),

  // State Management Errors
  state: createErrorMethod('state'),

  // Navigation Errors
  navigation: createErrorMethod('navigation'),

  // WebSocket Errors
  websocket: createErrorMethod('websocket'),

  // Media Errors
  media: createErrorMethod('media'),

  // Game Errors
  game: createErrorMethod('game'),

  // General Errors
  general: createErrorMethod('general'),

  // Validation Errors
  validation: createErrorMethod('validation'),

  // Custom category
  custom: (category, message, err, context, force = false) => formatError(category, message, err, context, force),
};

// Add .prod variant for custom
luderror.custom.prod = (category, message, err, context) => formatError(category, message, err, context, true);

/**
 * React Component Logger Wrapper
 * Provides component-specific logging with automatic component name tracking
 */
export class ComponentLogger {
  constructor(componentName) {
    this.componentName = componentName;
  }

  log(message, data, force = false) {
    ludlog.component(`[${this.componentName}] ${message}`, data);
    if (force) {
      ludlog.component.prod(`[${this.componentName}] ${message}`, data);
    }
  }

  error(message, err, context, force = false) {
    luderror.component(`[${this.componentName}] ${message}`, err, context);
    if (force) {
      luderror.component.prod(`[${this.componentName}] ${message}`, err, context);
    }
  }

  mount(props) {
    ludlog.component(`[${this.componentName}] mounted`, { props });
  }

  unmount() {
    ludlog.component(`[${this.componentName}] unmounted`, {});
  }

  render(reason) {
    ludlog.component(`[${this.componentName}] rendering`, { reason });
  }

  stateChange(prevState, newState) {
    ludlog.component(`[${this.componentName}] state changed`, {
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
    ludlog.api(`${method} ${this.endpoint}`, {
      method,
      endpoint: this.endpoint,
      ...(data && { data })
    });
  }

  response(status, data) {
    const duration = performance.now() - this.startTime;
    ludlog.api(`Response from ${this.endpoint}`, {
      endpoint: this.endpoint,
      status,
      duration_ms: duration.toFixed(2),
      ...(data && { data })
    });
  }

  error(err, context) {
    const duration = performance.now() - this.startTime;
    luderror.api(`API error: ${this.endpoint}`, err, {
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
      luderror.general('Performance mark not found', new Error(`Mark "${label}" not found`));
      return;
    }

    const duration = performance.now() - startTime;
    ludlog.perf(`${this.operation}${label !== 'default' ? ` (${label})` : ''}`, {
      duration_ms: duration.toFixed(2),
      ...metadata
    });
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

// Export utility function for backward compatibility
export { shouldLog };

// Default export for convenience
export default {
  ludlog,
  luderror,
  ComponentLogger,
  ApiLogger,
  PerfLogger,
  shouldLog
};
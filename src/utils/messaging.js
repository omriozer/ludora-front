/**
 * Unified Messaging System for Ludora
 *
 * This module provides a centralized API for all user-facing messages including:
 * - Toast notifications (temporary)
 * - Confirmation dialogs (modal)
 * - Global messages (fixed positioning)
 *
 * Usage Guidelines:
 * - Use showToast() for temporary feedback (success, error, info)
 * - Use showConfirm() for user confirmations before destructive actions
 * - Use showGlobalMessage() for critical system-wide announcements
 *
 * All functions support Hebrew/RTL content and maintain design consistency.
 */

import { toast } from '@/components/ui/use-toast';

/**
 * Show a temporary toast notification
 * @param {string} type - 'success' | 'error' | 'warning' | 'info'
 * @param {string} title - Main message title
 * @param {string} [description] - Optional detailed message
 * @param {Object} [options] - Additional toast options
 * @param {number} [options.duration] - Auto-dismiss duration in ms (default: 5000)
 * @param {boolean} [options.persistent] - Whether to disable auto-dismiss
 */
export function showToast(type, title, description = null, options = {}) {
  const variantMap = {
    success: 'default',
    error: 'destructive',
    warning: 'destructive',
    info: 'default'
  };

  const variant = variantMap[type] || 'default';

  return toast({
    title,
    description,
    variant,
    duration: options.persistent ? Infinity : (options.duration || 5000),
    ...options
  });
}

/**
 * Show a success toast notification
 * @param {string} title - Success message
 * @param {string} [description] - Optional details
 * @param {Object} [options] - Additional options
 */
export function showSuccess(title, description, options = {}) {
  return showToast('success', title, description, options);
}

/**
 * Show an error toast notification
 * @param {string} title - Error message
 * @param {string} [description] - Optional error details
 * @param {Object} [options] - Additional options
 */
export function showError(title, description, options = {}) {
  return showToast('error', title, description, options);
}

/**
 * Show a warning toast notification
 * @param {string} title - Warning message
 * @param {string} [description] - Optional warning details
 * @param {Object} [options] - Additional options
 */
export function showWarning(title, description, options = {}) {
  return showToast('warning', title, description, options);
}

/**
 * Show an info toast notification
 * @param {string} title - Info message
 * @param {string} [description] - Optional info details
 * @param {Object} [options] - Additional options
 */
export function showInfo(title, description, options = {}) {
  return showToast('info', title, description, options);
}

/**
 * Store for global message state (simple implementation)
 * For a more robust solution, consider using a proper state management library
 */
let globalMessageState = {
  message: null,
  type: null,
  listeners: []
};

/**
 * Show a global fixed message (typically for system announcements)
 * @param {string} type - 'error' | 'info'
 * @param {string} message - The message to display
 */
export function showGlobalMessage(type, message) {
  globalMessageState.message = message;
  globalMessageState.type = type;

  // Notify all listeners (GlobalMessage components)
  globalMessageState.listeners.forEach(listener => listener(globalMessageState));
}

/**
 * Hide the current global message
 */
export function hideGlobalMessage() {
  globalMessageState.message = null;
  globalMessageState.type = null;

  // Notify all listeners
  globalMessageState.listeners.forEach(listener => listener(globalMessageState));
}

/**
 * Subscribe to global message changes (used by GlobalMessage component)
 * @param {Function} listener - Callback function
 * @returns {Function} Unsubscribe function
 */
export function subscribeToGlobalMessage(listener) {
  globalMessageState.listeners.push(listener);

  // Return unsubscribe function
  return () => {
    const index = globalMessageState.listeners.indexOf(listener);
    if (index > -1) {
      globalMessageState.listeners.splice(index, 1);
    }
  };
}

/**
 * Get current global message state
 * @returns {Object} Current global message state
 */
export function getGlobalMessageState() {
  return { ...globalMessageState };
}

// Global reference to confirmation provider (will be set by ConfirmationProvider)
let globalConfirmationHandler = null;

/**
 * Set the global confirmation handler (used by ConfirmationProvider)
 * @param {Function} handler - The confirmation handler function
 */
export function setGlobalConfirmationHandler(handler) {
  globalConfirmationHandler = handler;
}

/**
 * Promise-based confirmation dialog
 * Returns a Promise that resolves to true/false based on user choice
 *
 * Requires ConfirmationProvider to be wrapped around the app root.
 *
 * @param {string} title - Dialog title
 * @param {string} message - Dialog message
 * @param {Object} [options] - Additional options
 * @param {string} [options.variant] - 'warning' | 'danger' | 'info' | 'success'
 * @param {string} [options.confirmText] - Confirm button text (default: "אישור")
 * @param {string} [options.cancelText] - Cancel button text (default: "ביטול")
 * @returns {Promise<boolean>} Promise that resolves to user's choice
 */
export async function showConfirm(title, message, options = {}) {
  if (globalConfirmationHandler) {
    return globalConfirmationHandler(title, message, options);
  } else {
    // Fallback to native confirm with warning
    console.warn('showConfirm: ConfirmationProvider not found, falling back to native confirm');
    deprecatedNativeConfirm(`${title}\n\n${message}`);
    const result = window.confirm(`${title}\n\n${message}`);
    return Promise.resolve(result);
  }
}

/**
 * Common Hebrew error messages for consistency
 */
export const HEBREW_MESSAGES = {
  // Generic messages
  LOADING: 'טוען...',
  SAVING: 'שומר...',
  DELETING: 'מוחק...',
  SUCCESS: 'הפעולה בוצעה בהצלחה',
  ERROR: 'אירעה שגיאה',
  CANCEL: 'ביטול',
  CONFIRM: 'אישור',

  // Network errors
  NETWORK_ERROR: 'שגיאת רשת - בדוק את החיבור לאינטרנט',
  SERVER_ERROR: 'שגיאת שרת - נסה שוב מאוחר יותר',
  TIMEOUT_ERROR: 'תם הזמן הקצוב - נסה שוב',

  // Form validation
  REQUIRED_FIELD: 'שדה חובה',
  INVALID_EMAIL: 'כתובת אימייל לא תקינה',
  INVALID_PHONE: 'מספר טלפון לא תקין',
  PASSWORD_TOO_SHORT: 'סיסמה קצרה מדי',

  // File operations
  FILE_UPLOAD_ERROR: 'שגיאה בהעלאת הקובץ',
  FILE_TOO_LARGE: 'הקובץ גדול מדי',
  UNSUPPORTED_FILE_TYPE: 'סוג קובץ לא נתמך',

  // Confirmation messages
  DELETE_CONFIRM: 'האם אתה בטוח שברצונך למחוק פריט זה?',
  UNSAVED_CHANGES: 'יש לך שינויים שלא נשמרו. האם אתה בטוח שברצונך לצאת?',
  LOGOUT_CONFIRM: 'האם אתה בטוח שברצונך להתנתק?'
};

/**
 * Helper function to replace native browser alerts with custom toasts
 * Call this to show a migration warning when native alerts are used
 */
export function deprecatedNativeAlert(message) {
  console.warn('Native alert() detected. Please use showToast() or showConfirm() instead for better UX');
  showWarning('התראה', message, { duration: 8000 });
}

/**
 * Helper function to replace native browser confirms with custom dialogs
 * This is a temporary bridge until full promise-based confirmation is implemented
 */
export function deprecatedNativeConfirm(message) {
  console.warn('Native confirm() detected. Please use showConfirm() instead for better UX');
  return window.confirm(message);
}

// Re-export the original toast function for direct usage if needed
export { toast as directToast } from '@/components/ui/use-toast';
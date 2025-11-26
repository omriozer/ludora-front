/**
 * Custom API Error class that preserves HTTP status codes and detects error types
 * This allows components to detect authentication errors, lazy loading failures,
 * and other error types to handle them appropriately.
 */
export class ApiError extends Error {
  constructor(message, status, response = null, errorType = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.response = response;
    this.errorType = errorType || this.classifyError(message, status);

    // Maintain proper stack trace for debugging
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  /**
   * Classify error type based on message and status
   * @private
   */
  classifyError(message, status) {
    const msg = (message || '').toLowerCase();

    // Authentication errors
    if (status === 401 || status === 403) {
      return 'auth';
    }

    // Lazy loading / module loading errors
    if (msg.includes('loading chunk') ||
        msg.includes('failed to fetch') ||
        msg.includes('dynamically imported module') ||
        msg.includes('loading css chunk')) {
      return 'lazy_load';
    }

    // Network errors
    if (msg.includes('network error') ||
        msg.includes('timeout') ||
        msg.includes('connection') ||
        status === 0 || status === 408 || status === 504) {
      return 'network';
    }

    // Server errors
    if (status >= 500) {
      return 'server';
    }

    // Client errors (excluding auth)
    if (status >= 400) {
      return 'client';
    }

    return 'unknown';
  }

  /**
   * Check if this error is an authentication error (401/403)
   */
  isAuthError() {
    return this.status === 401 || this.status === 403 || this.errorType === 'auth';
  }

  /**
   * Check if this error requires user re-authentication
   */
  requiresReauth() {
    return this.isAuthError();
  }

  /**
   * Check if this error is a lazy loading failure
   */
  isLazyLoadError() {
    return this.errorType === 'lazy_load';
  }

  /**
   * Check if this error is a network failure
   */
  isNetworkError() {
    return this.errorType === 'network';
  }

  /**
   * Check if this error is recoverable (can retry)
   */
  isRecoverable() {
    return this.isNetworkError() || this.isLazyLoadError() || this.isAuthError();
  }

  /**
   * Get Hebrew error message for authentication errors
   */
  getHebrewAuthMessage() {
    if (this.status === 401) {
      return 'פג תוקף ההתחברות. אנא התחבר שנית לאפליקציה.';
    }
    if (this.status === 403) {
      return 'יש בעיה באימות המשתמש. אנא התחבר שנית לאפליקציה.';
    }
    return 'יש בעיה בהתחברות. אנא נסה להתחבר שנית.';
  }

  /**
   * Get Hebrew error message based on error type
   */
  getHebrewMessage() {
    switch (this.errorType) {
      case 'auth':
        return this.getHebrewAuthMessage();

      case 'lazy_load':
        return 'לא ניתן לטעון את הדף. ייתכן שיש בעיה זמנית בחיבור.';

      case 'network':
        return 'בעיה בחיבור לאינטרנט. אנא בדוק את החיבור ונסה שוב.';

      case 'server':
        return 'שגיאת שרת. אנא נסה שוב בעוד כמה רגעים.';

      case 'client':
        return 'בקשה לא תקינה. אנא רענן את הדף ונסה שוב.';

      default:
        return 'אירעה שגיאה. אנא נסה שוב או התחבר מחדש.';
    }
  }

  /**
   * Get suggested recovery action based on error type
   */
  getRecoveryAction() {
    switch (this.errorType) {
      case 'auth':
        return 'login';

      case 'lazy_load':
      case 'network':
        return 'retry';

      case 'server':
        return 'wait_retry';

      default:
        return 'refresh';
    }
  }
}

/**
 * Create ApiError from various error sources
 */
export function createApiError(error, status = null, response = null) {
  if (error instanceof ApiError) {
    return error;
  }

  // Handle fetch/network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return new ApiError(error.message, 0, null, 'network');
  }

  // Handle lazy loading errors (ChunkLoadError)
  if (error.name === 'ChunkLoadError' || error.message.includes('Loading chunk')) {
    return new ApiError(error.message, 0, null, 'lazy_load');
  }

  // General error with status
  return new ApiError(error.message || 'Unknown error', status || 0, response);
}

export default ApiError;
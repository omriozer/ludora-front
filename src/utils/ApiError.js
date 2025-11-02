/**
 * Custom API Error class that preserves HTTP status codes
 * This allows components to detect authentication errors and handle them appropriately
 */
export class ApiError extends Error {
  constructor(message, status, response = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.response = response;

    // Maintain proper stack trace for debugging
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  /**
   * Check if this error is an authentication error (401/403)
   */
  isAuthError() {
    return this.status === 401 || this.status === 403;
  }

  /**
   * Check if this error requires user re-authentication
   */
  requiresReauth() {
    return this.status === 401 || this.status === 403;
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
}

export default ApiError;
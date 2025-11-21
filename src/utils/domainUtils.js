/**
 * Utility functions for domain detection
 * Simple domain detection for student vs teacher portal
 */

/**
 * Checks if the current domain is the student portal
 * @returns {boolean} True if on student portal domain
 */
export const isStudentPortal = () => {
  // Get the configured student domain from environment
  const studentDomain = import.meta.env.VITE_STUDENT_PORTAL_DOMAIN || 'my.ludora.app';
  const currentHostname = window.location.hostname;

  // For development - handle my.localhost subdomain
  if (currentHostname === 'my.localhost') {
    return true;
  }

  // For regular localhost - check port-based detection as fallback
  if (currentHostname === 'localhost') {
    return window.location.port === '5174';
  }

  // For production/staging - exact hostname match
  return currentHostname === studentDomain;
};

/**
 * Gets the current domain type
 * @returns {'student' | 'teacher'} The domain type
 */
export const getDomainType = () => {
  return isStudentPortal() ? 'student' : 'teacher';
};
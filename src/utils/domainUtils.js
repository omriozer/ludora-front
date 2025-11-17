/**
 * Utility functions for domain and subdomain detection
 * Used to determine if user is on student portal vs teacher portal
 */

/**
 * Checks if the current domain is the student portal
 * @returns {boolean} True if on student portal domain
 */
export const isStudentPortal = () => {
  // Get the configured student domain from environment
  const studentDomain = import.meta.env.VITE_STUDENT_PORTAL_DOMAIN || 'my.ludora.app';
  const currentHostname = window.location.hostname;

  // For development - handle localhost with different approaches
  if (currentHostname === 'localhost') {
    // Check if student domain is configured for localhost development
    if (studentDomain.includes('localhost')) {
      return currentHostname === studentDomain.split(':')[0];
    }
    // Default: use port-based detection for development
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

/**
 * Gets the student portal URL for the current environment
 * @returns {string} Full student portal URL
 */
export const getStudentPortalUrl = () => {
  const studentDomain = import.meta.env.VITE_STUDENT_PORTAL_DOMAIN || 'my.ludora.app';

  // Handle localhost development
  if (studentDomain.includes('localhost')) {
    return `http://${studentDomain}`;
  }

  // Production/staging - assume HTTPS
  return `https://${studentDomain}`;
};

/**
 * Gets the main (teacher) portal URL for the current environment
 * @returns {string} Full teacher portal URL
 */
export const getTeacherPortalUrl = () => {
  const frontendUrl = import.meta.env.VITE_FRONTEND_URL;

  if (frontendUrl) {
    return frontendUrl;
  }

  // Fallback construction
  const currentHostname = window.location.hostname;
  const protocol = window.location.protocol;

  if (currentHostname.includes('localhost')) {
    return `${protocol}//localhost:5173`;
  }

  // Remove 'my.' prefix if present to get main domain
  const mainDomain = currentHostname.replace(/^my\./, '');
  return `${protocol}//${mainDomain}`;
};
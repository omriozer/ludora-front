/**
 * Utility functions for checking admin status across portals during maintenance mode
 */

/**
 * Check if there are admin-level access tokens in either portal
 * This helps with maintenance mode bypass when admin is logged into one portal but not the other
 */
export function hasAdminTokensInEitherPortal() {
  // Get all cookies
  const cookies = document.cookie.split('; ').reduce((acc, cookie) => {
    const [key, value] = cookie.split('=');
    acc[key] = value;
    return acc;
  }, {});

  // Check for access tokens in both portals
  const teacherToken = cookies.teacher_access_token;
  const studentToken = cookies.student_access_token;

  // If either token exists, we potentially have admin access
  // This is a quick check - the actual admin verification happens server-side
  return !!(teacherToken || studentToken);
}

/**
 * Quick admin verification by making a lightweight API call
 * Only called if we have tokens and maintenance mode is enabled
 */
export async function quickAdminCheck() {
  try {
    const response = await fetch('/api/auth/me', {
      method: 'GET',
      credentials: 'include', // Include cookies
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const user = await response.json();
      return user && user.role === 'admin' && !user._isImpersonated;
    }
  } catch (error) {
    // If API call fails, don't bypass maintenance mode
    console.warn('Quick admin check failed:', error);
  }

  return false;
}

/**
 * Comprehensive admin check for maintenance mode bypass
 * First checks for current user, then checks for tokens across portals
 */
export async function canBypassMaintenance(currentUser) {
  // Primary check: current user is admin and not impersonated
  if (currentUser?.role === 'admin' && !currentUser?._isImpersonated) {
    return true;
  }

  // Secondary check: look for admin tokens in either portal
  if (hasAdminTokensInEitherPortal()) {
    // Make a quick API call to verify admin status
    return await quickAdminCheck();
  }

  return false;
}
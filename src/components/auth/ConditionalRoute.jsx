import { Navigate, useLocation } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import { isStaff } from '@/lib/userUtils';
import LudoraLoadingSpinner from '@/components/ui/LudoraLoadingSpinner';

/**
 * ConditionalRoute component that protects routes based on system settings visibility
 *
 * @param {string} visibilityField - The settings field to check (e.g., 'nav_files_visibility')
 * @param {React.ReactNode} children - The component to render if access is allowed
 * @param {string} fallbackRoute - Route to redirect to if access is denied (default: '/dashboard' for logged in, '/' for not logged in)
 */
export default function ConditionalRoute({
  children,
  visibilityField,
  fallbackRoute
}) {
  const { currentUser, settings, isLoading } = useUser();
  const location = useLocation();

  // Show loading while user/settings are being fetched
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center" dir="rtl">
        <LudoraLoadingSpinner size="lg" text="טוען הגדרות..." />
      </div>
    );
  }

  // If no visibilityField is provided, use standard ProtectedRoute logic
  if (!visibilityField) {
    if (!currentUser) {
      return <Navigate to="/" state={{ from: location }} replace />;
    }
    return children;
  }

  // Get the visibility setting for this route
  const visibility = settings?.[visibilityField] || 'public';

  // Determine user roles
  const isAdmin = currentUser && isStaff(currentUser);
  const isContentCreator = currentUser && !!currentUser.content_creator_agreement_sign_date;
  const isLoggedIn = !!currentUser;

  // Apply visibility rules
  switch (visibility) {
    case 'public':
      // Anyone can access
      return children;

    case 'logged_in_users':
      // Only authenticated users can access
      if (!isLoggedIn) {
        return <Navigate to="/" state={{ from: location }} replace />;
      }
      return children;

    case 'admin_only':
      // Only admins can access
      if (!isLoggedIn) {
        return <Navigate to="/" state={{ from: location }} replace />;
      }
      if (!isAdmin) {
        const redirectTo = fallbackRoute || '/dashboard';
        return <Navigate to={redirectTo} replace />;
      }
      return children;

    case 'admins_and_creators':
      // Only admins and content creators can access
      if (!isLoggedIn) {
        return <Navigate to="/" state={{ from: location }} replace />;
      }
      if (!isAdmin && !isContentCreator) {
        const redirectTo = fallbackRoute || '/dashboard';
        return <Navigate to={redirectTo} replace />;
      }
      return children;

    case 'hidden':
      // Feature is disabled - redirect
      if (isLoggedIn) {
        const redirectTo = fallbackRoute || '/dashboard';
        return <Navigate to={redirectTo} replace />;
      } else {
        return <Navigate to="/" replace />;
      }

    default:
      // Unknown visibility setting - default to public access
      console.warn(`Unknown visibility setting: ${visibility} for field: ${visibilityField}`);
      return children;
  }
}
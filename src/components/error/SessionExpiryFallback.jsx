import React from 'react';
import { Shield, LogIn, Home, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useUser } from '@/contexts/UserContext';
import { useLoginModal } from '@/hooks/useLoginModal';
import { ludlog } from '@/lib/ludlog';
import { isStudentPortal } from '@/utils/domainUtils';

/**
 * User-friendly session expiry fallback component
 *
 * Shows appropriate Hebrew messages when user sessions expire,
 * providing clear recovery options instead of blank screens.
 *
 * Supports different expiry reasons:
 * - Natural session timeout
 * - Deployment-induced expiry
 * - General authentication errors
 * - Manual logout for security
 */
function SessionExpiryFallback({
  reason = 'session_expired',
  title,
  description,
  showSecurityNote = true,
  onCustomAction,
  customActionText
}) {
  const { currentUser, logout } = useUser();
  const { openLoginModal } = useLoginModal();
  const isOnStudentPortal = isStudentPortal();

  // Get appropriate messages based on reason and portal
  const getMessage = () => {
    switch (reason) {
      case 'session_expired':
        return {
          title: title || 'פג תוקף ההתחברות',
          description: description || 'הפעלה הסתיימה כדי להגן על החשבון שלך. אנא התחבר שנית למשך השימוש.',
          icon: Clock,
          color: 'blue'
        };

      case 'deployment':
        return {
          title: title || 'המערכת עודכנה',
          description: description || 'המערכת עודכנה עם שיפורים חדשים. אנא התחבר שנית לטעינת הגרסה החדשה.',
          icon: Shield,
          color: 'green'
        };

      case 'security':
        return {
          title: title || 'התנתקת מטעמי אבטחה',
          description: description || 'התנתקת אוטומטית כדי להגן על החשבון שלך. אנא התחבר שנית להמשך השימוש.',
          icon: Shield,
          color: 'yellow'
        };

      case 'auth_error':
      default:
        return {
          title: title || 'נדרש להתחבר שנית',
          description: description || 'אירעה שגיאה באימות. אנא התחבר שנית להמשך השימוש באפליקציה.',
          icon: LogIn,
          color: 'red'
        };
    }
  };

  const message = getMessage();
  const IconComponent = message.icon;

  const handleLogin = () => {
    ludlog.auth('User clicked login from session expiry fallback', {
      reason,
      portal: isOnStudentPortal ? 'student' : 'teacher',
      wasLoggedIn: !!currentUser
    });

    if (currentUser) {
      // Clear any stale session data
      logout();
    }

    // Open appropriate login based on portal
    if (isOnStudentPortal) {
      // For student portal, redirect to login page or show student login
      openLoginModal();
    } else {
      // For teacher portal, use standard login modal
      openLoginModal();
    }
  };

  const handleGoHome = () => {
    ludlog.ui('User navigating to home from session expiry fallback', {
      reason,
      portal: isOnStudentPortal ? 'student' : 'teacher'
    });

    // Navigate to appropriate home page
    const homeUrl = isOnStudentPortal ? '/' : '/';
    window.location.href = homeUrl;
  };

  const getColorClasses = (color) => {
    const colorMap = {
      blue: {
        icon: 'text-blue-600',
        alert: 'border-blue-200 bg-blue-50',
        button: 'bg-blue-600 hover:bg-blue-700'
      },
      green: {
        icon: 'text-green-600',
        alert: 'border-green-200 bg-green-50',
        button: 'bg-green-600 hover:bg-green-700'
      },
      yellow: {
        icon: 'text-yellow-600',
        alert: 'border-yellow-200 bg-yellow-50',
        button: 'bg-yellow-600 hover:bg-yellow-700'
      },
      red: {
        icon: 'text-red-600',
        alert: 'border-red-200 bg-red-50',
        button: 'bg-red-600 hover:bg-red-700'
      }
    };
    return colorMap[color] || colorMap.blue;
  };

  const colors = getColorClasses(message.color);

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gray-50">
      <Card className="max-w-md w-full shadow-lg">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-3">
            <IconComponent className={`w-16 h-16 ${colors.icon}`} />
          </div>
          <CardTitle className="text-xl font-semibold text-gray-900">
            {message.title}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <Alert className={colors.alert}>
            <AlertDescription className="text-sm text-gray-700 text-center leading-relaxed">
              {message.description}
            </AlertDescription>
          </Alert>

          {showSecurityNote && (
            <div className="text-xs text-gray-500 text-center bg-gray-50 p-3 rounded">
              <Shield className="w-4 h-4 inline ml-1" />
              ההתחברות מחדש מבטיחה שהחשבון שלך מוגן ובטוח
            </div>
          )}

          <div className="space-y-3 pt-2">
            {/* Primary action - Login */}
            <Button
              onClick={handleLogin}
              className={`w-full ${colors.button} text-white font-medium`}
              size="lg"
            >
              <LogIn className="w-5 h-5 ml-2" />
              התחבר שנית
            </Button>

            {/* Custom action if provided */}
            {onCustomAction && customActionText && (
              <Button
                onClick={onCustomAction}
                variant="outline"
                className="w-full"
              >
                {customActionText}
              </Button>
            )}

            {/* Secondary action - Home */}
            <Button
              onClick={handleGoHome}
              variant="ghost"
              className="w-full text-gray-600 hover:text-gray-700"
            >
              <Home className="w-4 h-4 ml-2" />
              {isOnStudentPortal ? 'לדף התלמידים' : 'לעמוד הבית'}
            </Button>
          </div>

          {/* Additional portal-specific information */}
          {isOnStudentPortal && (
            <div className="text-xs text-center text-gray-500 mt-4 p-2 bg-gray-50 rounded">
              {reason === 'deployment' ?
                'המערכת התעדכנה עם תכנים חדשים ומשחקים מעניינים!' :
                'בבעיה? פנה למורה שלך לעזרה'
              }
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Predefined session expiry reasons for common scenarios
 */
export const SessionExpiryReasons = {
  SESSION_EXPIRED: 'session_expired',
  DEPLOYMENT: 'deployment',
  SECURITY: 'security',
  AUTH_ERROR: 'auth_error'
};

/**
 * Quick helper components for common scenarios
 */
export const SessionExpiredFallback = (props) => (
  <SessionExpiryFallback reason={SessionExpiryReasons.SESSION_EXPIRED} {...props} />
);

export const DeploymentLogoutFallback = (props) => (
  <SessionExpiryFallback reason={SessionExpiryReasons.DEPLOYMENT} {...props} />
);

export const SecurityLogoutFallback = (props) => (
  <SessionExpiryFallback reason={SessionExpiryReasons.SECURITY} {...props} />
);

export const AuthErrorFallback = (props) => (
  <SessionExpiryFallback reason={SessionExpiryReasons.AUTH_ERROR} {...props} />
);

export default SessionExpiryFallback;
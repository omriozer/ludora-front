import React from 'react';
import { AlertCircle, RefreshCw, Home, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useUser } from '@/contexts/UserContext';
import { useLoginModal } from '@/hooks/useLoginModal';
import { useGlobalAuthErrorHandler } from '@/components/providers/AuthErrorProvider';
import { ludlog, luderror } from '@/lib/ludlog';

/**
 * React Error Boundary for Lazy Loading Failures
 *
 * Catches errors from React.lazy() component loading failures and provides
 * user-friendly Hebrew error messages instead of blank screens.
 *
 * Handles:
 * - Network failures during chunk loading
 * - Authentication failures during component fetch
 * - Module loading timeouts
 * - General lazy loading errors
 */
class LazyLoadErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorType: 'unknown'
    };
  }

  static getDerivedStateFromError(error) {
    // Determine error type based on error characteristics
    const errorType = LazyLoadErrorBoundary.classifyError(error);

    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorType
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error with appropriate categorization
    this.setState({ errorInfo });

    const { errorType } = this.state;

    if (errorType === 'auth') {
      luderror.auth.prod('Lazy loading failed due to auth error', error, {
        errorInfo,
        componentStack: errorInfo.componentStack,
        url: window.location.href
      });
    } else if (errorType === 'network') {
      luderror.media('Lazy loading failed due to network error', error, {
        errorInfo,
        componentStack: errorInfo.componentStack,
        url: window.location.href
      });
    } else {
      luderror.ui('Lazy loading failed with unknown error', error, {
        errorInfo,
        componentStack: errorInfo.componentStack,
        url: window.location.href
      });
    }
  }

  /**
   * Classify error type based on error message and characteristics
   */
  static classifyError(error) {
    const message = error?.message?.toLowerCase() || '';

    // Check for authentication-related errors
    if (message.includes('401') || message.includes('403') ||
        message.includes('unauthorized') || message.includes('forbidden')) {
      return 'auth';
    }

    // Check for network/loading errors
    if (message.includes('loading chunk') || message.includes('failed to fetch') ||
        message.includes('network error') || message.includes('timeout')) {
      return 'network';
    }

    // Check for module loading errors specifically
    if (message.includes('loading css chunk') || message.includes('dynamically imported module')) {
      return 'network'; // Treat module errors as network issues
    }

    return 'general';
  }

  /**
   * Get Hebrew error message based on error type
   */
  getHebrewErrorMessage() {
    const { errorType } = this.state;

    switch (errorType) {
      case 'auth':
        return {
          title: 'נדרש התחברות מחדש',
          description: 'פג תוקף ההתחברות. אנא התחבר שנית להמשך השימוש.',
          suggestion: 'התחבר שנית'
        };

      case 'network':
        return {
          title: 'בעיה בטעינת הדף',
          description: 'לא ניתן לטעון את הדף. ייתכן שיש בעיה זמנית בחיבור לאינטרנט.',
          suggestion: 'נסה שנית'
        };

      default:
        return {
          title: 'אירעה שגיאה',
          description: 'אירעה שגיאה בטעינת הדף. אנא התחבר שנית או נסה שוב.',
          suggestion: 'התחבר שנית כדי להגן על החשבון'
        };
    }
  }

  /**
   * Reset error boundary state to retry
   */
  retry = () => {
    ludlog.ui('User retrying after lazy load error', {
      errorType: this.state.errorType,
      url: window.location.href
    });

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorType: 'unknown'
    });
  };

  render() {
    if (this.state.hasError) {
      return <LazyLoadErrorFallback
        error={this.state.error}
        errorType={this.state.errorType}
        errorMessage={this.getHebrewErrorMessage()}
        onRetry={this.retry}
      />;
    }

    return this.props.children;
  }
}

/**
 * Fallback UI component shown when lazy loading fails
 */
function LazyLoadErrorFallback({ error, errorType, errorMessage, onRetry }) {
  const { currentUser, logout } = useUser();
  const { openLoginModal } = useLoginModal();
  const authErrorHandler = useGlobalAuthErrorHandler();

  const handleLogin = () => {
    ludlog.auth('User clicked login from lazy load error boundary', {
      errorType,
      wasLoggedIn: !!currentUser
    });

    if (currentUser) {
      // User is logged in but having auth issues - force logout first
      logout();
    }

    // Open login modal with callback to retry after successful login
    openLoginModal(() => {
      ludlog.auth('Login successful from lazy load error boundary, retrying');
      // Small delay to ensure auth state is updated
      setTimeout(onRetry, 500);
    });
  };

  const handleGoHome = () => {
    ludlog.ui('User navigating to home from lazy load error boundary', { errorType });
    window.location.href = '/';
  };

  const isAuthError = errorType === 'auth';
  const isNetworkError = errorType === 'network';

  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <AlertCircle
              className={`w-12 h-12 ${
                isAuthError ? 'text-yellow-600' :
                isNetworkError ? 'text-blue-600' :
                'text-red-600'
              }`}
            />
          </div>
          <CardTitle className="text-lg">
            {errorMessage.title}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <Alert className={`${
            isAuthError ? 'border-yellow-200 bg-yellow-50' :
            isNetworkError ? 'border-blue-200 bg-blue-50' :
            'border-red-200 bg-red-50'
          }`}>
            <AlertDescription className="text-sm text-gray-600 text-center">
              {errorMessage.description}
            </AlertDescription>
          </Alert>

          <div className="flex flex-col gap-2">
            {isAuthError ? (
              <>
                {/* Auth error - prioritize login */}
                <Button
                  onClick={handleLogin}
                  className="w-full"
                  variant="default"
                >
                  <LogIn className="w-4 h-4 ml-2" />
                  התחבר שנית
                </Button>
                <Button
                  onClick={onRetry}
                  variant="outline"
                  className="w-full"
                >
                  <RefreshCw className="w-4 h-4 ml-2" />
                  נסה שוב
                </Button>
              </>
            ) : (
              <>
                {/* Network/General error - prioritize retry */}
                <Button
                  onClick={onRetry}
                  className="w-full"
                  variant="default"
                >
                  <RefreshCw className="w-4 h-4 ml-2" />
                  נסה שוב
                </Button>
                {currentUser && (
                  <Button
                    onClick={handleLogin}
                    variant="outline"
                    className="w-full"
                  >
                    <LogIn className="w-4 h-4 ml-2" />
                    התחבר שנית
                  </Button>
                )}
              </>
            )}

            <Button
              onClick={handleGoHome}
              variant="ghost"
              className="w-full"
            >
              <Home className="w-4 h-4 ml-2" />
              לעמוד הבית
            </Button>
          </div>

          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4 text-xs">
              <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                פרטי שגיאה (מצב פיתוח)
              </summary>
              <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-32 text-left" dir="ltr">
                {error?.stack || error?.message || 'Unknown error'}
              </pre>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default LazyLoadErrorBoundary;
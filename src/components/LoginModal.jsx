import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Loader2, AlertCircle, GamepadIcon } from "lucide-react";
import { ludlog, luderror } from '@/lib/ludlog';
import { APP_VERSION } from "@/constants/version";
import { useUser } from "@/contexts/UserContext";
import { isStudentPortal } from '@/utils/domainUtils';

export default function LoginModal({ onClose, onLogin, message }) {
  const { playerLogin, settings } = useUser();

  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isPlayerLoggingIn, setIsPlayerLoggingIn] = useState(false);
  const [error, setError] = useState('');
  const [playerError, setPlayerError] = useState('');
  const [privacyCode, setPrivacyCode] = useState('');

  const handleGoogleSignIn = async () => {
    setIsLoggingIn(true);
    setError('');
    setPlayerError(''); // Clear player errors when switching to user login

    try {
      await onLogin();
      // Don't call onClose() here - let the parent component handle modal closing
    } catch (err) {
      luderror.ui('Google sign-in error:', err);

      let errorMessage = 'שגיאה בכניסה. נסו שוב.';

      if (err.message) {
        if (err.message.includes('popup-closed-by-user')) {
          errorMessage = 'ההתחברות בוטלה על ידי המשתמש.';
        } else if (err.message.includes('Firebase not initialized')) {
          errorMessage = 'שירות ההתחברות אינו זמין כעת.';
        } else if (err.message.includes('auth/invalid-api-key')) {
          errorMessage = 'בעיה בהגדרות הזיהוי. צרו קשר עם התמיכה.';
        }
      }

      setError(errorMessage);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handlePlayerLogin = async (e) => {
    e.preventDefault();

    if (!privacyCode.trim()) {
      setPlayerError('אנא הזינו קוד פרטיות');
      return;
    }

    setIsPlayerLoggingIn(true);
    setPlayerError('');
    setError(''); // Clear user errors when switching to player login

    try {
      await playerLogin(privacyCode.trim().toUpperCase());
      // Close modal on successful player login and call success callback
      onClose();
      // Execute any pending retry callback if this was triggered by auth error handler
      if (onLogin && typeof onLogin === 'function') {
        onLogin();
      }
    } catch (err) {
      luderror.auth('Player login error:', err);

      let errorMessage;

      // Always show the actual API error message if available
      if (err.message) {
        // For specific known errors, provide Hebrew translations
        if (err.message.includes('Invalid privacy code')) {
          errorMessage = 'קוד הפרטיות שהוזן אינו תקין';
        } else if (err.message.includes('Player not found')) {
          errorMessage = 'לא נמצא שחקן עם קוד זה';
        } else if (err.message.includes('Network Error')) {
          errorMessage = 'בעיית רשת. אנא בדוק את החיבור לאינטרנט';
        } else {
          // Show the actual API error message for everything else
          errorMessage = err.message;
        }
      } else {
        // Only use generic message as last resort
        errorMessage = 'קוד פרטיות שגוי או לא קיים. אנא בדוק את הקוד ונסה שוב.';
      }

      setPlayerError(errorMessage);
    } finally {
      setIsPlayerLoggingIn(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-sm mx-auto bg-white shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
          <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2 flex-1 min-w-0">
            <div className="w-7 h-7 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-base">L</span>
            </div>
            <span className="truncate">התחברות ללודורה</span>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 hover:bg-gray-100 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4 px-4 pb-6">
          <div className="text-center text-sm text-gray-600 mb-6">
            {message || "השתמשו בחשבון הגוגל שלכם כדי להתחבר"}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-right text-sm">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleGoogleSignIn}
            disabled={isLoggingIn}
            className="w-full h-12 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 shadow-sm flex items-center justify-center gap-3 text-sm"
          >
            {isLoggingIn ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>מתחבר...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>המשיכו עם Google</span>
              </>
            )}
          </Button>

          {/* Conditionally show player login section - only in student portal and not during maintenance mode */}
          {isStudentPortal() && !settings?.maintenance_mode && (
            <>
              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">או</span>
                </div>
              </div>

              {/* Student/Player Login Section */}
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-base font-semibold text-gray-900 flex items-center justify-center gap-2">
                    <GamepadIcon className="w-4 h-4 text-purple-600" />
                    <span>התחברות תלמיד</span>
                  </h3>
                  <p className="text-xs text-gray-600 mt-1">
                    הזינו את קוד הפרטיות שקיבלתם מהמורה
                  </p>
                </div>

                {playerError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-right text-sm">
                      {playerError}
                    </AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handlePlayerLogin} className="space-y-4">
                  <div>
                    <Label htmlFor="privacy-code" className="text-sm font-medium text-gray-700">
                      קוד פרטיות (8 תווים)
                    </Label>
                    <Input
                      id="privacy-code"
                      type="text"
                      value={privacyCode}
                      onChange={(e) => setPrivacyCode(e.target.value.toUpperCase())}
                      placeholder="לדוגמה: AB3X7KM9"
                      maxLength={8}
                      className="mt-1 h-12 text-center uppercase font-mono tracking-wider text-base"
                      disabled={isPlayerLoggingIn}
                      autoComplete="off"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isPlayerLoggingIn || !privacyCode.trim()}
                    className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center gap-3 text-sm"
                  >
                    {isPlayerLoggingIn ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>מתחבר...</span>
                      </>
                    ) : (
                      <>
                        <GamepadIcon className="w-4 h-4" />
                        <span>התחבר כתלמיד</span>
                      </>
                    )}
                  </Button>
                </form>
              </div>
            </>
          )}

          <div className="text-center text-xs text-gray-500 mt-4">
            על ידי התחברות, אתם מסכימים ל
            <Link
              to="/terms"
              className="text-blue-600 hover:text-blue-800 underline mx-1"
              onClick={onClose}
            >
              תנאי השימוש
            </Link>
            ול
            <Link
              to="/privacy"
              className="text-blue-600 hover:text-blue-800 underline mx-1"
              onClick={onClose}
            >
              מדיניות הפרטיות
            </Link>
            שלנו
          </div>

          <div className="text-center text-xs text-gray-400 mt-3">
            גרסה {APP_VERSION}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
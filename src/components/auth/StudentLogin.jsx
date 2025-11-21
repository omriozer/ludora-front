import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertCircle, GamepadIcon, GraduationCap, UserIcon, HelpCircle, X } from 'lucide-react';
import { cerror } from '@/lib/utils';
import { useUser } from '@/contexts/UserContext';
import { useLoginModal } from '@/hooks/useLoginModal';
import { loginWithFirebase } from '@/services/apiClient';
import { firebaseAuth } from '@/lib/firebase';
import { showSuccess, showError } from '@/utils/messaging';
import { STUDENTS_ACCESS_MODES } from '@/utils/portalContext';
import { STUDENT_GRADIENTS } from '@/styles/studentsColorSchema';
import { APP_VERSION } from '@/constants/version';
import logo from '../../assets/images/logo.png';

/**
 * StudentLogin Component
 *
 * Landing page for student portal authentication.
 * Adapts UI based on students_access setting:
 * - invite_only: Shows only privacy code login
 * - authed_only: Shows only Firebase (Google) login
 * - all: Shows both options
 *
 * Uses existing LoginModal patterns with student portal theming.
 */
const StudentLogin = ({ onLoginSuccess, returnPath, onClose }) => {
  const navigate = useNavigate();
  const {
    playerLogin,
    login,
    settings,
    isAuthenticated,
    isPlayerAuthenticated
  } = useUser();

  // Login states
  const [isGoogleLoggingIn, setIsGoogleLoggingIn] = useState(false);
  const [isPlayerLoggingIn, setIsPlayerLoggingIn] = useState(false);
  const [googleError, setGoogleError] = useState('');
  const [playerError, setPlayerError] = useState('');
  const [privacyCode, setPrivacyCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loginMode, setLoginMode] = useState('existing'); // 'existing' or 'new'
  const [showPrivacyPopup, setShowPrivacyPopup] = useState(false);

  // Get students_access mode from settings (default to 'all' for maximum accessibility)
  const studentsAccessMode = settings?.students_access || STUDENTS_ACCESS_MODES.ALL;

  // Determine which auth options to show
  const showPlayerLogin = studentsAccessMode === STUDENTS_ACCESS_MODES.INVITE_ONLY ||
                          studentsAccessMode === STUDENTS_ACCESS_MODES.ALL;
  const showGoogleLogin = studentsAccessMode === STUDENTS_ACCESS_MODES.AUTHED_ONLY ||
                          studentsAccessMode === STUDENTS_ACCESS_MODES.ALL;

  // Handle successful login
  const handleLoginComplete = () => {
    if (onLoginSuccess) {
      onLoginSuccess();
    } else if (returnPath) {
      navigate(returnPath);
    }
  };

  // Google Sign-In handler (reuses LoginModal pattern)
  const handleGoogleSignIn = async () => {
    setIsGoogleLoggingIn(true);
    setGoogleError('');
    setPlayerError('');

    try {
      const { user, idToken } = await firebaseAuth.signInWithGoogle();
      const apiResult = await loginWithFirebase({ idToken });

      if (apiResult.valid && apiResult.user) {
        await login(apiResult.user, false);
        showSuccess('התחברת בהצלחה!');
        handleLoginComplete();
      } else {
        throw new Error('Authentication failed');
      }
    } catch (err) {
      cerror('Google sign-in error:', err);

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

      setGoogleError(errorMessage);
    } finally {
      setIsGoogleLoggingIn(false);
    }
  };

  // Player login handler (handles both existing and new players)
  const handlePlayerLogin = async (e) => {
    e.preventDefault();

    if (loginMode === 'existing') {
      // Existing player - use privacy code
      if (!privacyCode.trim()) {
        setPlayerError('אנא הזינו קוד פרטיות');
        return;
      }
    } else {
      // New player - use display name
      if (!displayName.trim()) {
        setPlayerError('אנא הזינו שם להצגה');
        return;
      }
    }

    setIsPlayerLoggingIn(true);
    setPlayerError('');
    setGoogleError('');

    try {
      if (loginMode === 'existing') {
        // Login with existing privacy code
        await playerLogin(privacyCode.trim().toUpperCase());
      } else {
        // Create new player with display name
        await handleCreateNewPlayer(displayName.trim());
      }
      handleLoginComplete();
    } catch (err) {
      cerror('Player login error:', err);

      let errorMessage;
      if (loginMode === 'existing') {
        errorMessage = 'קוד פרטיות שגוי או לא קיים. אנא בדוק את הקוד ונסה שוב.';
        if (err.message?.includes('Invalid privacy code')) {
          errorMessage = 'קוד הפרטיות שהוזן אינו תקין';
        } else if (err.message?.includes('Player not found')) {
          errorMessage = 'לא נמצא שחקן עם קוד זה';
        }
      } else {
        errorMessage = 'שגיאה ביצירת שחקן חדש. נסו שוב.';
        if (err.message?.includes('Display name already exists')) {
          errorMessage = 'שם זה כבר קיים, בחרו שם אחר';
        }
      }

      if (err.message?.includes('Network Error')) {
        errorMessage = 'בעיית רשת. אנא בדוק את החיבור לאינטרנט';
      }

      setPlayerError(errorMessage);
    } finally {
      setIsPlayerLoggingIn(false);
    }
  };

  // Create new player handler
  const handleCreateNewPlayer = async (name) => {
    try {
      // Call Player API to create new player
      // This will need to be implemented on the backend
      const response = await fetch('/api/players/create-anonymous', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          display_name: name
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create player');
      }

      const data = await response.json();

      if (data.success && data.player) {
        // Login with the newly created player's privacy code
        await playerLogin(data.player.privacy_code);
        showSuccess(`ברוך הבא ${name}! קוד הפרטיות שלך: ${data.player.privacy_code}`);
      } else {
        throw new Error('Failed to create player');
      }
    } catch (error) {
      cerror('Create player error:', error);
      throw error;
    }
  };

  // Get mode-specific messaging
  const getModeMessage = () => {
    switch (studentsAccessMode) {
      case STUDENTS_ACCESS_MODES.INVITE_ONLY:
        return 'הזינו את קוד הפרטיות שקיבלתם מהמורה';
      case STUDENTS_ACCESS_MODES.AUTHED_ONLY:
        return 'התחברו עם חשבון הגוגל שלכם';
      case STUDENTS_ACCESS_MODES.ALL:
      default:
        return 'בחרו את דרך ההתחברות שלכם';
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: STUDENT_GRADIENTS.pageBackground, backgroundSize: '400% 400%' }}
    >
      <Card className="w-full max-w-md mx-auto bg-white/95 backdrop-blur-sm shadow-2xl border-0 rounded-3xl overflow-hidden">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 pt-6">
          {/* Logo and Title Section */}
          <div className="flex flex-col items-center w-full">
            {/* Logo */}
            <div className="flex justify-center mb-4">
              {logo || settings?.logo_url ? (
                <img
                  src={logo || settings?.logo_url}
                  alt={settings?.site_name || "לודורה"}
                  className="h-16 w-16 object-contain"
                />
              ) : (
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <GraduationCap className="w-10 h-10 text-white" />
                </div>
              )}
            </div>

            <CardTitle className="text-2xl font-bold text-gray-900 text-center">
              כניסה לפורטל התלמידים
            </CardTitle>
            <p className="text-gray-600 mt-2 text-center">{getModeMessage()}</p>
          </div>

          {/* Close Button */}
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 hover:bg-gray-100 flex-shrink-0 mt-2"
              aria-label="סגור"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </CardHeader>

        <CardContent className="space-y-6 p-6">
          {/* Google Login Section */}
          {showGoogleLogin && (
            <div className="space-y-4">
              {studentsAccessMode === STUDENTS_ACCESS_MODES.ALL && (
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center justify-center gap-2">
                    <UserIcon className="w-5 h-5 text-blue-600" />
                    התחברות עם חשבון
                  </h3>
                </div>
              )}

              {googleError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-right">
                    {googleError}
                  </AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoggingIn}
                className="w-full h-12 bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-200 shadow-sm flex items-center justify-center gap-3 rounded-xl transition-all hover:shadow-md"
              >
                {isGoogleLoggingIn ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    מתחבר...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    המשיכו עם Google
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Divider - only show when both options available */}
          {showGoogleLogin && showPlayerLogin && (
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-4 text-gray-500 font-medium">או</span>
              </div>
            </div>
          )}

          {/* Player/Student Login Section */}
          {showPlayerLogin && (
            <div className="space-y-4">
              {studentsAccessMode === STUDENTS_ACCESS_MODES.ALL && (
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center justify-center gap-2">
                    <GamepadIcon className="w-5 h-5 text-purple-600" />
                    התחברות תלמיד
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    בחרו את דרך ההתחברות שלכם
                  </p>
                </div>
              )}

              {/* Toggle buttons for login mode */}
              <div className="flex bg-gray-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setLoginMode('existing');
                    setPlayerError('');
                    setPrivacyCode('');
                  }}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                    loginMode === 'existing'
                      ? 'bg-white text-purple-700 shadow-sm'
                      : 'text-gray-600 hover:text-purple-700'
                  }`}
                >
                  יש לי קוד פרטיות
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoginMode('new');
                    setPlayerError('');
                    setDisplayName('');
                  }}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                    loginMode === 'new'
                      ? 'bg-white text-purple-700 shadow-sm'
                      : 'text-gray-600 hover:text-purple-700'
                  }`}
                >
                  אני תלמיד חדש
                </button>
              </div>

              {playerError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-right">
                    {playerError}
                  </AlertDescription>
                </Alert>
              )}

              <form onSubmit={handlePlayerLogin} className="space-y-4">
                {loginMode === 'existing' ? (
                  /* Existing Player - Privacy Code */
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
                      className="mt-1 text-center uppercase font-mono tracking-wider h-12 text-lg border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-purple-200"
                      disabled={isPlayerLoggingIn}
                      autoComplete="off"
                    />
                    <p className="text-xs text-gray-500 mt-1 text-center">
                      הזינו את הקוד שקיבלתם מהמורה
                    </p>
                  </div>
                ) : (
                  /* New Player - Display Name */
                  <div>
                    <Label htmlFor="display-name" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      {showGoogleLogin
                        ? 'השם שלכם (יוצג למורה ולתלמידים האחרים)'
                        : 'שם לתצוגה בלבד (שם שלא מזהה אתכם שיוצג לאחרים מטעמי פרטיות)'
                      }
                      {!showGoogleLogin && (
                        <button
                          type="button"
                          onClick={() => setShowPrivacyPopup(true)}
                          className="text-blue-500 hover:text-blue-700 transition-colors"
                          aria-label="הסבר על הגנת הפרטיות"
                        >
                          <HelpCircle className="w-4 h-4" />
                        </button>
                      )}
                    </Label>
                    <Input
                      id="display-name"
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="לדוגמה: דני כהן"
                      maxLength={50}
                      className="mt-1 h-12 text-lg border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-purple-200"
                      disabled={isPlayerLoggingIn}
                      autoComplete="given-name"
                    />
                    <p className="text-xs text-gray-500 mt-1 text-center">
                      תקבלו קוד פרטיות לכניסות עתידיות
                    </p>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={
                    isPlayerLoggingIn ||
                    (loginMode === 'existing' && !privacyCode.trim()) ||
                    (loginMode === 'new' && !displayName.trim())
                  }
                  className="w-full h-12 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3"
                  style={{ background: STUDENT_GRADIENTS.primaryButton }}
                >
                  {isPlayerLoggingIn ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {loginMode === 'existing' ? 'מתחבר...' : 'יוצר שחקן חדש...'}
                    </>
                  ) : (
                    <>
                      <GamepadIcon className="w-5 h-5" />
                      {loginMode === 'existing' ? 'התחבר עם הקוד' : 'צור שחקן חדש'}
                    </>
                  )}
                </Button>
              </form>
            </div>
          )}

          {/* Help text */}
          <div className="text-center text-sm text-gray-500 pt-4 border-t border-gray-100">
            <p>
              {studentsAccessMode === STUDENTS_ACCESS_MODES.INVITE_ONLY
                ? 'קיבלתם קוד פרטיות מהמורה? הזינו אותו למעלה.'
                : 'צריכים עזרה? פנו למורה שלכם.'}
            </p>
          </div>

          {/* Terms and Privacy Footer - matching original LoginModal */}
          <div className="text-center text-sm text-gray-500 mt-4">
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

          {/* Version Footer - matching original LoginModal */}
          <div className="text-center text-xs text-gray-400 mt-4">
            גרסה {APP_VERSION}
          </div>
        </CardContent>
      </Card>

      {/* Privacy Protection Explanation Popup */}
      {showPrivacyPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <HelpCircle className="w-6 h-6 text-blue-500" />
                הגנת פרטיות
              </h3>
              <button
                onClick={() => setShowPrivacyPopup(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="סגור"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="text-right space-y-3 text-gray-700">
              <p>
                על פי חוקי הגנת הפרטיות, אנו מבטיחים שהשם שתזינו:
              </p>

              <ul className="list-disc list-inside space-y-2 mr-4">
                <li>לא יזהה אתכם באופן אישי</li>
                <li>ישמש רק להצגה במשחקים ופעילויות</li>
                <li>לא יישמר יחד עם מידע מזהה</li>
                <li>יוסר אוטומטית בסיום הפעילות</li>
              </ul>

              <p className="text-sm text-gray-600 mt-4">
                המערכת מבטיחה הגנה מלאה על פרטיותכם ועל זכותכם לאנונימיות.
              </p>
            </div>

            <div className="mt-6">
              <Button
                onClick={() => setShowPrivacyPopup(false)}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-xl"
              >
                הבנתי
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentLogin;

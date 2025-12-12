import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertCircle, GamepadIcon, GraduationCap, UserIcon, HelpCircle, X } from 'lucide-react';
import { ludlog, luderror } from '@/lib/ludlog';
import { useUser } from '@/contexts/UserContext';
import { useLoginModal } from '@/hooks/useLoginModal';
import { loginWithFirebase, apiRequest, apiRequestAnonymous } from '@/services/apiClient';
import { firebaseAuth } from '@/lib/firebase';
import { showSuccess, showError } from '@/utils/messaging';
import { STUDENTS_ACCESS_MODES } from '@/utils/portalContext';
import { STUDENT_GRADIENTS } from '@/styles/studentsColorSchema';
import { APP_VERSION } from '@/constants/version';
import PlayerWelcomeModal from '@/components/dialogs/PlayerWelcomeModal';
import TeacherAssignmentConfirmation from '@/components/dialogs/TeacherAssignmentConfirmation';
import LogoDisplay from '@/components/ui/LogoDisplay';
import ConfirmationDialog from '@/components/ui/confirmation-dialog';

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
  const location = useLocation();
  const {
    playerLogin,
    login,
    userLoginSuccessMsg,
    settings
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

  // Teacher connection error handling states
  const [teacherConnectionError, setTeacherConnectionError] = useState(null);
  const [showInvitationFlow, setShowInvitationFlow] = useState(false);
  const [invitationCode, setInvitationCode] = useState('');
  const [isInvitationSubmitting, setIsInvitationSubmitting] = useState(false);
  const [pendingLoginData, setPendingLoginData] = useState(null); // Store login data for retry

  // Teacher assignment confirmation states
  const [showTeacherAssignment, setShowTeacherAssignment] = useState(false);
  const [teacherAssignmentData, setTeacherAssignmentData] = useState(null);
  const [isAssigningTeacher, setIsAssigningTeacher] = useState(false);
  const [detectedTeacher, setDetectedTeacher] = useState(null);
  const [justAssignedTeacher, setJustAssignedTeacher] = useState(null); // Track recent teacher assignment

  // Welcome modal state
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [newPlayerData, setNewPlayerData] = useState(null);

  // Teacher connection failed dialog state
  const [showTeacherConnectionFailedDialog, setShowTeacherConnectionFailedDialog] = useState(false);

  // Get students_access mode from settings (default to 'all' for maximum accessibility)
  const studentsAccessMode = settings?.students_access || STUDENTS_ACCESS_MODES.ALL;

  // Determine which auth options to show
  const showPlayerLogin = studentsAccessMode === STUDENTS_ACCESS_MODES.INVITE_ONLY ||
                          studentsAccessMode === STUDENTS_ACCESS_MODES.ALL;
  const showGoogleLogin = studentsAccessMode === STUDENTS_ACCESS_MODES.AUTHED_ONLY ||
                          studentsAccessMode === STUDENTS_ACCESS_MODES.ALL;

  // Teacher detection logic - check various sources for teacher context
  useEffect(() => {
    const detectTeacherContext = async () => {
      try {
        // Check various sources for teacher information
        let teacherInfo = null;
        let teacherId = null;
        let userCode = null;

        // 1. Check URL path for teacher portal patterns (/portal/USERCODE)
        const pathMatch = location.pathname.match(/\/portal\/([A-Z0-9]+)$/i);
        if (pathMatch) {
          userCode = pathMatch[1];
          ludlog.ui('Detected teacher portal URL with userCode:', userCode);
        }

        // 2. Check URL parameters (e.g., from teacher portal redirects)
        const urlParams = new URLSearchParams(location.search);
        teacherId = urlParams.get('teacher_id');

        // 3. Check location state (from navigation)
        if (!teacherId && location.state?.teacher_id) {
          teacherId = location.state.teacher_id;
        }

        // 4. Check sessionStorage for pending teacher connection
        if (!teacherId) {
          const pendingTeacherId = sessionStorage.getItem('pendingTeacherId');
          if (pendingTeacherId) {
            teacherId = pendingTeacherId;
          }
        }

        // 5. Check for teacher information from teacher portal context
        if (!teacherId && location.state?.teacher) {
          teacherInfo = location.state.teacher;
          teacherId = teacherInfo.id;
        }

        // 6. If we have a userCode from URL, fetch teacher info using the teacher catalog endpoint
        if (userCode && !teacherId) {
          try {
            ludlog.ui('Fetching teacher info using userCode:', userCode);
            const response = await apiRequestAnonymous(`/games/teacher/${userCode}`);

            if (response && response.teacher) {
              teacherInfo = {
                id: response.teacher.id,
                name: response.teacher.name || response.teacher.full_name || 'המורה',
                full_name: response.teacher.full_name || response.teacher.name || 'המורה'
              };
              teacherId = response.teacher.id;
              ludlog.ui('Successfully fetched teacher info from userCode:', teacherInfo);
            }
          } catch (error) {
            luderror.ui('Failed to fetch teacher info from userCode:', userCode, error);
            // Continue with normal flow if teacher fetch fails
          }
        }

        // 7. If we found a teacher ID but no teacher info, fetch teacher details
        if (teacherId && !teacherInfo) {
          try {
            // Try to fetch teacher information (this might fail if not accessible)
            const response = await apiRequest(`/users/${teacherId}`, {
              method: 'GET'
            });

            if (response && response.user_type === 'teacher') {
              teacherInfo = {
                id: response.id,
                name: response.display_name || response.full_name,
                full_name: response.full_name
              };
            }
          } catch (error) {
            // If we can't fetch teacher info, create a basic object
            ludlog.ui('Could not fetch teacher details, using ID only:', teacherId);
            teacherInfo = {
              id: teacherId,
              name: 'המורה',
              full_name: 'המורה'
            };
          }
        }

        // If we have teacher context, show teacher assignment confirmation
        if (teacherInfo && teacherId) {
          ludlog.ui('Showing teacher assignment confirmation for:', teacherInfo);
          setDetectedTeacher({ id: teacherId, ...teacherInfo });
          setTeacherAssignmentData({
            teacher: teacherInfo,
            teacher_id: teacherId
          });
          setShowTeacherAssignment(true);
        } else {
          ludlog.ui('No teacher context detected, showing normal login');
        }

      } catch (error) {
        luderror.ui('Error detecting teacher context:', error);
        // Continue with normal login flow if detection fails
      }
    };

    detectTeacherContext();
  }, [location]); // Re-run when location changes

  // Handle successful login
  const handleLoginComplete = () => {
    if (onLoginSuccess) {
      onLoginSuccess();
    } else if (returnPath) {
      navigate(returnPath);
    }
  };

  // Google Sign-In handler (using new students login endpoint)
  const handleGoogleSignIn = async () => {
    setIsGoogleLoggingIn(true);
    setGoogleError('');
    setPlayerError('');
    setTeacherConnectionError(null);

    try {
      const { idToken } = await firebaseAuth.signInWithGoogle();

      // Check if we have a pending teacher connection from previous invitation
      const pendingTeacherId = sessionStorage.getItem('pendingTeacherId');

      // Prepare request for new students login endpoint
      const loginRequest = {
        idToken: idToken
      };

      if (pendingTeacherId) {
        loginRequest.teacher_id = pendingTeacherId;
      }

      // Call the new unified students login endpoint
      const apiResult = await apiRequest('/students/login', {
        method: 'POST',
        body: JSON.stringify(loginRequest)
      });

      // Handle successful login
      if (apiResult.success && (apiResult.user || apiResult.student)) {
        await login(apiResult.user || apiResult.student, false);

        // Clear pending teacher ID after successful login
        sessionStorage.removeItem('pendingTeacherId');

        // Show appropriate success message
        if (justAssignedTeacher) {
          // Show teacher connection success message
          showSuccess(`התחברת בהצלחה למורה ${justAssignedTeacher.name}!`);
          setJustAssignedTeacher(null); // Clear the flag
        } else {
          // Show regular login success message
          userLoginSuccessMsg(apiResult.user || apiResult.student);
        }

        handleLoginComplete();
        return; // Exit function successfully
      }

      // Handle ALREADY_CONNECTED case as success
      if (apiResult.code === 'ALREADY_CONNECTED' && apiResult.data) {
        // User is already connected to the teacher - this is a success case
        const { teacher, connection } = apiResult.data;

        // Clear pending teacher ID since connection is confirmed
        sessionStorage.removeItem('pendingTeacherId');

        // Show success message about existing connection
        const teacherName = teacher.name || teacher.full_name || 'המורה';
        showSuccess(`אתה כבר מחובר למורה ${teacherName}!`);

        handleLoginComplete();
        return; // Exit function successfully
      }

      // If we get here, it's actually a failure
      throw new Error('Authentication failed');
    } catch (err) {
      luderror.ui('Google sign-in error:', err);

      // Check for teacher connection failed error (subscription issue)
      if (err.code === 'TEACHER_CONNECTION_FAILED') {
        // Show custom confirmation dialog for subscription issue
        setShowTeacherConnectionFailedDialog(true);

        // Clear any auth state and return to login screen
        setGoogleError('');
        setIsGoogleLoggingIn(false);
        return;
      }

      // Check for teacher connection required error
      if (err.message && err.message.includes('Teacher connection required')) {
        setTeacherConnectionError('יש לחבר למורה כדי לגשת לפורטל התלמידים.');

        // Store the current idToken for retry after teacher connection
        try {
          const currentIdToken = await firebaseAuth.getCurrentUserIdToken();
          setPendingLoginData({ idToken: currentIdToken });
        } catch (tokenError) {
          luderror.ui('Failed to get current user token:', tokenError);
          setPendingLoginData(null);
        }

        setShowInvitationFlow(true);
        return; // Don't set googleError, show invitation flow instead
      }

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
        // Login with existing privacy code using new students login endpoint
        const pendingTeacherId = sessionStorage.getItem('pendingTeacherId');

        const loginRequest = {
          privacy_code: privacyCode.trim().toUpperCase()
        };

        if (pendingTeacherId) {
          loginRequest.teacher_id = pendingTeacherId;
        }

        // Call the new unified students login endpoint
        const apiResult = await apiRequest('/students/login', {
          method: 'POST',
          body: JSON.stringify(loginRequest)
        });

        // Handle successful player login
        if (apiResult.success && apiResult.player) {
          // Update context with the authenticated player
          await playerLogin(privacyCode.trim().toUpperCase());

          // Clear pending teacher ID after successful login
          sessionStorage.removeItem('pendingTeacherId');

          // Show teacher connection success message if applicable
          if (justAssignedTeacher) {
            showSuccess(`התחברת בהצלחה למורה ${justAssignedTeacher.name}!`);
            setJustAssignedTeacher(null); // Clear the flag
          }

          // Apply same fix as welcome modal - ensure proper state update and closure
          await handleExistingPlayerLoginComplete();
          return; // Exit function successfully
        }

        // Handle ALREADY_CONNECTED case as success for player login
        if (apiResult.code === 'ALREADY_CONNECTED' && apiResult.data) {
          // Player is already connected to the teacher - this is a success case
          const { teacher, connection } = apiResult.data;

          // Still need to authenticate the player locally
          await playerLogin(privacyCode.trim().toUpperCase());

          // Clear pending teacher ID since connection is confirmed
          sessionStorage.removeItem('pendingTeacherId');

          // Show success message about existing connection
          const teacherName = teacher.name || teacher.full_name || 'המורה';
          showSuccess(`אתה כבר מחובר למורה ${teacherName}!`);

          await handleExistingPlayerLoginComplete();
          return; // Exit function successfully
        }

        // If we get here, it's actually a failure
        throw new Error('Player authentication failed');
      } else {
        // Create new player with display name
        await handleCreateNewPlayer(displayName.trim());
        // Don't call handleLoginComplete here - it will be called after welcome modal closes
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
        } else if (err.message.includes('Display name already exists')) {
          errorMessage = 'שם זה כבר קיים, בחרו שם אחר';
        } else if (err.message.includes('Network Error')) {
          errorMessage = 'בעיית רשת. אנא בדוק את החיבור לאינטרנט';
        } else {
          // Show the actual API error message for everything else
          errorMessage = err.message;
        }
      } else {
        // Only use generic message as last resort based on mode
        if (loginMode === 'existing') {
          errorMessage = 'קוד פרטיות שגוי או לא קיים. אנא בדוק את הקוד ונסה שוב.';
        } else {
          errorMessage = 'שגיאה ביצירת שחקן חדש. נסו שוב.';
        }
      }

      setPlayerError(errorMessage);
    } finally {
      setIsPlayerLoggingIn(false);
    }
  };

  // Create new player handler
  const handleCreateNewPlayer = async (name) => {
    try {
      // Call Player API to create anonymous player
      const { Player } = await import('@/services/apiClient');

      const data = await Player.createAnonymous({
        display_name: name
      });

      if (data.success && data.player) {
        // Login with the newly created player's privacy code (background login)
        await playerLogin(data.player.privacy_code);

        // Store player data and show welcome modal
        setNewPlayerData(data.player);
        setShowWelcomeModal(true);

        // The main login modal should remain open until welcome modal is closed
      } else {
        throw new Error('Failed to create player');
      }
    } catch (error) {
      luderror.game('Create player error:', error);
      throw error;
    }
  };

  // Existing player login completion handler (fixed - no refreshUser needed)
  const handleExistingPlayerLoginComplete = async () => {
    // FIXED: Don't call refreshUser at all after successful login
    // The playerLogin() function in UserContext already sets the correct authentication state
    // Calling refreshUser() would make API calls that might fail and clear the state that was just set

    // Give a small delay to ensure any UI updates are processed
    setTimeout(() => {
      // Force close the login modal properly
      if (onLoginSuccess) {
        onLoginSuccess();
      } else if (returnPath) {
        navigate(returnPath);
      } else {
        // If no specific callback, navigate to home
        navigate('/');
      }
    }, 100); // Reduced delay since we're not calling refreshUser
  };

  // Welcome modal close handler (fixed - no refreshUser needed)
  const handleWelcomeModalClose = async () => {
    setShowWelcomeModal(false);
    setNewPlayerData(null);

    // FIXED: Don't call refreshUser at all after successful login
    // The createAnonymous + playerLogin flow already sets the correct authentication state
    // Calling refreshUser() would make API calls that might fail and clear the state that was just set

    // Give a small delay to ensure any UI updates are processed
    setTimeout(() => {
      // Force close the login modal by calling onLoginSuccess directly
      if (onLoginSuccess) {
        onLoginSuccess();
      } else if (returnPath) {
        navigate(returnPath);
      } else {
        // If no specific callback, navigate to home
        navigate('/');
      }
    }, 100); // Reduced delay since we're not calling refreshUser
  };

  // Handle invitation code submission
  const handleInvitationSubmit = async (e) => {
    e.preventDefault();

    if (!invitationCode.trim()) {
      showError('אנא הכנס קוד הזמנה');
      return;
    }

    setIsInvitationSubmitting(true);

    try {
      // Use the /auth/link-teacher endpoint to validate and link to teacher
      const { apiRequest } = await import('@/services/apiClient');
      const result = await apiRequest('/auth/link-teacher', {
        method: 'POST',
        body: JSON.stringify({ invitation_code: invitationCode.trim().toUpperCase() })
      });

      showSuccess(`התחברת בהצלחה למורה ${result.teacher.full_name}`);

      // Store the teacher ID for retry
      sessionStorage.setItem('pendingTeacherId', result.teacher.id);

      // Hide invitation flow and retry login
      setShowInvitationFlow(false);
      setInvitationCode('');

      // Retry login with teacher_id if we have pending login data
      if (pendingLoginData?.idToken) {
        try {
          const loginRequest = {
            idToken: pendingLoginData.idToken,
            teacher_id: result.teacher.id
          };

          const apiResult = await apiRequest('/students/login', {
            method: 'POST',
            body: JSON.stringify(loginRequest)
          });

          if (apiResult.success && (apiResult.user || apiResult.student)) {
            await login(apiResult.user || apiResult.student, false);
            sessionStorage.removeItem('pendingTeacherId');

            // Show teacher connection success message
            showSuccess(`התחברת בהצלחה למורה ${result.teacher.full_name || result.teacher.name}!`);

            handleLoginComplete();
          } else {
            throw new Error('Authentication failed after teacher connection');
          }
        } catch (retryError) {
          luderror.ui('Login retry after teacher connection failed:', retryError);
          showError('התחברות נכשלה לאחר חיבור למורה. נסו שוב.');
          // Reset states to allow user to try again
          setTeacherConnectionError(null);
          setPendingLoginData(null);
        }
      }

    } catch (error) {
      luderror.ui('Teacher invitation error:', error);

      // Error linking to teacher - show user-friendly error messages
      let errorMessage = 'אירעה שגיאה בחיבור למורה';

      if (error.message?.includes('Invalid invitation code')) {
        errorMessage = 'קוד הזמנה לא תקין או המורה לא נמצא';
      } else if (error.message?.includes('required')) {
        errorMessage = 'קוד הזמנה נדרש';
      }

      showError(errorMessage);
    } finally {
      setIsInvitationSubmitting(false);
    }
  };

  // Handle back to login from invitation flow
  const handleBackToLogin = () => {
    setShowInvitationFlow(false);
    setInvitationCode('');
    setTeacherConnectionError(null);
    setPendingLoginData(null);
    setGoogleError('');
    setPlayerError('');
  };

  // Teacher assignment handlers
  const handleTeacherAssignmentConfirm = async () => {
    if (!teacherAssignmentData) return;

    try {
      setIsAssigningTeacher(true);

      // Store the teacher ID for the subsequent login
      sessionStorage.setItem('pendingTeacherId', teacherAssignmentData.teacher_id);

      // Store teacher info for success message after login
      setJustAssignedTeacher(teacherAssignmentData.teacher);

      // Close the teacher assignment dialog
      setShowTeacherAssignment(false);

      // Continue with normal login flow - the teacher_id will be included in login calls
      // Success message will be shown after successful login

    } catch (error) {
      luderror.ui('Teacher assignment confirmation failed:', error);
      showError('שגיאה בהכנת החיבור למורה. נסו שוב.');
    } finally {
      setIsAssigningTeacher(false);
    }
  };

  const handleTeacherAssignmentCancel = () => {
    setShowTeacherAssignment(false);
    setTeacherAssignmentData(null);
    setDetectedTeacher(null);
    setJustAssignedTeacher(null); // Clear assignment flag

    // Clear any pending teacher data
    sessionStorage.removeItem('pendingTeacherId');

    // Continue with normal login flow without teacher assignment
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
      className={`${onClose ? 'fixed inset-0' : 'min-h-screen'} flex items-center justify-center p-4`}
      style={{ background: STUDENT_GRADIENTS.pageBackground, backgroundSize: '400% 400%' }}
    >
      <Card className="w-full max-w-md mx-auto bg-white/95 backdrop-blur-sm shadow-2xl border-0 rounded-3xl overflow-hidden">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 pt-6">
          {/* Logo and Title Section */}
          <div className="flex flex-col items-center w-full">
            {/* Logo */}
            <div className="flex justify-center mb-4">
              <LogoDisplay className="h-16 w-16 object-contain" />
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
          {/* Teacher Connection Required - Invitation Flow */}
          {showInvitationFlow ? (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">חיבור למורה נדרש</h3>
                <p className="text-gray-600 text-sm mb-4">
                  {teacherConnectionError}
                </p>
              </div>

              {/* Invitation Code Form */}
              <form onSubmit={handleInvitationSubmit} className="space-y-4">
                <div>
                  <label htmlFor="invitation-code" className="block text-sm font-medium text-gray-700 mb-2">
                    קוד הזמנה מהמורה
                  </label>
                  <Input
                    id="invitation-code"
                    type="text"
                    value={invitationCode}
                    onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
                    placeholder="הכנס קוד הזמנה (למשל: ABC123XY)"
                    className="text-center text-lg font-mono tracking-wider h-12 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:ring-red-200"
                    maxLength={8}
                    disabled={isInvitationSubmitting}
                    autoFocus
                  />
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    קוד הזמנה מורכב מ-8 תווים באנגלית ומספרים
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    type="submit"
                    disabled={isInvitationSubmitting || !invitationCode.trim()}
                    className="flex-1 h-12 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3 bg-red-600 hover:bg-red-700"
                  >
                    {isInvitationSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        מתחבר...
                      </>
                    ) : (
                      'התחבר למורה'
                    )}
                  </Button>

                  <Button
                    type="button"
                    onClick={handleBackToLogin}
                    disabled={isInvitationSubmitting}
                    variant="outline"
                    className="px-4 py-3 h-12 font-medium rounded-xl"
                  >
                    חזרה
                  </Button>
                </div>
              </form>

              {/* Help Text */}
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start">
                  <HelpCircle className="w-5 h-5 text-yellow-600 mt-0.5 ml-2" />
                  <div>
                    <h4 className="text-sm font-medium text-yellow-800 mb-1">איפה מוצאים את קוד הזמנה?</h4>
                    <p className="text-xs text-yellow-700">
                      המורה שלך יכול לשתף איתך קוד הזמנה אישי דרך הפורטל למורים.
                      פנה למורה שלך לקבלת הקוד.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Regular Login Content */
            <>
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
            </>
          )}
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

      {/* Player Welcome Modal */}
      <PlayerWelcomeModal
        player={newPlayerData}
        isOpen={showWelcomeModal}
        onClose={handleWelcomeModalClose}
      />

      {/* Teacher Assignment Confirmation Dialog */}
      <TeacherAssignmentConfirmation
        teacher={teacherAssignmentData?.teacher}
        isOpen={showTeacherAssignment}
        onConfirm={handleTeacherAssignmentConfirm}
        onCancel={handleTeacherAssignmentCancel}
        isLoading={isAssigningTeacher}
      />

      {/* Teacher Connection Failed Dialog */}
      <ConfirmationDialog
        isOpen={showTeacherConnectionFailedDialog}
        onClose={() => setShowTeacherConnectionFailedDialog(false)}
        onConfirm={() => setShowTeacherConnectionFailedDialog(false)}
        title="לא ניתן להתחבר למורה"
        message={
          'המורה שאליו ניסית להתחבר אינו בעל מנוי פעיל עם הרשאות ניהול כיתה.\n\n' +
          'כדי להתחבר למורה, על המורה להחזיק במנוי פעיל המאפשר ניהול תלמידים.\n\n' +
          'ניתן לנסות להתחבר למורה אחר או לפנות למורה שלך לבקשו לחדש את המנוי.'
        }
        confirmText="הבנתי"
        variant="warning"
      />
    </div>
  );
};

export default StudentLogin;

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Keyboard, QrCode, CameraOff, AlertTriangle, LogIn, LogOut, User } from 'lucide-react';
import PropTypes from 'prop-types';
import { useUser } from '@/contexts/UserContext';
import { Button } from '@/components/ui/button';
import ConfirmationDialog from '@/components/ui/confirmation-dialog';
import { checkCameraAvailability } from '@/utils/qrScannerUtils';
import { useActivityCodeHandler } from '@/hooks/useActivityCodeHandler';
import { useLoginModal } from '@/hooks/useLoginModal';
import LogoDisplay from '@/components/ui/LogoDisplay';

/**
 * Top navigation header for the student portal
 * Simple header with logo on the right side, optional teacher info in center, and action buttons on the left
 */
const StudentsNav = ({ teacherInfo = null }) => {
  const {
    settings,
    currentUser,
    currentPlayer,
    isAuthenticated,
    isPlayerAuthenticated,
    hasAnyAuthentication,
    login,
    logout,
    playerLogout
  } = useUser();
  const { openLoginModal } = useLoginModal();
  const [isCameraAvailable, setIsCameraAvailable] = useState(false);
  const [confirmationDialog, setConfirmationDialog] = useState({ isOpen: false });

  // Check camera availability on component mount (without opening camera)
  React.useEffect(() => {
    const checkCamera = async () => {
      const isAvailable = await checkCameraAvailability();
      setIsCameraAvailable(isAvailable);
    };

    checkCamera();
  }, []);

  // Use the activity code handler hook
  const {
    codeInput,
    isLoading,
    handleCodeInputChange,
    handleCodeInputKeyDown,
    handleCodeEntry,
    handleQRScan,
    isInputValid
  } = useActivityCodeHandler({
    showConfirmationDialog: setConfirmationDialog
  });

  const handleEnterCode = () => {
    handleCodeEntry();
  };


  // Open login modal
  const handleLoginClick = () => {
    openLoginModal();
  };

  // Logout handler - handles both user and player logout
  const handleLogout = async () => {
    try {
      if (isAuthenticated) {
        await logout();
      } else if (isPlayerAuthenticated) {
        await playerLogout();
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200" role="navigation" aria-label="Student Navigation">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
        <div className="flex justify-between items-center h-14" dir="rtl">
          {/* Logo on the right side (first element in RTL = right side) */}
          <Link
            to="/"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            aria-label="לחזור לעמוד הבית"
          >
            <LogoDisplay
              size="small"
              className="h-12 md:h-14 object-contain"
              alt={settings?.site_name || "לודורה"}
            />
          </Link>

          {/* Teacher catalog info in the center */}
          {teacherInfo && (
            <div className="absolute left-1/2 transform -translate-x-1/2 text-center">
              <h1 className="text-lg font-bold text-gray-800">
                קטלוג המשחקים של {teacherInfo.name}
              </h1>
              <p className="text-xs text-gray-600">קוד מורה: {teacherInfo.invitation_code}</p>
            </div>
          )}

          {/* Action Buttons on the left side (last element in RTL = left side) */}
          <div className="flex items-center gap-2">
            {/* Maintenance Mode Indicator for Admins */}
            {settings?.maintenance_mode && currentUser?.role === 'admin' && (
              <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 border border-orange-300 rounded-md text-xs text-orange-700 mr-2">
                <AlertTriangle className="w-3 h-3" />
                <span className="hidden sm:inline">מצב תחזוקה</span>
              </div>
            )}
            {/* Code Input and CTA Button */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={codeInput}
                onChange={handleCodeInputChange}
                onKeyDown={handleCodeInputKeyDown}
                placeholder="ABC12345"
                maxLength={8}
                className="w-16 h-8 text-center text-sm font-bold uppercase border-2 border-purple-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200 bg-gradient-to-br from-white to-purple-50"
                title="קוד פעילות (6 תווים ללובי משחק או 8 תווים לפורטל מורה)"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleEnterCode}
                disabled={!isInputValid() || isLoading}
                className="h-8 px-2 border-purple-200 text-purple-600 hover:bg-purple-50 disabled:opacity-50"
                title="הזן קוד"
              >
                <Keyboard className="w-3 h-3" />
              </Button>
            </div>

            {/* "או" separator */}
            <span className="text-xs text-gray-400 hidden sm:inline">או</span>

            {/* QR Scanner Button - only show if camera is available */}
            {isCameraAvailable ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleQRScan}
                className="h-8 px-2 border-blue-200 text-blue-600 hover:bg-blue-50"
                title="שמצלמים את תמונת QR שקיבלתם"
              >
                <QrCode className="w-3 h-3" />
              </Button>
            ) : (
              <div className="text-xs text-gray-400 hidden sm:block" title="זמין במכשירי נייד">
                <CameraOff className="w-3 h-3" />
              </div>
            )}

            {/* Separator */}
            <span className="text-xs text-gray-400 hidden sm:inline">|</span>

            {/* Authentication Buttons - Always show regardless of students_access setting */}
            {!hasAnyAuthentication() ? (
              /* Login Button - when not authenticated */
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoginClick}
                className="h-8 px-3 border-purple-200 text-purple-600 hover:bg-purple-50 flex items-center gap-1"
                title="התחברות למערכת"
              >
                <LogIn className="w-3 h-3" />
                <span className="hidden sm:inline text-xs">כניסה</span>
              </Button>
            ) : (
              /* Logout Button and User Info - when authenticated (user or player) */
              <div className="flex items-center gap-2">
                {/* User/Player Indicator */}
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <User className="w-3 h-3" />
                  <span className="hidden sm:inline truncate max-w-20">
                    {isAuthenticated
                      ? currentUser?.full_name || currentUser?.email || 'משתמש'
                      : currentPlayer?.display_name || 'שחקן'}
                  </span>
                </div>

                {/* Logout Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="h-8 px-3 border-red-200 text-red-600 hover:bg-red-50 flex items-center gap-1"
                  title="התנתקות מהמערכת"
                >
                  <LogOut className="w-3 h-3" />
                  <span className="hidden sm:inline text-xs">יציאה</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog for error messages */}
      <ConfirmationDialog
        isOpen={confirmationDialog.isOpen}
        onClose={() => setConfirmationDialog({ isOpen: false })}
        onConfirm={confirmationDialog.onConfirm || (() => setConfirmationDialog({ isOpen: false }))}
        title={confirmationDialog.title}
        message={confirmationDialog.message}
        variant={confirmationDialog.variant || 'warning'}
        confirmText={confirmationDialog.confirmText || 'בסדר'}
        cancelText={confirmationDialog.cancelText}
        operationStatus={confirmationDialog.operationStatus}
        loadingMessage={confirmationDialog.loadingMessage}
        successMessage={confirmationDialog.successMessage}
        errorMessage={confirmationDialog.errorMessage}
      />
    </nav>
  );
};

StudentsNav.propTypes = {
  teacherInfo: PropTypes.shape({
    name: PropTypes.string.isRequired,
    invitation_code: PropTypes.string.isRequired,
  }),
};

export default StudentsNav;
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Keyboard, QrCode, CameraOff, AlertTriangle, LogIn, LogOut, User, ChevronLeft, ChevronRight, Menu, X } from 'lucide-react';
import PropTypes from 'prop-types';
import { useUser } from '@/contexts/UserContext';
import { Button } from '@/components/ui/button';
import ConfirmationDialog from '@/components/ui/confirmation-dialog';
import { checkCameraAvailability } from '@/utils/qrScannerUtils';
import { useActivityCodeHandler } from '@/hooks/useActivityCodeHandler';
import { useLoginModal } from '@/hooks/useLoginModal';
import LogoDisplay from '@/components/ui/LogoDisplay';
import {
  getStudentNavFeatures,
  getDefaultStudentNavFeatures,
  getStudentDisplayName,
  getStudentAuthStatus
} from '@/lib/studentNavUtils';

/**
 * Collapsible sidebar navigation for the student portal
 * Kid-friendly sidebar with configurable features via SP_FEATURES settings
 * Responsive: Mobile overlay with top header, Desktop sidebar with content push
 */
const StudentsNav = ({ teacherInfo = null }) => {
  const {
    settings,
    currentUser,
    currentPlayer,
    isAuthenticated,
    isPlayerAuthenticated,
    hasAnyAuthentication,
    logout,
    playerLogout
  } = useUser();
  const { openLoginModal } = useLoginModal();

  // Collapse state - load from localStorage with mobile-first default
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('studentNavCollapsed');
    if (saved) return JSON.parse(saved);
    // Default: collapsed on mobile, expanded on desktop
    return typeof window !== 'undefined' ? window.innerWidth < 1024 : false;
  });

  // Mobile detection for overlay behavior
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 1024;
  });

  const [isCameraAvailable, setIsCameraAvailable] = useState(false);
  const [confirmationDialog, setConfirmationDialog] = useState({ isOpen: false });

  // Get configurable navigation features
  const navFeatures = settings
    ? getStudentNavFeatures({
        settings,
        currentUser,
        currentPlayer,
        isAuthenticated,
        isPlayerAuthenticated
      })
    : getDefaultStudentNavFeatures();

  // Check camera availability on mount
  useEffect(() => {
    const checkCamera = async () => {
      const isAvailable = await checkCameraAvailability();
      setIsCameraAvailable(isAvailable);
    };
    checkCamera();
  }, []);

  // Handle window resize for mobile/desktop detection
  useEffect(() => {
    const handleResize = () => {
      const newIsMobile = window.innerWidth < 1024;
      setIsMobile(newIsMobile);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Save collapsed state and update CSS custom property
  useEffect(() => {
    localStorage.setItem('studentNavCollapsed', JSON.stringify(isCollapsed));

    if (!isMobile) {
      // Desktop: Set width for content pushing
      document.documentElement.style.setProperty(
        '--student-nav-width',
        isCollapsed ? '60px' : '200px'
      );
    } else {
      // Mobile: No margin needed (overlay mode)
      document.documentElement.style.setProperty('--student-nav-width', '0px');
    }
  }, [isCollapsed, isMobile]);

  // Activity code handler hook
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

  // Login handler
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
    } catch (_error) {
      // Error handling via ludlog in logout methods
    }
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };


  // Render activity input feature
  const renderActivityInputFeature = (feature) => {
    return (
      <div key={feature.key} className={`space-y-2 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
        {/* Code Input */}
        {!isCollapsed && (
          <div className="space-y-1">
            <label className="text-xs font-semibold text-purple-900 block">{feature.text}</label>
            <input
              type="text"
              value={codeInput}
              onChange={handleCodeInputChange}
              onKeyDown={handleCodeInputKeyDown}
              placeholder={feature.placeholder}
              maxLength={feature.maxLength}
              className="w-full h-9 text-center text-sm font-bold uppercase border-2 border-purple-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200 bg-gradient-to-br from-white to-purple-50"
              title={feature.text}
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className={`flex ${isCollapsed ? 'flex-col' : 'flex-row'} gap-2 items-center`}>
          {/* Enter Code Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleEnterCode}
            disabled={!isInputValid() || isLoading}
            className={`${isCollapsed ? 'w-10 h-10 p-0' : 'flex-1 h-9'} border-purple-300 text-purple-600 hover:bg-purple-100 disabled:opacity-50 transition-all duration-200`}
            title="הזן קוד"
          >
            <Keyboard className="w-4 h-4" />
            {!isCollapsed && <span className="mr-1 text-xs">הזן</span>}
          </Button>

          {/* QR Scanner Button */}
          {isCameraAvailable ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleQRScan}
              className={`${isCollapsed ? 'w-10 h-10 p-0' : 'flex-1 h-9'} border-blue-300 text-blue-600 hover:bg-blue-100 transition-all duration-200`}
              title="סרוק QR"
            >
              <QrCode className="w-4 h-4" />
              {!isCollapsed && <span className="mr-1 text-xs">סרוק</span>}
            </Button>
          ) : (
            !isCollapsed && (
              <div className="flex-1 flex items-center justify-center text-xs text-gray-400">
                <CameraOff className="w-4 h-4" />
              </div>
            )
          )}
        </div>

        {/* Tooltip for collapsed state */}
        {isCollapsed && (
          <div className="relative group">
            <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 bg-purple-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
              {feature.text}
              <div className="absolute right-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-l-purple-900"></div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render navigation link feature
  const renderNavigationFeature = (feature) => {
    const IconComponent = feature.icon;

    return (
      <div key={feature.key} className="relative group">
        <Link
          to={feature.url}
          className={`relative flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 hover:scale-105 hover:bg-gradient-to-r hover:from-purple-100 hover:to-blue-100 text-purple-700 hover:shadow-lg ${
            isCollapsed ? 'justify-center w-10 h-10 p-0' : ''
          }`}
          title={isCollapsed ? feature.text : undefined}
        >
          <IconComponent className="w-4 h-4 flex-shrink-0" />
          {!isCollapsed && (
            <span className="whitespace-nowrap transition-opacity duration-300">{feature.text}</span>
          )}
        </Link>

        {/* Tooltip for collapsed state */}
        {isCollapsed && (
          <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 bg-purple-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
            {feature.text}
            <div className="absolute right-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-l-purple-900"></div>
          </div>
        )}
      </div>
    );
  };

  // Render feature based on type
  const renderFeature = (feature) => {
    switch (feature.type) {
      case 'activity_input':
        return renderActivityInputFeature(feature);
      case 'navigation':
        return renderNavigationFeature(feature);
      default:
        return null;
    }
  };

  return (
    <>
      {/* Mobile Top Header Bar */}
      {isMobile && (
        <div className={`fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-b border-purple-200/50 shadow-lg transition-all duration-300 ${
          isCollapsed ? 'z-50' : 'z-30'
        }`}>
          <div className="flex items-center justify-between px-4 py-2" dir="rtl">
            {/* Logo - hidden when menu is open */}
            <Link
              to="/"
              className={`flex items-center gap-2 hover:scale-105 transition-all duration-300 ${
                isCollapsed ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
              }`}
              aria-label="לחזור לעמוד הבית"
            >
              <LogoDisplay size="small" className="h-8 w-auto object-contain rounded-lg max-w-[120px]" />
            </Link>

            {/* Menu Toggle Button */}
            <button
              onClick={toggleCollapse}
              className="p-2 rounded-lg hover:bg-purple-100 transition-colors duration-200"
              aria-label={isCollapsed ? "פתח תפריט" : "סגור תפריט"}
            >
              {isCollapsed ? <Menu className="w-6 h-6 text-purple-600" /> : <X className="w-6 h-6 text-purple-600" />}
            </button>
          </div>
        </div>
      )}

      {/* Backdrop for mobile overlay */}
      {isMobile && !isCollapsed && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsCollapsed(true)}
        />
      )}

      {/* Student Sidebar Navigation */}
      <div className={`
        flex flex-col fixed right-0 top-0 h-full
        bg-gradient-to-b from-purple-50/95 to-blue-50/95 backdrop-blur-xl
        border-l-4 border-purple-300/50
        shadow-xl shadow-purple-500/20
        transition-all duration-300 ease-in-out
        ${isMobile ? 'z-40' : 'z-30'}
        ${isCollapsed ? 'w-[60px]' : 'w-[200px]'}
        ${isMobile && isCollapsed ? 'translate-x-full' : 'translate-x-0'}
      `} dir="rtl">

        {/* Maintenance mode warning (admin only) */}
        {settings?.maintenance_mode && currentUser?.role === 'admin' && (
          <div className="bg-gradient-to-r from-orange-400 to-red-400 text-white p-2 text-center text-xs font-bold flex items-center justify-center gap-1 shadow-lg animate-pulse">
            <AlertTriangle className="w-4 h-4 animate-bounce" />
            {!isCollapsed && <span>מצב תחזוקה</span>}
          </div>
        )}

        {/* Header Section */}
        <div className="p-3 border-b-2 border-purple-300/50">
          {!isCollapsed ? (
            <div className="flex items-center justify-between">
              {/* Logo */}
              <Link
                to="/"
                className="flex items-center gap-2 hover:scale-105 transition-transform duration-300"
                aria-label="לחזור לעמוד הבית"
              >
                <LogoDisplay
                  size="small"
                  className="h-10 w-auto max-w-[140px] object-contain rounded-lg transition-all duration-300"
                />
              </Link>

              {/* Collapse Toggle Button */}
              <button
                onClick={toggleCollapse}
                className="p-1.5 rounded-lg hover:bg-purple-200/50 transition-colors duration-200"
                aria-label="כווץ תפריט"
              >
                <ChevronRight className="w-4 h-4 text-purple-600" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-2">
              {/* Logo centered when collapsed */}
              <Link
                to="/"
                className="flex items-center justify-center hover:scale-105 transition-transform duration-300"
                aria-label="לחזור לעמוד הבית"
              >
                <LogoDisplay size="small" className="h-7 w-7 object-contain rounded-lg transition-all duration-300" />
              </Link>

              {/* Expand button when collapsed */}
              <button
                onClick={toggleCollapse}
                className="p-1.5 rounded-lg hover:bg-purple-200/50 transition-colors duration-200"
                aria-label="הרחב תפריט"
              >
                <ChevronLeft className="w-4 h-4 text-purple-600" />
              </button>
            </div>
          )}
        </div>

        {/* Main Content Section */}
        <div className="flex-1 overflow-y-auto py-3 px-2">
          {/* Teacher Info Display */}
          {teacherInfo && !isCollapsed && (
            <div className="mb-3 p-3 bg-white/70 rounded-xl border-2 border-purple-200">
              <div className="flex items-center gap-2 mb-1">
                <GraduationCap className="w-4 h-4 text-purple-600" />
                <h3 className="text-xs font-bold text-purple-900">קטלוג המורה</h3>
              </div>
              <p className="text-sm font-semibold text-gray-800 truncate">{teacherInfo.name}</p>
              <p className="text-xs text-gray-600">קוד: {teacherInfo.invitation_code}</p>
            </div>
          )}

          {/* Configurable Navigation Features */}
          <div className="space-y-2">
            {navFeatures.map(renderFeature)}
          </div>
        </div>

        {/* Bottom Section - Authentication */}
        <div className="border-t-2 border-purple-300/50 p-2">
          {!hasAnyAuthentication() ? (
            /* Login Button */
            <Button
              variant="default"
              className={`group relative bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold
                transition-all duration-300 transform hover:scale-105 hover:shadow-xl hover:shadow-purple-500/25
                focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 active:scale-95 ${
                isCollapsed
                  ? 'w-11 h-11 p-0 justify-center rounded-xl'
                  : 'w-full justify-center py-2.5 rounded-xl shadow-lg text-sm'
              }`}
              onClick={handleLoginClick}
              title={isCollapsed ? "התחברות" : undefined}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <LogIn className="w-4 h-4 relative z-10 transition-transform duration-300 group-hover:scale-110" />
              {!isCollapsed && (
                <span className="relative z-10 text-white font-bold drop-shadow-sm mr-1">כניסה</span>
              )}
            </Button>
          ) : (
            /* Logout Section */
            <div className="space-y-2">
              {/* User Info (only when expanded) */}
              {!isCollapsed && (() => {
                const authStatus = getStudentAuthStatus(currentUser, currentPlayer, isAuthenticated, isPlayerAuthenticated);
                return (
                  <div className="text-center px-2">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <User className="w-3 h-3 text-purple-600" />
                      <span className="text-xs font-semibold text-gray-800 truncate">
                        {getStudentDisplayName(currentUser, currentPlayer, isAuthenticated, isPlayerAuthenticated)}
                      </span>
                    </div>
                    <div className={`text-xs font-medium ${authStatus.color}`}>
                      {authStatus.text}
                    </div>
                  </div>
                );
              })()}

              {/* Logout Button */}
              <Button
                variant="outline"
                className={`group relative bg-gradient-to-r from-red-50 to-pink-50 border-red-300 text-red-600 font-bold
                  transition-all duration-300 hover:from-red-100 hover:to-pink-100 hover:border-red-400
                  hover:shadow-lg hover:shadow-red-500/10 focus:ring-2 focus:ring-red-400 focus:ring-offset-2 ${
                  isCollapsed
                    ? 'w-11 h-11 p-0 justify-center rounded-xl'
                    : 'w-full justify-center py-2.5 rounded-xl text-sm'
                }`}
                onClick={handleLogout}
                title={isCollapsed ? "התנתקות" : undefined}
              >
                <LogOut className="w-4 h-4 relative z-10 transition-transform duration-300 group-hover:scale-105" />
                {!isCollapsed && (
                  <span className="relative z-10 font-bold mr-1">יציאה</span>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
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
    </>
  );
};

StudentsNav.propTypes = {
  teacherInfo: PropTypes.shape({
    name: PropTypes.string.isRequired,
    invitation_code: PropTypes.string.isRequired,
  }),
};

export default StudentsNav;

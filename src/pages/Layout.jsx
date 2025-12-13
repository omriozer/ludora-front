import { useState, useEffect, useCallback, Suspense } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import Footer from "../components/layout/Footer";
import FloatingAdminMenu from "../components/FloatingAdminMenu";
import SubscriptionModal from "../components/SubscriptionModal";
import { ParentConsent } from "./lazy.jsx";
import { loginWithFirebase } from "@/services/apiClient";
import { firebaseAuth } from "@/lib/firebase";
import PublicNav from "../components/layout/PublicNav";
import { showSuccess, showError } from '@/utils/messaging';
import ReturnToSelfButton from "../components/layout/ReturnToSelfButton";
import LoginModal from "../components/LoginModal";
import { shouldHideNavigation } from "@/lib/layoutHelpers";
import MaintenancePage from "@/components/layout/MaintenancePage";
import { useLoginModal } from "@/hooks/useLoginModal";
import { CartProvider } from "@/contexts/CartContext";
import LudoraLoadingSpinner from "@/components/ui/LudoraLoadingSpinner";
import { canBypassMaintenance } from "@/utils/adminCheck";
import UserWayWidget from "@/components/accessibility/UserWayWidget";
import { luderror } from "@/lib/ludlog";
import SEOHead from "@/components/SEOHead";

function LayoutContent({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { showLoginModal, openLoginModal, closeLoginModal, executeCallback, modalMessage } = useLoginModal();

  // Use UserContext instead of local state
  const { currentUser, settings, isLoading, settingsLoading, settingsLoadFailed, login, logout, userLoginSuccessMsg, isAdmin } = useUser();

  // Track screen size for responsive layout
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  // Draggable return button states
  const [showReturnButton, setShowReturnButton] = useState(false);
  const [returnButtonPosition, setReturnButtonPosition] = useState({ x: 20, y: 20 });
  const [isDraggingReturn, setIsDraggingReturn] = useState(false);
  const [returnDragOffset, setReturnDragOffset] = useState({ x: 0, y: 0 });

  // Admin bypass state for maintenance mode
  const [canAdminBypass, setCanAdminBypass] = useState(false);
  const [isCheckingAdminBypass, setIsCheckingAdminBypass] = useState(true);

  // Check if current page should hide navigation (game launcher)
  const hideNav = shouldHideNavigation(location.pathname);

  // Check if user is being impersonated and show return button
  useEffect(() => {
    if (currentUser && currentUser._isImpersonated) {
      setShowReturnButton(true);
    } else {
      setShowReturnButton(false);
    }
  }, [currentUser]);

  // Check admin bypass for maintenance mode
  useEffect(() => {
    const checkAdminBypass = async () => {
      if (settings?.maintenance_mode || settingsLoadFailed) {
        setIsCheckingAdminBypass(true);
        try {
          const canBypass = await canBypassMaintenance(currentUser);
          setCanAdminBypass(canBypass);
        } catch (error) {
          luderror(error)
          setCanAdminBypass(false);
        } finally {
          setIsCheckingAdminBypass(false);
        }
      } else {
        setCanAdminBypass(false);
        setIsCheckingAdminBypass(false);
      }
    };

    checkAdminBypass();
  }, [currentUser, settings?.maintenance_mode, settingsLoadFailed]);

  // Handle responsive layout
  useEffect(() => {
    const handleResize = () => {
      const newIsDesktop = window.innerWidth >= 1024;
      setIsDesktop(newIsDesktop);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Track layout state changes
  useEffect(() => {
    // Layout state updated
  }, [isDesktop, hideNav]);

  // Initialize accessibility and other settings
  // useEffect(() => {
  //   initializeKeyMode();
    
  //   // Accessibility widget
  //   if (typeof window !== 'undefined' && !window.accessibilityWidgetLoaded) {
  //     const script = document.createElement('script');
  //     script.src = 'https://cdn.enable.co.il/licenses/enable-L32411ozlhckf2l9-0624-88967/init.js';
  //     script.async = true;
  //     document.body.appendChild(script);
  //     window.accessibilityWidgetLoaded = true;
  //   }
  // }, []);

  // Mouse/touch handlers for draggable return button
  const handleMouseMove = useCallback((e) => {
    if (!isDraggingReturn) return;

    const newX = e.clientX - returnDragOffset.x;
    const newY = e.clientY - returnDragOffset.y;

    const buttonSize = 56; // w-14 h-14 is 56px
    const maxX = window.innerWidth - buttonSize;
    const maxY = window.innerHeight - buttonSize;

    setReturnButtonPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    });
  }, [isDraggingReturn, returnDragOffset]);

  const handleMouseUp = useCallback(() => {
    setIsDraggingReturn(false);
  }, []);

  // Effect for global mouse events for dragging
  useEffect(() => {
    if (isDraggingReturn) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingReturn, handleMouseMove, handleMouseUp]);

  // Admin/staff functionality
  const handleReturnToSelf = () => {
    window.location.reload(); // Reload to return to original admin session
  };

  // Drag handlers for maintenance page
  const handleReturnDrag = (e) => {
    setIsDraggingReturn(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setReturnDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    setIsDraggingReturn(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setReturnDragOffset({
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    });
    e.preventDefault();
  };

  const handleTouchMove = (e) => {
    if (!isDraggingReturn) return;
    const touch = e.touches[0];
    const newX = touch.clientX - returnDragOffset.x;
    const newY = touch.clientY - returnDragOffset.y;

    const buttonSize = 56;
    const maxX = window.innerWidth - buttonSize;
    const maxY = window.innerHeight - buttonSize;

    setReturnButtonPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    });
    e.preventDefault();
  };

  const handleTouchEnd = () => {
    setIsDraggingReturn(false);
  };

  const handleSubscriptionChange = (plan) => {
    // Update current user with new plan
    setShowSubscriptionModal(false);
    // The subscription will be updated via the UserContext
  };

  // Login handler
  const handleLoginSubmit = async () => {
    try {
      // Use the firebaseAuth helper for Google sign-in
      const { user, idToken } = await firebaseAuth.signInWithGoogle();

      const firebaseResult = { user, idToken };
      const apiResult = await loginWithFirebase({ idToken: firebaseResult.idToken });

      if (apiResult.valid && apiResult.user) {
        await login(apiResult.user);

        // Show success toast message
        userLoginSuccessMsg(apiResult.user);

        // Execute callback first, then close modal to ensure proper flow
        executeCallback();
        closeLoginModal();

      } else {
        throw new Error('Authentication failed');
      }
    } catch (error) {
      let errorMessage = 'שגיאה בכניסה. נסו שוב.';
      if (error.message) {
        if (error.message.includes('popup-closed-by-user')) {
          errorMessage = 'ההתחברות בוטלה על ידי המשתמש.';
        } else if (error.message.includes('Firebase not initialized')) {
          errorMessage = 'שירות ההתחברות אינו זמין כעת.';
        } else if (error.message.includes('auth/invalid-api-key')) {
          errorMessage = 'בעיה בהגדרות הזיהוי. צרו קשר עם התמיכה.';
        }
      }
      showError(errorMessage);
      throw error;
    }
  };

  // Logout handler
  const onLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      showError('שגיאה בהתנתקות');
    }
  };

  const onLogin = () => {
    openLoginModal();
  };

  // Show maintenance page if enabled OR if settings loading failed (but allow admins to bypass)
  // IMPORTANT: Check maintenance/error state BEFORE loading state to prevent infinite spinner
  if ((settings?.maintenance_mode || settingsLoadFailed) && !canAdminBypass) {
    const isTemporaryIssue = settingsLoadFailed && !settings?.maintenance_mode;

    // Show loading while checking admin bypass
    if (isCheckingAdminBypass) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <LudoraLoadingSpinner
            message="בודק הרשאות..."
            size="lg"
          />
        </div>
      );
    }

    return (
      <>

        <MaintenancePage
          onAnonymousAdminSuccess={async () => {
            // Re-check admin bypass status after anonymous admin login
            setIsCheckingAdminBypass(true);
            try {
              const canBypass = await canBypassMaintenance(currentUser);
              setCanAdminBypass(canBypass);
            } catch (error) {
              
              setCanAdminBypass(false);
            } finally {
              setIsCheckingAdminBypass(false);
            }
          }}
          showReturnButton={showReturnButton}
          isDraggingReturn={isDraggingReturn}
          returnButtonPosition={returnButtonPosition}
          handleReturnDrag={handleReturnDrag}
          handleTouchStart={handleTouchStart}
          handleTouchMove={handleTouchMove}
          handleTouchEnd={handleTouchEnd}
          handleReturnToSelf={handleReturnToSelf}
          isTemporaryIssue={isTemporaryIssue}
        />

        {/* Login Modal */}
        {showLoginModal && (
          <LoginModal
            onClose={closeLoginModal}
            onLogin={handleLoginSubmit}
            message={modalMessage}
          />
        )}
      </>
    );
  }

  // Handle loading state - wait for both user auth AND settings to load
  // Only show loading if settings haven't failed (to avoid infinite spinner when API is down)
  if (isLoading || (settingsLoading && !settingsLoadFailed)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LudoraLoadingSpinner
          message="טוען את המערכת..."
          size="lg"
        />
      </div>
    );
  }

  // Handle ParentConsent page specially
  if (location.pathname.startsWith('/parent-consent')) {
    return (
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <LudoraLoadingSpinner
            message="טוען עמוד..."
            size="lg"
          />
        </div>
      }>
        <ParentConsent />
      </Suspense>
    );
  }

  // Main layout
  return (
    <CartProvider>
      {/* Default SEO fallback - gets overridden by page-specific SEOHead components */}
      <SEOHead />

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex">


        {/* Navigation */}
        {!hideNav && (
          <PublicNav
            currentUser={currentUser}
            handleLogin={onLogin}
            handleLogout={onLogout}
            settings={settings}
          />
        )}

        {/* Main Content Area */}
        <div
          className={`flex flex-col flex-1 min-h-screen transition-all duration-300 ${
            !hideNav && !isDesktop ? 'pt-14' : ''
          }`}
          style={{
            marginRight: !hideNav ? 'var(--nav-width, 0px)' : '0',
          }}
        >
          {/* Main Content */}
          <main className="flex-1">
            <Suspense fallback={
              <div className="flex items-center justify-center min-h-[400px]">
                <LudoraLoadingSpinner
                  message="טוען עמוד..."
                  size="md"
                />
              </div>
            }>
              {children}
            </Suspense>
          </main>

          {/* Footer */}
          {!hideNav && <Footer />}
        </div>

        {/* Floating Admin Menu */}
        {!isLoading && currentUser && isAdmin() && (
          <FloatingAdminMenu currentUser={currentUser} />
        )}

        {/* Return to Self Button for Admin */}
        {showReturnButton && (
          <ReturnToSelfButton
            position={returnButtonPosition}
            onMouseDown={(e) => {
              setIsDraggingReturn(true);
              const rect = e.currentTarget.getBoundingClientRect();
              setReturnDragOffset({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
              });
            }}
            onTouchStart={(e) => {
              const touch = e.touches[0];
              setIsDraggingReturn(true);
              const rect = e.currentTarget.getBoundingClientRect();
              setReturnDragOffset({
                x: touch.clientX - rect.left,
                y: touch.clientY - rect.top
              });
              e.preventDefault();
            }}
            onTouchMove={(e) => {
              if (!isDraggingReturn) return;
              const touch = e.touches[0];
              const newX = touch.clientX - returnDragOffset.x;
              const newY = touch.clientY - returnDragOffset.y;

              const buttonSize = 56;
              const maxX = window.innerWidth - buttonSize;
              const maxY = window.innerHeight - buttonSize;

              setReturnButtonPosition({
                x: Math.max(0, Math.min(newX, maxX)),
                y: Math.max(0, Math.min(newY, maxY))
              });
              e.preventDefault();
            }}
            onTouchEnd={() => setIsDraggingReturn(false)}
            onClick={handleReturnToSelf}
          />
        )}

        {/* Notification Bell */}
        {/* {currentUser && <NotificationBell currentUser={currentUser} />} */}

        {/* Modals */}
        {showSubscriptionModal && (
          <SubscriptionModal
            currentUser={currentUser}
            onClose={() => setShowSubscriptionModal(false)}
            onSubscriptionChange={handleSubscriptionChange}
          />
        )}

        {showLoginModal && (
          <LoginModal
            onClose={closeLoginModal}
            onLogin={handleLoginSubmit}
            message={modalMessage}
          />
        )}

        {/* UserWay Accessibility Widget */}
        <UserWayWidget />
      </div>
    </CartProvider>
  );
}

export default function Layout({ children }) {
  return <LayoutContent>{children}</LayoutContent>;
}
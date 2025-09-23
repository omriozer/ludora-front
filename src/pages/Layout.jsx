import React, { useState, useEffect, useCallback, Suspense } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { isStaff } from "@/lib/userUtils";
import { initializeKeyMode, setShowKeysMode, getShowKeysMode } from "../components/utils/getText";
import {
  BookOpen,
  Users,
  Calendar,
  Settings as SettingsIcon,
  Mail,
  BarChart3,
  Menu,
  X,
  GraduationCap,
  Home,
  Crown,
  LogIn,
  LogOut,
  User as UserIcon,
  ShieldAlert,
  MessageSquare,
  Shield,
  Code,
  FileText,
  Move,
  Play,
  Edit,
  Monitor,
  Award,
  Globe,
  ArrowLeft,
  UserCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SkipLink } from "@/components/ui/skip-link";
import Footer from "../components/layout/Footer";
import NotificationBell from "../components/NotificationBell";
import FloatingAdminMenu from "../components/FloatingAdminMenu";
import SubscriptionModal from "../components/SubscriptionModal";
import ParentConsent from "./ParentConsent";
import { loginWithFirebase } from "@/services/apiClient";
import { firebaseAuth } from "@/lib/firebase";
import PublicNav from "../components/layout/PublicNav";
import GlobalMessage from "@/components/ui/GlobalMessage";
import ReturnToSelfButton from "../components/layout/ReturnToSelfButton";
import LoginModal from "../components/LoginModal";
import { shouldHideNavigation } from "@/lib/layoutHelpers";
import MaintenancePage from "@/components/layout/MaintenancePage";

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Use UserContext instead of local state
  const { currentUser, settings, isLoading, isAuthenticated, login, logout } = useUser();
  
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [message, setMessage] = useState(null);

  // Draggable return button states
  const [showReturnButton, setShowReturnButton] = useState(false);
  const [returnButtonPosition, setReturnButtonPosition] = useState({ x: 20, y: 20 });
  const [isDraggingReturn, setIsDraggingReturn] = useState(false);
  const [returnDragOffset, setReturnDragOffset] = useState({ x: 0, y: 0 });

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
  const handleLoginSubmit = async (rememberMe = false) => {
    console.log('🟢 Layout: handleLoginSubmit started');
    try {
      // Use the firebaseAuth helper for Google sign-in
      const { user, idToken } = await firebaseAuth.signInWithGoogle();
      console.log('🟢 Layout: Firebase user:', user);
      console.log('🟢 Layout: Got ID token:', idToken ? 'Present' : 'Missing');

      const firebaseResult = { user, idToken };
      console.log('🟢 Layout: Calling loginWithFirebase API...');
      const apiResult = await loginWithFirebase({ idToken: firebaseResult.idToken });
      console.log('🟢 Layout: API result:', apiResult);

      if (apiResult.valid && apiResult.user) {
        console.log('🟢 Layout: Login successful, setting user...');
        await login(apiResult.user, rememberMe);
        setMessage({ type: 'success', text: 'התחברת בהצלחה!' });
        setShowLoginModal(false);
      } else {
        console.log('❌ Layout: API result invalid');
        throw new Error('Authentication failed');
      }
    } catch (error) {
      console.error('❌ Layout: Login error:', error);
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
      setMessage({ type: 'error', text: errorMessage });
      throw error;
    }
  };

  // Logout handler
  const onLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const onLogin = () => {
    setShowLoginModal(true);
  };

  // Handle loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">טוען...</p>
        </div>
      </div>
    );
  }

  // Show maintenance page if enabled (but allow admins to bypass)
  if (settings?.maintenance_mode && !(currentUser?.role === 'admin' && !currentUser?._isImpersonated)) {
    return (
      <>
        {/* Global Message */}
        {message && (
          <GlobalMessage 
            type={message.type} 
            message={message.text} 
            onClose={() => setMessage(null)} 
          />
        )}

        <MaintenancePage 
          showReturnButton={showReturnButton}
          isDraggingReturn={isDraggingReturn}
          returnButtonPosition={returnButtonPosition}
          handleReturnDrag={handleReturnDrag}
          handleTouchStart={handleTouchStart}
          handleTouchMove={handleTouchMove}
          handleTouchEnd={handleTouchEnd}
          handleReturnToSelf={handleReturnToSelf}
          handleLogin={onLogin}
        />

        {/* Login Modal */}
        {showLoginModal && (
          <LoginModal
            onClose={() => setShowLoginModal(false)}
            onLogin={handleLoginSubmit}
          />
        )}
      </>
    );
  }


  // Handle ParentConsent page specially
  if (location.pathname.startsWith('/parent-consent')) {
    return <ParentConsent />;
  }

  // Main layout
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      <SkipLink />
      
      {/* Global Message */}
      {message && (
        <GlobalMessage 
          type={message.type} 
          message={message.text} 
          onClose={() => setMessage(null)} 
        />
      )}

      {/* Navigation */}
      {!hideNav && (
        <PublicNav 
          currentUser={currentUser}
          handleLogin={onLogin}
          handleLogout={onLogout}
          settings={settings}
        />
      )}

      {/* Main Content */}
      <main className="flex-1">
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        }>
          {children}
        </Suspense>
      </main>

      {/* Footer */}
      {!hideNav && <Footer />}

      {/* Floating Admin Menu */}
      {!isLoading && currentUser && isStaff(currentUser) && (
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
          onClose={() => setShowLoginModal(false)}
          onLogin={handleLoginSubmit}
        />
      )}
    </div>
  );
}
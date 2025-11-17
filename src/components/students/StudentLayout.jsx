import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SkipLink } from '@/components/ui/skip-link';
import { EnhancedToaster } from '@/components/ui/enhanced-toast';
import Footer from '@/components/layout/Footer';
import logo from '@/assets/images/logo.png';
import '@/styles/studentsApp.css';

/**
 * Clean, minimal layout for the student portal
 * No authentication, no complex navigation - just beautiful, kid-friendly design
 * @param {React.ReactNode} children - Child components to render
 * @param {boolean} isMaintenanceMode - Whether to show maintenance mode indicator
 */
const StudentLayout = ({ children, isMaintenanceMode = false }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Close mobile menu when window resizes
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="student-portal-background">
      <SkipLink />

      {/* Maintenance Mode Banner */}
      {isMaintenanceMode && (
        <div className="student-maintenance-banner">
          🔧 המערכת נמצאת כעת בתחזוקה - חלק מהשירותים עלולים להיות לא זמינים
        </div>
      )}

      {/* Simple Header */}
      <header className="student-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo - always visible */}
            <Link
              to="/"
              className="flex items-center"
            >
              <img
                src={logo}
                alt="לודורה"
                className="student-logo"
              />
            </Link>

            {/* Desktop navigation */}
            <div className="hidden md:flex items-center">
              <div className="student-welcome-text">
                ברוכים הבאים לפורטל התלמידים
              </div>
            </div>

            {/* Mobile menu button - only visible on mobile */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden student-mobile-menu-button"
              aria-label="Toggle menu"
              aria-expanded={isMenuOpen}
            >
              <div className="w-6 h-6 flex flex-col justify-center">
                <div className={`student-menu-icon-bar w-full transition-all duration-300 ${isMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
                <div className={`student-menu-icon-bar w-full my-1 transition-all duration-300 ${isMenuOpen ? 'opacity-0' : ''}`} />
                <div className={`student-menu-icon-bar w-full transition-all duration-300 ${isMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
              </div>
            </button>
          </div>

          {/* Mobile menu backdrop */}
          {isMenuOpen && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
              onClick={() => setIsMenuOpen(false)}
            />
          )}

          {/* Mobile menu panel */}
          <div
            className={`fixed top-0 right-0 h-full w-80 bg-white shadow-xl z-40 transform transition-transform duration-300 ease-in-out md:hidden ${
              isMenuOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            <div className="p-6">
              {/* Close button */}
              <div className="flex justify-end mb-6">
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2 rounded-lg bg-purple-100 hover:bg-purple-200 transition-colors"
                  aria-label="Close menu"
                >
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Menu content */}
              <nav className="space-y-6">
                <div className="text-center">
                  <div className="student-welcome-text text-xl mb-2">
                    פורטל התלמידים של לודורה
                  </div>
                  <p className="text-purple-500 text-sm">
                    ברוכים הבאים למערכת הלמידה שלנו
                  </p>
                </div>
              </nav>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile menu backdrop */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Mobile menu panel */}
      <div
        className={`fixed top-0 right-0 h-full w-80 bg-white shadow-xl z-40 transform transition-transform duration-300 ease-in-out md:hidden ${
          isMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-6">
          {/* Close button */}
          <div className="flex justify-end mb-6">
            <button
              onClick={() => setIsMenuOpen(false)}
              className="p-2 rounded-lg bg-purple-100 hover:bg-purple-200 transition-colors"
              aria-label="Close menu"
            >
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Menu content */}
          <nav className="space-y-6">
            <div className="text-center">
              <div className="student-welcome-text text-xl mb-2">
                פורטל התלמידים של לודורה
              </div>
              <p className="text-purple-500 text-sm">
                ברוכים הבאים למערכת הלמידה שלנו
              </p>
            </div>
          </nav>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer - Clean student design */}
      <Footer isMaintenanceMode={isMaintenanceMode} theme="student" />

      {/* Toast notifications */}
      <EnhancedToaster />
    </div>
  );
};

export default StudentLayout;
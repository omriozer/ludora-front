import React, { useEffect } from 'react';
import StudentLogin from './StudentLogin';

/**
 * StudentLoginModal Component
 *
 * Modal wrapper around the StudentLogin component for use in StudentsNav and other contexts.
 * Provides modal overlay with backdrop, close functionality, and accessibility features.
 */
const StudentLoginModal = ({ onClose, onLoginSuccess, message }) => {
  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Handle backdrop click to close modal
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle successful login
  const handleLoginSuccess = () => {
    if (onLoginSuccess) {
      onLoginSuccess();
    } else {
      onClose(); // Default behavior - just close modal
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="student-login-modal-title"
    >
      <div
        className="relative w-full max-w-md mx-auto"
        onClick={(e) => e.stopPropagation()} // Prevent backdrop click when clicking modal content
      >
        {/* Modal message if provided */}
        {message && (
          <div className="mb-4 text-center text-white bg-blue-600/90 px-4 py-2 rounded-lg text-sm">
            {message}
          </div>
        )}

        {/* StudentLogin component with modal-specific props */}
        <div id="student-login-modal-title">
          <StudentLogin
            onLoginSuccess={handleLoginSuccess}
            returnPath={null} // Don't navigate, just close modal
            onClose={onClose} // Pass close handler for built-in close button
          />
        </div>
      </div>
    </div>
  );
};

export default StudentLoginModal;
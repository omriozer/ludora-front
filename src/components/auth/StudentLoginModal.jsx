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
    // Execute the login success callback if provided
    if (onLoginSuccess) {
      onLoginSuccess();
    }

    // ALWAYS close the modal after successful login
    // This ensures the modal closes regardless of what the callback does
    onClose();
  };

  return (
    <div
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="student-login-modal-title"
      className="contents" // Use contents to avoid creating extra layout
    >
      {/* Modal message if provided */}
      {message && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[60] text-center text-white bg-blue-600/90 px-4 py-2 rounded-lg text-sm">
          {message}
        </div>
      )}

      {/* StudentLogin component with modal-specific props - handles its own full background */}
      <div id="student-login-modal-title">
        <StudentLogin
          onLoginSuccess={handleLoginSuccess}
          returnPath={null} // Don't navigate, just close modal
          onClose={onClose} // Pass close handler for built-in close button
        />
      </div>
    </div>
  );
};

export default StudentLoginModal;
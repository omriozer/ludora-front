import React, { useEffect } from 'react';
import ExitButton from './ExitButton';

/**
 * FullScreenOverlay - Reusable full-screen overlay component
 * Used by dice roller, table display, and other full-screen widgets
 */
const FullScreenOverlay = ({
  onClose,
  children,
  title = null,
  backgroundColor = 'bg-white',
  showExitButton = true
}) => {

  // ESC key handler for exit
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Prevent body scroll when overlay is active
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  return (
    <div className={`fixed inset-0 ${backgroundColor} z-50 flex flex-col`}>

      {/* Exit Button - Top Left */}
      {showExitButton && (
        <ExitButton onClose={onClose} />
      )}

      {/* Optional Title - Top Center */}
      {title && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-60">
          <div className="bg-gray-100 border border-gray-300 rounded-xl px-6 py-3 shadow-lg">
            <h1 className="text-xl font-bold text-gray-800 text-center">
              {title}
            </h1>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {children}
      </div>
    </div>
  );
};

export default FullScreenOverlay;
import React from 'react';
import SchoolForm from './SchoolForm';

/**
 * Reusable modal component for school add/edit operations
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Function to call when modal should close
 * @param {Object|null} props.school - School data for editing (null for adding new)
 * @param {Function} props.onSave - Function to call when school is saved
 * @param {Object} props.currentUser - Current user object for admin features
 * @param {string} [props.title] - Custom title for the modal (optional)
 * @param {string} [props.maxWidth='max-w-2xl'] - Custom max width class (optional)
 * @param {string} [props.maxHeight='max-h-[90vh]'] - Custom max height class (optional)
 */
export default function SchoolModal({
  isOpen,
  onClose,
  school = null,
  onSave,
  currentUser,
  title,
  maxWidth = 'max-w-2xl',
  maxHeight = 'max-h-[90vh]'
}) {
  // Default title if not provided
  const modalTitle = title || (school ? 'עריכת מוסד חינוך' : 'הוספת מוסד חינוך חדש');

  // Handle backdrop click to close modal
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle escape key to close modal
  React.useEffect(() => {
    const handleEscapeKey = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
      // Prevent background scrolling when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Don't render anything if modal is not open
  if (!isOpen) {
    return <></>;
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="school-modal-title"
    >
      <div
        className={`w-full ${maxWidth} ${maxHeight} overflow-y-auto`}
        onClick={(e) => e.stopPropagation()} // Prevent modal from closing when clicking inside
      >
        <SchoolForm
          school={school}
          onSave={onSave}
          onCancel={onClose}
          title={modalTitle}
          currentUser={currentUser}
        />
      </div>
    </div>
  );
}
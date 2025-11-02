import React, { createContext, useContext, useState, useEffect } from 'react';
import ConfirmationDialog from '@/components/ui/confirmation-dialog';
import { setGlobalConfirmationHandler } from '@/utils/messaging';

/**
 * Global confirmation dialog provider
 * Enables promise-based confirmation dialogs throughout the app
 */

const ConfirmationContext = createContext();

export function ConfirmationProvider({ children }) {
  const [dialogState, setDialogState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'אישור',
    cancelText: 'ביטול',
    variant: 'warning',
    resolve: null,
    operationStatus: null, // null, 'loading', 'success', 'error'
    loadingMessage: 'מעבד...',
    successMessage: '',
    errorMessage: '',
    asyncOperation: null
  });

  const showConfirmation = (title, message, options = {}) => {
    return new Promise((resolve) => {
      setDialogState({
        isOpen: true,
        title,
        message,
        confirmText: options.confirmText || 'אישור',
        cancelText: options.cancelText || 'ביטול',
        variant: options.variant || 'warning',
        resolve,
        operationStatus: null,
        loadingMessage: options.loadingMessage || 'מעבד...',
        successMessage: options.successMessage || 'הפעולה הושלמה בהצלחה',
        errorMessage: options.errorMessage || 'אירעה שגיאה',
        asyncOperation: options.asyncOperation || null
      });
    });
  };

  // Register this provider with the global messaging system
  useEffect(() => {
    setGlobalConfirmationHandler(showConfirmation);
    return () => setGlobalConfirmationHandler(null);
  }, []);

  const handleConfirm = async () => {
    // If there's an async operation, handle it
    if (dialogState.asyncOperation) {
      try {
        // Set loading state
        setDialogState(prev => ({ ...prev, operationStatus: 'loading' }));

        // Execute the async operation
        await dialogState.asyncOperation();

        // Set success state
        setDialogState(prev => ({ ...prev, operationStatus: 'success' }));

        // Resolve the promise with true after success animation
        if (dialogState.resolve) {
          // Give time for success animation to show before resolving
          setTimeout(() => {
            setDialogState(prev => ({ ...prev, isOpen: false, operationStatus: null }));
            dialogState.resolve(true);
          }, 2000);
        }
      } catch (error) {
        // Set error state
        setDialogState(prev => ({ ...prev, operationStatus: 'error' }));

        // Resolve the promise with false after error animation
        if (dialogState.resolve) {
          // Give time for error animation to show before resolving
          setTimeout(() => {
            setDialogState(prev => ({ ...prev, isOpen: false, operationStatus: null }));
            dialogState.resolve(false);
          }, 2000);
        }
      }
    } else {
      // Standard immediate confirmation
      setDialogState(prev => ({ ...prev, isOpen: false }));
      if (dialogState.resolve) {
        dialogState.resolve(true);
      }
    }
  };

  const handleCancel = () => {
    setDialogState(prev => ({ ...prev, isOpen: false }));
    if (dialogState.resolve) {
      dialogState.resolve(false);
    }
  };

  return (
    <ConfirmationContext.Provider value={{ showConfirmation }}>
      {children}
      <ConfirmationDialog
        isOpen={dialogState.isOpen}
        onClose={handleCancel}
        onConfirm={handleConfirm}
        title={dialogState.title}
        message={dialogState.message}
        confirmText={dialogState.confirmText}
        cancelText={dialogState.cancelText}
        variant={dialogState.variant}
        operationStatus={dialogState.operationStatus}
        loadingMessage={dialogState.loadingMessage}
        successMessage={dialogState.successMessage}
        errorMessage={dialogState.errorMessage}
      />
    </ConfirmationContext.Provider>
  );
}

export function useConfirmation() {
  const context = useContext(ConfirmationContext);
  if (!context) {
    throw new Error('useConfirmation must be used within a ConfirmationProvider');
  }
  return context;
}
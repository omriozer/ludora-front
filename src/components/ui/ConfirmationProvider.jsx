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
    resolve: null
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
        resolve
      });
    });
  };

  // Register this provider with the global messaging system
  useEffect(() => {
    setGlobalConfirmationHandler(showConfirmation);
    return () => setGlobalConfirmationHandler(null);
  }, []);

  const handleConfirm = () => {
    setDialogState(prev => ({ ...prev, isOpen: false }));
    if (dialogState.resolve) {
      dialogState.resolve(true);
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
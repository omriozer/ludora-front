// src/hooks/useActivityCodeHandler.js
// React hook for handling activity code input and validation
// Provides unified interface for both manual input and QR scanning

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { resolveActivityCode, normalizeActivityCode, isValidActivityCode } from '@/utils/codeResolver';
import { ludlog, luderror } from '@/lib/ludlog';

/**
 * Hook for handling activity code input and validation
 * @param {Object} options - Hook options
 * @param {Function} options.showConfirmationDialog - Function to show confirmation dialog
 * @returns {Object} Hook interface
 */
export function useActivityCodeHandler(options = {}) {
  const { showConfirmationDialog } = options;
  const navigate = useNavigate();

  // State for code input
  const [codeInput, setCodeInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Handle code input change with validation
   * Automatically formats and validates input
   */
  const handleCodeInputChange = useCallback((e) => {
    const normalizedValue = normalizeActivityCode(e.target.value);
    setCodeInput(normalizedValue);
  }, []);

  /**
   * Handle code input keydown events
   * Triggers submission on Enter key if code is valid
   */
  const handleCodeInputKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && isValidActivityCode(codeInput)) {
      handleCodeEntry(codeInput);
    }
  }, [codeInput]);

  /**
   * Main code entry handler
   * Resolves activity code and navigates to appropriate page
   * @param {string} code - Activity code to process (optional, uses codeInput if not provided)
   * @param {Object} entryOptions - Additional options
   * @param {string} entryOptions.type - Known type hint ('portal' | 'lobby')
   * @returns {Promise<Object>} Resolution result
   */
  const handleCodeEntry = useCallback(async (code, entryOptions = {}) => {
    const finalCode = code || codeInput;
    const { type = null } = entryOptions;

    ludlog.general(`🎯 useActivityCodeHandler: Processing code entry: ${finalCode}`);

    if (!finalCode || !finalCode.trim()) {
      if (showConfirmationDialog) {
        showConfirmationDialog({
          isOpen: true,
          title: 'קוד חסר',
          message: 'אנא הזינו קוד פעילות',
          variant: 'warning',
          confirmText: 'בסדר',
          cancelText: null,
          onConfirm: () => {
            showConfirmationDialog({ isOpen: false });
          }
        });
      }
      return null;
    }

    if (!isValidActivityCode(finalCode)) {
      if (showConfirmationDialog) {
        showConfirmationDialog({
          isOpen: true,
          title: 'קוד לא תקין',
          message: 'קוד פעילות חייב להיות באורך 6 תווים (לובי משחק) או 8 תווים (פורטל מורה)',
          variant: 'warning',
          confirmText: 'בסדר',
          cancelText: null,
          onConfirm: () => {
            showConfirmationDialog({ isOpen: false });
          }
        });
      }
      return null;
    }

    try {
      setIsLoading(true);

      // Resolve the activity code
      const result = await resolveActivityCode(finalCode, {
        type,
        navigate,
        showConfirmationDialog
      });

      // Clear input on success
      setCodeInput('');

      ludlog.general(`✅ useActivityCodeHandler: Code resolved successfully`, { data: result });
      return result;

    } catch (error) {
      ludlog.validation(`❌ useActivityCodeHandler: Code resolution failed`, { data: error });
      // Error handling is done inside resolveActivityCode
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [codeInput, navigate, showConfirmationDialog]);

  /**
   * Reset the input state
   */
  const resetCodeInput = useCallback(() => {
    setCodeInput('');
    setIsLoading(false);
  }, []);

  /**
   * Check if current input is valid for submission
   */
  const isInputValid = useCallback(() => {
    return isValidActivityCode(codeInput);
  }, [codeInput]);

  /**
   * Handle QR code scan result
   * @param {string} qrData - Raw QR scan data
   * @returns {Promise<Object>} Resolution result
   */
  const handleQRScanResult = useCallback(async (qrData) => {
    ludlog.general(`📱 useActivityCodeHandler: Processing QR scan: ${qrData}`);

    try {
      setIsLoading(true);

      // Import QR handling function to avoid circular dependency
      const { handleQRScanResult } = await import('@/utils/codeResolver');

      const result = await handleQRScanResult(qrData, navigate, showConfirmationDialog);

      ludlog.general(`✅ useActivityCodeHandler: QR scan resolved successfully`, { data: result });
      return result;

    } catch (error) {
      ludlog.validation(`❌ useActivityCodeHandler: QR scan resolution failed`, { data: error });
      // Error handling is done inside handleQRScanResult
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [navigate, showConfirmationDialog]);

  /**
   * Complete QR scanning workflow - opens camera and processes result
   * @returns {Promise<Object>} Scan result
   */
  const handleQRScan = useCallback(async () => {
    ludlog.general(`📷 useActivityCodeHandler: Starting QR scan workflow`);

    try {
      setIsLoading(true);

      // Import scanner utility
      const { scanQRCode } = await import('@/utils/qrScannerUtils');

      // Start QR scanning with camera
      return new Promise((resolve) => {
        scanQRCode({
          onSuccess: async (scannedData) => {
            ludlog.general(`📱 useActivityCodeHandler: QR scan successful: ${scannedData}`);
            const result = await handleQRScanResult(scannedData);
            resolve(result);
          },
          onError: (error) => {
            ludlog.validation(`❌ useActivityCodeHandler: QR scan failed: ${error}`);

            if (showConfirmationDialog) {
              showConfirmationDialog({
                isOpen: true,
                title: 'סריקה נכשלה',
                message: error || 'לא הצלחנו לסרוק את קוד ה-QR. אנא נסו שוב.',
                variant: 'warning',
                confirmText: 'בסדר',
                cancelText: null,
                onConfirm: () => {
                  showConfirmationDialog({ isOpen: false });
                }
              });
            }

            resolve(null);
          }
        });
      });

    } catch (error) {
      ludlog.validation(`❌ useActivityCodeHandler: QR scan workflow failed`, { data: error });

      if (showConfirmationDialog) {
        showConfirmationDialog({
          isOpen: true,
          title: 'שגיאה בסריקה',
          message: 'לא הצלחנו לפתוח את המצלמה. אנא בדקו שיש לכם הרשאה למצלמה.',
          variant: 'warning',
          confirmText: 'בסדר',
          cancelText: null,
          onConfirm: () => {
            showConfirmationDialog({ isOpen: false });
          }
        });
      }

      return null;
    } finally {
      setIsLoading(false);
    }
  }, [handleQRScanResult, showConfirmationDialog]);

  return {
    // State
    codeInput,
    isLoading,

    // Input handlers
    handleCodeInputChange,
    handleCodeInputKeyDown,

    // Main actions
    handleCodeEntry,
    handleQRScan, // Complete QR scanning workflow
    handleQRScanResult, // Process QR data only

    // Utility functions
    resetCodeInput,
    isInputValid,

    // Input validation helpers
    normalizeActivityCode,
    isValidActivityCode
  };
}
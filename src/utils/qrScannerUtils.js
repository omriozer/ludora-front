/**
 * QR Code Scanner Utilities
 *
 * Provides utilities for QR code scanning with proper camera permission handling
 * and consistent user experience across the student portal.
 */

/**
 * Check if camera is available without actually opening it
 * Uses enumerateDevices instead of getUserMedia to avoid permission prompts
 * @returns {Promise<boolean>} True if camera is available
 */
export const checkCameraAvailability = async () => {
  try {
    // Check if MediaDevices API is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return false;
    }

    // Enumerate devices to check for video inputs
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');

    return videoDevices.length > 0;
  } catch (error) {
    console.warn('Camera availability check failed:', error);
    return false;
  }
};

/**
 * Request camera permission and handle user experience
 * @returns {Promise<{success: boolean, stream?: MediaStream, error?: string}>}
 */
export const requestCameraPermission = async () => {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return {
        success: false,
        error: 'Camera API not supported in this browser'
      };
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment' // Prefer back camera for QR scanning
      }
    });

    return {
      success: true,
      stream
    };
  } catch (error) {
    console.error('Camera permission request failed:', error);

    // Provide user-friendly error messages
    let errorMessage = 'Could not access camera';

    if (error.name === 'NotAllowedError') {
      errorMessage = 'Camera permission was denied. Please allow camera access and try again.';
    } else if (error.name === 'NotFoundError') {
      errorMessage = 'No camera found on this device.';
    } else if (error.name === 'NotReadableError') {
      errorMessage = 'Camera is already in use by another application.';
    }

    return {
      success: false,
      error: errorMessage
    };
  }
};

/**
 * Stop camera stream and clean up resources
 * @param {MediaStream} stream - The camera stream to stop
 */
export const stopCameraStream = (stream) => {
  if (stream && stream.getTracks) {
    stream.getTracks().forEach(track => {
      track.stop();
    });
  }
};

/**
 * Open QR code scanner with proper user experience
 * This function will be enhanced once we add a QR scanning library
 * @param {Object} options - Scanner options
 * @param {Function} options.onSuccess - Callback when QR code is successfully scanned
 * @param {Function} options.onError - Callback when an error occurs
 * @param {Function} options.onClose - Callback when scanner is closed
 * @returns {Promise<{success: boolean, scanner?: Object, error?: string}>}
 */
export const openQRScanner = async ({ onSuccess, onError, onClose }) => {
  try {
    // First check if camera is available
    const isCameraAvailable = await checkCameraAvailability();
    if (!isCameraAvailable) {
      const error = 'No camera available on this device';
      if (onError) onError(error);
      return { success: false, error };
    }

    // Request camera permission
    const permissionResult = await requestCameraPermission();
    if (!permissionResult.success) {
      if (onError) onError(permissionResult.error);
      return { success: false, error: permissionResult.error };
    }

    // TODO: Implement actual QR scanning once library is added
    // For now, show a placeholder that simulates scanning
    console.log('QR Scanner would open here');

    // Simulate QR scanning for demonstration
    // This will be replaced with actual QR scanning library integration
    setTimeout(() => {
      // Stop the camera stream since this is just a demo
      stopCameraStream(permissionResult.stream);

      // For demo purposes, show that scanning would work
      if (onSuccess) {
        onSuccess('DEMO123'); // This would be the actual scanned data
      }
    }, 2000);

    return {
      success: true,
      scanner: {
        close: () => {
          stopCameraStream(permissionResult.stream);
          if (onClose) onClose();
        }
      }
    };

  } catch (error) {
    console.error('QR Scanner failed to open:', error);
    const errorMessage = 'Failed to open QR scanner';
    if (onError) onError(errorMessage);
    return { success: false, error: errorMessage };
  }
};

/**
 * Handle QR scan result and navigate/process accordingly
 * @param {string} scannedData - The scanned QR code data
 * @returns {Promise<{success: boolean, action?: string, error?: string}>}
 */
export const handleQRScanResult = async (scannedData) => {
  try {
    console.log('Processing QR scan result:', scannedData);

    // Check if it's a Ludora portal URL
    const portalMatch = scannedData.match(/my\.ludora\.app\/portal\/([A-Z0-9]{6})/i);
    if (portalMatch) {
      const invitationCode = portalMatch[1];
      console.log('Found teacher portal code:', invitationCode);
      // TODO: Navigate to teacher catalog
      window.location.href = `/portal/${invitationCode}`;
      return { success: true, action: 'teacher_portal' };
    }

    // Check if it's a game lobby URL
    const gameMatch = scannedData.match(/my\.ludora\.app\/play\/([A-Z0-9]{6})/i);
    if (gameMatch) {
      const lobbyCode = gameMatch[1];
      console.log('Found game lobby code:', lobbyCode);
      // TODO: Navigate to game lobby
      window.location.href = `/play/${lobbyCode}`;
      return { success: true, action: 'game_lobby' };
    }

    // Check if it's just a 6-character code
    const codeMatch = scannedData.match(/^[A-Z0-9]{6}$/i);
    if (codeMatch) {
      const code = codeMatch[0].toUpperCase();
      console.log('Found 6-character code:', code);
      // TODO: Determine if it's a teacher code or game code and navigate accordingly
      // For now, assume it could be either
      return { success: true, action: 'code_detected', data: code };
    }

    // Unrecognized format
    return {
      success: false,
      error: 'QR code format not recognized. Please scan a valid Ludora QR code.'
    };

  } catch (error) {
    console.error('Failed to process QR scan result:', error);
    return {
      success: false,
      error: 'Failed to process scanned QR code'
    };
  }
};

/**
 * Main function to handle QR scanning workflow
 * This is the primary function that components should use
 * @param {Object} options - Scanning options
 * @param {Function} options.onSuccess - Called when scanning succeeds with result
 * @param {Function} options.onError - Called when an error occurs
 * @returns {Promise<void>}
 */
export const scanQRCode = async ({ onSuccess, onError } = {}) => {
  try {
    const scannerResult = await openQRScanner({
      onSuccess: async (scannedData) => {
        const result = await handleQRScanResult(scannedData);
        if (result.success) {
          if (onSuccess) onSuccess(result);
        } else {
          if (onError) onError(result.error);
        }
      },
      onError: (error) => {
        if (onError) onError(error);
      },
      onClose: () => {
        console.log('QR scanner closed');
      }
    });

    if (!scannerResult.success) {
      if (onError) onError(scannerResult.error);
    }

  } catch (error) {
    console.error('QR scanning workflow failed:', error);
    if (onError) onError('QR scanning failed');
  }
};

export default {
  checkCameraAvailability,
  requestCameraPermission,
  stopCameraStream,
  openQRScanner,
  handleQRScanResult,
  scanQRCode
};
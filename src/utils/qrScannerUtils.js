/**
 * QR Code Scanner Utilities
 *
 * Provides utilities for QR code scanning with proper camera permission handling
 * and consistent user experience across the student portal.
 */
import QrScanner from 'qr-scanner';

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

    // Create a video element for the scanner
    const videoElement = document.createElement('video');
    videoElement.style.width = '100%';
    videoElement.style.height = '100%';
    videoElement.style.objectFit = 'cover';

    // Create scanner overlay container
    const scannerContainer = document.createElement('div');
    scannerContainer.id = 'qr-scanner-container';
    scannerContainer.style.position = 'fixed';
    scannerContainer.style.top = '0';
    scannerContainer.style.left = '0';
    scannerContainer.style.width = '100%';
    scannerContainer.style.height = '100%';
    scannerContainer.style.backgroundColor = 'black';
    scannerContainer.style.zIndex = '9999';
    scannerContainer.style.display = 'flex';
    scannerContainer.style.flexDirection = 'column';

    // Create header with close button
    const header = document.createElement('div');
    header.style.position = 'relative';
    header.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    header.style.color = 'white';
    header.style.padding = '1rem';
    header.style.textAlign = 'center';
    header.innerHTML = `
      <h3 style="margin: 0; font-size: 1.1rem; font-weight: 600;">Scan QR Code</h3>
      <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem; opacity: 0.8;">Point your camera at a QR code</p>
    `;

    const closeButton = document.createElement('button');
    closeButton.innerHTML = '×';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '1rem';
    closeButton.style.right = '1rem';
    closeButton.style.background = 'none';
    closeButton.style.border = 'none';
    closeButton.style.color = 'white';
    closeButton.style.fontSize = '1.5rem';
    closeButton.style.cursor = 'pointer';
    closeButton.style.padding = '0.5rem';
    closeButton.style.lineHeight = '1';

    header.appendChild(closeButton);

    // Create video container with scanning overlay
    const videoContainer = document.createElement('div');
    videoContainer.style.position = 'relative';
    videoContainer.style.flex = '1';
    videoContainer.style.display = 'flex';
    videoContainer.style.alignItems = 'center';
    videoContainer.style.justifyContent = 'center';

    // Add scanning frame overlay
    const scanningFrame = document.createElement('div');
    scanningFrame.style.position = 'absolute';
    scanningFrame.style.width = '250px';
    scanningFrame.style.height = '250px';
    scanningFrame.style.border = '2px solid white';
    scanningFrame.style.borderRadius = '8px';
    scanningFrame.style.zIndex = '10';
    scanningFrame.style.pointerEvents = 'none';

    videoContainer.appendChild(videoElement);
    videoContainer.appendChild(scanningFrame);

    scannerContainer.appendChild(header);
    scannerContainer.appendChild(videoContainer);

    // Add to DOM
    document.body.appendChild(scannerContainer);

    // Initialize QR Scanner
    let qrScanner = null;

    try {
      qrScanner = new QrScanner(
        videoElement,
        (result) => {
          cleanup();
          if (onSuccess) onSuccess(result.data);
        },
        {
          returnDetailedScanResult: true,
          preferredCamera: 'environment', // Use back camera
          highlightScanRegion: false, // We have our own overlay
          highlightCodeOutline: false
        }
      );

      await qrScanner.start();

    } catch (scannerError) {
      console.error('Failed to start QR scanner:', scannerError);
      cleanup();

      let errorMessage = 'Failed to access camera';
      if (scannerError.name === 'NotAllowedError') {
        errorMessage = 'Camera permission was denied. Please allow camera access and try again.';
      } else if (scannerError.name === 'NotFoundError') {
        errorMessage = 'No camera found on this device.';
      } else if (scannerError.name === 'NotReadableError') {
        errorMessage = 'Camera is already in use by another application.';
      }

      if (onError) onError(errorMessage);
      return { success: false, error: errorMessage };
    }

    // Cleanup function
    const cleanup = () => {
      if (qrScanner) {
        qrScanner.stop();
        qrScanner.destroy();
        qrScanner = null;
      }
      if (scannerContainer && scannerContainer.parentNode) {
        document.body.removeChild(scannerContainer);
      }
    };

    // Close button handler
    closeButton.addEventListener('click', () => {
      cleanup();
      if (onClose) onClose();
    });

    // Return scanner control object
    return {
      success: true,
      scanner: {
        close: () => {
          cleanup();
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

// Note: handleQRScanResult has been moved to @/utils/codeResolver
// Components should use the useActivityCodeHandler hook or import directly from codeResolver

/**
 * Main function to handle QR scanning workflow
 * This is a simplified version that just handles the camera scanning.
 * Components should handle the QR result processing via useActivityCodeHandler hook.
 *
 * @param {Object} options - Scanning options
 * @param {Function} options.onSuccess - Called when scanning succeeds with raw QR data
 * @param {Function} options.onError - Called when an error occurs
 * @returns {Promise<void>}
 */
export const scanQRCode = async ({ onSuccess, onError } = {}) => {
  try {
    const scannerResult = await openQRScanner({
      onSuccess: (scannedData) => {
        if (onSuccess) onSuccess(scannedData);
      },
      onError: (error) => {
        if (onError) onError(error);
      },
      onClose: () => {
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
  scanQRCode
};
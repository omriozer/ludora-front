// QRCodeStyling will be dynamically imported to fix bundling issues
let QRCodeStyling = null;

/**
 * QR Code styling presets for Ludora
 */

// Ludora color schemes - matching the logo
const LUDORA_COLORS = {
  primary: '#6366f1',
  secondary: '#8b5cf6',
  accent: '#06b6d4',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  dark: '#1e293b',
  light: '#f1f5f9',

  // Logo-inspired colors
  ludoraTeal: '#00CCC0',        // Matching the teal "LU"
  ludoraYellow: '#FFD700',      // Matching the yellow in "DO"
  ludoraOrange: '#FF8C00',      // Matching the orange in "DO"
  ludoraRed: '#FF4757',         // Matching the red in "RA"
  ludoraPink: '#FF6B9D',        // Matching the pink in "RA"
  ludoraBlue: '#4834DF'         // Accent blue
};

/**
 * Dynamically load QRCodeStyling library to fix bundling issues
 * @returns {Promise<Object>} QRCodeStyling constructor
 */
async function loadQRCodeStyling() {
  if (!QRCodeStyling) {
    try {
      // Try the default import first (most common for this library)
      const module = await import('qr-code-styling');
      QRCodeStyling = module.default || module;
    } catch (error) {
      console.error('Failed to load QRCodeStyling library:', error);
      throw new Error('QR code library could not be loaded');
    }
  }
  return QRCodeStyling;
}

/**
 * Preset styles for different use cases
 */
export const QR_PRESETS = {
  // Modern gradient style
  gradient: {
    width: 300,
    height: 300,
    type: "canvas",
    data: "",
    image: null,
    margin: 10,
    qrOptions: {
      typeNumber: 0,
      mode: "Byte",
      errorCorrectionLevel: "M"
    },
    imageOptions: {
      hideBackgroundDots: true,
      imageSize: 0.4,
      margin: 20,
      crossOrigin: "anonymous",
    },
    dotsOptions: {
      color: LUDORA_COLORS.primary,
      type: "rounded",
      gradient: {
        type: "linear",
        rotation: 45,
        colorStops: [
          { offset: 0, color: LUDORA_COLORS.primary },
          { offset: 1, color: LUDORA_COLORS.secondary }
        ]
      }
    },
    backgroundOptions: {
      color: "#ffffff",
      gradient: {
        type: "radial",
        rotation: 0,
        colorStops: [
          { offset: 0, color: "#ffffff" },
          { offset: 1, color: LUDORA_COLORS.light }
        ]
      }
    },
    cornersSquareOptions: {
      color: LUDORA_COLORS.accent,
      type: "extra-rounded",
      gradient: {
        type: "linear",
        rotation: 45,
        colorStops: [
          { offset: 0, color: LUDORA_COLORS.accent },
          { offset: 1, color: LUDORA_COLORS.primary }
        ]
      }
    },
    cornersDotOptions: {
      color: LUDORA_COLORS.dark,
      type: "dot"
    }
  },

  // Gaming themed style
  gaming: {
    width: 300,
    height: 300,
    type: "canvas",
    data: "",
    image: null,
    margin: 10,
    qrOptions: {
      typeNumber: 0,
      mode: "Byte",
      errorCorrectionLevel: "M"
    },
    imageOptions: {
      hideBackgroundDots: true,
      imageSize: 0.4,
      margin: 20,
      crossOrigin: "anonymous",
    },
    dotsOptions: {
      color: "#00ff00",
      type: "classy",
      gradient: {
        type: "linear",
        rotation: 90,
        colorStops: [
          { offset: 0, color: "#00ff00" },
          { offset: 0.5, color: "#0080ff" },
          { offset: 1, color: "#8000ff" }
        ]
      }
    },
    backgroundOptions: {
      color: "#000000"
    },
    cornersSquareOptions: {
      color: "#ff0080",
      type: "square"
    },
    cornersDotOptions: {
      color: "#ffffff",
      type: "square"
    }
  },

  // Educational style
  educational: {
    width: 300,
    height: 300,
    type: "canvas",
    data: "",
    image: null,
    margin: 15,
    qrOptions: {
      typeNumber: 0,
      mode: "Byte",
      errorCorrectionLevel: "M"
    },
    imageOptions: {
      hideBackgroundDots: true,
      imageSize: 0.3,
      margin: 25,
      crossOrigin: "anonymous",
    },
    dotsOptions: {
      color: LUDORA_COLORS.success,
      type: "dots",
    },
    backgroundOptions: {
      color: "#fefefe",
      gradient: {
        type: "linear",
        rotation: 45,
        colorStops: [
          { offset: 0, color: "#ffffff" },
          { offset: 1, color: "#f0f9ff" }
        ]
      }
    },
    cornersSquareOptions: {
      color: LUDORA_COLORS.warning,
      type: "extra-rounded"
    },
    cornersDotOptions: {
      color: LUDORA_COLORS.dark,
      type: "dot"
    }
  },

  // Minimal style
  minimal: {
    width: 250,
    height: 250,
    type: "canvas",
    data: "",
    image: null,
    margin: 20,
    qrOptions: {
      typeNumber: 0,
      mode: "Byte",
      errorCorrectionLevel: "M"
    },
    dotsOptions: {
      color: LUDORA_COLORS.dark,
      type: "square"
    },
    backgroundOptions: {
      color: "#ffffff"
    },
    cornersSquareOptions: {
      color: LUDORA_COLORS.dark,
      type: "square"
    },
    cornersDotOptions: {
      color: LUDORA_COLORS.dark,
      type: "square"
    }
  },

  // Artistic style with custom dots
  artistic: {
    width: 300,
    height: 300,
    type: "canvas",
    data: "",
    image: null,
    margin: 10,
    qrOptions: {
      typeNumber: 0,
      mode: "Byte",
      errorCorrectionLevel: "M"
    },
    imageOptions: {
      hideBackgroundDots: true,
      imageSize: 0.4,
      margin: 20,
      crossOrigin: "anonymous",
    },
    dotsOptions: {
      color: LUDORA_COLORS.error,
      type: "classy-rounded",
      gradient: {
        type: "radial",
        rotation: 0,
        colorStops: [
          { offset: 0, color: LUDORA_COLORS.warning },
          { offset: 0.5, color: LUDORA_COLORS.error },
          { offset: 1, color: LUDORA_COLORS.dark }
        ]
      }
    },
    backgroundOptions: {
      color: "#ffffff"
    },
    cornersSquareOptions: {
      color: LUDORA_COLORS.primary,
      type: "extra-rounded",
      gradient: {
        type: "linear",
        rotation: 135,
        colorStops: [
          { offset: 0, color: LUDORA_COLORS.primary },
          { offset: 1, color: LUDORA_COLORS.accent }
        ]
      }
    },
    cornersDotOptions: {
      color: LUDORA_COLORS.light,
      type: "dot"
    }
  },

  // Business/Professional style
  professional: {
    width: 300,
    height: 300,
    type: "canvas",
    data: "",
    image: null,
    margin: 20,
    qrOptions: {
      typeNumber: 0,
      mode: "Byte",
      errorCorrectionLevel: "H"
    },
    imageOptions: {
      hideBackgroundDots: true,
      imageSize: 0.3,
      margin: 30,
      crossOrigin: "anonymous",
    },
    dotsOptions: {
      color: "#2563eb",
      type: "rounded"
    },
    backgroundOptions: {
      color: "#ffffff"
    },
    cornersSquareOptions: {
      color: "#1e40af",
      type: "square"
    },
    cornersDotOptions: {
      color: "#1e40af",
      type: "square"
    }
  },

  // === LUDORA LOGO-INSPIRED PRESETS ===

  // Official Ludora style with logo embedded
  ludoraOfficial: {
    width: 300,
    height: 300,
    type: "canvas",
    data: "",
    image: "/src/assets/images/logo.png", // Will use the logo
    margin: 0, // Remove default margin for maximum QR code size
    qrOptions: {
      typeNumber: 0,
      mode: "Byte",
      errorCorrectionLevel: "H" // Higher error correction for logo
    },
    imageOptions: {
      hideBackgroundDots: true,
      imageSize: 0.4, // Much larger logo - 40% coverage
      margin: 0, // Remove logo margin for maximum coverage
      crossOrigin: "anonymous",
    },
    dotsOptions: {
      color: LUDORA_COLORS.ludoraTeal,
      type: "extra-rounded",
      gradient: {
        type: "linear",
        rotation: 45,
        colorStops: [
          { offset: 0, color: LUDORA_COLORS.ludoraTeal },
          { offset: 0.5, color: LUDORA_COLORS.ludoraYellow },
          { offset: 1, color: LUDORA_COLORS.ludoraOrange }
        ]
      }
    },
    backgroundOptions: {
      color: "#ffffff",
      gradient: {
        type: "radial",
        rotation: 0,
        colorStops: [
          { offset: 0, color: "#ffffff" },
          { offset: 1, color: "#f8fafc" }
        ]
      }
    },
    cornersSquareOptions: {
      color: LUDORA_COLORS.ludoraTeal,
      type: "extra-rounded"
    },
    cornersDotOptions: {
      color: LUDORA_COLORS.ludoraRed,
      type: "dot"
    }
  },

  // Teal-themed (matching "LU" letters)
  ludoraTeal: {
    width: 300,
    height: 300,
    type: "canvas",
    data: "",
    image: null,
    margin: 15,
    qrOptions: {
      typeNumber: 0,
      mode: "Byte",
      errorCorrectionLevel: "M"
    },
    dotsOptions: {
      color: LUDORA_COLORS.ludoraTeal,
      type: "extra-rounded",
      gradient: {
        type: "radial",
        rotation: 0,
        colorStops: [
          { offset: 0, color: "#ffffff" },
          { offset: 0.3, color: LUDORA_COLORS.ludoraTeal },
          { offset: 1, color: LUDORA_COLORS.ludoraBlue }
        ]
      }
    },
    backgroundOptions: {
      color: "#ffffff",
      gradient: {
        type: "linear",
        rotation: 135,
        colorStops: [
          { offset: 0, color: "#ffffff" },
          { offset: 1, color: "#e0f7fa" }
        ]
      }
    },
    cornersSquareOptions: {
      color: LUDORA_COLORS.ludoraTeal,
      type: "extra-rounded",
      gradient: {
        type: "linear",
        rotation: 45,
        colorStops: [
          { offset: 0, color: LUDORA_COLORS.ludoraTeal },
          { offset: 1, color: LUDORA_COLORS.ludoraBlue }
        ]
      }
    },
    cornersDotOptions: {
      color: "#ffffff",
      type: "dot"
    }
  },

  // Fire gradient (matching "DORA" letters)
  ludoraFire: {
    width: 300,
    height: 300,
    type: "canvas",
    data: "",
    image: null,
    margin: 10,
    qrOptions: {
      typeNumber: 0,
      mode: "Byte",
      errorCorrectionLevel: "M"
    },
    dotsOptions: {
      type: "rounded",
      gradient: {
        type: "linear",
        rotation: 90,
        colorStops: [
          { offset: 0, color: LUDORA_COLORS.ludoraYellow },
          { offset: 0.5, color: LUDORA_COLORS.ludoraOrange },
          { offset: 1, color: LUDORA_COLORS.ludoraRed }
        ]
      }
    },
    backgroundOptions: {
      color: "#ffffff",
      gradient: {
        type: "radial",
        rotation: 0,
        colorStops: [
          { offset: 0, color: "#ffffff" },
          { offset: 1, color: "#fff8f1" }
        ]
      }
    },
    cornersSquareOptions: {
      type: "extra-rounded",
      gradient: {
        type: "linear",
        rotation: 45,
        colorStops: [
          { offset: 0, color: LUDORA_COLORS.ludoraRed },
          { offset: 1, color: LUDORA_COLORS.ludoraPink }
        ]
      }
    },
    cornersDotOptions: {
      color: LUDORA_COLORS.ludoraYellow,
      type: "dot"
    }
  },

  // Playful bee-inspired (matching the bee character)
  ludoraPlayful: {
    width: 300,
    height: 300,
    type: "canvas",
    data: "",
    image: null,
    margin: 15,
    qrOptions: {
      typeNumber: 0,
      mode: "Byte",
      errorCorrectionLevel: "M"
    },
    dotsOptions: {
      type: "dots", // Rounded dots like bee spots
      gradient: {
        type: "radial",
        rotation: 0,
        colorStops: [
          { offset: 0, color: LUDORA_COLORS.ludoraYellow },
          { offset: 0.6, color: LUDORA_COLORS.ludoraOrange },
          { offset: 1, color: "#333333" }
        ]
      }
    },
    backgroundOptions: {
      color: "#ffffff",
      gradient: {
        type: "linear",
        rotation: 180,
        colorStops: [
          { offset: 0, color: "#ffffff" },
          { offset: 0.5, color: "#fffef7" },
          { offset: 1, color: "#f0f9ff" }
        ]
      }
    },
    cornersSquareOptions: {
      color: LUDORA_COLORS.ludoraTeal,
      type: "extra-rounded"
    },
    cornersDotOptions: {
      color: "#333333",
      type: "dot"
    }
  }
};

/**
 * Create a QR code with a specific preset
 * @param {string} data - The data to encode in the QR code
 * @param {string} preset - The preset name to use
 * @param {Object} customOptions - Optional custom options to override preset
 * @param {string} logoUrl - Optional logo URL to include in the center
 * @returns {Promise<QRCodeStyling>} QR code instance
 */
export async function createQRCode(data, preset = 'gradient', customOptions = {}, logoUrl = null) {
  // Dynamically load the library
  const QRCodeStylingConstructor = await loadQRCodeStyling();

  if (!QR_PRESETS[preset]) {
    console.warn(`QR preset "${preset}" not found. Using gradient preset.`);
    preset = 'gradient';
  }

  const options = {
    ...QR_PRESETS[preset],
    data,
    ...customOptions
  };

  // Add logo if provided
  if (logoUrl) {
    options.image = logoUrl;
    options.imageOptions = {
      ...options.imageOptions,
      hideBackgroundDots: true,
      imageSize: 0.35, // Good balance for custom logos
      margin: 10
    };
  }

  return new QRCodeStylingConstructor(options);
}

/**
 * Generate QR code and append to DOM element
 * @param {string} data - The data to encode
 * @param {HTMLElement} container - DOM element to append QR code to
 * @param {string} preset - Preset name
 * @param {Object} customOptions - Custom options
 * @param {string} logoUrl - Optional logo URL
 * @returns {Promise<QRCodeStyling>} QR code instance
 */
export async function renderQRCode(data, container, preset = 'gradient', customOptions = {}, logoUrl = null) {
  try {
    const qrCode = await createQRCode(data, preset, customOptions, logoUrl);

    // Safely clear container - only remove non-React managed elements
    if (container) {
      // Find any existing QR elements and remove them specifically
      const existingQRElements = container.querySelectorAll('canvas, svg');
      existingQRElements.forEach(element => {
        if (element.parentNode === container) {
          container.removeChild(element);
        }
      });

      // Append QR code
      qrCode.append(container);
    }

    return qrCode;
  } catch (error) {
    console.error('Error rendering QR code:', error);
    throw error;
  }
}

/**
 * Download QR code as image
 * @param {QRCodeStyling} qrCode - QR code instance
 * @param {string} filename - Filename for download
 * @param {string} extension - File extension (png, svg, jpg, webp)
 */
export function downloadQRCode(qrCode, filename = 'qr-code', extension = 'png') {
  if (!qrCode) {
    console.error('QR code instance is required');
    return;
  }

  qrCode.download({
    name: filename,
    extension: extension
  });
}

/**
 * Get QR code as data URL
 * @param {QRCodeStyling} qrCode - QR code instance
 * @param {string} extension - File extension (png, svg, jpg, webp)
 * @returns {Promise<string>} Data URL
 */
export async function getQRCodeDataURL(qrCode, extension = 'png') {
  if (!qrCode) {
    console.error('QR code instance is required');
    return null;
  }

  try {
    return await qrCode.getRawData(extension);
  } catch (error) {
    console.error('Error generating QR code data URL:', error);
    return null;
  }
}

/**
 * Create a custom QR code with specific styling
 * @param {Object} config - Complete configuration object
 * @returns {Promise<QRCodeStyling>} QR code instance
 */
export async function createCustomQRCode(config) {
  const QRCodeStylingConstructor = await loadQRCodeStyling();
  return new QRCodeStylingConstructor(config);
}

/**
 * Get list of available presets
 * @returns {string[]} Array of preset names
 */
export function getAvailablePresets() {
  return Object.keys(QR_PRESETS);
}

/**
 * Get preset configuration
 * @param {string} preset - Preset name
 * @returns {Object|null} Preset configuration or null if not found
 */
export function getPresetConfig(preset) {
  return QR_PRESETS[preset] || null;
}

/**
 * Create a QR code with Ludora logo embedded
 * @param {string} data - The data to encode
 * @param {string} preset - Base preset to use (default: 'ludoraOfficial')
 * @param {Object} customOptions - Custom options to override
 * @returns {Promise<QRCodeStyling>} QR code instance with logo
 */
export async function createLudoraQRCode(data, preset = 'ludoraOfficial', customOptions = {}) {
  return await createQRCode(data, preset, customOptions);
}

/**
 * Create a QR code with custom logo
 * @param {string} data - The data to encode
 * @param {string} logoUrl - URL to your logo image
 * @param {string} preset - Base preset to use (default: 'professional')
 * @param {Object} customOptions - Custom options
 * @returns {Promise<QRCodeStyling>} QR code instance with custom logo
 */
export async function createQRCodeWithLogo(data, logoUrl, preset = 'professional', customOptions = {}) {
  return await createQRCode(data, preset, customOptions, logoUrl);
}

/**
 * Get all Ludora-branded preset names
 * @returns {string[]} Array of Ludora preset names
 */
export function getLudoraPresets() {
  return Object.keys(QR_PRESETS).filter(preset => preset.startsWith('ludora'));
}

// Ludora Official preset for easy access
export const LUDORA_OFFICIAL_PRESET = 'ludoraOfficial';

// Export colors for external use
export { LUDORA_COLORS };
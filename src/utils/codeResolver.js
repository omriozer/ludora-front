// src/utils/codeResolver.js
// Unified activity code resolution for both QR scanner and manual input
// Handles teacher portal codes and game lobby codes

import { apiRequestAnonymous } from '@/services/apiClient';
import { ludlog } from '@/lib/ludlog';

/**
 * Validate invitation code format (8 characters: A-Z, 1-9, excludes 0 and O)
 * @param {string} code - Invitation code to validate
 * @returns {boolean} True if valid invitation code format
 */
export function isValidInvitationCode(code) {
  if (!code || typeof code !== 'string') return false;

  // Must be exactly 8 characters, uppercase letters A-Z and digits 1-9 (excludes 0 and O)
  const invitationCodeRegex = /^[ABCDEFGHIJKLMNPQRSTUVWXYZ123456789]{8}$/;
  return invitationCodeRegex.test(code) && !code.includes('0') && !code.includes('O');
}

/**
 * Validate lobby code format (6 characters: A-Z, 2-9, excludes 0, 1, I, O)
 * @param {string} code - Lobby code to validate
 * @returns {boolean} True if valid lobby code format
 */
export function isValidLobbyCode(code) {
  if (!code || typeof code !== 'string') return false;

  // Must be exactly 6 characters, uppercase letters and digits 2-9 (excludes 0, 1, I, O)
  const lobbyCodeRegex = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;
  return lobbyCodeRegex.test(code) && !code.includes('0') && !code.includes('1') && !code.includes('I') && !code.includes('O');
}

/**
 * Validate activity code format (either invitation or lobby code)
 * @param {string} code - Activity code to validate
 * @returns {boolean} True if valid format
 */
export function isValidActivityCode(code) {
  if (!code || typeof code !== 'string') return false;

  return isValidInvitationCode(code) || isValidLobbyCode(code);
}

/**
 * Determine the type of code based on length and format
 * @param {string} code - Activity code to analyze
 * @returns {string|null} 'invitation' for 8-char codes, 'lobby' for 6-char codes, null if invalid
 */
export function getCodeType(code) {
  if (!code || typeof code !== 'string') return null;

  if (code.length === 8 && isValidInvitationCode(code)) {
    return 'invitation';
  } else if (code.length === 6 && isValidLobbyCode(code)) {
    return 'lobby';
  }

  return null;
}

/**
 * Normalize activity code (uppercase, remove spaces/special chars)
 * @param {string} code - Raw input code
 * @returns {string} Normalized code
 */
export function normalizeActivityCode(code) {
  if (!code || typeof code !== 'string') return '';

  return code
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, 8); // Limit to 8 characters (max for invitation codes)
}

/**
 * Validate teacher invitation code
 * @param {string} code - 8-character teacher invitation code
 * @returns {Promise<Object>} Success: { type: 'portal', code, teacherData } | Error thrown
 */
async function validateInvitationCode(code) {
  ludlog.ui(`🔍 Validating invitation code: ${code}`);

  try {
    // Try to get teacher catalog using the code
    const teacherData = await apiRequestAnonymous(`/games/teacher/${code}`);

    ludlog.ui(`✅ Invitation code valid: ${code}`, { data: teacherData });

    return {
      type: 'portal',
      code,
      teacherData,
      redirectPath: `/portal/${code}`
    };
  } catch (error) {
    ludlog.ui(`❌ Invitation code invalid: ${code}`, { data: error });
    throw error;
  }
}

/**
 * Validate game lobby code
 * @param {string} code - 6-character lobby code
 * @returns {Promise<Object>} Success: { type: 'lobby', code, lobbyData } | Error thrown
 */
async function validateLobbyCode(code) {
  ludlog.ui(`🔍 Validating lobby code: ${code}`);

  try {
    // Try to join lobby by code (validation only, using temp participant)
    const lobbyData = await apiRequestAnonymous('/game-lobbies/join-by-code', {
      method: 'POST',
      body: JSON.stringify({
        lobby_code: code,
        participant: {
          display_name: 'temp_validation', // Temporary name for validation
          user_id: null,
          guest_token: `validation_${Date.now()}`,
        }
      })
    });

    ludlog.ui(`✅ Lobby code valid: ${code}`, { data: lobbyData });

    return {
      type: 'lobby',
      code,
      lobbyData,
      redirectPath: `/lobby/${code}`
    };
  } catch (error) {
    ludlog.ui(`❌ Lobby code invalid: ${code}`, { data: error });
    throw error;
  }
}

/**
 * Resolve activity code type and validate
 * Main entry point for both QR scanner and manual input
 *
 * @param {string} rawCode - Raw activity code input
 * @param {Object} options - Options object
 * @param {string} options.type - Known type hint ('portal' | 'lobby' | null)
 * @param {Function} options.navigate - React Router navigate function
 * @param {Function} options.showConfirmationDialog - Confirmation dialog function
 * @param {boolean} options.suppressErrors - Don't show error dialogs
 * @returns {Promise<Object>} Resolved code data with redirect info
 */
export async function resolveActivityCode(rawCode, options = {}) {
  const { type = null, navigate, showConfirmationDialog, suppressErrors = false } = options;

  ludlog.generic(`🔍 Resolving activity code: ${rawCode}`, { data: { typeHint: type } });

  // Normalize the code
  const code = normalizeActivityCode(rawCode);

  // Validate format first
  if (!isValidActivityCode(code)) {
    let errorMessage;
    let title;

    // Provide specific error messages based on length and format
    if (!code || code.length === 0) {
      title = 'קוד חסר';
      errorMessage = 'אנא הזינו קוד פעילות';
    } else if (code.length < 6) {
      title = 'קוד קצר מדי';
      errorMessage = `הקוד חייב להכיל לפחות 6 תווים (הזנתם ${code.length} תווים)`;
    } else if (code.length > 8) {
      title = 'קוד ארוך מדי';
      errorMessage = `הקוד חייב להכיל עד 8 תווים (הזנתם ${code.length} תווים)`;
    } else if (code.length === 7) {
      title = 'אורך קוד לא תקין';
      errorMessage = 'קוד פעילות חייב להיות באורך 6 תווים (לובי משחק) או 8 תווים (פורטל מורה)';
    } else {
      // Length is 6 or 8, but format is invalid
      if (code.length === 6) {
        title = 'קוד לובי לא תקין';
        errorMessage = 'קוד לובי חייב להכיל רק אותיות A-Z ומספרים 2-9 (לא כולל 0, 1, I, O)';
      } else if (code.length === 8) {
        title = 'קוד מורה לא תקין';
        errorMessage = 'קוד מורה חייב להכיל רק אותיות A-Z ומספרים 1-9 (לא כולל 0, O)';
      } else {
        title = 'פורמט קוד לא תקין';
        errorMessage = 'הקוד חייב להכיל רק אותיות באנגלית ומספרים';
      }
    }

    if (!suppressErrors && showConfirmationDialog) {
      showConfirmationDialog({
        isOpen: true,
        title,
        message: errorMessage,
        variant: 'warning',
        confirmText: 'בסדר',
        cancelText: null,
        onConfirm: () => {
          showConfirmationDialog({ isOpen: false });
        }
      });
    }

    throw new Error(errorMessage);
  }

  let result;

  try {
    // Determine the code type if not provided
    let resolvedType = type;
    if (!resolvedType) {
      const detectedType = getCodeType(code);
      if (detectedType === 'invitation') {
        resolvedType = 'portal';
      } else if (detectedType === 'lobby') {
        resolvedType = 'lobby';
      }
    }

    // Validate based on type
    if (resolvedType === 'portal' || (!resolvedType && code.length === 8)) {
      result = await validateInvitationCode(code);
    } else if (resolvedType === 'lobby' || (!resolvedType && code.length === 6)) {
      result = await validateLobbyCode(code);
    } else {
      // Try both if type is still unclear
      try {
        result = await validateInvitationCode(code);
      } catch {
        result = await validateLobbyCode(code);
      }
    }

    // Success! Navigate to the resolved path
    if (navigate && result.redirectPath) {
      ludlog.ui(`🚀 Navigating to: ${result.redirectPath}`);
      navigate(result.redirectPath);
    }

    return result;

  } catch (error) {
    ludlog.ui(`❌ Failed to resolve activity code: ${code}`, { data: error });

    // Show user-friendly error message
    let errorMessage;
    if (code.length === 8) {
      errorMessage = 'לא הצלחנו למצוא מורה עם הקוד הזה. בדקו שקוד המורה נכון';
    } else if (code.length === 6) {
      errorMessage = 'לא הצלחנו למצוא לובי משחק עם הקוד הזה. בדקו שקוד הלובי נכון';
    } else {
      errorMessage = 'לא הצלחנו למצוא מורה או לובי משחק עם הקוד הזה. בדקו שהקוד נכון';
    }

    if (!suppressErrors && showConfirmationDialog) {
      showConfirmationDialog({
        isOpen: true,
        title: 'קוד לא נמצא',
        message: errorMessage,
        variant: 'warning',
        confirmText: 'בסדר',
        cancelText: null,
        onConfirm: () => {
          showConfirmationDialog({ isOpen: false });
        }
      });
    }

    throw new Error(errorMessage);
  }
}

/**
 * Parse QR code data to extract code and type
 * @param {string} qrData - Raw QR code data (URL or code)
 * @returns {Object} { code, type } | null if invalid
 */
export function parseQRCodeData(qrData) {
  if (!qrData || typeof qrData !== 'string') return null;

  ludlog.generic(`🔍 Parsing QR code data: ${qrData}`);

  // Check for portal URL pattern: /my.ludora.app/portal/CODE or /portal/CODE (8-character invitation codes)
  const portalMatch = qrData.match(/\/portal\/([A-Z0-9]{8})/i);
  if (portalMatch) {
    const code = portalMatch[1].toUpperCase();
    if (isValidInvitationCode(code)) {
      ludlog.ui(`📋 Found invitation code in QR: ${code}`);
      return { code, type: 'portal' };
    }
  }

  // Check for lobby URL pattern: /my.ludora.app/lobby/CODE or /lobby/CODE (6-character lobby codes)
  const lobbyMatch = qrData.match(/\/lobby\/([A-Z0-9]{6})/i);
  if (lobbyMatch) {
    const code = lobbyMatch[1].toUpperCase();
    if (isValidLobbyCode(code)) {
      ludlog.ui(`🎮 Found lobby code in QR: ${code}`);
      return { code, type: 'lobby' };
    }
  }

  // Check for plain code (6 or 8 characters)
  const plainCode = normalizeActivityCode(qrData);
  if (isValidActivityCode(plainCode)) {
    ludlog.ui(`🔤 Found plain code in QR: ${plainCode}`);

    // Determine type based on format
    const codeType = getCodeType(plainCode);
    let type = null;
    if (codeType === 'invitation') {
      type = 'portal';
    } else if (codeType === 'lobby') {
      type = 'lobby';
    }

    return { code: plainCode, type };
  }

  ludlog.ui(`❌ Invalid QR code format: ${qrData}`);
  return null;
}

/**
 * Handle QR code scan result
 * @param {string} qrData - Raw QR scan data
 * @param {Function} navigate - React Router navigate function
 * @param {Function} showConfirmationDialog - Confirmation dialog function
 * @returns {Promise<Object>} Resolved code data
 */
export async function handleQRScanResult(qrData, navigate, showConfirmationDialog) {
  ludlog.ui(`📱 Handling QR scan result: ${qrData}`);

  const parsed = parseQRCodeData(qrData);

  if (!parsed) {
    const errorMessage = 'קוד QR לא תקין. הקוד חייב להכיל קישור לפורטל מורה או לובי משחק';

    if (showConfirmationDialog) {
      showConfirmationDialog({
        isOpen: true,
        title: 'QR לא תקין',
        message: errorMessage,
        variant: 'warning',
        confirmText: 'בסדר',
        cancelText: null,
        onConfirm: () => {
          showConfirmationDialog({ isOpen: false });
        }
      });
    }

    throw new Error(errorMessage);
  }

  // Resolve the parsed code
  return await resolveActivityCode(parsed.code, {
    type: parsed.type,
    navigate,
    showConfirmationDialog
  });
}
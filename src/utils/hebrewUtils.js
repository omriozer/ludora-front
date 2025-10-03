/**
 * Hebrew text detection and font utilities
 * Matches the backend Hebrew detection logic exactly
 */

/**
 * Check if text contains Hebrew characters
 * @param {string} text - Input text to check
 * @returns {boolean} True if text contains Hebrew characters
 */
export function containsHebrew(text) {
  if (!text) return false;
  // Hebrew Unicode range: \u0590-\u05FF (same as backend)
  return /[\u0590-\u05FF]/.test(text);
}

/**
 * Get appropriate font family for text based on content
 * Matches backend font selection logic
 * @param {string} text - Text content
 * @param {boolean} isBold - Whether text should be bold
 * @returns {string} CSS font-family string
 */
export function getTextFontFamily(text, isBold = false) {
  if (containsHebrew(text)) {
    // Use Hebrew fonts for Hebrew text (same as backend)
    return "'NotoSansHebrew', 'Arial Unicode MS', 'Segoe UI', Arial, sans-serif";
  } else {
    // Use standard fonts for non-Hebrew text (same as backend Helvetica family)
    if (isBold) {
      return "'Helvetica Neue', Helvetica, Arial, sans-serif";
    }
    return "'Helvetica Neue', Helvetica, Arial, sans-serif";
  }
}

/**
 * Get CSS class names for Hebrew text styling
 * @param {string} text - Text content
 * @param {boolean} isBold - Whether text should be bold
 * @returns {string} CSS class names
 */
export function getHebrewTextClasses(text, isBold = false) {
  const classes = [];

  if (containsHebrew(text)) {
    classes.push('hebrew-text');
    if (isBold) {
      classes.push('font-bold');
    }
  }

  return classes.join(' ');
}

/**
 * Apply Hebrew font styling to a React element style object
 * @param {string} text - Text content
 * @param {boolean} isBold - Whether text should be bold
 * @param {Object} existingStyle - Existing style object
 * @returns {Object} Updated style object with Hebrew font settings
 */
export function applyHebrewFontStyle(text, isBold = false, existingStyle = {}) {
  return {
    ...existingStyle,
    fontFamily: getTextFontFamily(text, isBold),
    direction: containsHebrew(text) ? 'rtl' : 'ltr',
    fontWeight: isBold ? 'bold' : existingStyle.fontWeight || 'normal'
  };
}
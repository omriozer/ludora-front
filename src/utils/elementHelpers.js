/**
 * Element Helper Functions - Frontend
 * Provides unified access to element properties across builtin and custom elements
 * Mirrors the backend elementHelpers.js for consistency
 */

/**
 * Check if an element type is a builtin element
 * @param {string} elementType - Element type/key (e.g., 'logo', 'text', 'url', 'free-text', 'box')
 * @returns {boolean} True if it's a builtin element
 */
export function isBuiltinElement(elementType) {
  return ['logo', 'text', 'url', 'copyright-text', 'user-info', 'watermark-logo'].includes(elementType);
}

/**
 * Get rotation value from element using correct property path
 * @param {Object} element - Element object
 * @param {string} elementType - Element type/key
 * @returns {number} Rotation in degrees (0 if not set)
 */
export function getElementRotation(element, elementType) {
  if (!element) return 0;

  if (isBuiltinElement(elementType)) {
    // Built-in elements: use element.rotation
    return element.rotation || 0;
  } else {
    // Custom elements: use element.style.rotation
    return element.style?.rotation || 0;
  }
}

/**
 * Set rotation value on element using correct property path
 * @param {Object} element - Element object (modified in place)
 * @param {string} elementType - Element type/key
 * @param {number} rotation - Rotation in degrees
 * @returns {Object} Modified element (for chaining)
 */
export function setElementRotation(element, elementType, rotation) {
  if (!element) return element;

  if (isBuiltinElement(elementType)) {
    // Built-in elements: use element.rotation
    element.rotation = rotation;
  } else {
    // Custom elements: use element.style.rotation
    if (!element.style) element.style = {};
    element.style.rotation = rotation;
  }

  return element;
}

/**
 * Get position from element
 * @param {Object} element - Element object
 * @param {string} elementType - Element type/key
 * @returns {Object} Position object {x, y} or {x: 50, y: 50} default
 */
export function getElementPosition(element, elementType) {
  if (!element) return { x: 50, y: 50 };

  // Both builtin and custom elements use .position
  return element.position || { x: 50, y: 50 };
}

/**
 * Set position on element
 * @param {Object} element - Element object (modified in place)
 * @param {string} elementType - Element type/key
 * @param {Object} position - Position object {x, y}
 * @returns {Object} Modified element (for chaining)
 */
export function setElementPosition(element, elementType, position) {
  if (!element) return element;

  // Both builtin and custom elements use .position
  element.position = position;

  return element;
}

/**
 * Get visibility from element
 * @param {Object} element - Element object
 * @param {string} elementType - Element type/key
 * @returns {boolean} True if visible
 */
export function getElementVisibility(element, elementType) {
  if (!element) return false;

  // Check for hidden flag first (takes precedence)
  if (element.hidden === true) return false;

  // Then check visible flag
  return element.visible !== false; // Default to true if not explicitly set to false
}

/**
 * Set visibility on element
 * @param {Object} element - Element object (modified in place)
 * @param {string} elementType - Element type/key
 * @param {boolean} visible - Whether element should be visible
 * @returns {Object} Modified element (for chaining)
 */
export function setElementVisibility(element, elementType, visible) {
  if (!element) return element;

  element.visible = visible;

  // Clear hidden flag when setting to visible
  if (visible && element.hidden) {
    element.hidden = false;
  }

  return element;
}

/**
 * Get style property from element using correct path
 * @param {Object} element - Element object
 * @param {string} elementType - Element type/key
 * @param {string} styleProperty - Style property name (e.g., 'fontSize', 'color')
 * @param {*} defaultValue - Default value if property not found
 * @returns {*} Style property value
 */
export function getElementStyleProperty(element, elementType, styleProperty, defaultValue = null) {
  if (!element || !element.style) return defaultValue;

  return element.style[styleProperty] !== undefined ? element.style[styleProperty] : defaultValue;
}

/**
 * Set style property on element
 * @param {Object} element - Element object (modified in place)
 * @param {string} elementType - Element type/key
 * @param {string} styleProperty - Style property name
 * @param {*} value - Style property value
 * @returns {Object} Modified element (for chaining)
 */
export function setElementStyleProperty(element, elementType, styleProperty, value) {
  if (!element) return element;

  if (!element.style) element.style = {};
  element.style[styleProperty] = value;

  return element;
}

/**
 * Get content from element using correct property path
 * @param {Object} element - Element object
 * @param {string} elementType - Element type/key
 * @returns {string} Content string or empty string
 */
export function getElementContent(element, elementType) {
  if (!element) return '';

  // Both builtin and custom elements typically use .content
  // But URL elements might use .href
  if (elementType === 'url') {
    return element.content || element.href || '';
  }

  return element.content || '';
}

/**
 * Set content on element
 * @param {Object} element - Element object (modified in place)
 * @param {string} elementType - Element type/key
 * @param {string} content - Content string
 * @returns {Object} Modified element (for chaining)
 */
export function setElementContent(element, elementType, content) {
  if (!element) return element;

  element.content = content;

  // For URL elements, also update href if it exists
  if (elementType === 'url' && element.href !== undefined) {
    element.href = content;
  }

  return element;
}

/**
 * Create a unified element info object for easier handling
 * @param {Object} element - Element object
 * @param {string} elementType - Element type/key
 * @param {string} elementKey - Element key/id for custom elements
 * @returns {Object} Unified element info object
 */
export function createUnifiedElementInfo(element, elementType, elementKey = null) {
  return {
    element,
    elementType,
    elementKey,
    isBuiltin: isBuiltinElement(elementType),
    rotation: getElementRotation(element, elementType),
    position: getElementPosition(element, elementType),
    visible: getElementVisibility(element, elementType),
    content: getElementContent(element, elementType)
  };
}

/**
 * Get transform style string for CSS rotation (mimics current frontend behavior)
 * @param {Object} element - Element object
 * @param {string} elementType - Element type/key
 * @returns {string} CSS transform string
 */
export function getElementTransformStyle(element, elementType) {
  const rotation = getElementRotation(element, elementType);
  return `translate(-50%, -50%) rotate(${rotation}deg)`;
}

/**
 * Get shadow style string for CSS box-shadow/text-shadow
 * @param {Object} element - Element object
 * @param {string} elementType - Element type/key
 * @param {boolean} isTextElement - Whether to generate text-shadow (true) or box-shadow (false)
 * @returns {string} CSS shadow string or 'none' if disabled/not set
 */
export function getElementShadowStyle(element, elementType, isTextElement = false) {
  if (!element || !element.style || !element.style.shadow) return 'none';

  const shadow = element.style.shadow;

  // Return 'none' if shadow is disabled
  if (!shadow.enabled) return 'none';

  // Extract shadow properties with defaults
  const offsetX = shadow.offsetX || 0;
  const offsetY = shadow.offsetY || 0;
  const blur = shadow.blur || 0;
  const color = shadow.color || '#000000';
  const opacity = shadow.opacity !== undefined ? shadow.opacity : 50;

  // Convert hex color to RGBA with opacity
  const hexToRgba = (hex, opacity) => {
    // Remove # if present
    hex = hex.replace('#', '');

    // Parse hex to RGB
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    // Convert opacity from 0-100 to 0-1
    const alpha = opacity / 100;

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const shadowColor = hexToRgba(color, opacity);

  // Return shadow CSS string
  // For text elements, text-shadow doesn't use spread radius
  // For other elements, box-shadow can optionally include spread (we'll omit it for simplicity)
  return `${offsetX}px ${offsetY}px ${blur}px ${shadowColor}`;
}

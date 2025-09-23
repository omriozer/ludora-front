import { SiteText } from "@/services/entities";

// Cache for texts
let textCache = {};
let cacheExpiry = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Global state for showing keys (for admins only)
let showKeysMode = false;
let isAdminUser = false;

export const getText = async (key, fallback = key) => {
  // If in show keys mode and user is admin, return the key in a special format
  if (showKeysMode && isAdminUser) {
    return `{{${key}}}`;
  }

  const now = Date.now();
  
  // Check if cache is still valid
  if (now > cacheExpiry) {
    try {
      const texts = await SiteText.find({ key: key });
      if (texts && texts.length > 0) {
        textCache[key] = texts[0].text;
      }
      cacheExpiry = now + CACHE_DURATION;
    } catch (error) {
      console.error(`Error loading text for key ${key}:`, error);
      // If loading fails, return fallback and don't update cache expiry
      return fallback;
    }
  }
  
  return textCache[key] || fallback;
};

// Backup function in case SiteText is not available
export const getTextSafe = (key, fallback = key) => {
  try {
    return getText(key, fallback);
  } catch (error) {
    console.warn(`getText failed for key ${key}, using fallback: ${fallback}`);
    return fallback;
  }
};

// Function to toggle key display mode (admin only)
export const setShowKeysMode = (show, isAdmin = false) => {
  showKeysMode = show && isAdmin;
  isAdminUser = isAdmin;
  
  // Save to localStorage for persistence
  if (isAdmin) {
    localStorage.setItem('showKeysMode', show ? 'true' : 'false');
  }
  
  // Force re-render by clearing cache
  if (show) {
    clearTextCache();
  }
};

// Get current mode
export const getShowKeysMode = () => {
  // Check localStorage for persisted state
  const saved = localStorage.getItem('showKeysMode');
  if (saved !== null) {
    showKeysMode = saved === 'true';
  }
  return showKeysMode;
};

// Initialize from localStorage on page load
export const initializeKeyMode = (isAdmin = false) => {
  if (isAdmin) {
    const saved = localStorage.getItem('showKeysMode');
    if (saved !== null) {
      showKeysMode = saved === 'true';
      isAdminUser = isAdmin;
    }
  }
};

// Clear cache function for admin use
export const clearTextCache = () => {
  textCache = {};
  cacheExpiry = 0;
};

// Legacy support - in case any file still tries to use SiteTexts.getText
if (typeof window !== 'undefined') {
  window.SiteTexts = {
    getText: getText
  };
}
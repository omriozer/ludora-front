// Utility functions and constants for layout/navigation
import {
  // Essential Navigation & UI
  FileText, Play, Calendar, BookOpen, Users, GraduationCap,
  Settings as SettingsIcon, Mail, Home, Crown, Globe, ArrowLeft, Search, Star,

  // Core Categories (1-2 icons per category)
  File, Folder, Hammer, Wrench, Gamepad, Trophy, Building, School,
  Book, Brain, User, UserCircle, Camera, Video,

  // Common Actions
  Edit, Plus, Check, X, Shield, Code, Heart, Bookmark
} from "lucide-react";

export const iconMap = {
  // Essential Navigation & UI (15 icons)
  'FileText': FileText,
  'Play': Play,
  'Calendar': Calendar,
  'BookOpen': BookOpen,
  'Users': Users,
  'GraduationCap': GraduationCap,
  'Settings': SettingsIcon,
  'SettingsIcon': SettingsIcon,
  'Mail': Mail,
  'Home': Home,
  'Crown': Crown,
  'Globe': Globe,
  'ArrowLeft': ArrowLeft,
  'Search': Search,
  'Star': Star,

  // Core Categories (14 icons - 1-2 per navigation category)
  'File': File,
  'Folder': Folder,
  'Hammer': Hammer,
  'Wrench': Wrench,
  'Gamepad': Gamepad,
  'Trophy': Trophy,
  'Building': Building,
  'School': School,
  'Book': Book,
  'Brain': Brain,
  'User': User,
  'UserCircle': UserCircle,
  'Camera': Camera,
  'Video': Video,

  // Common Actions (8 icons)
  'Edit': Edit,
  'Plus': Plus,
  'Check': Check,
  'X': X,
  'Shield': Shield,
  'Code': Code,
  'Heart': Heart,
  'Bookmark': Bookmark
};

// Note: Navigation items are now managed centrally in /src/config/productTypes.js
// This file only contains the icon mapping for compatibility

/**
 * Get product type icon from settings with proper fallbacks
 * @param {Object} settings - Settings object from API
 * @param {string} navItemKey - Nav item key (e.g., 'files', 'games', 'lesson_plans')
 * @param {string} defaultIcon - Default icon name as fallback
 * @returns {React.Component} - Lucide React icon component
 */
export const getProductTypeIcon = (settings, navItemKey, defaultIcon = 'FileText') => {
  // 1. Try to get custom icon from settings
  const settingsIconField = `nav_${navItemKey}_icon`;
  const customIconName = settings?.[settingsIconField];

  if (customIconName && iconMap[customIconName]) {
    return iconMap[customIconName];
  }

  // 2. Fall back to default icon parameter
  if (defaultIcon && iconMap[defaultIcon]) {
    return iconMap[defaultIcon];
  }

  // 3. Final fallback to FileText
  return iconMap['FileText'] || FileText;
};

/**
 * Get product type icon by product type key
 * Maps product types to their corresponding nav item keys
 * @param {Object} settings - Settings object from API
 * @param {string} productType - Product type key (e.g., 'file', 'game', 'lesson_plan')
 * @returns {React.Component} - Lucide React icon component
 */
export const getProductTypeIconByType = (settings, productType) => {
  // Map product types to nav item keys
  const productTypeToNavItem = {
    'file': 'files',
    'game': 'games',
    'workshop': 'workshops',
    'course': 'courses',
    'tool': 'tools',
    'lesson_plan': 'lesson_plans'
  };

  // Get default icons for each product type
  const defaultIcons = {
    'file': 'FileText',
    'game': 'Play',
    'workshop': 'Calendar',
    'course': 'BookOpen',
    'tool': 'Settings',
    'lesson_plan': 'BookOpen'
  };

  const navItemKey = productTypeToNavItem[productType];
  const defaultIcon = defaultIcons[productType] || 'FileText';

  if (!navItemKey) {
    // If no mapping found, return default icon
    return iconMap[defaultIcon] || iconMap['FileText'] || FileText;
  }

  return getProductTypeIcon(settings, navItemKey, defaultIcon);
};

// ...other shared layout utils can be added here...
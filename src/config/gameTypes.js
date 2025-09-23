/**
 * Centralized Game Types Configuration
 *
 * This is the ONLY file in the application that should contain
 * hardcoded Hebrew game type names and text variations.
 *
 * All other components should import and use names from this file.
 */

import { Target, Brain, Edit } from "lucide-react";

// Game Types Configuration
export const GAME_TYPES = {
  scatter_game: {
    key: 'scatter_game',
    singular: 'תפזורת',
    plural: 'תפזורות',
    navText: 'תפזורת',
    description: 'מציאת מילים בתפזורת',
    icon: Target,
    emoji: '🎯',
    color: 'from-red-500 to-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    gradient: "from-red-400 via-pink-500 to-purple-600",
    defaultPrice: 0,
    deviceCompatibility: 'both',
    isDevelopment: true,
    isPublished: false,
    allowContentCreator: false,
    showInCatalog: false,
    allowedContentTypes: ['Word', 'WordEN', 'ContentList'],
    // Exclusive selection: can select either Word OR WordEN (not both), plus ContentList
    exclusiveContentTypes: {
      groups: [
        ['Word', 'WordEN'] // These are mutually exclusive
      ],
      allowedWithAll: ['ContentList'] // ContentList can be selected with any of the above
    }
  },
  wisdom_maze: {
    key: 'wisdom_maze',
    singular: 'מבוך החוכמה',
    plural: 'מבוכי החוכמה',
    navText: 'מבוך החוכמה',
    description: 'נווט במבוך ופתור משימות',
    icon: Brain,
    emoji: '🧩',
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    gradient: "from-purple-400 via-indigo-500 to-blue-600",
    defaultPrice: 0,
    deviceCompatibility: 'both',
    isDevelopment: true,
    isPublished: false,
    allowContentCreator: false,
    showInCatalog: false,
    allowedContentTypes: ['Word', 'WordEN', 'QA', 'Image', 'ContentList']
  },
  sharp_and_smooth: {
    key: 'sharp_and_smooth',
    singular: 'חד וחלק',
    plural: 'חד וחלק',
    navText: 'חד וחלק',
    description: 'פוצצו את הבועה לפי חוקי השלב',
    icon: Edit,
    emoji: '✏️',
    color: 'from-orange-500 to-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    gradient: "from-orange-400 via-yellow-500 to-amber-600",
    defaultPrice: 0,
    deviceCompatibility: 'both',
    isDevelopment: true,
    isPublished: false,
    allowContentCreator: false,
    showInCatalog: false,
    allowedContentTypes: ['Word', 'WordEN', 'QA', 'ContentList']
  },
  memory_game: {
    key: 'memory_game',
    singular: 'משחק זיכרון',
    plural: 'משחקי זיכרון',
    navText: 'משחק זיכרון',
    description: 'משחק התאמה וזיכרון',
    icon: Brain,
    emoji: '🧠',
    color: 'from-green-500 to-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    gradient: "from-green-400 via-emerald-500 to-teal-600",
    defaultPrice: 0,
    deviceCompatibility: 'both',
    isDevelopment: true,
    isPublished: false,
    allowContentCreator: false,
    showInCatalog: false,
    allowedContentTypes: ['Word', 'WordEN', 'Image', 'ContentList']
  },
  ar_up_there: {
    key: 'ar_up_there',
    singular: 'אי שם',
    plural: 'אי שם',
    navText: 'אי שם',
    description: 'משחק מציאות רבודה למובייל',
    icon: Brain,
    emoji: '📱',
    color: 'from-cyan-500 to-cyan-600',
    bgColor: 'bg-cyan-50',
    borderColor: 'border-cyan-200',
    gradient: "from-cyan-400 via-blue-500 to-indigo-600",
    defaultPrice: 0,
    deviceCompatibility: 'mobile_only',
    isDevelopment: true,
    isPublished: false,
    allowContentCreator: true,
    showInCatalog: false,
    allowedContentTypes: ['Word', 'WordEN', 'QA', 'Image', 'ContentList']
  }
};

// Utility functions
export const getGameTypeName = (key, form = 'singular') => {
  const gameType = GAME_TYPES[key];
  if (!gameType) return key;
  return gameType[form] || gameType.singular;
};

export const getGameTypeConfig = (key) => {
  return GAME_TYPES[key] || null;
};

export const getGameTypeIcon = (key) => {
  const gameType = GAME_TYPES[key];
  return gameType?.emoji || '🎮';
};

export const getGameTypeDescription = (key) => {
  const gameType = GAME_TYPES[key];
  return gameType?.description || '';
};

export const getDeviceCompatibilityText = (compatibility) => {
  switch (compatibility) {
    case 'mobile_only':
      return 'מובייל בלבד';
    case 'desktop_only':
      return 'דסקטופ בלבד';
    case 'both':
      return 'מובייל ודסקטופ';
    default:
      return compatibility;
  }
};

// Filter functions
export const getPublishedGameTypes = () => {
  return Object.values(GAME_TYPES).filter(gameType => gameType.isPublished);
};

export const getContentCreatorAllowedGameTypes = () => {
  return Object.values(GAME_TYPES).filter(gameType => gameType.allowContentCreator);
};

export const getCatalogVisibleGameTypes = () => {
  return Object.values(GAME_TYPES).filter(gameType => gameType.showInCatalog);
};

export const getDevelopmentGameTypes = () => {
  return Object.values(GAME_TYPES).filter(gameType => gameType.isDevelopment);
};

// Export arrays for iteration
export const GAME_TYPE_KEYS = Object.keys(GAME_TYPES);
export const ALL_GAME_TYPES = Object.values(GAME_TYPES);
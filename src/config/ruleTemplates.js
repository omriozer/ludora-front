/**
 * Game Rule Templates Configuration
 *
 * This file contains pre-built rule templates that can be quickly applied
 * during game creation. Each template defines common game patterns and
 * can be customized inline during the game building process.
 */

import { Target, Brain, Edit, Camera, Image, HelpCircle, Languages, Shuffle } from "lucide-react";

// Rule Template Categories
export const RULE_CATEGORIES = {
  WORD_GAMES: {
    key: 'word_games',
    name: 'משחקי מילים',
    description: 'כללי משחק המבוססים על מילים וטקסט',
    icon: Edit,
    color: 'blue'
  },
  VISUAL_GAMES: {
    key: 'visual_games',
    name: 'משחקים חזותיים',
    description: 'כללי משחק המבוססים על תמונות וחזותיות',
    icon: Image,
    color: 'green'
  },
  KNOWLEDGE_GAMES: {
    key: 'knowledge_games',
    name: 'משחקי ידע',
    description: 'כללי משחק לבדיקת ידע ולמידה',
    icon: Brain,
    color: 'purple'
  },
  AR_GAMES: {
    key: 'ar_games',
    name: 'משחקי מציאות רבודה',
    description: 'כללי משחק למציאות רבודה עם מצלמה',
    icon: Camera,
    color: 'cyan'
  }
};

// Rule Templates
export const RULE_TEMPLATES = {
  // Word-based rules
  find_opposite: {
    id: 'find_opposite',
    name: 'מציאת הפך',
    description: 'מצא את המילה ההפוכה',
    category: 'word_games',
    icon: Shuffle,
    emoji: '🔄',
    compatible_game_types: ['scatter_game', 'ar_up_there', 'memory_game'],
    required_content_types: ['Word'],
    config: {
      rule_type: 'opposite_word',
      relationship_types: ['מילים הופכיות'],
      min_options: 3,
      max_options: 6,
      scoring: { correct: 10, incorrect: -2, time_bonus: true },
      difficulty_settings: {
        easy: { time_limit: 30, options_count: 3 },
        medium: { time_limit: 20, options_count: 4 },
        hard: { time_limit: 15, options_count: 6 }
      }
    },
    preview_description: 'השחקן יראה מילה ויצטרך לבחור את המילה ההפוכה מתוך מספר אפשרויות'
  },

  word_translation: {
    id: 'word_translation',
    name: 'תרגום מילים',
    description: 'תרגם מילה מעברית לאנגלית או להפך',
    category: 'word_games',
    icon: Languages,
    emoji: '🌐',
    compatible_game_types: ['scatter_game', 'ar_up_there', 'memory_game'],
    required_content_types: ['Word', 'WordEN'],
    config: {
      rule_type: 'translation',
      relationship_types: ['תרגום'],
      direction: 'both', // hebrew_to_english, english_to_hebrew, both
      min_options: 3,
      max_options: 5,
      scoring: { correct: 15, incorrect: -3, time_bonus: true },
      difficulty_settings: {
        easy: { time_limit: 25, direction: 'hebrew_to_english' },
        medium: { time_limit: 20, direction: 'english_to_hebrew' },
        hard: { time_limit: 15, direction: 'both' }
      }
    },
    preview_description: 'השחקן יראה מילה ויצטרך לבחור את התרגום הנכון'
  },

  same_meaning: {
    id: 'same_meaning',
    name: 'מילים נרדפות',
    description: 'מצא מילה עם אותו משמעות',
    category: 'word_games',
    icon: Target,
    emoji: '🎯',
    compatible_game_types: ['scatter_game', 'ar_up_there', 'memory_game'],
    required_content_types: ['Word'],
    config: {
      rule_type: 'same_meaning',
      relationship_types: ['נרדפות', 'פירוש'],
      min_options: 3,
      max_options: 5,
      scoring: { correct: 12, incorrect: -2, time_bonus: true },
      difficulty_settings: {
        easy: { time_limit: 30, options_count: 3 },
        medium: { time_limit: 20, options_count: 4 },
        hard: { time_limit: 15, options_count: 5 }
      }
    },
    preview_description: 'השחקן יראה מילה ויצטרך לבחור מילה נרדפת או עם משמעות דומה'
  },

  // Visual-based rules
  image_word_match: {
    id: 'image_word_match',
    name: 'התאמת תמונה למילה',
    description: 'התאם בין תמונה למילה המתאימה',
    category: 'visual_games',
    icon: Image,
    emoji: '🖼️',
    compatible_game_types: ['ar_up_there', 'memory_game'],
    required_content_types: ['Word', 'Image'],
    config: {
      rule_type: 'image_word_match',
      relationship_types: ['פירוש', 'תיאור'],
      min_options: 3,
      max_options: 6,
      scoring: { correct: 8, incorrect: -1, time_bonus: false },
      difficulty_settings: {
        easy: { time_limit: 40, options_count: 3 },
        medium: { time_limit: 30, options_count: 4 },
        hard: { time_limit: 20, options_count: 6 }
      }
    },
    preview_description: 'השחקן יראה תמונה ויצטרך לבחור את המילה המתאימה או להפך'
  },

  image_category: {
    id: 'image_category',
    name: 'קטגוריית תמונות',
    description: 'מיין תמונות לפי קטגוריות',
    category: 'visual_games',
    icon: Target,
    emoji: '📂',
    compatible_game_types: ['ar_up_there', 'memory_game'],
    required_content_types: ['Image', 'Attribute'],
    config: {
      rule_type: 'image_category',
      relationship_types: ['מאפיין'],
      attribute_types: ['קטגוריה', 'סוג', 'צבע'],
      min_options: 2,
      max_options: 4,
      scoring: { correct: 10, incorrect: -2, time_bonus: false },
      difficulty_settings: {
        easy: { time_limit: 45, categories_count: 2 },
        medium: { time_limit: 35, categories_count: 3 },
        hard: { time_limit: 25, categories_count: 4 }
      }
    },
    preview_description: 'השחקן יראה תמונות ויצטרך למיין אותן לקטגוריות הנכונות'
  },

  // Knowledge-based rules
  multiple_choice_qa: {
    id: 'multiple_choice_qa',
    name: 'שאלה אמריקאית',
    description: 'שאלה עם מספר תשובות לבחירה',
    category: 'knowledge_games',
    icon: HelpCircle,
    emoji: '❓',
    compatible_game_types: ['scatter_game', 'ar_up_there', 'memory_game'],
    required_content_types: ['QA'],
    config: {
      rule_type: 'multiple_choice',
      use_qa_answers: true,
      add_distractors: true,
      min_options: 3,
      max_options: 4,
      scoring: { correct: 15, incorrect: -3, time_bonus: true },
      difficulty_settings: {
        easy: { time_limit: 40, options_count: 3 },
        medium: { time_limit: 30, options_count: 4 },
        hard: { time_limit: 20, options_count: 4 }
      }
    },
    preview_description: 'השחקן יראה שאלה ויצטרך לבחור את התשובה הנכונה מתוך מספר אפשרויות'
  },

  open_question: {
    id: 'open_question',
    name: 'שאלה פתוחה',
    description: 'שאלה שדורשת הקלדת תשובה',
    category: 'knowledge_games',
    icon: Edit,
    emoji: '✏️',
    compatible_game_types: ['scatter_game', 'ar_up_there'],
    required_content_types: ['QA'],
    config: {
      rule_type: 'open_question',
      check_against: 'correct_answers',
      allow_partial_match: true,
      case_sensitive: false,
      scoring: { correct: 20, incorrect: -1, time_bonus: true },
      difficulty_settings: {
        easy: { time_limit: 60, partial_match: true },
        medium: { time_limit: 45, partial_match: true },
        hard: { time_limit: 30, partial_match: false }
      }
    },
    preview_description: 'השחקן יראה שאלה ויצטרך להקליד את התשובה הנכונה'
  },

  // AR-specific rules
  ar_object_detection: {
    id: 'ar_object_detection',
    name: 'זיהוי עצמים במציאות',
    description: 'מצא עצמים בסביבה באמצעות המצלמה',
    category: 'ar_games',
    icon: Camera,
    emoji: '📷',
    compatible_game_types: ['ar_up_there'],
    required_content_types: ['Word', 'Image'],
    config: {
      rule_type: 'ar_object_detection',
      relationship_types: ['פירוש', 'תיאור'],
      detection_mode: 'manual', // manual, automatic (future)
      confirmation_required: true,
      scoring: { correct: 25, incorrect: -1, discovery_bonus: 5 },
      difficulty_settings: {
        easy: { time_limit: 120, objects_count: 3 },
        medium: { time_limit: 90, objects_count: 5 },
        hard: { time_limit: 60, objects_count: 7 }
      }
    },
    preview_description: 'השחקן יצטרך לכוון את המצלמה על עצמים בסביבה בהתאם לרשימת המשימות'
  },

  ar_scavenger_hunt: {
    id: 'ar_scavenger_hunt',
    name: 'ציד אוצרות AR',
    description: 'מצא רשימה של עצמים בסביבה',
    category: 'ar_games',
    icon: Target,
    emoji: '🔍',
    compatible_game_types: ['ar_up_there'],
    required_content_types: ['Word', 'Image', 'Attribute'],
    config: {
      rule_type: 'ar_scavenger_hunt',
      relationship_types: ['פירוש', 'מאפיין'],
      completion_mode: 'sequential', // sequential, any_order
      hint_system: true,
      scoring: { correct: 20, incorrect: 0, speed_bonus: true },
      difficulty_settings: {
        easy: { time_limit: 300, items_count: 5, hints_allowed: 3 },
        medium: { time_limit: 240, items_count: 7, hints_allowed: 2 },
        hard: { time_limit: 180, items_count: 10, hints_allowed: 1 }
      }
    },
    preview_description: 'השחקן יקבל רשימת עצמים למציאה ויצטרך לצלם אותם בסביבה'
  }
};

// Utility functions
export const getRuleTemplatesByCategory = (category) => {
  return Object.values(RULE_TEMPLATES).filter(template => template.category === category);
};

export const getRuleTemplatesForGameType = (gameType) => {
  return Object.values(RULE_TEMPLATES).filter(template =>
    template.compatible_game_types.includes(gameType)
  );
};

export const getRuleTemplate = (templateId) => {
  return RULE_TEMPLATES[templateId] || null;
};

export const getRequiredContentTypes = (templateId) => {
  const template = getRuleTemplate(templateId);
  return template?.required_content_types || [];
};

export const validateTemplateCompatibility = (templateId, gameType, availableContentTypes) => {
  const template = getRuleTemplate(templateId);
  if (!template) return { valid: false, error: 'Template not found' };

  if (!template.compatible_game_types.includes(gameType)) {
    return { valid: false, error: 'Template not compatible with game type' };
  }

  const missingContentTypes = template.required_content_types.filter(
    type => !availableContentTypes.includes(type)
  );

  if (missingContentTypes.length > 0) {
    return {
      valid: false,
      error: 'Missing required content types',
      missing: missingContentTypes
    };
  }

  return { valid: true };
};

// Export arrays for iteration
export const ALL_RULE_TEMPLATES = Object.values(RULE_TEMPLATES);
export const RULE_TEMPLATE_IDS = Object.keys(RULE_TEMPLATES);
export const ALL_RULE_CATEGORIES = Object.values(RULE_CATEGORIES);
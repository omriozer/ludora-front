import { BaseGamePlugin } from './BaseGamePlugin.js';
import MemoryGameSettings from '@/components/gameBuilder/gameSettings/MemoryGameSettings.jsx';
import MemoryPairingRuleBuilder from '@/components/gameBuilder/steps/MemoryPairingRuleBuilder.jsx';
import { GAME_TYPES } from '@/config/gameTypes.js';

/**
 * Memory Game Plugin
 *
 * Handles memory/matching game logic, settings, and UI components.
 * Manages card pairs, timing rules, difficulty progression, and content pairing logic.
 */
export class MemoryGamePlugin extends BaseGamePlugin {
  constructor() {
    super('memory_game');
  }

  getDisplayName() {
    return GAME_TYPES.memory_game.singular;
  }

  getDefaultSettings() {
    return {
      pairs_count: 6,
      flip_time_limit: null, // null = unlimited
      match_time_limit: 5, // seconds to match after flip
      allow_mismatched_types: false,
      shuffle_cards: true,
      reveal_duration: 2000, // milliseconds to show card before hiding
      difficulty_progression: {
        enabled: false,
        increase_pairs_per_level: 2,
        max_pairs: 12,
        decrease_time_per_level: 0.5
      },
      card_layout: 'grid', // 'grid' or 'circle'
      show_progress: true,
      sound_effects: true,
      animation_speed: 'normal' // 'slow', 'normal', 'fast'
    };
  }

  validateSettings(settings) {
    const errors = [];

    if (settings.pairs_count < 3 || settings.pairs_count > 20) {
      errors.push('מספר הזוגות חייב להיות בין 3 ל-20');
    }

    if (settings.flip_time_limit !== null && settings.flip_time_limit < 1) {
      errors.push('זמן הגבלת היפוך חייב להיות לפחות שנייה אחת');
    }

    if (settings.match_time_limit < 1 || settings.match_time_limit > 30) {
      errors.push('זמן התאמה חייב להיות בין 1 ל-30 שניות');
    }

    if (settings.reveal_duration < 500 || settings.reveal_duration > 5000) {
      errors.push('זמן חשיפת כרטיס חייב להיות בין 0.5 ל-5 שניות');
    }

    if (settings.difficulty_progression?.enabled) {
      const prog = settings.difficulty_progression;
      if (prog.max_pairs && prog.max_pairs < settings.pairs_count) {
        errors.push('מקסימום זוגות בהתקדמות חייב להיות גדול ממספר הזוגות ההתחלתי');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  getCustomSteps() {
    return [
      {
        id: 'memory_settings',
        title: 'הגדרות זיכרון',
        component: MemoryGameSettings,
        insertAfter: 'details',
        validate: (data) => {
          if (!data.game_settings) {
            return { isValid: true, errors: {} };
          }
          return this.validateSettings(data.game_settings);
        }
      },
      {
        id: 'pairing_rules',
        title: 'חוקי זיווג',
        component: MemoryPairingRuleBuilder,
        insertAfter: 'content_stages',
        validate: (data) => {
          const errors = {};
          const rules = data.memory_pairing_rules || [];

          if (rules.length === 0) {
            errors.pairing_rules = 'יש להוסיף לפחות חוק זיווג אחד';
          }

          return {
            isValid: Object.keys(errors).length === 0,
            errors
          };
        }
      }
    ];
  }

  getSettingsComponent() {
    return MemoryGameSettings;
  }

  getContentRestrictions() {
    const gameTypeConfig = GAME_TYPES.memory_game;
    return {
      allowedTypes: gameTypeConfig.allowedContentTypes || ['Word', 'WordEN', 'Image', 'ContentList'],
      exclusiveGroups: { groups: [], allowedWithAll: ['ContentList'] }
    };
  }

  validateContent(selectedContent) {
    const baseValidation = super.validateContent(selectedContent);

    if (!baseValidation.isValid) {
      return baseValidation;
    }

    const errors = [...baseValidation.errors];

    // Memory games need pairable content
    const pairableContent = selectedContent.filter(
      item => ['Word', 'WordEN', 'Image'].includes(item.type)
    );

    if (pairableContent.length === 0) {
      errors.push('משחק זיכרון דורש לפחות תוכן אחד שניתן לזווג (מילים או תמונות)');
    }

    // Check if we have enough items for the requested pairs
    const settings = this.getDefaultSettings();
    const totalPairableItems = pairableContent.reduce(
      (total, content) => total + (content.items?.length || 0), 0
    );

    if (totalPairableItems < settings.pairs_count * 2) {
      errors.push(`התוכן הנבחר מכיל רק ${totalPairableItems} פריטים, אך נדרשים לפחות ${settings.pairs_count * 2} פריטים ליצירת ${settings.pairs_count} זוגות`);
    }

    // Validate pairing logic for different content types
    const wordContent = selectedContent.filter(item => ['Word', 'WordEN'].includes(item.type));
    const imageContent = selectedContent.filter(item => item.type === 'Image');

    if (wordContent.length > 0 && imageContent.length > 0) {
      // Mixed content - ensure we can create meaningful pairs
      const wordItems = wordContent.reduce((total, content) => total + (content.items?.length || 0), 0);
      const imageItems = imageContent.reduce((total, content) => total + (content.items?.length || 0), 0);

      if (Math.min(wordItems, imageItems) < settings.pairs_count) {
        errors.push('עבור תוכן מעורב (מילים ותמונות), צריך מספר שווה של פריטים מכל סוג');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  transformForSave(gameData) {
    const transformed = { ...gameData };

    // Extract memory-specific settings
    const memorySettings = {
      pairs_count: gameData.game_settings?.pairs_count || this.getDefaultSettings().pairs_count,
      flip_time_limit: gameData.game_settings?.flip_time_limit || null,
      match_time_limit: gameData.game_settings?.match_time_limit || this.getDefaultSettings().match_time_limit,
      allow_mismatched_types: gameData.game_settings?.allow_mismatched_types !== undefined
        ? gameData.game_settings.allow_mismatched_types
        : this.getDefaultSettings().allow_mismatched_types,
      shuffle_cards: gameData.game_settings?.shuffle_cards !== undefined
        ? gameData.game_settings.shuffle_cards
        : this.getDefaultSettings().shuffle_cards,
      reveal_duration: gameData.game_settings?.reveal_duration || this.getDefaultSettings().reveal_duration,
      difficulty_progression: gameData.game_settings?.difficulty_progression || this.getDefaultSettings().difficulty_progression
    };

    // For draft saves, don't add memory_settings field - it's not allowed by backend validation
    // Instead, store settings in game_settings for draft compatibility
    transformed.game_settings = {
      type: 'memory_game',
      version: '2.0',
      ...memorySettings
    };

    return transformed;
  }

  transformForEdit(gameData) {
    const transformed = { ...gameData };

    // If we have memory_settings, use them; otherwise fall back to legacy game_settings
    if (gameData.memory_settings) {
      transformed.game_settings = {
        ...this.getDefaultSettings(),
        ...gameData.memory_settings
      };
    } else {
      // Legacy format - keep existing game_settings
      transformed.game_settings = {
        ...this.getDefaultSettings(),
        ...gameData.game_settings
      };
    }

    return transformed;
  }

  getPreviewData(gameData) {
    const settings = gameData.game_settings || this.getDefaultSettings();

    return {
      title: gameData.title || 'משחק זיכרון',
      description: gameData.short_description || 'משחק התאמה וזיכרון',
      gameType: this.getDisplayName(),
      settings: {
        'מספר זוגות': settings.pairs_count,
        'זמן התאמה': settings.match_time_limit ? `${settings.match_time_limit} שניות` : 'ללא הגבלה',
        'זמן חשיפה': `${settings.reveal_duration / 1000} שניות`,
        'ערבוב כרטיסים': settings.shuffle_cards ? 'כן' : 'לא',
        'התקדמות בקושי': settings.difficulty_progression?.enabled ? 'כן' : 'לא'
      },
      contentStages: gameData.content_stages || [],
      pairingInfo: this.generatePairingInfo(gameData)
    };
  }

  generatePairingInfo(gameData) {
    const contentStages = gameData.content_stages || [];
    const settings = gameData.game_settings || this.getDefaultSettings();

    let pairingStrategy = 'זוגות אקראיים';

    // Analyze content to determine pairing strategy
    const wordCount = contentStages.reduce((total, stage) => {
      const wordItems = (stage.contentConnection?.content || [])
        .filter(item => ['Word', 'WordEN'].includes(item.type));
      return total + wordItems.reduce((itemTotal, content) => itemTotal + (content.items?.length || 0), 0);
    }, 0);

    const imageCount = contentStages.reduce((total, stage) => {
      const imageItems = (stage.contentConnection?.content || [])
        .filter(item => item.type === 'Image');
      return total + imageItems.reduce((itemTotal, content) => itemTotal + (content.items?.length || 0), 0);
    }, 0);

    if (wordCount > 0 && imageCount > 0) {
      pairingStrategy = 'התאמת מילים לתמונות';
    } else if (wordCount > 0) {
      pairingStrategy = 'התאמת מילים נרדפות/מובן';
    } else if (imageCount > 0) {
      pairingStrategy = 'התאמת תמונות דומות';
    }

    return {
      strategy: pairingStrategy,
      requiredPairs: settings.pairs_count,
      availableItems: wordCount + imageCount,
      canCreateGame: (wordCount + imageCount) >= (settings.pairs_count * 2)
    };
  }

  onGameTypeSelected(updateGameData) {
    super.onGameTypeSelected(updateGameData);

    // Set default content stages optimized for memory games
    const defaultContentStages = [{
      id: 'stage_1',
      title: 'זוגות למשחק',
      contentConnection: {
        content: [],
        connectionType: 'manual'
      }
    }];

    updateGameData({
      content_stages: defaultContentStages
    });
  }

  /**
   * Define structured database schema requirements for memory games
   * @returns {object} Schema definition
   */
  getSchemaDefinition() {
    return {
      structuredTables: ['memory_pairing_rules'],
      extractedSettings: ['pairing_rules'],
      jsonbIndexes: [
        'pairs_count',
        'difficulty_progression.enabled',
        'match_time_limit'
      ]
    };
  }

  /**
   * Extract pairing rules for storage in structured tables
   * @param {object} gameData - Complete game data including settings
   * @returns {object} - { tableName: dataArray } mapping
   */
  extractStructuredData(gameData) {
    const pairingRules = gameData.memory_pairing_rules || gameData.game_settings?.pairing_rules || [];

    return {
      memory_pairing_rules: pairingRules
    };
  }

  /**
   * Merge structured pairing rules back into game settings for editing
   * @param {object} gameData - Game data from database
   * @param {object} structuredData - Data from auxiliary tables
   * @returns {object} - Enhanced game data for wizard
   */
  mergeStructuredData(gameData, structuredData) {
    const enhanced = { ...gameData };

    // Merge pairing rules from structured data
    if (structuredData.memory_pairing_rules) {
      enhanced.memory_pairing_rules = structuredData.memory_pairing_rules;

      // Also add to game_settings for UI compatibility
      enhanced.game_settings = {
        ...enhanced.game_settings,
        pairing_rules: structuredData.memory_pairing_rules
      };
    }

    return enhanced;
  }

  /**
   * Validate consistency between JSONB and structured data
   * @param {object} gameSettings - Settings from JSONB column
   * @param {object} structuredData - Data from auxiliary tables
   * @returns {object} - { isValid: boolean, errors: string[] }
   */
  validateStructuredDataConsistency(gameSettings, structuredData) {
    const errors = [];

    // Check if pairing rules exist in both places and match
    const jsonbRules = gameSettings.pairing_rules || [];
    const structuredRules = structuredData.memory_pairing_rules || [];

    if (jsonbRules.length !== structuredRules.length) {
      errors.push(`Pairing rules count mismatch: JSONB has ${jsonbRules.length}, structured has ${structuredRules.length}`);
    }

    // Check rule type distribution
    const jsonbRuleTypes = jsonbRules.map(r => r.rule_type).sort();
    const structuredRuleTypes = structuredRules.map(r => r.rule_type).sort();

    if (JSON.stringify(jsonbRuleTypes) !== JSON.stringify(structuredRuleTypes)) {
      errors.push('Pairing rule types do not match between JSONB and structured data');
    }

    // Validate manual pairs if any
    const manualRules = structuredRules.filter(r => r.rule_type === 'manual_pairs');
    for (const rule of manualRules) {
      if (!rule.manual_pairs || rule.manual_pairs.length === 0) {
        errors.push(`Manual pairing rule ${rule.id} has no pairs defined`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }


  /**
   * Enhanced transform for edit with hybrid storage
   * @param {object} gameData - The game data from API
   * @returns {object} - Transformed data for wizard
   */
  transformForEdit(gameData) {
    const transformed = { ...gameData };

    // Merge game_settings with defaults
    transformed.game_settings = {
      ...this.getDefaultSettings(),
      ...gameData.game_settings
    };

    // If we have pairing rules from structured data, use them
    if (gameData.memory_pairing_rules) {
      transformed.memory_pairing_rules = gameData.memory_pairing_rules;
      transformed.game_settings.pairing_rules = gameData.memory_pairing_rules;
    } else if (gameData.game_settings?.pairing_rules) {
      // Fall back to JSONB data
      transformed.memory_pairing_rules = gameData.game_settings.pairing_rules;
    }

    return transformed;
  }
}

export default MemoryGamePlugin;
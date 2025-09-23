import { BaseGamePlugin } from './BaseGamePlugin.js';
import ScatterGameSettings from '@/components/gameBuilder/gameSettings/ScatterGameSettings.jsx';
import { GAME_TYPES } from '@/config/gameTypes.js';

/**
 * Scatter Game Plugin
 *
 * Handles scatter/word search game logic, settings, and UI components.
 * Manages grid size, word difficulty, time limits, and content restrictions.
 */
export class ScatterGamePlugin extends BaseGamePlugin {
  constructor() {
    super('scatter_game');
  }

  getDisplayName() {
    return GAME_TYPES.scatter_game.singular;
  }

  getDefaultSettings() {
    return {
      grid_size: 15,
      words_per_level: 8,
      difficulty_level: 'medium',
      time_limited: false,
      time_limit_seconds: 300,
      word_directions: ['horizontal', 'vertical', 'diagonal'],
      allow_backwards: true,
      highlight_found_words: true,
      case_sensitive: false,
      show_word_list: true,
      auto_advance: false
    };
  }

  getCustomSteps() {
    return [
      {
        id: 'scatter_settings',
        title: 'הגדרות תפזורת',
        component: ScatterGameSettings,
        insertAfter: 'details',
        validate: (data) => {
          if (!data.game_settings) {
            return { isValid: true, errors: {} };
          }

          return this.validateSettings(data.game_settings);
        }
      }
    ];
  }

  validateSettings(settings) {
    const errors = [];

    if (settings.grid_size < 10 || settings.grid_size > 25) {
      errors.push('גודל הרשת חייב להיות בין 10 ל-25');
    }

    if (settings.words_per_level < 3 || settings.words_per_level > 20) {
      errors.push('מספר המילים לכל רמה חייב להיות בין 3 ל-20');
    }

    if (settings.time_limited && (!settings.time_limit_seconds || settings.time_limit_seconds < 30)) {
      errors.push('זמן מוגבל חייב להיות לפחות 30 שניות');
    }

    if (!settings.word_directions || settings.word_directions.length === 0) {
      errors.push('חייב לבחור לפחות כיוון אחד למילים');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  getSettingsComponent() {
    return ScatterGameSettings;
  }

  getContentRestrictions() {
    const gameTypeConfig = GAME_TYPES.scatter_game;
    return {
      allowedTypes: gameTypeConfig.allowedContentTypes,
      exclusiveGroups: gameTypeConfig.exclusiveContentTypes
    };
  }

  validateContent(selectedContent) {
    const baseValidation = super.validateContent(selectedContent);

    if (!baseValidation.isValid) {
      return baseValidation;
    }

    const errors = [...baseValidation.errors];

    // Check minimum content requirement
    const wordContent = selectedContent.filter(
      item => ['Word', 'WordEN'].includes(item.type)
    );

    if (wordContent.length === 0) {
      errors.push('משחק תפזורת דורש לפחות תוכן מילים אחד');
    }

    // Validate word content has enough items
    wordContent.forEach(content => {
      if (content.items && content.items.length < 5) {
        errors.push(`תוכן "${content.title}" חייב להכיל לפחות 5 מילים`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  transformForSave(gameData) {
    // Transform the game data to match the new database schema
    const transformed = { ...gameData };

    // Extract scatter-specific settings
    const scatterSettings = {
      grid_size: gameData.game_settings?.grid_size || this.getDefaultSettings().grid_size,
      words_per_level: gameData.game_settings?.words_per_level || this.getDefaultSettings().words_per_level,
      difficulty_level: gameData.game_settings?.difficulty_level || this.getDefaultSettings().difficulty_level,
      time_limited: gameData.game_settings?.time_limited || this.getDefaultSettings().time_limited,
      time_limit_seconds: gameData.game_settings?.time_limit_seconds || this.getDefaultSettings().time_limit_seconds,
      word_directions: gameData.game_settings?.word_directions || this.getDefaultSettings().word_directions,
      allow_backwards: gameData.game_settings?.allow_backwards !== undefined
        ? gameData.game_settings.allow_backwards
        : this.getDefaultSettings().allow_backwards,
      highlight_found_words: gameData.game_settings?.highlight_found_words !== undefined
        ? gameData.game_settings.highlight_found_words
        : this.getDefaultSettings().highlight_found_words,
      case_sensitive: gameData.game_settings?.case_sensitive !== undefined
        ? gameData.game_settings.case_sensitive
        : this.getDefaultSettings().case_sensitive,
      show_word_list: gameData.game_settings?.show_word_list !== undefined
        ? gameData.game_settings.show_word_list
        : this.getDefaultSettings().show_word_list,
      auto_advance: gameData.game_settings?.auto_advance !== undefined
        ? gameData.game_settings.auto_advance
        : this.getDefaultSettings().auto_advance
    };

    // For draft saves, don't add scatter_settings field - it's not allowed by backend validation
    // Instead, store settings in game_settings for draft compatibility
    transformed.game_settings = {
      type: 'scatter_game',
      version: '2.0',
      ...scatterSettings
    };

    return transformed;
  }

  transformForEdit(gameData) {
    // Transform loaded game data back to wizard format
    const transformed = { ...gameData };

    // If we have scatter_settings, use them; otherwise fall back to legacy game_settings
    if (gameData.scatter_settings) {
      transformed.game_settings = {
        ...this.getDefaultSettings(),
        ...gameData.scatter_settings
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
      title: gameData.title || 'משחק תפזורת',
      description: gameData.short_description || 'משחק חיפוש מילים ברשת',
      gameType: this.getDisplayName(),
      settings: {
        'גודל רשת': `${settings.grid_size}x${settings.grid_size}`,
        'מילים לכל רמה': settings.words_per_level,
        'רמת קושי': settings.difficulty_level,
        'זמן מוגבל': settings.time_limited ? `${settings.time_limit_seconds} שניות` : 'ללא הגבלה',
        'כיווני מילים': settings.word_directions?.join(', ') || 'כל הכיוונים'
      },
      contentStages: gameData.content_stages || [],
      totalContent: (gameData.content_stages || []).reduce(
        (total, stage) => total + (stage.contentConnection?.content?.length || 0), 0
      )
    };
  }

  onGameTypeSelected(updateGameData) {
    super.onGameTypeSelected(updateGameData);

    // Set default content restrictions
    const defaultContentStages = [{
      id: 'stage_1',
      title: 'שלב 1',
      contentConnection: {
        content: [],
        connectionType: 'manual'
      }
    }];

    updateGameData({
      content_stages: defaultContentStages
    });
  }
}

export default ScatterGamePlugin;
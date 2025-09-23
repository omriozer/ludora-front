/**
 * Base Game Plugin Interface
 *
 * Defines the contract that all game type plugins must implement.
 * This ensures consistent behavior across different game types while
 * allowing each game to customize its specific logic and UI.
 */

export class BaseGamePlugin {
  constructor(gameType) {
    this.gameType = gameType;
    this.name = this.getDisplayName();
  }

  /**
   * Returns the display name for this game type
   * @returns {string}
   */
  getDisplayName() {
    throw new Error('getDisplayName() must be implemented by subclass');
  }

  /**
   * Returns the default settings for this game type
   * @returns {object}
   */
  getDefaultSettings() {
    return {};
  }

  /**
   * Validates game settings for this type
   * @param {object} settings - The settings to validate
   * @returns {object} - { isValid: boolean, errors: string[] }
   */
  validateSettings(settings) {
    return { isValid: true, errors: [] };
  }

  /**
   * Returns custom wizard steps specific to this game type
   * Can inject new steps or modify existing ones
   * @returns {Array} - Array of step definitions with injection rules
   * Example:
   * [
   *   {
   *     id: 'game_settings',
   *     title: 'הגדרות משחק',
   *     component: CustomSettingsComponent,
   *     insertAfter: 'details', // Insert after the 'details' step
   *     validate: (data) => ({ isValid: true, errors: {} })
   *   }
   * ]
   */
  getCustomSteps() {
    return [];
  }

  /**
   * Allows plugins to modify existing steps
   * @param {Array} steps - The base steps array
   * @returns {Array} - Modified steps array
   */
  modifySteps(steps) {
    return steps;
  }

  /**
   * Returns the settings component for this game type
   * @returns {React.Component}
   */
  getSettingsComponent() {
    throw new Error('getSettingsComponent() must be implemented by subclass');
  }

  /**
   * Transforms game data before saving to match this game type's schema
   * @param {object} gameData - The raw game data from the wizard
   * @returns {object} - Transformed data ready for API
   */
  transformForSave(gameData) {
    return gameData;
  }

  /**
   * Transforms loaded game data for use in the wizard
   * @param {object} gameData - The game data from API
   * @returns {object} - Transformed data for wizard
   */
  transformForEdit(gameData) {
    return gameData;
  }

  /**
   * Returns content type restrictions for this game
   * @returns {object} - { allowedTypes: string[], exclusiveGroups: object }
   */
  getContentRestrictions() {
    return {
      allowedTypes: [],
      exclusiveGroups: { groups: [], allowedWithAll: [] }
    };
  }

  /**
   * Validates content selection for this game type
   * @param {Array} selectedContent - Array of selected content items
   * @returns {object} - { isValid: boolean, errors: string[] }
   */
  validateContent(selectedContent) {
    const restrictions = this.getContentRestrictions();
    const errors = [];

    // Check allowed content types
    if (restrictions.allowedTypes.length > 0) {
      const invalidItems = selectedContent.filter(
        item => !restrictions.allowedTypes.includes(item.type)
      );
      if (invalidItems.length > 0) {
        errors.push(`סוגי תוכן לא נתמכים: ${invalidItems.map(item => item.type).join(', ')}`);
      }
    }

    // Check exclusive groups
    if (restrictions.exclusiveGroups.groups.length > 0) {
      restrictions.exclusiveGroups.groups.forEach(group => {
        const selectedFromGroup = selectedContent.filter(
          item => group.includes(item.type)
        );
        if (selectedFromGroup.length > 1) {
          const uniqueTypes = [...new Set(selectedFromGroup.map(item => item.type))];
          if (uniqueTypes.length > 1) {
            errors.push(`לא ניתן לבחור יחד: ${uniqueTypes.join(', ')}`);
          }
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Returns preview data for this game type
   * @param {object} gameData - Current game data
   * @returns {object} - Preview data for display
   */
  getPreviewData(gameData) {
    return {
      title: gameData.title || 'משחק ללא שם',
      description: gameData.short_description || 'אין תיאור',
      settings: this.getDefaultSettings(),
      content: gameData.content_stages || []
    };
  }

  /**
   * Hook called when game type is selected
   * @param {function} updateGameData - Function to update game data
   */
  onGameTypeSelected(updateGameData) {
    // Default implementation - override in subclasses if needed
    updateGameData({
      game_settings: this.getDefaultSettings()
    });
  }

  /**
   * Hook called when settings are updated
   * @param {object} newSettings - New settings
   * @param {function} updateGameData - Function to update game data
   */
  onSettingsUpdated(newSettings, updateGameData) {
    // Default implementation - override in subclasses if needed
    updateGameData({
      game_settings: { ...this.getDefaultSettings(), ...newSettings }
    });
  }

  /**
   * Define structured database schema requirements for this game type
   * Allows plugins to declare which settings should be normalized into queryable tables
   * @returns {object} Schema definition
   */
  getSchemaDefinition() {
    return {
      // Tables that should be created for this game type
      structuredTables: [],

      // Settings that should be extracted from game_settings JSONB into structured tables
      extractedSettings: [],

      // Indexes needed on game_settings JSONB for this game type
      jsonbIndexes: []
    };
  }

  /**
   * Extract structured data from game settings for storage in auxiliary tables
   * @param {object} gameData - Complete game data including settings
   * @returns {object} - { tableName: dataArray } mapping
   */
  extractStructuredData(gameData) {
    return {};
  }

  /**
   * Merge structured data back into game settings for editing
   * @param {object} gameData - Game data from database
   * @param {object} structuredData - Data from auxiliary tables { tableName: dataArray }
   * @returns {object} - Enhanced game data for wizard
   */
  mergeStructuredData(gameData, structuredData) {
    return gameData;
  }

  /**
   * Define validation rules for structured data consistency
   * @param {object} gameSettings - Settings from JSONB column
   * @param {object} structuredData - Data from auxiliary tables
   * @returns {object} - { isValid: boolean, errors: string[] }
   */
  validateStructuredDataConsistency(gameSettings, structuredData) {
    return { isValid: true, errors: [] };
  }
}

export default BaseGamePlugin;
import { ScatterGamePlugin } from './ScatterGamePlugin.js';
import { MemoryGamePlugin } from './MemoryGamePlugin.js';

/**
 * Game Plugin Registry
 *
 * Central registry for all game type plugins. Provides a unified interface
 * for registering, retrieving, and managing game type plugins.
 *
 * This enables the game builder to dynamically adapt to different game types
 * without hardcoded logic for each type.
 */
class GamePluginRegistry {
  constructor() {
    this.plugins = new Map();
    this.initialize();
  }

  /**
   * Initialize the registry with default plugins
   */
  initialize() {
    // Register core game plugins
    this.register(new ScatterGamePlugin());
    this.register(new MemoryGamePlugin());

    // TODO: Register additional plugins when implemented
    // this.register(new WisdomMazePlugin());
    // this.register(new SharpSmoothPlugin());
    // this.register(new ARUpTherePlugin());
  }

  /**
   * Register a game plugin
   * @param {BaseGamePlugin} plugin - The plugin instance to register
   */
  register(plugin) {
    if (!plugin.gameType) {
      throw new Error('Plugin must have a gameType property');
    }

    if (this.plugins.has(plugin.gameType)) {
      console.warn(`Plugin for game type '${plugin.gameType}' is already registered. Overwriting.`);
    }

    this.plugins.set(plugin.gameType, plugin);
    console.debug(`Registered plugin for game type: ${plugin.gameType}`);
  }

  /**
   * Unregister a game plugin
   * @param {string} gameType - The game type to unregister
   */
  unregister(gameType) {
    if (this.plugins.has(gameType)) {
      this.plugins.delete(gameType);
      console.debug(`Unregistered plugin for game type: ${gameType}`);
      return true;
    }
    return false;
  }

  /**
   * Get a plugin by game type
   * @param {string} gameType - The game type
   * @returns {BaseGamePlugin|null} - The plugin instance or null if not found
   */
  getPlugin(gameType) {
    return this.plugins.get(gameType) || null;
  }

  /**
   * Check if a plugin is registered for a game type
   * @param {string} gameType - The game type
   * @returns {boolean}
   */
  hasPlugin(gameType) {
    return this.plugins.has(gameType);
  }

  /**
   * Get all registered game types
   * @returns {string[]} - Array of registered game type keys
   */
  getRegisteredGameTypes() {
    return Array.from(this.plugins.keys());
  }

  /**
   * Get all registered plugins
   * @returns {BaseGamePlugin[]} - Array of plugin instances
   */
  getAllPlugins() {
    return Array.from(this.plugins.values());
  }

  /**
   * Get plugins that support a specific content type
   * @param {string} contentType - The content type to check
   * @returns {BaseGamePlugin[]} - Array of supporting plugins
   */
  getPluginsByContentType(contentType) {
    return this.getAllPlugins().filter(plugin => {
      const restrictions = plugin.getContentRestrictions();
      return restrictions.allowedTypes.includes(contentType);
    });
  }

  /**
   * Validate game data using the appropriate plugin
   * @param {string} gameType - The game type
   * @param {object} gameData - The game data to validate
   * @returns {object} - { isValid: boolean, errors: string[] }
   */
  validateGameData(gameType, gameData) {
    const plugin = this.getPlugin(gameType);
    if (!plugin) {
      return {
        isValid: false,
        errors: [`No plugin found for game type: ${gameType}`]
      };
    }

    // Validate settings
    const settingsValidation = plugin.validateSettings(gameData.game_settings || {});
    if (!settingsValidation.isValid) {
      return settingsValidation;
    }

    // Validate content
    const allContent = (gameData.content_stages || []).reduce((acc, stage) => {
      return acc.concat(stage.contentConnection?.content || []);
    }, []);

    const contentValidation = plugin.validateContent(allContent);
    return contentValidation;
  }

  /**
   * Transform game data for saving using the appropriate plugin
   * @param {string} gameType - The game type
   * @param {object} gameData - The game data to transform
   * @returns {object} - Transformed game data ready for API
   */
  transformForSave(gameType, gameData) {
    const plugin = this.getPlugin(gameType);
    if (!plugin) {
      console.warn(`No plugin found for game type: ${gameType}`);
      return gameData;
    }

    const transformed = plugin.transformForSave(gameData);

    // Note: Structured data extraction is not added to the transformed object
    // as _structuredData field is not allowed by backend Game model validation
    // Plugins should handle their own storage format in their transformForSave method

    return transformed;
  }

  /**
   * Transform loaded game data for editing using the appropriate plugin
   * Includes merging structured data back into game settings
   * @param {string} gameType - The game type
   * @param {object} gameData - The loaded game data
   * @param {object} structuredData - Data from auxiliary tables (optional)
   * @returns {object} - Transformed game data for editing
   */
  transformForEdit(gameType, gameData, structuredData = null) {
    const plugin = this.getPlugin(gameType);
    if (!plugin) {
      console.warn(`No plugin found for game type: ${gameType}`);
      return gameData;
    }

    let transformed = plugin.transformForEdit(gameData);

    // Merge structured data if available and plugin supports it
    if (structuredData && typeof plugin.mergeStructuredData === 'function') {
      transformed = plugin.mergeStructuredData(transformed, structuredData);
    }

    return transformed;
  }

  /**
   * Get preview data using the appropriate plugin
   * @param {string} gameType - The game type
   * @param {object} gameData - The game data
   * @returns {object} - Preview data
   */
  getPreviewData(gameType, gameData) {
    const plugin = this.getPlugin(gameType);
    if (!plugin) {
      return {
        title: gameData.title || 'משחק ללא שם',
        description: gameData.short_description || 'אין תיאור',
        gameType: gameType,
        error: `Plugin not found for game type: ${gameType}`
      };
    }

    return plugin.getPreviewData(gameData);
  }

  /**
   * Get the settings component for a game type
   * @param {string} gameType - The game type
   * @returns {React.Component|null} - The settings component or null
   */
  getSettingsComponent(gameType) {
    const plugin = this.getPlugin(gameType);
    return plugin ? plugin.getSettingsComponent() : null;
  }

  /**
   * Get content restrictions for a game type
   * @param {string} gameType - The game type
   * @returns {object} - Content restrictions object
   */
  getContentRestrictions(gameType) {
    const plugin = this.getPlugin(gameType);
    return plugin ? plugin.getContentRestrictions() : { allowedTypes: [], exclusiveGroups: { groups: [], allowedWithAll: [] } };
  }

  /**
   * Handle game type selection event
   * @param {string} gameType - The selected game type
   * @param {function} updateGameData - Function to update game data
   */
  onGameTypeSelected(gameType, updateGameData) {
    const plugin = this.getPlugin(gameType);
    if (plugin) {
      plugin.onGameTypeSelected(updateGameData);
    }
  }

  /**
   * Handle settings update event
   * @param {string} gameType - The game type
   * @param {object} newSettings - The new settings
   * @param {function} updateGameData - Function to update game data
   */
  onSettingsUpdated(gameType, newSettings, updateGameData) {
    const plugin = this.getPlugin(gameType);
    if (plugin) {
      plugin.onSettingsUpdated(newSettings, updateGameData);
    }
  }
}

// Create and export a singleton instance
export const gamePluginRegistry = new GamePluginRegistry();

// Export the class for testing purposes
export { GamePluginRegistry };

export default gamePluginRegistry;
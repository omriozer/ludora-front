import { Settings } from './entities';
import { NAV_ITEM_KEYS } from '@/config/productTypes';

class FeatureFlagService {
  constructor() {
    this.cache = null;
    this.cacheExpiry = null;
    this.cacheDuration = 5 * 60 * 1000; // 5 minutes
  }

  async getSettings() {
    const now = Date.now();

    if (this.cache && this.cacheExpiry && now < this.cacheExpiry) {
      return this.cache;
    }

    try {
      const settingsData = await Settings.find();

      let settings = {};
      if (settingsData && settingsData.length > 0) {
        settings = settingsData[0];
      }

      this.cache = settings;
      this.cacheExpiry = now + this.cacheDuration;

      return settings;
    } catch (error) {
      console.error('Error fetching feature flags:', error);
      return {};
    }
  }

  async isFeatureEnabled(featureKey) {
    const settings = await this.getSettings();
    const enabledKey = `nav_${featureKey}_enabled`;

    return settings[enabledKey] !== false;
  }

  async getFeatureVisibility(featureKey) {
    const settings = await this.getSettings();
    const visibilityKey = `nav_${featureKey}_visibility`;

    return settings[visibilityKey] || 'public';
  }

  async getEnabledFeatures() {
    const settings = await this.getSettings();
    const enabledFeatures = [];

    for (const key of NAV_ITEM_KEYS) {
      const enabledKey = `nav_${key}_enabled`;
      const visibilityKey = `nav_${key}_visibility`;

      const isEnabled = settings[enabledKey] !== false;
      const visibility = settings[visibilityKey] || 'public';

      if (isEnabled && visibility !== 'hidden') {
        enabledFeatures.push({
          key,
          visibility,
          enabled: isEnabled
        });
      }
    }

    return enabledFeatures;
  }

  async getPublicFeatures() {
    const enabledFeatures = await this.getEnabledFeatures();
    return enabledFeatures.filter(feature => feature.visibility === 'public');
  }

  async getAllFeaturesForAdmin() {
    const settings = await this.getSettings();
    const allFeatures = [];

    for (const key of NAV_ITEM_KEYS) {
      const enabledKey = `nav_${key}_enabled`;
      const visibilityKey = `nav_${key}_visibility`;

      const isEnabled = settings[enabledKey] !== false;
      const visibility = settings[visibilityKey] || 'public';

      allFeatures.push({
        key,
        visibility,
        enabled: isEnabled
      });
    }

    return allFeatures;
  }

  clearCache() {
    this.cache = null;
    this.cacheExpiry = null;
  }
}

export default new FeatureFlagService();
import { NAV_ITEM_KEYS } from '@/config/productTypes';

class FeatureFlagService {
  isFeatureEnabled(settings, featureKey) {
    if (!settings) return true; // Default to enabled if no settings
    const enabledKey = `nav_${featureKey}_enabled`;
    return settings[enabledKey] !== false;
  }

  getFeatureVisibility(settings, featureKey) {
    if (!settings) return 'public'; // Default to public if no settings
    const visibilityKey = `nav_${featureKey}_visibility`;
    return settings[visibilityKey] || 'public';
  }

  getEnabledFeatures(settings) {
    if (!settings) return []; // Return empty array if no settings
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

  getPublicFeatures(settings) {
    const enabledFeatures = this.getEnabledFeatures(settings);
    return enabledFeatures.filter(feature => feature.visibility === 'public');
  }

  getAllFeaturesForAdmin(settings) {
    if (!settings) return []; // Return empty array if no settings
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
}

export default new FeatureFlagService();
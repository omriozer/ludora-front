// Frontend settings constants and utilities
// Re-export settings keys and retry intervals

import { isDev as isDevEnvironment } from '@/utils/environment';

// Environment-aware settings retry intervals
const isDev = isDevEnvironment();

export const SETTINGS_RETRY_INTERVALS = {
  SYSTEM_ERROR: isDev ? 10000 : 20000,     // 10s dev, 20s prod
  MAINTENANCE: isDev ? 20000 : 60000,      // 20s dev, 60s prod
};

// Re-export all settings keys from the main constants file
export * from './settingsKeys.js';
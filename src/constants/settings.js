// Environment-aware settings retry intervals
const isDev = import.meta.env.DEV;

export const SETTINGS_RETRY_INTERVALS = {
  SYSTEM_ERROR: isDev ? 10000 : 20000,     // 10s dev, 20s prod
  MAINTENANCE: isDev ? 20000 : 60000,      // 20s dev, 60s prod
};
/**
 * URL Building Utilities for Ludora Frontend
 *
 * Centralized URL builders to replace all hardcoded URLs
 * throughout the application.
 */

import { config, PORTAL_TYPES } from './environment';

/**
 * API URL Builders
 */
export const apiUrls = {
  // Base API URL
  base: () => config.api.getBaseUrl(),

  // Authentication endpoints
  auth: {
    login: () => `${config.api.getBaseUrl()}/auth/login`,
    verify: () => `${config.api.getBaseUrl()}/auth/verify`,
    logout: () => `${config.api.getBaseUrl()}/auth/logout`,
    me: () => `${config.api.getBaseUrl()}/auth/me`,
  },

  // Health check
  health: () => config.api.isLocalhost()
    ? 'http://localhost:3003/health'  // Direct to API server for health
    : `${config.api.getBaseUrl()}/health`,

  // File serving
  files: {
    download: (fileId) => `${config.api.getBaseUrl()}/files/${fileId}/download`,
    upload: () => `${config.api.getBaseUrl()}/files/upload`,
    stream: (fileId) => `${config.api.getBaseUrl()}/files/${fileId}/stream`,
  },

  // SSE (Server-Sent Events)
  sse: {
    events: (channels, params = {}) => {
      const baseUrl = config.api.getBaseUrl();
      const queryParams = new URLSearchParams({
        channels,
        ...params
      });
      return `${baseUrl}/sse/events?${queryParams}`;
    }
  },

  // Products
  products: {
    list: () => `${config.api.getBaseUrl()}/products`,
    details: (productId) => `${config.api.getBaseUrl()}/products/${productId}`,
    image: (productId, options = {}) => {
      const params = new URLSearchParams(options);
      return `${config.api.getBaseUrl()}/products/${productId}/image?${params}`;
    }
  }
};

/**
 * Portal URL Builders
 */
export const portalUrls = {
  // Student portal URLs
  student: {
    home: () => config.portals.buildStudentUrl('/'),
    portal: (invitationCode) => config.portals.buildStudentUrl(`/portal/${invitationCode}`),
    lobby: (lobbyCode) => config.portals.buildStudentUrl(`/lobby/${lobbyCode}`),
    play: (gameId) => config.portals.buildStudentUrl(`/play/${gameId}`),
    game: (lobbyCode) => config.portals.buildStudentUrl(`/play/${lobbyCode}`), // Legacy support
  },

  // Teacher portal URLs
  teacher: {
    home: () => config.portals.buildTeacherUrl('/'),
    dashboard: () => config.portals.buildTeacherUrl('/dashboard'),
    games: () => config.portals.buildTeacherUrl('/games'),
    gameCreate: () => config.portals.buildTeacherUrl('/games/create'),
    gameEdit: (gameId) => config.portals.buildTeacherUrl(`/games/${gameId}/edit`),
    products: () => config.portals.buildTeacherUrl('/products'),
    templates: () => config.portals.buildTeacherUrl('/template-manager'),
  },

  // Current portal URLs (automatically detects which portal)
  current: {
    type: () => config.portals.getCurrentType(),

    // Build URL for current portal type
    build: (path) => {
      const portalType = config.portals.getCurrentType();
      return portalType === PORTAL_TYPES.STUDENT
        ? config.portals.buildStudentUrl(path)
        : config.portals.buildTeacherUrl(path);
    }
  }
};

/**
 * External URL Builders
 */
export const externalUrls = {
  // Firebase Console URLs (for development/debugging)
  firebase: {
    console: () => `https://console.firebase.google.com/project/${config.firebase.projectId}`,
    auth: () => `https://console.firebase.google.com/project/${config.firebase.projectId}/authentication/users`,
  },

  // Marketing/info URLs
  marketing: {
    main: () => {
      const env = config.environment;
      switch (env) {
        case 'production':
          return 'https://ludora.app';
        case 'staging':
          return 'https://staging.ludora.app';
        default:
          return config.portals.buildTeacherUrl('/');
      }
    }
  }
};

/**
 * Development URL Builders (for testing/debugging)
 */
export const devUrls = {
  // Only available in development
  isAvailable: () => config.isDevelopment(),

  // Test files in public directory
  testFiles: {
    sseTest: () => config.isDevelopment()
      ? `http://localhost:${config.ports.frontend}/sse-test.html`
      : null,
    minimalSseTest: () => config.isDevelopment()
      ? `http://localhost:${config.ports.frontend}/minimal-sse-test.html`
      : null,
  },

  // Direct API server URLs (bypassing proxy)
  directApi: {
    health: () => config.isDevelopment()
      ? `http://localhost:${config.ports.api}/health`
      : null,
    base: () => config.isDevelopment()
      ? `http://localhost:${config.ports.api}/api`
      : null,
  }
};

/**
 * URL Validation Helpers
 */
export const urlUtils = {
  // Check if URL is for current environment
  isCurrentEnvironment: (url) => {
    if (!url) return false;

    const currentDomains = [
      config.domains.teacher,
      config.domains.student,
      config.domains.api
    ];

    return currentDomains.some(domain => url.includes(domain));
  },

  // Extract portal type from URL
  getPortalTypeFromUrl: (url) => {
    if (!url) return null;

    if (url.includes(config.domains.student)) {
      return PORTAL_TYPES.STUDENT;
    }

    if (url.includes(config.domains.teacher)) {
      return PORTAL_TYPES.TEACHER;
    }

    return null;
  },

  // Check if URL is local development
  isLocalDevelopment: (url) => {
    if (!url) return false;
    return url.includes('localhost') || url.includes('127.0.0.1');
  }
};

/**
 * Legacy URL Replacements
 *
 * Use these to replace hardcoded URLs found throughout the codebase
 */
export const LEGACY_REPLACEMENTS = {
  // Replace hardcoded localhost URLs
  'http://localhost:3003': () => config.isDevelopment()
    ? `http://localhost:${config.ports.api}`
    : config.api.getBaseUrl(),

  'http://localhost:5173': () => config.isDevelopment()
    ? `http://localhost:${config.ports.frontend}`
    : config.portals.buildTeacherUrl('/', false),

  // Replace hardcoded domain URLs
  'https://api.ludora.app/api': () => config.api.getBaseUrl(),
  'https://ludora.app': () => externalUrls.marketing.main(),
  'https://my.ludora.app': () => config.portals.buildStudentUrl('/', false),

  // Replace email addresses
  'support@ludora.app': () => config.contact.SUPPORT_EMAIL,
  'noreply@ludora.app': () => config.contact.NOREPLY_EMAIL,
};

// Export all URL builders as a single object for convenience
export const urls = {
  api: apiUrls,
  portal: portalUrls,
  external: externalUrls,
  dev: devUrls,
  utils: urlUtils,
  legacy: LEGACY_REPLACEMENTS
};

export default urls;
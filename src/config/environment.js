/**
 * Centralized Environment Configuration for Ludora Frontend
 *
 * This file provides a single source of truth for all environment variables,
 * with proper validation, fallbacks based on NODE_ENV, and type safety.
 *
 * Vite automatically loads the correct .env file based on NODE_ENV:
 * - NODE_ENV=development -> .env.development
 * - NODE_ENV=staging -> .env.staging
 * - NODE_ENV=production -> .env.production
 *
 * USAGE:
 * import { config, ENVIRONMENTS, PORTAL_TYPES } from '@/config/environment';
 *
 * console.log(config.api.baseUrl);     // Get API base URL
 * console.log(config.ports.frontend);  // Get frontend port
 * console.log(config.domains.student); // Get student portal domain
 */

// Environment validation utility
function getEnvVar(name, environmentFallbacks = {}, required = false) {
  const value = import.meta.env[name];

  if (required && (value === undefined || value === null || value === '')) {
    console.error(`❌ Required environment variable ${name} is not defined`);
    if (import.meta.env.DEV) {
      throw new Error(`Required environment variable ${name} is missing`);
    }
  }

  // If we have a value from the env file, use it
  if (value !== undefined && value !== null && value !== '') {
    return value;
  }

  // Otherwise, use environment-specific fallback
  const currentEnv = getCurrentEnvironment();
  const fallback = environmentFallbacks[currentEnv] || environmentFallbacks.default;

  if (fallback !== undefined) {
    if (import.meta.env.DEV) {
      console.warn(`⚠️  Environment variable ${name} not set, using ${currentEnv} fallback: ${fallback}`);
    }
    return fallback;
  }

  if (required) {
    throw new Error(`Required environment variable ${name} has no value or fallback`);
  }

  return undefined;
}

// Environment types
export const ENVIRONMENTS = {
  DEVELOPMENT: 'development',
  STAGING: 'staging',
  PRODUCTION: 'production'
};

export const PORTAL_TYPES = {
  TEACHER: 'teacher',
  STUDENT: 'student'
};

// Detect current environment based on Vite's MODE
export const getCurrentEnvironment = () => {
  const mode = import.meta.env.MODE || 'development';

  // Map Vite modes to our environment constants
  switch (mode) {
    case 'production':
      return ENVIRONMENTS.PRODUCTION;
    case 'staging':
      return ENVIRONMENTS.STAGING;
    case 'development':
    default:
      return ENVIRONMENTS.DEVELOPMENT;
  }
};

// Port Configuration with environment-aware fallbacks
export const PORTS = {
  frontend: parseInt(getEnvVar('VITE_FRONTEND_PORT', {
    [ENVIRONMENTS.DEVELOPMENT]: '5173',
    [ENVIRONMENTS.STAGING]: '5173',
    [ENVIRONMENTS.PRODUCTION]: '5173',
    default: '5173'
  }), 10),

  api: parseInt(getEnvVar('VITE_API_PORT', {
    [ENVIRONMENTS.DEVELOPMENT]: '3003',
    [ENVIRONMENTS.STAGING]: '3003', // Not used in staging (uses full URL)
    [ENVIRONMENTS.PRODUCTION]: '3003', // Not used in production (uses full URL)
    default: '3003'
  }), 10),

};

// Domain Configuration with environment-aware fallbacks
export const DOMAINS = {
  teacher: getEnvVar('VITE_TEACHER_PORTAL_DOMAIN', {
    [ENVIRONMENTS.DEVELOPMENT]: 'localhost',
    [ENVIRONMENTS.STAGING]: 'staging.ludora.app',
    [ENVIRONMENTS.PRODUCTION]: 'ludora.app',
    default: 'localhost'
  }),

  student: getEnvVar('VITE_STUDENT_PORTAL_DOMAIN', {
    [ENVIRONMENTS.DEVELOPMENT]: 'my.localhost',
    [ENVIRONMENTS.STAGING]: 'my-staging.ludora.app',
    [ENVIRONMENTS.PRODUCTION]: 'my.ludora.app',
    default: 'my.localhost'
  }),

  api: getEnvVar('VITE_API_DOMAIN', {
    [ENVIRONMENTS.DEVELOPMENT]: 'localhost',
    [ENVIRONMENTS.STAGING]: 'api-staging.ludora.app',
    [ENVIRONMENTS.PRODUCTION]: 'api.ludora.app',
    default: 'localhost'
  }),
};

// API Configuration with environment-aware fallbacks
export const API = {
  // Build API base URL with proper environment-aware fallbacks
  getBaseUrl: () => {
    const explicitBase = getEnvVar('VITE_API_BASE');

    // If explicitly set in env file, use it
    if (explicitBase) {
      return explicitBase;
    }

    // Otherwise, build URL based on current environment
    const env = getCurrentEnvironment();

    switch (env) {
      case ENVIRONMENTS.PRODUCTION:
        return 'https://api.ludora.app/api';

      case ENVIRONMENTS.STAGING:
        return 'https://api-staging.ludora.app/api';

      case ENVIRONMENTS.DEVELOPMENT:
      default:
        // In development, use Vite proxy
        return '/api';
    }
  },

  // Check if we're using localhost API
  isLocalhost: () => {
    const baseUrl = API.getBaseUrl();
    return baseUrl.includes('localhost') || baseUrl === '/api';
  }
};

// Portal URL Builders
export const PORTALS = {
  // Get current portal type based on hostname
  getCurrentType: () => {
    if (typeof window === 'undefined') {
      return PORTAL_TYPES.TEACHER; // SSR fallback
    }

    const hostname = window.location.hostname;
    const studentDomain = DOMAINS.student;

    // Development check for my.localhost or any hostname with 'my'
    if (hostname.includes('my')) {
      return PORTAL_TYPES.STUDENT;
    }

    // Exact domain match
    if (hostname === studentDomain) {
      return PORTAL_TYPES.STUDENT;
    }

    return PORTAL_TYPES.TEACHER;
  },

  // Build portal URLs with environment awareness
  buildStudentUrl: (path = '', includeProtocol = true) => {
    const env = getCurrentEnvironment();
    const studentDomain = DOMAINS.student;

    // For development, include port
    if (env === ENVIRONMENTS.DEVELOPMENT) {
      const protocol = includeProtocol ? 'http://' : '';
      const port = `:${PORTS.frontend}`;
      return `${protocol}${studentDomain}${port}${path}`;
    }

    // For staging/production, use HTTPS without port
    const protocol = includeProtocol ? 'https://' : '';
    return `${protocol}${studentDomain}${path}`;
  },

  buildTeacherUrl: (path = '', includeProtocol = true) => {
    const env = getCurrentEnvironment();
    const teacherDomain = DOMAINS.teacher;

    // For development, include port
    if (env === ENVIRONMENTS.DEVELOPMENT) {
      const protocol = includeProtocol ? 'http://' : '';
      const port = `:${PORTS.frontend}`;
      return `${protocol}${teacherDomain}${port}${path}`;
    }

    // For staging/production, use HTTPS without port
    const protocol = includeProtocol ? 'https://' : '';
    return `${protocol}${teacherDomain}${path}`;
  }
};

// Firebase Configuration (secure values from env files)
export const FIREBASE = {
  apiKey: getEnvVar('VITE_FIREBASE_API_KEY', {}, true),
  authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN', {}, true),
  projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID', {}, true),
  storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET', {}, true),
  messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID', {}, true),
  appId: getEnvVar('VITE_FIREBASE_APP_ID', {}, true),
  measurementId: getEnvVar('VITE_FIREBASE_MEASUREMENT_ID'), // Optional
};

// Contact Configuration (non-secure, environment-aware fallbacks)
export const CONTACT = {
  SUPPORT_EMAIL: getEnvVar('VITE_SUPPORT_EMAIL', {
    [ENVIRONMENTS.DEVELOPMENT]: 'support@ludora.app',
    [ENVIRONMENTS.STAGING]: 'staging-support@ludora.app',
    [ENVIRONMENTS.PRODUCTION]: 'support@ludora.app',
    default: 'support@ludora.app'
  }),

  NOREPLY_EMAIL: getEnvVar('VITE_NOREPLY_EMAIL', {
    [ENVIRONMENTS.DEVELOPMENT]: 'noreply@ludora.app',
    [ENVIRONMENTS.STAGING]: 'staging-noreply@ludora.app',
    [ENVIRONMENTS.PRODUCTION]: 'noreply@ludora.app',
    default: 'noreply@ludora.app'
  })
};

// Main configuration object
export const config = {
  environment: getCurrentEnvironment(),
  ports: PORTS,
  domains: DOMAINS,
  api: API,
  portals: PORTALS,
  firebase: FIREBASE,
  contact: CONTACT,

  // Utility functions
  isDevelopment: () => getCurrentEnvironment() === ENVIRONMENTS.DEVELOPMENT,
  isStaging: () => getCurrentEnvironment() === ENVIRONMENTS.STAGING,
  isProduction: () => getCurrentEnvironment() === ENVIRONMENTS.PRODUCTION,

  // Legacy compatibility helpers (to ease migration)
  getApiBase: API.getBaseUrl,
  isStudentPortal: () => PORTALS.getCurrentType() === PORTAL_TYPES.STUDENT,
  getDomainType: () => PORTALS.getCurrentType(),
};

// Development validation (only runs in dev)
if (import.meta.env.DEV) {
  console.log('🔧 Ludora Environment Configuration:');
  console.log('Vite Mode:', import.meta.env.MODE);
  console.log('Environment:', config.environment);
  console.log('API Base URL:', config.api.getBaseUrl());

  if (typeof window !== 'undefined') {
    console.log('Current Portal:', config.portals.getCurrentType());
  }

  console.log('Ports:', { frontend: config.ports.frontend, api: config.ports.api });
  console.log('Domains:', {
    teacher: config.domains.teacher,
    student: config.domains.student,
    api: config.domains.api
  });

  // Validate critical environment variables
  const missingVars = [];

  if (!FIREBASE.apiKey) missingVars.push('VITE_FIREBASE_API_KEY');
  if (!FIREBASE.projectId) missingVars.push('VITE_FIREBASE_PROJECT_ID');
  if (!FIREBASE.authDomain) missingVars.push('VITE_FIREBASE_AUTH_DOMAIN');

  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars);
  } else {
    console.log('✅ All required environment variables are configured');
  }
}

// Constants for commonly used hardcoded values
export const CONSTANTS = {
  // Default ports for fallbacks
  DEFAULT_FRONTEND_PORT: 5173,
  DEFAULT_API_PORT: 3003,

  // Common domains (for migration from hardcoded values)
  PRODUCTION_TEACHER_DOMAIN: 'ludora.app',
  PRODUCTION_STUDENT_DOMAIN: 'my.ludora.app',
  PRODUCTION_API_DOMAIN: 'api.ludora.app',

  STAGING_TEACHER_DOMAIN: 'staging.ludora.app',
  STAGING_STUDENT_DOMAIN: 'my-staging.ludora.app',
  STAGING_API_DOMAIN: 'api-staging.ludora.app',

  DEVELOPMENT_TEACHER_DOMAIN: 'localhost',
  DEVELOPMENT_STUDENT_DOMAIN: 'my.localhost',
  DEVELOPMENT_API_DOMAIN: 'localhost',
};

export default config;
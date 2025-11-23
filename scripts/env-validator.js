#!/usr/bin/env node

/**
 * Frontend Environment Variable Validator for Ludora
 *
 * This script validates that environment variables are properly configured
 * for frontend builds. Unlike the API validator which syncs to Heroku,
 * this validator ensures completeness of local .env files since Firebase
 * hosting uses build-time environment variables.
 *
 * CRITICAL: Frontend env vars are embedded during build (VITE_* prefix).
 * Missing variables will cause build-time failures or runtime errors.
 *
 * Usage:
 *   node scripts/env-validator.js --check-prod       # Validate production env file
 *   node scripts/env-validator.js --check-staging    # Validate staging env file
 *   node scripts/env-validator.js --check-dev        # Validate development env file
 *   node scripts/env-validator.js --validate         # Validate current environment
 *   node scripts/env-validator.js --pre-push         # Pre-push hook mode
 *
 * Exit codes:
 *   0 - Environment variables are properly configured
 *   1 - Missing or invalid variables (push should be blocked)
 *   2 - Configuration error
 *   3 - User cancelled operation
 */

import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  production: {
    envFile: '.env.production',
    firebaseProject: 'ludora-af706',
    expectedApiBase: 'https://api.ludora.app/api',
    expectedStudentDomain: 'my.ludora.app',
    expectedFirebaseProjectId: 'ludora-af706',
    branch: 'main'
  },
  staging: {
    envFile: '.env.staging',
    firebaseProject: 'ludora-staging',
    expectedApiBase: 'https://api-staging.ludora.app/api',
    expectedStudentDomain: 'my-staging.ludora.app',
    expectedFirebaseProjectId: 'ludora-staging',
    branch: 'staging'
  },
  development: {
    envFile: '.env.development',
    firebaseProject: null, // No Firebase project for dev
    expectedApiBase: null, // Uses Vite proxy
    expectedStudentDomain: 'my.localhost',
    expectedFirebaseProjectId: 'ludora-af706', // Dev uses prod Firebase
    branch: null
  }
};

// Required VITE_* variables for all environments
const REQUIRED_VARS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
];

// Required for production/staging only
const REQUIRED_FOR_DEPLOY = [
  'VITE_API_BASE',
  'VITE_STUDENT_PORTAL_DOMAIN'
];

// Optional variables (won't block push if missing)
const OPTIONAL_VARS = new Set([
  'VITE_FIREBASE_MEASUREMENT_ID',  // Google Analytics (optional)
  'VITE_FRONTEND_PORT',            // Only for development
  'VITE_API_PORT',                 // Only for development
  'VITE_STUDENT_PORTAL_PORT',      // Only for development
  'VITE_TEACHER_PORTAL_DOMAIN',    // Only for development
  'VITE_API_DOMAIN'                // Only for development
]);

// Variables that should match specific patterns per environment
const VALIDATION_RULES = {
  production: {
    VITE_API_BASE: {
      pattern: /^https:\/\/api\.ludora\.app/,
      message: 'Production API base must use api.ludora.app domain'
    },
    VITE_FIREBASE_PROJECT_ID: {
      exact: 'ludora-af706',
      message: 'Production must use ludora-af706 Firebase project'
    },
    VITE_FIREBASE_AUTH_DOMAIN: {
      pattern: /ludora-af706\.firebaseapp\.com/,
      message: 'Production auth domain must match ludora-af706 project'
    },
    VITE_STUDENT_PORTAL_DOMAIN: {
      exact: 'my.ludora.app',
      message: 'Production student portal must be my.ludora.app'
    }
  },
  staging: {
    VITE_API_BASE: {
      pattern: /^https:\/\/api-staging\.ludora\.app|ludora-api-staging.*\.herokuapp\.com/,
      message: 'Staging API base must use staging domain'
    },
    VITE_FIREBASE_PROJECT_ID: {
      exact: 'ludora-staging',
      message: 'Staging must use ludora-staging Firebase project'
    },
    VITE_FIREBASE_AUTH_DOMAIN: {
      pattern: /ludora-staging\.firebaseapp\.com/,
      message: 'Staging auth domain must match ludora-staging project'
    },
    VITE_STUDENT_PORTAL_DOMAIN: {
      exact: 'my-staging.ludora.app',
      message: 'Staging student portal must be my-staging.ludora.app'
    }
  }
};

// ============================================================================
// TERMINAL COLORS
// ============================================================================

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m'
};

const log = {
  error: (msg) => console.error(`${colors.red}[ERROR]${colors.reset} ${msg}`),
  warn: (msg) => console.warn(`${colors.yellow}[WARN]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[OK]${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bold}${colors.cyan}=== ${msg} ===${colors.reset}\n`),
  critical: (msg) => console.log(`\n${colors.bgRed}${colors.white}${colors.bold} BLOCKED ${colors.reset} ${colors.red}${msg}${colors.reset}\n`)
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Parse a .env file and return a Map of key-value pairs
 */
function parseEnvFile(filePath) {
  const envVars = new Map();

  if (!existsSync(filePath)) {
    return envVars;
  }

  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    // Parse KEY=VALUE
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.substring(0, separatorIndex).trim();
    let value = trimmed.substring(separatorIndex + 1).trim();

    // Handle quoted values
    if ((value.startsWith('"') && value.includes('"')) ||
        (value.startsWith("'") && value.includes("'"))) {
      const quote = value[0];
      const endQuoteIndex = value.indexOf(quote, 1);
      if (endQuoteIndex > 0) {
        value = value.substring(1, endQuoteIndex);
      }
    } else {
      // Strip inline comments for unquoted values
      const commentIndex = value.indexOf(' #');
      if (commentIndex !== -1) {
        value = value.substring(0, commentIndex).trim();
      }
      if (value.startsWith('#')) {
        value = '';
      }
    }

    if (key) {
      envVars.set(key, value);
    }
  }

  return envVars;
}

/**
 * Mask sensitive values for display
 */
function maskValue(value) {
  if (!value) return '(empty)';
  if (value.length <= 8) return '****';
  return value.substring(0, 4) + '****' + value.substring(value.length - 4);
}

/**
 * Get current git branch
 */
function getCurrentBranch() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
  } catch (error) {
    return 'unknown';
  }
}

// ============================================================================
// CORE VALIDATION LOGIC
// ============================================================================

/**
 * Validate environment file for a specific environment
 */
function validateEnvironment(environment) {
  const config = CONFIG[environment];
  if (!config) {
    throw new Error(`Unknown environment: ${environment}`);
  }

  log.header(`Validating ${environment.toUpperCase()} Environment`);
  log.info(`Environment file: ${config.envFile}`);
  if (config.firebaseProject) {
    log.info(`Firebase project: ${config.firebaseProject}`);
  }

  // Load environment file
  const envPath = path.join(ROOT_DIR, config.envFile);
  const envVars = parseEnvFile(envPath);

  if (envVars.size === 0) {
    log.error(`Environment file ${config.envFile} is empty or doesn't exist`);
    return {
      environment,
      config,
      valid: false,
      missing: REQUIRED_VARS.map(v => ({ key: v, reason: 'File missing or empty' })),
      invalid: [],
      warnings: [],
      present: []
    };
  }

  log.info(`Variables loaded: ${envVars.size}`);

  const result = {
    environment,
    config,
    valid: true,
    missing: [],
    invalid: [],
    warnings: [],
    present: []
  };

  // Check required variables
  const requiredVars = [...REQUIRED_VARS];
  if (environment !== 'development') {
    requiredVars.push(...REQUIRED_FOR_DEPLOY);
  }

  for (const key of requiredVars) {
    if (!envVars.has(key) || !envVars.get(key)) {
      result.missing.push({ key, reason: 'Required variable missing or empty' });
      result.valid = false;
    } else {
      result.present.push({ key, value: envVars.get(key) });
    }
  }

  // Apply validation rules for the environment
  const rules = VALIDATION_RULES[environment];
  if (rules) {
    for (const [key, rule] of Object.entries(rules)) {
      const value = envVars.get(key);
      if (!value) continue; // Already handled as missing

      if (rule.exact && value !== rule.exact) {
        result.invalid.push({
          key,
          value,
          expected: rule.exact,
          message: rule.message
        });
        result.valid = false;
      } else if (rule.pattern && !rule.pattern.test(value)) {
        result.invalid.push({
          key,
          value,
          pattern: rule.pattern.toString(),
          message: rule.message
        });
        result.valid = false;
      }
    }
  }

  // Check for optional variables (warnings only)
  for (const key of OPTIONAL_VARS) {
    if (!envVars.has(key) || !envVars.get(key)) {
      result.warnings.push({ key, reason: 'Optional variable not set' });
    }
  }

  // Cross-environment consistency checks
  if (environment === 'production') {
    // Ensure production Firebase config doesn't accidentally use staging
    const projectId = envVars.get('VITE_FIREBASE_PROJECT_ID');
    const authDomain = envVars.get('VITE_FIREBASE_AUTH_DOMAIN');

    if (projectId === 'ludora-staging') {
      result.invalid.push({
        key: 'VITE_FIREBASE_PROJECT_ID',
        value: projectId,
        message: 'CRITICAL: Production config is using staging Firebase project!'
      });
      result.valid = false;
    }

    if (authDomain && authDomain.includes('staging')) {
      result.invalid.push({
        key: 'VITE_FIREBASE_AUTH_DOMAIN',
        value: authDomain,
        message: 'CRITICAL: Production auth domain references staging!'
      });
      result.valid = false;
    }
  }

  if (environment === 'staging') {
    // Ensure staging doesn't use production Firebase
    const projectId = envVars.get('VITE_FIREBASE_PROJECT_ID');
    if (projectId === 'ludora-af706') {
      result.invalid.push({
        key: 'VITE_FIREBASE_PROJECT_ID',
        value: projectId,
        message: 'WARNING: Staging config is using production Firebase project!'
      });
      result.valid = false;
    }
  }

  return result;
}

/**
 * Display validation results
 */
function displayResults(result) {
  const { environment, missing, invalid, warnings, present } = result;

  console.log('');

  // Present variables (brief)
  if (present.length > 0) {
    log.success(`${present.length} required variables are present`);
  }

  // Missing variables (CRITICAL)
  if (missing.length > 0) {
    console.log(`\n${colors.red}${colors.bold}MISSING VARIABLES (${missing.length}):${colors.reset}`);
    for (const { key, reason } of missing) {
      console.log(`  ${colors.red}- ${key}${colors.reset}`);
      console.log(`    ${colors.dim}${reason}${colors.reset}`);
    }
  }

  // Invalid variables (CRITICAL)
  if (invalid.length > 0) {
    console.log(`\n${colors.red}${colors.bold}INVALID VALUES (${invalid.length}):${colors.reset}`);
    for (const { key, value, message, expected, pattern } of invalid) {
      console.log(`  ${colors.red}! ${key}${colors.reset}`);
      console.log(`    ${colors.dim}Current:${colors.reset} ${maskValue(value)}`);
      if (expected) {
        console.log(`    ${colors.dim}Expected:${colors.reset} ${expected}`);
      }
      if (pattern) {
        console.log(`    ${colors.dim}Pattern:${colors.reset} ${pattern}`);
      }
      console.log(`    ${colors.yellow}${message}${colors.reset}`);
    }
  }

  // Warnings (informational)
  if (warnings.length > 0) {
    console.log(`\n${colors.yellow}${colors.bold}WARNINGS (${warnings.length}):${colors.reset}`);
    for (const { key, reason } of warnings) {
      console.log(`  ${colors.yellow}~ ${key}${colors.reset} - ${reason}`);
    }
  }

  console.log('');

  // Summary
  if (result.valid) {
    log.success(`Environment ${environment.toUpperCase()} is properly configured`);
  } else {
    log.critical(`Environment ${environment.toUpperCase()} validation FAILED`);
  }
}

/**
 * Check if validation should block push
 */
function shouldBlockPush(result) {
  return !result.valid;
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  // Parse flags
  const flags = {
    checkProd: args.includes('--check-prod') || args.includes('--check-production'),
    checkStaging: args.includes('--check-staging'),
    checkDev: args.includes('--check-dev') || args.includes('--check-development'),
    validate: args.includes('--validate'),
    prePush: args.includes('--pre-push'),
    branch: args.find(a => a.startsWith('--branch='))?.split('=')[1],
    force: args.includes('--force') || args.includes('-f'),
    help: args.includes('--help') || args.includes('-h')
  };

  // Show help
  if (flags.help || args.length === 0) {
    console.log(`
${colors.bold}Ludora Frontend Environment Validator${colors.reset}

${colors.bold}Usage:${colors.reset}
  node scripts/env-validator.js [command] [options]

${colors.bold}Commands:${colors.reset}
  --check-prod       Validate .env.production for production deployment
  --check-staging    Validate .env.staging for staging deployment
  --check-dev        Validate .env.development for local development
  --validate         Validate the current environment (auto-detects from .env)
  --pre-push         Pre-push hook mode (auto-detects branch)

${colors.bold}Options:${colors.reset}
  --force, -f        Continue despite validation failures (NOT RECOMMENDED)
  --branch=<name>    Override branch detection (for --pre-push)
  --help, -h         Show this help message

${colors.bold}Examples:${colors.reset}
  # Check production environment before deploy
  npm run env:check-prod

  # Check staging environment
  npm run env:check-staging

  # Validate current development setup
  npm run env:validate

${colors.bold}Exit Codes:${colors.reset}
  0 - Success (environment properly configured)
  1 - Validation failed (missing or invalid variables)
  2 - Configuration error

${colors.bold}Key Differences from API Validator:${colors.reset}
  - Frontend uses build-time env vars (VITE_* prefix)
  - Firebase hosting doesn't store env vars like Heroku
  - Validation is completeness-based, not sync-based
  - Validates correct Firebase project per environment
`);
    process.exit(0);
  }

  try {
    // Pre-push hook mode
    if (flags.prePush) {
      const branch = flags.branch || getCurrentBranch();
      let environment;

      if (branch === 'main') {
        environment = 'production';
      } else if (branch === 'staging') {
        environment = 'staging';
      } else {
        log.info(`Branch "${branch}" doesn't require environment check`);
        process.exit(0);
      }

      const result = validateEnvironment(environment);
      displayResults(result);

      if (shouldBlockPush(result) && !flags.force) {
        log.critical(`Push to ${branch} BLOCKED - environment configuration invalid`);
        console.log(`${colors.bold}To fix this:${colors.reset}`);
        console.log(`  1. Review the issues above`);
        console.log(`  2. Update ${colors.cyan}${CONFIG[environment].envFile}${colors.reset} with correct values`);
        console.log(`  3. Re-run: ${colors.cyan}npm run env:check-${environment === 'production' ? 'prod' : 'staging'}${colors.reset}`);
        console.log(`  4. Or use emergency override: ${colors.yellow}git push --no-verify${colors.reset} (NOT RECOMMENDED)`);
        console.log('');
        process.exit(1);
      }

      log.success(`Environment check passed for ${environment}`);
      process.exit(0);
    }

    // Check commands
    if (flags.checkProd) {
      const result = validateEnvironment('production');
      displayResults(result);
      process.exit(result.valid ? 0 : 1);
    }

    if (flags.checkStaging) {
      const result = validateEnvironment('staging');
      displayResults(result);
      process.exit(result.valid ? 0 : 1);
    }

    if (flags.checkDev) {
      const result = validateEnvironment('development');
      displayResults(result);
      process.exit(result.valid ? 0 : 1);
    }

    // Validate current environment
    if (flags.validate) {
      // Check which env files exist and validate them
      const environments = ['development', 'staging', 'production'];
      let allValid = true;

      for (const env of environments) {
        const envPath = path.join(ROOT_DIR, CONFIG[env].envFile);
        if (existsSync(envPath)) {
          const result = validateEnvironment(env);
          displayResults(result);
          if (!result.valid) {
            allValid = false;
          }
        }
      }

      process.exit(allValid ? 0 : 1);
    }

    log.error('No valid command specified. Use --help for usage.');
    process.exit(2);

  } catch (error) {
    log.error(error.message);
    process.exit(2);
  }
}

// Run main
main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(2);
});

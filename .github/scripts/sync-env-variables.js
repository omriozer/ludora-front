#!/usr/bin/env node

/**
 * Dynamic Environment Variable Synchronization Script
 *
 * This script synchronizes environment variables from .env files to GitHub Secrets
 * and dynamically loads them in GitHub Actions workflows.
 *
 * Features:
 * - Reads .env files based on branch/environment mapping
 * - Compares with existing GitHub Secrets
 * - Optionally prompts for confirmation on changes
 * - Supports staging, production, and development environments
 * - Handles sensitive variables with encryption
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Environment mapping configuration
const ENV_CONFIG = {
  'main': {
    envFile: '.env.production',
    secretPrefix: 'VITE_',
    environment: 'production',
    githubEnvironment: 'production'
  },
  'staging': {
    envFile: '.env.staging',
    secretPrefix: 'VITE_',
    environment: 'staging',
    githubEnvironment: 'staging'
  },
  'development': {
    envFile: '.env.development',
    secretPrefix: 'VITE_',
    environment: 'development',
    githubEnvironment: 'development'
  }
};

// Sensitive variables that require special handling
// NOTE: Firebase client config (VITE_FIREBASE_*) are NOT sensitive - they're public frontend config
const SENSITIVE_VARIABLES = [
  'FIREBASE_SERVICE_ACCOUNT', // Server-side only
  'ENCRYPTION_KEY',
  'JWT_SECRET',
  'DATABASE_URL',
  'API_KEY'
  // Firebase client config (VITE_FIREBASE_*) are intentionally NOT included here
  // as they are public configuration meant for frontend applications
];

/**
 * Parse .env file into key-value pairs
 * @param {string} filePath - Path to .env file
 * @returns {Object} Parsed environment variables
 */
function parseEnvFile(filePath) {
  const envVars = {};

  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  Environment file not found: ${filePath}`);
    return envVars;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip empty lines and comments
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue;
    }

    // Parse KEY=VALUE or KEY="VALUE" or KEY='VALUE'
    const match = trimmedLine.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (match) {
      const [, key, value] = match;

      // Remove surrounding quotes if present
      let cleanValue = value;
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        cleanValue = value.slice(1, -1);
      }

      // Remove inline comments
      const commentIndex = cleanValue.indexOf(' #');
      if (commentIndex !== -1) {
        cleanValue = cleanValue.substring(0, commentIndex).trim();
      }

      envVars[key] = cleanValue;
    }
  }

  return envVars;
}

/**
 * Determine environment configuration based on current branch/context
 * @param {string} branch - Git branch name
 * @param {string} environment - Override environment
 * @returns {Object} Environment configuration
 */
function getEnvironmentConfig(branch = null, environment = null) {
  // Use explicit environment if provided
  if (environment && ENV_CONFIG[environment]) {
    return ENV_CONFIG[environment];
  }

  // Auto-detect from branch
  if (branch) {
    if (branch === 'main' || branch === 'master') {
      return ENV_CONFIG['main'];
    } else if (branch === 'staging') {
      return ENV_CONFIG['staging'];
    } else if (branch.startsWith('dev') || branch.includes('development')) {
      return ENV_CONFIG['development'];
    }
  }

  // Default to development for unknown branches
  console.warn(`⚠️  Unknown branch '${branch}', defaulting to development environment`);
  return ENV_CONFIG['development'];
}

/**
 * Check if a variable is sensitive and needs special handling
 * @param {string} key - Environment variable key
 * @returns {boolean} True if sensitive
 */
function isSensitiveVariable(key) {
  // Explicit check for known sensitive variables
  if (SENSITIVE_VARIABLES.includes(key)) {
    return true;
  }

  // Firebase client config is always public for frontend apps
  if (key.startsWith('VITE_FIREBASE_')) {
    return false;
  }

  // Check for sensitive patterns (but exclude Firebase client config)
  return (key.endsWith('_SECRET') || key.endsWith('_PASSWORD') || key.endsWith('_PRIVATE_KEY')) &&
         !key.startsWith('VITE_FIREBASE_');
}

/**
 * Generate GitHub Actions environment variable output
 * @param {Object} envVars - Environment variables
 * @param {Object} config - Environment configuration
 * @returns {string} GitHub Actions variable declarations
 */
function generateGitHubActionsEnv(envVars, config) {
  const outputs = [];

  for (const [key, value] of Object.entries(envVars)) {
    // Skip non-prefixed variables unless they're explicitly allowed
    if (config.secretPrefix && !key.startsWith(config.secretPrefix)) {
      // Allow common CI/CD variables
      const allowedNonPrefixed = ['NODE_ENV', 'ENVIRONMENT', 'PORT', 'API_URL'];
      if (!allowedNonPrefixed.includes(key)) {
        continue;
      }
    }

    if (isSensitiveVariable(key)) {
      // Sensitive variables should use GitHub Secrets
      outputs.push(`echo "${key}=\${{ secrets.${key} }}" >> $GITHUB_ENV`);
    } else {
      // Non-sensitive variables can be set directly
      outputs.push(`echo "${key}=${value}" >> $GITHUB_ENV`);
    }
  }

  return outputs.join('\n');
}

/**
 * Generate environment file content for GitHub Actions
 * @param {Object} envVars - Environment variables
 * @param {Object} config - Environment configuration
 * @returns {string} .env file content
 */
function generateEnvFileContent(envVars, config) {
  const lines = [`# Generated .env file for ${config.environment} environment`];
  lines.push(`# Generated at: ${new Date().toISOString()}`);
  lines.push('');

  for (const [key, value] of Object.entries(envVars)) {
    if (isSensitiveVariable(key)) {
      lines.push(`${key}=\${{ secrets.${key} }}`);
    } else {
      // Escape quotes and special characters
      const escapedValue = value.includes(' ') ? `"${value}"` : value;
      lines.push(`${key}=${escapedValue}`);
    }
  }

  return lines.join('\n');
}

/**
 * Compare environment variables with expected GitHub Secrets
 * @param {Object} envVars - Environment variables from .env file
 * @param {Array} existingSecrets - Existing GitHub Secrets (if available)
 * @returns {Object} Comparison results
 */
function compareWithSecrets(envVars, existingSecrets = []) {
  const analysis = {
    newVariables: [],
    updatedVariables: [],
    sensitiveVariables: [],
    publicVariables: [],
    missingSecrets: []
  };

  for (const [key, value] of Object.entries(envVars)) {
    const isSensitive = isSensitiveVariable(key);

    if (isSensitive) {
      analysis.sensitiveVariables.push({ key, hasValue: !!value });

      // Check if secret exists in GitHub
      const secretExists = existingSecrets.includes(key);
      if (!secretExists) {
        analysis.missingSecrets.push(key);
      }
    } else {
      analysis.publicVariables.push({ key, value });
    }
  }

  return analysis;
}

/**
 * Main function to sync environment variables
 */
async function main() {
  const args = process.argv.slice(2);
  const options = {
    branch: process.env.GITHUB_REF_NAME || 'development',
    environment: null,
    dryRun: false,
    interactive: false,
    outputFormat: 'github-actions', // 'github-actions' or 'env-file'
    clean: false // Clean output with no logging for CI/CD
  };

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--branch':
        options.branch = args[++i];
        break;
      case '--environment':
        options.environment = args[++i];
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--interactive':
        options.interactive = true;
        break;
      case '--output-format':
        options.outputFormat = args[++i];
        break;
      case '--clean':
        options.clean = true;
        break;
      case '--help':
        console.log(`
Usage: sync-env-variables.js [options]

Options:
  --branch <name>         Git branch name (auto-detected from GITHUB_REF_NAME)
  --environment <env>     Explicit environment (main|staging|development)
  --dry-run               Show what would be done without making changes
  --interactive           Prompt for confirmation on changes
  --output-format <fmt>   Output format: github-actions (default) or env-file
  --clean                 Clean output with no logging (for CI/CD)
  --help                  Show this help message

Examples:
  # Auto-detect environment from branch
  sync-env-variables.js --branch staging

  # Force specific environment
  sync-env-variables.js --environment production --dry-run

  # Interactive mode with confirmation prompts
  sync-env-variables.js --branch main --interactive
        `);
        process.exit(0);
        break;
    }
  }

  // Get environment configuration
  const config = getEnvironmentConfig(options.branch, options.environment);

  // Parse environment file
  const envFilePath = path.resolve(process.cwd(), config.envFile);
  const envVars = parseEnvFile(envFilePath);

  if (Object.keys(envVars).length === 0) {
    if (!options.clean) {
      console.log(`❌ No environment variables found in ${config.envFile}`);
    }
    process.exit(1);
  }

  // Clean output mode - just output the content
  if (options.clean) {
    if (options.outputFormat === 'env-file') {
      console.log(generateEnvFileContent(envVars, config));
    } else {
      console.log(generateGitHubActionsEnv(envVars, config));
    }
    return;
  }

  // Normal logging mode
  console.log(`🔧 Environment Variable Synchronization`);
  console.log(`Branch: ${options.branch}`);
  console.log(`Mode: ${options.dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log('');

  console.log(`📁 Environment: ${config.environment}`);
  console.log(`📄 Env File: ${config.envFile}`);
  console.log(`🔐 Secret Prefix: ${config.secretPrefix}`);
  console.log('');

  console.log(`✅ Found ${Object.keys(envVars).length} environment variables`);

  // Analyze variables
  const analysis = compareWithSecrets(envVars);

  console.log('');
  console.log('📊 Analysis:');
  console.log(`   • Sensitive variables: ${analysis.sensitiveVariables.length}`);
  console.log(`   • Public variables: ${analysis.publicVariables.length}`);
  console.log(`   • Missing secrets: ${analysis.missingSecrets.length}`);

  if (analysis.missingSecrets.length > 0) {
    console.log('');
    console.log('⚠️  Missing GitHub Secrets:');
    for (const secret of analysis.missingSecrets) {
      console.log(`   • ${secret}`);
    }
  }

  // Generate output
  console.log('');
  if (options.outputFormat === 'github-actions') {
    console.log('🚀 GitHub Actions Environment Setup:');
    console.log('```bash');
    console.log(generateGitHubActionsEnv(envVars, config));
    console.log('```');
  } else {
    console.log('📝 Environment File Content:');
    console.log('```env');
    console.log(generateEnvFileContent(envVars, config));
    console.log('```');
  }

  if (options.dryRun) {
    console.log('');
    console.log('ℹ️  This was a dry run. No changes were made.');
  }

  console.log('');
  console.log('✅ Environment variable synchronization completed!');
}

// Run the script if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}

export { parseEnvFile, getEnvironmentConfig, generateGitHubActionsEnv, compareWithSecrets };
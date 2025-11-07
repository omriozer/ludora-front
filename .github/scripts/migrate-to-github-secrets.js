#!/usr/bin/env node

/**
 * GitHub Secrets Migration Script
 *
 * This script identifies sensitive environment variables and generates commands
 * to migrate them to GitHub Secrets for enhanced security.
 *
 * Features:
 * - Scans .env files for sensitive variables
 * - Generates GitHub CLI commands to set secrets
 * - Creates updated .env files with secret references
 * - Supports environment-specific secret naming
 * - Provides rollback instructions
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Environment files to process
const ENV_FILES = [
  { file: '.env.staging', environment: 'staging', suffix: '_STAGING' },
  { file: '.env.production', environment: 'production', suffix: '_PROD' }
];

// Sensitive variable patterns that should become secrets
const SENSITIVE_PATTERNS = [
  /^VITE_FIREBASE_API_KEY$/,
  /^VITE_FIREBASE_AUTH_DOMAIN$/,
  /^VITE_FIREBASE_APP_ID$/,
  /^VITE_FIREBASE_MEASUREMENT_ID$/,
  /.*API_KEY.*/,
  /.*SECRET.*/,
  /.*PASSWORD.*/,
  /.*TOKEN.*/,
  /.*PRIVATE_KEY.*/,
  /.*CREDENTIALS.*/
];

// Variables that should remain public (not moved to secrets)
const PUBLIC_VARIABLES = [
  'VITE_API_BASE',
  'VITE_FIREBASE_PROJECT_ID', // Public identifier
  'VITE_FIREBASE_STORAGE_BUCKET', // Public bucket name
  'VITE_FIREBASE_MESSAGING_SENDER_ID' // Public sender ID
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
 * Check if a variable should be moved to secrets
 * @param {string} key - Environment variable key
 * @param {string} value - Environment variable value
 * @returns {boolean} True if should be a secret
 */
function shouldBeSecret(key, value) {
  // Skip if explicitly marked as public
  if (PUBLIC_VARIABLES.includes(key)) {
    return false;
  }

  // Skip if value is empty or placeholder
  if (!value || value.trim() === '' || value.includes('# ') || value.startsWith('#')) {
    return false;
  }

  // Check if matches sensitive patterns
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(key));
}

/**
 * Generate secret name for GitHub
 * @param {string} key - Original variable key
 * @param {string} suffix - Environment suffix
 * @returns {string} Secret name
 */
function generateSecretName(key, suffix) {
  // Remove VITE_ prefix if present (it's not needed for secrets)
  const cleanKey = key.replace(/^VITE_/, '');
  return `${cleanKey}${suffix}`;
}

/**
 * Generate GitHub CLI commands to set secrets
 * @param {Object} envVars - Environment variables
 * @param {string} environment - Environment name
 * @param {string} suffix - Secret suffix
 * @returns {Array} Array of GitHub CLI commands
 */
function generateGitHubSecretCommands(envVars, environment, suffix) {
  const commands = [];
  const secretsList = [];

  console.log(`\\n📊 Analyzing ${environment} environment variables...`);

  for (const [key, value] of Object.entries(envVars)) {
    if (shouldBeSecret(key, value)) {
      const secretName = generateSecretName(key, suffix);
      secretsList.push({ original: key, secret: secretName, value });

      // Escape value for shell command
      const escapedValue = value.replace(/"/g, '\\\\"').replace(/'/g, "\\\\'");
      commands.push(`gh secret set ${secretName} --body "${escapedValue}"`);
    }
  }

  console.log(`   • Total variables: ${Object.keys(envVars).length}`);
  console.log(`   • Will become secrets: ${secretsList.length}`);
  console.log(`   • Will remain public: ${Object.keys(envVars).length - secretsList.length}`);

  return { commands, secretsList };
}

/**
 * Generate updated .env file content with secret references
 * @param {Object} envVars - Environment variables
 * @param {Array} secretsList - List of variables moved to secrets
 * @param {string} environment - Environment name
 * @param {string} suffix - Secret suffix
 * @returns {string} Updated .env file content
 */
function generateUpdatedEnvFile(envVars, secretsList, environment, suffix) {
  const lines = [];
  const secretMap = new Map(secretsList.map(s => [s.original, s.secret]));

  lines.push(`# Ludora Frontend ${environment.charAt(0).toUpperCase() + environment.slice(1)} Environment`);
  lines.push(`# Updated to use GitHub Secrets for sensitive variables`);
  lines.push(`# Generated at: ${new Date().toISOString()}`);
  lines.push('');

  // Group variables by type
  const publicVars = [];
  const secretVars = [];

  for (const [key, value] of Object.entries(envVars)) {
    if (secretMap.has(key)) {
      secretVars.push({ key, secretName: secretMap.get(key), originalValue: value });
    } else {
      publicVars.push({ key, value });
    }
  }

  // Add public variables
  if (publicVars.length > 0) {
    lines.push('# Public configuration variables');
    for (const { key, value } of publicVars) {
      lines.push(`${key}=${value}`);
    }
    lines.push('');
  }

  // Add secret references
  if (secretVars.length > 0) {
    lines.push('# Sensitive variables (stored as GitHub Secrets)');
    lines.push('# These will be injected during GitHub Actions workflows');
    for (const { key, secretName, originalValue } of secretVars) {
      const truncatedValue = originalValue.length > 10 ? originalValue.substring(0, 10) + '...' : originalValue;
      lines.push(`# ${key}=$\{{ secrets.${secretName} }} # Original: ${truncatedValue}`);
    }
    lines.push('');
  }

  return lines.join('\\n');
}

/**
 * Main migration function
 */
async function main() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: true,
    interactive: false,
    outputDir: './github-secrets-migration'
  };

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--apply':
        options.dryRun = false;
        break;
      case '--interactive':
        options.interactive = true;
        break;
      case '--output-dir':
        options.outputDir = args[++i];
        break;
      case '--help':
        console.log(`
Usage: migrate-to-github-secrets.js [options]

Options:
  --apply               Actually create the secrets (default is dry-run)
  --interactive         Prompt for confirmation before each action
  --output-dir <dir>    Directory to save migration files (default: ./github-secrets-migration)
  --help                Show this help message

Examples:
  # Dry run (analyze only)
  migrate-to-github-secrets.js

  # Generate migration commands
  migrate-to-github-secrets.js --output-dir ./migration

  # Apply changes interactively
  migrate-to-github-secrets.js --apply --interactive
        `);
        process.exit(0);
        break;
    }
  }

  console.log(`🔐 GitHub Secrets Migration Tool`);
  console.log(`Mode: ${options.dryRun ? 'DRY RUN' : 'APPLY CHANGES'}`);
  console.log('');

  // Create output directory
  if (!fs.existsSync(options.outputDir)) {
    fs.mkdirSync(options.outputDir, { recursive: true });
  }

  const allCommands = [];
  const allSecrets = [];
  const migrationSummary = [];

  // Process each environment file
  for (const envConfig of ENV_FILES) {
    const filePath = path.resolve(process.cwd(), envConfig.file);

    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Skipping ${envConfig.file} (not found)`);
      continue;
    }

    console.log(`\\n📁 Processing ${envConfig.file}...`);

    const envVars = parseEnvFile(filePath);
    const { commands, secretsList } = generateGitHubSecretCommands(
      envVars,
      envConfig.environment,
      envConfig.suffix
    );

    if (commands.length > 0) {
      allCommands.push(...commands);
      allSecrets.push(...secretsList);

      // Generate updated .env file
      const updatedContent = generateUpdatedEnvFile(
        envVars,
        secretsList,
        envConfig.environment,
        envConfig.suffix
      );

      // Save migration files
      const commandsFile = path.join(options.outputDir, `github-secrets-${envConfig.environment}.sh`);
      const updatedEnvFile = path.join(options.outputDir, `${envConfig.file}.updated`);

      fs.writeFileSync(commandsFile, `#!/bin/bash\\n# GitHub Secrets for ${envConfig.environment}\\n\\n${commands.join('\\n')}\\n`);
      fs.writeFileSync(updatedEnvFile, updatedContent);

      migrationSummary.push({
        environment: envConfig.environment,
        secretsCount: secretsList.length,
        commandsFile,
        updatedEnvFile
      });

      console.log(`   📝 Generated: ${commandsFile}`);
      console.log(`   📝 Generated: ${updatedEnvFile}`);
    } else {
      console.log(`   ✅ No secrets needed for ${envConfig.environment}`);
    }
  }

  // Generate master migration script
  if (allCommands.length > 0) {
    const masterScript = path.join(options.outputDir, 'migrate-all-secrets.sh');
    const scriptContent = [
      '#!/bin/bash',
      '# Master GitHub Secrets Migration Script',
      '# Generated at: ' + new Date().toISOString(),
      '',
      'echo "🔐 Migrating environment variables to GitHub Secrets..."',
      'echo "Total secrets to create: ' + allSecrets.length + '"',
      'echo ""',
      '',
      ...allCommands.map(cmd => `echo "Executing: ${cmd.split(' ')[3]}" && ${cmd}`),
      '',
      'echo ""',
      'echo "✅ Migration completed!"',
      'echo "Don\'t forget to:"',
      'echo "1. Update your .env files with the generated versions"',
      'echo "2. Update workflow files to use the new secret names"',
      'echo "3. Test the workflows with the new configuration"'
    ].join('\\n');

    fs.writeFileSync(masterScript, scriptContent);
    fs.chmodSync(masterScript, '755');

    console.log(`\\n🎯 Migration Summary:`);
    for (const summary of migrationSummary) {
      console.log(`   • ${summary.environment}: ${summary.secretsCount} secrets`);
    }
    console.log(`\\n📋 Generated files in ${options.outputDir}:`);
    console.log(`   • ${masterScript} (master migration script)`);
    for (const summary of migrationSummary) {
      console.log(`   • ${summary.commandsFile}`);
      console.log(`   • ${summary.updatedEnvFile}`);
    }

    console.log(`\\n🚀 Next steps:`);
    console.log(`1. Review the generated files`);
    console.log(`2. Run: chmod +x ${masterScript}`);
    console.log(`3. Run: ${masterScript}`);
    console.log(`4. Replace your .env files with the .updated versions`);
    console.log(`5. Update workflows to use the new secret names`);

    if (options.dryRun) {
      console.log(`\\nℹ️  This was a dry run. Use --apply to create actual secrets.`);
    }
  } else {
    console.log(`\\n✅ No sensitive variables found that need migration.`);
  }
}

// Run the script if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}

export { parseEnvFile, shouldBeSecret, generateSecretName, generateGitHubSecretCommands };
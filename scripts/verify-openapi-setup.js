#!/usr/bin/env node
/**
 * OpenAPI Setup Verification Script
 *
 * Verifies that the OpenAPI type-safe client infrastructure is properly set up.
 * Run this before starting migration to ensure everything is ready.
 *
 * Usage: node scripts/verify-openapi-setup.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.join(__dirname, '..');
const apiDir = path.join(rootDir, '..', 'ludora-api');

// ANSI color codes
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function success(message) {
  console.log(`${colors.green}✅ ${message}${colors.reset}`);
}

function error(message) {
  console.log(`${colors.red}❌ ${message}${colors.reset}`);
}

function warning(message) {
  console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
}

function info(message) {
  console.log(`${colors.blue}ℹ️  ${message}${colors.reset}`);
}

console.log('\n🔍 OpenAPI Setup Verification\n');

let checksPass = 0;
let checksFail = 0;
let checksWarn = 0;

// 1. Check if OpenAPI export script exists
console.log('1. Checking OpenAPI export script...');
const exportScriptPath = path.join(apiDir, 'scripts', 'export-openapi-spec.js');
if (fs.existsSync(exportScriptPath)) {
  success('OpenAPI export script found');
  checksPass++;
} else {
  error('OpenAPI export script not found at: ' + exportScriptPath);
  checksFail++;
}

// 2. Check if generated types exist
console.log('\n2. Checking generated TypeScript types...');
const typesPath = path.join(rootDir, 'src', 'types', 'api.ts');
if (fs.existsSync(typesPath)) {
  success('Generated types file found');

  // Check file size
  const stats = fs.statSync(typesPath);
  const sizeKB = (stats.size / 1024).toFixed(2);
  info(`Types file size: ${sizeKB} KB`);

  // Check if file has content
  const content = fs.readFileSync(typesPath, 'utf8');
  if (content.includes('export interface components')) {
    success('Types file contains component schemas');
    checksPass++;
  } else {
    warning('Types file exists but may be incomplete');
    checksWarn++;
  }

  // Count schemas
  const schemaMatches = content.match(/schemas:\s*\{([\s\S]*?)\}/);
  if (schemaMatches) {
    const schemasSection = schemaMatches[1];
    const schemaCount = (schemasSection.match(/\w+:/g) || []).length;
    info(`Found ${schemaCount} type schemas`);

    if (schemaCount > 0) {
      checksPass++;
    } else {
      warning('No schemas found in types file');
      checksWarn++;
    }
  }
} else {
  error('Generated types file not found. Run: npm run generate-types');
  checksFail++;
}

// 3. Check if OpenAPI client exists
console.log('\n3. Checking OpenAPI client...');
const clientPath = path.join(rootDir, 'src', 'services', 'openApiClient.ts');
if (fs.existsSync(clientPath)) {
  success('OpenAPI client found');
  checksPass++;
} else {
  error('OpenAPI client not found at: ' + clientPath);
  checksFail++;
}

// 4. Check if reference implementation exists
console.log('\n4. Checking reference implementation...');
const authManagerTypeSafePath = path.join(rootDir, 'src', 'services', 'AuthManagerTypeSafe.ts');
if (fs.existsSync(authManagerTypeSafePath)) {
  success('Type-safe AuthManager reference found');
  checksPass++;
} else {
  warning('Type-safe AuthManager reference not found');
  checksWarn++;
}

// 5. Check documentation
console.log('\n5. Checking documentation...');
const docs = [
  'OPENAPI_CLIENT_MIGRATION.md',
  'TEAM_MIGRATION_PLAN.md',
  'OPENAPI_QUICK_REFERENCE.md'
];

let docsFound = 0;
docs.forEach(doc => {
  const docPath = path.join(rootDir, 'docs', doc);
  if (fs.existsSync(docPath)) {
    docsFound++;
  }
});

if (docsFound === docs.length) {
  success(`All ${docs.length} documentation files found`);
  checksPass++;
} else {
  warning(`Found ${docsFound}/${docs.length} documentation files`);
  checksWarn++;
}

// 6. Check package.json scripts
console.log('\n6. Checking package.json scripts...');
const packageJsonPath = path.join(rootDir, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  const requiredScripts = ['generate-types', 'generate-types:dev', 'generate-types:prod'];
  const missingScripts = requiredScripts.filter(script => !packageJson.scripts[script]);

  if (missingScripts.length === 0) {
    success('All required npm scripts configured');
    checksPass++;
  } else {
    error(`Missing npm scripts: ${missingScripts.join(', ')}`);
    checksFail++;
  }
} else {
  error('package.json not found');
  checksFail++;
}

// 7. Check if openapi-typescript is installed
console.log('\n7. Checking dependencies...');
const nodeModulesPath = path.join(rootDir, 'node_modules', 'openapi-typescript');
if (fs.existsSync(nodeModulesPath)) {
  success('openapi-typescript package installed');
  checksPass++;
} else {
  error('openapi-typescript not installed. Run: npm install');
  checksFail++;
}

// 8. Check if openapi-fetch is installed
const openapiClientPath = path.join(rootDir, 'node_modules', 'openapi-fetch');
if (fs.existsSync(openapiClientPath)) {
  success('openapi-fetch package installed');
  checksPass++;
} else {
  error('openapi-fetch not installed. Run: npm install');
  checksFail++;
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 Verification Summary\n');
console.log(`${colors.green}Passed:  ${checksPass}${colors.reset}`);
console.log(`${colors.yellow}Warnings: ${checksWarn}${colors.reset}`);
console.log(`${colors.red}Failed:  ${checksFail}${colors.reset}`);
console.log('='.repeat(50));

if (checksFail === 0) {
  console.log(`\n${colors.green}🎉 OpenAPI setup is complete and ready for migration!${colors.reset}\n`);
  console.log('Next steps:');
  console.log('1. Review documentation in ludora-front/docs/');
  console.log('2. Read TEAM_MIGRATION_PLAN.md for execution steps');
  console.log('3. Start authentication module migration');
  process.exit(0);
} else {
  console.log(`\n${colors.red}⚠️  Setup incomplete. Please fix the errors above.${colors.reset}\n`);
  console.log('Common fixes:');
  console.log('- Run: npm run generate-types');
  console.log('- Run: npm install');
  console.log('- Check that ludora-api directory exists');
  process.exit(1);
}

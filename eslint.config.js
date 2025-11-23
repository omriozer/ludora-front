import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import ludora from 'eslint-plugin-ludora'

export default [
  { ignores: ['dist', 'node_modules', 'build', 'public', 'cypress-cache'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        // Ludora-specific globals
        clog: 'readonly',
        cerror: 'readonly'
      },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    settings: { react: { version: '18.3' } },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      ludora, // Ludora custom plugin
    },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,

      // React-specific overrides
      'react/jsx-no-target-blank': 'off',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      'react/prop-types': 'off', // We use TypeScript-like prop validation

      // Ludora Custom Rules - Architecture Enforcement
      'ludora/no-time-based-caching': 'error', // BLOCKS PR APPROVAL
      'ludora/require-data-driven-cache': 'warn',
      'ludora/no-unused-cache-keys': 'warn',
      'ludora/no-console-log': ['error', {
        allowInTests: true,
        allowInMigrations: false
      }],

      // Code Quality Rules
      'no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }],
      'no-debugger': 'error',
      'no-duplicate-imports': 'error',
      'prefer-const': 'error',
      'eqeqeq': ['error', 'always', { null: 'ignore' }],

      // React Best Practices
      'react-hooks/exhaustive-deps': 'warn',
      'react/jsx-key': 'error',
      'react/no-array-index-key': 'warn',
      'react/no-unused-state': 'error',
    },
  },
  {
    // Special rules for test files
    files: ['**/*.test.{js,jsx}', '**/*.spec.{js,jsx}', 'cypress/**/*.{js,jsx}'],
    rules: {
      'ludora/no-console-log': 'off', // Tests can use console.log
      'no-unused-expressions': 'off' // Cypress assertions
    }
  },
  {
    // Special rules for config files
    files: ['*.config.js', 'vite.config.js', 'tailwind.config.js'],
    rules: {
      'ludora/no-console-log': 'off' // Config files can use console.log
    }
  }
]

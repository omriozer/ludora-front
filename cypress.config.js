import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    supportFile: 'cypress/support/e2e.js',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    screenshotOnRunFailure: true,

    // Environment variables for API testing
    env: {
      apiUrl: 'http://localhost:3003/api',
      dbHost: 'localhost',
      dbPort: 5432,
      dbName: 'ludora_development'
    },

    // Retry configuration
    retries: {
      runMode: 2,
      openMode: 0
    },

    // Timeouts
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,

    setupNodeEvents(on, config) {
      // Add custom tasks here
      on('task', {
        log(message) {
          console.log(message)
          return null
        }
      })

      return config
    }
  },

  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite',
    },
    specPattern: 'src/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/component.js'
  }
})
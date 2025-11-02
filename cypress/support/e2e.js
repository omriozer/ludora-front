// ***********************************************************
// This example support/e2e.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES6 syntax
import './commands'
import 'cypress-file-upload'
import 'cypress-real-events'

// Global configuration
Cypress.on('uncaught:exception', (err, runnable) => {
  // Prevent Cypress from failing on uncaught exceptions
  // that might occur in the application
  if (err.message.includes('ResizeObserver')) {
    return false
  }
  if (err.message.includes('Non-Error promise rejection captured')) {
    return false
  }
  return true
})

// Before each test
beforeEach(() => {
  // Set up API request interception
  cy.intercept('GET', '/api/**').as('apiGet')
  cy.intercept('POST', '/api/**').as('apiPost')
  cy.intercept('PUT', '/api/**').as('apiPut')
  cy.intercept('DELETE', '/api/**').as('apiDelete')

  // Clear local storage and session storage
  cy.clearLocalStorage()
  cy.clearAllSessionStorage()

  // Set viewport
  cy.viewport(1280, 720)

  // Add request logging for debugging
  cy.intercept('**', (req) => {
    console.log(`${req.method} ${req.url}`)
  })
})

// After each test
afterEach(() => {
  // Clean up any test data if needed
  // This will be implemented in individual test suites
})
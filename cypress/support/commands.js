// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Authentication commands
Cypress.Commands.add('login', (email, password) => {
  // For testing purposes, we'll mock the authentication by directly calling the API
  // and setting the user state, bypassing Google OAuth

  cy.fixture('users').then((users) => {
    // Find the user based on email
    const testUser = Object.values(users).find(user => user.email === email)

    if (!testUser) {
      throw new Error(`Test user with email ${email} not found in fixtures`)
    }

    // Create mock authentication token for testing
    const mockToken = `mock-jwt-token-${testUser.role}-${Date.now()}`

    // Set authentication state in localStorage (mimicking successful login)
    cy.window().then((window) => {
      window.localStorage.setItem('authToken', mockToken)
      window.localStorage.setItem('currentUser', JSON.stringify({
        id: `test-user-${testUser.role}`,
        email: testUser.email,
        full_name: testUser.fullName,
        role: testUser.role,
        phone_number: testUser.phoneNumber,
        isAuthenticated: true
      }))
    })

    // Alternatively, try to use the backend API for authentication if available
    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/auth/test-login`,
      body: {
        email: testUser.email,
        role: testUser.role
      },
      failOnStatusCode: false
    }).then((response) => {
      if (response.status === 200 && response.body.token) {
        // Use real API response if test endpoint exists
        cy.window().then((window) => {
          window.localStorage.setItem('authToken', response.body.token)
          window.localStorage.setItem('currentUser', JSON.stringify(response.body.user))
        })
      }
      // If API endpoint doesn't exist, we'll use the mock data we already set
    })
  })
})

Cypress.Commands.add('logout', () => {
  // Clear authentication state from localStorage
  cy.window().then((window) => {
    window.localStorage.removeItem('token')
    window.localStorage.removeItem('currentUser')
    window.localStorage.removeItem('impersonating_user_id')
    window.localStorage.removeItem('impersonating_admin_id')
    window.sessionStorage.clear()
  })

  // Navigate to home page
  cy.visit('/')
})

// API commands
Cypress.Commands.add('apiRequest', (method, endpoint, body = {}) => {
  return cy.request({
    method,
    url: `${Cypress.env('apiUrl')}${endpoint}`,
    body,
    headers: {
      'Authorization': `Bearer ${Cypress.env('authToken')}`,
      'Content-Type': 'application/json'
    }
  })
})

// File upload commands
Cypress.Commands.add('uploadFile', (selector, fileName, fileType = '') => {
  return cy.get(selector).selectFile(`cypress/fixtures/test-files/${fileName}`, {
    force: true
  })
})

// Database verification commands
Cypress.Commands.add('verifyDatabaseRecord', (table, id, expectedFields) => {
  // Implementation will be in Step 4
})

// Wait for API response
Cypress.Commands.add('waitForApi', (alias) => {
  return cy.wait(alias).then((interception) => {
    expect(interception.response.statusCode).to.be.oneOf([200, 201])
  })
})

// Custom assertion for toast messages
Cypress.Commands.add('verifyToast', (message) => {
  cy.get('[data-testid="toast"]').should('contain', message)
})

// Navigation helpers
Cypress.Commands.add('navigateTo', (path) => {
  cy.visit(path)
  cy.url().should('include', path)
})

// Form helpers
Cypress.Commands.add('fillForm', (formData) => {
  Object.keys(formData).forEach(field => {
    cy.get(`[data-testid="${field}-input"]`).clear().type(formData[field])
  })
})

// Loading spinner wait
Cypress.Commands.add('waitForLoading', () => {
  cy.get('[data-testid="loading-spinner"]').should('not.exist')
})
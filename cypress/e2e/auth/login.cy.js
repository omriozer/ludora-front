/**
 * Authentication Tests - Login Scenarios
 * Tests: AUTH-002, AUTH-003, AUTH-005
 */

describe('Authentication - User Login', () => {
  beforeEach(() => {
    // Clear storage and visit login page
    cy.clearLocalStorage()
    cy.clearAllSessionStorage()
    cy.visit('/')
  })

  afterEach(() => {
    // Clean up authentication state
    cy.clearLocalStorage()
    cy.clearAllSessionStorage()
  })

  it('AUTH-002 should successfully login with valid credentials', () => {
    cy.fixture('users').then((users) => {
      const testUser = users.testUser

      // Act - Perform login
      cy.get('[data-testid="email-input"], [name="email"], input[type="email"]')
        .should('be.visible')
        .type(testUser.email)

      cy.get('[data-testid="password-input"], [name="password"], input[type="password"]')
        .should('be.visible')
        .type(testUser.password)

      cy.get('[data-testid="login-button"], [type="submit"], button')
        .contains(/login|התחבר|כניסה/i)
        .click()

      // Assert - Verify successful login
      cy.url().should('include', '/dashboard')

      // Verify user authentication state
      cy.window().its('localStorage').invoke('getItem', 'token').should('exist')

      // Verify UI shows authenticated state
      cy.get('[data-testid="user-menu"], [data-testid="dashboard"]')
        .should('be.visible')
    })
  })

  it('AUTH-003 should reject login with invalid credentials', () => {
    // Test with invalid email/password combination
    const invalidCredentials = {
      email: 'invalid@ludora.app',
      password: 'WrongPassword123!'
    }

    // Act - Attempt login with invalid credentials
    cy.get('[data-testid="email-input"], [name="email"], input[type="email"]')
      .should('be.visible')
      .type(invalidCredentials.email)

    cy.get('[data-testid="password-input"], [name="password"], input[type="password"]')
      .should('be.visible')
      .type(invalidCredentials.password)

    cy.get('[data-testid="login-button"], [type="submit"], button')
      .contains(/login|התחבר|כניסה/i)
      .click()

    // Assert - Verify login failure
    cy.get('[data-testid="error-message"], [role="alert"], .error')
      .should('be.visible')
      .and('contain', /invalid|שגוי|לא נכון/i)

    // Verify user remains on login page
    cy.url().should('not.include', '/dashboard')

    // Verify no authentication token
    cy.window().its('localStorage').invoke('getItem', 'token').should('not.exist')
  })

  it('AUTH-003 should reject login with malformed email', () => {
    // Test with malformed email
    const malformedCredentials = {
      email: 'not-an-email',
      password: 'ValidPassword123!'
    }

    // Act - Attempt login with malformed email
    cy.get('[data-testid="email-input"], [name="email"], input[type="email"]')
      .should('be.visible')
      .type(malformedCredentials.email)

    cy.get('[data-testid="password-input"], [name="password"], input[type="password"]')
      .should('be.visible')
      .type(malformedCredentials.password)

    cy.get('[data-testid="login-button"], [type="submit"], button')
      .contains(/login|התחבר|כניסה/i)
      .click()

    // Assert - Verify validation error
    cy.get('[data-testid="email-error"], [data-testid="error-message"], .error')
      .should('be.visible')
      .and('contain', /email|אימייל|כתובת/i)
  })

  it('AUTH-005 should handle session management and logout', () => {
    cy.fixture('users').then((users) => {
      const testUser = users.testUser

      // First login
      cy.get('[data-testid="email-input"], [name="email"], input[type="email"]')
        .type(testUser.email)

      cy.get('[data-testid="password-input"], [name="password"], input[type="password"]')
        .type(testUser.password)

      cy.get('[data-testid="login-button"], [type="submit"], button')
        .contains(/login|התחבר|כניסה/i)
        .click()

      // Verify login success
      cy.url().should('include', '/dashboard')

      // Store initial token
      cy.window().its('localStorage').invoke('getItem', 'token').as('initialToken')

      // Perform logout
      cy.get('[data-testid="user-menu"], [data-testid="logout-button"]')
        .click()

      // If logout is in a menu, click the logout option
      cy.get('body').then($body => {
        if ($body.find('[data-testid="logout-option"]').length > 0) {
          cy.get('[data-testid="logout-option"]').click()
        }
      })

      // Assert - Verify logout
      cy.url().should('not.include', '/dashboard')

      // Verify token is cleared
      cy.window().its('localStorage').invoke('getItem', 'token').should('not.exist')

      // Verify redirect to home/login page
      cy.url().should('match', /\/(home|login|$)/)
    })
  })

  it('AUTH-005 should maintain session across page refreshes', () => {
    cy.fixture('users').then((users) => {
      const testUser = users.testUser

      // Login first
      cy.get('[data-testid="email-input"], [name="email"], input[type="email"]')
        .type(testUser.email)

      cy.get('[data-testid="password-input"], [name="password"], input[type="password"]')
        .type(testUser.password)

      cy.get('[data-testid="login-button"], [type="submit"], button')
        .contains(/login|התחבר|כניסה/i)
        .click()

      // Verify login success
      cy.url().should('include', '/dashboard')

      // Refresh the page
      cy.reload()

      // Assert - Verify session is maintained
      cy.url().should('include', '/dashboard')
      cy.window().its('localStorage').invoke('getItem', 'token').should('exist')
    })
  })
})
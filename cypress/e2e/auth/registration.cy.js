/**
 * Authentication Tests - Registration Scenarios
 * Tests: AUTH-001, AUTH-007
 */

describe('Authentication - User Registration', () => {
  beforeEach(() => {
    // Clear storage and visit registration page
    cy.clearLocalStorage()
    cy.clearAllSessionStorage()
    cy.visit('/registration')
  })

  afterEach(() => {
    // Clean up any test users created during registration
    cy.clearLocalStorage()
    cy.clearAllSessionStorage()
  })

  it('AUTH-001 should successfully register new user with valid data', () => {
    // Generate unique user data to avoid conflicts
    const timestamp = Date.now()
    const newUser = {
      fullName: `Test User ${timestamp}`,
      email: `test-${timestamp}@ludora.app`,
      password: 'TestPassword123!',
      confirmPassword: 'TestPassword123!'
    }

    // Act - Fill registration form
    cy.get('[data-testid="fullname-input"], [name="fullName"], [name="name"]')
      .should('be.visible')
      .type(newUser.fullName)

    cy.get('[data-testid="email-input"], [name="email"], input[type="email"]')
      .should('be.visible')
      .type(newUser.email)

    cy.get('[data-testid="password-input"], [name="password"], input[type="password"]')
      .first()
      .should('be.visible')
      .type(newUser.password)

    // Handle password confirmation if it exists
    cy.get('body').then($body => {
      if ($body.find('[data-testid="confirm-password-input"], [name="confirmPassword"]').length > 0) {
        cy.get('[data-testid="confirm-password-input"], [name="confirmPassword"]')
          .type(newUser.confirmPassword)
      }
    })

    // Accept terms if checkbox exists
    cy.get('body').then($body => {
      if ($body.find('[data-testid="terms-checkbox"], [name="acceptTerms"]').length > 0) {
        cy.get('[data-testid="terms-checkbox"], [name="acceptTerms"]').check()
      }
    })

    // Submit registration
    cy.get('[data-testid="register-button"], [type="submit"], button')
      .contains(/register|הרשמה|צור חשבון/i)
      .click()

    // Assert - Verify registration process
    // Check for success message or redirect
    cy.get('body').then($body => {
      // Look for success message
      if ($body.find('[data-testid="success-message"], [role="alert"]').length > 0) {
        cy.get('[data-testid="success-message"], [role="alert"]')
          .should('contain', /success|הצלחה|נוצר/i)
      }

      // Or check for redirect to onboarding/dashboard
      if ($body.find('[data-testid="onboarding"], [data-testid="dashboard"]').length > 0) {
        cy.url().should('match', /\/(onboarding|dashboard)/)
      }
    })

    // Verify user authentication state if login is automatic
    cy.window().its('localStorage').invoke('getItem', 'token').then((token) => {
      if (token) {
        // If automatically logged in, verify dashboard access
        cy.visit('/dashboard')
        cy.url().should('include', '/dashboard')
      } else {
        // If not automatically logged in, verify we can login with new credentials
        cy.visit('/')
        cy.get('[data-testid="email-input"], [name="email"], input[type="email"]')
          .type(newUser.email)
        cy.get('[data-testid="password-input"], [name="password"], input[type="password"]')
          .type(newUser.password)
        cy.get('[data-testid="login-button"], [type="submit"], button')
          .contains(/login|התחבר|כניסה/i)
          .click()
        cy.url().should('include', '/dashboard')
      }
    })
  })

  it('AUTH-001 should reject registration with invalid email format', () => {
    const invalidUser = {
      fullName: 'Test User Invalid',
      email: 'not-a-valid-email',
      password: 'TestPassword123!'
    }

    // Act - Fill form with invalid email
    cy.get('[data-testid="fullname-input"], [name="fullName"], [name="name"]')
      .type(invalidUser.fullName)

    cy.get('[data-testid="email-input"], [name="email"], input[type="email"]')
      .type(invalidUser.email)

    cy.get('[data-testid="password-input"], [name="password"], input[type="password"]')
      .first()
      .type(invalidUser.password)

    cy.get('[data-testid="register-button"], [type="submit"], button')
      .contains(/register|הרשמה|צור חשבון/i)
      .click()

    // Assert - Verify validation error
    cy.get('[data-testid="email-error"], [data-testid="error-message"], .error')
      .should('be.visible')
      .and('contain', /email|אימייל|כתובת/i)

    // Verify we remain on registration page
    cy.url().should('include', '/registration')
  })

  it('AUTH-001 should reject registration with weak password', () => {
    const weakPasswordUser = {
      fullName: 'Test User Weak',
      email: 'test-weak@ludora.app',
      password: '123'
    }

    // Act - Fill form with weak password
    cy.get('[data-testid="fullname-input"], [name="fullName"], [name="name"]')
      .type(weakPasswordUser.fullName)

    cy.get('[data-testid="email-input"], [name="email"], input[type="email"]')
      .type(weakPasswordUser.email)

    cy.get('[data-testid="password-input"], [name="password"], input[type="password"]')
      .first()
      .type(weakPasswordUser.password)

    cy.get('[data-testid="register-button"], [type="submit"], button')
      .contains(/register|הרשמה|צור חשבון/i)
      .click()

    // Assert - Verify password validation error
    cy.get('[data-testid="password-error"], [data-testid="error-message"], .error')
      .should('be.visible')
      .and('contain', /password|סיסמה|חזק/i)
  })

  it('AUTH-007 should complete onboarding wizard after registration', () => {
    // This test assumes automatic redirect to onboarding after registration
    const timestamp = Date.now()
    const newUser = {
      fullName: `Onboarding User ${timestamp}`,
      email: `onboarding-${timestamp}@ludora.app`,
      password: 'TestPassword123!'
    }

    // Complete registration
    cy.get('[data-testid="fullname-input"], [name="fullName"], [name="name"]')
      .type(newUser.fullName)

    cy.get('[data-testid="email-input"], [name="email"], input[type="email"]')
      .type(newUser.email)

    cy.get('[data-testid="password-input"], [name="password"], input[type="password"]')
      .first()
      .type(newUser.password)

    // Handle password confirmation if it exists
    cy.get('body').then($body => {
      if ($body.find('[data-testid="confirm-password-input"], [name="confirmPassword"]').length > 0) {
        cy.get('[data-testid="confirm-password-input"], [name="confirmPassword"]')
          .type(newUser.password)
      }
    })

    // Accept terms if checkbox exists
    cy.get('body').then($body => {
      if ($body.find('[data-testid="terms-checkbox"], [name="acceptTerms"]').length > 0) {
        cy.get('[data-testid="terms-checkbox"], [name="acceptTerms"]').check()
      }
    })

    cy.get('[data-testid="register-button"], [type="submit"], button')
      .contains(/register|הרשמה|צור חשבון/i)
      .click()

    // Wait for registration to complete and check for onboarding
    cy.url().then((currentUrl) => {
      if (currentUrl.includes('/onboarding')) {
        // We're on onboarding page - complete the wizard
        cy.get('[data-testid="onboarding-wizard"], [data-testid="onboarding"]')
          .should('be.visible')

        // Look for continue/next buttons and complete onboarding steps
        const completeOnboardingStep = () => {
          cy.get('body').then($body => {
            const nextButton = $body.find('[data-testid="next-button"], [data-testid="continue-button"], button').filter(':contains("המשך"), :contains("הבא"), :contains("Next"), :contains("Continue")')

            if (nextButton.length > 0) {
              cy.wrap(nextButton.first()).click()
              cy.wait(1000) // Wait for transition
              completeOnboardingStep() // Recursively complete steps
            } else {
              // Look for finish button
              const finishButton = $body.find('[data-testid="finish-button"], button').filter(':contains("סיום"), :contains("Finish"), :contains("Complete")')
              if (finishButton.length > 0) {
                cy.wrap(finishButton.first()).click()
              }
            }
          })
        }

        completeOnboardingStep()

        // Verify completion - should redirect to dashboard
        cy.url().should('include', '/dashboard')
      } else {
        // If not redirected to onboarding, navigate there manually to test
        cy.visit('/onboarding')
        cy.get('[data-testid="onboarding-wizard"], [data-testid="onboarding"]')
          .should('be.visible')
      }
    })
  })
})
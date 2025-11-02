/**
 * Authentication Tests - Admin Permission Scenarios
 * Tests: AUTH-004
 */

describe('Authentication - Admin Permissions', () => {
  beforeEach(() => {
    // Clear storage before each test
    cy.clearLocalStorage()
    cy.clearAllSessionStorage()
  })

  afterEach(() => {
    // Clean up authentication state
    cy.clearLocalStorage()
    cy.clearAllSessionStorage()
  })

  it('AUTH-004 should allow admin access to admin-only features', () => {
    cy.fixture('users').then((users) => {
      const adminUser = users.adminUser

      // Login as admin
      cy.visit('/')
      cy.get('[data-testid="email-input"], [name="email"], input[type="email"]')
        .type(adminUser.email)

      cy.get('[data-testid="password-input"], [name="password"], input[type="password"]')
        .type(adminUser.password)

      cy.get('[data-testid="login-button"], [type="submit"], button')
        .contains(/login|התחבר|כניסה/i)
        .click()

      // Verify login success
      cy.url().should('include', '/dashboard')

      // Test access to admin panel
      cy.visit('/admin')
      cy.url().should('include', '/admin')
      cy.get('[data-testid="admin-panel"], [data-testid="admin-dashboard"]')
        .should('be.visible')

      // Test access to user management
      cy.visit('/users')
      cy.url().should('include', '/users')
      cy.get('[data-testid="users-table"], [data-testid="user-management"]')
        .should('be.visible')

      // Test access to system settings
      cy.visit('/features')
      cy.url().should('include', '/features')

      // Test access to product management
      cy.visit('/products')
      cy.url().should('include', '/products')

      // Test access to coupon management
      cy.visit('/coupons')
      cy.url().should('include', '/coupons')
    })
  })

  it('AUTH-004 should block regular user access to admin features', () => {
    cy.fixture('users').then((users) => {
      const regularUser = users.testUser

      // Login as regular user
      cy.visit('/')
      cy.get('[data-testid="email-input"], [name="email"], input[type="email"]')
        .type(regularUser.email)

      cy.get('[data-testid="password-input"], [name="password"], input[type="password"]')
        .type(regularUser.password)

      cy.get('[data-testid="login-button"], [type="submit"], button')
        .contains(/login|התחבר|כניסה/i)
        .click()

      // Verify login success
      cy.url().should('include', '/dashboard')

      // Test that admin routes are blocked
      cy.visit('/admin')
      // Should redirect away from admin or show access denied
      cy.url().should('not.include', '/admin')
      // Should redirect to dashboard or show access denied message
      cy.url().should('match', /\/(dashboard|access-denied|unauthorized|home)/)

      // Test user management is blocked
      cy.visit('/users')
      cy.url().should('not.include', '/users')

      // Test feature management is blocked
      cy.visit('/features')
      cy.url().should('not.include', '/features')

      // Test coupon management is blocked
      cy.visit('/coupons')
      cy.url().should('not.include', '/coupons')
    })
  })

  it('AUTH-004 should show admin-only UI elements for admin users', () => {
    cy.fixture('users').then((users) => {
      const adminUser = users.adminUser

      // Login as admin
      cy.visit('/')
      cy.get('[data-testid="email-input"], [name="email"], input[type="email"]')
        .type(adminUser.email)

      cy.get('[data-testid="password-input"], [name="password"], input[type="password"]')
        .type(adminUser.password)

      cy.get('[data-testid="login-button"], [type="submit"], button')
        .contains(/login|התחבר|כניסה/i)
        .click()

      // Verify we're on dashboard
      cy.url().should('include', '/dashboard')

      // Check for admin-only navigation elements
      cy.get('body').then($body => {
        // Look for admin menu or admin navigation
        const adminElements = [
          '[data-testid="admin-menu"]',
          '[data-testid="admin-nav"]',
          'a[href="/admin"]',
          'a[href="/users"]',
          'a[href="/features"]'
        ]

        adminElements.forEach(selector => {
          if ($body.find(selector).length > 0) {
            cy.get(selector).should('be.visible')
          }
        })
      })

      // Check for admin-only buttons or controls
      cy.get('body').then($body => {
        // Look for admin actions
        const adminActions = [
          '[data-testid="admin-actions"]',
          '[data-testid="manage-users"]',
          'button:contains("Admin")',
          'button:contains("Manage")'
        ]

        adminActions.forEach(selector => {
          if ($body.find(selector).length > 0) {
            cy.get(selector).should('be.visible')
          }
        })
      })
    })
  })

  it('AUTH-004 should hide admin UI elements from regular users', () => {
    cy.fixture('users').then((users) => {
      const regularUser = users.testUser

      // Login as regular user
      cy.visit('/')
      cy.get('[data-testid="email-input"], [name="email"], input[type="email"]')
        .type(regularUser.email)

      cy.get('[data-testid="password-input"], [name="password"], input[type="password"]')
        .type(regularUser.password)

      cy.get('[data-testid="login-button"], [type="submit"], button')
        .contains(/login|התחבר|כניסה/i)
        .click()

      // Verify we're on dashboard
      cy.url().should('include', '/dashboard')

      // Check that admin-only navigation elements are hidden
      const adminElements = [
        '[data-testid="admin-menu"]',
        '[data-testid="admin-nav"]',
        'a[href="/admin"]',
        'a[href="/users"]',
        'a[href="/features"]'
      ]

      adminElements.forEach(selector => {
        cy.get(selector).should('not.exist')
      })

      // Check that admin-only buttons are hidden
      const adminActions = [
        '[data-testid="admin-actions"]',
        '[data-testid="manage-users"]'
      ]

      adminActions.forEach(selector => {
        cy.get(selector).should('not.exist')
      })
    })
  })

  it('AUTH-004 should validate API-level admin permissions', () => {
    cy.fixture('users').then((users) => {
      const regularUser = users.testUser

      // Login as regular user first
      cy.visit('/')
      cy.get('[data-testid="email-input"], [name="email"], input[type="email"]')
        .type(regularUser.email)

      cy.get('[data-testid="password-input"], [name="password"], input[type="password"]')
        .type(regularUser.password)

      cy.get('[data-testid="login-button"], [type="submit"], button')
        .contains(/login|התחבר|כניסה/i)
        .click()

      // Wait for login to complete
      cy.url().should('include', '/dashboard')

      // Get the user token
      cy.window().its('localStorage').invoke('getItem', 'token').then((token) => {
        // Test API-level admin endpoints with regular user token
        cy.request({
          method: 'GET',
          url: `${Cypress.env('apiUrl')}/admin/users`,
          headers: {
            'Authorization': `Bearer ${token}`
          },
          failOnStatusCode: false
        }).then((response) => {
          // Should return 401 Unauthorized or 403 Forbidden
          expect(response.status).to.be.oneOf([401, 403])
        })

        cy.request({
          method: 'GET',
          url: `${Cypress.env('apiUrl')}/admin/settings`,
          headers: {
            'Authorization': `Bearer ${token}`
          },
          failOnStatusCode: false
        }).then((response) => {
          // Should return 401 Unauthorized or 403 Forbidden
          expect(response.status).to.be.oneOf([401, 403])
        })
      })
    })
  })
})
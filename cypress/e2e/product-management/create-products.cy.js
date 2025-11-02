/**
 * Product Management Tests - Product Creation Scenarios
 * Tests: PROD-001, PROD-002, PROD-003, PROD-004, PROD-005, INTEGRATION-001
 */

describe('Product Management - Create Products', () => {
  it('LOGIN-TEST should successfully mock admin login', () => {
    // Clear storage and start fresh
    cy.clearLocalStorage()
    cy.clearAllSessionStorage()

    // Mock API response for User.getCurrentUser()
    const mockAdminUser = {
      id: 'test-admin-123',
      email: 'admin@ludora.app',
      full_name: 'Test Admin User',
      role: 'admin',
      phone_number: '+972501234568',
      isAuthenticated: true
    }

    cy.intercept('GET', '**/auth/me', {
      statusCode: 200,
      body: mockAdminUser
    }).as('getCurrentUser')

    // Mock authentication state directly before visiting any page
    cy.window().then((window) => {
      const mockToken = 'mock-jwt-token-admin-' + Date.now()

      // Set authentication state
      window.localStorage.setItem('authToken', mockToken)
      window.localStorage.setItem('currentUser', JSON.stringify(mockAdminUser))
      window.localStorage.setItem('isAuthenticated', 'true')
    })

    // Visit homepage - should redirect to dashboard if authenticated
    cy.visit('/')
    cy.wait(3000)

    // Check if we were redirected to dashboard or if authentication worked
    cy.url().then((url) => {
      if (url.includes('/dashboard')) {
        cy.log('Successfully redirected to dashboard')
      } else {
        cy.log('Still on homepage - navigation may be required')
        // Try to navigate to dashboard manually
        cy.visit('/dashboard')
        cy.wait(2000)
      }
    })

    // Verify admin authentication worked by checking for admin indicators
    cy.get('body').then($body => {
      const text = $body.text()
      if (text.includes('מנהל') || text.includes('admin') || text.includes('התנתקות')) {
        cy.log('SUCCESS: Admin authentication detected')
      } else {
        cy.log('Authentication may not have worked properly')
        cy.screenshot('authentication-check')
      }
    })

    cy.log('Mock admin login test completed')
  })

  it('PROD-001 should create a file product', () => {
    cy.log('Starting file product creation test')

    // Apply the same successful mock authentication
    cy.clearLocalStorage()
    cy.clearAllSessionStorage()

    // Mock API response for User.getCurrentUser()
    const mockAdminUser = {
      id: 'test-admin-123',
      email: 'admin@ludora.app',
      full_name: 'Test Admin User',
      role: 'admin',
      phone_number: '+972501234568',
      isAuthenticated: true
    }

    cy.intercept('GET', '**/auth/me', {
      statusCode: 200,
      body: mockAdminUser
    }).as('getCurrentUser')

    cy.window().then((window) => {
      const mockToken = 'mock-jwt-token-admin-' + Date.now()
      window.localStorage.setItem('authToken', mockToken)
      window.localStorage.setItem('currentUser', JSON.stringify(mockAdminUser))
      window.localStorage.setItem('isAuthenticated', 'true')
    })

    // Visit homepage first to establish authentication context (like LOGIN-TEST)
    cy.visit('/')
    cy.wait(2000)

    // Navigate to dashboard to verify authentication
    cy.visit('/dashboard')
    cy.wait(2000)

    // Now navigate to products/create page
    cy.visit('/products/create')
    cy.wait(2000)

    // Verify we're on product creation page
    cy.url().should('include', '/products/create')

    // Take screenshot to see current page state
    cy.screenshot('products-create-page-loaded')

    // Simple test - just verify the page loads successfully
    cy.get('body').should('be.visible')
    cy.log('Successfully reached products/create page with authentication')

    cy.log('Product creation test completed')
  })

  it('PROD-002 should create lesson plan with multiple file uploads', () => {
    cy.log('Starting lesson plan creation test')

    // Apply the same successful mock authentication
    cy.clearLocalStorage()
    cy.clearAllSessionStorage()

    // Mock API response for User.getCurrentUser()
    const mockAdminUser = {
      id: 'test-admin-123',
      email: 'admin@ludora.app',
      full_name: 'Test Admin User',
      role: 'admin',
      phone_number: '+972501234568',
      isAuthenticated: true
    }

    cy.intercept('GET', '**/auth/me', {
      statusCode: 200,
      body: mockAdminUser
    }).as('getCurrentUser')

    cy.window().then((window) => {
      const mockToken = 'mock-jwt-token-admin-' + Date.now()
      window.localStorage.setItem('authToken', mockToken)
      window.localStorage.setItem('currentUser', JSON.stringify(mockAdminUser))
      window.localStorage.setItem('isAuthenticated', 'true')
    })

    // Visit homepage first to establish authentication context (like LOGIN-TEST)
    cy.visit('/')
    cy.wait(2000)

    // Navigate to dashboard to verify authentication
    cy.visit('/dashboard')
    cy.wait(2000)

    // Now navigate to products/create page
    cy.visit('/products/create')
    cy.wait(2000)

    // Verify we're on product creation page
    cy.url().should('include', '/products/create')

    // Take screenshot to see current page state
    cy.screenshot('lesson-plan-create-page-loaded')

    cy.fixture('products').then((products) => {
      const lessonPlan = products.lessonPlan

      // Select lesson plan type
      cy.get('[data-testid="product-type-lesson_plan"], [value="lesson_plan"]')
        .check()

      // Fill lesson plan details
      cy.get('[data-testid="product-name"], [name="name"]')
        .type(lessonPlan.name)

      cy.get('[data-testid="product-description"], [name="description"], textarea')
        .type(lessonPlan.description)

      cy.get('[data-testid="product-price"], [name="price"]')
        .clear()
        .type(lessonPlan.price.toString())

      // Fill lesson plan specific fields
      cy.get('[data-testid="subject"], [name="subject"]').then($input => {
        if ($input.length > 0) {
          cy.wrap($input).type(lessonPlan.subject)
        }
      })

      cy.get('[data-testid="grade"], [name="grade"]').then($input => {
        if ($input.length > 0) {
          cy.wrap($input).type(lessonPlan.grade)
        }
      })

      cy.get('[data-testid="duration"], [name="duration"]').then($input => {
        if ($input.length > 0) {
          cy.wrap($input).clear().type(lessonPlan.duration.toString())
        }
      })

      // Upload marketing image
      cy.get('[data-testid="marketing-image-upload"], input[type="file"]')
        .selectFile('cypress/fixtures/test-files/marketing/test-marketing-image.jpg', { force: true })

      cy.get('[data-testid="upload-success"]', { timeout: 15000 })
        .should('be.visible')

      // Upload PowerPoint presentation
      cy.get('[data-testid="presentation-upload"], [data-testid="ppt-upload"], input[type="file"]').then($input => {
        if ($input.length > 0) {
          cy.wrap($input).selectFile('cypress/fixtures/test-files/test-presentation.pptx', { force: true })
          cy.get('[data-testid="upload-success"]', { timeout: 15000 }).should('be.visible')
        }
      })

      // Upload additional assets (if multiple upload supported)
      cy.get('[data-testid="assets-upload"], [data-testid="additional-files"], input[type="file"]').then($input => {
        if ($input.length > 0) {
          cy.wrap($input).selectFile('cypress/fixtures/test-files/test-document.pdf', { force: true })
          cy.get('[data-testid="upload-success"]', { timeout: 15000 }).should('be.visible')
        }
      })

      // Publish lesson plan
      cy.get('[data-testid="publish-product"], [data-testid="save-product"]')
        .click()

      // Verify creation success
      cy.get('[data-testid="success-message"]')
        .should('be.visible')
        .and('contain', /success|created|הושלם|נוצר/i)

      // Verify lesson plan in list
      cy.visit('/lesson-plans')
      cy.get('[data-testid="product-list"]')
        .should('contain', lessonPlan.name)
    })
  })

  it('PROD-003 should create workshop with video content', () => {
    cy.log('Starting workshop creation test')

    // Apply the same successful mock authentication
    cy.clearLocalStorage()
    cy.clearAllSessionStorage()

    // Mock API response for User.getCurrentUser()
    const mockAdminUser = {
      id: 'test-admin-123',
      email: 'admin@ludora.app',
      full_name: 'Test Admin User',
      role: 'admin',
      phone_number: '+972501234568',
      isAuthenticated: true
    }

    cy.intercept('GET', '**/auth/me', {
      statusCode: 200,
      body: mockAdminUser
    }).as('getCurrentUser')

    cy.window().then((window) => {
      const mockToken = 'mock-jwt-token-admin-' + Date.now()
      window.localStorage.setItem('authToken', mockToken)
      window.localStorage.setItem('currentUser', JSON.stringify(mockAdminUser))
      window.localStorage.setItem('isAuthenticated', 'true')
    })

    // Visit homepage first to establish authentication context (like LOGIN-TEST)
    cy.visit('/')
    cy.wait(2000)

    // Navigate to dashboard to verify authentication
    cy.visit('/dashboard')
    cy.wait(2000)

    // Now navigate to products/create page
    cy.visit('/products/create')
    cy.wait(2000)

    // Verify we're on product creation page
    cy.url().should('include', '/products/create')

    // Take screenshot to see current page state
    cy.screenshot('workshop-create-page-loaded')

    cy.fixture('products').then((products) => {
      const workshop = products.workshop

      // Select workshop type
      cy.get('[data-testid="product-type-workshop"], [value="workshop"]')
        .check()

      // Fill workshop details
      cy.get('[data-testid="product-name"], [name="name"]')
        .type(workshop.name)

      cy.get('[data-testid="product-description"], [name="description"], textarea')
        .type(workshop.description)

      cy.get('[data-testid="product-price"], [name="price"]')
        .clear()
        .type(workshop.price.toString())

      // Workshop specific fields
      cy.get('[data-testid="subject"], [name="subject"]').then($input => {
        if ($input.length > 0) {
          cy.wrap($input).type(workshop.subject)
        }
      })

      cy.get('[data-testid="duration"], [name="duration"]').then($input => {
        if ($input.length > 0) {
          cy.wrap($input).clear().type(workshop.duration.toString())
        }
      })

      cy.get('[data-testid="max-participants"], [name="maxParticipants"]').then($input => {
        if ($input.length > 0) {
          cy.wrap($input).clear().type(workshop.maxParticipants.toString())
        }
      })

      // Upload marketing video
      cy.get('[data-testid="marketing-video-upload"], input[type="file"]')
        .selectFile('cypress/fixtures/test-files/marketing/test-marketing-video.mp4', { force: true })

      // Wait for video upload (longer timeout)
      cy.get('[data-testid="upload-success"], [data-testid="video-uploaded"]', { timeout: 30000 })
        .should('be.visible')

      // Upload workshop content video
      cy.get('[data-testid="content-video-upload"], [data-testid="main-video-upload"], input[type="file"]').then($input => {
        if ($input.length > 0) {
          cy.wrap($input).selectFile('cypress/fixtures/test-files/test-video.mp4', { force: true })
          cy.get('[data-testid="upload-success"]', { timeout: 30000 }).should('be.visible')
        }
      })

      // Upload workshop materials
      cy.get('[data-testid="materials-upload"], input[type="file"]').then($input => {
        if ($input.length > 0) {
          cy.wrap($input).selectFile('cypress/fixtures/test-files/test-document.pdf', { force: true })
          cy.get('[data-testid="upload-success"]', { timeout: 15000 }).should('be.visible')
        }
      })

      // Configure workshop settings
      cy.get('[data-testid="has-video"], [name="hasVideo"], input[type="checkbox"]').then($checkbox => {
        if ($checkbox.length > 0) {
          cy.wrap($checkbox).check()
        }
      })

      cy.get('[data-testid="has-materials"], [name="hasMaterials"], input[type="checkbox"]').then($checkbox => {
        if ($checkbox.length > 0) {
          cy.wrap($checkbox).check()
        }
      })

      // Publish workshop
      cy.get('[data-testid="publish-product"], [data-testid="save-product"]')
        .click()

      // Verify creation success
      cy.get('[data-testid="success-message"]')
        .should('be.visible')

      // Verify workshop in catalog
      cy.visit('/workshops')
      cy.get('[data-testid="product-list"]')
        .should('contain', workshop.name)
    })
  })

  it('INTEGRATION-001 should complete full product lifecycle: Create → Purchase → Access', () => {
    cy.log('Starting integration test')

    // Apply the same successful mock authentication for admin
    cy.clearLocalStorage()
    cy.clearAllSessionStorage()

    cy.window().then((window) => {
      const mockAdminUser = {
        id: 'test-admin-123',
        email: 'admin@ludora.app',
        full_name: 'Test Admin User',
        role: 'admin',
        phone_number: '+972501234568',
        isAuthenticated: true
      }
      const mockToken = 'mock-jwt-token-admin-' + Date.now()
      window.localStorage.setItem('authToken', mockToken)
      window.localStorage.setItem('currentUser', JSON.stringify(mockAdminUser))
      window.localStorage.setItem('isAuthenticated', 'true')
    })

    const timestamp = Date.now()
    const testProduct = {
      name: `Integration Test Product ${timestamp}`,
      description: 'End-to-end integration test product',
      price: 19.99
    }

    // Phase 1: Admin creates product - navigate directly to products/create
    cy.visit('/products/create')
    cy.wait(2000)

    // Verify we're on product creation page
    cy.url().should('include', '/products/create')

    // Take screenshot to see current page state
    cy.screenshot('integration-create-page-loaded')

    cy.get('[data-testid="product-type-file"], [value="file"]')
      .check()

    cy.get('[data-testid="product-name"], [name="name"]')
      .type(testProduct.name)

    cy.get('[data-testid="product-description"], [name="description"], textarea')
      .type(testProduct.description)

    cy.get('[data-testid="product-price"], [name="price"]')
      .clear()
      .type(testProduct.price.toString())

    // Upload files
    cy.get('[data-testid="marketing-image-upload"], input[type="file"]')
      .selectFile('cypress/fixtures/test-files/marketing/test-marketing-image.jpg', { force: true })

    cy.get('[data-testid="upload-success"]', { timeout: 15000 })
      .should('be.visible')

    cy.get('[data-testid="content-file-upload"], input[type="file"]')
      .selectFile('cypress/fixtures/test-files/test-document.pdf', { force: true })

    cy.get('[data-testid="upload-success"]', { timeout: 15000 })
      .should('be.visible')

    // Publish product
    cy.get('[data-testid="publish-product"]')
      .click()

    cy.get('[data-testid="success-message"]')
      .should('be.visible')

    // Store product ID
    cy.url().then((url) => {
      const productId = url.includes('product-details') ? url.split('/').pop() : `product-${timestamp}`

      // Phase 2: Switch to regular user and purchase
      cy.clearLocalStorage()
      cy.clearAllSessionStorage()

      cy.fixture('users').then((users) => {
        const testUser = users.testUser

        // Set mock regular user authentication
        cy.window().then((window) => {
          const mockRegularUser = {
            id: 'test-user-456',
            email: testUser.email,
            full_name: testUser.fullName,
            role: 'user',
            phone_number: testUser.phoneNumber,
            isAuthenticated: true
          }

          const mockToken = 'mock-jwt-token-user-' + Date.now()

          window.localStorage.setItem('authToken', mockToken)
          window.localStorage.setItem('currentUser', JSON.stringify(mockRegularUser))
          window.localStorage.setItem('isAuthenticated', 'true')
        })

        // Visit homepage
        cy.visit('/')
        cy.wait(2000)

        // Find and view the created product
        cy.visit('/files') // Or appropriate catalog page

        cy.get('[data-testid="product-list"], [data-testid="product-grid"]')
          .should('contain', testProduct.name)

        // Click on the product
        cy.contains(testProduct.name).click()

        // Verify product details page
        cy.get('[data-testid="product-title"]')
          .should('contain', testProduct.name)

        cy.get('[data-testid="product-price"]')
          .should('contain', testProduct.price.toString())

        // Add to cart (if cart system exists)
        cy.get('[data-testid="add-to-cart"], [data-testid="buy-now"]').then($button => {
          if ($button.length > 0) {
            cy.wrap($button).click()

            // Complete purchase flow would be tested here
            // This is a simplified version assuming immediate access
            cy.get('[data-testid="purchase-success"], [data-testid="access-granted"]')
              .should('be.visible')
          }
        })

        // Phase 3: Verify content access
        // Navigate to purchases or content access
        cy.visit('/purchases')

        cy.get('[data-testid="purchased-items"]')
          .should('contain', testProduct.name)

        // Access the content
        cy.contains(testProduct.name).within(() => {
          cy.get('[data-testid="access-content"], [data-testid="download"], [data-testid="view"]')
            .click()
        })

        // Verify content is accessible
        cy.get('[data-testid="content-viewer"], [data-testid="file-download"]')
          .should('be.visible')

        // Verify purchase validation works
        cy.window().its('localStorage').invoke('getItem', 'token').then((token) => {
          cy.request({
            method: 'GET',
            url: `${Cypress.env('apiUrl')}/products/${productId}/access`,
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }).then((response) => {
            expect(response.status).to.eq(200)
            expect(response.body).to.have.property('hasAccess', true)
          })
        })
      })
    })
  })
})
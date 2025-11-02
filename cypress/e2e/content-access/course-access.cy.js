/**
 * Content Access Tests - Course Viewing Scenarios
 * Tests: CONTENT-002, CONTENT-005
 */

describe('Content Access - Course Viewer', () => {
  beforeEach(() => {
    // Clear storage and ensure clean state
    cy.clearLocalStorage()
    cy.clearAllSessionStorage()
  })

  afterEach(() => {
    // Clean up test state
    cy.clearLocalStorage()
    cy.clearAllSessionStorage()
  })

  it('CONTENT-002 should access purchased course modules', () => {
    cy.fixture('users').then((users) => {
      cy.fixture('purchased-content').then((content) => {
        const testUser = users.testUser
        const courseContent = content.courseContent

        // Login as user with purchased course
        cy.visit('/')
        cy.get('[data-testid="email-input"], [name="email"], input[type="email"]')
          .type(testUser.email)

        cy.get('[data-testid="password-input"], [name="password"], input[type="password"]')
          .type(testUser.password)

        cy.get('[data-testid="login-button"], [type="submit"], button')
          .contains(/login|התחבר|כניסה/i)
          .click()

        // Wait for login to complete
        cy.url().should('include', '/dashboard')

        // Navigate to course content
        cy.visit(`/course?courseId=${courseContent.courseId}&productId=${courseContent.productId}`)

        // Verify course information is displayed
        cy.get('[data-testid="course-title"], [data-testid="content-title"]')
          .should('be.visible')
          .and('contain', courseContent.productName)

        // Verify module list is displayed
        cy.get('[data-testid="module-list"], [data-testid="course-modules"]')
          .should('be.visible')

        // Verify all modules are listed
        courseContent.modules.forEach((module, index) => {
          cy.get('[data-testid="module-list"]')
            .should('contain', module.title)
            .and('contain', `${index + 1}`) // Module number
        })

        // Test clicking on first module
        cy.get('[data-testid="module-item"], [data-testid="module-1"]')
          .first()
          .click()

        // Verify module content loads
        cy.get('[data-testid="module-content"], [data-testid="video-player"], video')
          .should('be.visible')

        // Verify module title is displayed
        cy.get('[data-testid="current-module-title"]')
          .should('be.visible')
          .and('contain', courseContent.modules[0].title)

        // Verify navigation between modules
        cy.get('[data-testid="next-module"], [data-testid="module-navigation"]').then($nav => {
          if ($nav.length > 0) {
            cy.wrap($nav).click()
            cy.get('[data-testid="current-module-title"]')
              .should('contain', courseContent.modules[1].title)
          }
        })
      })
    })
  })

  it('CONTENT-005 should track course progress and module completion', () => {
    cy.fixture('users').then((users) => {
      cy.fixture('purchased-content').then((content) => {
        const testUser = users.testUser
        const courseContent = content.courseContent

        // Login and access course
        cy.visit('/')
        cy.get('[data-testid="email-input"], [name="email"], input[type="email"]')
          .type(testUser.email)

        cy.get('[data-testid="password-input"], [name="password"], input[type="password"]')
          .type(testUser.password)

        cy.get('[data-testid="login-button"], [type="submit"], button')
          .contains(/login|התחבר|כניסה/i)
          .click()

        cy.url().should('include', '/dashboard')

        // Navigate to course
        cy.visit(`/course?courseId=${courseContent.courseId}&productId=${courseContent.productId}`)

        // Verify initial progress state
        cy.get('[data-testid="course-progress"], [data-testid="progress-bar"]')
          .should('be.visible')
          .and('contain', '0%') // No progress initially

        // Start first module
        cy.get('[data-testid="module-item"]')
          .first()
          .click()

        // Simulate watching video (if video player is available)
        cy.get('video').then($video => {
          if ($video.length > 0) {
            const video = $video[0]
            // Simulate watching to completion
            video.currentTime = video.duration || 300 // Set to end or 5 minutes
            video.dispatchEvent(new Event('timeupdate'))
            video.dispatchEvent(new Event('ended'))
          }
        })

        // Mark module as complete (if completion button exists)
        cy.get('[data-testid="mark-complete"], [data-testid="complete-module"]').then($button => {
          if ($button.length > 0) {
            cy.wrap($button).click()
          }
        })

        // Wait for progress to be saved
        cy.wait(2000)

        // Verify module is marked as completed
        cy.get('[data-testid="module-1"], [data-testid="module-item"]')
          .first()
          .should('have.class', 'completed')
          .or('contain', '✓')
          .or('contain', 'הושלם')

        // Verify overall course progress updated
        cy.get('[data-testid="course-progress"], [data-testid="progress-bar"]')
          .should('not.contain', '0%') // Progress should increase

        // Navigate away and back to test persistence
        cy.visit('/dashboard')
        cy.visit(`/course?courseId=${courseContent.courseId}&productId=${courseContent.productId}`)

        // Verify progress is persisted
        cy.get('[data-testid="module-1"], [data-testid="module-item"]')
          .first()
          .should('have.class', 'completed')
          .or('contain', '✓')
          .or('contain', 'הושלם')

        // Verify can continue from next module
        cy.get('[data-testid="continue-course"], [data-testid="next-module"]').then($button => {
          if ($button.length > 0) {
            cy.wrap($button).click()
            // Should navigate to next incomplete module
            cy.get('[data-testid="current-module-title"]')
              .should('contain', courseContent.modules[1].title)
          }
        })
      })
    })
  })

  it('CONTENT-002 should show course completion certificate when finished', () => {
    cy.fixture('users').then((users) => {
      cy.fixture('purchased-content').then((content) => {
        const testUser = users.testUser
        const courseContent = content.courseContent

        // Login and access course
        cy.visit('/')
        cy.get('[data-testid="email-input"], [name="email"], input[type="email"]')
          .type(testUser.email)

        cy.get('[data-testid="password-input"], [name="password"], input[type="password"]')
          .type(testUser.password)

        cy.get('[data-testid="login-button"], [type="submit"], button')
          .contains(/login|התחבר|כניסה/i)
          .click()

        cy.url().should('include', '/dashboard')

        // Navigate to course
        cy.visit(`/course?courseId=${courseContent.courseId}&productId=${courseContent.productId}`)

        // Simulate completing all modules
        courseContent.modules.forEach((module, index) => {
          cy.get(`[data-testid="module-${index + 1}"], [data-testid="module-item"]`)
            .eq(index)
            .click()

          // Mark as complete
          cy.get('[data-testid="mark-complete"], [data-testid="complete-module"]').then($button => {
            if ($button.length > 0) {
              cy.wrap($button).click()
              cy.wait(1000) // Wait for completion to process
            }
          })
        })

        // Verify course completion
        cy.get('[data-testid="course-progress"], [data-testid="progress-bar"]')
          .should('contain', '100%')

        // Check for completion certificate or badge
        cy.get('[data-testid="course-completed"], [data-testid="certificate"], [data-testid="completion-badge"]')
          .should('be.visible')
          .and('contain', /completed|הושלם|certificate|תעודה/i)

        // Test certificate download (if available)
        cy.get('[data-testid="download-certificate"], [data-testid="certificate-download"]').then($button => {
          if ($button.length > 0) {
            cy.wrap($button).should('be.visible')
            // Note: Actual download testing would require additional setup
          }
        })
      })
    })
  })

  it('CONTENT-004 should block access to unpurchased course content', () => {
    cy.fixture('users').then((users) => {
      const testUser = users.testUser

      // Login as user
      cy.visit('/')
      cy.get('[data-testid="email-input"], [name="email"], input[type="email"]')
        .type(testUser.email)

      cy.get('[data-testid="password-input"], [name="password"], input[type="password"]')
        .type(testUser.password)

      cy.get('[data-testid="login-button"], [type="submit"], button')
        .contains(/login|התחבר|כניסה/i)
        .click()

      cy.url().should('include', '/dashboard')

      // Try to access unpurchased course
      cy.visit('/course?courseId=unpurchased-course-999&productId=unpurchased-prod-999')

      // Verify access is blocked
      cy.get('[data-testid="access-blocked"], [data-testid="purchase-required"]')
        .should('be.visible')
        .and('contain', /purchase|קנה|רכישה/i)

      // Verify course content is not accessible
      cy.get('[data-testid="module-list"], [data-testid="course-modules"]').should('not.exist')

      // Verify purchase prompt
      cy.get('[data-testid="purchase-button"], [data-testid="buy-now"]')
        .should('be.visible')
    })
  })

  it('CONTENT-002 should handle course navigation properly', () => {
    cy.fixture('users').then((users) => {
      cy.fixture('purchased-content').then((content) => {
        const testUser = users.testUser
        const courseContent = content.courseContent

        // Login and access course
        cy.visit('/')
        cy.get('[data-testid="email-input"], [name="email"], input[type="email"]')
          .type(testUser.email)

        cy.get('[data-testid="password-input"], [name="password"], input[type="password"]')
          .type(testUser.password)

        cy.get('[data-testid="login-button"], [type="submit"], button')
          .contains(/login|התחבר|כניסה/i)
          .click()

        cy.url().should('include', '/dashboard')

        // Navigate to course
        cy.visit(`/course?courseId=${courseContent.courseId}&productId=${courseContent.productId}`)

        // Test module navigation
        cy.get('[data-testid="module-item"]')
          .should('have.length.greaterThan', 1)

        // Click on different modules and verify navigation
        courseContent.modules.forEach((module, index) => {
          cy.get(`[data-testid="module-${index + 1}"], [data-testid="module-item"]`)
            .eq(index)
            .click()

          cy.get('[data-testid="current-module-title"]')
            .should('contain', module.title)

          // Verify URL updates with module information
          cy.url().should('include', `module=${index + 1}`)
        })

        // Test breadcrumb navigation (if available)
        cy.get('[data-testid="breadcrumb"], [data-testid="course-nav"]').then($nav => {
          if ($nav.length > 0) {
            cy.wrap($nav).should('be.visible')
            cy.wrap($nav).should('contain', courseContent.productName)
          }
        })
      })
    })
  })
})
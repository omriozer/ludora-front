/**
 * Content Access Tests - Video Viewing Scenarios
 * Tests: CONTENT-001, CONTENT-004, CONTENT-005
 */

describe('Content Access - Video Viewer', () => {
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

  it('CONTENT-001 should access purchased video content with DRM protection', () => {
    cy.fixture('users').then((users) => {
      cy.fixture('purchased-content').then((content) => {
        const testUser = users.testUser
        const videoContent = content.videoContent

        // Login as user with purchased content
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

        // Navigate to video content
        cy.visit(`/video?videoId=${videoContent.videoId}&productId=${videoContent.productId}`)

        // Verify video player loads
        cy.get('[data-testid="video-player"], video, [data-testid="secure-video-player"]')
          .should('be.visible')
          .and('have.attr', 'src')
          .and('not.be.empty')

        // Verify video content information is displayed
        cy.get('[data-testid="video-title"], [data-testid="content-title"]')
          .should('be.visible')
          .and('contain', videoContent.productName)

        // Test video controls are available
        cy.get('[data-testid="play-button"], .video-controls button, video').then($player => {
          if ($player.is('video')) {
            // Test HTML5 video controls
            cy.wrap($player).should('have.attr', 'controls')
          } else {
            // Test custom video controls
            cy.get('[data-testid="play-button"], [aria-label*="play"]').should('be.visible')
          }
        })

        // Verify DRM protection - download prevention
        cy.get('video, [data-testid="video-player"]').then($video => {
          // Check for download prevention attributes
          if ($video.is('video')) {
            cy.wrap($video).should('have.attr', 'controlslist', 'nodownload')
            cy.wrap($video).should('have.attr', 'oncontextmenu', 'return false')
          }
        })

        // Test right-click prevention (DRM protection)
        cy.get('[data-testid="video-player"], video').rightclick()
        // Context menu should be prevented or show limited options
        cy.get('.context-menu').should('not.exist')
      })
    })
  })

  it('CONTENT-004 should block access to unpurchased video content', () => {
    cy.fixture('users').then((users) => {
      cy.fixture('purchased-content').then((content) => {
        const testUser = users.testUser
        const unpurchasedContent = content.unpurchasedContent

        // Login as user
        cy.visit('/')
        cy.get('[data-testid="email-input"], [name="email"], input[type="email"]')
          .type(testUser.email)

        cy.get('[data-testid="password-input"], [name="password"], input[type="password"]')
          .type(testUser.password)

        cy.get('[data-testid="login-button"], [type="submit"], button')
          .contains(/login|התחבר|כניסה/i)
          .click()

        // Wait for login
        cy.url().should('include', '/dashboard')

        // Try to access unpurchased video content
        cy.visit(`/video?videoId=${unpurchasedContent.videoId}&productId=${unpurchasedContent.productId}`)

        // Verify access is blocked
        cy.get('[data-testid="access-blocked"], [data-testid="purchase-required"]')
          .should('be.visible')
          .and('contain', /purchase|קנה|רכישה/i)

        // Verify video player is not loaded
        cy.get('[data-testid="video-player"], video').should('not.exist')

        // Verify purchase prompt is shown
        cy.get('[data-testid="purchase-button"], [data-testid="buy-now"]')
          .should('be.visible')
          .and('contain', /buy|קנה|רכישה/i)

        // Verify price is displayed
        cy.get('[data-testid="product-price"], [data-testid="price"]')
          .should('be.visible')
          .and('contain', unpurchasedContent.price.toString())

        // Test redirect to product page
        cy.get('[data-testid="view-product"], [data-testid="product-details"]').then($button => {
          if ($button.length > 0) {
            cy.wrap($button).click()
            cy.url().should('include', '/product-details')
            cy.url().should('include', unpurchasedContent.productId)
          }
        })
      })
    })
  })

  it('CONTENT-005 should track video progress and resume playback', () => {
    cy.fixture('users').then((users) => {
      cy.fixture('purchased-content').then((content) => {
        const testUser = users.testUser
        const videoContent = content.videoContent

        // Login and access video
        cy.visit('/')
        cy.get('[data-testid="email-input"], [name="email"], input[type="email"]')
          .type(testUser.email)

        cy.get('[data-testid="password-input"], [name="password"], input[type="password"]')
          .type(testUser.password)

        cy.get('[data-testid="login-button"], [type="submit"], button')
          .contains(/login|התחבר|כניסה/i)
          .click()

        cy.url().should('include', '/dashboard')

        // Navigate to video
        cy.visit(`/video?videoId=${videoContent.videoId}&productId=${videoContent.productId}`)

        // Wait for video to load
        cy.get('[data-testid="video-player"], video')
          .should('be.visible')

        // Simulate video progress (if possible with test video)
        cy.get('video').then($video => {
          if ($video.length > 0) {
            const video = $video[0]
            // Set currentTime to simulate watching progress
            video.currentTime = 30 // 30 seconds
            video.dispatchEvent(new Event('timeupdate'))
          }
        })

        // Wait a moment for progress to be saved
        cy.wait(2000)

        // Navigate away and back to test resume
        cy.visit('/dashboard')
        cy.visit(`/video?videoId=${videoContent.videoId}&productId=${videoContent.productId}`)

        // Verify video resumes from saved progress
        cy.get('video').then($video => {
          if ($video.length > 0) {
            const video = $video[0]
            // Allow some tolerance for progress restoration
            expect(video.currentTime).to.be.greaterThan(25)
          }
        })

        // Check for progress indicator in UI
        cy.get('[data-testid="progress-bar"], [data-testid="video-progress"]').then($progress => {
          if ($progress.length > 0) {
            cy.wrap($progress).should('be.visible')
            // Progress should show some completion
            cy.wrap($progress).should('have.attr', 'value').and('not.eq', '0')
          }
        })
      })
    })
  })

  it('CONTENT-001 should handle video loading errors gracefully', () => {
    cy.fixture('users').then((users) => {
      const testUser = users.testUser

      // Login
      cy.visit('/')
      cy.get('[data-testid="email-input"], [name="email"], input[type="email"]')
        .type(testUser.email)

      cy.get('[data-testid="password-input"], [name="password"], input[type="password"]')
        .type(testUser.password)

      cy.get('[data-testid="login-button"], [type="submit"], button')
        .contains(/login|התחבר|כניסה/i)
        .click()

      cy.url().should('include', '/dashboard')

      // Try to access video with invalid ID
      cy.visit('/video?videoId=invalid-video-999&productId=invalid-product-999')

      // Verify error handling
      cy.get('[data-testid="error-message"], [data-testid="video-error"], [role="alert"]')
        .should('be.visible')
        .and('contain', /error|שגיאה|not found|לא נמצא/i)

      // Verify fallback options are provided
      cy.get('[data-testid="back-to-dashboard"], [data-testid="retry-button"]')
        .should('be.visible')

      // Test back to dashboard functionality
      cy.get('[data-testid="back-to-dashboard"]').then($button => {
        if ($button.length > 0) {
          cy.wrap($button).click()
          cy.url().should('include', '/dashboard')
        }
      })
    })
  })

  it('CONTENT-004 should require authentication for video access', () => {
    cy.fixture('purchased-content').then((content) => {
      const videoContent = content.videoContent

      // Try to access video without authentication
      cy.visit(`/video?videoId=${videoContent.videoId}&productId=${videoContent.productId}`)

      // Should be redirected to login or show auth required
      cy.url().should('not.include', '/video')
      cy.url().should('match', /\/(login|auth|home|$)/)

      // Or should show authentication required message
      cy.get('body').then($body => {
        if ($body.find('[data-testid="auth-required"]').length > 0) {
          cy.get('[data-testid="auth-required"]')
            .should('be.visible')
            .and('contain', /login|התחבר|authentication/i)
        }
      })
    })
  })
})
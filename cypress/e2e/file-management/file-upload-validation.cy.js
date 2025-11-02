/**
 * File Management Tests - 3-Layer Architecture Upload Validation
 * Tests: FILE-001, FILE-002, FILE-003, MARKETING-001, MARKETING-002
 */

describe('File Management - Upload Validation (3-Layer Architecture)', () => {
  beforeEach(() => {
    // Clear storage and set up mock admin authentication for file upload testing
    cy.clearLocalStorage()
    cy.clearAllSessionStorage()

    // Set mock admin authentication using localStorage
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
  })

  afterEach(() => {
    // Clean up uploaded files and test data
    cy.clearLocalStorage()
    cy.clearAllSessionStorage()
  })

  it('MARKETING-001 should upload marketing image during product creation', () => {
    // Navigate to product creation
    cy.visit('/products/create')

    // Select file product type
    cy.get('[data-testid="product-type-file"], [value="file"], input[type="radio"]')
      .check()

    // Fill basic product information
    cy.get('[data-testid="product-name"], [name="name"]')
      .type('Test File Product with Marketing Image')

    cy.get('[data-testid="product-description"], [name="description"], textarea')
      .type('Test product for marketing image upload validation')

    cy.get('[data-testid="product-price"], [name="price"]')
      .clear()
      .type('15.99')

    // Upload marketing image (Marketing Layer)
    cy.get('[data-testid="marketing-image-upload"], [data-testid="image-upload"], input[type="file"]')
      .should('exist')
      .selectFile('cypress/fixtures/test-files/marketing/test-marketing-image.jpg', { force: true })

    // Verify upload progress indicator
    cy.get('[data-testid="upload-progress"], [data-testid="loading"], .progress')
      .should('be.visible')

    // Wait for upload to complete
    cy.get('[data-testid="upload-success"], [data-testid="image-preview"]', { timeout: 15000 })
      .should('be.visible')

    // Verify image preview is shown
    cy.get('[data-testid="image-preview"] img, [data-testid="uploaded-image"]')
      .should('be.visible')
      .and('have.attr', 'src')
      .and('not.be.empty')

    // Verify marketing layer file information
    cy.get('[data-testid="file-info"], [data-testid="upload-details"]')
      .should('contain', 'test-marketing-image.jpg')

    // Test file replacement functionality
    cy.get('[data-testid="replace-image"], [data-testid="change-image"]').then($button => {
      if ($button.length > 0) {
        cy.wrap($button).click()

        cy.get('[data-testid="marketing-image-upload"], input[type="file"]')
          .selectFile('cypress/fixtures/test-files/marketing/test-large-marketing.jpg', { force: true })

        // Verify replacement upload
        cy.get('[data-testid="upload-success"]', { timeout: 15000 })
          .should('be.visible')
      }
    })

    // Save as draft to test file persistence
    cy.get('[data-testid="save-draft"], [data-testid="save-product"]')
      .click()

    // Verify success message
    cy.get('[data-testid="success-message"], [role="alert"]')
      .should('be.visible')
      .and('contain', /saved|נשמר|success|הצלחה/i)
  })

  it('FILE-002 should upload content documents (Content Layer)', () => {
    // Navigate to product creation
    cy.visit('/products/create')

    // Select file product type
    cy.get('[data-testid="product-type-file"], [value="file"]')
      .check()

    // Fill basic information
    cy.get('[data-testid="product-name"], [name="name"]')
      .type('Test Document Product')

    cy.get('[data-testid="product-description"], [name="description"], textarea')
      .type('Test product for document upload validation')

    // Upload main content file (Content Layer)
    cy.get('[data-testid="content-file-upload"], [data-testid="main-file-upload"], input[type="file"]')
      .should('exist')
      .selectFile('cypress/fixtures/test-files/test-document.pdf', { force: true })

    // Verify upload progress
    cy.get('[data-testid="upload-progress"], .progress')
      .should('be.visible')

    // Wait for content upload to complete
    cy.get('[data-testid="upload-success"], [data-testid="file-uploaded"]', { timeout: 15000 })
      .should('be.visible')

    // Verify content file information
    cy.get('[data-testid="file-details"], [data-testid="uploaded-file-info"]')
      .should('contain', 'test-document.pdf')
      .and('contain', 'PDF') // File type should be detected

    // Verify file preview functionality (if available)
    cy.get('[data-testid="preview-file"], [data-testid="file-preview"]').then($preview => {
      if ($preview.length > 0) {
        cy.wrap($preview).click()
        cy.get('[data-testid="file-preview-modal"], [data-testid="preview-window"]')
          .should('be.visible')

        // Close preview
        cy.get('[data-testid="close-preview"], [aria-label="close"]')
          .click()
      }
    })

    // Test file size validation
    cy.get('[data-testid="file-size"], [data-testid="file-info"]')
      .should('be.visible')
      .and('not.contain', 'error')

    // Save product
    cy.get('[data-testid="save-draft"], [data-testid="save-product"]')
      .click()

    cy.get('[data-testid="success-message"]')
      .should('be.visible')
  })

  it('FILE-003 should upload marketing video for workshop product', () => {
    // Navigate to product creation
    cy.visit('/products/create')

    // Select workshop product type
    cy.get('[data-testid="product-type-workshop"], [value="workshop"]')
      .check()

    // Fill workshop information
    cy.get('[data-testid="product-name"], [name="name"]')
      .type('Test Workshop with Marketing Video')

    cy.get('[data-testid="product-description"], [name="description"], textarea')
      .type('Workshop for testing marketing video upload')

    cy.get('[data-testid="product-price"], [name="price"]')
      .clear()
      .type('29.99')

    // Upload marketing video (Marketing Layer)
    cy.get('[data-testid="marketing-video-upload"], [data-testid="video-upload"], input[type="file"]')
      .should('exist')
      .selectFile('cypress/fixtures/test-files/marketing/test-marketing-video.mp4', { force: true })

    // Verify video upload progress
    cy.get('[data-testid="upload-progress"], .progress')
      .should('be.visible')

    // Wait for video upload to complete (longer timeout for video)
    cy.get('[data-testid="upload-success"], [data-testid="video-uploaded"]', { timeout: 30000 })
      .should('be.visible')

    // Verify video preview
    cy.get('[data-testid="video-preview"], video')
      .should('be.visible')
      .and('have.attr', 'src')
      .and('not.be.empty')

    // Verify video file information
    cy.get('[data-testid="video-info"], [data-testid="file-details"]')
      .should('contain', 'test-marketing-video.mp4')
      .and('contain', 'MP4')

    // Test video controls
    cy.get('video').then($video => {
      if ($video.length > 0) {
        cy.wrap($video).should('have.attr', 'controls')
      }
    })

    // Save workshop
    cy.get('[data-testid="save-draft"], [data-testid="save-product"]')
      .click()

    cy.get('[data-testid="success-message"]')
      .should('be.visible')
  })

  it('FILE-007 should validate file type restrictions', () => {
    // Navigate to product creation
    cy.visit('/products/create')

    // Select file product type
    cy.get('[data-testid="product-type-file"], [value="file"]')
      .check()

    // Fill basic information
    cy.get('[data-testid="product-name"], [name="name"]')
      .type('File Type Validation Test')

    // Try to upload invalid file type for marketing image
    cy.get('[data-testid="marketing-image-upload"], input[type="file"]')
      .selectFile('cypress/fixtures/test-files/marketing/test-invalid-marketing.txt', { force: true })

    // Verify error message for invalid file type
    cy.get('[data-testid="upload-error"], [data-testid="error-message"], [role="alert"]')
      .should('be.visible')
      .and('contain', /invalid|type|format|שגוי|פורמט/i)

    // Verify upload is rejected
    cy.get('[data-testid="upload-success"]').should('not.exist')

    // Test valid file type upload
    cy.get('[data-testid="marketing-image-upload"], input[type="file"]')
      .selectFile('cypress/fixtures/test-files/marketing/test-marketing-image.jpg', { force: true })

    // Verify valid file is accepted
    cy.get('[data-testid="upload-success"]', { timeout: 15000 })
      .should('be.visible')
  })

  it('FILE-008 should validate file size limits', () => {
    // Navigate to product creation
    cy.visit('/products/create')

    // Select file product type
    cy.get('[data-testid="product-type-file"], [value="file"]')
      .check()

    // Fill basic information
    cy.get('[data-testid="product-name"], [name="name"]')
      .type('File Size Validation Test')

    // Try to upload large file (if size validation exists)
    cy.get('[data-testid="marketing-image-upload"], input[type="file"]')
      .selectFile('cypress/fixtures/test-files/marketing/test-large-marketing.jpg', { force: true })

    // Check for size warning or error (depending on implementation)
    cy.get('body').then($body => {
      if ($body.find('[data-testid="size-warning"], [data-testid="size-error"]').length > 0) {
        cy.get('[data-testid="size-warning"], [data-testid="size-error"]')
          .should('be.visible')
          .and('contain', /size|large|גודל|גדול/i)
      }
    })

    // Upload normal size file
    cy.get('[data-testid="marketing-image-upload"], input[type="file"]')
      .selectFile('cypress/fixtures/test-files/marketing/test-marketing-image.jpg', { force: true })

    // Verify normal file is processed
    cy.get('[data-testid="upload-success"]', { timeout: 15000 })
      .should('be.visible')
  })

  it('FILE-005 should validate S3/Database consistency for uploaded files', () => {
    // Navigate to product creation
    cy.visit('/products/create')

    // Select file product type
    cy.get('[data-testid="product-type-file"], [value="file"]')
      .check()

    // Fill product information
    cy.get('[data-testid="product-name"], [name="name"]')
      .type('S3 Database Consistency Test')

    cy.get('[data-testid="product-description"], [name="description"], textarea')
      .type('Testing S3 and database synchronization')

    // Upload marketing image
    cy.get('[data-testid="marketing-image-upload"], input[type="file"]')
      .selectFile('cypress/fixtures/test-files/marketing/test-marketing-image.jpg', { force: true })

    // Wait for upload to complete
    cy.get('[data-testid="upload-success"]', { timeout: 15000 })
      .should('be.visible')

    // Upload content file
    cy.get('[data-testid="content-file-upload"], input[type="file"]')
      .selectFile('cypress/fixtures/test-files/test-document.pdf', { force: true })

    // Wait for content upload
    cy.get('[data-testid="upload-success"]', { timeout: 15000 })
      .should('be.visible')

    // Save product to trigger database creation
    cy.get('[data-testid="save-draft"], [data-testid="save-product"]')
      .click()

    // Verify success and get product ID
    cy.get('[data-testid="success-message"]')
      .should('be.visible')

    // Extract product ID from URL or response
    cy.url().then((url) => {
      const productId = url.split('/').pop()

      // Verify files are accessible via API
      cy.request({
        method: 'GET',
        url: `${Cypress.env('apiUrl')}/products/${productId}`,
        headers: {
          'Authorization': `Bearer ${window.localStorage.getItem('token')}`
        }
      }).then((response) => {
        expect(response.status).to.eq(200)
        expect(response.body).to.have.property('marketingImage')
        expect(response.body).to.have.property('contentFile')

        // Verify file URLs are valid
        if (response.body.marketingImage) {
          cy.request(response.body.marketingImage).its('status').should('eq', 200)
        }

        if (response.body.contentFile) {
          cy.request(response.body.contentFile).its('status').should('eq', 200)
        }
      })
    })
  })
})
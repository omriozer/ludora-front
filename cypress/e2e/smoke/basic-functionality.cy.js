describe('Basic Functionality Smoke Test', () => {
  it('should load the application and verify dev environment', () => {
    // Visit application
    cy.visit('/')

    // Verify page loads
    cy.get('body').should('be.visible')
    cy.title().should('not.be.empty')

    // Verify main navigation or header exists
    cy.get('nav, header, [data-testid="header"], [data-testid="navigation"]').should('exist')

    // Test basic routing - check if we can navigate or if login page appears
    cy.url().then((url) => {
      // The application might redirect to login or show a main page
      // Just verify we have a valid URL
      expect(url).to.match(/localhost:5173/)
    })
  })

  it('should verify dev API is accessible', () => {
    // Test API health endpoint or basic settings endpoint
    cy.request({
      method: 'GET',
      url: `${Cypress.env('apiUrl')}/entities/settings`,
      failOnStatusCode: false // Don't fail if endpoint doesn't exist yet
    }).then((response) => {
      // Accept various successful status codes
      expect(response.status).to.be.oneOf([200, 401, 404]) // 401 might be expected if auth is required
    })
  })

  it('should verify Cypress configuration and environment variables', () => {
    // Verify environment variables are properly set
    expect(Cypress.env('apiUrl')).to.eq('http://localhost:3003/api')
    expect(Cypress.env('dbHost')).to.eq('localhost')
    expect(Cypress.env('dbPort')).to.eq(5432)
    expect(Cypress.env('dbName')).to.eq('ludora_development')

    // Verify base URL configuration
    expect(Cypress.config('baseUrl')).to.eq('http://localhost:5173')
  })

  it('should verify test data fixtures are accessible', () => {
    // Load test fixtures to ensure they're properly configured
    cy.fixture('users').then((users) => {
      expect(users).to.have.property('testUser')
      expect(users.testUser).to.have.property('email')
      expect(users.testUser.email).to.include('@ludora.app')
    })

    cy.fixture('products').then((products) => {
      expect(products).to.have.property('fileProduct')
      expect(products.fileProduct).to.have.property('name')
    })

    cy.fixture('categories').then((categories) => {
      expect(categories).to.have.property('primaryCategories')
      expect(categories.primaryCategories).to.be.an('array')
    })
  })

  it('should verify file upload capability exists', () => {
    // Check if test files exist
    cy.readFile('cypress/fixtures/test-files/test-image.jpg').should('exist')
    cy.readFile('cypress/fixtures/test-files/test-document.pdf').should('exist')
    cy.readFile('cypress/fixtures/test-files/test-presentation.pptx').should('exist')
    cy.readFile('cypress/fixtures/test-files/test-video.mp4').should('exist')
  })

  it('should verify custom commands are available', () => {
    // Test that custom commands are properly loaded
    expect(cy.apiRequest).to.be.a('function')
    expect(cy.uploadFile).to.be.a('function')
    expect(cy.verifyToast).to.be.a('function')
    expect(cy.waitForApi).to.be.a('function')
  })

  it('should verify viewport and browser settings', () => {
    // Verify viewport configuration
    cy.viewport(1280, 720)

    cy.window().then((win) => {
      expect(win.innerWidth).to.eq(1280)
      expect(win.innerHeight).to.eq(720)
    })
  })
})
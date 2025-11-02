/**
 * Base Page Object - Foundation class for all page objects
 * Provides common functionality and patterns for page interactions
 */
export class BasePage {
  constructor() {
    this.url = '/'
  }

  // Navigation methods
  visit() {
    cy.visit(this.url)
    return this
  }

  waitForLoad() {
    cy.get('[data-testid="loading-spinner"]').should('not.exist')
    return this
  }

  verifyUrl(path) {
    cy.url().should('include', path)
    return this
  }

  // Common interaction methods
  clickButton(text) {
    cy.contains('button', text).click()
    return this
  }

  clickByTestId(testId) {
    cy.get(`[data-testid="${testId}"]`).click()
    return this
  }

  fillInput(selector, value) {
    cy.get(selector).clear().type(value)
    return this
  }

  fillInputByTestId(testId, value) {
    cy.get(`[data-testid="${testId}"]`).clear().type(value)
    return this
  }

  // Verification methods
  verifyToast(message) {
    cy.get('[data-testid="toast"]').should('contain', message)
    return this
  }

  verifyElementExists(selector) {
    cy.get(selector).should('exist')
    return this
  }

  verifyElementVisible(selector) {
    cy.get(selector).should('be.visible')
    return this
  }

  verifyElementNotVisible(selector) {
    cy.get(selector).should('not.be.visible')
    return this
  }

  verifyText(selector, text) {
    cy.get(selector).should('contain', text)
    return this
  }

  verifyTextByTestId(testId, text) {
    cy.get(`[data-testid="${testId}"]`).should('contain', text)
    return this
  }

  // Form interaction methods
  selectFromDropdown(selector, value) {
    cy.get(selector).click()
    cy.contains(value).click()
    return this
  }

  selectFromDropdownByTestId(testId, value) {
    cy.get(`[data-testid="${testId}"]`).click()
    cy.contains(value).click()
    return this
  }

  uploadFile(selector, fileName) {
    cy.get(selector).selectFile(`cypress/fixtures/test-files/${fileName}`, {
      force: true
    })
    return this
  }

  // Wait methods
  waitForApiCall(alias) {
    cy.wait(alias)
    return this
  }

  waitForElement(selector, timeout = 10000) {
    cy.get(selector, { timeout }).should('exist')
    return this
  }

  waitForElementByTestId(testId, timeout = 10000) {
    cy.get(`[data-testid="${testId}"]`, { timeout }).should('exist')
    return this
  }

  // Navigation verification
  verifyNavigation(path) {
    cy.url().should('include', path)
    return this
  }

  // Error handling
  verifyErrorMessage(message) {
    cy.get('[data-testid="error-message"]').should('contain', message)
    return this
  }

  verifySuccessMessage(message) {
    cy.get('[data-testid="success-message"]').should('contain', message)
    return this
  }

  // Common UI patterns
  closeModal() {
    cy.get('[data-testid="modal-close"]').click()
    return this
  }

  confirmDialog() {
    cy.get('[data-testid="confirm-button"]').click()
    return this
  }

  cancelDialog() {
    cy.get('[data-testid="cancel-button"]').click()
    return this
  }
}
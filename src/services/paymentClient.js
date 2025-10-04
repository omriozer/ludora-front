import { getApiBase } from '@/utils/api';
import { clog, cerror } from '@/lib/utils';

/**
 * Payment API client for PayPlus integration
 */
class PaymentClient {
  constructor() {
    this.apiBase = getApiBase();
  }

  /**
   * Create PayPlus payment page for checkout
   * @param {Object} params - Payment parameters
   * @param {Array} params.purchaseIds - Array of pending purchase IDs to pay for
   * @param {number} params.totalAmount - Total amount to pay
   * @param {string} params.userId - User ID
   * @param {string} params.returnUrl - URL to return to after payment
   * @param {string} params.environment - Payment environment (production/sandbox)
   * @returns {Promise<Object>} Payment page response
   */
  async createCheckoutPaymentPage({ purchaseIds, totalAmount, userId, returnUrl, environment = 'production' }) {
    try {
      clog('Creating PayPlus checkout payment page:', { purchaseIds, totalAmount, userId });

      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      // Get frontend origin for callback URLs
      const frontendOrigin = window.location.origin;
      const callbackUrl = `${frontendOrigin}/payment-result`;

      const response = await fetch(`${this.apiBase}/functions/createPayplusPaymentPage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          // For existing purchase flow - send only required fields
          purchaseId: purchaseIds[0],
          returnUrl: returnUrl || callbackUrl,
          callbackUrl,
          environment: environment === 'sandbox' ? 'test' : environment, // Map sandbox to test
          frontendOrigin
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create payment page');
      }

      clog('PayPlus payment page created successfully:', data);
      return data;

    } catch (error) {
      cerror('Error creating PayPlus payment page:', error);
      throw error;
    }
  }

  /**
   * Create PayPlus payment page for single purchase
   * @param {Object} params - Payment parameters
   * @param {string} params.purchaseId - Purchase ID
   * @param {number} params.amount - Payment amount
   * @param {string} params.userId - User ID
   * @param {string} params.returnUrl - URL to return to after payment
   * @param {string} params.environment - Payment environment
   * @returns {Promise<Object>} Payment page response
   */
  async createPaymentPage({ purchaseId, amount, userId, returnUrl, environment = 'production' }) {
    try {
      clog('Creating PayPlus payment page:', { purchaseId, amount, userId });

      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      // Get frontend origin for callback URLs
      const frontendOrigin = window.location.origin;
      const callbackUrl = `${frontendOrigin}/payment-result`;

      const response = await fetch(`${this.apiBase}/functions/createPayplusPaymentPage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          purchaseId,
          amount,
          userId,
          returnUrl: returnUrl || callbackUrl,
          callbackUrl,
          environment: environment === 'sandbox' ? 'test' : environment, // Map sandbox to test
          frontendOrigin
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create payment page');
      }

      clog('PayPlus payment page created successfully:', data);
      return data;

    } catch (error) {
      cerror('Error creating PayPlus payment page:', error);
      throw error;
    }
  }

  /**
   * Check payment status
   * @param {string} paymentId - Payment/Purchase ID
   * @returns {Promise<Object>} Payment status response
   */
  async checkPaymentStatus(paymentId) {
    try {
      clog('Checking payment status:', paymentId);

      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(`${this.apiBase}/functions/checkPaymentStatus`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ paymentId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check payment status');
      }

      clog('Payment status checked:', data);
      return data;

    } catch (error) {
      cerror('Error checking payment status:', error);
      throw error;
    }
  }

  /**
   * Test PayPlus connection
   * @returns {Promise<Object>} Connection test response
   */
  async testConnection() {
    try {
      clog('Testing PayPlus connection');

      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(`${this.apiBase}/functions/testPayplusConnection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to test PayPlus connection');
      }

      clog('PayPlus connection test result:', data);
      return data;

    } catch (error) {
      cerror('Error testing PayPlus connection:', error);
      throw error;
    }
  }
}

export default new PaymentClient();
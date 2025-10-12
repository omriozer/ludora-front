import { getApiBase } from '@/utils/api';
import { clog, cerror } from '@/lib/utils';

/**
 * Payment API client for PayPlus integration
 */
class PaymentClient {
  constructor() {
    this.apiBase = getApiBase();
  }

  // REMOVED: createCheckoutPaymentPage() - Legacy method replaced by createPaymentIntent()

  // REMOVED: createPaymentPage() - Legacy method replaced by createPaymentIntent()

  // REMOVED: checkPaymentStatus() - Legacy method replaced by checkPaymentIntentStatus()

  /**
   * Create PaymentIntent using new Transaction-centric flow
   * @param {Object} params - Payment parameters
   * @param {Array} params.cartItems - Array of cart items with id and payment_amount
   * @param {string} params.userId - User ID
   * @param {Array} params.appliedCoupons - Applied coupons
   * @param {string} params.environment - Payment environment (production/test)
   * @param {string} params.frontendOrigin - Frontend origin for callbacks
   * @returns {Promise<Object>} PaymentIntent response with transactionId and paymentUrl
   */
  async createPaymentIntent({ cartItems, userId, appliedCoupons = [], environment = 'production', frontendOrigin }) {
    try {
      clog('Creating PaymentIntent:', { cartItems, userId, appliedCoupons, environment });

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(`${this.apiBase}/payments/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          cartItems,
          userId,
          appliedCoupons,
          environment,
          frontendOrigin: frontendOrigin || window.location.origin
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error || data.message || `Server error: ${response.status} ${response.statusText}`;
        throw new Error(errorMessage);
      }

      clog('PaymentIntent created successfully:', data);
      return data;

    } catch (error) {
      cerror('Error creating PaymentIntent:', error);
      throw error;
    }
  }

  /**
   * Check PaymentIntent status using Transaction ID
   * @param {string} transactionId - Transaction ID
   * @returns {Promise<Object>} Payment status response
   */
  async checkPaymentIntentStatus(transactionId) {
    try {
      clog('Checking PaymentIntent status:', transactionId);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(`${this.apiBase}/payments/status/${transactionId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check PaymentIntent status');
      }

      clog('PaymentIntent status checked:', data);
      return data;

    } catch (error) {
      cerror('Error checking PaymentIntent status:', error);
      throw error;
    }
  }

  /**
   * Retry a failed PaymentIntent
   * @param {string} transactionId - Transaction ID
   * @returns {Promise<Object>} Retry response
   */
  async retryPaymentIntent(transactionId) {
    try {
      clog('Retrying PaymentIntent:', transactionId);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(`${this.apiBase}/payments/retry/${transactionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to retry PaymentIntent');
      }

      clog('PaymentIntent retry result:', data);
      return data;

    } catch (error) {
      cerror('Error retrying PaymentIntent:', error);
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

      const token = localStorage.getItem('token');
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
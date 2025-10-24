import { apiRequest } from '@/services/apiClient';
import { clog, cerror } from '@/lib/utils';

/**
 * Payment API client for PayPlus integration
 */
class PaymentClient {
  constructor() {
    // apiRequest handles base URL automatically
  }

  /**
   * Create a new purchase (add item to cart or complete if free)
   * @param {string} purchasableType - Type of item (workshop, course, file, tool, game, subscription)
   * @param {string} purchasableId - ID of the item
   * @param {Object} additionalData - Additional metadata for the purchase
   * @returns {Promise<Object>} Purchase creation response
   */
  async createPurchase(purchasableType, purchasableId, additionalData = {}) {
    try {
      clog('Creating purchase:', { purchasableType, purchasableId, additionalData });

      const data = await apiRequest('/payments/purchases', {
        method: 'POST',
        body: JSON.stringify({
          purchasableType,
          purchasableId,
          additionalData
        })
      });

      clog('Purchase created:', data);
      return {
        success: true,
        ...data
      };

    } catch (error) {
      // Handle special case for subscription update (409 conflict)
      if (error.message.includes('409') || error.message.includes('Subscription already in cart')) {
        clog('Subscription already in cart, can update');
        return {
          success: false,
          canUpdate: true,
          error: error.message
        };
      }

      cerror('Error creating purchase:', error);
      throw error;
    }
  }

  /**
   * Delete a cart item (remove from cart)
   * @param {string} purchaseId - ID of the purchase to delete
   * @returns {Promise<Object>} Deletion response
   */
  async deleteCartItem(purchaseId) {
    try {
      clog('Deleting cart item:', { purchaseId });

      const data = await apiRequest(`/payments/purchases/${purchaseId}`, {
        method: 'DELETE'
      });

      clog('Cart item deleted:', data);
      return {
        success: true,
        ...data
      };

    } catch (error) {
      cerror('Error deleting cart item:', error);
      throw error;
    }
  }

  /**
   * Update cart subscription (change subscription plan)
   * @param {string} purchaseId - ID of the subscription purchase to update
   * @param {string} newSubscriptionPlanId - ID of the new subscription plan
   * @returns {Promise<Object>} Update response
   */
  async updateCartSubscription(purchaseId, newSubscriptionPlanId) {
    try {
      clog('Updating cart subscription:', { purchaseId, newSubscriptionPlanId });

      const data = await apiRequest(`/payments/purchases/${purchaseId}`, {
        method: 'PUT',
        body: JSON.stringify({
          subscriptionPlanId: newSubscriptionPlanId
        })
      });

      clog('Cart subscription updated:', data);
      return {
        success: true,
        ...data
      };

    } catch (error) {
      cerror('Error updating cart subscription:', error);
      throw error;
    }
  }

  /**
   * Test PayPlus connection
   * @returns {Promise<Object>} Connection test response
   */
  async testPayPlusConnection() {
    try {
      clog('Testing PayPlus connection');

      const data = await apiRequest('/functions/testPayplusConnection', {
        method: 'POST'
      });

      clog('PayPlus connection test result:', data);
      return data;

    } catch (error) {
      cerror('Error testing PayPlus connection:', error);
      throw error;
    }
  }
}

export default new PaymentClient();
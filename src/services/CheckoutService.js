import { apiRequest } from './apiClient';
import { ludlog, luderror } from '@/lib/ludlog';

/**
 * CheckoutService - Handles payment method-aware checkout flow
 * Integrates with token capture system for one-click purchasing
 */
class CheckoutService {
  /**
   * Initiates checkout flow with automatic payment method detection
   * @param {Array} cartItems - Items to purchase
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Checkout flow result
   */
  static async initiateCheckout(cartItems, userId) {
    try {
      if (!cartItems || cartItems.length === 0) {
        throw new Error('Cart is empty');
      }

      // Calculate total amount
      const totalAmount = cartItems.reduce((sum, item) => {
        return sum + (parseFloat(item.price) * parseInt(item.quantity || 1));
      }, 0);

      // Check if user has saved payment methods
      const paymentMethodsResponse = await apiRequest('/api/payment-methods/default');

      if (paymentMethodsResponse.has_default && paymentMethodsResponse.payment_method) {
        const defaultMethod = paymentMethodsResponse.payment_method;

        // Check if payment method is expired
        if (defaultMethod.is_expired) {
          return await this.createPayPlusCheckout(cartItems, totalAmount);
        }

        // User HAS saved payment method - show popup INSTEAD of PayPlus page
        return {
          flowType: 'saved_payment_method',
          hasSavedMethod: true,
          paymentMethod: defaultMethod,
          amount: totalAmount,
          cartItems: cartItems,
          requiresPopup: true,
          requiresPaymentPage: false
        };

      } else {
        // User has NO saved payment method - proceed to PayPlus page
        return await this.createPayPlusCheckout(cartItems, totalAmount);
      }

    } catch (error) {
      luderror.payment('❌ Checkout initiation error:', error);
      throw error;
    }
  }

  /**
   * Creates PayPlus payment page checkout flow
   * @param {Array} cartItems - Items to purchase
   * @param {number} totalAmount - Total amount
   * @returns {Promise<Object>} PayPlus checkout result
   */
  static async createPayPlusCheckout(cartItems, totalAmount) {
    try {
      // Create PayPlus payment page
      const paymentPageResponse = await apiRequest('/api/payments/createPayplusPaymentPage', {
        method: 'POST',
        body: JSON.stringify({
          items: cartItems
        })
      });

      return {
        flowType: 'payplus_page',
        hasSavedMethod: false,
        paymentPageUrl: paymentPageResponse.payment_page_link,
        amount: totalAmount,
        cartItems: cartItems,
        requiresPopup: false,
        requiresPaymentPage: true,
        pageRequestUid: paymentPageResponse.page_request_uid,
        transactionId: paymentPageResponse.transaction_id
      };

    } catch (error) {
      luderror.payment('❌ PayPlus checkout creation error:', error);
      throw error;
    }
  }

  /**
   * Charges using saved payment token (one-click purchasing)
   * @param {string} paymentMethodId - Payment method ID
   * @param {Array} cartItems - Items to purchase
   * @returns {Promise<Object>} Charge result
   */
  static async chargeWithSavedMethod(paymentMethodId, cartItems) {
    try {
      const response = await apiRequest('/api/payments/charge-token', {
        method: 'POST',
        body: JSON.stringify({
          payment_method_id: paymentMethodId,
          cart_items: cartItems
        })
      });

      if (response.success) {
        return {
          success: true,
          paymentCompleted: true,
          transactionId: response.transaction_id,
          amount: response.amount,
          currency: response.currency,
          purchases: response.purchases,
          method: 'saved_payment_method'
        };
      } else {
        throw new Error(response.error || 'Payment failed');
      }

    } catch (error) {
      luderror.api('❌ Saved method charge error:', error);

      // Return structured error for better handling
      return {
        success: false,
        error: error.message,
        errorCode: error.code || 'CHARGE_FAILED'
      };
    }
  }

  /**
   * Gets user's saved payment methods
   * @returns {Promise<Array>} Array of payment methods
   */
  static async getUserPaymentMethods() {
    try {
      const response = await apiRequest('/api/payment-methods');
      return response.payment_methods || [];
    } catch (error) {
      luderror.payment('❌ Error fetching payment methods:', error);
      return [];
    }
  }

  /**
   * Sets a payment method as default
   * @param {string} paymentMethodId - Payment method ID
   * @returns {Promise<boolean>} Success status
   */
  static async setDefaultPaymentMethod(paymentMethodId) {
    try {
      const response = await apiRequest(`/api/payment-methods/${paymentMethodId}/set-default`, {
        method: 'PUT'
      });

      return response.success;

    } catch (error) {
      luderror.payment('❌ Error setting default payment method:', error);
      return false;
    }
  }

  /**
   * Deletes a payment method
   * @param {string} paymentMethodId - Payment method ID
   * @returns {Promise<boolean>} Success status
   */
  static async deletePaymentMethod(paymentMethodId) {
    try {
      const response = await apiRequest(`/api/payment-methods/${paymentMethodId}`, {
        method: 'DELETE'
      });

      return response.success;

    } catch (error) {
      luderror.payment('❌ Error deleting payment method:', error);
      return false;
    }
  }

  /**
   * Validates a payment method token
   * @param {string} paymentMethodId - Payment method ID
   * @returns {Promise<Object>} Validation result
   */
  static async validatePaymentMethod(paymentMethodId) {
    try {
      const response = await apiRequest(`/api/payment-methods/${paymentMethodId}/validate`, {
        method: 'POST'
      });

      return response.validation;

    } catch (error) {
      luderror.payment('❌ Error validating payment method:', error);
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Formats cart items for API consumption
   * @param {Array} cartPurchases - Cart purchase objects
   * @returns {Array} Formatted cart items
   */
  static formatCartItemsForCheckout(cartPurchases) {
    return cartPurchases.map(purchase => ({
      purchasable_type: purchase.purchasable_type,
      purchasable_id: purchase.purchasable_id,
      price: purchase.payment_amount,
      quantity: 1, // Ludora typically uses quantity = 1
      metadata: {
        original_price: purchase.original_price,
        discount_amount: purchase.discount_amount,
        coupon_code: purchase.coupon_code,
        purchase_id: purchase.id
      }
    }));
  }
}

export default CheckoutService;
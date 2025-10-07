import { getApiBase } from '@/utils/api';
import { clog, cerror } from '@/lib/utils';

/**
 * Coupon API client for frontend coupon operations
 */
class CouponClient {
  constructor() {
    this.apiBase = getApiBase();
  }

  /**
   * Apply a coupon code to cart items
   * @param {Object} params - Coupon application parameters
   * @param {string} params.couponCode - Coupon code to apply
   * @param {string} params.userId - User ID
   * @param {Array} params.cartItems - Cart items for validation
   * @param {number} params.cartTotal - Total cart amount
   * @returns {Promise<Object>} Coupon application result
   */
  async applyCoupon({ couponCode, userId, cartItems, cartTotal }) {
    try {
      clog('Applying coupon:', { couponCode, userId, cartTotal });

      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(`${this.apiBase}/functions/applyCoupon`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          couponCode,
          userId,
          cartItems,
          purchaseAmount: cartTotal
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to apply coupon');
      }

      clog('Coupon applied successfully:', data);
      return data;

    } catch (error) {
      cerror('Error applying coupon:', error);
      throw error;
    }
  }

  /**
   * Get applicable public coupons for cart auto-suggestion
   * @param {Object} params - Parameters for finding applicable coupons
   * @param {string} params.userId - User ID
   * @param {Array} params.cartItems - Cart items
   * @param {number} params.cartTotal - Total cart amount
   * @returns {Promise<Object>} Applicable coupons result
   */
  async getApplicableCoupons({ userId, cartItems, cartTotal }) {
    try {
      clog('Getting applicable coupons for cart:', { userId, cartTotal });

      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(`${this.apiBase}/functions/getApplicableCoupons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          cartItems,
          cartTotal
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get applicable coupons');
      }

      clog('Applicable coupons retrieved:', data);
      return data;

    } catch (error) {
      cerror('Error getting applicable coupons:', error);
      throw error;
    }
  }

  /**
   * Get the best single coupon for a cart
   * @param {Object} params - Parameters for finding best coupon
   * @param {string} params.userId - User ID
   * @param {Array} params.cartItems - Cart items
   * @param {number} params.cartTotal - Total cart amount
   * @returns {Promise<Object>} Best coupon result
   */
  async getBestCoupon({ userId, cartItems, cartTotal }) {
    try {
      clog('Getting best coupon for cart:', { userId, cartTotal });

      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(`${this.apiBase}/functions/getBestCoupon`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          cartItems,
          cartTotal
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get best coupon');
      }

      clog('Best coupon retrieved:', data);
      return data;

    } catch (error) {
      cerror('Error getting best coupon:', error);
      throw error;
    }
  }

  /**
   * Validate multiple coupons for stacking
   * @param {Object} params - Parameters for validating coupon stacking
   * @param {Array} params.couponCodes - Array of coupon codes
   * @param {string} params.userId - User ID
   * @param {Array} params.cartItems - Cart items
   * @param {number} params.cartTotal - Total cart amount
   * @returns {Promise<Object>} Stacking validation result
   */
  async validateCouponStacking({ couponCodes, userId, cartItems, cartTotal }) {
    try {
      clog('Validating coupon stacking:', { couponCodes, userId, cartTotal });

      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(`${this.apiBase}/functions/validateCouponStacking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          couponCodes,
          userId,
          cartItems,
          cartTotal
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to validate coupon stacking');
      }

      clog('Coupon stacking validated:', data);
      return data;

    } catch (error) {
      cerror('Error validating coupon stacking:', error);
      throw error;
    }
  }

  /**
   * Helper method to prepare cart items for API calls
   * @param {Array} cartItems - Raw cart items from database
   * @returns {Array} Formatted cart items for API
   */
  formatCartItemsForAPI(cartItems) {
    return cartItems.map(item => ({
      id: item.id,
      purchasable_type: item.purchasable_type,
      purchasable_id: item.purchasable_id,
      payment_amount: parseFloat(item.payment_amount || 0)
    }));
  }

  /**
   * Helper method to calculate total from cart items
   * @param {Array} cartItems - Cart items
   * @returns {number} Total amount
   */
  calculateCartTotal(cartItems) {
    return cartItems.reduce((total, item) => {
      return total + parseFloat(item.payment_amount || 0);
    }, 0);
  }
}

export default new CouponClient();
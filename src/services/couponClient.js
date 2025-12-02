import { apiRequest } from '@/services/apiClient';
import { ludlog, luderror } from '@/lib/ludlog';

/**
 * Coupon API client for frontend coupon operations
 */
class CouponClient {

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
      ludlog.payment('Applying coupon:', { data: { couponCode, userId, cartTotal } });

      const data = await apiRequest('/functions/applyCoupon', {
        method: 'POST',
        body: JSON.stringify({
          couponCode,
          userId,
          cartItems,
          purchaseAmount: cartTotal
        }),
      });

      ludlog.api('Coupon applied successfully:', { data: data });
      return data;

    } catch (error) {
      luderror.api('Error applying coupon:', error);
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
      ludlog.payment('Getting applicable coupons for cart:', { data: { userId, cartTotal } });

      const data = await apiRequest('/functions/getApplicableCoupons', {
        method: 'POST',
        body: JSON.stringify({
          userId,
          cartItems,
          cartTotal
        }),
      });

      ludlog.api('Applicable coupons retrieved:', { data: data });
      return data;

    } catch (error) {
      luderror.api('Error getting applicable coupons:', error);
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
      ludlog.payment('Getting best coupon for cart:', { data: { userId, cartTotal } });

      const data = await apiRequest('/functions/getBestCoupon', {
        method: 'POST',
        body: JSON.stringify({
          userId,
          cartItems,
          cartTotal
        }),
      });

      ludlog.api('Best coupon retrieved:', { data: data });
      return data;

    } catch (error) {
      luderror.api('Error getting best coupon:', error);
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
      ludlog.payment('Validating coupon stacking:', { data: { couponCodes, userId, cartTotal } });

      const data = await apiRequest('/functions/validateCouponStacking', {
        method: 'POST',
        body: JSON.stringify({
          couponCodes,
          userId,
          cartItems,
          cartTotal
        }),
      });

      ludlog.api('Coupon stacking validated:', { data: data });
      return data;

    } catch (error) {
      luderror.api('Error validating coupon stacking:', error);
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
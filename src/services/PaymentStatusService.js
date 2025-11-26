import { apiRequest } from '@/services/apiClient';
import { ludlog, luderror } from '@/lib/ludlog';

/**
 * PaymentStatusService - Frontend service for payment status management and polling
 */
class PaymentStatusService {
  constructor() {
    // apiRequest handles base URL automatically
  }

  /**
   * Update transaction status (called from PayPlus iframe events)
   * @param {string} transactionId - Purchase/transaction ID
   * @param {string} newStatus - New status ('pending', 'completed', 'failed')
   * @returns {Promise<Object>} Updated transaction data
   */
  async updateTransactionStatus(transactionId, newStatus) {
    try {
      ludlog.api('Updating transaction status:', { data: { transactionId, newStatus } });

      const data = await apiRequest('/payments/update-status', {
        method: 'POST',
        body: JSON.stringify({
          transaction_id: transactionId,
          status: newStatus
        })
      });

      ludlog.api('Transaction status updated:', { data: data });
      return {
        success: true,
        ...data
      };

    } catch (error) {
      luderror.api('Error updating transaction status:', error);
      throw error;
    }
  }

  /**
   * Poll transaction status from backend (triggers PayPlus API check)
   * @param {string} transactionId - Purchase/transaction ID
   * @returns {Promise<Object>} Current transaction status
   */
  async pollTransactionStatus(transactionId) {
    try {
      ludlog.api('Polling transaction status:', { data: { transactionId } });

      const data = await apiRequest(`/payments/transaction-status/${transactionId}`, {
        method: 'GET'
      });

      ludlog.api('Transaction status polled:', { data: data });
      return data;

    } catch (error) {
      luderror.api('Error polling transaction status:', error);
      throw error;
    }
  }

  /**
   * Check all pending payments for current user
   * @returns {Promise<Object>} Polling results summary
   */
  async checkPendingPayments() {
    try {
      ludlog.payment('Checking pending payments');

      const data = await apiRequest('/payments/check-pending-payments', {
        method: 'POST'
      });

      ludlog.payment('Pending payments checked:', { data: data });
      return {
        success: true,
        ...data
      };

    } catch (error) {
      luderror.payment('Error checking pending payments:', error);
      throw error;
    }
  }

  /**
   * Get detailed transaction information including polling history
   * @param {string} transactionId - Purchase/transaction ID
   * @returns {Promise<Object>} Detailed transaction data
   */
  async getTransactionDetails(transactionId) {
    try {
      ludlog.api('Getting transaction details:', { data: { transactionId } });

      const data = await apiRequest(`/payments/transaction-details/${transactionId}`, {
        method: 'GET'
      });

      ludlog.api('Transaction details retrieved:', { data: data });
      return data;

    } catch (error) {
      luderror.api('Error getting transaction details:', error);
      throw error;
    }
  }
}

export default new PaymentStatusService();
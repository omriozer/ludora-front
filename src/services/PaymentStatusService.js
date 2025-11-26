import { apiRequest } from '@/services/apiClient';
import { clog, cerror } from '@/lib/utils';

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
      clog('Updating transaction status:', { transactionId, newStatus });

      const data = await apiRequest('/payments/update-status', {
        method: 'POST',
        body: JSON.stringify({
          transaction_id: transactionId,
          status: newStatus
        })
      });

      clog('Transaction status updated:', data);
      return {
        success: true,
        ...data
      };

    } catch (error) {
      cerror('Error updating transaction status:', error);
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
      clog('Polling transaction status:', { transactionId });

      const data = await apiRequest(`/payments/transaction-status/${transactionId}`, {
        method: 'GET'
      });

      clog('Transaction status polled:', data);
      return data;

    } catch (error) {
      cerror('Error polling transaction status:', error);
      throw error;
    }
  }

  /**
   * Check all pending payments for current user
   * @returns {Promise<Object>} Polling results summary
   */
  async checkPendingPayments() {
    try {
      clog('Checking pending payments');

      const data = await apiRequest('/payments/check-pending-payments', {
        method: 'POST'
      });

      clog('Pending payments checked:', data);
      return {
        success: true,
        ...data
      };

    } catch (error) {
      cerror('Error checking pending payments:', error);
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
      clog('Getting transaction details:', { transactionId });

      const data = await apiRequest(`/payments/transaction-details/${transactionId}`, {
        method: 'GET'
      });

      clog('Transaction details retrieved:', data);
      return data;

    } catch (error) {
      cerror('Error getting transaction details:', error);
      throw error;
    }
  }
}

export default new PaymentStatusService();
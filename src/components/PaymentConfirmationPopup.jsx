import React, { useState } from 'react';
import { CreditCard, Loader2, X } from 'lucide-react';
import { showError } from '@/utils/messaging';
import { luderror } from '@/lib/ludlog';

/**
 * PaymentConfirmationPopup - Shows confirmation dialog for saved payment methods
 * Part of the token capture system for one-click purchasing
 *
 * @param {Object} paymentMethod - Saved payment method object
 * @param {number} amount - Total amount to charge
 * @param {Function} onConfirm - Called when user confirms payment
 * @param {Function} onUseNewCard - Called when user wants to use different card
 * @param {Function} onCancel - Called when user cancels
 * @param {boolean} isCharging - Whether payment is currently processing
 * @param {string} currency - Currency symbol (default: ש״ח)
 */
const PaymentConfirmationPopup = ({
  paymentMethod,
  amount,
  onConfirm,
  onUseNewCard,
  onCancel,
  isCharging = false,
  currency = 'ש״ח'
}) => {
  const [isConfirming, setIsConfirming] = useState(false);

  if (!paymentMethod) {
    return null;
  }

  const handleConfirm = async () => {
    if (isCharging || isConfirming) return;

    setIsConfirming(true);
    try {
      await onConfirm();
    } catch (error) {
      luderror.payments('Payment confirmation error:', error);
      showError('שגיאה באישור התשלום', 'אנא נסה שוב או צור קשר עם התמיכה');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleUseNewCard = () => {
    if (isCharging || isConfirming) return;
    onUseNewCard();
  };

  const handleCancel = () => {
    if (isCharging || isConfirming) return;
    onCancel();
  };

  // Format amount for display
  const formattedAmount = typeof amount === 'number' ? amount.toFixed(2) : amount;

  // Get card brand display name
  const getCardBrandName = (brand) => {
    const brandNames = {
      'visa': 'ויזה',
      'mastercard': 'מאסטרקארד',
      'amex': 'אמריקן אקספרס',
      'diners': 'דיינרס',
      'discover': 'דיסקבר'
    };
    return brandNames[brand?.toLowerCase()] || brand || 'כרטיס אשראי';
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 text-right overflow-hidden">
        {/* Header */}
        <div className="bg-blue-50 px-6 py-4 border-b border-blue-100">
          <div className="flex items-center justify-between">
            <button
              onClick={handleCancel}
              disabled={isCharging || isConfirming}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-blue-900">אישור תשלום</h3>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Payment confirmation message */}
          <div className="mb-6 text-center">
            <p className="text-lg text-gray-800 mb-2">
              כרטיסך המסתיים בספרות <span className="font-mono font-semibold">{paymentMethod.card_last4}</span> יחוייב בסך{' '}
              <span className="font-semibold text-blue-600">{formattedAmount} {currency}</span>.
            </p>
            <p className="text-base text-gray-600">
              האם לחייב?
            </p>
          </div>

          {/* Card details */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center gap-2">
              <CreditCard className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-700">
                {getCardBrandName(paymentMethod.card_brand)} •••• {paymentMethod.card_last4}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 justify-center">
            {/* Confirm payment button */}
            <button
              onClick={handleConfirm}
              disabled={isCharging || isConfirming}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors duration-200 font-medium
                       flex items-center gap-2 min-w-[140px] justify-center"
            >
              {isCharging || isConfirming ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  מעבד תשלום...
                </>
              ) : (
                'כן, אני מאשר'
              )}
            </button>

            {/* Use different card button */}
            <button
              onClick={handleUseNewCard}
              disabled={isCharging || isConfirming}
              className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors duration-200 font-medium
                       min-w-[140px]"
            >
              לא, השתמש בכרטיס אחר
            </button>
          </div>

          {/* Security note */}
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              התשלום מאובטח ומוגן. ניתן לנהל את אמצעי התשלום שלך בעמוד החשבון.
            </p>
          </div>
        </div>

        {/* Processing overlay */}
        {(isCharging || isConfirming) && (
          <div className="absolute inset-0 bg-white/90 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-gray-700 font-medium">מעבד תשלום...</p>
              <p className="text-sm text-gray-500">אנא המתן, התהליך יכול לקחת מספר שניות</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentConfirmationPopup;
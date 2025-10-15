import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import { cerror } from '@/lib/utils';
import LudoraLoadingSpinner from '@/components/ui/LudoraLoadingSpinner';
import { useLoginModal } from '@/hooks/useLoginModal';
import { useCart } from '@/contexts/CartContext';
import { useProductAccess, getPurchaseActionText } from '@/hooks/useProductAccess';
import {
  getUserIdFromToken,
  isAuthenticated,
  findProductForEntity,
  createPendingPurchase,
  createFreePurchase,
  showPurchaseSuccessToast,
  showPurchaseErrorToast
} from '@/utils/purchaseHelpers';

/**
 * Buy Product Button - Handles purchase initiation only
 * @param {Object} product - Product object
 * @param {string} className - Additional CSS classes
 * @param {string} size - Button size
 * @param {boolean} fullWidth - Whether button should be full width
 * @param {function} onSuccess - Callback after successful purchase
 */
export default function BuyProductButton({
  product,
  className = '',
  size = 'lg',
  fullWidth = false,
  onSuccess
}) {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const { openLoginModal } = useLoginModal();
  const { addToCart } = useCart();

  const {
    canPurchase,
    isFree,
    purchaseAction,
    productType,
    isInCart
  } = useProductAccess(product);

  // Don't render if purchase is not available
  if (!canPurchase) {
    return null;
  }

  const handlePurchase = async (e) => {
    e.stopPropagation(); // Prevent event bubbling to parent card

    if (!product) {
      cerror('No product provided to BuyProductButton');
      return;
    }

    // Check authentication
    if (!isAuthenticated()) {
      openLoginModal(() => handlePurchase());
      return;
    }

    const userId = getUserIdFromToken();
    if (!userId) {
      cerror('Could not get user ID from token');
      return;
    }

    setIsProcessing(true);

    try {
      if (isFree) {
        await handleFreePurchase(userId);
      } else if (isInCart) {
        // Redirect to checkout if already in cart
        navigate('/checkout');
      } else {
        await handlePaidPurchase(userId);
      }
    } catch (error) {
      cerror('Error in purchase flow:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFreePurchase = async (userId) => {
    try {
      const entityType = productType;
      const entityId = product.entity_id || product.id;

      // Get the actual price from Product record if needed
      const productRecord = await findProductForEntity(entityType, entityId);
      const price = productRecord?.price || product.price || 0;

      const purchase = await createFreePurchase({
        entityType,
        entityId,
        price,
        userId,
        metadata: {
          product_title: product.title,
          source: 'BuyProductButton'
        }
      });

      showPurchaseSuccessToast(product.title, true);

      if (onSuccess) {
        onSuccess(purchase);
      }

      // Redirect based on product type
      if (entityType === 'file') {
        navigate(`/product-details?type=${entityType}&id=${entityId}`);
      } else {
        // For other types, reload to show access
        window.location.reload();
      }

    } catch (error) {
      showPurchaseErrorToast(error, 'בקבלת המוצר החינמי');
    }
  };

  const handlePaidPurchase = async (userId) => {
    try {
      const entityType = productType;
      const entityId = product.entity_id || product.id;

      // Find Product record to get price
      const productRecord = await findProductForEntity(entityType, entityId);

      if (!productRecord) {
        throw new Error('לא נמצא מוצר מתאים לרכישה');
      }

      if (!productRecord.price || productRecord.price <= 0) {
        throw new Error('מחיר המוצר לא זמין');
      }

      // Create pending purchase
      await createPendingPurchase({
        entityType,
        entityId,
        price: productRecord.price,
        userId,
        metadata: {
          product_title: product.title,
          source: 'BuyProductButton'
        }
      });

      // Notify cart context
      addToCart();

      // Show success message
      showPurchaseSuccessToast(product.title, false);

      // Redirect to checkout
      navigate('/checkout');

    } catch (error) {
      showPurchaseErrorToast(error, 'ברכישת המוצר');
    }
  };

  const buttonText = getPurchaseActionText(purchaseAction, productType);

  return (
    <Button
      onClick={handlePurchase}
      disabled={isProcessing}
      className={`group relative overflow-hidden bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 hover:from-blue-600 hover:via-indigo-600 hover:to-purple-600 text-white font-bold rounded-full shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 border-2 border-blue-400/20 ${fullWidth ? 'w-full' : ''} ${className}`}
      size={size}
    >
      <span className="relative z-10 flex items-center justify-center gap-2 sm:gap-3">
        {isProcessing ? (
          <LudoraLoadingSpinner
            message="מעבד..."
            status="loading"
            size="sm"
            theme="neon"
            showParticles={false}
          />
        ) : (
          <>
            <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 group-hover:rotate-12 transition-transform duration-300" />
            <span>{buttonText}</span>
          </>
        )}
      </span>
      <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 animate-pulse"></div>
    </Button>
  );
}
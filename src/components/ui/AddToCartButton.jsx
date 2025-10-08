import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { cerror } from '@/lib/utils';
import LudoraLoadingSpinner from '@/components/ui/LudoraLoadingSpinner';
import { useLoginModal } from '@/hooks/useLoginModal';
import { useCart } from '@/contexts/CartContext';
import { useProductAccess } from '@/hooks/useProductAccess';
import {
  getUserIdFromToken,
  isAuthenticated,
  findProductForEntity,
  createPendingPurchase,
  showPurchaseSuccessToast,
  showPurchaseErrorToast
} from '@/utils/purchaseHelpers';

/**
 * Add to Cart Button - Handles adding items to cart only
 * @param {Object} product - Product object
 * @param {string} className - Additional CSS classes
 * @param {string} size - Button size
 * @param {function} onSuccess - Callback after successful addition to cart
 */
export default function AddToCartButton({
  product,
  className = '',
  size = 'md',
  onSuccess
}) {
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const { openLoginModal } = useLoginModal();
  const { addToCart } = useCart();

  const {
    canAddToCart,
    productType,
    isFree
  } = useProductAccess(product);

  // Don't render for free products or if can't add to cart
  if (!canAddToCart || isFree) {
    return null;
  }

  const handleAddToCart = async () => {
    if (!product) {
      cerror('No product provided to AddToCartButton');
      return;
    }

    // Check authentication
    if (!isAuthenticated()) {
      openLoginModal(() => handleAddToCart());
      return;
    }

    const userId = getUserIdFromToken();
    if (!userId) {
      cerror('Could not get user ID from token');
      return;
    }

    setIsAddingToCart(true);

    try {
      const entityType = productType;
      const entityId = product.entity_id || product.id;

      // Find Product record to get price
      const productRecord = await findProductForEntity(entityType, entityId);

      if (!productRecord) {
        throw new Error('לא נמצא מוצר מתאים להוספה לעגלה');
      }

      if (!productRecord.price || productRecord.price <= 0) {
        throw new Error('מחיר המוצר לא זמין');
      }

      // Create pending purchase (add to cart)
      const purchase = await createPendingPurchase({
        entityType,
        entityId,
        price: productRecord.price,
        userId,
        metadata: {
          product_title: product.title,
          source: 'AddToCartButton'
        }
      });

      // Notify cart context
      addToCart();

      // Show success message (but don't redirect)
      showPurchaseSuccessToast(product.title, false);

      if (onSuccess) {
        onSuccess(purchase);
      }

    } catch (error) {
      showPurchaseErrorToast(error, 'בהוספה לעגלה');
    } finally {
      setIsAddingToCart(false);
    }
  };

  return (
    <Button
      onClick={handleAddToCart}
      disabled={isAddingToCart}
      className={`group relative overflow-hidden bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 hover:from-orange-600 hover:via-red-600 hover:to-pink-600 text-white font-bold rounded-full shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 border-2 border-orange-400/20 ${className}`}
      size={size}
      title="הוסף לעגלה"
    >
      <span className="relative z-10 flex items-center justify-center">
        {isAddingToCart ? (
          <LudoraLoadingSpinner
            message=""
            status="loading"
            size="sm"
            theme="neon"
            showParticles={false}
          />
        ) : (
          <Plus className="w-5 h-5 sm:w-6 sm:h-6 group-hover:rotate-180 transition-transform duration-300" />
        )}
      </span>
      <div className="absolute inset-0 bg-gradient-to-r from-red-600 via-pink-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 animate-pulse"></div>
    </Button>
  );
}
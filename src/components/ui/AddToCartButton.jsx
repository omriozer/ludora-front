import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, CheckCircle, ShoppingCart } from 'lucide-react';
import { cerror } from '@/lib/utils';
import LudoraLoadingSpinner from '@/components/ui/LudoraLoadingSpinner';
import { useLoginModal } from '@/hooks/useLoginModal';
import { useCart } from '@/contexts/CartContext';
import { useProductAccess } from '@/hooks/useProductAccess';
import {
  getUserIdFromToken,
  isAuthenticated
} from '@/utils/purchaseHelpers';
import paymentClient from '@/services/paymentClient';
import { toast } from '@/components/ui/use-toast';

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
  const { addToCart, refreshCart } = useCart();

  const {
    canAddToCart,
    productType,
    isFree
  } = useProductAccess(product);

  // Don't render for free products or if can't add to cart
  if (!canAddToCart || isFree) {
    return null;
  }

  const handleAddToCart = async (e) => {
    e.stopPropagation(); // Prevent event bubbling to parent card

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

      console.log('💰 AddToCartButton: Purchase data being sent:', {
        productId: product.id,
        entityType,
        entityId,
        productPrice: product.price,
        productTitle: product.title,
        productType: product.product_type
      });

      // Create purchase using new API
      const result = await paymentClient.createPurchase(entityType, entityId, {
        product_title: product.title,
        product_price: product.price, // Add price to additional data
        product_id: product.id, // Add product ID for backend reference
        source: 'AddToCartButton'
      });

      if (result.success) {
        const { data } = result;
        const isCompleted = data.completed || data.purchase?.payment_status === 'completed';
        const isFreeItem = data.isFree;

        console.log('🛒 AddToCartButton: Analyzing result data:', {
          data,
          isCompleted,
          isFreeItem,
          paymentStatus: data.purchase?.payment_status
        });

        if (isCompleted || isFreeItem) {
          // Free item - completed immediately (shouldn't happen with AddToCartButton but handle it)
          console.log('🛒 AddToCartButton: Taking FREE/COMPLETED path - calling refreshCart()');
          refreshCart(); // Sync state to update ProductActionBar immediately

          toast({
            title: "מוצר התקבל בהצלחה!",
            description: `${product.title} נוסף לספרייה שלך`,
            variant: "default",
          });
        } else {
          // Paid item - added to cart
          console.log('🛒 AddToCartButton: Taking PAID CART path - calling addToCart() and refreshCart()');
          addToCart();
          refreshCart(); // Sync cart state to update ProductActionBar

          toast({
            title: "נוסף לעגלה",
            description: `${product.title} נוסף לעגלת הקניות`,
            variant: "default",
          });
        }

        if (onSuccess) {
          onSuccess(data.purchase);
        }
      } else {
        throw new Error(result.error || 'שגיאה בהוספה לעגלה');
      }

    } catch (error) {
      cerror('Error adding to cart:', error);
      toast({
        title: "שגיאה בהוספה לעגלה",
        description: error.message || "אירעה שגיאה בעת הוספת הפריט לעגלה. אנא נסו שוב.",
        variant: "destructive",
      });
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
      <span className="relative z-10 flex items-center justify-center gap-1">
        {isAddingToCart ? (
          <LudoraLoadingSpinner
            message=""
            status="loading"
            size="sm"
            theme="neon"
            showParticles={false}
          />
        ) : (
          <>
            <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform duration-300" />
            <Plus className="w-3 h-3 sm:w-4 sm:h-4 group-hover:rotate-180 transition-transform duration-300" />
          </>
        )}
      </span>
      <div className="absolute inset-0 bg-gradient-to-r from-red-600 via-pink-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 animate-pulse"></div>
    </Button>
  );
}
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
  showPurchaseSuccessToast,
  showPurchaseErrorToast
} from '@/utils/purchaseHelpers';
import paymentClient from '@/services/paymentClient';
import { toast } from '@/components/ui/use-toast';

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
  const { addToCart, refreshCart } = useCart();

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

    // If already in cart, redirect to checkout
    if (isInCart) {
      navigate('/checkout');
      return;
    }

    setIsProcessing(true);

    try {
      const entityType = productType;
      const entityId = product.entity_id || product.id;

      console.log('💰 BuyProductButton: Purchase data being sent:', {
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
        source: 'BuyProductButton'
      });

      if (result.success) {
        const { data } = result;
        const isCompleted = data.completed || data.purchase?.payment_status === 'completed';
        const isFreeItem = data.isFree;

        if (isCompleted || isFreeItem) {
          // Free item - completed immediately
          console.log('🛒 BuyProductButton: Taking FREE/COMPLETED path - calling refreshCart()');
          refreshCart(); // Sync state to update ProductActionBar immediately

          toast({
            title: "מוצר התקבל בהצלחה!",
            description: `${product.title} נוסף לספרייה שלך`,
            variant: "default",
          });

          if (onSuccess) {
            onSuccess(data.purchase);
          }

          // Redirect based on product type
          if (entityType === 'file') {
            // Use product ID for redirect, not entity ID
            console.log('🛒 BuyProductButton: Redirecting to product details with product ID:', product.id);
            navigate(`/product-details?product=${product.id}`);
          } else {
            // For other types, let the UI update naturally without reload
            // Our event system will handle the UI updates
            console.log('🛒 BuyProductButton: Skipping reload - letting event system handle UI updates');
          }
        } else {
          // Paid item - added to cart
          console.log('🛒 BuyProductButton: Taking PAID CART path - calling addToCart() and refreshCart()');
          addToCart();
          refreshCart(); // Sync cart state to update ProductActionBar

          toast({
            title: "נוסף לעגלה",
            description: `${product.title} נוסף לעגלת הקניות`,
            variant: "default",
          });

          // Redirect to checkout
          navigate('/checkout');
        }
      } else {
        throw new Error(result.error || 'שגיאה ביצירת הרכישה');
      }

    } catch (error) {
      cerror('Error in purchase flow:', error);
      toast({
        title: "שגיאה ברכישה",
        description: error.message || "אירעה שגיאה בעת הרכישה. אנא נסו שוב.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
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
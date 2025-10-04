import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import { cerror } from '@/lib/utils';
import { getProductTypeName } from '@/config/productTypes';
import LudoraLoadingSpinner from '@/components/ui/LudoraLoadingSpinner';
import {
  getUserIdFromToken,
  requireAuthentication,
  isAuthenticated,
  findProductForEntity,
  createPendingPurchase,
  createFreePurchase,
  showPurchaseSuccessToast,
  showPurchaseErrorToast
} from '@/utils/purchaseHelpers';
import { toast } from '@/components/ui/use-toast';
import { useLoginModal } from '@/hooks/useLoginModal';

/**
 * Unified Get Access Button Component
 * Handles both free and paid product access
 * - Free products: Auto-creates purchase and redirects to product details
 * - Paid products: Redirects to purchase page
 * - Shows access status if product is already purchased
 *
 * @param {object} product - The product object (includes purchase if exists)
 * @param {string} className - Additional CSS classes
 * @param {string} size - Button size variant
 * @param {boolean} fullWidth - Whether button should be full width
 * @param {function} onSuccess - Callback after successful free purchase
 */
export default function GetAccessButton({
  product,
  className = '',
  size = 'lg',
  fullWidth = false,
  onSuccess
}) {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const { openLoginModal } = useLoginModal();

  // Check if user already has access
  const hasAccess = product?.purchase && product.purchase.payment_status === 'completed';

  const handleGetAccess = async () => {
    if (!product) {
      cerror('No product provided to GetAccessButton');
      return;
    }

    // Check authentication - open login modal if not logged in
    if (!isAuthenticated()) {
      // Pass the callback to continue after login
      openLoginModal(() => handleGetAccess());
      return;
    }

    const userId = getUserIdFromToken();
    if (!userId) {
      cerror('Could not get user ID from token');
      return;
    }

    if (await isFree()) {
      // Auto-purchase free product
      await handleFreePurchase(userId);
    } else {
      // Create pending purchase and redirect to checkout
      await handlePaidPurchase(userId);
    }
  };

  const isFree = async () => {
    // First check if product has price directly
    if (product.price !== undefined) {
      return !product.price || product.price == 0;
    }

    // If no price on product, find Product record for entity
    try {
      const productRecord = await findProductForEntity(
        product.product_type || 'file',
        product.entity_id || product.id
      );

      return !productRecord?.price || productRecord.price == 0;
    } catch (error) {
      cerror('Error checking if product is free:', error);
      // Default to paid if we can't determine price
      return false;
    }
  };

  const getAccessText = () => {
    const productName = getProductTypeName(product?.product_type, 'singular');

    // For paid products (price checking is now async, so we check product.price if available)
    if (product.price && product.price > 0) {
      return "לרכישת ה" + productName;
    }

    // For free products or unknown price
    switch (product?.product_type) {
      case 'file':
        return 'להורדת ה' + productName;
      case 'course':
        return 'כניסה ל' + productName;
      case 'workshop':
        return 'לצפיה ב' + productName;
      case 'tool':
        return 'לשימוש ב' + productName;
      case 'game':
        return 'ל' + productName;
      default:
        return 'למוצר';
    }
  };

  const handleFreePurchase = async (userId) => {
    setIsProcessing(true);

    try {
      const entityType = product.product_type || 'file';
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
          source: 'GetAccessButton'
        }
      });

      // Show success message
      showPurchaseSuccessToast(product.title, true);

      // Call success callback if provided
      if (onSuccess) {
        onSuccess(purchase);
      }

      // Redirect based on product type
      if (entityType === 'file') {
        navigate(`/product/${product.id}`);
      } else {
        // For other types, reload to show access
        window.location.reload();
      }

    } catch (error) {
      showPurchaseErrorToast(error, 'בקבלת המוצר החינמי');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaidPurchase = async (userId) => {
    setIsProcessing(true);

    try {
      const entityType = product.product_type || 'file';
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
          source: 'GetAccessButton'
        }
      });

      // Show success message
      showPurchaseSuccessToast(product.title, false);

      // Redirect to checkout
      navigate('/checkout');

    } catch (error) {
      showPurchaseErrorToast(error, 'בהוספה לעגלה');
    } finally {
      setIsProcessing(false);
    }
  };

  // If user already has access, show different button
  if (hasAccess) {
    const productType = product.product_type || 'file';
    return (
      <Button
        onClick={() => navigate(`/product-details/${productType}/${product.id}`)}
        className={`group relative overflow-hidden bg-gradient-to-r from-green-500 via-green-600 to-emerald-600 hover:from-green-600 hover:via-emerald-600 hover:to-teal-600 text-white font-bold rounded-full shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 border-2 border-green-400/20 ${fullWidth ? 'w-full' : ''} ${className}`}
        size={size}
      >
        <span className="relative z-10 flex items-center justify-center gap-2 sm:gap-3">
          <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />
          <span>יש לך גישה</span>
        </span>
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 animate-pulse"></div>
      </Button>
    );
  }

  return (
    <Button
      onClick={handleGetAccess}
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
            <span>{getAccessText()}</span>
          </>
        )}
      </span>
      <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 animate-pulse"></div>
    </Button>
  );
}

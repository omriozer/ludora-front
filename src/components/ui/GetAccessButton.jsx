import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Plus } from 'lucide-react';
import { ludlog, luderror } from '@/lib/ludlog';
import { getProductTypeName } from '@/config/productTypes';
import LudoraLoadingSpinner from '@/components/ui/LudoraLoadingSpinner';
import { isBundle, getBundleComposition } from '@/lib/bundleUtils';
import {
  createPendingPurchase,
  createFreePurchase,
  showPurchaseSuccessToast,
  showPurchaseErrorToast,
} from '@/utils/purchaseHelpers';
import { useLoginModal } from '@/hooks/useLoginModal';
import { useCart } from '@/contexts/CartContext';
import { useUser } from '@/contexts/UserContext';
import { useAccessState } from '@/contexts/AccessStateContext';

/**
 * Unified Get Access Button Component
 * Uses embedded access information from backend instead of client-side logic
 *
 * @param {object} product - The product object with embedded access information
 * @param {string} className - Additional CSS classes
 * @param {string} size - Button size variant
 * @param {boolean} fullWidth - Whether button should be full width
 * @param {function} onSuccess - Callback after successful free purchase
 * @param {boolean} withCartButton - Whether to show add to cart button alongside (default: true)
 */
export default function GetAccessButton({
  product,
  className = '',
  size = 'lg',
  fullWidth = false,
  onSuccess,
  withCartButton = true
}) {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const { openLoginModal } = useLoginModal();
  const { addToCart } = useCart();
  const { currentUser, isAuthenticated } = useUser();
  const { getProduct, claimProduct, purchaseProduct } = useAccessState();

  // Get product with embedded access information from AccessStateContext
  // This contains server-computed access flags and UI state
  const productWithAccess = getProduct(product.id) || product;
  const access = productWithAccess.access || {};

  const handleGetAccess = async () => {
    if (!product) {
      luderror.ui('No product provided to GetAccessButton');
      return;
    }

    // Check authentication using UserContext
    if (!isAuthenticated || !currentUser) {
      // Pass the callback to continue after login
      openLoginModal(() => handleGetAccess());
      return;
    }

    // Use server-provided access flags to determine action
    if (access.canClaim) {
      // User can claim via subscription
      await handleClaimProduct();
    } else if (access.showPurchaseButton) {
      // User should purchase the product
      await handlePurchaseProduct();
    } else {
      luderror.ui('No valid access action for product');
    }
  };

  const handleClaimProduct = async () => {
    try {
      setIsProcessing(true);
      const result = await claimProduct(product.product_type, product.id);

      showPurchaseSuccessToast(product.title, true);

      if (onSuccess) {
        onSuccess(result);
      }
    } catch (error) {
      showPurchaseErrorToast(error, 'בתביעת המוצר');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePurchaseProduct = async () => {
    try {
      setIsProcessing(true);

      // For free products, complete purchase immediately
      if (!product.price || product.price === 0) {
        const purchase = await createFreePurchase({
          entityType: product.product_type || 'file',
          entityId: product.entity_id || product.id,
          price: 0,
          userId: currentUser.id,
          metadata: {
            product_title: product.title,
            source: 'GetAccessButton'
          }
        });

        await purchaseProduct(product.id);
        showPurchaseSuccessToast(product.title, true);

        if (onSuccess) {
          onSuccess(purchase);
        }
      } else {
        // For paid products, add to cart and redirect to checkout
        await createPendingPurchase({
          entityType: product.product_type || 'file',
          entityId: product.entity_id || product.id,
          price: product.price,
          userId: currentUser.id,
          metadata: {
            product_title: product.title,
            source: 'GetAccessButton'
          }
        });

        addToCart();
        showPurchaseSuccessToast(product.title, false);
        navigate('/checkout');
      }
    } catch (error) {
      showPurchaseErrorToast(error, 'ברכישת המוצר');
    } finally {
      setIsProcessing(false);
    }
  };

  const getAccessText = () => {
    // Use server-provided access information to determine button text
    if (access.canClaim) {
      if (isBundle(product)) {
        return `תבע קיט ${getBundleComposition(product)}`;
      }
      return `תבע עם מנוי (${access.remainingAllowances || 0} נותרו)`;
    }

    if (access.showPurchaseButton) {
      const productName = getProductTypeName(product?.product_type, 'singular');

      if (isBundle(product)) {
        return `רכישת קיט ${getBundleComposition(product)}`;
      }

      if (!product.price || product.price === 0) {
        // Free product
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
      } else {
        // Paid product
        return "לרכישת ה" + productName;
      }
    }

    return 'למוצר';
  };

  // Use server-provided access flags to determine button visibility and state

  // If user already has access, show access button
  if (access.hasAccess) {
    return (
      <Button
        onClick={() => navigate(`/product-details/${product.product_type}/${product.id}`)}
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

  // Don't show button if access control says not to show it
  if (!access.canClaim && !access.showPurchaseButton) {
    return null;
  }

  // Show appropriate button based on server-provided access flags
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

import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Users, Package } from 'lucide-react';
import { useProductAccess } from '@/hooks/useProductAccess';
import BuyProductButton from '@/components/ui/BuyProductButton';
import AddToCartButton from '@/components/ui/AddToCartButton';
import FileAccessButton from '@/components/ui/FileAccessButton';
import LessonPlanAccessButton from '@/components/ui/LessonPlanAccessButton';
import CourseAccessButton from '@/components/ui/CourseAccessButton';
import WorkshopAccessButton from '@/components/ui/WorkshopAccessButton';
import SubscriptionClaimButton from '@/components/ui/SubscriptionClaimButton';

/**
 * Product Action Bar - Smart container that shows appropriate buttons based on product state
 * @param {Object} product - Product object with purchase data
 * @param {Array} userPurchases - Array of user purchases (optional, for ProductDetails consistency)
 * @param {string} className - Additional CSS classes
 * @param {string} size - Button size
 * @param {boolean} fullWidth - Whether buttons should be full width
 * @param {boolean} showCartButton - Whether to show add to cart button alongside buy button
 * @param {function} onFileAccess - Callback for file access
 * @param {function} onPdfPreview - Callback for PDF preview
 * @param {function} onLessonPlanAccess - Callback for lesson plan access
 * @param {function} onCourseAccess - Callback for course access
 * @param {function} onWorkshopAccess - Callback for workshop access
 * @param {function} onPurchaseSuccess - Callback for successful purchase
 * @param {function} onSubscriptionClaimSuccess - Callback for successful subscription claim
 * @param {boolean} showSubscriptionClaim - Whether to show subscription claim option
 */
export default function ProductActionBar({
  product,
  userPurchases = [],
  className = '',
  size = 'lg',
  fullWidth = false,
  showCartButton = true,
  showSubscriptionClaim = true,
  onFileAccess,
  onPdfPreview,
  onLessonPlanAccess,
  onCourseAccess,
  onWorkshopAccess,
  onPurchaseSuccess,
  onSubscriptionClaimSuccess
}) {
  const navigate = useNavigate();

  const {
    hasAccess,
    isInCart,
    isPurchased,
    canAddToCart,
    canPurchase,
    isFree,
    productType
  } = useProductAccess(product, userPurchases);



  // If user has access, show the appropriate access button
  if (hasAccess) {
    switch (productType) {
      case 'file':
        return (
          <FileAccessButton
            product={product}
            className={className}
            size={size}
            fullWidth={fullWidth}
            onFileAccess={onFileAccess}
            onPdfPreview={onPdfPreview}
          />
        );
      case 'lesson_plan':
        return (
          <LessonPlanAccessButton
            product={product}
            className={className}
            size={size}
            fullWidth={fullWidth}
            onLessonPlanAccess={onLessonPlanAccess}
          />
        );
      case 'course':
        return (
          <CourseAccessButton
            product={product}
            className={className}
            size={size}
            fullWidth={fullWidth}
            onCourseAccess={onCourseAccess}
          />
        );
      case 'workshop':
        return (
          <WorkshopAccessButton
            product={product}
            className={className}
            size={size}
            fullWidth={fullWidth}
            onWorkshopAccess={onWorkshopAccess}
          />
        );
      case 'game':
        return (
          <Button
            onClick={(e) => {
              e.stopPropagation();
              // Navigate to classroom management for this educational activity
              navigate(`/game-lobbies/${product.entity_id || product.id}`);
            }}
            className={`bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 ${fullWidth ? 'w-full' : ''} ${className}`}
            size={size}
          >
            <span className="flex items-center justify-center gap-2 sm:gap-3">
              <Users className="w-5 h-5 sm:w-6 sm:h-6" />
              <span>נהל תלמידים</span>
            </span>
          </Button>
        );
      case 'bundle':
        return (
          <Button
            onClick={(e) => {
              e.stopPropagation();
              // For bundle products, navigate to the catalog filtered by the user's purchases to show their accessible products
              navigate('/catalog?view=my-products');
            }}
            className={`group relative overflow-hidden bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-bold rounded-full shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 border-2 border-purple-400/20 ${fullWidth ? 'w-full' : ''} ${className}`}
            size={size}
          >
            <span className="relative z-10 flex items-center justify-center gap-2 sm:gap-3">
              <Package className="w-5 h-5 sm:w-6 sm:h-6" />
              <span>צפה במוצרים שלך</span>
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 animate-pulse"></div>
          </Button>
        );
      default:
        // Generic access button for other product types
        return (
          <Button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/product-details?type=${productType}&id=${product.entity_id || product.id}`);
            }}
            className={`group relative overflow-hidden bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold rounded-full shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 border-2 border-green-400/20 ${fullWidth ? 'w-full' : ''} ${className}`}
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
  }

  // If user doesn't have access, check for subscription claim option
  if (!hasAccess && showSubscriptionClaim) {
    return (
      <div className={`flex items-center gap-2 ${fullWidth ? 'w-full' : ''}`}>
        <SubscriptionClaimButton
          product={product}
          className={`flex-1 ${className}`}
          size={size}
          fullWidth={!showCartButton}
          onClaimSuccess={onSubscriptionClaimSuccess}
          variant="default"
        />
        {/* Show regular purchase options alongside subscription claim */}
        {canPurchase && !isFree && showCartButton && canAddToCart && (
          <AddToCartButton
            product={product}
            className=""
            size={size}
            onSuccess={onPurchaseSuccess}
          />
        )}
        {canPurchase && (
          <BuyProductButton
            product={product}
            className={showCartButton ? "" : `flex-1 ${className}`}
            size={size}
            fullWidth={!showCartButton}
            onSuccess={onPurchaseSuccess}
            variant="secondary"
          />
        )}
      </div>
    );
  }

  // If item is in cart, show "In Cart" button
  if (isInCart) {
    return (
      <Button
        onClick={(e) => {
          e.stopPropagation();
          navigate('/checkout');
        }}
        className={`group relative overflow-hidden bg-gradient-to-r from-yellow-500 via-yellow-600 to-orange-600 hover:from-yellow-600 hover:via-orange-600 hover:to-red-600 text-white font-bold rounded-full shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 border-2 border-yellow-400/20 ${fullWidth ? 'w-full' : ''} ${className}`}
        size={size}
      >
        <span className="relative z-10 flex items-center justify-center gap-2 sm:gap-3">
          <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />
          <span>בעגלה - לתשלום</span>
        </span>
        <div className="absolute inset-0 bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 animate-pulse"></div>
      </Button>
    );
  }

  // If item is purchased but waiting for confirmation
  if (isPurchased && !hasAccess) {
    return (
      <Button
        disabled
        className={`bg-gradient-to-r from-gray-400 via-gray-500 to-gray-600 text-white font-bold rounded-full shadow-xl border-2 border-gray-300/20 opacity-75 cursor-not-allowed ${fullWidth ? 'w-full' : ''} ${className}`}
        size={size}
      >
        <span className="flex items-center justify-center gap-2 sm:gap-3">
          <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />
          <span>ממתין לאישור תשלום</span>
        </span>
      </Button>
    );
  }

  // For products that can be purchased
  if (canPurchase) {
    // For paid products, show both buy and add to cart buttons
    if (!isFree && showCartButton && canAddToCart) {
      return (
        <div className={`flex items-center gap-2 ${fullWidth ? 'w-full' : ''}`}>
          <BuyProductButton
            product={product}
            className={`flex-1 ${className}`}
            size={size}
            fullWidth={false}
            onSuccess={onPurchaseSuccess}
          />
          <AddToCartButton
            product={product}
            className=""
            size={size}
            onSuccess={onPurchaseSuccess}
          />
        </div>
      );
    }

    // Single buy button (for free products or when cart button is disabled)
    return (
      <BuyProductButton
        product={product}
        className={className}
        size={size}
        fullWidth={fullWidth}
        onSuccess={onPurchaseSuccess}
      />
    );
  }

  // No action available
  return null;
}
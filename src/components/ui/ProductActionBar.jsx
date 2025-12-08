import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Users, Package } from 'lucide-react';
import BuyProductButton from '@/components/ui/BuyProductButton';
import AddToCartButton from '@/components/ui/AddToCartButton';
import FileAccessButton from '@/components/ui/FileAccessButton';
import LessonPlanAccessButton from '@/components/ui/LessonPlanAccessButton';
import CourseAccessButton from '@/components/ui/CourseAccessButton';
import WorkshopAccessButton from '@/components/ui/WorkshopAccessButton';
import SubscriptionClaimButton from '@/components/ui/SubscriptionClaimButton';
import { isBundle, getBundleComposition } from '@/lib/bundleUtils';
import { getProductTypeName } from '@/config/productTypes';
import { getProductAction, shouldShowCartButton } from '@/lib/productAccessUtils';

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
 * @param {function} onBundleAccess - Callback for bundle access
 * @param {function} onPurchaseSuccess - Callback for successful purchase
 * @param {function} onSubscriptionClaimSuccess - Callback for successful subscription claim
 * @param {Object|null} subscriptionEligibility - Pre-computed subscription eligibility data (pass from page level)
 */
export default function ProductActionBar({
  product,
  className = '',
  size = 'lg',
  fullWidth = false,
  showCartButton = true,
  onFileAccess,
  onPdfPreview,
  onLessonPlanAccess,
  onCourseAccess,
  onWorkshopAccess,
  onBundleAccess,
  onPurchaseSuccess,
  onSubscriptionClaimSuccess,
  subscriptionEligibility = null
}) {
  const navigate = useNavigate();

  // UNIFIED SIMPLE LOGIC: Single source of truth from backend
  const productAction = getProductAction(product);
  const productType = product?.product_type || 'file';

  // SIMPLE SWITCH: hasAccess ? access : isFree ? addToLibrary : canClaim ? claim : purchase
  switch (productAction) {
    case 'access':
      // User has access - show type-specific access button
      switch (productType) {
        case 'file':
          // Handle bundle files specially - show bundle navigation instead of file access
          if (isBundle(product)) {
            // Generate dynamic bundle text based on composition
            const getBundleActionText = () => {
              const composition = getBundleComposition(product);
              const compositionTypes = Object.keys(composition);

              if (compositionTypes.length === 1) {
                // Single type bundle: "ערכת קבצים", "ערכת מערכי שיעור", etc.
                const pluralName = getProductTypeName(compositionTypes[0], 'plural');
                return `ערכת ${pluralName}`;
              } else {
                // Mixed type bundle: "ערכת מוצרים"
                return 'ערכת מוצרים';
              }
            };

            return (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  // For bundle products, trigger bundle access callback to show bundle preview modal
                  if (onBundleAccess) {
                    onBundleAccess(product);
                  } else {
                    // Fallback: navigate to the catalog filtered by the user's purchases
                    navigate('/catalog?view=my-products');
                  }
                }}
                className={`group relative overflow-hidden bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-bold rounded-full shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 border-2 border-purple-400/20 ${fullWidth ? 'w-full' : ''} ${className}`}
                size={size}
              >
                <span className="relative z-10 flex items-center justify-center gap-2 sm:gap-3">
                  <Package className="w-5 h-5 sm:w-6 sm:h-6" />
                  <span>{getBundleActionText()}</span>
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 animate-pulse"></div>
              </Button>
            );
          }

          // Regular file access
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

    case 'addToLibrary':
      // Free product - show "Add to Library" button
      return (
        <div className={`flex items-center justify-center ${fullWidth ? 'w-full' : ''}`}>
          <BuyProductButton
            product={product}
            className={className}
            size={size}
            fullWidth={fullWidth}
            onSuccess={onPurchaseSuccess}
            subscriptionEligibility={subscriptionEligibility}
          />
        </div>
      );

    case 'claim':
      // Can claim via subscription - show claim button ONLY
      return (
        <div className={`flex items-center justify-center ${fullWidth ? 'w-full' : ''}`}>
          <SubscriptionClaimButton
            product={product}
            className={className}
            size={size}
            fullWidth={fullWidth}
            onClaimSuccess={onSubscriptionClaimSuccess}
            variant="default"
          />
        </div>
      );

    case 'purchase':
      // Paid product - show purchase button (+ cart if enabled)
      if (showCartButton && shouldShowCartButton(product)) {
        return (
          <div className={`flex items-center gap-2 ${fullWidth ? 'w-full' : ''}`}>
            <BuyProductButton
              product={product}
              className={`flex-1 ${className}`}
              size={size}
              fullWidth={false}
              onSuccess={onPurchaseSuccess}
              subscriptionEligibility={subscriptionEligibility}
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

      // Single buy button when cart is disabled
      return (
        <div className={`flex items-center justify-center ${fullWidth ? 'w-full' : ''}`}>
          <BuyProductButton
            product={product}
            className={className}
            size={size}
            fullWidth={fullWidth}
            onSuccess={onPurchaseSuccess}
            subscriptionEligibility={subscriptionEligibility}
          />
        </div>
      );

    default:
      // No action available (fallback)
      return null;
  }
}
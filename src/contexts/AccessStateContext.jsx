import { createContext, useContext, useState, useCallback } from 'react';
import { apiRequest } from '@/services/apiClient';
import { showSuccess, showError } from '@/utils/messaging';

const AccessStateContext = createContext();

export function AccessStateProvider({ children }) {
  const [userAccessContext, setUserAccessContext] = useState(null);
  const [products, setProducts] = useState({});

  // Recalculate access info for a single product with new context
  const recalculateProductAccess = useCallback((product, newContext) => {
    if (!product || !product.access) return product;

    // This mirrors backend logic for determining canClaim
    const productType = product.product_type;
    const allowances = newContext?.subscriptionAllowances?.allowances;

    if (!allowances || !allowances[productType]) {
      return {
        ...product,
        access: {
          ...product.access,
          canClaim: false,
          remainingAllowances: 0,
          allowanceType: null
        }
      };
    }

    const typeAllowance = allowances[productType];
    const canClaim = !product.access.hasAccess && // Don't show claim if already has access
                     typeAllowance.remaining === 'unlimited' ||
                     (typeof typeAllowance.remaining === 'number' && typeAllowance.remaining > 0);

    return {
      ...product,
      access: {
        ...product.access,
        canClaim,
        remainingAllowances: typeAllowance.remaining,
        allowanceType: {
          productType,
          isLimited: typeAllowance.isLimited,
          allowed: typeAllowance.allowed,
          used: typeAllowance.used,
          remaining: typeAllowance.remaining,
          hasReachedLimit: typeAllowance.hasReachedLimit
        },
        // Update UI button flags based on new state
        showPurchaseButton: !canClaim && !product.access.hasAccess && !product.access.showSubscriptionPrompt,
        showSubscriptionPrompt: !canClaim && !product.access.hasAccess && !typeAllowance.enabled
      }
    };
  }, []);

  // Update user context and recalculate all products
  const updateUserContext = useCallback((newContext) => {
    setUserAccessContext(newContext);

    // Update ALL products to reflect new context
    setProducts(currentProducts => {
      const updatedProducts = {};
      Object.keys(currentProducts).forEach(productId => {
        updatedProducts[productId] = recalculateProductAccess(
          currentProducts[productId],
          newContext
        );
      });
      return updatedProducts;
    });
  }, [recalculateProductAccess]);

  // Initialize or update products in state management
  const setProductsWithContext = useCallback((newProducts) => {
    if (Array.isArray(newProducts)) {
      // Convert array to object keyed by ID
      const productsById = {};
      newProducts.forEach(product => {
        productsById[product.id] = product;
      });
      setProducts(productsById);
    } else {
      // Already an object
      setProducts(newProducts);
    }

    // Extract user context from first product's access info if available
    if (newProducts.length > 0 && newProducts[0].access?.userContext) {
      setUserAccessContext(newProducts[0].access.userContext);
    }
  }, []);

  // Claim a product with optimistic update and real-time sync
  const claimProduct = useCallback(async (productType, productId) => {
    try {
      // Optimistic update - immediately update UI
      if (userAccessContext?.subscriptionAllowances) {
        const currentAllowance = userAccessContext.subscriptionAllowances.allowances[productType];
        if (currentAllowance && currentAllowance.remaining !== 'unlimited') {
          const optimisticContext = {
            ...userAccessContext,
            subscriptionAllowances: {
              ...userAccessContext.subscriptionAllowances,
              allowances: {
                ...userAccessContext.subscriptionAllowances.allowances,
                [productType]: {
                  ...currentAllowance,
                  used: currentAllowance.used + 1,
                  remaining: Math.max(0, currentAllowance.remaining - 1),
                  hasReachedLimit: currentAllowance.remaining - 1 <= 0
                }
              }
            }
          };
          updateUserContext(optimisticContext);
        }
      }

      // Call backend
      const result = await apiRequest('/subscriptions/benefits/claim', {
        method: 'POST',
        body: JSON.stringify({
          productType,
          productId
        })
      });

      // Update with actual backend state
      if (result.updatedContext) {
        updateUserContext(result.updatedContext);
      }

      // Also update the claimed product to show it has access now
      setProducts(currentProducts => ({
        ...currentProducts,
        [productId]: {
          ...currentProducts[productId],
          access: {
            ...currentProducts[productId].access,
            hasAccess: true,
            accessType: 'subscription_claim',
            reason: 'subscription_claim',
            canClaim: false,
            canDownload: true
          }
        }
      }));

      showSuccess('Product claimed successfully!');
      return result;
    } catch (error) {
      console.error('Failed to claim product:', error);

      // Revert optimistic update on error
      if (userAccessContext) {
        updateUserContext(userAccessContext);
      }

      showError(error.message || 'Failed to claim product');
      throw error;
    }
  }, [userAccessContext, updateUserContext]);

  // Purchase a product and update state
  const purchaseProduct = useCallback(async (productId) => {
    // This would be called after successful purchase
    setProducts(currentProducts => ({
      ...currentProducts,
      [productId]: {
        ...currentProducts[productId],
        access: {
          ...currentProducts[productId].access,
          hasAccess: true,
          accessType: 'purchase',
          reason: 'valid_purchase',
          canDownload: true,
          canClaim: false,
          showPurchaseButton: false
        }
      }
    }));
  }, []);

  // Subscribe and update all eligible products
  const updateAfterSubscription = useCallback(async () => {
    // After subscribing, re-fetch user context and update all products
    try {
      // This would typically be called after successful subscription
      // For now, we can trigger a refresh of the products
      window.location.reload(); // Temporary - ideally we'd refresh context
    } catch (error) {
      console.error('Failed to update after subscription:', error);
    }
  }, []);

  const value = {
    // State
    userAccessContext,
    products,

    // State management
    setProducts: setProductsWithContext,
    updateUserContext,

    // Actions
    claimProduct,
    purchaseProduct,
    updateAfterSubscription,

    // Utilities
    getProduct: useCallback((productId) => products[productId], [products])
  };

  return (
    <AccessStateContext.Provider value={value}>
      {children}
    </AccessStateContext.Provider>
  );
}

export const useAccessState = () => {
  const context = useContext(AccessStateContext);
  if (context === undefined) {
    throw new Error('useAccessState must be used within an AccessStateProvider');
  }
  return context;
};

// Convenience hook for individual product access
export const useProductAccess = (productId) => {
  const { products, getProduct } = useAccessState();
  const product = getProduct(productId);
  return product?.access || null;
};
/**
 * EXAMPLE: How to use the optimized subscription system
 *
 * This example shows how to load subscription eligibility once at the page level
 * and pass it to all ProductActionBar components to prevent multiple API calls
 */
import React from 'react';
import { useSubscriptionEligibility } from '@/hooks/useSubscriptionEligibility';
import ProductActionBar from '@/components/ui/ProductActionBar';
import LudoraLoadingSpinner from '@/components/ui/LudoraLoadingSpinner';

export default function CatalogPage() {
  // ✅ CORRECT: Load subscription eligibility ONCE at page level
  const {
    eligibilityData,
    isLoading,
    hasEligibility,
    refetch
  } = useSubscriptionEligibility();

  // Your existing product loading logic
  const [products, setProducts] = useState([]);

  const loadProducts = async () => {
    // Load products from API...
  };

  useEffect(() => {
    loadProducts();
  }, []);

  if (isLoading) {
    return <LudoraLoadingSpinner message="טוען נתוני מנוי..." />;
  }

  return (
    <div className="catalog-page">
      <h1>קטלוג מוצרים</h1>

      <div className="products-grid">
        {products.map(product => (
          <div key={product.id} className="product-card">
            <h3>{product.title}</h3>
            <p>{product.description}</p>

            {/* ✅ CORRECT: Pass subscription eligibility data to avoid API calls */}
            <ProductActionBar
              product={product}
              subscriptionEligibility={eligibilityData}
              onPurchaseSuccess={() => {
                // Optionally refetch subscription data after purchase
                refetch();
              }}
              onSubscriptionClaimSuccess={() => {
                // Refetch subscription data after claim
                refetch();
              }}
            />
          </div>
        ))}
      </div>

      {/* ❌ OLD WAY (DON'T DO THIS):
          Each ProductActionBar would make its own API call
          <ProductActionBar product={product} />
      */}

      {/* ✅ NEW WAY:
          Single API call at page level, data passed to all components
          <ProductActionBar product={product} subscriptionEligibility={eligibilityData} />
      */}
    </div>
  );
}

/*
PERFORMANCE COMPARISON:

❌ Old way (per-component API calls):
- 10 products = 10 API calls to /subscriptions/benefits/my-allowances
- 50 products = 50 API calls (called every time component mounts/hovers)
- Multiple calls on every page navigation

✅ New way (page-level API call):
- 10 products = 1 API call to /subscriptions/benefits/my-allowances
- 50 products = 1 API call
- Single call per page load, cached until navigation/refresh

USAGE PATTERN:
1. Import useSubscriptionEligibility at the top level (CatalogPage, ProductDetails, etc.)
2. Pass eligibilityData to all ProductActionBar components
3. Use refetch() after purchases/claims to update data
4. The system automatically handles teacher-only checks and API failures
*/
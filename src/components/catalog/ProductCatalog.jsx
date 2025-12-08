import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  PRODUCT_TYPES,
  getCatalogConfig,
  getProductTypeFromPath
} from '@/config/productTypes';
import { Card, CardContent } from '@/components/ui/card';
import LudoraLoadingSpinner from '@/components/ui/LudoraLoadingSpinner';
import CatalogHeader from './CatalogHeader';
import CatalogFilters from './CatalogFilters';
import ProductGrid from './ProductGrid';
import EmptyState from './EmptyState';
import useProductCatalog from './hooks/useProductCatalog';
import { useSubscriptionEligibility } from '@/hooks/useSubscriptionEligibility';


/**
 * Unified Product Catalog Component
 * Handles all product types (games, files, workshops, courses, tools) with a single interface
 * Configuration-driven approach using PRODUCT_TYPES catalog settings
 */
export default function ProductCatalog({ productType: propProductType }) {
  const location = useLocation();

  // Determine product type from prop or URL
  const productType = propProductType || getProductTypeFromPath(location.pathname);

  // Get config early - needed for initial state values
  // Use fallback values if config is not available to ensure hooks are always called
  const config = productType ? getCatalogConfig(productType) : null;
  const typeConfig = productType ? PRODUCT_TYPES[productType] : null;

  // State management - MUST be called before any conditional returns (Rules of Hooks)
  const [filters, setFilters] = useState({
    search: '',
    category: 'all',
    grade: 'all',
    subject: 'all',
    audience: 'all',
    gameType: 'all',
    price: 'all',
    publishStatus: 'all',
    skillLevel: 'all',
    sortBy: 'created_at',
    sortOrder: 'DESC'
  });

  // Load data using unified hook - MUST be called before any conditional returns (Rules of Hooks)
  // Pass productType even if invalid - the hook will handle it gracefully
  const {
    products,
    filteredProducts,
    categories,
    currentUser,
    userPurchases,
    settings,
    isLoading,
    error,
    userAnalytics,
    loadData
  } = useProductCatalog(productType || 'game', filters);

  // Load subscription eligibility once at page level to prevent multiple API calls
  const {
    eligibilityData,
    isLoading: isSubscriptionLoading,
    refetch: refetchSubscriptionEligibility
  } = useSubscriptionEligibility();

  // Now we can do conditional returns AFTER all hooks have been called
  if (!productType) {
    return <div>Error: Unknown product type</div>;
  }

  if (!config || !typeConfig) {
    return <div>Error: Invalid product type configuration</div>;
  }

  // Handle filter changes
  const handleFiltersChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  // Clear all filters
  const clearAllFilters = () => {
    setFilters({
      search: '',
      category: 'all',
      grade: 'all',
      subject: 'all',
      audience: 'all',
      gameType: 'all',
      price: 'all',
      publishStatus: 'all',
      skillLevel: 'all',
      sortBy: 'created_at',
      sortOrder: 'DESC'
    });
  };

  // Loading state - include subscription loading
  if (isLoading || isSubscriptionLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30 flex items-center justify-center">
        <LudoraLoadingSpinner
          message={isSubscriptionLoading ? "טוען נתוני מנוי..." : config.loadingMessage}
          size="lg"
        />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center shadow-xl">
          <CardContent className="p-8">
            <div className="text-red-600 text-xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">שגיאה בטעינת הנתונים</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={loadData}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              נסה שוב
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render catalog
  return (
    <div
      className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30 mobile-no-scroll-x mobile-safe-container"
      dir="rtl"
    >
      <div className="max-w-7xl mx-auto mobile-padding-x py-4 md:py-8 mobile-safe-container">
        {/* Header with title, analytics (if applicable) */}
        <CatalogHeader
          config={config}
          typeConfig={typeConfig}
          currentUser={currentUser}
          userAnalytics={userAnalytics}
          productCount={filteredProducts.length}
          totalCount={products.length}
        />

        {/* Filters */}
        <CatalogFilters
          config={config}
          typeConfig={typeConfig}
          filters={filters}
          categories={categories}
          settings={settings}
          onFiltersChange={handleFiltersChange}
          onClearFilters={clearAllFilters}
          currentUser={currentUser}
        />

        {/* Content */}
        <CatalogContent
          products={filteredProducts}
          config={config}
          typeConfig={typeConfig}
          currentUser={currentUser}
          userPurchases={userPurchases}
          settings={settings}
          onClearFilters={clearAllFilters}
          subscriptionEligibility={eligibilityData}
          onSubscriptionSuccess={refetchSubscriptionEligibility}
        />
      </div>
    </div>
  );
}

/**
 * Catalog Content Component
 * Renders the main product grid or empty state
 */
function CatalogContent({
  products,
  config,
  typeConfig,
  currentUser,
  userPurchases,
  onClearFilters,
  subscriptionEligibility,
  onSubscriptionSuccess
}) {
  if (products.length === 0) {
    return (
      <EmptyState
        config={config}
        typeConfig={typeConfig}
        onClearFilters={onClearFilters}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <ProductGrid
        products={products}
        config={config}
        currentUser={currentUser}
        userPurchases={userPurchases}
        subscriptionEligibility={subscriptionEligibility}
        onSubscriptionSuccess={onSubscriptionSuccess}
      />
    </motion.div>
  );
}
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  PRODUCT_TYPES,
  getCatalogConfig,
  getProductTypeFromPath,
  getProductTypeName
} from '@/config/productTypes';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LudoraLoadingSpinner from '@/components/ui/LudoraLoadingSpinner';
import CatalogHeader from './CatalogHeader';
import CatalogFilters from './CatalogFilters';
import ProductGrid from './ProductGrid';
import EmptyState from './EmptyState';
import useProductCatalog from './hooks/useProductCatalog';
import { useSubscriptionEligibility } from '@/hooks/useSubscriptionEligibility';

// Helper function to convert Tailwind color format to CSS gradient (defined outside component)
const getGradientStyle = (colorString) => {
  if (!colorString) return {};

  try {
    // Parse "from-blue-500 to-blue-600" format
    const parts = colorString.split(' ');
    if (parts.length >= 3) {
      const fromColor = parts[0].replace('from-', '');
      const toColor = parts[2].replace('to-', '');
      // Convert Tailwind color names to CSS colors
      const colorMap = {
        'blue-500': '#3B82F6',
        'blue-600': '#2563EB',
        'green-500': '#10B981',
        'green-600': '#059669',
        'purple-500': '#8B5CF6',
        'purple-600': '#7C3AED',
        'pink-500': '#EC4899',
        'red-600': '#DC2626'
      };

      const from = colorMap[fromColor] || '#3B82F6';
      const to = colorMap[toColor] || '#2563EB';

      return {
        background: `linear-gradient(to right, ${from}, ${to})`
      };
    }
  } catch (error) {
    // Silently fail for gradient parsing - use default styles
  }

  return {};
};

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
  const [activeTab, setActiveTab] = useState(config?.tabs?.[0]?.key || 'all');
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
  } = useProductCatalog(productType || 'game', filters, activeTab);

  // Load subscription eligibility once at page level to prevent multiple API calls
  const {
    eligibilityData,
    isLoading: isSubscriptionLoading,
    hasEligibility,
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

        {/* Content with optional tabs */}
        {config.showTabs ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-8 mobile-safe-container">
            <div className="flex justify-center mobile-safe-container">
              <TabsList className="grid grid-cols-2 bg-white/80 backdrop-blur-xl rounded-xl md:rounded-2xl p-1.5 md:p-2 shadow-lg border border-white/20 h-12 md:h-16 w-full max-w-md mobile-safe-container">
                {config.tabs.map((tab) => (
                  <TabsTrigger
                    key={tab.key}
                    value={tab.key}
                    className="flex items-center mobile-gap rounded-lg md:rounded-xl py-2 md:py-4 px-3 md:px-6 text-sm md:text-base font-bold data-[state=active]:bg-gradient-to-r data-[state=active]:shadow-lg transition-all duration-300 mobile-safe-text"
                    style={getGradientStyle(typeConfig.color)}
                  >
                    <span className="mobile-truncate">{tab.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {config.tabs.map((tab) => (
              <TabsContent key={tab.key} value={tab.key}>
                <CatalogContent
                  products={filteredProducts}
                  config={config}
                  typeConfig={typeConfig}
                  currentUser={currentUser}
                  userPurchases={userPurchases}
                  settings={settings}
                  activeTab={activeTab}
                  onClearFilters={clearAllFilters}
                  subscriptionEligibility={eligibilityData}
                  onSubscriptionSuccess={refetchSubscriptionEligibility}
                />
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <CatalogContent
            products={filteredProducts}
            config={config}
            typeConfig={typeConfig}
            currentUser={currentUser}
            userPurchases={userPurchases}
            settings={settings}
            activeTab="all"
            onClearFilters={clearAllFilters}
            subscriptionEligibility={eligibilityData}
            onSubscriptionSuccess={refetchSubscriptionEligibility}
          />
        )}
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
  settings,
  activeTab,
  onClearFilters,
  subscriptionEligibility,
  onSubscriptionSuccess
}) {
  if (products.length === 0) {
    return (
      <EmptyState
        config={config}
        typeConfig={typeConfig}
        activeTab={activeTab}
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
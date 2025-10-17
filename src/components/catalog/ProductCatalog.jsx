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

/**
 * Unified Product Catalog Component
 * Handles all product types (games, files, workshops, courses, tools) with a single interface
 * Configuration-driven approach using PRODUCT_TYPES catalog settings
 */
export default function ProductCatalog({ productType: propProductType }) {
  const location = useLocation();

  // Determine product type from prop or URL
  const productType = propProductType || getProductTypeFromPath(location.pathname);

  // Helper function to convert Tailwind color format to CSS gradient
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
      console.warn('Error parsing gradient color:', colorString);
    }

    return {};
  };

  if (!productType) {
    console.error('ProductCatalog: Unable to determine product type from props or URL');
    return <div>Error: Unknown product type</div>;
  }

  const config = getCatalogConfig(productType);
  const typeConfig = PRODUCT_TYPES[productType];

  if (!config || !typeConfig) {
    console.error(`ProductCatalog: No configuration found for product type: ${productType}`);
    return <div>Error: Invalid product type configuration</div>;
  }

  // State management
  const [activeTab, setActiveTab] = useState(config.tabs?.[0]?.key || 'all');
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

  // Load data using unified hook
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
  } = useProductCatalog(productType, filters, activeTab);

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

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30 flex items-center justify-center">
        <LudoraLoadingSpinner
          message={config.loadingMessage}
          size="lg"
          theme="creative"
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
      className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30"
      dir="rtl"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <div className="flex justify-center">
              <TabsList className="grid grid-cols-2 bg-white/80 backdrop-blur-xl rounded-2xl p-2 shadow-lg border border-white/20 h-16">
                {config.tabs.map((tab) => (
                  <TabsTrigger
                    key={tab.key}
                    value={tab.key}
                    className="flex items-center gap-3 rounded-xl py-4 px-6 text-base font-bold data-[state=active]:bg-gradient-to-r data-[state=active]:shadow-lg transition-all duration-300"
                    style={getGradientStyle(typeConfig.color)}
                  >
                    <span>{tab.label}</span>
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
  onClearFilters
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
      />
    </motion.div>
  );
}
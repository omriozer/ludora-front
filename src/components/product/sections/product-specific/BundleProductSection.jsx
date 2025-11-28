import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Package,
  Plus,
  X,
  Search,
  AlertCircle,
  Trash2,
  Info
} from 'lucide-react';
import { ProductAPI } from '@/services/apiClient';
import { getProductTypeName, PRODUCT_TYPES } from '@/config/productTypes';
import { ludlog, luderror } from '@/lib/ludlog';
import {
  getBundleComposition,
  getBundleCompositionLabel,
  validateBundleItems,
  isBundleable
} from '@/lib/bundleUtils';
import KitBadge from '@/components/ui/KitBadge';

/**
 * BundleProductSection - Bundle composition interface
 *
 * Manages the bundle_items JSONB field for bundle products.
 * Includes:
 * - Product search and selection
 * - Bundle composition summary
 * - Item management (add/remove)
 */
export default function BundleProductSection({
  formData,
  updateFormData,
  editingProduct,
  isFieldValid,
  getFieldError
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedType, setSelectedType] = useState('all');
  const [bundleItems, setBundleItems] = useState(formData.bundle_items || []);

  // Sync bundle items with form data
  // Note: bundleItems intentionally excluded from dependency array to prevent infinite loop
  // We only want to sync when formData.bundle_items changes, not when bundleItems changes
  useEffect(() => {
    if (formData.bundle_items !== bundleItems) {
      setBundleItems(formData.bundle_items || []);
    }
  }, [formData.bundle_items]);

  // Search for products to add to bundle
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      ludlog.ui('Searching for products to add to bundle:', { query: searchQuery, type: selectedType });

      // Build search filters
      const filters = {
        search: searchQuery,
        is_published: true, // Only show published products
        limit: 20
      };

      // Filter by product type if not "all"
      if (selectedType !== 'all') {
        filters.product_type = selectedType;
      }

      // Fetch products
      const results = await ProductAPI.find(filters);

      // Filter out non-bundleable products and current bundle itself
      const bundleableResults = results.filter(product => {
        // Exclude current bundle (can't bundle itself)
        if (editingProduct && product.id === editingProduct.id) {
          return false;
        }

        // Exclude non-bundleable types
        if (!isBundleable(product.product_type)) {
          return false;
        }

        // Exclude items already in bundle
        const alreadyInBundle = bundleItems.some(
          item => item.product_id === product.id && item.product_type === product.product_type
        );

        return !alreadyInBundle;
      });

      setSearchResults(bundleableResults);
      ludlog.ui('Product search results:', { count: bundleableResults.length });
    } catch (error) {
      luderror.ui('Failed to search products:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Add product to bundle
  const handleAddProduct = (product) => {
    const newItem = {
      product_type: product.product_type,
      product_id: product.id,
      // Store additional metadata for display
      _metadata: {
        title: product.title,
        price: product.price,
        has_image: product.has_image
      }
    };

    const updatedItems = [...bundleItems, newItem];
    setBundleItems(updatedItems);
    updateFormData({ bundle_items: updatedItems });

    // Remove from search results
    setSearchResults(searchResults.filter(p => p.id !== product.id));

    ludlog.ui('Added product to bundle:', { productId: product.id, count: updatedItems.length });
  };

  // Remove product from bundle
  const handleRemoveProduct = (index) => {
    const updatedItems = bundleItems.filter((_, i) => i !== index);
    setBundleItems(updatedItems);
    updateFormData({ bundle_items: updatedItems });

    ludlog.ui('Removed product from bundle:', { index, count: updatedItems.length });
  };

  // Validate bundle items
  const validation = validateBundleItems(bundleItems);

  // Calculate composition summary
  const composition = getBundleComposition({ bundle_items: bundleItems });
  const compositionLabel = getBundleCompositionLabel(composition);

  return (
    <div className="space-y-6">
      {/* Bundle Composition Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            סיכום הקיט
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
              <div className="flex items-center gap-3">
                <Package className="w-6 h-6 text-purple-600" />
                <div>
                  <p className="text-sm font-medium text-gray-700">מספר פריטים בקיט</p>
                  <p className="text-2xl font-bold text-purple-600">{bundleItems.length}</p>
                </div>
              </div>
              {bundleItems.length > 0 && (
                <KitBadge
                  product={{ product_type: 'bundle', bundle_items: bundleItems }}
                  variant="full"
                  size="lg"
                />
              )}
            </div>

            {/* Composition Breakdown */}
            {bundleItems.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(composition).map(([type, count]) => {
                  const typeConfig = PRODUCT_TYPES[type];
                  const Icon = typeConfig?.icon;

                  return (
                    <div
                      key={type}
                      className="flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-lg"
                    >
                      {Icon && <Icon className="w-4 h-4 text-gray-600" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500 truncate">
                          {getProductTypeName(type, 'plural')}
                        </p>
                        <p className="text-lg font-semibold text-gray-900">{count}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Empty State */}
            {bundleItems.length === 0 && (
              <div className="text-center py-8 px-4 bg-gray-50 border border-dashed border-gray-300 rounded-lg">
                <Package className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                <p className="text-sm text-gray-600 mb-1">הקיט ריק</p>
                <p className="text-xs text-gray-500">השתמש בחיפוש למטה כדי להוסיף מוצרים לקיט</p>
              </div>
            )}

            {/* Validation Errors */}
            {!validation.valid && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{validation.error}</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Product Search & Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            הוספת מוצרים לקיט
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search Controls */}
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="חפש מוצר לפי שם..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch();
                    }
                  }}
                  className="w-full"
                />
              </div>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">כל הסוגים</option>
                {Object.entries(PRODUCT_TYPES)
                  .filter(([key]) => isBundleable(key))
                  .map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.plural}
                    </option>
                  ))}
              </select>
              <Button
                onClick={handleSearch}
                disabled={isSearching || !searchQuery.trim()}
              >
                {isSearching ? 'מחפש...' : 'חפש'}
              </Button>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                <Label className="text-sm font-medium text-gray-700">
                  תוצאות חיפוש ({searchResults.length})
                </Label>
                {searchResults.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-purple-300 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{product.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">
                          {getProductTypeName(product.product_type, 'singular')}
                        </span>
                        {product.price > 0 && (
                          <>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs font-medium text-green-600">
                              ₪{product.price}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleAddProduct(product)}
                      className="flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      הוסף
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* No Results Message */}
            {searchQuery && !isSearching && searchResults.length === 0 && (
              <div className="text-center py-6 text-gray-500">
                <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">לא נמצאו מוצרים התואמים את החיפוש</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Current Bundle Items */}
      {bundleItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              מוצרים בקיט ({bundleItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {bundleItems.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {item._metadata?.title || `מוצר ${item.product_id}`}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">
                        {getProductTypeName(item.product_type, 'singular')}
                      </span>
                      {item._metadata?.price > 0 && (
                        <>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs font-medium text-green-600">
                            ₪{item._metadata.price}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleRemoveProduct(index)}
                    className="flex items-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" />
                    הסר
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

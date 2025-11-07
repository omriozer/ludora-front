import React, { useState, useEffect, useCallback } from "react";
import { Purchase, Workshop, Course, File, Tool } from "@/services/entities";
import { getProductTypeName } from "@/config/productTypes";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Global cache for purchases data per user (shared with useProductCatalog)
let purchasesCache = new Map(); // Map: userId -> { purchases, timestamp }
const PURCHASES_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Global cache for entity data to prevent duplicate API calls
let entitiesCache = new Map(); // Map: "type:id" -> { entity, timestamp }
const ENTITIES_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Helper function to clear purchases cache
export const clearPurchaseHistoryCache = (userId = null) => {
  if (userId) {
    purchasesCache.delete(userId);
  } else {
    purchasesCache.clear();
  }
};

// Helper function to clear entities cache
export const clearEntitiesCache = () => {
  entitiesCache.clear();
};
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Calendar,
  CreditCard,
  ShoppingBag,
  ArrowUpDown,
  ExternalLink
} from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import ProductActionBar from "@/components/ui/ProductActionBar";
import { useProductActions } from "@/hooks/useProductActions";
import PdfViewer from "@/components/pdf/PdfViewer";
import { clog, cerror } from "@/lib/utils";

const PurchaseHistory = ({
  user,
  title = "היסטוריית רכישות",
  showHeader = true,
  className = "",
  onFileAccess,
  onPdfPreview,
  onCourseAccess,
  onWorkshopAccess,
  onViewDetails
}) => {
  // State management
  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState([]);
  const [filteredPurchases, setFilteredPurchases] = useState([]);
  const [sortField, setSortField] = useState('created_date');
  const [sortDirection, setSortDirection] = useState('desc');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // PDF viewer state
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  // Product actions hook
  const {
    handleFileAccess: defaultHandleFileAccess,
    handlePdfPreview: defaultHandlePdfPreview,
    handleCourseAccess: defaultHandleCourseAccess,
    handleWorkshopAccess: defaultHandleWorkshopAccess,
    handleViewDetails: defaultHandleViewDetails
  } = useProductActions();

  // Use provided handlers or fallback to defaults
  const finalHandleFileAccess = onFileAccess || defaultHandleFileAccess;
  const finalHandlePdfPreview = onPdfPreview || defaultHandlePdfPreview;
  const finalHandleCourseAccess = onCourseAccess || defaultHandleCourseAccess;
  const finalHandleWorkshopAccess = onWorkshopAccess || defaultHandleWorkshopAccess;
  const finalHandleViewDetails = onViewDetails || defaultHandleViewDetails;

  // Helper function to load entity by type and id with caching
  const loadEntityById = async (type, id) => {
    try {
      const cacheKey = `${type}:${id}`;
      const now = Date.now();
      const cachedEntry = entitiesCache.get(cacheKey);
      const isCacheValid = cachedEntry && (now - cachedEntry.timestamp < ENTITIES_CACHE_DURATION);

      if (isCacheValid) {
        clog('✅ Using cached entity data:', cacheKey);
        return cachedEntry.entity;
      }

      clog('🔄 Loading entity from API (cache miss/expired):', cacheKey);

      let entity;
      switch (type) {
        case 'workshop':
          const workshops = await Workshop.filter({ id });
          entity = workshops.length > 0 ? workshops[0] : null;
          break;
        case 'course':
          const courses = await Course.filter({ id });
          entity = courses.length > 0 ? courses[0] : null;
          break;
        case 'file':
          const files = await File.filter({ id });
          entity = files.length > 0 ? files[0] : null;
          break;
        case 'tool':
          const tools = await Tool.filter({ id });
          entity = tools.length > 0 ? tools[0] : null;
          break;
        default:
          entity = null;
      }

      // Add entity type for UI rendering
      if (entity) {
        entity.entity_type = type;

        // Cache the entity
        entitiesCache.set(cacheKey, {
          entity,
          timestamp: now
        });
        clog('✅ Entity data cached:', cacheKey);
      }

      return entity;
    } catch (error) {
      cerror(`Error loading ${type} ${id}:`, error);
      return null;
    }
  };

  const loadPurchases = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      clog('[PurchaseHistory] Loading purchases for user:', user.id);

      // Check if we have cached purchases data for this user
      const userId = user.id;
      const now = Date.now();
      const userCacheEntry = purchasesCache.get(userId);
      const isCacheValid = userCacheEntry && (now - userCacheEntry.timestamp < PURCHASES_CACHE_DURATION);

      let userPurchases;

      clog('🔍 PurchaseHistory cache check:', {
        userId,
        hasCacheEntry: !!userCacheEntry,
        cacheAge: userCacheEntry ? (now - userCacheEntry.timestamp) / 1000 : 'N/A',
        cacheDurationSeconds: PURCHASES_CACHE_DURATION / 1000,
        isCacheValid,
        totalCacheEntries: purchasesCache.size
      });

      if (isCacheValid) {
        clog('✅ Using cached purchases data for PurchaseHistory user', userId);
        userPurchases = userCacheEntry.purchases;
      } else {
        const reason = !userCacheEntry ? 'no cache entry' : 'cache expired';
        clog('🔄 Loading purchases data for PurchaseHistory user (cache miss/expired):', userId, `(${reason})`);

        // Load purchases using buyer_user_id with ordered results
        userPurchases = await Purchase.filter({ buyer_user_id: user.id }, { order: [['created_at', 'DESC']] });

        // Update cache
        purchasesCache.set(userId, {
          purchases: userPurchases,
          timestamp: now
        });
        clog('✅ PurchaseHistory purchases data cached for user', userId);
      }
      setPurchases(userPurchases);

      // Load entities for the purchases (handle both new polymorphic and legacy structures)
      const entitiesData = await Promise.all(
        userPurchases.map(async purchase => {
          try {
            // Try new polymorphic structure first
            if (purchase.purchasable_type && purchase.purchasable_id) {
              return await loadEntityById(purchase.purchasable_type, purchase.purchasable_id);
            }
            // Fall back to legacy product_id (assume workshop for backwards compatibility)
            else if (purchase.product_id) {
              return await loadEntityById('workshop', purchase.product_id);
            }
            return null;
          } catch (error) {
            cerror(`Error loading entity for purchase ${purchase.id}:`, error);
            return null;
          }
        })
      );
      setProducts(entitiesData.filter(Boolean));
    } catch (error) {
      cerror("Error loading purchases:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const filterAndSortPurchases = useCallback(() => {
    let filtered = [...purchases];

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(purchase => purchase.payment_status === statusFilter);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(purchase => {
        // Use polymorphic structure to find product
        const entityId = purchase.purchasable_id || purchase.product_id;
        const product = products.find(p => p.id === entityId);
        return (
          purchase.metadata?.transaction_uid?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          purchase.buyer_name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue, bValue;

      switch (sortField) {
        case 'created_date':
          aValue = new Date(a.created_at || a.created_date);
          bValue = new Date(b.created_at || b.created_date);
          break;
        case 'payment_amount':
          aValue = a.payment_amount || 0;
          bValue = b.payment_amount || 0;
          break;
        case 'product_name':
          const entityIdA = a.purchasable_id || a.product_id;
          const entityIdB = b.purchasable_id || b.product_id;
          const productA = products.find(p => p.id === entityIdA);
          const productB = products.find(p => p.id === entityIdB);
          aValue = productA?.title || '';
          bValue = productB?.title || '';
          break;
        case 'payment_status':
          aValue = a.payment_status || '';
          bValue = b.payment_status || '';
          break;
        case 'transaction_uid':
          aValue = a.metadata?.transaction_uid || a.id || '';
          bValue = b.metadata?.transaction_uid || b.id || '';
          break;
        default:
          aValue = a[sortField] || '';
          bValue = b[sortField] || '';
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredPurchases(filtered);
  }, [purchases, products, sortField, sortDirection, statusFilter, searchTerm]);

  useEffect(() => {
    if (user) {
      loadPurchases();
    }
  }, [user, loadPurchases]);

  useEffect(() => {
    filterAndSortPurchases();
  }, [filterAndSortPurchases]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Enhanced product access handlers that work with PDF viewer
  const handleFileAccessWithModal = async (file) => {
    setSelectedFile(file);
    await finalHandleFileAccess(file, { setPdfViewerOpen });
  };

  const handlePdfPreviewWithModal = (file) => {
    setSelectedFile(file);
    finalHandlePdfPreview({ setPdfViewerOpen });
  };

  // Helper function to build product object with purchase info for ProductActionBar
  const buildProductForActionBar = (purchase) => {
    const entityId = purchase.purchasable_id || purchase.product_id;
    const product = products.find(p => p.id === entityId);
    if (!product) return null;

    return {
      ...product,
      purchase: {
        ...purchase,
        payment_status: purchase.payment_status,
        access_expires_at: purchase.access_expires_at
      }
    };
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid':
      case 'completed':
      case 'success':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'pending':
      case 'cart':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'refunded':
      case 'failed':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'cancelled':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'paid':
      case 'completed':
      case 'success':
        return 'הושלם';
      case 'pending':
        return 'ממתין';
      case 'cart':
        return 'בעגלה';
      case 'refunded':
        return 'הוחזר';
      case 'failed':
        return 'נכשל';
      case 'cancelled':
        return 'בוטל';
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <div className={`${className}`}>
        {showHeader && (
          <Card className="shadow-lg sm:shadow-xl border-0 bg-white/80 backdrop-blur-sm rounded-lg sm:rounded-xl lg:rounded-2xl overflow-hidden mx-1 sm:mx-0">
            <CardHeader className="bg-gradient-to-r from-green-500 to-teal-600 text-white p-3 sm:p-4 lg:p-6">
              <CardTitle className="flex items-center gap-2 sm:gap-3">
                <div className="w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-white/20 rounded-md sm:rounded-lg flex items-center justify-center flex-shrink-0">
                  <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
                </div>
                <span className="text-base sm:text-lg lg:text-xl font-medium">{title}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">טוען היסטוריית רכישות...</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <>
      <div className={`${className}`}>
        <Card className="shadow-lg sm:shadow-xl border-0 bg-white/80 backdrop-blur-sm rounded-lg sm:rounded-xl lg:rounded-2xl overflow-hidden mx-1 sm:mx-0">
          {showHeader && (
            <CardHeader className="bg-gradient-to-r from-green-500 to-teal-600 text-white p-3 sm:p-4 lg:p-6">
              <CardTitle className="flex items-center gap-2 sm:gap-3">
                <div className="w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-white/20 rounded-md sm:rounded-lg flex items-center justify-center flex-shrink-0">
                  <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
                </div>
                <span className="text-base sm:text-lg lg:text-xl font-medium">{title}</span>
              </CardTitle>
            </CardHeader>
          )}
          <CardContent className="p-0">
            {/* Filters and Search - Mobile First */}
            <div className="p-3 sm:p-4 lg:p-6 border-b bg-white/60">
              <div className="flex flex-col gap-3 sm:gap-4">
                <div className="w-full">
                  <Input
                    placeholder="חיפוש לפי מספר עסקה או שם מוצר..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full text-xs sm:text-sm h-9 sm:h-10"
                  />
                </div>
                <div className="w-full sm:w-auto">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-40 text-xs sm:text-sm h-9 sm:h-10">
                      <SelectValue placeholder="סטטוס" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">הכל</SelectItem>
                      <SelectItem value="completed">הושלם</SelectItem>
                      <SelectItem value="paid">שולם</SelectItem>
                      <SelectItem value="pending">ממתין</SelectItem>
                      <SelectItem value="cart">בעגלה</SelectItem>
                      <SelectItem value="failed">נכשל</SelectItem>
                      <SelectItem value="refunded">הוחזר</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Purchase History - Mobile First Cards + Desktop Table */}
            {filteredPurchases.length > 0 ? (
              <>
                {/* Mobile View - Enhanced Cards */}
                <div className="block md:hidden">
                  {filteredPurchases.map((purchase) => {
                    const entityId = purchase.purchasable_id || purchase.product_id;
                    const product = products.find(p => p.id === entityId);
                    const isSubscription = !entityId;

                    return (
                      <div key={purchase.id} className="border-b last:border-b-0 p-4 sm:p-5 bg-white hover:bg-gray-50/50 transition-colors">
                        {/* Header Section with Product and Price */}
                        <div className="flex items-start justify-between mb-3 gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900 mb-2 break-words text-base sm:text-lg leading-tight">
                              {product?.title || 'מנוי פרימיום'}
                            </div>
                            {product && (
                              <div className="text-xs sm:text-sm text-blue-600 font-medium mb-1">
                                {(product.entity_type === 'course' || product.product_type === 'course') && getProductTypeName('course', 'singular')}
                                {(product.entity_type === 'workshop' || product.product_type === 'workshop') && getProductTypeName('workshop', 'singular')}
                                {(product.entity_type === 'file' || product.product_type === 'file') && getProductTypeName('file', 'singular')}
                              </div>
                            )}
                            <div className="text-xs sm:text-sm text-gray-500 font-mono break-all">
                              {purchase.metadata?.transaction_uid ? `#${purchase.metadata.transaction_uid}` : `#${purchase.id}`}
                            </div>
                          </div>
                          <div className="text-left flex-shrink-0">
                            <div className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
                              ₪{purchase.payment_amount}
                            </div>
                            <Badge className={`text-xs border px-3 py-1.5 font-medium ${getStatusColor(purchase.payment_status)}`}>
                              {getStatusText(purchase.payment_status)}
                            </Badge>
                          </div>
                        </div>

                        {/* Date and Meta Info */}
                        <div className="flex items-center text-xs sm:text-sm text-gray-500 mb-4 sm:mb-5 pb-3 border-b border-gray-100">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            {(() => {
                              const date = new Date(purchase.created_at || purchase.created_date);
                              return isNaN(date) ? '-' : format(date, 'dd/MM/yyyy HH:mm', { locale: he });
                            })()}
                          </span>
                        </div>

                        {/* Action Buttons Section */}
                        {product && !isSubscription && (
                          <div className="space-y-3">
                            {/* Professional Action Buttons using ProductActionBar */}
                            {(purchase.payment_status === 'paid' || purchase.payment_status === 'completed' || purchase.payment_status === 'success') && (
                              <ProductActionBar
                                product={buildProductForActionBar(purchase)}
                                className="w-full text-sm sm:text-base"
                                size="default"
                                fullWidth={true}
                                showCartButton={false}
                                onFileAccess={handleFileAccessWithModal}
                                onPdfPreview={handlePdfPreviewWithModal}
                                onCourseAccess={finalHandleCourseAccess}
                                onWorkshopAccess={finalHandleWorkshopAccess}
                              />
                            )}

                            {/* View Details Button */}
                            <Button
                              size="default"
                              variant="outline"
                              onClick={() => finalHandleViewDetails(product)}
                              className="w-full text-sm sm:text-base border-blue-200 text-blue-600 hover:bg-blue-50 h-10 sm:h-11 font-medium"
                            >
                              <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
                              פרטי המוצר
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Desktop View - Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100 border-b">
                      <tr>
                        <th className="text-right p-4 font-semibold">
                          <button
                            onClick={() => handleSort('created_date')}
                            className="flex items-center gap-1 hover:text-blue-600"
                          >
                            תאריך
                            <ArrowUpDown className="w-3 h-3" />
                          </button>
                        </th>
                        <th className="text-right p-4 font-semibold">
                          <button
                            onClick={() => handleSort('transaction_uid')}
                            className="flex items-center gap-1 hover:text-blue-600"
                          >
                            מספר עסקה
                            <ArrowUpDown className="w-3 h-3" />
                          </button>
                        </th>
                        <th className="text-right p-4 font-semibold">
                          <button
                            onClick={() => handleSort('product_name')}
                            className="flex items-center gap-1 hover:text-blue-600"
                          >
                            מוצר
                            <ArrowUpDown className="w-3 h-3" />
                          </button>
                        </th>
                        <th className="text-right p-4 font-semibold">
                          <button
                            onClick={() => handleSort('payment_amount')}
                            className="flex items-center gap-1 hover:text-blue-600"
                          >
                            סכום
                            <ArrowUpDown className="w-3 h-3" />
                          </button>
                        </th>
                        <th className="text-right p-4 font-semibold">
                          <button
                            onClick={() => handleSort('payment_status')}
                            className="flex items-center gap-1 hover:text-blue-600"
                          >
                            סטטוס
                            <ArrowUpDown className="w-3 h-3" />
                          </button>
                        </th>
                        <th className="text-right p-4 font-semibold">פעולות</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPurchases.map((purchase) => {
                        const entityId = purchase.purchasable_id || purchase.product_id;
                        const product = products.find(p => p.id === entityId);
                        const isSubscription = !entityId;

                        return (
                          <tr key={purchase.id} className="border-b hover:bg-gray-50">
                            <td className="p-4">
                              {(() => {
                                const date = new Date(purchase.created_at || purchase.created_date);
                                return isNaN(date) ? '-' : format(date, 'dd/MM/yyyy HH:mm', { locale: he });
                              })()}
                            </td>
                            <td className="p-4 font-mono text-sm">
                              {purchase.metadata?.transaction_uid || purchase.id}
                            </td>
                            <td className="p-4">
                              <div>
                                <div className="font-medium">
                                  {product?.title || 'מנוי פרימיום'}
                                </div>
                                {product && (
                                  <div className="text-sm text-gray-500">
                                    {(product.entity_type === 'course' || product.product_type === 'course') && getProductTypeName('course', 'singular')}
                                    {(product.entity_type === 'workshop' || product.product_type === 'workshop') && getProductTypeName('workshop', 'singular')}
                                    {(product.entity_type === 'file' || product.product_type === 'file') && getProductTypeName('file', 'singular')}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="p-4 font-semibold">
                              ₪{purchase.payment_amount}
                            </td>
                            <td className="p-4">
                              <Badge className={`border ${getStatusColor(purchase.payment_status)}`}>
                                {getStatusText(purchase.payment_status)}
                              </Badge>
                            </td>
                            <td className="p-4">
                              {product && !isSubscription && (
                                <div className="flex items-center gap-2">
                                  {/* Professional Action Button using ProductActionBar */}
                                  {(purchase.payment_status === 'paid' || purchase.payment_status === 'completed' || purchase.payment_status === 'success') && (
                                    <ProductActionBar
                                      product={buildProductForActionBar(purchase)}
                                      className="text-xs"
                                      size="sm"
                                      fullWidth={false}
                                      showCartButton={false}
                                      onFileAccess={handleFileAccessWithModal}
                                      onPdfPreview={handlePdfPreviewWithModal}
                                      onCourseAccess={finalHandleCourseAccess}
                                      onWorkshopAccess={finalHandleWorkshopAccess}
                                    />
                                  )}

                                  {/* View Details Button */}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => finalHandleViewDetails(product)}
                                    className="text-xs border-blue-200 text-blue-600 hover:bg-blue-50"
                                  >
                                    <ExternalLink className="w-3 h-3 ml-1" />
                                    פרטים
                                  </Button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="text-center py-6 sm:py-8 lg:py-12 px-3 sm:px-4">
                <CreditCard className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
                <p className="text-gray-600 text-sm sm:text-base lg:text-lg">אין היסטוריית רכישות</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* PDF Viewer Modal */}
      {pdfViewerOpen && selectedFile && (
        <PdfViewer
          file={selectedFile}
          isOpen={pdfViewerOpen}
          onClose={() => {
            setPdfViewerOpen(false);
            setSelectedFile(null);
          }}
        />
      )}
    </>
  );
};

export default PurchaseHistory;
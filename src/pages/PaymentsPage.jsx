import React, { useState, useEffect, useCallback } from "react";
import { Purchase, Workshop, Course, File, Tool, SubscriptionPlan, Product } from "@/services/entities";
import { getProductTypeName } from "@/config/productTypes";
import { useUser } from "@/contexts/UserContext";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Calendar,
  CreditCard,
  ShoppingBag,
  ArrowUpDown,
  ExternalLink,
  ArrowRight
} from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import ProductActionBar from "@/components/ui/ProductActionBar";
import { useProductActions } from "@/hooks/useProductActions";
import PdfViewer from "@/components/pdf/PdfViewer";
import { ludlog, luderror } from '@/lib/ludlog';
import { useNavigate } from "react-router-dom";

// Global cache for purchases data per user
let purchasesCache = new Map(); // Map: userId -> { purchases, timestamp }
const PURCHASES_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Global cache for entity data to prevent duplicate API calls
let entitiesCache = new Map(); // Map: "type:id" -> { entity, timestamp }
const ENTITIES_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const PaymentsPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useUser();

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

  // Helper function to load entity by type and id with caching
  const loadEntityById = async (type, id) => {
    try {
      const cacheKey = `${type}:${id}`;
      const now = Date.now();
      const cachedEntry = entitiesCache.get(cacheKey);
      const isCacheValid = cachedEntry && (now - cachedEntry.timestamp < ENTITIES_CACHE_DURATION);

      if (isCacheValid) {
        ludlog.ui('✅ Using cached entity data:', { data: cacheKey });
        return cachedEntry.entity;
      }

      ludlog.api('🔄 Loading entity from API (cache miss/expired);:', cacheKey);

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
        case 'subscription':
          const subscriptionPlans = await SubscriptionPlan.filter({ id });
          entity = subscriptionPlans.length > 0 ? subscriptionPlans[0] : null;
          break;
        default:
          entity = null;
      }

      // Fallback: Try loading from Product table if entity not found and it's not a subscription
      if (!entity && type !== 'subscription') {
        ludlog.api(`🔄 Fallback: Loading from Product table for ${type}:${id}`);
        try {
          const products = await Product.filter({ entity_id: id, product_type: type });
          if (products.length > 0) {
            entity = products[0];
            ludlog.api(`✅ Found product via fallback:`, { title: entity.title, type: entity.product_type });
          }
        } catch (fallbackError) {
          ludlog.api(`❌ Fallback failed:`, fallbackError);
        }
      }

      // Add entity type for UI rendering
      if (entity) {
        entity.entity_type = type;

        // Cache the entity
        entitiesCache.set(cacheKey, {
          entity,
          timestamp: now
        });
        ludlog.ui('✅ Entity data cached:', { data: cacheKey });
      }

      return entity;
    } catch (error) {
      luderror.ui(`Error loading ${type} ${id}:`, error);
      return null;
    }
  };

  const loadPurchases = useCallback(async () => {
    if (!currentUser) return;

    setIsLoading(true);
    try {
      ludlog.payment('[PaymentsPage] Loading purchases for user:', { data: currentUser.id });

      // Check if we have cached purchases data for this user
      const userId = currentUser.id;
      const now = Date.now();
      const userCacheEntry = purchasesCache.get(userId);
      const isCacheValid = userCacheEntry && (now - userCacheEntry.timestamp < PURCHASES_CACHE_DURATION);

      let userPurchases;

      if (isCacheValid) {
        ludlog.payment('✅ Using cached purchases data for PaymentsPage user', { data: userId });
        userPurchases = userCacheEntry.purchases;
      } else {
        const reason = !userCacheEntry ? 'no cache entry' : 'cache expired';
        ludlog.payment('🔄 Loading purchases data for PaymentsPage user (cache miss/expired);:', userId, `(${reason})`);

        // Load purchases using buyer_user_id with ordered results
        userPurchases = await Purchase.filter({ buyer_user_id: currentUser.id }, { order: [['created_at', 'DESC']] });

        // Update cache
        purchasesCache.set(userId, {
          purchases: userPurchases,
          timestamp: now
        });
        ludlog.payment('✅ PaymentsPage purchases data cached for user', { data: userId });
      }
      setPurchases(userPurchases);

      // Load entities for the purchases (handle both new polymorphic and legacy structures)
      const entitiesData = await Promise.all(
        userPurchases.map(async purchase => {
          try {
            ludlog.payment(`[PaymentsPage] Loading entity for purchase ${purchase.id}:`, {
              purchasable_type: purchase.purchasable_type,
              purchasable_id: purchase.purchasable_id,
              product_id: purchase.product_id
            });

            // Try new polymorphic structure first
            if (purchase.purchasable_type && purchase.purchasable_id) {
              let entity = await loadEntityById(purchase.purchasable_type, purchase.purchasable_id);

              // Additional fallback: If entity not found and it's not a subscription, try loading as Product ID
              if (!entity && purchase.purchasable_type !== 'subscription') {
                ludlog.payment(`[PaymentsPage] Trying direct Product lookup for ${purchase.purchasable_id}`);
                try {
                  const products = await Product.filter({ id: purchase.purchasable_id });
                  if (products.length > 0) {
                    entity = products[0];
                    ludlog.payment(`[PaymentsPage] Found via Product ID lookup:`, { title: entity.title, type: entity.product_type });
                  }
                } catch (productError) {
                  ludlog.payment(`[PaymentsPage] Product ID lookup failed:`, productError);
                }
              }

              ludlog.payment(`[PaymentsPage] Final entity result:`, {
                type: purchase.purchasable_type,
                id: purchase.purchasable_id,
                title: entity?.title || entity?.name,
                found: !!entity,
                entity
              });
              return entity;
            }
            // Fall back to legacy product_id (assume workshop for backwards compatibility)
            else if (purchase.product_id) {
              const entity = await loadEntityById('workshop', purchase.product_id);
              ludlog.payment(`[PaymentsPage] Loaded legacy entity:`, {
                id: purchase.product_id,
                title: entity?.title || entity?.name,
                entity
              });
              return entity;
            }
            return null;
          } catch (error) {
            luderror.payment(`Error loading entity for purchase ${purchase.id}:`, error);
            return null;
          }
        })
      );

      const validEntities = entitiesData.filter(Boolean);
      ludlog.payment(`[PaymentsPage] Loaded ${validEntities.length} entities out of ${userPurchases.length} purchases`);
      setProducts(validEntities);
    } catch (error) {
      luderror.payment("Error loading purchases:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

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
    if (currentUser) {
      loadPurchases();
    }
  }, [currentUser, loadPurchases]);

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
    await defaultHandleFileAccess(file, { setPdfViewerOpen });
  };

  const handlePdfPreviewWithModal = (file) => {
    setSelectedFile(file);
    defaultHandlePdfPreview({ setPdfViewerOpen });
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
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto">
          <Card className="shadow-lg sm:shadow-xl border-0 bg-white/80 backdrop-blur-sm rounded-lg sm:rounded-xl lg:rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-green-500 to-teal-600 text-white p-3 sm:p-4 lg:p-6">
              <CardTitle className="flex items-center gap-2 sm:gap-3">
                <div className="w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-white/20 rounded-md sm:rounded-lg flex items-center justify-center flex-shrink-0">
                  <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
                </div>
                <span className="text-base sm:text-lg lg:text-xl font-medium">היסטוריית תשלומים</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">טוען היסטוריית תשלומים...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Modern Header */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => navigate('/account')}
                  variant="ghost"
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl px-4 py-2"
                >
                  <ArrowRight className="w-4 h-4" />
                  חזור לחשבון שלי
                </Button>
                <div className="h-6 w-px bg-gray-300"></div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">היסטוריית תשלומים</h1>
                  <p className="text-sm text-gray-500 mt-1">נהל וצפה בכל הרכישות שלך</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <CreditCard className="w-4 h-4" />
                <span>{filteredPurchases.length} תשלומים</span>
              </div>
            </div>
          </div>

          {/* Enhanced Filters */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Input
                    placeholder="חפש לפי מספר עסקה, שם מוצר או שם קונה..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 h-12 text-base border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="flex-shrink-0">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full lg:w-48 h-12 border-gray-200 rounded-xl">
                    <SelectValue placeholder="סנן לפי סטטוס" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל הסטטוסים</SelectItem>
                    <SelectItem value="completed">הושלם</SelectItem>
                    <SelectItem value="paid">שולם</SelectItem>
                    <SelectItem value="pending">ממתין לתשלום</SelectItem>
                    <SelectItem value="cart">בעגלת קניות</SelectItem>
                    <SelectItem value="failed">נכשל</SelectItem>
                    <SelectItem value="refunded">הוחזר</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Redesigned Purchase History */}
          {filteredPurchases.length > 0 ? (
            <>
              {/* Mobile View - Premium Cards */}
              <div className="block xl:hidden space-y-4">
                {filteredPurchases.map((purchase) => {
                  const entityId = purchase.purchasable_id || purchase.product_id;
                  const product = products.find(p => p.id === entityId);
                  const isSubscription = purchase.purchasable_type === 'subscription';

                  return (
                    <div key={purchase.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                      {/* Product Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                            {product?.title || product?.name || (isSubscription ? 'מנוי פרימיום' : 'מוצר לא זמין')}
                          </h3>
                          {(product || isSubscription) && (
                            <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mb-2">
                              {product && ((product.entity_type === 'course' || product.product_type === 'course') && getProductTypeName('course', 'singular'))}
                              {product && ((product.entity_type === 'workshop' || product.product_type === 'workshop') && getProductTypeName('workshop', 'singular'))}
                              {product && ((product.entity_type === 'file' || product.product_type === 'file') && getProductTypeName('file', 'singular'))}
                              {product && ((product.entity_type === 'tool' || product.product_type === 'tool') && getProductTypeName('tool', 'singular'))}
                              {product && product.entity_type === 'subscription' && 'מנוי'}
                              {isSubscription && !product && 'מנוי'}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-900 mb-2">
                            ₪{purchase.payment_amount}
                          </div>
                          <Badge className={`text-xs px-3 py-1.5 font-medium border-0 ${getStatusColor(purchase.payment_status)}`}>
                            {getStatusText(purchase.payment_status)}
                          </Badge>
                        </div>
                      </div>

                      {/* Transaction Details */}
                      <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-gray-50 rounded-xl">
                        <div>
                          <div className="text-xs font-medium text-gray-500 mb-1">תאריך רכישה</div>
                          <div className="text-sm text-gray-900">
                            {(() => {
                              const date = new Date(purchase.created_at || purchase.created_date);
                              return isNaN(date) ? '-' : format(date, 'dd/MM/yyyy', { locale: he });
                            })()}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-medium text-gray-500 mb-1">מספר עסקה</div>
                          <div className="text-sm font-mono text-gray-900">
                            {purchase.metadata?.transaction_uid ? `#${purchase.metadata.transaction_uid.slice(-8)}` : `#${purchase.id.slice(-8)}`}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      {product && !isSubscription && (
                        <div className="flex gap-3">
                          {(purchase.payment_status === 'paid' || purchase.payment_status === 'completed' || purchase.payment_status === 'success') && (
                            <ProductActionBar
                              product={buildProductForActionBar(purchase)}
                              className="flex-1"
                              size="default"
                              fullWidth={false}
                              showCartButton={false}
                              onFileAccess={handleFileAccessWithModal}
                              onPdfPreview={handlePdfPreviewWithModal}
                              onCourseAccess={defaultHandleCourseAccess}
                              onWorkshopAccess={defaultHandleWorkshopAccess}
                            />
                          )}
                          <Button
                            size="default"
                            variant="outline"
                            onClick={() => defaultHandleViewDetails(product)}
                            className="border-gray-200 text-gray-700 hover:bg-gray-50 h-10 px-4"
                          >
                            <ExternalLink className="w-4 h-4 ml-2" />
                            פרטים
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Desktop View - Modern Table */}
              <div className="hidden xl:block">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  {/* Table Header */}
                  <div className="bg-gray-50/80 border-b border-gray-200 px-6 py-4">
                    <div className="grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-2">
                        <button
                          onClick={() => handleSort('created_date')}
                          className="flex items-center gap-2 text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                        >
                          תאריך רכישה
                          <ArrowUpDown className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="col-span-2">
                        <button
                          onClick={() => handleSort('transaction_uid')}
                          className="flex items-center gap-2 text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                        >
                          מספר עסקה
                          <ArrowUpDown className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="col-span-4">
                        <button
                          onClick={() => handleSort('product_name')}
                          className="flex items-center gap-2 text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                        >
                          פרטי המוצר
                          <ArrowUpDown className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="col-span-1">
                        <button
                          onClick={() => handleSort('payment_amount')}
                          className="flex items-center gap-2 text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                        >
                          סכום
                          <ArrowUpDown className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="col-span-1">
                        <button
                          onClick={() => handleSort('payment_status')}
                          className="flex items-center gap-2 text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                        >
                          סטטוס
                          <ArrowUpDown className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="col-span-2">
                        <span className="text-sm font-semibold text-gray-900">פעולות</span>
                      </div>
                    </div>
                  </div>

                  {/* Table Body */}
                  <div className="divide-y divide-gray-100">
                    {filteredPurchases.map((purchase, index) => {
                      const entityId = purchase.purchasable_id || purchase.product_id;
                      const product = products.find(p => p.id === entityId);
                      const isSubscription = purchase.purchasable_type === 'subscription';

                      return (
                        <div key={purchase.id} className={`grid grid-cols-12 gap-4 items-center px-6 py-6 hover:bg-gray-50/50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/20'}`}>
                          {/* Date */}
                          <div className="col-span-2">
                            <div className="text-sm font-medium text-gray-900">
                              {(() => {
                                const date = new Date(purchase.created_at || purchase.created_date);
                                return isNaN(date) ? '-' : format(date, 'dd/MM/yyyy', { locale: he });
                              })()}
                            </div>
                            <div className="text-xs text-gray-500">
                              {(() => {
                                const date = new Date(purchase.created_at || purchase.created_date);
                                return isNaN(date) ? '-' : format(date, 'HH:mm', { locale: he });
                              })()}
                            </div>
                          </div>

                          {/* Transaction ID */}
                          <div className="col-span-2">
                            <div className="font-mono text-sm text-gray-900 bg-gray-100 px-2 py-1 rounded-md inline-block">
                              {purchase.metadata?.transaction_uid ? `#${purchase.metadata.transaction_uid.slice(-8)}` : `#${purchase.id.slice(-8)}`}
                            </div>
                          </div>

                          {/* Product Details */}
                          <div className="col-span-4">
                            <div className="font-medium text-gray-900 mb-1 line-clamp-1">
                              {product?.title || product?.name || (isSubscription ? 'מנוי פרימיום' : 'מוצר לא זמין')}
                            </div>
                            {(product || isSubscription) && (
                              <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {product && ((product.entity_type === 'course' || product.product_type === 'course') && getProductTypeName('course', 'singular'))}
                                {product && ((product.entity_type === 'workshop' || product.product_type === 'workshop') && getProductTypeName('workshop', 'singular'))}
                                {product && ((product.entity_type === 'file' || product.product_type === 'file') && getProductTypeName('file', 'singular'))}
                                {product && ((product.entity_type === 'tool' || product.product_type === 'tool') && getProductTypeName('tool', 'singular'))}
                                {product && product.entity_type === 'subscription' && 'מנוי'}
                                {isSubscription && !product && 'מנוי'}
                              </div>
                            )}
                          </div>

                          {/* Amount */}
                          <div className="col-span-1">
                            <div className="text-lg font-bold text-gray-900">
                              ₪{purchase.payment_amount}
                            </div>
                          </div>

                          {/* Status */}
                          <div className="col-span-1">
                            <Badge className={`text-xs px-3 py-1.5 font-medium border-0 ${getStatusColor(purchase.payment_status)}`}>
                              {getStatusText(purchase.payment_status)}
                            </Badge>
                          </div>

                          {/* Actions */}
                          <div className="col-span-2">
                            {product && !isSubscription ? (
                              <div className="flex items-center gap-2">
                                {(purchase.payment_status === 'paid' || purchase.payment_status === 'completed' || purchase.payment_status === 'success') && (
                                  <ProductActionBar
                                    product={buildProductForActionBar(purchase)}
                                    className="text-xs"
                                    size="sm"
                                    fullWidth={false}
                                    showCartButton={false}
                                    onFileAccess={handleFileAccessWithModal}
                                    onPdfPreview={handlePdfPreviewWithModal}
                                    onCourseAccess={defaultHandleCourseAccess}
                                    onWorkshopAccess={defaultHandleWorkshopAccess}
                                  />
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => defaultHandleViewDetails(product)}
                                  className="text-xs border-gray-200 text-gray-700 hover:bg-gray-50 px-3 py-1.5"
                                >
                                  <ExternalLink className="w-3 h-3 ml-1" />
                                  פרטים
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">לא זמין</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-6">
                  <CreditCard className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">אין היסטוריית תשלומים</h3>
                <p className="text-gray-600 max-w-sm mx-auto">
                  עדיין לא ביצעת רכישות במערכת. כשתבצע רכישות, הן יופיעו כאן.
                </p>
                <Button
                  onClick={() => navigate('/dashboard')}
                  className="mt-6 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  עבור לדשבורד
                </Button>
              </div>
            </div>
          )}
        </div>
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

export default PaymentsPage;
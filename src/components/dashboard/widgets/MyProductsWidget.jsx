import React, { useState, useEffect, useCallback } from "react";
import { Purchase, Workshop, Course, File, Tool } from "@/services/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Package,
  Search,
  ExternalLink,
  Grid,
  List
} from "lucide-react";
import ProductActionBar from "@/components/ui/ProductActionBar";
import { useProductActions } from "@/hooks/useProductActions";
import PdfViewer from "@/components/pdf/PdfViewer";
import { ludlog, luderror } from '@/lib/ludlog';
import { usePaymentPageStatusCheck } from '@/hooks/usePaymentPageStatusCheck';
import { useSubscriptionPaymentStatusCheck } from '@/hooks/useSubscriptionPaymentStatusCheck';

/**
 * MyProductsWidget - Clean product access widget without purchase details
 * Focuses on providing easy access to purchased products for teachers
 */
const MyProductsWidget = ({
  widgetId,
  settings = {},
  size = 'medium' // small, medium, large
}) => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // grid or list

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

  // Payment page status checking - check for pending payments and handle abandoned pages
  const paymentStatus = usePaymentPageStatusCheck({
    enabled: true,
    showToasts: true, // Show user notifications about payment status changes
    onStatusUpdate: (update) => {
      ludlog.payment('MyProductsWidget: Payment status update received:', { data: update });

      // Reload products when payments are completed (new products available)
      if (update.type === 'continue_polling' && update.count > 0) {
        loadMyProducts();
      }
    }
  });

  // Subscription payment status checking - check for pending subscriptions and handle completion/failure
  const subscriptionPaymentStatus = useSubscriptionPaymentStatusCheck({
    enabled: true,
    showToasts: true, // Show user notifications about subscription status changes
    checkInterval: 20000, // Check every 20 seconds as specified by user
    onStatusUpdate: (update) => {
      ludlog.payment('MyProductsWidget: Subscription status update received:', { data: update });

      // Reload products when subscription is activated or cancelled
      if (update.type === 'subscription_activated' || update.type === 'subscription_cancelled') {
        loadMyProducts(); // Refresh to get updated user subscription access
      }
    }
  });

  // Widget configuration based on size
  const getWidgetConfig = () => {
    switch (size) {
      case 'small':
        return {
          title: "המוצרים שלי",
          showSearch: false,
          showViewToggle: false,
          maxItems: 3,
          itemLayout: 'compact'
        };
      case 'large':
        return {
          title: "המוצרים שלי - גישה מהירה",
          showSearch: true,
          showViewToggle: true,
          maxItems: null,
          itemLayout: 'detailed'
        };
      default: // medium
        return {
          title: "המוצרים שלי",
          showSearch: true,
          showViewToggle: false,
          maxItems: 6,
          itemLayout: 'standard'
        };
    }
  };

  const config = getWidgetConfig();

  // Load user's purchased products (completed purchases only)
  const loadMyProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      ludlog.ui('[MyProductsWidget] Loading user products');

      // Get completed purchases only
      const purchases = await Purchase.filter(
        { payment_status: 'completed' },
        { order: [['created_at', 'DESC']] }
      );

      // Extract unique products from purchases
      const productMap = new Map();

      const productPromises = purchases.map(async (purchase) => {
        try {
          let product = null;
          let entityType = null;
          let entityId = null;

          // Handle polymorphic structure
          if (purchase.purchasable_type && purchase.purchasable_id) {
            entityType = purchase.purchasable_type;
            entityId = purchase.purchasable_id;
          }
          // Legacy fallback
          else if (purchase.product_id) {
            entityType = 'workshop';
            entityId = purchase.product_id;
          }

          if (entityType && entityId) {
            // Load product based on type
            switch (entityType) {
              case 'workshop':
                const workshops = await Workshop.filter({ id: entityId });
                product = workshops.length > 0 ? workshops[0] : null;
                break;
              case 'course':
                const courses = await Course.filter({ id: entityId });
                product = courses.length > 0 ? courses[0] : null;
                break;
              case 'file':
                const files = await File.filter({ id: entityId });
                product = files.length > 0 ? files[0] : null;
                break;
              case 'tool':
                const tools = await Tool.filter({ id: entityId });
                product = tools.length > 0 ? tools[0] : null;
                break;
            }

            if (product) {
              product.entity_type = entityType;
              product.purchase = {
                ...purchase,
                payment_status: purchase.payment_status,
                access_expires_at: purchase.access_expires_at
              };

              // Use product ID + type as key to avoid duplicates
              const productKey = `${entityType}-${entityId}`;
              if (!productMap.has(productKey)) {
                productMap.set(productKey, product);
              }
            }
          }

          return product;
        } catch (error) {
          luderror.payment(`Error loading product for purchase ${purchase.id}:`, error);
          return null;
        }
      });

      await Promise.all(productPromises);
      const uniqueProducts = Array.from(productMap.values()).filter(Boolean);

      setProducts(uniqueProducts);
      setFilteredProducts(uniqueProducts);

    } catch (error) {
      luderror.ui("Error loading my products:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Filter products based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredProducts(products);
      return;
    }

    const filtered = products.filter(product =>
      product.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    setFilteredProducts(filtered);
  }, [products, searchTerm]);

  useEffect(() => {
    loadMyProducts();
  }, [loadMyProducts]);

  // Enhanced product access handlers
  const handleFileAccessWithModal = async (file) => {
    setSelectedFile(file);
    await defaultHandleFileAccess(file, { setPdfViewerOpen });
  };

  const handlePdfPreviewWithModal = (file) => {
    setSelectedFile(file);
    defaultHandlePdfPreview({ setPdfViewerOpen });
  };

  // Get display products (limited by config)
  const displayProducts = config.maxItems
    ? filteredProducts.slice(0, config.maxItems)
    : filteredProducts;

  if (isLoading) {
    return (
      <div className="h-full flex flex-col p-6 bg-gradient-to-br from-purple-50 to-blue-100 rounded-xl">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-1">{config.title}</h3>
          <p className="text-sm text-gray-600">טוען את המוצרים שלך...</p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600 text-sm">טוען מוצרים...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="h-full flex flex-col p-6 bg-gradient-to-br from-purple-50 to-blue-100 rounded-xl">
        {/* Header */}
        <div className="mb-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-800">{config.title}</h3>
            </div>
            {config.showViewToggle && (
              <div className="flex items-center bg-white/70 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-purple-500 text-white' : 'text-gray-500'}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-purple-500 text-white' : 'text-gray-500'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <p className="text-sm text-gray-600 mb-3">
            {displayProducts.length} מוצרים זמינים
          </p>

          {config.showSearch && (
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="חיפוש מוצר..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10 bg-white/70 border-white/20"
              />
            </div>
          )}
        </div>

        {/* Products Display */}
        <div className="flex-1 overflow-auto">
          {displayProducts.length > 0 ? (
            <div className={`
              ${viewMode === 'grid' ?
                'grid grid-cols-1 sm:grid-cols-2 gap-3' :
                'space-y-3'
              }
            `}>
              {displayProducts.map((product) => (
                <div
                  key={`${product.entity_type}-${product.id}`}
                  className={`
                    bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-white/20 shadow-sm
                    hover:shadow-md transition-all duration-200 hover:bg-white/90
                    ${config.itemLayout === 'compact' ? 'p-3' : ''}
                  `}
                >
                  {/* Product Header */}
                  <div className="mb-3">
                    <h4 className="font-medium text-gray-900 text-sm leading-tight line-clamp-2">
                      {product.title}
                    </h4>
                    <div className="text-xs text-purple-600 mt-1">
                      {product.entity_type === 'course' && 'קורס'}
                      {product.entity_type === 'workshop' && 'סדנה'}
                      {product.entity_type === 'file' && 'קובץ'}
                      {product.entity_type === 'tool' && 'כלי'}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    <ProductActionBar
                      product={product}
                      className="w-full text-xs"
                      size="sm"
                      fullWidth={true}
                      showCartButton={false}
                      onFileAccess={handleFileAccessWithModal}
                      onPdfPreview={handlePdfPreviewWithModal}
                      onCourseAccess={defaultHandleCourseAccess}
                      onWorkshopAccess={defaultHandleWorkshopAccess}
                    />

                    {config.itemLayout !== 'compact' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => defaultHandleViewDetails(product)}
                        className="w-full text-xs border-purple-200 text-purple-600 hover:bg-purple-50"
                      >
                        <ExternalLink className="w-3 h-3 ml-1" />
                        פרטים
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center">
              <div>
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 text-sm">
                  {searchTerm ? 'לא נמצאו מוצרים מתאימים' : 'אין מוצרים רכושים'}
                </p>
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchTerm('')}
                    className="text-purple-600 hover:text-purple-700 mt-2"
                  >
                    נקה חיפוש
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer info for small widget */}
        {config.maxItems && filteredProducts.length > config.maxItems && (
          <div className="mt-3 text-center text-xs text-gray-500 flex-shrink-0">
            מציג {config.maxItems} מתוך {filteredProducts.length} מוצרים
          </div>
        )}
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

export default MyProductsWidget;
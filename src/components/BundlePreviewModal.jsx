import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Eye, FileText, Package, Play, BookOpen, X, ExternalLink, GraduationCap } from 'lucide-react';
import { getBundleItems } from '@/lib/bundleUtils';
import { getProductTypeName } from '@/config/productTypes';
import { useUser } from '@/contexts/UserContext';
import { useLoginModal } from '@/hooks/useLoginModal';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '@/services/apiClient';
import LudoraLoadingSpinner from '@/components/ui/LudoraLoadingSpinner';
import { ludlog, luderror } from '@/lib/ludlog';

/**
 * Bundle Preview Modal Component
 * Shows all products within a bundle with individual preview options
 * following the same access logic as individual product details pages
 */
export default function BundlePreviewModal({ bundle, isOpen, onClose }) {
  const [bundleProducts, setBundleProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentUser } = useUser();
  const { openLoginModal } = useLoginModal();
  const navigate = useNavigate();

  // Debug logging
  console.log('BundlePreviewModal rendered', {
    isOpen,
    bundle: bundle?.title,
    bundleType: bundle?.product_type,
    isBundle: bundle?.type_attributes?.is_bundle,
    bundleItems: bundle?.type_attributes?.bundle_items
  });

  // Load bundle products data
  useEffect(() => {
    if (!isOpen || !bundle) return;

    const loadBundleProducts = async () => {
      try {
        setLoading(true);
        setError(null);

        const bundleItems = getBundleItems(bundle);
        console.log('Bundle items found:', bundleItems);

        if (!bundleItems || bundleItems.length === 0) {
          console.log('No bundle items found');
          setError('לא נמצאו מוצרים בקיט');
          return;
        }

        // Fetch details for each product in the bundle
        console.log('Fetching details for', bundleItems.length, 'products');
        const productPromises = bundleItems.map(async (item) => {
          try {
            const productDetails = await apiRequest(`/entities/product/${item.product_id}/details`);
            return productDetails;
          } catch (err) {
            luderror.ui(`Failed to load bundle product ${item.product_id}:`, err);
            return null;
          }
        });

        const products = await Promise.all(productPromises);
        const validProducts = products.filter(product => product !== null);

        console.log('Loaded products:', validProducts.map(p => ({
          title: p?.title,
          type: p?.product_type,
          fileType: p?.file_type,
          allowPreview: p?.allow_preview
        })));

        setBundleProducts(validProducts);

        if (validProducts.length === 0) {
          setError('לא ניתן לטעון מוצרים מהקיט');
        }

      } catch (err) {
        luderror.ui('Failed to load bundle products:', err);
        setError('שגיאה בטעינת מוצרי הקיט');
      } finally {
        setLoading(false);
      }
    };

    loadBundleProducts();
  }, [isOpen, bundle]);

  // Handle individual product preview
  const handleProductPreview = (product) => {
    console.log('handleProductPreview called', {
      productTitle: product.title,
      productType: product.product_type,
      fileType: product.file_type,
      allowPreview: product.allow_preview
    });

    // Check product type and preview availability
    const isFile = product.product_type === 'file';
    const isPdf = product.file_type === 'pdf' || product.file_name?.toLowerCase().endsWith('.pdf');
    const isLessonPlan = product.product_type === 'lesson_plan';

    // Check if preview is enabled for this product
    const filePreviewEnabled = isFile && isPdf && product.allow_preview;
    const lessonPlanPreviewEnabled = isLessonPlan && product.preview_info?.allow_slide_preview;

    console.log('Preview availability', {
      isFile,
      isPdf,
      isLessonPlan,
      filePreviewEnabled,
      lessonPlanPreviewEnabled
    });

    if (!filePreviewEnabled && !lessonPlanPreviewEnabled) {
      console.log('No preview available for this product');
      return; // No preview available
    }

    // For preview, redirect to product details with openPdf parameter or lesson plan preview
    if (isLessonPlan) {
      const productId = product.entity_id || product.id; // For lesson plans, entity_id is correct since we need the lesson plan entity ID
      const url = `/lesson-plan-presentation?id=${productId}&preview=true`;
      console.log('Navigating to lesson plan preview:', url);
      if (!currentUser) {
        openLoginModal(
          () => navigate(url),
          'נדרשת הרשמה לתצוגה מקדימה'
        );
      } else {
        navigate(url);
      }
    } else {
      // For file preview - use the product ID, NOT entity_id
      const productId = product.id;
      const url = `/product-details?type=${product.product_type}&id=${productId}&openPdf=true`;
      console.log('Navigating to file preview:', {
        url,
        calculatedProductId: productId,
        originalProductId: product.id,
        entityId: product.entity_id,
        currentUser: !!currentUser
      });

      if (!currentUser) {
        console.log('No current user, opening login modal');
        openLoginModal(
          () => {
            console.log('After login, navigating to:', url);
            navigate(url);
          },
          'נדרשת הרשמה לתצוגה מקדימה'
        );
      } else {
        console.log('Current user exists, navigating directly to:', url);
        // Test if navigation works at all
        console.log('About to call navigate() function');
        try {
          navigate(url);
          console.log('Navigate function called successfully');
        } catch (err) {
          console.error('Error calling navigate:', err);
        }
      }
    }
  };

  // Handle navigation to full product details
  const handleViewProduct = (product) => {
    const productId = product.id;
    const url = `/product-details?type=${product.product_type}&id=${productId}`;
    console.log('handleViewProduct called - navigating to:', url);
    try {
      navigate(url);
      console.log('View product navigation called successfully');
    } catch (err) {
      console.error('Error navigating to view product:', err);
    }
  };

  // Check if a product can be previewed
  const canPreview = (product) => {
    const isFile = product.product_type === 'file';
    const isPdf = product.file_type === 'pdf' || product.file_name?.toLowerCase().endsWith('.pdf');
    const isLessonPlan = product.product_type === 'lesson_plan';

    const filePreviewEnabled = isFile && isPdf && product.allow_preview;
    const lessonPlanPreviewEnabled = isLessonPlan && product.preview_info?.allow_slide_preview;

    return filePreviewEnabled || lessonPlanPreviewEnabled;
  };

  // Get product icon
  const getProductIcon = (productType) => {
    switch (productType) {
      case 'file':
        return <FileText className="w-5 h-5" />;
      case 'lesson_plan':
        return <GraduationCap className="w-5 h-5" />;
      case 'game':
        return <Play className="w-5 h-5" />;
      case 'workshop':
        return <BookOpen className="w-5 h-5" />;
      case 'course':
        return <BookOpen className="w-5 h-5" />;
      default:
        return <Package className="w-5 h-5" />;
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <Package className="w-6 h-6 text-blue-600" />
            תצוגה מקדימה - {bundle.title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <LudoraLoadingSpinner
                message="טוען מוצרי קיט..."
                status="loading"
                size="lg"
                theme="space"
              />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8 text-center">
              <div>
                <div className="text-red-600 text-lg font-semibold mb-2">{error}</div>
                <Button onClick={onClose} variant="outline">
                  סגור
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="text-sm text-gray-600 mb-4">
                הקיט כולל {bundleProducts.length} מוצרים. לחץ על "תצוגה מקדימה" כדי לראות תוכן מקדים של המוצרים הזמינים.
              </div>

              <div className="grid gap-4">
                {bundleProducts.map((product, index) => (
                  <Card key={product.id || index} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {/* Product Icon and Type */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                              {getProductIcon(product.product_type)}
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {getProductTypeName(product.product_type, 'singular')}
                            </Badge>
                          </div>

                          {/* Product Info */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm text-gray-900 truncate">
                              {product.title}
                            </h3>
                            {product.short_description && (
                              <p className="text-xs text-gray-600 truncate mt-1">
                                {product.short_description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {/* Preview Button - only show if preview is available */}
                          {canPreview(product) && (
                            <Button
                              onClick={() => handleProductPreview(product)}
                              variant="outline"
                              size="sm"
                              className="text-blue-600 border-blue-300 hover:bg-blue-50"
                            >
                              <Eye className="w-4 h-4 ml-1" />
                              <span className="hidden sm:inline">תצוגה מקדימה</span>
                              <span className="sm:hidden">תצוגה</span>
                            </Button>
                          )}

                          {/* View Product Button */}
                          <Button
                            onClick={() => handleViewProduct(product)}
                            variant="ghost"
                            size="sm"
                            className="text-gray-600 hover:text-gray-900"
                          >
                            <ExternalLink className="w-4 h-4 ml-1" />
                            <span className="hidden sm:inline">פרטים</span>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Close Button */}
        <div className="border-t pt-4 flex justify-end">
          <Button onClick={onClose} variant="outline">
            <X className="w-4 h-4 ml-2" />
            סגור
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
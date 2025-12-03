import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Purchase } from "@/services/entities";
import { useUser } from "@/contexts/UserContext";
import { apiDownload } from "@/services/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ludlog, luderror } from '@/lib/ludlog';
import KitBadge from "@/components/ui/KitBadge";
import { isBundle, getBundleComposition, getBundleCompositionLabel } from "@/lib/bundleUtils";
import {
  Calendar,
  Clock,
  Users,
  Play,
  BookOpen,
  FileText,
  Eye,
  CheckCircle,
  AlertCircle,
  Monitor,
  Video,
  Globe,
  Package,
  Zap,
  Tag,
  ArrowLeft,
  Info,
  GraduationCap,
  FolderOpen,
  StickyNote,
  Volume2,
  PaperclipIcon,
  Download
} from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import LudoraLoadingSpinner from "@/components/ui/LudoraLoadingSpinner";
import VideoPlayer from "../components/VideoPlayer"; // Added import for VideoPlayer component
import SecureVideoPlayer from "../components/SecureVideoPlayer";
import { getMarketingVideoUrl, getProductImageUrl } from '@/utils/videoUtils.js';
import { getProductTypeName, formatGradeRange } from "@/config/productTypes";
import ProductAccessStatus from "@/components/ui/ProductAccessStatus";
import { hasActiveAccess } from "@/utils/productAccessUtils";
import { purchaseUtils } from "@/utils/api.js";
import PriceDisplayTag from "@/components/ui/PriceDisplayTag";
import ProductActionBar from "@/components/ui/ProductActionBar";
import PdfViewer from "@/components/pdf/PdfViewer";
import GameDetailsSection from "@/components/game/details/GameDetailsSection";
import { useLoginModal } from "@/hooks/useLoginModal";
import { useProductAccess } from "@/hooks/useProductAccess";
import { usePaymentPageStatusCheck } from '@/hooks/usePaymentPageStatusCheck';
import { useSubscriptionPaymentStatusCheck } from '@/hooks/useSubscriptionPaymentStatusCheck';
import BundlePreviewModal from "@/components/BundlePreviewModal";

export default function ProductDetails() {
  const navigate = useNavigate();
  const { currentUser, settings, isLoading: userLoading } = useUser();
  const { openLoginModal } = useLoginModal();

  const [item, setItem] = useState(null); // Renamed from product to item for generic use
  const [itemType, setItemType] = useState(null); // Track what type of entity we're viewing
  const [userPurchases, setUserPurchases] = useState([]);
  const [purchase, setPurchase] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [detailsTexts, setDetailsTexts] = useState({});
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [bundlePreviewModalOpen, setBundlePreviewModalOpen] = useState(false);
  const [selectedBundleProduct, setSelectedBundleProduct] = useState(null); // For bundle product PDF viewing

  // Use centralized product access logic - same as ProductActionBar
  const { hasAccess } = useProductAccess(item, userPurchases);

  // Payment page status checking - check for pending payments and handle abandoned pages
  const paymentStatus = usePaymentPageStatusCheck({
    enabled: true,
    showToasts: true, // Show user notifications about payment status changes
    onStatusUpdate: (update) => {
      ludlog.payment('ProductDetails: Payment status update received:', { data: update });

      // Reload product data when payments are processed (user might have new access)
      if (update.type === 'continue_polling' && update.count > 0) {
        loadData();
      }
    }
  });

  // Subscription payment status checking - check for pending subscriptions and handle completion/failure
  const subscriptionPaymentStatus = useSubscriptionPaymentStatusCheck({
    enabled: true,
    showToasts: true, // Show user notifications about subscription status changes
    checkInterval: 20000, // Check every 20 seconds as specified by user
    onStatusUpdate: (update) => {
      ludlog.payment('ProductDetails: Subscription status update received:', { data: update });

      // Reload user data when subscription is activated or cancelled
      if (update.type === 'subscription_activated' || update.type === 'subscription_cancelled') {
        loadData(); // Refresh to get updated user subscription status
      }
    }
  });

  // Track if component is mounted to avoid calling setState on unmounted component
  const isMountedRef = useRef(true);

  // Track component mount/unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    loadTexts();

    // Check for openPdf URL parameter (from post-login redirect for file assets)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('openPdf') === 'true') {
      // Remove the parameter from URL
      urlParams.delete('openPdf');
      window.history.replaceState({}, '', `${window.location.pathname}?${urlParams.toString()}`);
      // Open asset viewer for file assets
      setPdfViewerOpen(true);
    }
  }, []);

  const loadTexts = async () => {
    const texts = {
      loading: "טוען פרטי מוצר...",
      notFound: "מוצר לא נמצא",
      errorLoadingData: "שגיאה בטעינת הנתונים",
      productIdMissing: "מזהה מוצר חסר",
      buyNow: "רכישה עכשיו",
      startCourse: `התחל ${getProductTypeName('course', 'singular')}`,
      downloadFile: `הורד ${getProductTypeName('file', 'singular')}`,
      watchFile: "צפיה בקובץ", // Same text as Files.jsx
      getAccess: "רכישה", // Same text as Files.jsx
      joinWorkshop: `הצטרף ל${getProductTypeName('workshop', 'singular')}`,
      watchRecording: "צפה בהקלטה",
      alreadyOwned: "ברשותך",
      accessUntil: "גישה עד",
      lifetimeAccess: "גישה לכל החיים",
      minutes: "דקות",
      modules: "מודולים",
      targetAudience: "קהל יעד",
      previewVideo: "סרטון תצוגה מקדימה",
      courseModules: `מודולי ה${getProductTypeName('course', 'singular')}`,
      scheduledFor: "מתוכנן ל",
      maxParticipants: "משתתפים מקסימלי",
      recordingAvailable: "הקלטה זמינה",
      freePreview: "תצוגה מקדימה חינם",
      downloads: "הורדות",
      fileType: `סוג ${getProductTypeName('file', 'singular')}`,
      whatsIncluded: "מה כלול במוצר",
      productFeatures: "תכונות המוצר",
      productInfo: "מידע על המוצר",
      productOverview: "סקירת המוצר",
      additionalInfo: "מידע נוסף"
    };
    setDetailsTexts(texts);
  };


  // Enhanced file access logic with asset viewer support
  const handleFileAccess = async (file) => {
    if (!file.id) return;

    // Check if it's a PDF file
    const isPdf = file.file_type === 'pdf' || file.file_name?.toLowerCase().endsWith('.pdf');

    if (isPdf) {
      // Open file asset in viewer modal
      setPdfViewerOpen(true);
    } else {
      // For non-PDF files, use direct download
      try {
        // Use apiDownload to get blob with auth headers
        const blob = await apiDownload(`/assets/download/file/${file.id}`);

        // Create blob URL and trigger download
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');

        // Clean up blob URL after a delay
        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
      } catch (error) {
        luderror.media('Error downloading file:', error);
      }
    }
  };

  // Handle asset preview for lesson plans, files, and bundles without access
  const handleAssetPreview = () => {
    ludlog.ui('Preview button clicked', {
      productType: item.product_type,
      isBundle: isBundle(item),
      bundlePreviewModalOpen
    });

    // Check if this is a bundle product
    if (isBundle(item)) {
      ludlog.ui('Opening bundle preview modal');
      // For bundle products, open bundle preview modal directly (no auth required for preview)
      setBundlePreviewModalOpen(true);
      return;
    }

    // Check if user is authenticated for individual file/lesson plan previews
    if (!currentUser) {
      const assetPreviewCallback = () => {
        // Add a small delay to ensure all state updates from login are complete
        setTimeout(() => {
          if (!isMountedRef.current) {
            // Component was unmounted, use navigation approach instead
            const currentUrl = new URL(window.location.href);

            if (item.product_type === 'lesson_plan') {
              // For lesson plans, redirect to presentation page
              navigate(`/lesson-plan-presentation?id=${item.entity_id || item.id}`);
            } else {
              // For file assets, set openPdf parameter
              currentUrl.searchParams.set('openPdf', 'true');
              navigate(currentUrl.pathname + currentUrl.search);
            }
            return;
          }

          // Component is still mounted, proceed with asset preview
          if (item.product_type === 'lesson_plan') {
            // Navigate to lesson plan presentation in preview mode
            navigate(`/lesson-plan-presentation?id=${item.entity_id || item.id}`);
          } else {
            // Open asset viewer for file assets
            setPdfViewerOpen(true);
          }
        }, 100);
      };

      openLoginModal(
        assetPreviewCallback,
        'אפשרות זו זמינה למשתמשים רשומים בלבד. יש להתחבר / להרשם כדי להמשיך'
      );
      return;
    }

    // User is authenticated, open asset preview directly
    if (item.product_type === 'lesson_plan') {
      // Navigate to lesson plan presentation in preview mode
      navigate(`/lesson-plan-presentation?id=${item.entity_id || item.id}`);
    } else {
      // Open asset viewer for file assets
      setPdfViewerOpen(true);
    }
  };

  // Bundle modal callback for individual product preview
  const handleBundleProductPreview = (product) => {
    ludlog.ui('ProductDetails - bundle product preview callback', {
      productTitle: product.title,
      productType: product.product_type,
      productId: product.id
    });

    // Close bundle modal first
    setBundlePreviewModalOpen(false);

    // Handle different product types
    if (product.product_type === 'lesson_plan') {
      // For lesson plans, still need to navigate to presentation
      if (!currentUser) {
        const previewCallback = () => {
          navigate(`/lesson-plan-presentation?id=${product.entity_id || product.id}`);
        };
        openLoginModal(
          previewCallback,
          'נדרשת הרשמה לתצוגה מקדימה'
        );
        return;
      }
      navigate(`/lesson-plan-presentation?id=${product.entity_id || product.id}`);
    } else if (product.product_type === 'file') {
      // For files, open PDF viewer directly without navigation - stay on bundle page!
      ludlog.ui('Opening PDF viewer for bundle product directly', {
        productTitle: product.title,
        fileType: product.file_type
      });

      // Set the selected product and open PDF viewer directly
      setSelectedBundleProduct(product);
      setPdfViewerOpen(true);
    }
  };

  // Bundle modal callback for viewing full product details
  const handleBundleProductView = (product) => {
    ludlog.ui('ProductDetails - bundle product view callback', {
      productTitle: product.title,
      productType: product.product_type,
      productId: product.id
    });

    // Close bundle modal and navigate to product details
    setBundlePreviewModalOpen(false);
    navigate(`/product-details?type=${product.product_type}&id=${product.id}`);
  };

  // Handle course access
  const handleCourseAccess = (course) => {
    navigate(`/course?course=${course.entity_id || course.id}`);
  };

  // Handle workshop access
  const handleWorkshopAccess = (workshop) => {
    const now = new Date();
    const scheduledDate = workshop.scheduled_date ? new Date(workshop.scheduled_date) : null;
    const isLive = scheduledDate && scheduledDate > now;

    if (isLive && workshop.zoom_link) {
      // Live workshop - open Zoom link
      window.open(workshop.zoom_link, '_blank');
    } else if (workshop.recording_url || workshop.video_file_url) {
      // Recorded workshop - navigate to video viewer
      navigate(`/video?workshop=${workshop.entity_id || workshop.id}`);
    } else {
      // Fallback - navigate to workshop details
      navigate(`/product-details?type=workshop&id=${workshop.entity_id || workshop.id}`);
    }
  };

  // Handle lesson plan access
  const handleLessonPlanAccess = (product) => {
    navigate(`/lesson-plan-presentation?id=${product.entity_id || product.id}`);
  };


  const loadData = useCallback(async () => {
    // Skip loading if asset viewer is about to open/is open to prevent interference
    if (pdfViewerOpen) {
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const urlParams = new URLSearchParams(window.location.search);
      
      // Support both new entity-based URLs and legacy product URLs
      const type = urlParams.get('type');
      const id = urlParams.get('id');
      const productId = urlParams.get('product'); // Legacy support

      let entityId, entityType;
      
      if (type && id) {
        // New entity-based URL format
        entityId = id;
        entityType = type;
      } else if (productId) {
        // Legacy product URL format - default to 'product' type
        entityId = productId;
        entityType = 'product';
      } else {
        setError("מזהה מוצר חסר");
        setIsLoading(false);
        return;
      }

      setItemType(entityType);

      let purchases = [];
      try {
        if (currentUser) {
          // Try new schema first, then fallback to legacy
          purchases = await Purchase.filter({
            buyer_user_id: currentUser.id
          });

          // If no purchases found with new schema, try legacy email-based lookup
          if (purchases.length === 0) {
            purchases = await Purchase.filter({
              buyer_user_id: currentUser.id,
              payment_status: 'paid' // Legacy status check
            });
          }

          setUserPurchases(purchases);
        }
      } catch (e) {
        // User not logged in or cannot fetch user data
      }

      // Load item data based on type
      // Use the new product details endpoint that returns Product + Entity + Creator
      const { apiRequest } = await import('@/services/apiClient');

      // Build the API URL - always include game details for performance optimization
      // The API will only calculate game details if the product is actually a game
      const productDetailsUrl = `/entities/product/${entityId}/details?includeGameDetails=true`;

      const productDetails = await apiRequest(productDetailsUrl);

      if (!productDetails) {
        setError("מוצר לא נמצא");
        setIsLoading(false);
        return;
      }

      setItem(productDetails);


      // Use embedded purchase data from API response
      // The API returns purchase information directly in productDetails.purchase
      const userPurchase = productDetails.purchase || null;

      setPurchase(userPurchase);

      // Ensure the item includes the purchase data immediately
      setItem({...productDetails, purchase: userPurchase});

      // Check for openPdf URL parameter after data loads (for navigation from bundle modal)
      if (urlParams.get('openPdf') === 'true') {
        ludlog.ui('Processing openPdf parameter after data load');
        // Remove the parameter from URL
        urlParams.delete('openPdf');
        window.history.replaceState({}, '', `${window.location.pathname}?${urlParams.toString()}`);

        // Close bundle modal if it's open
        if (bundlePreviewModalOpen) {
          ludlog.ui('Closing bundle modal before opening PDF');
          setBundlePreviewModalOpen(false);
        }

        // Open asset viewer for file assets with a small delay to ensure modal closes
        setTimeout(() => {
          setPdfViewerOpen(true);
        }, 100);
      }
    } catch (e) {
      luderror.validation("Error loading product:", e);
      setError("שגיאה בטעינת הנתונים");
    }
    setIsLoading(false);
  }, [pdfViewerOpen, currentUser, bundlePreviewModalOpen]);

  useEffect(() => {
    if (!userLoading) {
      loadData();
    }
  }, [userLoading, loadData]);

  // Listen for cart changes to refresh purchase data
  useEffect(() => {
    const handleCartChange = () => {
      loadData();
    };

    // Listen for cart change events
    window.addEventListener('ludora-cart-changed', handleCartChange);

    return () => {
      window.removeEventListener('ludora-cart-changed', handleCartChange);
    };
  }, [loadData]);



  const getProductTypeLabel = (type) => {
    // Check if this is a bundle product first
    if (isBundle(item)) {
      return 'קיט';
    }
    return getProductTypeName(type, 'singular') || 'מוצר';
  };

  const getProductIcon = (type) => {
    // Check if this is a bundle product first
    if (isBundle(item)) {
      return <Package className="w-6 h-6" />;
    }

    switch (type) {
      case 'workshop':
        return <Calendar className="w-6 h-6" />;
      case 'course':
        return <BookOpen className="w-6 h-6" />;
      case 'file':
        return <FileText className="w-6 h-6" />;
      case 'lesson_plan':
        return <GraduationCap className="w-6 h-6" />;
      case 'bundle':
        return <Package className="w-6 h-6" />;
      default:
        return <Package className="w-6 h-6" />;
    }
  };

  // Helper functions for lesson plan data formatting
  const getLessonPlanGradeRange = (typeAttributes) => {
    if (!typeAttributes || !typeAttributes.grade_min || !typeAttributes.grade_max) {
      return null;
    }
    return formatGradeRange(typeAttributes.grade_min, typeAttributes.grade_max);
  };

  const formatLessonPlanDuration = (estimatedDuration) => {
    if (!estimatedDuration) return null;
    return `${estimatedDuration} דקות`;
  };

  const getFileRoleDisplayName = (role) => {
    switch (role) {
      case 'opening':
        return 'פתיחה';
      case 'body':
        return 'תוכן עיקרי';
      case 'audio':
        return 'קבצי שמע';
      case 'assets':
        return 'חומרי עזר';
      default:
        return role;
    }
  };

  const formatLessonPlanFilesSummary = (fileConfigs) => {
    if (!fileConfigs || !fileConfigs.files || !Array.isArray(fileConfigs.files)) {
      return null;
    }

    const summary = {
      opening: [],
      body: [],
      audio: [],
      assets: [],
      totalSlides: 0
    };

    fileConfigs.files.forEach(file => {
      if (file.file_role && summary[file.file_role] !== undefined) {
        summary[file.file_role].push(file);

        // Add slides for opening and body files
        if ((file.file_role === 'opening' || file.file_role === 'body') && file.slide_count) {
          summary.totalSlides += file.slide_count;
        }
      }
    });

    return summary;
  };


  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 mobile-safe-flex items-center justify-center mobile-safe-container">
        <LudoraLoadingSpinner
          message={detailsTexts.loading}
          status="loading"
          size="lg"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 mobile-safe-flex items-center justify-center mobile-padding mobile-safe-container">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-red-100 rounded-full mobile-safe-flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{error}</h2>
          <Button 
            onClick={() => window.history.back()}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full px-8 py-3"
          >
            <ArrowLeft className="w-5 h-5 ml-2" />
            חזור
          </Button>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 mobile-safe-flex items-center justify-center mobile-padding mobile-safe-container">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-red-100 rounded-full mobile-safe-flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{detailsTexts.notFound}</h2>
          <Button 
            onClick={() => window.history.back()}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full px-8 py-3"
          >
            <ArrowLeft className="w-5 h-5 ml-2" />
            חזור
          </Button>
        </div>
      </div>
    );
  }

  return (

    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 mobile-no-scroll-x mobile-safe-container">
      <div className="max-w-7xl mx-auto mobile-padding-x pb-4 sm:pb-6 md:pb-8 mobile-safe-container">

        {/* Enhanced Sticky Header with Back Button and Purchase Button */}
        {!hasAccess && (
          <div className="sticky top-0 z-50 left-0 right-0 w-full mb-4 sm:mb-6 md:mb-8 mobile-safe-container">
            <div className="bg-white/95 backdrop-blur-xl border-b border-gray-200/50 shadow-xl shadow-blue-500/5 w-full mobile-safe-container">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 md:py-5 mobile-safe-container">
                {/* Mobile: Stack vertically, Desktop: Single row */}
                <div className="mobile-safe-flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-2 mobile-safe-container mobile-no-scroll-x">

                  {/* Top Row: Back Button, Title, Price Badge */}
                  <div className="mobile-safe-flex items-center mobile-gap w-full sm:flex-1 min-w-0 mobile-safe-container mobile-no-scroll-x">
                    {/* Enhanced Back Button - Mobile-optimized touch target */}
                    <Button
                      variant="ghost"
                      onClick={() => window.history.back()}
                      className="text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-xl px-3 py-2.5 min-h-[44px] flex-shrink-0 font-medium transition-all duration-200 hover:scale-[1.02] mobile-safe-container"
                    >
                      <ArrowLeft className="w-5 h-5 ml-2" />
                      <span className="text-sm whitespace-nowrap hidden sm:inline">בחזרה ל{(() => {
                        if (isBundle(item)) {
                          // For bundles, show the bundled product type plural
                          const bundleComposition = getBundleComposition(item);
                          const firstType = Object.keys(bundleComposition)[0];
                          return getProductTypeName(firstType, 'plural');
                        }
                        return getProductTypeName(item.product_type || itemType, 'plural');
                      })()}</span>
                      <span className="text-sm whitespace-nowrap sm:hidden">חזרה</span>
                    </Button>

                    {/* Enhanced Product Title - Takes remaining space with proper mobile truncation */}
                    <div className="flex-1 min-w-0 mobile-safe-text mobile-safe-container px-2">
                      <div className="text-sm sm:text-base md:text-lg font-bold text-gray-900 mobile-truncate mobile-safe-text leading-tight">{item.title}</div>
                    </div>

                    {/* Enhanced Price Badge - Visible on all screens */}
                    <div className="flex-shrink-0">
                      <PriceDisplayTag
                        originalPrice={item.price}
                        discount={item.discount}
                        variant="badge"
                        size="lg"
                        showDiscount={false}
                        className="shadow-md hover:shadow-lg transition-shadow duration-200"
                      />
                    </div>
                  </div>

                  {/* Action Buttons Row - Mobile: Full width buttons, Desktop: Right-aligned */}
                  <div className="mobile-safe-flex items-center gap-2 w-full sm:w-auto sm:flex-shrink-0 mobile-safe-container mobile-no-scroll-x">
                    {/* Preview Button for Assets (Files and Lesson Plans) without access but with preview allowed */}
                    {(() => {
                      const isFile = item.product_type === 'file' || itemType === 'file';
                      const isPdf = item.file_type === 'pdf' || item.file_name?.toLowerCase().endsWith('.pdf');
                      const isLessonPlan = item.product_type === 'lesson_plan';
                      const isBundleOfFiles = isBundle(item) && getBundleComposition(item).file > 0;

                      // Check if file asset has preview enabled
                      const filePreviewEnabled = isFile && isPdf && item.allow_preview;

                      // Check if lesson plan asset has preview enabled
                      const lessonPlanPreviewEnabled = isLessonPlan && item.preview_info?.allow_slide_preview;

                      // Check if bundle has file items (any type of bundle can have preview if it contains files)
                      const bundlePreviewEnabled = isBundleOfFiles;

                      const shouldShow = !hasAccess && (filePreviewEnabled || lessonPlanPreviewEnabled || bundlePreviewEnabled);

                      return shouldShow;
                    })() && (
                      <Button
                        onClick={handleAssetPreview}
                        variant="outline"
                        className="rounded-full px-3 sm:px-4 py-3 min-h-[44px] w-full sm:w-auto text-sm border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400 border-2 font-medium transition-all duration-200 hover:scale-[1.02] shadow-sm hover:shadow-md"
                      >
                        <Eye className="w-5 h-5 ml-2" />
                        <span className="hidden sm:inline">תצוגה מקדימה</span>
                        <span className="sm:hidden">תצוגה</span>
                      </Button>
                    )}

                    {/* Enhanced Purchase Button - Mobile: Full width, Desktop: Auto width */}
                    <div className="w-full sm:w-auto mobile-safe-container">
                      <ProductActionBar
                        product={item}
                        userPurchases={userPurchases}
                        className="w-full px-4 sm:px-6 py-3 min-h-[44px] text-sm sm:text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02]"
                        size="lg"
                        showCartButton={false}
                        onFileAccess={handleFileAccess}
                        onPdfPreview={handleAssetPreview}
                        onCourseAccess={handleCourseAccess}
                        onWorkshopAccess={handleWorkshopAccess}
                        onLessonPlanAccess={handleLessonPlanAccess}
                        onBundleAccess={() => setBundlePreviewModalOpen(true)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl shadow-blue-500/10 overflow-hidden mb-8 mobile-safe-card">
          {(item.image_url && item.image_url !== '') ? (
            <div className="mobile-safe-flex flex-col">
              {/* Image Section - Full Width on Top */}
              <div className="relative w-full">
                <div className="h-64 sm:h-80 md:h-96 overflow-hidden">
                  <img
                    src={getProductImageUrl(item)}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Product Type Badge / Kit Badge */}
                <div className="absolute top-4 sm:top-6 right-4 sm:right-6">
                  {isBundle(item) ? (
                    <KitBadge
                      product={item}
                      variant="default"
                      size="lg"
                      className="bg-white/95 text-gray-800 shadow-lg"
                    />
                  ) : (
                    <Badge className="bg-white/95 text-gray-800 px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base font-bold rounded-full shadow-lg">
                      <div className="mobile-safe-flex items-center mobile-gap">
                        {getProductIcon(item.product_type)}
                        <span className="hidden sm:inline">{getProductTypeLabel(item.product_type)}</span>
                      </div>
                    </Badge>
                  )}
                </div>

                {/* Category Badge */}
                {item.category && (
                  <div className="absolute top-4 sm:top-6 left-4 sm:left-6">
                    <Badge variant="outline" className="bg-white/95 border-0 font-medium px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base rounded-full shadow-lg">
                      {item.category}
                    </Badge>
                  </div>
                )}

                {/* Price Badge */}
                <div className="absolute bottom-4 sm:bottom-6 right-4 sm:right-6">
                  <PriceDisplayTag
                    originalPrice={item.price}
                    discount={item.discount}
                    variant="badge"
                    size="lg"
                    showDiscount={false}
                  />
                </div>
              </div>

              {/* Content Section - Full Width Below Image */}
              <div className="mobile-padding mobile-safe-container">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4 sm:mb-6 leading-tight text-right mobile-safe-text">
                  {item.title}
                </h1>

                {/* Access Status */}
                {(itemType === 'file' || item.product_type === 'file' || item.product_type === 'lesson_plan') ? (
                  <div className="mb-4 sm:mb-6">
                    <ProductAccessStatus
                      product={item}
                      userPurchases={userPurchases}
                      variant="productDetails"
                    />
                  </div>
                ) : hasAccess && (
                  <Alert className="mb-4 sm:mb-6 border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      <div className="font-medium">{detailsTexts.alreadyOwned}</div>
                      {purchaseUtils.hasLifetimeAccess(purchase) ? (
                        <div className="text-xs mt-1">{detailsTexts.lifetimeAccess}</div>
                      ) : (
                        <div className="text-xs mt-1">
                          {detailsTexts.accessUntil} {purchaseUtils.formatAccessExpiry(purchase)}
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                {item.short_description && (
                  <p className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4 leading-relaxed text-right mobile-safe-text">
                    {item.short_description}
                  </p>
                )}

                {item.description && (
                  <p className="text-base sm:text-lg text-gray-700 mb-6 sm:mb-8 leading-relaxed text-right mobile-safe-text">
                    {item.description}
                  </p>
                )}

                {/* Action Buttons */}
                <div className="space-y-3 sm:space-y-4">
                  <ProductActionBar
                    product={item}
                    userPurchases={userPurchases}
                    className="py-3 sm:py-4 text-base sm:text-lg font-semibold rounded-2xl shadow-lg"
                    size="lg"
                    fullWidth={true}
                    showCartButton={true}
                    onFileAccess={handleFileAccess}
                    onPdfPreview={handleAssetPreview}
                    onCourseAccess={handleCourseAccess}
                    onWorkshopAccess={handleWorkshopAccess}
                    onLessonPlanAccess={handleLessonPlanAccess}
                    onBundleAccess={() => setBundlePreviewModalOpen(true)}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="mobile-padding mobile-safe-container">
              {/* Header without image */}
              <div className="text-center mobile-safe-container">
                <div className="mobile-safe-flex flex-wrap items-center mobile-gap mb-4 sm:mb-6 justify-center">
                  {isBundle(item) ? (
                    <KitBadge
                      product={item}
                      variant="default"
                      size="lg"
                      className="bg-blue-600 text-white"
                    />
                  ) : (
                    <Badge className="bg-blue-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base font-bold rounded-full">
                      <div className="mobile-safe-flex items-center mobile-gap">
                        {getProductIcon(item.product_type)}
                        <span className="hidden sm:inline">{getProductTypeLabel(item.product_type)}</span>
                      </div>
                    </Badge>
                  )}
                  {item.category && (
                    <Badge variant="outline" className="text-sm sm:text-base font-medium px-3 sm:px-4 py-1.5 sm:py-2 rounded-full">
                      {item.category}
                    </Badge>
                  )}
                  <PriceDisplayTag
                    originalPrice={item.price}
                    discount={item.discount}
                    variant="badge"
                    size="md"
                    showDiscount={false}
                  />
                </div>

                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 sm:mb-6 leading-tight mobile-safe-text">
                  {item.title}
                </h1>

                {/* Access Status */}
                {(itemType === 'file' || item.product_type === 'file' || item.product_type === 'lesson_plan') ? (
                  <div className="mb-4 sm:mb-6">
                    <ProductAccessStatus
                      product={item}
                      userPurchases={userPurchases}
                      variant="productDetails"
                    />
                  </div>
                ) : hasAccess && (
                  <Alert className="mb-4 sm:mb-6 border-green-200 bg-green-50 max-w-2xl mx-auto">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      <div className="font-medium">{detailsTexts.alreadyOwned}</div>
                      {purchaseUtils.hasLifetimeAccess(purchase) ? (
                        <div className="text-xs mt-1">{detailsTexts.lifetimeAccess}</div>
                      ) : (
                        <div className="text-xs mt-1">
                          {detailsTexts.accessUntil} {purchaseUtils.formatAccessExpiry(purchase)}
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                {item.short_description && (
                  <p className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-800 leading-relaxed mb-4 sm:mb-6 max-w-3xl mx-auto mobile-safe-text">
                    {item.short_description}
                  </p>
                )}
                {item.description && (
                  <p className="text-base sm:text-lg md:text-xl text-gray-700 leading-relaxed mb-6 sm:mb-8 max-w-3xl mx-auto mobile-safe-text">
                    {item.description}
                  </p>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col gap-3 sm:gap-4 max-w-md mx-auto">
                  <ProductActionBar
                    product={item}
                    userPurchases={userPurchases}
                    className="py-3 sm:py-4 px-8 sm:px-12 text-base sm:text-lg font-semibold rounded-2xl shadow-xl"
                    size="lg"
                    fullWidth={true}
                    showCartButton={true}
                    onFileAccess={handleFileAccess}
                    onPdfPreview={handleAssetPreview}
                    onCourseAccess={handleCourseAccess}
                    onWorkshopAccess={handleWorkshopAccess}
                    onLessonPlanAccess={handleLessonPlanAccess}
                    onBundleAccess={() => setBundlePreviewModalOpen(true)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Marketing Video - Both YouTube and uploaded videos */}
        {item.marketing_video_type && item.marketing_video_id && (
          <Card className="mb-4 sm:mb-6 md:mb-8 shadow-xl bg-white/90 backdrop-blur-xl border-0 rounded-2xl sm:rounded-3xl overflow-hidden w-full max-w-full">
            <CardContent className="p-3 sm:p-4 md:p-6 lg:p-8">
              {item.marketing_video_title && (
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4 md:mb-6 text-center text-gray-900">
                  {item.marketing_video_title}
                </h3>
              )}
              <div className="w-full max-w-full">
                <div className="aspect-video rounded-lg sm:rounded-2xl overflow-hidden shadow-lg sm:shadow-xl md:shadow-2xl">
                  {item.marketing_video_type === 'youtube' ? (
                    <iframe
                      width="100%"
                      height="100%"
                      src={`https://www.youtube.com/embed/${item.marketing_video_id}`}
                      title={item.marketing_video_title || "YouTube video player"}
                      style={{ border: 0 }}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <SecureVideoPlayer
                      videoUrl={getMarketingVideoUrl(item)}
                      title={item.marketing_video_title || "Marketing Video"}
                      className="h-full w-full object-cover"
                      contentType="marketing"
                    />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Workshop Video for Recorded Workshops */}
        {item.product_type === 'workshop' &&
         item.workshop_type === 'recorded' &&
         item.video_file_url && (
          <Card className="mb-4 sm:mb-6 md:mb-8 shadow-xl bg-white/90 backdrop-blur-xl border-0 rounded-2xl sm:rounded-3xl overflow-hidden w-full max-w-full">
            <CardContent className="p-3 sm:p-4 md:p-6 lg:p-8">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-3 sm:mb-4 text-center">{getProductTypeName('workshop', 'singular')} מוקלטת</h2>

              {purchase ? ( // Using 'purchase' which holds the active purchase for this product
                <div className="w-full max-w-full">
                  <VideoPlayer
                    file_uri={item.video_file_url}
                    is_private={item.video_file_is_private}
                    product_id={item.id}
                    className="aspect-video w-full rounded-lg sm:rounded-2xl overflow-hidden"
                    title={item.title}
                  />
                </div>
              ) : (
                <div className="bg-gray-100 rounded-lg sm:rounded-2xl p-4 sm:p-6 md:p-8 text-center">
                  <Play className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-3 sm:mb-4" />
                  <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">צפייה ב{getProductTypeName('workshop', 'singular')} המוקלטת זמינה לאחר רכישה</p>
                  <ProductActionBar
                    product={item}
                    userPurchases={userPurchases}
                    className="py-3 px-6 sm:py-4 sm:px-12 text-base sm:text-lg font-semibold rounded-xl sm:rounded-2xl shadow-xl"
                    size="lg"
                    showCartButton={false}
                    onFileAccess={handleFileAccess}
                    onPdfPreview={handleAssetPreview}
                    onCourseAccess={handleCourseAccess}
                    onWorkshopAccess={handleWorkshopAccess}
                    onLessonPlanAccess={handleLessonPlanAccess}
                    onBundleAccess={() => setBundlePreviewModalOpen(true)}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Main Content Grid */}
        <div className="mobile-safe-flex flex-col lg:grid lg:grid-cols-3 mobile-gap">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6 lg:space-y-8 mobile-safe-container">

            {/* General Video Section - only show if not a recorded workshop video handled above */}
            {item.video_file_url && !(item.product_type === 'workshop' && item.workshop_type === 'recorded') && (
              <Card className="shadow-xl bg-white/90 backdrop-blur-xl border-0 rounded-2xl sm:rounded-3xl overflow-hidden w-full max-w-full">
                <CardContent className="p-3 sm:p-4 md:p-6 lg:p-8">
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4 md:mb-6 text-center text-gray-900">וידאו {getProductTypeName('workshop', 'singular')}</h3>
                  <div className="w-full max-w-full">
                    <div className="aspect-video rounded-lg sm:rounded-2xl overflow-hidden shadow-lg sm:shadow-xl md:shadow-2xl">
                      {item.video_file_is_private ? (
                        // Use VideoPlayer for private video files
                        <VideoPlayer
                          file_uri={item.video_file_url}
                          product_id={item.id}
                          title={item.title}
                          className="w-full h-full object-cover"
                          is_private={item.video_file_is_private} // Ensure is_private prop is passed
                        />
                      ) : (
                        // Use direct video element for public URLs
                        <video controls className="w-full h-full object-cover">
                          <source src={item.video_file_url} type="video/mp4" />
                          הדפדפן שלך לא תומך בהצגת וידאו.
                        </video>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Game Details Section - Show game-specific information */}
            {item.product_type === 'game' && item.game_details && (
              <GameDetailsSection gameDetails={item.game_details} />
            )}

            {/* Product-specific content */}
            {item.product_type === 'workshop' && (
              <Card className="shadow-xl bg-white/90 backdrop-blur-xl border-0 rounded-2xl sm:rounded-3xl w-full max-w-full overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-t-2xl sm:rounded-t-3xl">
                  <CardTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl">
                    <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
                    פרטי ה{getProductTypeName('workshop', 'singular')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 md:p-8">
                  <div className="grid grid-cols-1 gap-4 sm:gap-6 overflow-hidden">
                    {item.scheduled_date && (
                      <div className="flex items-center gap-3 p-4 sm:p-6 bg-blue-50 rounded-xl sm:rounded-2xl overflow-hidden">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-100 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
                          <Calendar className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600" />
                        </div>
                        <div className="text-right min-w-0 flex-1">
                          <p className="text-xs sm:text-sm text-gray-600 font-medium">תאריך ושעה</p>
                          <p className="font-bold text-gray-900 text-sm sm:text-lg break-words">
                            {format(new Date(item.scheduled_date), 'dd/MM/yyyy HH:mm', { locale: he })}
                          </p>
                        </div>
                      </div>
                    )}

                    {item.duration_minutes && (
                      <div className="flex items-center gap-3 p-4 sm:p-6 bg-green-50 rounded-xl sm:rounded-2xl overflow-hidden">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-green-100 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
                          <Clock className="w-6 h-6 sm:w-7 sm:h-7 text-green-600" />
                        </div>
                        <div className="text-right min-w-0 flex-1">
                          <p className="text-xs sm:text-sm text-gray-600 font-medium">משך</p>
                          <p className="font-bold text-gray-900 text-sm sm:text-base break-words">{item.duration_minutes} דקות</p>
                        </div>
                      </div>
                    )}

                    {item.max_participants && (
                      <div className="flex items-center gap-3 p-4 sm:p-6 bg-purple-50 rounded-xl sm:rounded-2xl overflow-hidden">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-purple-100 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
                          <Users className="w-6 h-6 sm:w-7 sm:h-7 text-purple-600" />
                        </div>
                        <div className="text-right min-w-0 flex-1">
                          <p className="text-xs sm:text-sm text-gray-600 font-medium">משתתפים מקסימלי</p>
                          <p className="font-bold text-gray-900 text-sm sm:text-lg break-words">{item.max_participants}</p>
                        </div>
                      </div>
                    )}

                    {item.workshop_type && (
                      <div className="flex items-center gap-3 p-4 sm:p-6 bg-indigo-50 rounded-xl sm:rounded-2xl overflow-hidden">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-indigo-100 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
                          {item.workshop_type === 'online_live' ? (
                            <Monitor className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-600" />
                          ) : item.workshop_type === 'recorded' ? (
                            <Video className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-600" />
                          ) : (
                            <Globe className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-600" />
                          )}
                        </div>
                        <div className="text-right min-w-0 flex-1">
                          <p className="text-xs sm:text-sm text-gray-600 font-medium">סוג {getProductTypeName('workshop', 'singular')}</p>
                          <p className="font-bold text-gray-900 text-sm sm:text-lg break-words">
                            {item.workshop_type === 'online_live' ? 'אונליין בזמן אמת' :
                             item.workshop_type === 'recorded' ? 'מוקלט' : 'אונליין + מוקלט'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {item.product_type === 'file' && !isBundle(item) && (
              <div className="bg-white shadow-xl rounded-2xl sm:rounded-3xl w-full max-w-full overflow-hidden">
                <div className="bg-gradient-to-r from-purple-500 to-pink-600 text-white p-4 sm:p-6">
                  <h3 className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl font-semibold">
                    <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
                    פרטי ה{getProductTypeName('file', 'singular')}
                  </h3>
                </div>
                <div className="p-4 sm:p-6 md:p-8">
                  <div className="grid grid-cols-1 gap-4 sm:gap-6 overflow-hidden">
                    {/* File Type */}
                    {item.file_type && (
                      <div className="flex items-center gap-3 p-4 sm:p-6 bg-purple-50 rounded-xl sm:rounded-2xl overflow-hidden">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-purple-100 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
                          <FileText className="w-6 h-6 sm:w-7 sm:h-7 text-purple-600" />
                        </div>
                        <div className="text-right min-w-0 flex-1">
                          <p className="text-xs sm:text-sm text-gray-600 font-medium">{detailsTexts.fileType}</p>
                          <p className="font-bold text-gray-900 text-sm sm:text-lg break-words">{item.file_type.toUpperCase()}</p>
                        </div>
                      </div>
                    )}

                    {/* Grade Range */}
                    {item.type_attributes && formatGradeRange(item.type_attributes.grade_min, item.type_attributes.grade_max) && (
                      <div className="flex items-center gap-3 p-4 sm:p-6 bg-orange-50 rounded-xl sm:rounded-2xl overflow-hidden">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-orange-100 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
                          <GraduationCap className="w-6 h-6 sm:w-7 sm:h-7 text-orange-600" />
                        </div>
                        <div className="text-right min-w-0 flex-1">
                          <p className="text-xs sm:text-sm text-gray-600 font-medium">כיתות יעד</p>
                          <p className="font-bold text-gray-900 text-sm sm:text-lg break-words">
                            {formatGradeRange(item.type_attributes.grade_min, item.type_attributes.grade_max)}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Subject */}
                    {item.type_attributes && item.type_attributes.subject && (
                      <div className="flex items-center gap-3 p-4 sm:p-6 bg-cyan-50 rounded-xl sm:rounded-2xl overflow-hidden">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-cyan-100 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
                          <BookOpen className="w-6 h-6 sm:w-7 sm:h-7 text-cyan-600" />
                        </div>
                        <div className="text-right min-w-0 flex-1">
                          <p className="text-xs sm:text-sm text-gray-600 font-medium">מקצוע</p>
                          <p className="font-bold text-gray-900 text-sm sm:text-lg break-words">
                            {item.type_attributes.subject}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Creator */}
                    {item.creator && (
                      <div className="flex items-center gap-3 p-4 sm:p-6 bg-blue-50 rounded-xl sm:rounded-2xl overflow-hidden">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-100 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
                          <Users className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600" />
                        </div>
                        <div className="text-right min-w-0 flex-1">
                          <p className="text-xs sm:text-sm text-gray-600 font-medium">יוצר התוכן</p>
                          <p className="font-bold text-gray-900 text-sm sm:text-lg break-words">{item.creator.full_name}</p>
                          {item.creator.is_content_creator && (
                            <Badge className="mt-1 bg-blue-600 text-white text-xs">יוצר תוכן</Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Access Duration */}
                    {item.access_days !== undefined && item.access_days !== null && (
                      <div className="flex items-center gap-3 p-4 sm:p-6 bg-green-50 rounded-xl sm:rounded-2xl overflow-hidden">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-green-100 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
                          <Clock className="w-6 h-6 sm:w-7 sm:h-7 text-green-600" />
                        </div>
                        <div className="text-right min-w-0 flex-1">
                          <p className="text-xs sm:text-sm text-gray-600 font-medium">זמן גישה</p>
                          <p className="font-bold text-gray-900 text-sm sm:text-lg break-words">
                            {item.access_days === null || item.access_days === undefined ? 'גישה לכל החיים' : `${item.access_days} ימים`}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Last Updated */}
                    {item.updated_at && (
                      <div className="flex items-center gap-3 p-4 sm:p-6 bg-indigo-50 rounded-xl sm:rounded-2xl overflow-hidden">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-indigo-100 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
                          <Calendar className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-600" />
                        </div>
                        <div className="text-right min-w-0 flex-1">
                          <p className="text-xs sm:text-sm text-gray-600 font-medium">עודכן לאחרונה</p>
                          <p className="font-bold text-gray-900 text-sm sm:text-lg break-words">
                            {format(new Date(item.updated_at), 'dd/MM/yyyy', { locale: he })}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Bundle Details Section - Shows all products in the bundle */}
            {isBundle(item) && (
              <div className="bg-white shadow-xl rounded-2xl sm:rounded-3xl w-full max-w-full overflow-hidden">
                <div className="bg-gradient-to-r from-purple-500 to-pink-600 text-white p-4 sm:p-6">
                  <h3 className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl font-semibold">
                    <Package className="w-5 h-5 sm:w-6 sm:h-6" />
                    פרטי הקבצים בקיט
                  </h3>
                </div>
                <div className="p-4 sm:p-6 md:p-8">
                  <div className="grid grid-cols-1 gap-4 sm:gap-6 overflow-hidden">
                    {/* Bundle Summary */}
                    <div className="flex items-center gap-3 p-4 sm:p-6 bg-purple-50 rounded-xl sm:rounded-2xl overflow-hidden">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 bg-purple-100 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
                        <Package className="w-6 h-6 sm:w-7 sm:h-7 text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="text-sm font-medium text-gray-900 mb-1">הרכב הקיט</div>
                        <div className="text-xs sm:text-sm text-gray-600 break-words">
                          {getBundleCompositionLabel(getBundleComposition(item))}
                        </div>
                      </div>
                    </div>

                    {/* Individual Products in Bundle */}
                    {item.type_attributes?.bundle_items?.map((bundleItem, index) => (
                      <div key={bundleItem.product_id || index} className="flex items-center gap-3 p-4 sm:p-6 bg-blue-50 rounded-xl sm:rounded-2xl overflow-hidden">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-100 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
                          <FileText className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <div className="text-sm font-medium text-gray-900 mb-1">
                            {bundleItem._metadata?.title || `מוצר ${index + 1}`}
                          </div>
                          <div className="text-xs sm:text-sm text-gray-600 break-words">
                            <div>סוג: {getProductTypeName(bundleItem.product_type, 'singular')}</div>
                            {bundleItem._metadata?.price && (
                              <div className="mt-1">מחיר יחידה: ₪{bundleItem._metadata.price}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Bundle Savings */}
                    {item.type_attributes?.savings_percentage && (
                      <div className="flex items-center gap-3 p-4 sm:p-6 bg-green-50 rounded-xl sm:rounded-2xl overflow-hidden">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-green-100 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
                          <CheckCircle className="w-6 h-6 sm:w-7 sm:h-7 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <div className="text-sm font-medium text-gray-900 mb-1">חיסכון בקיט</div>
                          <div className="text-xs sm:text-sm text-gray-600 break-words">
                            <div>{item.type_attributes.savings_percentage}% חיסכון לעומת רכישה נפרדת</div>
                            {item.type_attributes?.original_total_price && (
                              <div className="mt-1">
                                מחיר מקורי: ₪{item.type_attributes.original_total_price} •
                                מחיר קיט: ₪{item.price}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Lesson Plan Details Section */}
            {item.product_type === 'lesson_plan' && (
              <div className="bg-white shadow-xl rounded-2xl sm:rounded-3xl w-full max-w-full overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-green-600 text-white p-4 sm:p-6">
                  <h3 className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl font-semibold">
                    <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6" />
                    פרטי ה{getProductTypeName('lesson_plan', 'singular')}
                  </h3>
                </div>
                <div className="p-4 sm:p-6 md:p-8">
                  <div className="grid grid-cols-1 gap-4 sm:gap-6 overflow-hidden">
                    {/* Grade Range */}
                    {item.type_attributes && getLessonPlanGradeRange(item.type_attributes) && (
                      <div className="flex items-center gap-3 p-4 sm:p-6 bg-orange-50 rounded-xl sm:rounded-2xl overflow-hidden">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-orange-100 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
                          <GraduationCap className="w-6 h-6 sm:w-7 sm:h-7 text-orange-600" />
                        </div>
                        <div className="text-right min-w-0 flex-1">
                          <p className="text-xs sm:text-sm text-gray-600 font-medium">כיתות יעד</p>
                          <p className="font-bold text-gray-900 text-sm sm:text-lg break-words">
                            {getLessonPlanGradeRange(item.type_attributes)}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Subject */}
                    {item.type_attributes && item.type_attributes.subject && (
                      <div className="flex items-center gap-3 p-4 sm:p-6 bg-cyan-50 rounded-xl sm:rounded-2xl overflow-hidden">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-cyan-100 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
                          <BookOpen className="w-6 h-6 sm:w-7 sm:h-7 text-cyan-600" />
                        </div>
                        <div className="text-right min-w-0 flex-1">
                          <p className="text-xs sm:text-sm text-gray-600 font-medium">מקצוע</p>
                          <p className="font-bold text-gray-900 text-sm sm:text-lg break-words">
                            {item.type_attributes.subject}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Context/Theme */}
                    {(item.context || (item.type_attributes && item.type_attributes.context)) && (
                      <div className="flex items-center gap-3 p-4 sm:p-6 bg-purple-50 rounded-xl sm:rounded-2xl overflow-hidden">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-purple-100 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
                          <Tag className="w-6 h-6 sm:w-7 sm:h-7 text-purple-600" />
                        </div>
                        <div className="text-right min-w-0 flex-1">
                          <p className="text-xs sm:text-sm text-gray-600 font-medium">הקשר/נושא</p>
                          <p className="font-bold text-gray-900 text-sm sm:text-lg break-words">
                            {item.context || item.type_attributes?.context}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Estimated Duration */}
                    {(item.estimated_duration || (item.type_attributes && item.type_attributes.estimated_duration)) && (
                      <div className="flex items-center gap-3 p-4 sm:p-6 bg-green-50 rounded-xl sm:rounded-2xl overflow-hidden">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-green-100 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
                          <Clock className="w-6 h-6 sm:w-7 sm:h-7 text-green-600" />
                        </div>
                        <div className="text-right min-w-0 flex-1">
                          <p className="text-xs sm:text-sm text-gray-600 font-medium">משך שיעור משוער</p>
                          <p className="font-bold text-gray-900 text-sm sm:text-lg break-words">
                            {formatLessonPlanDuration(item.estimated_duration || item.type_attributes?.estimated_duration)}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Total Slides */}
                    {item.total_slides && (
                      <div className="flex items-center gap-3 p-4 sm:p-6 bg-indigo-50 rounded-xl sm:rounded-2xl overflow-hidden">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-indigo-100 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
                          <FileText className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-600" />
                        </div>
                        <div className="text-right min-w-0 flex-1">
                          <p className="text-xs sm:text-sm text-gray-600 font-medium">סה״כ שקפים</p>
                          <p className="font-bold text-gray-900 text-sm sm:text-lg break-words">
                            {item.total_slides} שקפים
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Creator */}
                    {item.creator && (
                      <div className="flex items-center gap-3 p-4 sm:p-6 bg-blue-50 rounded-xl sm:rounded-2xl overflow-hidden">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-100 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
                          <Users className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600" />
                        </div>
                        <div className="text-right min-w-0 flex-1">
                          <p className="text-xs sm:text-sm text-gray-600 font-medium">יוצר התוכן</p>
                          <p className="font-bold text-gray-900 text-sm sm:text-lg break-words">{item.creator.full_name}</p>
                          {item.creator.is_content_creator && (
                            <Badge className="mt-1 bg-blue-600 text-white text-xs">יוצר תוכן</Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Last Updated */}
                    {item.updated_at && (
                      <div className="flex items-center gap-3 p-4 sm:p-6 bg-gray-50 rounded-xl sm:rounded-2xl overflow-hidden">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gray-100 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
                          <Calendar className="w-6 h-6 sm:w-7 sm:h-7 text-gray-600" />
                        </div>
                        <div className="text-right min-w-0 flex-1">
                          <p className="text-xs sm:text-sm text-gray-600 font-medium">עודכן לאחרונה</p>
                          <p className="font-bold text-gray-900 text-sm sm:text-lg break-words">
                            {format(new Date(item.updated_at), 'dd/MM/yyyy', { locale: he })}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Lesson Plan Files Summary Section */}
            {item.product_type === 'lesson_plan' && item.file_configs && formatLessonPlanFilesSummary(item.file_configs) && (
              <div className="bg-white shadow-xl rounded-2xl sm:rounded-3xl w-full max-w-full overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-500 to-blue-600 text-white p-4 sm:p-6">
                  <h3 className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl font-semibold">
                    <FolderOpen className="w-5 h-5 sm:w-6 sm:h-6" />
                    קבצי השיעור
                  </h3>
                </div>
                <div className="p-4 sm:p-6 md:p-8">
                  <div className="grid grid-cols-1 gap-4 sm:gap-6 overflow-hidden">
                    {(() => {
                      const filesSummary = formatLessonPlanFilesSummary(item.file_configs);

                      return (
                        <>
                          {/* Opening Files */}
                          {filesSummary.opening && filesSummary.opening.length > 0 && (
                            <div className="flex items-center gap-3 p-4 sm:p-6 bg-emerald-50 rounded-xl sm:rounded-2xl overflow-hidden">
                              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-emerald-100 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
                                <Play className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-600" />
                              </div>
                              <div className="text-right min-w-0 flex-1">
                                <p className="text-xs sm:text-sm text-gray-600 font-medium">{getFileRoleDisplayName('opening')}</p>
                                <div className="space-y-1">
                                  {filesSummary.opening.map((file, index) => (
                                    <p key={index} className="font-bold text-gray-900 text-sm sm:text-base break-words">
                                      {file.filename} {file.slide_count && `(${file.slide_count} שקפים)`}
                                    </p>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Body Files */}
                          {filesSummary.body && filesSummary.body.length > 0 && (
                            <div className="flex items-center gap-3 p-4 sm:p-6 bg-blue-50 rounded-xl sm:rounded-2xl overflow-hidden">
                              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-100 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
                                <BookOpen className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600" />
                              </div>
                              <div className="text-right min-w-0 flex-1">
                                <p className="text-xs sm:text-sm text-gray-600 font-medium">{getFileRoleDisplayName('body')}</p>
                                <div className="space-y-1">
                                  {filesSummary.body.map((file, index) => (
                                    <p key={index} className="font-bold text-gray-900 text-sm sm:text-base break-words">
                                      {file.filename} {file.slide_count && `(${file.slide_count} שקפים)`}
                                    </p>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Audio Files */}
                          {filesSummary.audio && filesSummary.audio.length > 0 && (
                            <div className="flex items-center gap-3 p-4 sm:p-6 bg-amber-50 rounded-xl sm:rounded-2xl overflow-hidden">
                              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-amber-100 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
                                <Volume2 className="w-6 h-6 sm:w-7 sm:h-7 text-amber-600" />
                              </div>
                              <div className="text-right min-w-0 flex-1">
                                <p className="text-xs sm:text-sm text-gray-600 font-medium">{getFileRoleDisplayName('audio')}</p>
                                <p className="font-bold text-gray-900 text-sm sm:text-lg break-words">
                                  {filesSummary.audio.length} קבצי שמע
                                </p>
                                {filesSummary.audio.length <= 3 && (
                                  <div className="space-y-1 mt-1">
                                    {filesSummary.audio.map((file, index) => (
                                      <p key={index} className="text-xs sm:text-sm text-gray-600 break-words">
                                        {file.filename}
                                      </p>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Asset Files */}
                          {filesSummary.assets && filesSummary.assets.length > 0 && (
                            <div className="bg-purple-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 overflow-hidden">
                              <div className="flex items-center gap-3 mb-3">
                                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-purple-100 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
                                  <PaperclipIcon className="w-6 h-6 sm:w-7 sm:h-7 text-purple-600" />
                                </div>
                                <div className="text-right min-w-0 flex-1">
                                  <p className="text-xs sm:text-sm text-gray-600 font-medium">{getFileRoleDisplayName('assets')}</p>
                                  <p className="font-bold text-gray-900 text-sm sm:text-lg break-words">
                                    {filesSummary.assets.length} קבצי עזר
                                  </p>
                                </div>
                              </div>
                              {filesSummary.assets.length <= 3 && (
                                <div className="space-y-2 mt-3">
                                  {filesSummary.assets.map((file, index) => (
                                    <div key={index} className="flex items-center justify-between gap-3 p-3 bg-white rounded-lg border border-purple-200">
                                      <div className="text-right min-w-0 flex-1">
                                        <p className="text-xs sm:text-sm text-gray-800 font-medium break-words">
                                          {file.filename}
                                        </p>
                                      </div>
                                      {file.file_id && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={async () => {
                                            if (!hasAccess) {
                                              // Show access denied message
                                              alert('נדרשת רכישה כדי להוריד קובץ זה');
                                              return;
                                            }

                                            try {
                                              // Use apiDownload to get blob with auth headers
                                              const blob = await apiDownload(`/assets/download/file/${file.file_id}`);

                                              // Create blob URL and trigger download
                                              const blobUrl = URL.createObjectURL(blob);
                                              const link = document.createElement('a');
                                              link.href = blobUrl;
                                              link.download = file.filename || 'download';
                                              document.body.appendChild(link);
                                              link.click();
                                              document.body.removeChild(link);

                                              // Clean up blob URL after a delay
                                              setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
                                            } catch (error) {
                                              luderror.media('Error downloading asset file:', error);
                                              alert('שגיאה בהורדת הקובץ');
                                            }
                                          }}
                                          className={`flex-shrink-0 ${hasAccess ? 'bg-purple-600 hover:bg-purple-700 text-white border-purple-600' : 'bg-gray-100 text-gray-600 border-gray-300'} rounded-lg px-3 py-2 font-medium transition-all duration-200`}
                                          title={hasAccess ? "הורד קובץ" : "נדרשת רכישה"}
                                        >
                                          <Download className="w-4 h-4 ml-1" />
                                          <span className="text-xs">הורד</span>
                                        </Button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Total Slides Summary */}
                          {filesSummary.totalSlides > 0 && (
                            <div className="flex items-center gap-3 p-4 sm:p-6 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl sm:rounded-2xl overflow-hidden border-2 border-cyan-200">
                              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-r from-cyan-100 to-blue-100 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
                                <FileText className="w-6 h-6 sm:w-7 sm:h-7 text-cyan-600" />
                              </div>
                              <div className="text-right min-w-0 flex-1">
                                <p className="text-xs sm:text-sm text-cyan-700 font-medium">סה״כ שקפים מקובצי פתיחה ותוכן</p>
                                <p className="font-bold text-cyan-900 text-lg sm:text-xl break-words">
                                  {filesSummary.totalSlides} שקפים
                                </p>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* Teacher Notes Section */}
            {item.product_type === 'lesson_plan' && item.teacher_notes && item.teacher_notes.trim() && (
              <div className="bg-white shadow-xl rounded-2xl sm:rounded-3xl w-full max-w-full overflow-hidden">
                <div className="bg-gradient-to-r from-amber-500 to-yellow-600 text-white p-4 sm:p-6">
                  <h3 className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl font-semibold">
                    <StickyNote className="w-5 h-5 sm:w-6 sm:h-6" />
                    הנחיות למורה
                  </h3>
                </div>
                <div className="p-4 sm:p-6 md:p-8 bg-amber-50/30">
                  <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border-l-4 border-amber-400">
                    <div className="text-right whitespace-pre-wrap text-gray-800 text-sm sm:text-base leading-relaxed">
                      {item.teacher_notes}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Course Modules */}
            {item.product_type === 'course' && item.course_modules && item.course_modules.length > 0 && (
              <Card className="shadow-xl bg-white/90 backdrop-blur-xl border-0 rounded-2xl sm:rounded-3xl w-full max-w-full overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-t-2xl sm:rounded-t-3xl">
                  <CardTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl">
                    <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />
                    {detailsTexts.courseModules}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 md:p-8">
                  <div className="space-y-3 sm:space-y-4">
                    {item.course_modules.map((module, index) => (
                      <div key={index} className="border border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 hover:bg-gray-50 transition-colors bg-white shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-4">
                          <div className="flex-1 text-right">
                            <h4 className="font-bold text-gray-900 mb-1 sm:mb-2 text-base sm:text-lg">
                              {index + 1}. {module.title}
                            </h4>
                            {module.description && (
                              <p className="text-gray-600 text-sm sm:text-base mb-2">{module.description}</p>
                            )}
                          </div>
                          {module.duration_minutes && (
                            <Badge variant="outline" className="text-xs sm:text-sm px-2 sm:px-3 py-1 rounded-full self-end sm:self-start sm:mr-6">
                              {module.duration_minutes} דק'
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

          </div>

          {/* Sidebar */}
          <div className="space-y-4 sm:space-y-6 mobile-safe-container">
            {/* Product Info - Only show if there's content to display */}
            {(() => {
              const hasTargetAudience = item.target_audience;
              const hasDuration = item.duration_minutes && item.product_type !== 'workshop';
              const hasCourseModules = item.product_type === 'course' && item.course_modules;
              const hasTags = item.tags && item.tags.length > 0 && item.tags.some(tag => tag && tag.trim());

              return hasTargetAudience || hasDuration || hasCourseModules || hasTags;
            })() && (
              <Card className="shadow-xl bg-white/95 backdrop-blur-xl border-0 rounded-2xl sm:rounded-3xl overflow-hidden w-full max-w-full">
                <CardHeader className="bg-gradient-to-r from-indigo-500 to-blue-600 text-white rounded-t-2xl sm:rounded-t-3xl overflow-hidden">
                  <CardTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl min-w-0">
                    <Info className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                    <span className="truncate">{detailsTexts.productInfo}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4 overflow-hidden">
                  {item.target_audience && (
                    <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                        <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                      </div>
                      <div className="text-right min-w-0 flex-1">
                        <p className="text-xs sm:text-sm text-gray-600 font-medium">{detailsTexts.targetAudience}</p>
                        <p className="font-bold text-gray-900 text-sm sm:text-base break-words">{item.target_audience}</p>
                      </div>
                    </div>
                  )}

                  {item.duration_minutes && item.product_type !== 'workshop' && (
                    <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                        <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                      </div>
                      <div className="text-right min-w-0 flex-1">
                        <p className="text-xs sm:text-sm text-gray-600 font-medium">משך</p>
                        <p className="font-bold text-gray-900 text-sm sm:text-base break-words">{item.duration_minutes} {detailsTexts.minutes}</p>
                      </div>
                    </div>
                  )}

                  {item.product_type === 'course' && item.course_modules && (
                    <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                      </div>
                      <div className="text-right min-w-0 flex-1">
                        <p className="text-xs sm:text-sm text-gray-600 font-medium">{detailsTexts.modules}</p>
                        <p className="font-bold text-gray-900 text-sm sm:text-base break-words">{item.course_modules.length}</p>
                      </div>
                    </div>
                  )}

                  {/* Tags */}
                  {item.tags && item.tags.length > 0 && item.tags.some(tag => tag && tag.trim()) && (
                    <div className="pt-3 sm:pt-4 border-t border-gray-200 overflow-hidden">
                      <div className="flex items-center gap-2 mb-2 sm:mb-3">
                        <Tag className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600 flex-shrink-0" />
                        <p className="text-xs sm:text-sm text-gray-600 font-medium">תגיות</p>
                      </div>
                      <div className="flex flex-wrap gap-1 sm:gap-2 justify-start overflow-hidden">
                        {item.tags.filter(tag => tag && tag.trim()).map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs sm:text-sm px-2 sm:px-3 py-1 rounded-full bg-white break-words max-w-full">
                            <span className="truncate">{tag}</span>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                </CardContent>
              </Card>
            )}

            {/* What's Included */}
            <div className="bg-white shadow-xl rounded-2xl sm:rounded-3xl overflow-hidden w-full max-w-full">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-4 sm:p-6">
                <h3 className="flex items-center gap-2 sm:gap-3 text-white text-lg sm:text-xl min-w-0 font-semibold">
                  <Zap className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <span className="truncate">{detailsTexts.whatsIncluded}</span>
                </h3>
              </div>
              <div className="p-4 sm:p-6 bg-blue-50/30 overflow-hidden">
                <div className="space-y-3 sm:space-y-4 overflow-hidden">
                  {item.product_type === 'file' && (
                    <>
                      <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
                        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
                        <span className="text-xs sm:text-sm font-medium text-gray-800 break-words min-w-0">הורדת ה{getProductTypeName('file', 'singular')} מיד לאחר הרכישה</span>
                      </div>
                    </>
                  )}

                  {item.product_type === 'workshop' && (
                    <>
                      {item.workshop_type === 'online_live' || item.workshop_type === 'both' ? (
                        <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
                          <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
                          <span className="text-xs sm:text-sm font-medium text-gray-800 break-words min-w-0">השתתפות ב{getProductTypeName('workshop', 'singular')} החיה</span>
                        </div>
                      ) : null}
                      {item.workshop_type === 'recorded' || item.workshop_type === 'both' ? (
                        <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
                          <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
                          <span className="text-xs sm:text-sm font-medium text-gray-800 break-words min-w-0">גישה להקלטה</span>
                        </div>
                      ) : null}
                    </>
                  )}

                  {item.product_type === 'course' && (
                    <>
                      <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
                        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
                        <span className="text-xs sm:text-sm font-medium text-gray-800 break-words min-w-0">גישה לכל מודולי ה{getProductTypeName('course', 'singular')}</span>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
                        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
                        <span className="text-xs sm:text-sm font-medium text-gray-800 break-words min-w-0">סרטוני {getProductTypeName('workshop', 'singular')} וחומרי עזר</span>
                      </div>
                    </>
                  )}

                  {item.product_type === 'lesson_plan' && (
                    <>
                      <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
                        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
                        <span className="text-xs sm:text-sm font-medium text-gray-800 break-words min-w-0">גישה לכל קבצי ה{getProductTypeName('lesson_plan', 'singular')}</span>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
                        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
                        <span className="text-xs sm:text-sm font-medium text-gray-800 break-words min-w-0">מצגות פתיחה ותוכן עיקרי</span>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
                        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
                        <span className="text-xs sm:text-sm font-medium text-gray-800 break-words min-w-0">קבצי שמע וחומרי עזר</span>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
                        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
                        <span className="text-xs sm:text-sm font-medium text-gray-800 break-words min-w-0">הנחיות הוראה מפורטות</span>
                      </div>
                    </>
                  )}

                  {isBundle(item) && (
                    <>
                      <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
                        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
                        <span className="text-xs sm:text-sm font-medium text-gray-800 break-words min-w-0">גישה לכל המוצרים בקיט</span>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
                        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
                        <span className="text-xs sm:text-sm font-medium text-gray-800 break-words min-w-0">{getBundleCompositionLabel(getBundleComposition(item))}</span>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
                        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
                        <span className="text-xs sm:text-sm font-medium text-gray-800 break-words min-w-0">חיסכון משמעותי לעומת רכישה נפרדת</span>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
                        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
                        <span className="text-xs sm:text-sm font-medium text-gray-800 break-words min-w-0">הורדה ושימוש נפרד בכל מוצר</span>
                      </div>
                    </>
                  )}

                  <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
                    <span className="text-xs sm:text-sm font-medium text-gray-800 break-words min-w-0">תמיכה טכנית</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Asset Viewer Modal */}
      {(() => {
        // Show PDF viewer for main product OR for selected bundle product
        const shouldShowModal = pdfViewerOpen && (
          (item.product_type === 'file' || itemType === 'file') || // Main product is file
          (selectedBundleProduct && selectedBundleProduct.product_type === 'file') // Selected bundle product is file
        );
        return shouldShowModal;
      })() && (
        <div data-testid="asset-viewer-modal">
          <PdfViewer
            fileId={(selectedBundleProduct && selectedBundleProduct.entity_id) || item.entity_id || item.id}
            fileName={(selectedBundleProduct && selectedBundleProduct.file_name) || item.file_name || `${(selectedBundleProduct && selectedBundleProduct.title) || item.title}.pdf`}
            hasAccess={hasAccess}
            allowPreview={(selectedBundleProduct && selectedBundleProduct.allow_preview) || item.allow_preview}
            onClose={() => {
              setPdfViewerOpen(false);
              setSelectedBundleProduct(null); // Clear selected bundle product when closing
            }}
          />
        </div>
      )}

      {/* Bundle Preview Modal */}
      {bundlePreviewModalOpen && isBundle(item) && (
        <BundlePreviewModal
          bundle={item}
          isOpen={bundlePreviewModalOpen}
          onClose={() => setBundlePreviewModalOpen(false)}
          onProductPreview={handleBundleProductPreview}
          onProductView={handleBundleProductView}
        />
      )}
    </div>
  );
}

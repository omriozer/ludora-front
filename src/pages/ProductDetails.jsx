import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { User, Purchase, Settings } from "@/services/entities";
import { apiDownload } from "@/services/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  GraduationCap
} from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import LudoraLoadingSpinner from "@/components/ui/LudoraLoadingSpinner";
import VideoPlayer from "../components/VideoPlayer"; // Added import for VideoPlayer component
import SecureVideoPlayer from "../components/SecureVideoPlayer";
import { getMarketingVideoUrl, getProductImageUrl } from '@/utils/videoUtils.js';
import { getProductTypeName, formatGradeRange } from "@/config/productTypes";
import FileAccessStatus from "@/components/files/FileAccessStatus";
import { hasActiveAccess } from "@/components/files/fileAccessUtils";
import { purchaseUtils } from "@/utils/api.js";
import PriceDisplayTag from "@/components/ui/PriceDisplayTag";
import ProductActionBar from "@/components/ui/ProductActionBar";
import PdfViewer from "@/components/pdf/PdfViewer";

export default function ProductDetails() {
  const navigate = useNavigate();

  const [item, setItem] = useState(null); // Renamed from product to item for generic use
  const [itemType, setItemType] = useState(null); // Track what type of entity we're viewing
  const [userPurchases, setUserPurchases] = useState([]);
  const [hasAccess, setHasAccess] = useState(false);
  const [purchase, setPurchase] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [detailsTexts, setDetailsTexts] = useState({});
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [settings, setSettings] = useState({});

  useEffect(() => {
    loadTexts();
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


  // Enhanced file access logic with PDF viewer support
  const handleFileAccess = async (file) => {
    if (!file.id) return;

    // Check if it's a PDF file
    const isPdf = file.file_type === 'pdf' || file.file_name?.toLowerCase().endsWith('.pdf');

    if (isPdf) {
      // Open PDF in viewer modal
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
        console.error('Error downloading file:', error);
      }
    }
  };

  // Handle PDF preview for users without access
  const handlePdfPreview = () => {
    setPdfViewerOpen(true);
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


  const loadData = useCallback(async () => {
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

      let user = null;
      let purchases = [];
      try {
        user = await User.me();
        setCurrentUser(user);
        
        if (user) {
          // Try new schema first, then fallback to legacy
          purchases = await Purchase.filter({
            buyer_user_id: user.id
          });

          // If no purchases found with new schema, try legacy email-based lookup
          if (purchases.length === 0) {
            purchases = await Purchase.filter({
              buyer_user_id: user.id,
              payment_status: 'paid' // Legacy status check
            });
          }

          setUserPurchases(purchases);
        }
      } catch (e) {
        console.warn("User not logged in or cannot fetch user data:", e);
      }

      // Load item data based on type
      // Use the new product details endpoint that returns Product + Entity + Creator
      const { apiRequest } = await import('@/services/apiClient');

      const [productDetails, settingsData] = await Promise.all([
        apiRequest(`/entities/product/${entityId}/details`),
        Settings.find()
      ]);

      if (!productDetails) {
        setError("מוצר לא נמצא");
        setIsLoading(false);
        return;
      }

      setItem(productDetails);
      setSettings(settingsData.length > 0 ? settingsData[0] : {});

      // Use embedded purchase data from API response
      // The API returns purchase information directly in productDetails.purchase
      const userPurchase = productDetails.purchase || null;
      const hasUserAccess = hasActiveAccess(userPurchase);

      // DEBUG: Log access calculation
      console.log('Access Debug:', {
        productId: productDetails.id,
        userPurchase,
        hasUserAccess,
        paymentStatus: userPurchase?.payment_status
      });

      setHasAccess(hasUserAccess);
      setPurchase(userPurchase);
    } catch (e) {
      console.error("Error loading product:", e);
      setError("שגיאה בטעינת הנתונים");
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);



  const getProductTypeLabel = (type) => {
    return getProductTypeName(type, 'singular') || 'מוצר';
  };

  const getProductIcon = (type) => {
    switch (type) {
      case 'workshop':
        return <Calendar className="w-6 h-6" />;
      case 'course':
        return <BookOpen className="w-6 h-6" />;
      case 'file':
        return <FileText className="w-6 h-6" />;
      default:
        return <Package className="w-6 h-6" />;
    }
  };


  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LudoraLoadingSpinner
          message={detailsTexts.loading}
          status="loading"
          size="lg"
          theme="space"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
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
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
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

    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 overflow-x-hidden w-full max-w-full">
      <div className="max-w-7xl mx-auto px-1 sm:px-3 md:px-4 lg:px-6 py-4 sm:py-6 md:py-8 w-full min-w-0 max-w-full">

        {/* Sticky Header with Back Button and Purchase Button */}
        {!hasAccess && (
          <div className="sticky top-0 z-40 -mx-1 sm:-mx-3 md:-mx-4 lg:-mx-6 mb-4 sm:mb-6 md:mb-8">
            <div className="bg-white/95 backdrop-blur-xl border-b border-gray-200 shadow-lg">
              <div className="max-w-7xl mx-auto px-1 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3">
                <div className="flex items-center gap-1 sm:gap-2 md:gap-4">
                  {/* Back Button */}
                  <Button
                    variant="ghost"
                    onClick={() => window.history.back()}
                    className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl px-2 sm:px-3 py-1.5 sm:py-2 flex-shrink-0"
                  >
                    <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 ml-1 sm:ml-2" />
                    <span className="text-xs sm:text-sm whitespace-nowrap hidden sm:inline">בחזרה ל{getProductTypeName(item.product_type || itemType, 'plural')}</span>
                    <span className="text-xs sm:text-sm whitespace-nowrap sm:hidden">חזרה</span>
                  </Button>

                  {/* Product Title - Takes remaining space */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm sm:text-base font-semibold text-gray-800 truncate">{item.title}</div>
                  </div>

                  {/* Price Badge - Hidden on mobile */}
                  <div className="flex-shrink-0 hidden md:block">
                    <PriceDisplayTag
                      originalPrice={item.price}
                      discount={item.discount}
                      variant="badge"
                      size="md"
                      showDiscount={false}
                    />
                  </div>

                  {/* Preview Button for PDF Files without access but with preview allowed */}
                  {(() => {
                    const isFile = item.product_type === 'file' || itemType === 'file';
                    const isPdf = item.file_type === 'pdf' || item.file_name?.toLowerCase().endsWith('.pdf');
                    const shouldShow = !hasAccess && isFile && isPdf && item.allow_preview;

                    // DEBUG: Log preview button logic
                    console.log('Preview Button Debug:', {
                      hasAccess,
                      isFile,
                      isPdf,
                      allowPreview: item.allow_preview,
                      shouldShow
                    });

                    return shouldShow;
                  })() && (
                    <Button
                      onClick={handlePdfPreview}
                      variant="outline"
                      className="rounded-full px-3 sm:px-4 py-2 sm:py-3 flex-shrink-0 text-xs sm:text-sm border-blue-200 text-blue-600 hover:bg-blue-50 border-2"
                      size="sm"
                    >
                      <Eye className="w-3 h-3 sm:w-4 sm:h-4 ml-1 sm:ml-2" />
                      <span className="hidden sm:inline">תצוגה מקדימה</span>
                      <span className="sm:hidden">תצוגה</span>
                    </Button>
                  )}

                  {/* Purchase Button - Unified Design */}
                  <ProductActionBar
                    product={{...item, purchase: purchase}}
                    className="px-3 sm:px-6 md:px-8 py-2 sm:py-3 flex-shrink-0 text-xs sm:text-sm md:text-base"
                    size="sm"
                    showCartButton={false}
                    onFileAccess={handleFileAccess}
                    onPdfPreview={handlePdfPreview}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl shadow-blue-500/10 overflow-hidden mb-8 w-full max-w-full">
          {(item.image_url && item.image_url !== '') ? (
            <div className="flex flex-col">
              {/* Image Section - Full Width on Top */}
              <div className="relative w-full">
                <div className="h-64 sm:h-80 md:h-96 overflow-hidden">
                  <img
                    src={getProductImageUrl(item)}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Product Type Badge */}
                <div className="absolute top-4 sm:top-6 right-4 sm:right-6">
                  <Badge className="bg-white/95 text-gray-800 px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base font-bold rounded-full shadow-lg">
                    <div className="flex items-center gap-2">
                      {getProductIcon(item.product_type)}
                      <span className="hidden sm:inline">{getProductTypeLabel(item.product_type)}</span>
                    </div>
                  </Badge>
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
              <div className="p-6 sm:p-8 md:p-10">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4 sm:mb-6 leading-tight text-right">
                  {item.title}
                </h1>

                {/* Access Status */}
                {(itemType === 'file' || item.product_type === 'file') ? (
                  <div className="mb-4 sm:mb-6">
                    <FileAccessStatus
                      file={item}
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
                  <p className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4 leading-relaxed text-right">
                    {item.short_description}
                  </p>
                )}

                {item.description && (
                  <p className="text-base sm:text-lg text-gray-700 mb-6 sm:mb-8 leading-relaxed text-right">
                    {item.description}
                  </p>
                )}

                {/* Action Buttons */}
                <div className="space-y-3 sm:space-y-4">
                  <ProductActionBar
                    product={{...item, purchase: purchase}}
                    className="py-3 sm:py-4 text-base sm:text-lg font-semibold rounded-2xl shadow-lg"
                    size="lg"
                    fullWidth={true}
                    showCartButton={true}
                    onFileAccess={handleFileAccess}
                    onPdfPreview={handlePdfPreview}
                    onCourseAccess={handleCourseAccess}
                    onWorkshopAccess={handleWorkshopAccess}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 sm:p-8 md:p-10">
              {/* Header without image */}
              <div className="text-center">
                <div className="flex flex-wrap items-center gap-2 mb-4 sm:mb-6 justify-center">
                  <Badge className="bg-blue-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base font-bold rounded-full">
                    <div className="flex items-center gap-2">
                      {getProductIcon(item.product_type)}
                      <span className="hidden sm:inline">{getProductTypeLabel(item.product_type)}</span>
                    </div>
                  </Badge>
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

                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 sm:mb-6 leading-tight">
                  {item.title}
                </h1>

                {/* Access Status */}
                {(itemType === 'file' || item.product_type === 'file') ? (
                  <div className="mb-4 sm:mb-6">
                    <FileAccessStatus
                      file={item}
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
                  <p className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-800 leading-relaxed mb-4 sm:mb-6 max-w-3xl mx-auto">
                    {item.short_description}
                  </p>
                )}
                {item.description && (
                  <p className="text-base sm:text-lg md:text-xl text-gray-700 leading-relaxed mb-6 sm:mb-8 max-w-3xl mx-auto">
                    {item.description}
                  </p>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col gap-3 sm:gap-4 max-w-md mx-auto">
                  <ProductActionBar
                    product={{...item, purchase: purchase}}
                    className="py-3 sm:py-4 px-8 sm:px-12 text-base sm:text-lg font-semibold rounded-2xl shadow-xl"
                    size="lg"
                    fullWidth={true}
                    showCartButton={true}
                    onFileAccess={handleFileAccess}
                    onPdfPreview={handlePdfPreview}
                    onCourseAccess={handleCourseAccess}
                    onWorkshopAccess={handleWorkshopAccess}
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
                    product={{...item, purchase: purchase}}
                    className="py-3 px-6 sm:py-4 sm:px-12 text-base sm:text-lg font-semibold rounded-xl sm:rounded-2xl shadow-xl"
                    size="lg"
                    showCartButton={false}
                    onWorkshopAccess={handleWorkshopAccess}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Main Content Grid */}
        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 min-w-0 overflow-hidden w-full max-w-full">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6 lg:space-y-8 min-w-0 overflow-hidden w-full">

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

            {item.product_type === 'file' && (
              <Card className="shadow-xl bg-white/90 backdrop-blur-xl border-0 rounded-2xl sm:rounded-3xl w-full max-w-full overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-t-2xl sm:rounded-t-3xl">
                  <CardTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl">
                    <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
                    פרטי ה{getProductTypeName('file', 'singular')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 md:p-8">
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
                    {(item.access_days !== undefined && item.access_days !== null) || item.access_days === null ? (
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
                    ) : null}

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
                </CardContent>
              </Card>
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
          <div className="space-y-4 sm:space-y-6 min-w-0 overflow-hidden w-full">
            {/* Product Info - Only show if there's content to display */}
            {(() => {
              const hasTargetAudience = item.target_audience;
              const hasDuration = item.duration_minutes && item.product_type !== 'workshop';
              const hasCourseModules = item.product_type === 'course' && item.course_modules;
              const hasTags = item.tags && item.tags.length > 0 && item.tags.some(tag => tag && tag.trim());

              // Debug: Log what fields are available
              console.log('Product Info Debug:', {
                target_audience: item.target_audience,
                duration_minutes: item.duration_minutes,
                product_type: item.product_type,
                course_modules: item.course_modules,
                tags: item.tags,
                hasTargetAudience,
                hasDuration,
                hasCourseModules,
                hasTags
              });

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
            <Card className="shadow-xl bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-100 rounded-2xl sm:rounded-3xl overflow-hidden w-full max-w-full">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-t-2xl sm:rounded-t-3xl overflow-hidden">
                <CardTitle className="flex items-center gap-2 sm:gap-3 text-blue-100 text-lg sm:text-xl min-w-0">
                  <Zap className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <span className="truncate">{detailsTexts.whatsIncluded}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 overflow-hidden">
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

                  <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
                    <span className="text-xs sm:text-sm font-medium text-gray-800 break-words min-w-0">תמיכה טכנית</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* PDF Viewer Modal */}
      {pdfViewerOpen && (item.product_type === 'file' || itemType === 'file') && (
        <PdfViewer
          fileId={item.entity_id || item.id}
          fileName={item.file_name || `${item.title}.pdf`}
          hasAccess={hasAccess}
          allowPreview={item.allow_preview}
          onClose={() => setPdfViewerOpen(false)}
        />
      )}
    </div>
  );
}

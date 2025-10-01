import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Workshop, Course, File, Tool, User, Purchase, Settings } from "@/services/entities"; // Updated imports
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
  Download,
  FileText,
  Eye,
  ShoppingCart,
  CheckCircle,
  AlertCircle,
  Star,
  ArrowRight,
  Monitor,
  Video,
  Globe,
  Target,
  Award,
  Package,
  Zap,
  Tag,
  ArrowLeft,
  Info
} from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { getText } from "../components/utils/getText";
import LudoraLoadingSpinner from "@/components/ui/LudoraLoadingSpinner";
import VideoPlayer from "../components/VideoPlayer"; // Added import for VideoPlayer component
import { getProductTypeName } from "@/config/productTypes";
import GetFileButton from "@/components/files/GetFileButton";
import FileAccessStatus from "@/components/files/FileAccessStatus";
import { hasActiveAccess, getUserPurchaseForFile } from "@/components/files/fileAccessUtils";
import { getApiBase, purchaseUtils } from "@/utils/api.js";
import PriceDisplayTag from "@/components/ui/PriceDisplayTag";

// Import modular components
import ProductHeader from "@/components/product-details/ProductHeader";
import ProductImage from "@/components/product-details/ProductImage";
import ProductPricing from "@/components/product-details/ProductPricing";
import ProductMetadata from "@/components/product-details/ProductMetadata";

export default function ProductDetails() {
  const navigate = useNavigate();

  const [item, setItem] = useState(null); // Renamed from product to item for generic use
  const [itemType, setItemType] = useState(null); // Track what type of entity we're viewing
  const [currentUser, setCurrentUser] = useState(null);
  const [userPurchases, setUserPurchases] = useState([]);
  const [hasAccess, setHasAccess] = useState(false);
  const [purchase, setPurchase] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [settings, setSettings] = useState({});
  const [detailsTexts, setDetailsTexts] = useState({});

  useEffect(() => {
    loadTexts();
  }, []);

  const loadTexts = async () => {
    const texts = {
      loading: await getText("productDetails.loading", "טוען פרטי מוצר..."),
      notFound: await getText("productDetails.notFound", "מוצר לא נמצא"),
      errorLoadingData: await getText("productDetails.errorLoadingData", "שגיאה בטעינת הנתונים"),
      productIdMissing: await getText("productDetails.productIdMissing", "מזהה מוצר חסר"),
      buyNow: await getText("productDetails.buyNow", "רכישה עכשיו"),
      startCourse: await getText("productDetails.startCourse", `התחל ${getProductTypeName('course', 'singular')}`),
      downloadFile: await getText("productDetails.downloadFile", `הורד ${getProductTypeName('file', 'singular')}`),
      watchFile: "צפיה בקובץ", // Same text as Files.jsx
      getAccess: "קבלת גישה", // Same text as Files.jsx
      joinWorkshop: await getText("productDetails.joinWorkshop", `הצטרף ל${getProductTypeName('workshop', 'singular')}`),
      watchRecording: await getText("productDetails.watchRecording", "צפה בהקלטה"),
      alreadyOwned: await getText("productDetails.alreadyOwned", "ברשותך"),
      accessUntil: await getText("productDetails.accessUntil", "גישה עד"),
      lifetimeAccess: await getText("productDetails.lifetimeAccess", "גישה לכל החיים"),
      minutes: await getText("productDetails.minutes", "דקות"),
      modules: await getText("productDetails.modules", "מודולים"),
      targetAudience: await getText("productDetails.targetAudience", "קהל יעד"),
      previewVideo: await getText("productDetails.previewVideo", "סרטון תצוגה מקדימה"),
      courseModules: await getText("productDetails.courseModules", `מודולי ה${getProductTypeName('course', 'singular')}`),
      scheduledFor: await getText("productDetails.scheduledFor", "מתוכנן ל"),
      maxParticipants: await getText("productDetails.maxParticipants", "משתתפים מקסימלי"),
      recordingAvailable: await getText("productDetails.recordingAvailable", "הקלטה זמינה"),
      freePreview: await getText("productDetails.freePreview", "תצוגה מקדימה חינם"),
      downloads: await getText("productDetails.downloads", "הורדות"),
      fileType: await getText("productDetails.fileType", `סוג ${getProductTypeName('file', 'singular')}`),
      whatsIncluded: await getText("productDetails.whatsIncluded", "מה כלול במוצר"),
      productFeatures: await getText("productDetails.productFeatures", "תכונות המוצר"),
      productInfo: "מידע על המוצר",
      productOverview: "סקירת המוצר",
      additionalInfo: "מידע נוסף"
    };
    setDetailsTexts(texts);
  };

  const getUserPurchaseForItem = (itemId, itemType) => {
    return userPurchases.find(purchase => {
      const purchaseEntityType = purchaseUtils.getEntityType(purchase);
      const purchaseEntityId = purchaseUtils.getEntityId(purchase);
      return purchaseEntityType === itemType &&
             purchaseEntityId === itemId &&
             purchaseUtils.isPaymentCompleted(purchase);
    });
  };

  // Use same file access logic as Files.jsx
  const handleFileAccess = (file) => {
    // Use authenticated file download endpoint with auth token - same as Files.jsx
    const authToken = localStorage.getItem('authToken');
    if (authToken && file.id) {
      const apiBase = getApiBase();
      const fileUrl = `${apiBase}/media/file/download/${file.id}?authToken=${authToken}`;
      window.open(fileUrl, '_blank');
    }
  };

  const handleDownload = async () => {
    if (!item.file_url && !item.tool_url) {
      console.error("No file URL or tool URL found for item:", item);
      return;
    }

    const downloadUrl = item.file_url || item.tool_url;

    try {
      const userPurchase = getUserPurchaseForItem(item.id, itemType);
      if (userPurchase) {
        await Purchase.update(userPurchase.id, {
          download_count: (userPurchase.download_count || 0) + 1,
          last_accessed: new Date().toISOString()
        });
      }

      // Update item download count based on type
      const EntityClass = getEntityClass(itemType);
      await EntityClass.update(item.id, {
        downloads_count: (item.file?.downloads_count || item.downloads_count || 0) + 1
      });

      const response = await fetch(downloadUrl);
      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${item.title || 'download'}.${item.file_type || 'pdf'}`;
      link.style.display = 'none';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error("Error downloading file:", error);
      window.open(downloadUrl, '_blank');
    }
  };

  // Helper function to get the right entity class
  const getEntityClass = (type) => {
    switch (type) {
      case 'workshop': return Workshop;
      case 'course': return Course;
      case 'file': return File;
      case 'tool': return Tool;
      default:
        console.error('Unknown entity type:', type);
        return File; // Default to File for safety
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

      // Use centralized logic for determining access
      // getUserPurchaseForFile expects (file_id, userPurchases), not (entityId, purchases)
      // For products, we need to check against the product ID
      const userPurchase = getUserPurchaseForItem(productDetails.id, productDetails.product_type || entityType);
      const hasUserAccess = hasActiveAccess(userPurchase);

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

  const handleProductAccess = () => {
    if (!item) return;

    switch (itemType) {
      case 'course':
        navigate(`/course?course=${item.id}`);
        break;
      case 'file':
        // Use same file access logic as Files.jsx
        handleFileAccess(item);
        break;
      case 'tool':
        if (item.tool_url) {
          window.open(item.tool_url, '_blank');
        } else {
          handleDownload();
        }
        break;
      case 'workshop':
        if (item.recording_url) {
          navigate(`/video?workshop=${item.id}`);
        } else if (item.zoom_link && new Date(item.scheduled_date) > new Date()) {
          window.open(item.zoom_link, '_blank');
        }
        break;
      default:
        // Legacy product types
        switch (item.product_type) {
          case 'course':
            navigate(`/course?course=${item.id}`);
            break;
          case 'file':
            // Use same file access logic as Files.jsx
            handleFileAccess(item);
            break;
          case 'workshop':
            if (item.recording_url) {
              navigate(`/video?workshop=${item.id}`);
            } else if (item.zoom_link && new Date(item.scheduled_date) > new Date()) {
              window.open(item.zoom_link, '_blank');
            }
            break;
          default:
            break;
        }
        break;
    }
  };

  const handlePurchase = () => {
    if (itemType && itemType !== 'product') {
      navigate(`/purchase?type=${itemType}&id=${item.id}`);
    } else {
      navigate(`/purchase?product=${item.id}`); // Legacy support
    }
  };

  const getAccessButtonText = () => {
    if (!item) return detailsTexts.buyNow;

    const type = itemType === 'product' ? item.product_type : itemType;

    switch (type) {
      case 'course':
        return detailsTexts.startCourse;
      case 'file':
        // Use same text as Files.jsx - "צפיה בקובץ" when has access, "קבלת גישה" when no access
        return hasAccess ? detailsTexts.watchFile : detailsTexts.getAccess;
      case 'tool':
        return item.tool_url ? `גש ל${getProductTypeName('tool', 'singular')}` : detailsTexts.downloadFile;
      case 'workshop':
        const now = new Date();
        const scheduledDate = item.scheduled_date ? new Date(item.scheduled_date) : null;

        if (scheduledDate && scheduledDate > now) {
          return detailsTexts.joinWorkshop;
        } else if (item.recording_url) {
          return detailsTexts.watchRecording;
        } else {
          return detailsTexts.getAccess;
        }
      default:
        return detailsTexts.getAccess;
    }
  };


  const getAccessButtonIcon = () => {
    if (!item) return <ShoppingCart className="w-5 h-5 ml-2" />;

    const type = itemType === 'product' ? item.product_type : itemType;

    switch (type) {
      case 'course':
        return <BookOpen className="w-5 h-5 ml-2" />;
      case 'file':
        return <Download className="w-5 h-5 ml-2" />;
      case 'tool':
        return item.tool_url ? <Globe className="w-5 h-5 ml-2" /> : <Download className="w-5 h-5 ml-2" />;
      case 'workshop':
        const now = new Date();
        const scheduledDate = item.scheduled_date ? new Date(item.scheduled_date) : null;
        
        if (scheduledDate && scheduledDate > now) {
          return <Users className="w-5 h-5 ml-2" />;
        } else {
          return <Play className="w-5 h-5 ml-2" />;
        }
      default:
        return <ArrowRight className="w-5 h-5 ml-2" />;
    }
  };


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

  const handlePreviewDownload = () => {
    if (item.preview_file_url) {
      window.open(item.preview_file_url, '_blank');
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

    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Sticky Header with Back Button and Purchase Button */}
        {!hasAccess && (
          <div className="sticky top-0 z-40 -mx-4 sm:-mx-6 lg:-mx-8 mb-8">
            <div className="bg-white/95 backdrop-blur-xl border-b border-gray-200 shadow-lg">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
                <div className="flex items-center gap-6">
                  {/* Back Button */}
                  <Button
                    variant="ghost"
                    onClick={() => window.history.back()}
                    className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl px-3 py-2 flex-shrink-0"
                  >
                    <ArrowLeft className="w-4 h-4 ml-2" />
                    <span className="text-sm whitespace-nowrap">בחזרה ל{getProductTypeName(item.product_type || itemType, 'plural')}</span>
                  </Button>

                  {/* Product Title - Takes remaining space */}
                  <div className="flex-1 min-w-0">
                    <div className="text-base font-semibold text-gray-800 truncate">{item.title}</div>
                  </div>

                  {/* Price Badge */}
                  <div className="flex-shrink-0">
                    <PriceDisplayTag
                      originalPrice={item.price}
                      discount={item.discount}
                      variant="badge"
                      size="md"
                      showDiscount={false}
                    />
                  </div>

                  {/* Purchase Button - Unified Design */}
                  <Button
                    onClick={(itemType === 'file' || item.product_type === 'file') ? () => handleFileAccess(item) : handlePurchase}
                    className="group relative overflow-hidden bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 hover:from-blue-600 hover:via-indigo-600 hover:to-purple-600 text-white px-8 py-3 font-bold rounded-full shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 flex-shrink-0 border-2 border-blue-400/20"
                  >
                    <span className="relative z-10 flex items-center gap-2 text-base">
                      <ShoppingCart className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
                      <span>קבלת גישה</span>
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 animate-pulse"></div>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl shadow-blue-500/10 overflow-hidden mb-8">
          {item.image_url ? (
            <div className="flex flex-col">
              {/* Image Section - Full Width on Top */}
              <div className="relative w-full">
                <div className="h-64 sm:h-80 md:h-96 overflow-hidden">
                  <img
                    src={item.image_url}
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
                  {!hasAccess && item.product_type === 'file' && item.preview_file_url && (
                    <Button
                      onClick={handlePreviewDownload}
                      variant="outline"
                      className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-full px-6 py-3 shadow-md"
                    >
                      <Eye className="w-4 h-4" />
                      {detailsTexts.freePreview}
                    </Button>
                  )}

                  {hasAccess ? (
                    <Button
                      onClick={handleProductAccess}
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-3 sm:py-4 text-base sm:text-lg font-semibold rounded-2xl shadow-lg transform hover:scale-105 transition-all duration-300"
                      size="lg"
                    >
                      {getAccessButtonIcon()}
                      {getAccessButtonText()}
                    </Button>
                  ) : (
                    <Button
                      onClick={(itemType === 'file' || item.product_type === 'file') ? () => handleFileAccess(item) : handlePurchase}
                      className="group relative overflow-hidden w-full bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 hover:from-blue-600 hover:via-indigo-600 hover:to-purple-600 text-white py-3 sm:py-4 font-bold rounded-full shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 border-2 border-blue-400/20"
                      size="lg"
                    >
                      <span className="relative z-10 flex items-center justify-center gap-2 sm:gap-3 text-base sm:text-lg">
                        <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 group-hover:rotate-12 transition-transform duration-300" />
                        <span>קבלת גישה</span>
                      </span>
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 animate-pulse"></div>
                    </Button>
                  )}
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
                  {!hasAccess && item.product_type === 'file' && item.preview_file_url && (
                    <Button
                      onClick={handlePreviewDownload}
                      variant="outline"
                      className="w-full flex items-center justify-center gap-2 rounded-full px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg shadow-lg"
                      size="lg"
                    >
                      <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                      {detailsTexts.freePreview}
                    </Button>
                  )}

                  {hasAccess ? (
                    <Button
                      onClick={handleProductAccess}
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-3 sm:py-4 px-8 sm:px-12 text-base sm:text-lg font-semibold rounded-2xl shadow-xl transform hover:scale-105 transition-all duration-300"
                      size="lg"
                    >
                      {getAccessButtonIcon()}
                      {getAccessButtonText()}
                    </Button>
                  ) : (
                    <Button
                      onClick={(itemType === 'file' || item.product_type === 'file') ? () => handleFileAccess(item) : handlePurchase}
                      className="group relative overflow-hidden w-full bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 hover:from-blue-600 hover:via-indigo-600 hover:to-purple-600 text-white py-3 sm:py-4 px-8 sm:px-12 font-bold rounded-full shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 border-2 border-blue-400/20"
                      size="lg"
                    >
                      <span className="relative z-10 flex items-center justify-center gap-2 sm:gap-3 text-base sm:text-lg">
                        <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 group-hover:rotate-12 transition-transform duration-300" />
                        <span>קבלת גישה</span>
                      </span>
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 animate-pulse"></div>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Marketing Video - YouTube or Uploaded - Only show if video exists */}
        {(item.youtube_video_id || item.marketing_video_title) && (
          <Card className="mb-6 sm:mb-8 shadow-xl bg-white/90 backdrop-blur-xl border-0 rounded-2xl sm:rounded-3xl overflow-hidden">
            <CardContent className="p-4 sm:p-6 md:p-8">
              {(item.youtube_video_title || item.marketing_video_title) && (
                <h3 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-center text-gray-900">
                  {item.youtube_video_title || item.marketing_video_title}
                </h3>
              )}
              <div className="aspect-video rounded-lg sm:rounded-2xl overflow-hidden shadow-xl sm:shadow-2xl">
                {item.youtube_video_id ? (
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${item.youtube_video_id}`}
                    title="YouTube video player"
                    style={{ border: 0 }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                ) : (
                  <VideoPlayer
                    file_uri={`/api/media/marketing-video/${item.product_type}/${item.entity_id || item.id}`}
                    product_id={item.id}
                    title={item.marketing_video_title || item.title}
                    className="w-full h-full"
                    is_private={false}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Workshop Video for Recorded Workshops */}
        {item.product_type === 'workshop' &&
         item.workshop_type === 'recorded' &&
         item.video_file_url && (
          <Card className="mb-8 shadow-xl bg-white/90 backdrop-blur-xl border-0 rounded-3xl overflow-hidden">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">{getProductTypeName('workshop', 'singular')} מוקלטת</h2>
              
              {purchase ? ( // Using 'purchase' which holds the active purchase for this product
                <VideoPlayer
                  file_uri={item.video_file_url}
                  is_private={item.video_file_is_private}
                  product_id={item.id}
                  className="aspect-video"
                  title={item.title}
                />
              ) : (
                <div className="bg-gray-100 rounded-lg p-8 text-center">
                  <Play className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">צפייה ב{getProductTypeName('workshop', 'singular')} המוקלטת זמינה לאחר רכישה</p>
                  <Button 
                    onClick={() => navigate(`/purchase?product=${item.id}`)}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-4 px-12 text-lg font-semibold rounded-2xl shadow-xl transform hover:scale-105 transition-all duration-300"
                  >
                    רכוש גישה
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* General Video Section - only show if not a recorded workshop video handled above */}
            {item.video_file_url && !(item.product_type === 'workshop' && item.workshop_type === 'recorded') && (
              <Card className="mb-8 shadow-xl bg-white/90 backdrop-blur-xl border-0 rounded-3xl overflow-hidden">
                <CardContent className="p-8">
                  <h3 className="text-2xl font-bold mb-6 text-center text-gray-900">וידאו {getProductTypeName('workshop', 'singular')}</h3>
                  <div className="aspect-video rounded-2xl overflow-hidden shadow-2xl">
                    {item.video_file_is_private ? (
                      // Use VideoPlayer for private video files
                      <VideoPlayer
                        file_uri={item.video_file_url}
                        product_id={item.id}
                        title={item.title}
                        className="w-full h-full"
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
                </CardContent>
              </Card>
            )}

            {/* Product-specific content */}
            {item.product_type === 'workshop' && (
              <Card className="shadow-xl bg-white/90 backdrop-blur-xl border-0 rounded-3xl">
                <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-t-3xl">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <Calendar className="w-6 h-6" />
                    פרטי ה{getProductTypeName('workshop', 'singular')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="grid md:grid-cols-2 gap-6">
                    {item.scheduled_date && (
                      <div className="flex items-center gap-4 p-6 bg-blue-50 rounded-2xl">
                        <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center">
                          <Calendar className="w-7 h-7 text-blue-600" />
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600 font-medium">תאריך ושעה</p>
                          <p className="font-bold text-gray-900 text-lg">
                            {format(new Date(item.scheduled_date), 'dd/MM/yyyy HH:mm', { locale: he })}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {item.duration_minutes && (
                      <div className="flex items-center gap-4 p-6 bg-green-50 rounded-2xl">
                        <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center">
                          <Clock className="w-7 h-7 text-green-600" />
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600 font-medium">משך</p>
                          <p className="font-bold text-gray-900">{item.duration_minutes} דקות</p>
                        </div>
                      </div>
                    )}
                    
                    {item.max_participants && (
                      <div className="flex items-center gap-4 p-6 bg-purple-50 rounded-2xl">
                        <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center">
                          <Users className="w-7 h-7 text-purple-600" />
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600 font-medium">משתתפים מקסימלי</p>
                          <p className="font-bold text-gray-900 text-lg">{item.max_participants}</p>
                        </div>
                      </div>
                    )}
                    
                    {item.workshop_type && (
                      <div className="flex items-center gap-4 p-6 bg-indigo-50 rounded-2xl">
                        <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center">
                          {item.workshop_type === 'online_live' ? (
                            <Monitor className="w-7 h-7 text-indigo-600" />
                          ) : item.workshop_type === 'recorded' ? (
                            <Video className="w-7 h-7 text-indigo-600" />
                          ) : (
                            <Globe className="w-7 h-7 text-indigo-600" />
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600 font-medium">סוג {getProductTypeName('workshop', 'singular')}</p>
                          <p className="font-bold text-gray-900 text-lg">
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
              <Card className="shadow-xl bg-white/90 backdrop-blur-xl border-0 rounded-3xl">
                <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-t-3xl">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <FileText className="w-6 h-6" />
                    פרטי ה{getProductTypeName('file', 'singular')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* File Type */}
                    {item.file_type && (
                      <div className="flex items-center gap-4 p-6 bg-purple-50 rounded-2xl">
                        <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center">
                          <FileText className="w-7 h-7 text-purple-600" />
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600 font-medium">{detailsTexts.fileType}</p>
                          <p className="font-bold text-gray-900 text-lg">{item.file_type.toUpperCase()}</p>
                        </div>
                      </div>
                    )}

                    {/* Creator */}
                    {item.creator && (
                      <div className="flex items-center gap-4 p-6 bg-blue-50 rounded-2xl">
                        <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center">
                          <Users className="w-7 h-7 text-blue-600" />
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600 font-medium">יוצר התוכן</p>
                          <p className="font-bold text-gray-900 text-lg">{item.creator.full_name}</p>
                          {item.creator.is_content_creator && (
                            <Badge className="mt-1 bg-blue-600 text-white text-xs">יוצר תוכן</Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Access Duration */}
                    {(item.access_days !== undefined && item.access_days !== null) || item.access_days === null ? (
                      <div className="flex items-center gap-4 p-6 bg-green-50 rounded-2xl">
                        <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center">
                          <Clock className="w-7 h-7 text-green-600" />
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600 font-medium">זמן גישה</p>
                          <p className="font-bold text-gray-900 text-lg">
                            {item.access_days === null || item.access_days === undefined ? 'גישה לכל החיים' : `${item.access_days} ימים`}
                          </p>
                        </div>
                      </div>
                    ) : null}

                    {/* Difficulty Level */}
                    {item.difficulty_level && (
                      <div className="flex items-center gap-4 p-6 bg-yellow-50 rounded-2xl">
                        <div className="w-14 h-14 bg-yellow-100 rounded-2xl flex items-center justify-center">
                          <Award className="w-7 h-7 text-yellow-600" />
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600 font-medium">רמת קושי</p>
                          <p className="font-bold text-gray-900 text-lg">
                            {item.difficulty_level === 'beginner' && 'מתחילים'}
                            {item.difficulty_level === 'intermediate' && 'בינוני'}
                            {item.difficulty_level === 'advanced' && 'מתקדמים'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Last Updated */}
                    {item.updated_at && (
                      <div className="flex items-center gap-4 p-6 bg-indigo-50 rounded-2xl">
                        <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center">
                          <Calendar className="w-7 h-7 text-indigo-600" />
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600 font-medium">עודכן לאחרונה</p>
                          <p className="font-bold text-gray-900 text-lg">
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
              <Card className="shadow-xl bg-white/90 backdrop-blur-xl border-0 rounded-3xl">
                <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-t-3xl">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <BookOpen className="w-6 h-6" />
                    {detailsTexts.courseModules}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="space-y-4">
                    {item.course_modules.map((module, index) => (
                      <div key={index} className="border border-gray-200 rounded-2xl p-6 hover:bg-gray-50 transition-colors bg-white shadow-sm">
                        <div className="flex justify-between items-start">
                          <div className="flex-1 text-right">
                            <h4 className="font-bold text-gray-900 mb-2 text-lg">
                              {index + 1}. {module.title}
                            </h4>
                            {module.description && (
                              <p className="text-gray-600 mb-2">{module.description}</p>
                            )}
                          </div>
                          {module.duration_minutes && (
                            <Badge variant="outline" className="text-sm mr-6 px-3 py-1 rounded-full">
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
          <div className="space-y-6">
            {/* Product Info */}
            <Card className="shadow-xl bg-white/95 backdrop-blur-xl border-0 rounded-3xl">
              <CardHeader className="bg-gradient-to-r from-indigo-500 to-blue-600 text-white rounded-t-3xl">
                <CardTitle className="flex items-center gap-3">
                  <Info className="w-5 h-5" />
                  {detailsTexts.productInfo}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {item.target_audience && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600 font-medium">{detailsTexts.targetAudience}</p>
                      <p className="font-bold text-gray-900">{item.target_audience}</p>
                    </div>
                  </div>
                )}

                {item.duration_minutes && item.product_type !== 'workshop' && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                      <Clock className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600 font-medium">משך</p>
                      <p className="font-bold text-gray-900">{item.duration_minutes} {detailsTexts.minutes}</p>
                    </div>
                  </div>
                )}

                {item.product_type === 'course' && item.course_modules && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600 font-medium">{detailsTexts.modules}</p>
                      <p className="font-bold text-gray-900">{item.course_modules.length}</p>
                    </div>
                  </div>
                )}

                {/* Tags */}
                {item.tags && item.tags.length > 0 && item.tags.some(tag => tag && tag.trim()) && (
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Tag className="w-4 h-4 text-gray-600" />
                      <p className="text-sm text-gray-600 font-medium">תגיות</p>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-end">
                      {item.tags.filter(tag => tag && tag.trim()).map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-sm px-3 py-1 rounded-full bg-white">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

              </CardContent>
            </Card>

            {/* What's Included */}
            <Card className="shadow-xl bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-100 rounded-3xl">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-t-3xl">
                <CardTitle className="flex items-center gap-3 text-blue-100">
                  <Zap className="w-5 h-5" />
                  {detailsTexts.whatsIncluded}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {item.product_type === 'file' && (
                    <>
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <span className="text-sm font-medium text-gray-800">הורדת ה{getProductTypeName('file', 'singular')} מיד לאחר הרכישה</span>
                      </div>
                      {item.preview_file_url && (
                        <div className="flex items-center gap-3">
                          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                          <span className="text-sm font-medium text-gray-800">תצוגה מקדימה חינמית</span>
                        </div>
                      )}
                    </>
                  )}
                  
                  {item.product_type === 'workshop' && (
                    <>
                      {item.workshop_type === 'online_live' || item.workshop_type === 'both' ? (
                        <div className="flex items-center gap-3">
                          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                          <span className="text-sm font-medium text-gray-800">השתתפות ב{getProductTypeName('workshop', 'singular')} החיה</span>
                        </div>
                      ) : null}
                      {item.workshop_type === 'recorded' || item.workshop_type === 'both' ? (
                        <div className="flex items-center gap-3">
                          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                          <span className="text-sm font-medium text-gray-800">גישה להקלטה</span>
                        </div>
                      ) : null}
                    </>
                  )}
                  
                  {item.product_type === 'course' && (
                    <>
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <span className="text-sm font-medium text-gray-800">גישה לכל מודולי ה{getProductTypeName('course', 'singular')}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <span className="text-sm font-medium text-gray-800">סרטוני {getProductTypeName('workshop', 'singular')} וחומרי עזר</span>
                      </div>
                    </>
                  )}
                  
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-800">תמיכה טכנית</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

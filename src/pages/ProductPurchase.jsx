import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { User, Settings, Purchase, SiteText, Game, Notification, Workshop, Course, File, Tool } from "@/services/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Calendar,
  Clock,
  Users,
  AlertCircle,
  CheckCircle,
  CreditCard,
  ArrowLeft,
  Play,
  Video,
  FileText,
  Download,
  TestTube,
  Target,
  Star,
  Shield
} from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import LudoraLoadingSpinner from "@/components/ui/LudoraLoadingSpinner";
import { PRODUCT_TYPES, getProductTypeName } from "@/config/productTypes";

// Simple getText function for this page
const getTextForPage = async (key, fallback) => {
  try {
    const texts = await SiteText.find();
    const textItem = texts.find(item => item.key === key);
    return textItem ? textItem.text : fallback;
  } catch (error) {
    console.warn(`Could not load text for key ${key}, using fallback:`, error);
    return fallback;
  }
};

export default function ProductPurchase() {
  const navigate = useNavigate();

  const [item, setItem] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [settings, setSettings] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [spotsLeft, setSpotsLeft] = useState(null);
  const [showSpotsWarning, setShowSpotsWarning] = useState(false);
  const [isFull, setIsFull] = useState(false);
  const [isTestMode, setIsTestMode] = useState(false);
  const [itemType, setItemType] = useState('product');

  // State for dynamic texts fetched from the database
  const [purchaseTexts, setPurchaseTexts] = useState({
    productDetails: "פרטי המוצר",
    price: "מחיר",
    userInfo: "פרטי המשתמש",
    fullName: "שם מלא",
    email: "אימייל",
    phone: "טלפון",
    testMode: "מצב בדיקה",
    testModeDescription: "בחרו אם להשתמש בסביבת בדיקה או ייצור לתשלום",
    securePayment: "תשלום מאובטח",
    loginToPurchase: "התחבר כדי לרכוש",
    workshopFull: `ה${getProductTypeName('workshop', 'singular')} מלאה - אין מקומות פנויים`,
    spotsRemaining: `נותרו רק {spots} מקומות ל${getProductTypeName('workshop', 'singular')}!`,
    productNotFound: "פריט לא נמצא",
    missingProductId: "מזהה פריט חסר",
    loading: "טוען נתונים...",
    error: "שגיאה בטעינת הנתונים",
    soldOut: "אזל מהמלאי",
    backToCatalog: "חזרה לקטלוג",
    priceIncludingVAT: "מחיר כולל מע\"מ",
    payplusSecurePayment: "תשלום מאובטח באמצעות PayPlus"
  });

  // Helper functions for access logic
  const getDefaultLifetimeAccess = useCallback(() => settings.default_lifetime_access_for_products ?? true, [settings]);
  const getDefaultAccessDays = useCallback(() => settings.default_access_days_for_products ?? 365, [settings]);

  const checkRemainingSpots = async (productData) => {
    try {
      // Count paid purchases for this item (checking both new polymorphic and legacy structure)
      const purchases = await Purchase.filter({
        $or: [
          { purchasable_type: productType, purchasable_id: productData.id, payment_status: 'paid' },
          { product_id: productData.id, payment_status: 'paid' } // Legacy fallback
        ]
      });

      const totalRegistered = purchases.length;
      const remaining = productData.max_participants - totalRegistered;
      const remainingPercentage = (remaining / productData.max_participants) * 100;

      if (remaining <= 0) {
        setIsFull(true);
        setShowSpotsWarning(false);
        setSpotsLeft(0);
      } else if (remainingPercentage < 20) {
        setShowSpotsWarning(true);
        setIsFull(false);
        setSpotsLeft(remaining);
      } else {
        setShowSpotsWarning(false);
        setIsFull(false);
        setSpotsLeft(null);
      }
    } catch (error) {
      console.error("Error checking remaining spots:", error);
      setSpotsLeft(null);
      setShowSpotsWarning(false);
      setIsFull(false);
    }
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const texts = {
        productDetails: await getTextForPage("productPurchase.productDetails", "פרטי המוצר"),
        price: await getTextForPage("productPurchase.price", "מחיר"),
        userInfo: await getTextForPage("productPurchase.userInfo", "פרטי המשתמש"),
        fullName: await getTextForPage("productPurchase.fullName", "שם מלא"),
        email: await getTextForPage("productPurchase.email", "אימייל"),
        phone: await getTextForPage("productPurchase.phone", "טלפון"),
        testMode: await getTextForPage("productPurchase.testMode", "מצב בדיקה"),
        testModeDescription: await getTextForPage("productPurchase.testModeDescription", "בחרו אם להשתמש בסביבת בדיקה או ייצור לתשלום"),
        securePayment: await getTextForPage("productPurchase.securePayment", "תשלום מאובטח"),
        loginToPurchase: await getTextForPage("productPurchase.loginToPurchase", "התחבר כדי לרכוש"),
        workshopFull: await getTextForPage("productPurchase.workshopFull", `ה${getProductTypeName('workshop', 'singular')} מלאה - אין מקומות פנויים`),
        spotsRemaining: await getTextForPage("productPurchase.spotsRemaining", `נותרו רק {spots} מקומות ל${getProductTypeName('workshop', 'singular')}!`),
        productNotFound: await getTextForPage("productPurchase.productNotFound", "פריט לא נמצא"),
        missingProductId: await getTextForPage("productPurchase.missingProductId", "מזהה פריט חסר"),
        loading: await getTextForPage("productPurchase.loading", "טוען נתונים..."),
        error: await getTextForPage("productPurchase.error", "שגיאה בטעינת הנתונים"),
        soldOut: await getTextForPage("productPurchase.soldOut", "אזל מהמלאי"),
        backToCatalog: await getTextForPage("productPurchase.backToCatalog", "חזרה לקטלוג"),
        priceIncludingVAT: await getTextForPage("productPurchase.priceIncludingVAT", "מחיר כולל מע\"מ"),
        payplusSecurePayment: await getTextForPage("productPurchase.payplusSecurePayment", "תשלום מאובטח באמצעות PayPlus")
      };
      setPurchaseTexts(texts);

      const urlParams = new URLSearchParams(window.location.search);
      const itemId = urlParams.get('product') || urlParams.get('id');
      const type = urlParams.get('type');

      if (!itemId) {
        setError(texts.missingProductId);
        setIsLoading(false);
        return;
      }

      const isGame = type === 'game';
      const isWorkshop = type === 'workshop';
      const isCourse = type === 'course';
      const isFile = type === 'file';
      const isTool = type === 'tool';
      setItemType(type || 'unknown');

      let user = null;
      try {
        user = await User.me();
        setCurrentUser(user);
      } catch (e) {
        // User not logged in, proceed without current user
      }

      let itemData;
      try {
        if (isGame) {
          itemData = await Game.findById(itemId);
        } else if (isWorkshop) {
          itemData = await Workshop.findById(itemId);
        } else if (isCourse) {
          itemData = await Course.findById(itemId);
        } else if (isFile) {
          itemData = await File.findById(itemId);
        } else if (isTool) {
          itemData = await Tool.findById(itemId);
        } else {
          // Legacy fallback - this should not happen with the new architecture
          throw new Error(`Unknown item type: ${type}`);
        }
      } catch (itemError) {
        console.error('Error loading item:', itemError);
        setError(texts.productNotFound);
        setIsLoading(false);
        return;
      }

      const settingsData = await Settings.find();

      if (!itemData) {
        setError(texts.productNotFound);
        setIsLoading(false);
        return;
      }

      setItem(itemData);
      setSettings(settingsData.length > 0 ? settingsData[0] : {});

      if (isWorkshop && itemData.max_participants) {
        await checkRemainingSpots(itemData);
      } else if (!isGame && !isWorkshop && itemData.product_type === 'workshop' && itemData.max_participants) {
        await checkRemainingSpots(itemData);
      }

    } catch (err) {
      console.error('Error loading data:', err);
      setError('שגיאה בטעינת הנתונים');
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFreeItemPurchase = async () => {
    try {
      console.log('🆓 Processing free item purchase...');

      const orderNumber = `EDU-FREE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      let accessDays = null;
      let isLifetimeAccess = true;

      if (itemType === 'product') {
        // New clean logic: access_days = null means lifetime access
        isLifetimeAccess = item.access_days === null || item.access_days === undefined;

        if (!isLifetimeAccess) {
          accessDays = item.access_days || getDefaultAccessDays();
        }
      } else if (itemType === 'game') {
        isLifetimeAccess = item.is_lifetime_access !== false;
        if (!isLifetimeAccess && item.access_days) {
          accessDays = item.access_days;
        }
      }

      const purchaseData = {
        order_number: orderNumber,
        purchasable_type: itemType,
        purchasable_id: item.id,
        // Keep legacy fields for backward compatibility
        product_id: itemType === 'product' ? item.id : null,
        workshop_id: itemType === 'workshop' ? item.id : null,
        buyer_name: currentUser.display_name || currentUser.full_name,
        buyer_user_id: currentUser.id,
        buyer_phone: currentUser.phone || '',
        payment_status: 'paid',
        payment_amount: 0,
        original_price: 0,
        discount_amount: 0,
        environment: 'production',
        purchased_access_days: accessDays,
        purchased_lifetime_access: isLifetimeAccess,
        first_accessed: new Date().toISOString()
      };

      if (!isLifetimeAccess) {
        if (itemType === 'workshop') {
          const workshopType = item.workshop_type || 'both';
          const hasRecording = !!item.video_file_url;
          const isWorkshopPast = item.scheduled_date && new Date(item.scheduled_date) <= new Date();

          if (workshopType === 'online_live') {
            if (item.scheduled_date) {
              purchaseData.access_until = new Date(item.scheduled_date).toISOString();
            }
          } else if (workshopType === 'recorded' || workshopType === 'both') {
            if (hasRecording && isWorkshopPast) {
              const accessUntil = new Date(Date.now() + (accessDays * 24 * 60 * 60 * 1000));
              purchaseData.access_until = accessUntil.toISOString();
            }
          }
        } else if (itemType === 'product' && item.product_type === 'workshop') {
          const workshopType = item.workshop_type || 'both';
          const hasRecording = !!item.video_file_url;
          const isWorkshopPast = item.scheduled_date && new Date(item.scheduled_date) <= new Date();

          if (workshopType === 'online_live') {
            if (item.scheduled_date) {
              purchaseData.access_until = new Date(item.scheduled_date).toISOString();
            }
          } else if (workshopType === 'recorded' || workshopType === 'both') {
            if (hasRecording && isWorkshopPast) {
              const accessUntil = new Date(Date.now() + (accessDays * 24 * 60 * 60 * 1000));
              purchaseData.access_until = accessUntil.toISOString();
            }
          }
        } else {
          if (accessDays && accessDays > 0) {
            const accessUntil = new Date(Date.now() + (accessDays * 24 * 60 * 60 * 1000));
            purchaseData.access_until = accessUntil.toISOString();
          }
        }
      }

      console.log('💾 Creating free purchase:', purchaseData);

      const purchase = await Purchase.create(purchaseData);

      console.log('✅ Free purchase created:', purchase.id);

      try {
        let notificationMessage = `קיבלת גישה חינם ל"${item.title}".`;

        if (itemType === 'workshop') {
          notificationMessage += ` תוכל להצטרף ל${getProductTypeName('workshop', 'singular')} או לצפות בהקלטה.`;
        } else if (itemType === 'product') {
          if (item.product_type === 'workshop') {
            notificationMessage += ` תוכל להצטרף ל${getProductTypeName('workshop', 'singular')} או לצפות בהקלטה.`;
          } else if (item.product_type === 'course') {
            notificationMessage += ` תוכל להתחיל את ה${getProductTypeName('course', 'singular')} עכשיו.`;
          } else if (item.product_type === 'file') {
            notificationMessage += ` תוכל להוריד את ה${getProductTypeName('file', 'singular')} עכשיו.`;
          }
        } else if (itemType === 'game') {
          notificationMessage += ' תוכל להתחיל לשחק עכשיו.';
        }

        let actionUrl = '';
        if (itemType === 'game') {
          actionUrl = `/games`;
        } else if (itemType === 'product') {
          switch(item.product_type) {
            case 'workshop':
              actionUrl = `/workshops`;
              break;
            case 'course':
              actionUrl = `/courses`;
              break;
            case 'file':
              actionUrl = `/files`;
              break;
            default:
              actionUrl = `/workshops`;
          }
        }

        await Notification.create({
          user_email: currentUser.email,
          type: 'free_access_granted',
          title: 'קיבלת גישה חינם!',
          message: notificationMessage,
          related_purchase_id: purchase.id,
          action_url: actionUrl
        });

        console.log('✅ Success notification created');
      } catch (notifError) {
        console.error('❌ Failed to create notification:', notifError);
      }

      const successUrl = `${window.location.origin}/payment-result?status=success&order=${orderNumber}&type=${itemType}&free=true`;
      console.log('🔄 Redirecting to success page:', successUrl);
      window.location.href = successUrl;

    } catch (error) {
      console.error('❌ Free purchase error:', error);
      setError('שגיאה ברכישה חינם: ' + error.message);
    }
  };

  const handlePurchase = async () => {
    if (!currentUser) {
      await User.login();
      return;
    }

    if (isFull) {
      return;
    }

    if (parseFloat(item.price) === 0) {
      await handleFreeItemPurchase();
      return;
    }

    try {
      const orderNumber = `EDU-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      let accessDays = null;
      let isLifetimeAccess = true;

      if (itemType === 'workshop') {
        // New clean logic: access_days = null means lifetime access
        isLifetimeAccess = item.access_days === null || item.access_days === undefined;

        if (!isLifetimeAccess) {
          accessDays = item.access_days || getDefaultAccessDays();
        }
      } else if (itemType === 'product') {
        // New clean logic: access_days = null means lifetime access
        isLifetimeAccess = item.access_days === null || item.access_days === undefined;

        if (!isLifetimeAccess) {
          accessDays = item.access_days || getDefaultAccessDays();
        }
      } else if (itemType === 'game') {
        isLifetimeAccess = item.is_lifetime_access !== false;
        if (!isLifetimeAccess && item.access_days) {
          accessDays = item.access_days;
        }
      }

      const purchaseData = {
        order_number: orderNumber,
        purchasable_type: itemType,
        purchasable_id: item.id,
        // Keep legacy fields for backward compatibility
        product_id: itemType === 'product' ? item.id : null,
        workshop_id: itemType === 'workshop' ? item.id : null,
        buyer_name: currentUser.display_name || currentUser.full_name,
        buyer_user_id: currentUser.id,
        buyer_phone: currentUser.phone || '',
        payment_status: 'pending',
        payment_amount: item.price,
        original_price: item.price,
        discount_amount: 0,
        environment: isTestMode ? 'test' : 'production',
        purchased_access_days: accessDays,
        purchased_lifetime_access: isLifetimeAccess
      };

      const purchase = await Purchase.create(purchaseData);

      const { createPayplusPaymentPage } = await import("@/services/functions");

      console.log('🔄 Calling payment creation with:', {
        purchaseId: purchase.id,
        environment: isTestMode ? 'test' : 'production',
        frontendOrigin: window.location.origin
      });

      const paymentResult = await createPayplusPaymentPage({
        purchaseId: purchase.id,
        environment: isTestMode ? 'test' : 'production',
        frontendOrigin: window.location.origin
      });

      console.log('📥 Payment result:', paymentResult);

      if (paymentResult.success && paymentResult.data && paymentResult.data.payment_url) {
        console.log('✅ Redirecting to payment page:', paymentResult.data.payment_url);
        window.location.href = paymentResult.data.payment_url;
      } else {
        console.error('❌ Payment creation failed:', paymentResult);
        const errorDetails = paymentResult.details || paymentResult.error || 'שגיאה לא ידועה';
        setError('שגיאה ביצירת דף התשלום: ' + errorDetails);
      }

    } catch (error) {
      console.error('❌ Purchase error:', error);
      let errorMessage = 'שגיאה בתהליך הרכישה';
      
      if (error.response?.data?.error) {
        errorMessage += ': ' + error.response.data.error;
      } else if (error.message) {
        errorMessage += ': ' + error.message;
      }
      
      setError(errorMessage);
    }
  };

  const getProductTypeLabel = (type) => {
    if (itemType === 'game') return getProductTypeName('game', 'singular');

    return getProductTypeName(type, 'singular') || 'מוצר';
  };

  const getProductIcon = (type) => {
    if (itemType === 'game') return <Play className="w-6 h-6" />;

    switch (type) {
      case 'workshop':
        return <Play className="w-6 h-6" />;
      case 'course':
        return <Video className="w-6 h-6" />;
      case 'file':
        return <FileText className="w-6 h-6" />;
      default:
        return <FileText className="w-6 h-6" />;
    }
  };

  const getPurchaseButtonText = () => {
    if (parseFloat(item.price) === 0) {
      if (itemType === 'game') {
        return `הוסף ל${getProductTypeName('game', 'plural')} שלי`;
      } else {
        return 'קבל חינם';
      }
    }
    return purchaseTexts.securePayment;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <LudoraLoadingSpinner
          message={purchaseTexts.loading}
          status="loading"
          size="lg"
          theme="neon"
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
            {purchaseTexts.backToCatalog}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Modern Header with Back Button */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => window.history.back()}
            className="mb-6 text-gray-600 hover:text-gray-900 hover:bg-white/80 rounded-2xl px-6 py-3 shadow-sm backdrop-blur-sm border border-white/20"
          >
            <ArrowLeft className="w-5 h-5 ml-2" />
            חזור
          </Button>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Item Details - Takes 2 columns */}
          <div className="lg:col-span-2">
            <Card className="bg-white/90 backdrop-blur-xl shadow-xl shadow-blue-500/10 border-0 rounded-3xl overflow-hidden">
              {/* Hero Image */}
              {item.image_url && (
                <div className="h-80 relative overflow-hidden">
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
                  
                  {/* Type and Category Badges */}
                  <div className="absolute top-6 right-6 flex gap-3">
                    <Badge className="bg-white/95 text-gray-800 font-bold px-4 py-2 rounded-full shadow-lg border-0">
                      <div className="flex items-center gap-2">
                        {getProductIcon(item.product_type || item.game_type)}
                        {getProductTypeLabel(item.product_type || item.game_type)}
                      </div>
                    </Badge>
                    {item.category && (
                      <Badge variant="outline" className="bg-white/95 border-0 font-medium px-4 py-2 rounded-full shadow-lg">
                        {item.category}
                      </Badge>
                    )}
                  </div>

                  {/* Price Badge */}
                  <div className="absolute bottom-6 right-6">
                    {parseFloat(item.price) === 0 ? (
                      <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-full shadow-xl">
                        <span className="text-lg font-bold" dir="rtl">חינם!</span>
                      </div>
                    ) : (
                      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-full shadow-xl">
                        <span className="text-lg font-bold">₪{item.price}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <CardContent className="p-8">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 text-right leading-tight">
                  {item.title}
                </h1>

                <p className="text-lg text-gray-700 mb-8 leading-relaxed text-right">
                  {item.description}
                </p>

                {/* Item Details Based on Type */}
                {itemType === 'game' && (
                  <div className="grid md:grid-cols-2 gap-6 mb-8">
                    {item.age_range && (
                      <div className="flex items-center gap-4 p-4 bg-purple-50 rounded-2xl">
                        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                          <Users className="w-6 h-6 text-purple-600" />
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-gray-900">טווח גילאים</div>
                          <div className="text-gray-600">{item.age_range}</div>
                        </div>
                      </div>
                    )}

                    {item.learning_topic && (
                      <div className="flex items-center gap-4 p-4 bg-green-50 rounded-2xl">
                        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                          <Target className="w-6 h-6 text-green-600" />
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-gray-900">נושא לימוד</div>
                          <div className="text-gray-600">{item.learning_topic}</div>
                        </div>
                      </div>
                    )}

                    {item.skills_learned && item.skills_learned.length > 0 && (
                      <div className="md:col-span-2">
                        <h3 className="font-bold text-gray-900 mb-4 text-right">כישורים נלמדים</h3>
                        <div className="flex flex-wrap gap-2 justify-end">
                          {item.skills_learned.map((skill, index) => (
                            <Badge key={index} variant="outline" className="bg-blue-50 border-blue-200 text-blue-800">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {itemType === 'product' && item.product_type === 'workshop' && (
                  <div className="grid md:grid-cols-2 gap-6 mb-8">
                    {item.scheduled_date && (
                      <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-2xl">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                          <Calendar className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-gray-900">תאריך ושעה</div>
                          <div className="text-gray-600">
                            {format(new Date(item.scheduled_date), 'dd/MM/yyyy HH:mm', { locale: he })}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-4 p-4 bg-green-50 rounded-2xl">
                      <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                        <Clock className="w-6 h-6 text-green-600" />
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-gray-900">משך ה{getProductTypeName('workshop', 'singular')}</div>
                        <div className="text-gray-600">{item.duration_minutes || 90} דקות</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 p-4 bg-purple-50 rounded-2xl">
                      <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                        <Users className="w-6 h-6 text-purple-600" />
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-gray-900">מספר משתתפים</div>
                        <div className="text-gray-600">עד {item.max_participants || 20} משתתפים</div>
                      </div>
                    </div>
                  </div>
                )}

                {itemType === 'product' && item.product_type === 'course' && item.course_modules && (
                  <div className="mb-8">
                    <h3 className="font-bold text-gray-900 mb-6 text-right text-xl">תכני ה{getProductTypeName('course', 'singular')}</h3>
                    <div className="space-y-3">
                      {item.course_modules.slice(0, 5).map((module, index) => (
                        <div key={index} className="flex items-center gap-3 p-4 bg-indigo-50 rounded-2xl">
                          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                          <div className="text-right flex-1">
                            <div className="font-medium text-gray-900">{module.title}</div>
                            {module.duration_minutes && (
                              <div className="text-sm text-gray-600">{module.duration_minutes} דקות</div>
                            )}
                          </div>
                        </div>
                      ))}
                      {item.course_modules.length > 5 && (
                        <div className="text-center py-3 text-gray-500 bg-gray-50 rounded-2xl">
                          ועוד {item.course_modules.length - 5} מודולים נוספים...
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {itemType === 'product' && item.product_type === 'file' && (
                  <div className="mb-8">
                    <div className="flex items-center gap-4 p-6 bg-indigo-50 rounded-2xl">
                      <div className="w-16 h-16 bg-indigo-100 rounded-xl flex items-center justify-center">
                        <Download className="w-8 h-8 text-indigo-600" />
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-gray-900 text-lg">{getProductTypeName('file', 'singular')} להורדה</div>
                        <div className="text-gray-600">סוג: {item.file_type?.toUpperCase() || 'PDF'}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Workshop Spots Warning */}
                {itemType === 'product' && item.product_type === 'workshop' && (
                  <>
                    {isFull ? (
                      <Alert className="mb-6 border-red-200 bg-red-50">
                        <AlertCircle className="h-5 w-5 text-red-600" />
                        <AlertDescription className="text-red-800 font-medium">
                          {purchaseTexts.workshopFull}
                        </AlertDescription>
                      </Alert>
                    ) : showSpotsWarning && spotsLeft !== null ? (
                      <Alert className="mb-6 border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50">
                        <Star className="h-5 w-5 text-orange-600" />
                        <AlertDescription className="text-orange-800 font-medium">
                          {purchaseTexts.spotsRemaining.replace('{spots}', spotsLeft)}
                        </AlertDescription>
                      </Alert>
                    ) : null}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Purchase Sidebar - Takes 1 column */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-6">
              <Card className="bg-white/95 backdrop-blur-xl shadow-xl shadow-purple-500/10 border-0 rounded-3xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <CreditCard className="w-6 h-6" />
                    רכישת {itemType === 'game' ? getProductTypeName('game', 'singular') : 'מוצר'}
                  </CardTitle>
                </CardHeader>

                <CardContent className="p-6 space-y-6">
                  {/* User Info */}
                  {currentUser && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4">
                      <h3 className="font-bold text-gray-900 mb-3 text-right">{purchaseTexts.userInfo}</h3>
                      <div className="space-y-2 text-right">
                        <div>
                          <Label className="text-sm font-medium text-gray-600">{purchaseTexts.fullName}</Label>
                          <p className="font-medium text-gray-900">
                            {currentUser.display_name || currentUser.full_name}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-600">{purchaseTexts.email}</Label>
                          <p className="font-medium text-gray-900 break-all">
                            {currentUser.email}
                          </p>
                        </div>
                        {currentUser.phone && (
                          <div>
                            <Label className="text-sm font-medium text-gray-600">{purchaseTexts.phone}</Label>
                            <p className="font-medium text-gray-900">
                              {currentUser.phone}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Test Mode Toggle - only for paid items */}
                  {parseFloat(item.price) > 0 && (
                    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-right flex-1">
                          <Label className="text-base font-bold text-gray-900">{purchaseTexts.testMode}</Label>
                          <p className="text-sm text-gray-600 mt-1">{purchaseTexts.testModeDescription}</p>
                        </div>
                        <div className="flex items-center gap-3 mr-4">
                          <TestTube className="w-5 h-5 text-orange-600" />
                          <Switch
                            checked={isTestMode}
                            onCheckedChange={setIsTestMode}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Price Summary */}
                  <div className="bg-gradient-to-r from-gray-50 to-slate-100 rounded-2xl p-6 text-center">
                    <div className="text-4xl font-bold mb-2">
                      {parseFloat(item.price) === 0 ? (
                        <span className="text-green-600" dir="rtl">חינם!</span>
                      ) : (
                        <span className="text-blue-600">₪{item.price}</span>
                      )}
                    </div>
                    {parseFloat(item.price) > 0 && (
                      <p className="text-sm text-gray-600">{purchaseTexts.priceIncludingVAT}</p>
                    )}
                  </div>

                  {/* Purchase Button */}
                  {currentUser ? (
                    <Button
                      onClick={handlePurchase}
                      disabled={isFull}
                      className={`w-full text-lg font-bold py-4 rounded-2xl shadow-lg ${
                        isFull 
                          ? 'bg-gray-400 cursor-not-allowed' 
                          : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white hover:shadow-xl transform hover:scale-105 transition-all duration-300'
                      }`}
                    >
                      <CreditCard className="w-6 h-6 ml-3" />
                      {isFull ? purchaseTexts.soldOut : getPurchaseButtonText()}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => User.login()}
                      className="w-full text-lg font-bold py-4 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                    >
                      {purchaseTexts.loginToPurchase}
                    </Button>
                  )}

                  {/* Security Badge */}
                  {parseFloat(item.price) > 0 && (
                    <div className="flex items-center justify-center gap-2 text-xs text-gray-500 pt-4 border-t">
                      <Shield className="w-4 h-4" />
                      {purchaseTexts.payplusSecurePayment}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
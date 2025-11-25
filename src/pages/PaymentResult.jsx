import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Game, Purchase, User, Workshop, Course, File, Tool, Product, Transaction } from "@/services/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  Download,
  Play,
  Calendar,
  Clock,
  FileText,
  Gamepad2
} from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { PRODUCT_TYPES, getProductTypeName } from "@/config/productTypes";
import { useUser } from "@/contexts/UserContext";
import { toast } from "@/components/ui/use-toast";

export default function PaymentResult() {
  const navigate = useNavigate();
  const { currentUser } = useUser();

  const [status, setStatus] = useState(null);
  const [purchase, setPurchase] = useState(null);
  const [item, setItem] = useState(null); // Changed from 'product' to 'item'
  const [itemType, setItemType] = useState('product'); // 'product' or 'game'
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFree, setIsFree] = useState(false);
  const [autoRedirectSeconds, setAutoRedirectSeconds] = useState(null);
  const [productId, setProductId] = useState(null);

  useEffect(() => {
    loadPaymentResult();
  }, []);

  // Auto redirect effect
  useEffect(() => {
    if (status === 'success' && purchase && item && !isLoading) {
      // Start 10 second countdown for auto redirect
      setAutoRedirectSeconds(10);

      const countdownInterval = setInterval(() => {
        setAutoRedirectSeconds(prev => {
          if (prev === 1) {
            handleAutoRedirect();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(countdownInterval);
    }
  }, [status, purchase, item, isLoading, navigate]);

  const handleAutoRedirect = async () => {
    try {
      // Check if this is part of a multi-product transaction
      if (purchase?.transaction_id) {
        // Find all purchases with the same transaction_id
        const relatedPurchases = await Purchase.filter({
          transaction_id: purchase.transaction_id
        });

        if (relatedPurchases && relatedPurchases.length > 1) {
          // Multiple products - redirect to account page
          navigate('/account');
          return;
        }
      }

      // Single product - redirect to product details page
      const redirectProductId = productId || purchase.product_id;
      if (redirectProductId) {
        navigate(`/product/${redirectProductId}`);
      } else {
        // Fallback to account page if no product ID found
        navigate('/account');
      }
    } catch (error) {
      console.error('Error determining redirect destination:', error);
      // Fallback to account page on error
      navigate('/account');
    }
  };

  const findProductId = async (entityType, entityId) => {
    try {
      console.log(`🔍 Finding Product ID for ${entityType}:`, entityId);

      // Search for Product with matching product_type and entity_id
      const products = await Product.filter({
        product_type: entityType,
        entity_id: entityId
      });

      if (products && products.length > 0) {
        const foundProductId = products[0].id;
        setProductId(foundProductId);
        console.log(`✅ Found Product ID:`, foundProductId);
      } else {
        console.log(`⚠️ No Product found for ${entityType}:${entityId}`);
      }
    } catch (error) {
      console.error('❌ Error finding Product ID:', error);
    }
  };

  const loadPaymentResult = async () => {
    // TODO remove debug - fix payment result page transaction lookup
    console.log('🚀 loadPaymentResult function called');
    console.log('🚀 window.location.search:', window.location.search);

    try {
      const urlParams = new URLSearchParams(window.location.search);
      // TODO remove debug - fix payment result page transaction lookup
      console.log('🚀 URLSearchParams created:', urlParams.toString());

      // Check for PayPlus parameters first
      const transactionUid = urlParams.get('transaction_uid');
      const pageRequestUid = urlParams.get('page_request_uid');

      // TODO remove debug - fix payment result page transaction lookup
      console.log('🚀 Extracted parameters:', { transactionUid, pageRequestUid });

      // Fallback to original parameters
      const paymentStatus = urlParams.get('status');
      const orderNumber = urlParams.get('order');
      const type = urlParams.get('type'); // 'game' or undefined (defaults to 'product')
      const freeParam = urlParams.get('free'); // 'true' if free item

      let finalStatus = paymentStatus;
      let finalOrderNumber = orderNumber;

      // Handle PayPlus redirect parameters
      if (pageRequestUid && !paymentStatus) {
        console.log('🔍 PayPlus redirect detected, finding transaction by payment_page_request_uid:', pageRequestUid);

        try {
          // TODO remove debug - fix payment result page transaction lookup
          console.log('🔍 Searching for transaction with payment_page_request_uid:', pageRequestUid);

          // Find transaction by PayPlus payment_page_request_uid
          const transactions = await Transaction.filter({
            payment_page_request_uid: pageRequestUid
          });

          // TODO remove debug - fix payment result page transaction lookup
          console.log('🔍 Transaction search result:', transactions);

          if (transactions && transactions.length > 0) {
            const transactionData = transactions[0];
            finalOrderNumber = transactionData.id;

            // Determine status from transaction presence and status
            if (transactionUid && transactionData.status === 'pending') {
              // Payment completed (we have transaction_uid), but webhook may not have fired yet
              finalStatus = 'success';
            } else {
              // Use existing transaction status
              const statusMap = {
                'completed': 'success',
                'failed': 'failure',
                'cancelled': 'cancel',
                'pending': transactionUid ? 'success' : 'pending'
              };
              finalStatus = statusMap[transactionData.status] || 'unknown';
            }

            // Set the transaction as our order number for later lookup
            finalOrderNumber = transactionData.id;
          } else {
            console.log('⚠️ No transaction found for payment_page_request_uid:', pageRequestUid);
            finalStatus = transactionUid ? 'success' : 'unknown';
          }
        } catch (searchError) {
          console.error('Error searching for transaction by PayPlus UID:', searchError);
          finalStatus = transactionUid ? 'success' : 'unknown';
        }
      }

      setStatus(finalStatus);
      setItemType(type === 'game' ? 'game' : 'product');
      setIsFree(freeParam === 'true');

      // Current user is already available from global state via useUser()

      if (finalOrderNumber) {
        // Find purchase by transaction_id, transaction_uid, or purchase ID
        try {
          let purchases = [];

          // First try to find by transaction_id (for new Transaction-based lookups)
          if (finalOrderNumber.startsWith('txn_')) {
            purchases = await Purchase.filter({
              transaction_id: finalOrderNumber
            });
          }

          // If not found, try by transaction_uid in metadata (legacy)
          if (purchases.length === 0) {
            purchases = await Purchase.filter({
              metadata: { transaction_uid: finalOrderNumber }
            });
          }

          // If not found and finalOrderNumber looks like a purchase ID, try direct ID lookup
          if (purchases.length === 0 && finalOrderNumber.startsWith('pur_')) {
            purchases = await Purchase.filter({ id: finalOrderNumber });
          }
          
          if (purchases.length > 0) {
            const purchaseData = purchases[0];
            setPurchase(purchaseData);

            // Load the associated item (product or game)
            // Handle both new polymorphic and legacy purchase structures
            if (purchaseData.purchasable_type && purchaseData.purchasable_id) {
              // New polymorphic structure
              try {
                let itemData;
                const entityType = purchaseData.purchasable_type;
                const entityId = purchaseData.purchasable_id;

                switch (entityType) {
                  case 'workshop':
                    itemData = await Workshop.findById(entityId);
                    break;
                  case 'course':
                    itemData = await Course.findById(entityId);
                    break;
                  case 'file':
                    itemData = await File.findById(entityId);
                    break;
                  case 'tool':
                    itemData = await Tool.findById(entityId);
                    break;
                  case 'game':
                    itemData = await Game.findById(entityId);
                    break;
                  default:
                    throw new Error(`Unknown entity type: ${entityType}`);
                }
                setItem(itemData);
                setItemType(entityType);

                // Find the corresponding Product ID
                await findProductId(entityType, entityId);
              } catch (itemError) {
                console.error('❌ Error loading item:', itemError);
                setError('לא ניתן לטעון את פרטי הפריט שנרכש');
              }
            } else if (purchaseData.product_id) {
              // Legacy structure - try different entities
              try {
                let itemData;
                if (type === 'game') {
                  itemData = await Game.findById(purchaseData.product_id);
                } else {
                  // Default to workshop for legacy product_id
                  itemData = await Workshop.findById(purchaseData.product_id);
                  setItemType('workshop');
                }
                setItem(itemData);
              } catch (itemError) {
                console.error('Error loading item:', itemError);
                // Try Game as fallback for legacy data
                try {
                  const fallbackItem = await Game.findById(purchaseData.product_id);
                  setItem(fallbackItem);
                  setItemType('game');
                } catch (fallbackError) {
                  console.error('Fallback also failed:', fallbackError);
                  setError('לא ניתן לטעון את פרטי המוצר');
                }
              }
            }
          } else {
            console.error('Purchase not found for order:', finalOrderNumber);
            setError('רכישה לא נמצאה');
          }
        } catch (purchaseError) {
          console.error('Error finding purchase:', purchaseError);
          setError('שגיאה בחיפוש הרכישה');
        }
      }

    } catch (error) {
      console.error('Error loading payment result:', error);
      setError('שגיאה בטעינת תוצאות התשלום');
    }
    
    setIsLoading(false);
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />;
      case 'failure':
        return <XCircle className="w-16 h-16 text-red-500 mx-auto" />;
      case 'cancel':
        return <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto" />;
      default:
        return <AlertTriangle className="w-16 h-16 text-gray-500 mx-auto" />;
    }
  };

  const getStatusTitle = () => {
    if (isFree) {
      return status === 'success' ? 'קיבלת גישה חינם בהצלחה!' : 'שגיאה בקבלת הגישה החינם';
    }
    
    switch (status) {
      case 'success':
        return 'התשלום הושלם בהצלחה!';
      case 'failure':
        return 'התשלום נכשל';
      case 'cancel':
        return 'התשלום בוטל';
      default:
        return 'מצב תשלום לא ידוע';
    }
  };

  const getStatusMessage = () => {
    if (isFree && status === 'success') {
      if (itemType === 'game') {
        return `ה${getProductTypeName('game', 'singular')} נוסף ל${getProductTypeName('game', 'plural')} שלך. תוכל להתחיל לשחק עכשיו!`;
      } else {
        return 'המוצר נוסף לחשבון שלך. תוכל לגשת אליו עכשיו!';
      }
    }
    
    switch (status) {
      case 'success':
        return 'תודה על הרכישה! המוצר זמין עכשיו בחשבון שלך.';
      case 'failure':
        return 'התשלום לא הושלם. אנא נסה שוב או פנה לתמיכה.';
      case 'cancel':
        return 'ביטלת את התשלום. תוכל לנסות שוב בכל עת.';
      default:
        return 'מצב התשלום לא ברור. אנא פנה לתמיכה.';
    }
  };

  const getItemIcon = () => {
    if (itemType === 'game') {
      return <Gamepad2 className="w-5 h-5 text-purple-600" />;
    }
    
    if (!item) return <FileText className="w-5 h-5 text-gray-600" />;
    
    switch (item.product_type) {
      case 'workshop':
        return <Calendar className="w-5 h-5 text-blue-600" />;
      case 'course':
        return <Play className="w-5 h-5 text-green-600" />;
      case 'file':
        return <FileText className="w-5 h-5 text-purple-600" />;
      default:
        return <FileText className="w-5 h-5 text-gray-600" />;
    }
  };

  const getActionButton = () => {
    if (status !== 'success') {
      return (
        <Button 
          onClick={() => navigate("/")}
          className="w-full"
        >
          <ArrowLeft className="w-4 h-4 ml-2" />
          חזרה לדף הבית
        </Button>
      );
    }

    if (itemType === 'game') {
      return (
        <div className="space-y-3">
          <Button
            onClick={() => navigate("/games")}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            <Gamepad2 className="w-4 h-4 ml-2" />
            לכל ה{getProductTypeName('game', 'plural')}
          </Button>
          {item && (
            <Button 
              onClick={() => navigate(`/launcher?game=${item.id}`)}
              className="w-full"
              variant="outline"
            >
              <Play className="w-4 h-4 ml-2" />
              שחק עכשיו
            </Button>
          )}
        </div>
      );
    }

    // For products
    if (!item) {
      return (
        <Button
          onClick={() => navigate("/account")}
          className="w-full"
        >
          לחשבון שלי
        </Button>
      );
    }

    const buttons = [];

    // Add "View Product Details" button first for all product types
    const viewProductId = productId || purchase.product_id;
    if (viewProductId) {
      buttons.push(
        <Button
          key="view-product"
          onClick={() => navigate(`/product/${viewProductId}`)}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          <FileText className="w-4 h-4 ml-2" />
          צפה בפרטי המוצר
        </Button>
      );
    }

    // Add product-specific action
    if (item.product_type === 'workshop') {
      buttons.push(
        <Button
          key="catalog"
          onClick={() => navigate("/games")}
          className="w-full"
          variant="outline"
        >
          <Calendar className="w-4 h-4 ml-2" />
          ל{getProductTypeName('workshop', 'plural')} שלי
        </Button>
      );
    } else if (item.product_type === 'course') {
      buttons.push(
        <Button
          key="courses"
          onClick={() => navigate("/courses")}
          className="w-full"
          variant="outline"
        >
          <Play className="w-4 h-4 ml-2" />
          ל{getProductTypeName('course', 'plural')} שלי
        </Button>
      );

      if (item.course_modules && item.course_modules.length > 0) {
        buttons.push(
          <Button
            key="start-course"
            onClick={() => navigate(`/course?course=${item.id}`)}
            className="w-full"
            variant="outline"
          >
            <Play className="w-4 h-4 ml-2" />
            התחל את ה{getProductTypeName('course', 'singular')}
          </Button>
        );
      }
    } else if (item.product_type === PRODUCT_TYPES.file.key) {
      buttons.push(
        <Button
          key={PRODUCT_TYPES.file.key}
          onClick={() => navigate(PRODUCT_TYPES.file.url)}
          className="w-full"
          variant="outline"
        >
          <FileText className="w-4 h-4 ml-2" />
          ל{getProductTypeName('file', 'plural')} שלי
        </Button>
      );

      if (item.file_url) {
        buttons.push(
          <Button
            key="download"
            onClick={() => window.open(item.file_url, '_blank')}
            className="w-full"
            variant="outline"
          >
            <Download className="w-4 h-4 ml-2" />
            הורד עכשיו
          </Button>
        );
      }
    }

    // Add general account button
    buttons.push(
      <Button
        key="account"
        onClick={() => navigate("/account")}
        className="w-full"
        variant="outline"
      >
        לחשבון שלי
      </Button>
    );

    return <div className="space-y-3">{buttons}</div>;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">טוען תוצאות...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto py-8">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card className="shadow-lg">
          <CardHeader className="text-center pb-2">
            {getStatusIcon()}
            <CardTitle className={`text-2xl mt-4 ${
              status === 'success' ? 'text-green-700' : 
              status === 'failure' ? 'text-red-700' : 
              'text-yellow-700'
            }`}>
              {getStatusTitle()}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-center text-gray-600 text-lg">
              {getStatusMessage()}
            </p>

            {autoRedirectSeconds > 0 && status === 'success' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                <p className="text-blue-800 text-sm">
                  עובר לעמוד המוצר בעוד {autoRedirectSeconds} שניות...
                </p>
                <Button
                  onClick={() => setAutoRedirectSeconds(null)}
                  variant="ghost"
                  size="sm"
                  className="text-blue-600 hover:text-blue-800 mt-2"
                >
                  בטל מעבר אוטומטי
                </Button>
              </div>
            )}

            {item && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  {getItemIcon()}
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{item.title}</h3>
                    {item.short_description && (
                      <p className="text-sm text-gray-600 mt-1">{item.short_description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      {isFree ? (
                        <span className="text-green-600 font-medium">חינם</span>
                      ) : purchase && (
                        <span>₪{purchase.payment_amount}</span>
                      )}
                      {purchase && !purchaseUtils.hasLifetimeAccess(purchase) && (
                        <span className="flex items-center gap-1 text-blue-600">
                          <Clock className="w-3 h-3" />
                          גישה עד: {purchaseUtils.formatAccessExpiry(purchase)}
                        </span>
                      )}
                      {purchase && purchaseUtils.hasLifetimeAccess(purchase) && (
                        <span className="text-green-600 font-medium">גישה לכל החיים</span>
                      )}
                      {itemType === 'product' && item.product_type === 'workshop' && item.scheduled_date && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(item.scheduled_date), 'dd/MM/yyyy HH:mm', { locale: he })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {purchase && (
              <div className="text-center text-sm text-gray-500">
                מספר עסקה: #{purchase.metadata?.transaction_uid || purchase.id}
              </div>
            )}

            <div className="pt-4">
              {getActionButton()}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
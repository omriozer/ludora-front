import React, { useState, useEffect } from 'react';
import { Workshop, Coupon, Purchase, Notification } from "@/services/entities";
import { useUser } from "@/contexts/UserContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import PaymentModal from "../components/PaymentModal";
import { getProductTypeName } from "@/config/productTypes";
import {
  CreditCard,
  Clock,
  Calendar,
  User as UserIcon,
  Mail,
  Phone,
  AlertCircle,
  CheckCircle,
  Loader2,
  Settings as SettingsIcon, // Renamed to avoid conflict with entity
  ArrowRight,
  BookOpen,
  Users,
  Play
} from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { createPayplusPaymentPage } from '@/services/functions';
import { cerror, clog } from "@/lib/utils";

export default function Registration() {
  const navigate = useNavigate();
  // Use global state from UserContext instead of direct API calls
  const { currentUser, settings, isLoading: userLoading } = useUser();

  const [existingRegistration, setExistingRegistration] = useState(null);
  const [workshop, setWorkshop] = useState(null); // This will now hold Product data
  const [workshopId, setWorkshopId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState(null);
  const [isTestMode, setIsTestMode] = useState(true);
  const [originalPrice, setOriginalPrice] = useState(0);
  const [finalPrice, setFinalPrice] = useState(0);

  // Registration form data
  const [formData, setFormData] = useState({
    participant_name: '',
    participant_phone: ''
  });
  
  // Payment modal states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState(null);
  const [currentOrderNumber, setCurrentOrderNumber] = useState(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Initial data load
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const workshopIdParam = urlParams.get("workshop"); // Use a distinct name for the parameter

      if (!workshopIdParam) {
        setMessage({ type: 'error', text: `לא נמצא מזהה ${getProductTypeName('workshop', 'singular')}` });
        setIsLoading(false);
        return;
      }

      setWorkshopId(workshopIdParam); // Update the state variable

      // Load product data (user and settings come from global state)
      const productData = await Workshop.get(workshopIdParam);

      if (!productData) {
        setMessage({ type: 'error', text: `${getProductTypeName('workshop', 'singular')} לא נמצאה` });
        setIsLoading(false);
        return;
      }
      setWorkshop(productData); // `workshop` state now holds `Product` data
      setOriginalPrice(productData.price);
      setFinalPrice(productData.price);

      // Check if user already registered for this product/workshop
      if (currentUser) {
        const existingPurchases = await Purchase.filter({
          $or: [
            { purchasable_type: 'workshop', purchasable_id: workshopIdParam, user_id: currentUser.id },
            { product_id: workshopIdParam, user_id: currentUser.id } // Legacy fallback
          ]
        });

        if (existingPurchases.length > 0) {
          const purchase = existingPurchases[0];
          setExistingRegistration(purchase); // Reuse existing state variable

          // Pre-fill form with existing purchase data if available
          setFormData(prev => ({
            ...prev,
            participant_name: purchase.buyer_name || '',
            participant_phone: purchase.buyer_phone || ''
          }));
        } else {
          // Pre-fill form with user data if no existing registration
          setFormData(prev => ({
            ...prev,
            participant_name: currentUser.display_name || currentUser.full_name || '',
            participant_phone: currentUser.phone || ''
          }));
        }
      }

    } catch (error) {
      cerror("Error loading data:", error);
      setMessage({ type: 'error', text: `שגיאה בטעינת נתוני ה${getProductTypeName('workshop', 'singular')}` });
    }
    setIsLoading(false);
  };

  const handleNewRegistration = async () => {
    if (!workshop) return;

    // Validate form
    if (!formData.participant_name.trim()) {
      setMessage({ type: 'error', text: 'שם מלא הוא שדה חובה' });
      return;
    }

    if (!currentUser || !currentUser.email) {
      setMessage({ type: 'error', text: 'נדרש להיות מחובר למערכת' });
      return;
    }

    if (!formData.participant_phone.trim()) {
      setMessage({ type: 'error', text: 'מספר טלפון הוא שדה חובה' });
      return;
    }

    setIsProcessing(true);
    setMessage(null);

    try {
      // Create purchase record
      const orderNumber = `EDU-${Date.now().toString().slice(-6)}`;
      const purchaseData = {
        purchasable_type: 'workshop',
        purchasable_id: workshop.id,
        user_id: currentUser.id,
        buyer_name: formData.participant_name.trim(),
        buyer_user_id: currentUser.id,
        buyer_phone: formData.participant_phone.trim(),
        total_amount: finalPrice,
        payment_status: 'pending',
        purchase_id: orderNumber,
        environment: isTestMode ? 'test' : 'production'
      };

      const newPurchase = await Purchase.create(purchaseData);

      // Create payment page
      const { data: paymentData, error: paymentError } = await createPayplusPaymentPage({
        registrationId: newRegistration.id,
        environment: isTestMode ? 'test' : 'production',
        frontendOrigin: window.location.origin
      });

      if (paymentError || !paymentData?.payment_url) {
        cerror('PayPlus error:', paymentError, paymentData);
        setMessage({ type: 'error', text: paymentData?.error || 'שגיאה ביצירת דף התשלום' });
        setIsProcessing(false);
        return;
      }

      // Open payment modal
      setPaymentUrl(paymentData.payment_url);
      setCurrentOrderNumber(orderNumber);
      setShowPaymentModal(true);
      setIsProcessing(false);

    } catch (error) {
      cerror("Error creating registration:", error);
      setMessage({ type: 'error', text: 'שגיאה ביצירת ההרשמה' });
      setIsProcessing(false);
    }
  };

  const handleCompletePendingPayment = async () => {
    if (!existingRegistration) return;

    if (isProcessing) return;

    setIsProcessing(true);
    setMessage(null);

    try {
      const { data: paymentData, error: paymentError } = await createPayplusPaymentPage({
        registrationId: existingRegistration.id,
        environment: isTestMode ? 'test' : 'production',
        frontendOrigin: window.location.origin
      });

      if (paymentError || !paymentData?.payment_url) {
        setMessage({ type: 'error', text: 'שגיאה ביצירת דף התשלום' });
        setIsProcessing(false);
        return;
      }

      setPaymentUrl(paymentData.payment_url);
      setCurrentOrderNumber(existingRegistration.purchase_id);
      setShowPaymentModal(true);
      setIsProcessing(false);

    } catch (error) {
      cerror("Error creating payment page:", error);
      setMessage({ type: 'error', text: 'שגיאה ביצירת דף התשלום' });
      setIsProcessing(false);
    }
  };

  const handlePaymentSuccess = async (paymentData) => {
    try {
      let registrationToUpdate = existingRegistration;

      // If this is a new purchase, find the purchase by order number
      if (!existingRegistration && currentOrderNumber) {
        const purchases = await Purchase.filter({ purchase_id: currentOrderNumber });
        if (purchases.length > 0) {
          registrationToUpdate = purchases[0];
        }
      }

      if (registrationToUpdate) {
        await Purchase.update(registrationToUpdate.id, { payment_status: 'paid' });

        if (existingRegistration && existingRegistration.id === registrationToUpdate.id) {
          setExistingRegistration(prev => ({
            ...prev,
            payment_status: 'paid'
          }));
        }
      }

    } catch (error) {
      cerror('Error handling payment success:', error);
    }
    
    setMessage({ type: 'success', text: 'התשלום בוצע בהצלחה! ההרשמה אושרה.' });
    setPaymentSuccess(true);
    
    setTimeout(() => {
      setShowPaymentModal(false);
      setPaymentUrl(null);
      setCurrentOrderNumber(null);
      setIsProcessing(false);
      setPaymentSuccess(false);
      
      setTimeout(() => {
        navigate("/account?payment=success");
      }, 1000);
    }, 2000);
  };

  const handleCloseModal = () => {
    setShowPaymentModal(false);
    setPaymentUrl(null);
    setCurrentOrderNumber(null);
    setIsProcessing(false);
    setPaymentSuccess(false);
  };

  // Check if workshop is past and no recording yet
  const isWorkshopPastWithoutRecording = workshop && 
    workshop.scheduled_date && 
    new Date(workshop.scheduled_date) <= new Date() && 
    !workshop.recording_url;

  // Check if user has active access
  const hasActiveAccess = existingRegistration &&
    existingRegistration.payment_status === 'paid' &&
    (existingRegistration.purchased_lifetime_access ||
     (existingRegistration.access_until && new Date(existingRegistration.access_until) > new Date()) ||
     (!existingRegistration.access_until && !existingRegistration.purchased_lifetime_access)); // Default access if not specified

  // Show loading while either global user data is loading OR local workshop data is loading
  if (userLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">טוען...</p>
        </div>
      </div>
    );
  }

  if (!workshop) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">שגיאה</h2>
            <p className="text-gray-600 mb-4">לא ניתן למצוא את ה{getProductTypeName('workshop', 'singular')}</p>
            <Button onClick={() => navigate("/games")} variant="outline">
              <ArrowRight className="w-4 h-4 ml-2" />
              חזור לקטלוג {getProductTypeName('workshop', 'plural')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8" dir="rtl">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {existingRegistration ? 'השלמת תשלום' : `הרשמה ל${getProductTypeName('workshop', 'singular')}`}
          </h1>
          <p className="text-gray-600">
            {existingRegistration 
              ? 'כמעט סיימת! השלם את התשלום כדי לאשר את ההרשמה שלך'
              : `מלא את הפרטים שלך ובצע תשלום כדי להירשם ל${getProductTypeName('workshop', 'singular')}`
            }
          </p>
        </div>

        {message && (
          <Alert variant={message.type === 'error' ? 'destructive' : message.type === 'info' ? 'default' : 'success'} className="mb-6">
            {message.type === 'error' ? <AlertCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Workshop Details */}
          <div className="lg:col-span-1">
            <Card className="border-none shadow-lg sticky top-8">
              <CardHeader>
                <CardTitle className="text-xl">{workshop.title}</CardTitle>
                <Badge className="w-fit">
                  {workshop.type === "online_live" ? "אונליין בזמן אמת" :
                   workshop.type === "recorded" ? "מוקלט" : "אונליין + מוקלט"}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                {workshop.image_url && (
                  <img
                    src={workshop.image_url}
                    alt={workshop.title}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                )}
                
                <p className="text-gray-600">{workshop.description}</p>

                <div className="space-y-4 text-sm text-gray-600">
                  {workshop.scheduled_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {format(new Date(workshop.scheduled_date), 'dd/MM/yyyy HH:mm', { locale: he })}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{workshop.duration_minutes} דקות</span>
                  </div>
                  
                  {/* Only show participant count for upcoming online workshops */}
                  {workshop.type !== "recorded" && workshop.scheduled_date && new Date(workshop.scheduled_date) > new Date() && (
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>עד {workshop.max_participants} משתתפים</span>
                    </div>
                  )}

                  {/* Recording access info */}
                  <div className="flex items-center gap-2 text-green-600">
                    <Play className="w-4 h-4" />
                    <span>גישה להקלטה למשך {workshop.recording_access_days || 30} יום</span>
                  </div>
                </div>

                {/* Past workshop without recording notice */}
                {isWorkshopPastWithoutRecording && (
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-900 mb-1">{getProductTypeName('workshop', 'singular')} מוקלטת בהכנה</h4>
                        <p className="text-sm text-blue-800">
                          מועד ה{getProductTypeName('workshop', 'singular')} החיה עבר. ההקלטה תעלה בימים הקרובים.
                        </p>
                        <p className="text-sm text-blue-800 mt-1">
                          <strong>זמן הגישה:</strong> {workshop.recording_access_days || 30} ימים החל ממועד פרסום ההקלטה.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="border-t pt-4">
                  <div className="text-2xl font-bold text-blue-600">₪{finalPrice}</div>
                  {originalPrice > finalPrice && (
                    <div className="text-sm text-gray-500">
                      <span className="line-through">₪{originalPrice}</span>
                      <span className="text-green-600 mr-2">חסכת ₪{originalPrice - finalPrice}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Registration Form & Payment */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Registration Form */}
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserIcon className="w-5 h-5 text-green-600" />
                  פרטי ההרשמה
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">שם מלא *</Label>
                  <Input
                    id="name"
                    value={formData.participant_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, participant_name: e.target.value }))}
                    placeholder="השם המלא שלך"
                    disabled={existingRegistration && existingRegistration.payment_status === 'paid'}
                  />
                </div>

                {/* Email will be taken from logged-in user */}
                <div className="space-y-2">
                  <Label>כתובת אימייל</Label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-600">
                    {currentUser?.email || 'לא מחובר'}
                  </div>
                  <p className="text-sm text-gray-500">האימייל נלקח מהחשבון המחובר</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">מספר טלפון *</Label>
                  <Input
                    id="phone"
                    value={formData.participant_phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, participant_phone: e.target.value }))}
                    placeholder="050-1234567"
                    disabled={existingRegistration && existingRegistration.payment_status === 'paid'}
                  />
                </div>
                
                {existingRegistration && existingRegistration.purchase_id && (
                  <div className="pt-2 border-t">
                    <Badge variant="outline" className="font-mono">
                      מספר הזמנה: {existingRegistration.purchase_id}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Section */}
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-purple-600" />
                  סיכום תשלום
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">מחיר ה{getProductTypeName('workshop', 'singular')}:</span>
                  <span className="font-semibold">₪{finalPrice}</span>
                </div>

                <div className="flex justify-between items-center py-2 text-lg font-bold">
                  <span>סה"כ לתשלום:</span>
                  <span className="text-blue-600">₪{finalPrice}</span>
                </div>

                {/* Environment Toggle */}
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between mb-4">
                    <Label htmlFor="test-mode" className="flex items-center gap-2">
                      <SettingsIcon className="w-4 h-4" /> {/* Using renamed icon */}
                      מצב בדיקה
                    </Label>
                    <Switch
                      id="test-mode"
                      checked={isTestMode}
                      onCheckedChange={setIsTestMode}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    {isTestMode 
                      ? 'התשלום יתבצע במצב בדיקה (לא יחויב כסף אמיתי)'
                      : 'התשלום יתבצע במצב ייצור (חיוב אמיתי)'
                    }
                  </p>
                </div>

                <Button 
                  onClick={existingRegistration && existingRegistration.payment_status === 'pending' ? handleCompletePendingPayment : handleNewRegistration}
                  disabled={isProcessing || hasActiveAccess || (existingRegistration && existingRegistration.payment_status === 'paid')}
                  className="w-full bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                      מעבד...
                    </>
                  ) : hasActiveAccess ? (
                    <>
                      <CheckCircle className="w-4 h-4 ml-2" />
                      גישה פעילה
                    </>
                  ) : existingRegistration && existingRegistration.payment_status === 'pending' ? (
                    <>
                      <CreditCard className="w-4 h-4 ml-2" />
                      השלם תשלום - ₪{finalPrice}
                    </>
                  ) : (
                    <>
                      <BookOpen className="w-4 h-4 ml-2" />
                      הירשם עכשיו - ₪{finalPrice}
                    </>
                  )}
                </Button>

                <div className="pt-4 border-t text-center">
                  <p className="text-xs text-gray-500">
                    התשלום מאובטח ומוצפן באמצעות PayPlus
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Payment Modal */}
        <PaymentModal
          isOpen={showPaymentModal}
          paymentUrl={paymentUrl}
          orderNumber={currentOrderNumber}
          onClose={handleCloseModal}
          onPaymentSuccess={handlePaymentSuccess}
        />

        {/* Success Modal Overlay */}
        {paymentSuccess && showPaymentModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4" style={{ zIndex: 9999999 }}>
            <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full text-center">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">תשלום בוצע בהצלחה!</h3>
              <p className="text-gray-600 mb-4">ההרשמה שלך אושרה ותקבל מייל אישור בקרוב.</p>
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mx-auto"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

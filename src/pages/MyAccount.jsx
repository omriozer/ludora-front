import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { User, Notification, SubscriptionPlan, Settings } from "@/services/entities"; // Added Settings import
import { purchaseUtils } from "@/utils/api.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Play,
  Calendar,
  Clock,
  DollarSign,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  User as UserIcon,
  MessageSquare,
  X,
  Edit,
  Save,
  Crown,
  CreditCard,
  Gift // New icon imported for free plans
} from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import SubscriptionModal from "../components/SubscriptionModal";
import PurchaseHistory from "@/components/PurchaseHistory";
import { useSubscriptionState } from "@/hooks/useSubscriptionState";
import SubscriptionBusinessLogic from "@/services/SubscriptionBusinessLogic";
import { clog, cerror } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';

const MyAccount = () => {
  const navigate = useNavigate();
  const [registrations, setRegistrations] = useState([]);
  const [workshops, setWorkshops] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [supportPopup, setSupportPopup] = useState({ show: false, registrationId: null });
  const [supportMessage, setSupportMessage] = useState("");

  // Edit mode states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editedProfile, setEditedProfile] = useState({});

  // Subscription modal
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  const [accountTexts, setAccountTexts] = useState({});
  const [settings, setSettings] = useState(null); // New state for global settings

  // Use the new subscription state hook
  const subscriptionState = useSubscriptionState(currentUser);

  // Modified getSettings function to fetch from Settings entity and handle defaults
  const getSettings = useCallback(async () => {
    try {
      const settingsData = await Settings.find();
      console.log('Raw settings data:', settingsData); // Debug
      
      if (settingsData && settingsData.length > 0) {
        const settings = settingsData[0];
        console.log('Using settings:', settings); // Debug
        console.log('Subscription system enabled from settings:', settings.subscription_system_enabled); // Debug
        return settings;
      } else {
        console.log('No settings found, returning defaults'); // Debug
        // Default to false if no settings are found, ensuring subscription features are off by default
        return { subscription_system_enabled: false }; 
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      // Default to false on error, preventing potential errors in subscription logic
      return { subscription_system_enabled: false }; 
    }
  }, []);


  // Add function to check and update user subscription
  const checkAndUpdateUserSubscription = useCallback(async (user) => {
    try {
      // Check if subscription end date has passed for active subscriptions
      if (user.subscription_status === 'active' &&
          user.subscription_end_date &&
          user.payplus_subscription_uid) {

        const endDate = new Date(user.subscription_end_date);
        const now = new Date();

        if (endDate < now) {
          console.log('[MY_ACCOUNT] Subscription end date passed, checking PayPlus status...');

          // Simple check: if subscription end date has passed, reset to free plan
          console.log('[MY_ACCOUNT] Subscription end date passed, resetting to free plan');
          await User.updateMyUserData({
            current_subscription_plan_id: null,
            subscription_status: 'free_plan',
            subscription_end_date: null,
            payplus_subscription_uid: null,
            subscription_status_updated_at: now.toISOString()
          });

          setMessage({ type: 'error', text: 'המנוי שלך פג. אנא חדש את המנוי כדי להמשיך להשתמש בשירות.' });

          return {
            ...user,
            current_subscription_plan_id: null,
            subscription_status: 'free_plan',
            subscription_end_date: null,
            payplus_subscription_uid: null,
            subscription_status_updated_at: now.toISOString()
          };
        }
      }

      return user;
    } catch (error) {
      console.error('[MY_ACCOUNT] Error in checkAndUpdateUserSubscription:', error);
      return user;
    }
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const texts = {
        title: "החשבון שלי",
        subtitle: "נהלי את ההרשמות והגישה להקלטות שלך",
        personalInfo: "פרטים אישיים",
        fullName: "שם מלא",
        email: "אימייל",
        phone: "טלפון",
        subscriptionInfo: "מידע מנוי",
        mySubscription: "המנוי שלי",
        currentPlan: "תוכנית נוכחית",
        changePlan: "שינוי תוכנית",
        purchaseHistory: "היסטוריית רכישות",
        noHistory: "אין היסטוריית רכישות",
        loading: "טוען נתונים...",
        edit: "עריכה",
        save: "שמירה",
        cancel: "ביטול"
      };
      setAccountTexts(texts);

      // Load global settings first with debug
      console.log('Loading settings...'); // Debug
      const settingsData = await getSettings();
      console.log('Settings loaded:', settingsData); // Debug
      console.log('Subscription system enabled:', settingsData?.subscription_system_enabled); // Debug
      setSettings(settingsData);

      let user = await User.me();

      // Only proceed with subscription logic if subscription system is enabled
      const isSubscriptionSystemEnabled = settingsData?.subscription_system_enabled === true;
      console.log('Is subscription system enabled?', isSubscriptionSystemEnabled); // Debug

      if (!isSubscriptionSystemEnabled) {
        console.log('Subscription system is disabled, skipping all subscription checks'); // Debug
        setCurrentUser(user);
        setEditedProfile({
          display_name: user.display_name || user.full_name || '',
          phone: user.phone || ''
        });
        setCurrentSubscriptionPlan(null); // Ensure no subscription plan is shown

        // Clear legacy data since Registration is removed
        setRegistrations([]);
        setWorkshops([]);

        setIsLoading(false);
        return; // Exit early if subscription system is disabled
      }

      console.log('Subscription system is enabled, continuing with subscription logic...'); // Debug

      // Check if user has pending subscription
      if (user.subscription_status === 'pending') {
        console.log('Found user with pending subscription status');
        setMessage({ type: 'info', text: 'המנוי שלך נמצא בתהליך עיבוד. אנא המתן מספר דקות.' });
      }

      // Handle pending subscriptions timeout
      if (user.subscription_status === 'pending' && user.subscription_status_updated_at) {
        const updatedAt = new Date(user.subscription_status_updated_at);
        const now = new Date();
        const minutesElapsed = Math.floor((now.getTime() - updatedAt.getTime()) / 60000);

        if (minutesElapsed >= 5) {
          console.log('[MY_ACCOUNT] Resetting expired pending subscription (timeout 5 min)');
          try {
            await User.updateMyUserData({
              current_subscription_plan_id: null,
              subscription_status: 'free_plan',
              subscription_status_updated_at: now.toISOString(),
              payplus_subscription_uid: null
            });
            setMessage({ type: 'info', text: 'המנוי שלך לא אושר בזמן ובוטל. אנא נסה שוב או צור קשר עם התמיכה.' });

            user = {
              ...user,
              current_subscription_plan_id: null,
              subscription_status: 'free_plan',
              subscription_status_updated_at: now.toISOString(),
              payplus_subscription_uid: null
            };
          } catch (error) {
            console.error('Error resetting pending subscription:', error);
          }
        }
      }

      setCurrentUser(user);
      setEditedProfile({
        display_name: user.display_name || user.full_name || '',
        phone: user.phone || ''
      });

      // Note: Subscription state is now handled by useSubscriptionState hook
      // No need to manually load subscription plans or check subscription status

      // Clear legacy data since Registration is removed
      setRegistrations([]);
      setWorkshops([]);

    } catch (error) {
      console.error("Error loading data:", error);
      setMessage({ type: 'error', text: 'שגיאה בטעינת הנתונים' });
    }
    setIsLoading(false);
  }, [checkAndUpdateUserSubscription, getSettings]); // Added getSettings to dependencies

  useEffect(() => {
    loadData();
  }, [loadData]); // loadData is now a useCallback, so it's a stable dependency.


  const handleSaveProfile = async () => {
    try {
      await User.updateMyUserData(editedProfile);
      setCurrentUser(prev => ({ ...prev, ...editedProfile }));
      setIsEditingProfile(false);
      setMessage({ type: 'success', text: 'הפרטים עודכנו בהצלחה' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error("Error updating profile:", error);
      setMessage({ type: 'error', text: 'שגיאה בעדכון הפרטים' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleCancelEdit = () => {
    setEditedProfile({
      display_name: currentUser.display_name || currentUser.full_name || '',
      phone: currentUser.phone || ''
    });
    setIsEditingProfile(false);
  };


  const handleSubscriptionChange = (plan) => {
    // Refresh subscription data when subscription changes
    subscriptionState.refreshData();
  };

  // Handle continue payment for pending subscriptions
  const handleContinuePayment = async (plan) => {
    try {
      clog('Account page: Continue payment for plan', plan.id);

      // Open subscription modal instead of redirecting to external payment page
      setShowSubscriptionModal(true);

      toast({
        title: "מעבר לבחירת תוכנית",
        description: "בחר את התוכנית והשלם את התשלום",
        variant: "default"
      });
    } catch (error) {
      cerror('Account page: Error opening subscription modal', error);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בפתיחת חלון התשלום",
        variant: "destructive"
      });
    }
  };

  // Ensure all necessary data (user, texts, settings, subscription) is loaded before rendering main content
  if (isLoading || settings === null || (settings?.subscription_system_enabled && subscriptionState.loading)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{accountTexts.loading || 'טוען נתונים...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/50 py-2 sm:py-4 lg:py-8">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        {/* Header - Mobile Optimized */}
        <div className="text-center mb-4 sm:mb-6 lg:mb-10">
          <div className="flex flex-col items-center justify-center gap-2 mb-3 sm:mb-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg">
              <UserIcon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" />
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-4xl font-bold text-gray-900 px-2">{accountTexts.title}</h1>
          </div>
          <p className="text-base sm:text-lg lg:text-xl text-gray-600 px-3 sm:px-4 lg:px-0">{accountTexts.subtitle}</p>
        </div>


        {message && (
          <div className={`mb-4 sm:mb-6 lg:mb-8 rounded-lg sm:rounded-xl lg:rounded-2xl p-3 sm:p-4 lg:p-6 shadow-lg mx-1 sm:mx-0 ${
            message.type === 'error'
              ? 'bg-gradient-to-r from-red-50 to-pink-50 border border-red-200'
              : message.type === 'warning' || message.type === 'info'
                ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200'
                : 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200'
          }`}>
            <div className="flex items-start gap-2 sm:gap-3">
              {message.type === 'error' ? (
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-red-500 flex-shrink-0 mt-0.5" />
              ) : message.type === 'warning' || message.type === 'info' ? (
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-orange-500 flex-shrink-0 mt-0.5" />
              ) : (
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-green-500 flex-shrink-0 mt-0.5" />
              )}
              <p className={`text-xs sm:text-sm lg:text-base leading-relaxed ${
                message.type === 'error' ? 'text-red-800' :
                message.type === 'warning' || message.type === 'info' ? 'text-orange-800' :
                'text-green-800'
              }`}>
                {message.text}
              </p>
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:gap-4 lg:gap-6 xl:gap-8 md:grid-cols-3">
          {/* Left Column - Personal Info & Subscription - Full width on mobile, stacked */}
          <div className="md:col-span-1 space-y-3 sm:space-y-4 lg:space-y-6 xl:space-y-8">

            {/* Personal Information Card - Mobile First */}
            <Card className="shadow-lg sm:shadow-xl border-0 bg-white/80 backdrop-blur-sm rounded-lg sm:rounded-xl lg:rounded-2xl overflow-hidden mx-1 sm:mx-0">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-3 sm:p-4 lg:p-6">
                <CardTitle className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-2 sm:gap-3">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-white/20 rounded-md sm:rounded-lg flex items-center justify-center flex-shrink-0">
                      <UserIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
                    </div>
                    <span className="text-base sm:text-lg lg:text-xl font-medium truncate">{accountTexts.personalInfo}</span>
                  </div>
                  {!isEditingProfile ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditingProfile(true)}
                      className="text-white hover:bg-white/20 rounded-md sm:rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm flex-shrink-0 min-h-[32px] sm:min-h-[36px]"
                    >
                      <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                      <span className="hidden xs:inline">{accountTexts.edit}</span>
                    </Button>
                  ) : (
                    <div className="flex gap-1 sm:gap-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSaveProfile}
                        className="text-white hover:bg-white/20 rounded-md sm:rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm min-h-[32px] sm:min-h-[36px]"
                      >
                        <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCancelEdit}
                        className="text-white hover:bg-white/20 rounded-md sm:rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm min-h-[32px] sm:min-h-[36px]"
                      >
                        <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </Button>
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4 lg:space-y-6">
                <div>
                  <Label className="text-xs sm:text-sm font-medium text-gray-700 block mb-1">{accountTexts.fullName}</Label>
                  {isEditingProfile ? (
                    <Input
                      value={editedProfile.display_name}
                      onChange={(e) => setEditedProfile(prev => ({ ...prev, display_name: e.target.value }))}
                      className="text-sm sm:text-base h-9 sm:h-10"
                      placeholder="הכנס שם מלא"
                    />
                  ) : (
                    <p className="text-sm sm:text-base lg:text-lg font-medium text-gray-900 break-words leading-relaxed">
                      {currentUser?.display_name || currentUser?.full_name || 'לא הוגדר'}
                    </p>
                  )}
                </div>

                <div>
                  <Label className="text-xs sm:text-sm font-medium text-gray-700 block mb-1">{accountTexts.email}</Label>
                  <p className="text-sm sm:text-base lg:text-lg text-gray-600 break-all leading-relaxed">{currentUser?.email}</p>
                </div>

                <div>
                  <Label className="text-xs sm:text-sm font-medium text-gray-700 block mb-1">{accountTexts.phone}</Label>
                  {isEditingProfile ? (
                    <Input
                      value={editedProfile.phone}
                      onChange={(e) => setEditedProfile(prev => ({ ...prev, phone: e.target.value }))}
                      className="text-sm sm:text-base h-9 sm:h-10"
                      placeholder="הכנס מספר טלפון"
                    />
                  ) : (
                    <p className="text-sm sm:text-base lg:text-lg text-gray-900 break-words leading-relaxed">
                      {currentUser?.phone || 'לא הוגדר'}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Subscription Section - COMPLETELY HIDDEN when subscription system is disabled */}
            {settings?.subscription_system_enabled && currentUser && (
              <Card className="bg-white border-none shadow-lg sm:shadow-xl rounded-lg sm:rounded-xl lg:rounded-2xl mx-1 sm:mx-0">
                <CardHeader className="p-3 sm:p-4 lg:p-6">
                  <CardTitle className="flex items-center gap-2 sm:gap-3">
                    <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 flex-shrink-0" />
                    <span className="text-base sm:text-lg lg:text-xl font-medium">{accountTexts.mySubscription}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6 pt-0">
                  {/* Check for pending subscription and display plan details */}
                  {(() => {
                    // Find pending subscription payments that need attention
                    const pendingSubscriptions = subscriptionState.subscriptions?.filter(sub => sub.status === 'pending') || [];
                    const availablePlans = subscriptionState.plans || [];
                    const hasCurrentPlan = subscriptionState.summary?.currentPlan;

                    // If there's a pending subscription, show it as the main plan display
                    if (pendingSubscriptions.length > 0 && availablePlans.length > 0) {
                      const pendingSubscription = pendingSubscriptions[0]; // Show the first pending subscription
                      const pendingPlan = availablePlans.find(p => p.id === pendingSubscription.subscription_plan_id);

                      if (pendingPlan) {
                        // Check if this pending subscription needs a retry payment
                        const actionDecision = (() => {
                          try {
                            return SubscriptionBusinessLogic.determineSubscriptionAction(
                              currentUser,
                              pendingPlan,
                              subscriptionState.purchases || [],
                              subscriptionState.plans || [],
                              subscriptionState.subscriptions || []
                            );
                          } catch (error) {
                            cerror('Error evaluating subscription action in account page:', error);
                            return null;
                          }
                        })();

                        const needsRetryPayment = actionDecision?.actionType === SubscriptionBusinessLogic.ACTION_TYPES.RETRY_PAYMENT;

                        return (
                          <div className="space-y-4">
                            {/* Pending Plan Display - shows the selected plan */}
                            <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 relative overflow-hidden">
                              {/* Professional Pending Payment Banner */}
                              <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-center py-3 text-sm font-medium shadow-lg">
                                <div className="flex items-center justify-center gap-2">
                                  <CreditCard className="w-4 h-4" />
                                  <span>השלמת רכישה נדרשת להפעלת התוכנית</span>
                                </div>
                              </div>

                              <div className="mt-12 space-y-6">
                                {/* Plan Header */}
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg ${
                                    pendingPlan.price === 0
                                      ? 'bg-gradient-to-br from-blue-500 to-cyan-500'
                                      : 'bg-gradient-to-br from-purple-500 to-pink-500'
                                  }`}>
                                    {pendingPlan.price === 0 ? (
                                      <Gift className="w-8 h-8 text-white" />
                                    ) : (
                                      <Crown className="w-8 h-8 text-white" />
                                    )}
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{pendingPlan.name}</h3>
                                    <p className="text-gray-600 text-base mb-3 leading-relaxed">{pendingPlan.description}</p>
                                    <div className="flex items-baseline gap-3">
                                      <span className="text-3xl font-bold text-indigo-600">
                                        {pendingPlan.price === 0 ? 'חינם' : `₪${pendingPlan.price}`}
                                      </span>
                                      {pendingPlan.price > 0 && (
                                        <span className="text-base text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                                          {pendingPlan.billing_period === 'yearly' ? 'לשנה' : 'לחודש'}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Primary Action Button */}
                                <div className="pt-4 space-y-3">
                                  {needsRetryPayment && (
                                    <Button
                                      onClick={() => handleContinuePayment(pendingPlan)}
                                      disabled={subscriptionState.processing}
                                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-8 py-5 rounded-xl font-bold text-xl shadow-xl hover:shadow-2xl transform hover:scale-[1.01] transition-all duration-200 border-0"
                                    >
                                      {subscriptionState.processing ? (
                                        <>
                                          <div className="animate-spin rounded-full h-6 w-6 border-3 border-white border-t-transparent ml-3" />
                                          מעבד תשלום...
                                        </>
                                      ) : (
                                        <>
                                          <CreditCard className="w-7 h-7 ml-3" />
                                          השלם תשלום ₪{pendingPlan.price}
                                        </>
                                      )}
                                    </Button>
                                  )}

                                  {/* Cancel Pending Subscription Button - Show when user has both active and pending */}
                                  {subscriptionState.summary?.hasActivePlusPending && (
                                    <Button
                                      onClick={() => subscriptionState.cancelPendingSubscription(pendingSubscription.id)}
                                      disabled={subscriptionState.processing}
                                      variant="outline"
                                      className="w-full border-2 border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 hover:text-red-700 px-6 py-3 rounded-xl font-medium text-base shadow-md hover:shadow-lg transition-all duration-200"
                                    >
                                      {subscriptionState.processing ? (
                                        <>
                                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-red-600 border-t-transparent ml-2" />
                                          מבטל...
                                        </>
                                      ) : (
                                        <>
                                          <X className="w-5 h-5 ml-2" />
                                          בטל מנוי ממתין
                                        </>
                                      )}
                                    </Button>
                                  )}
                                </div>
                              </div>

                              {/* Compact Benefits List */}
                              {pendingPlan.benefits && (
                                <div className="mt-3 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                                  <h4 className="text-sm font-medium text-blue-800 mb-2 text-center">כלול בתוכנית:</h4>
                                  <div className="space-y-1">
                                    {pendingPlan.benefits.games_access?.enabled && (
                                      <div className="flex items-center gap-2 text-xs text-blue-700">
                                        <CheckCircle className="w-3 h-3 flex-shrink-0" />
                                        <span>גישה למשחקים ({pendingPlan.benefits.games_access.unlimited ? 'ללא הגבלה' : `עד ${pendingPlan.benefits.games_access.monthly_limit}`})</span>
                                      </div>
                                    )}
                                    {pendingPlan.benefits.classroom_management?.enabled && (
                                      <div className="flex items-center gap-2 text-xs text-blue-700">
                                        <CheckCircle className="w-3 h-3 flex-shrink-0" />
                                        <span>ניהול כיתות ({pendingPlan.benefits.classroom_management.unlimited_classrooms ? 'ללא הגבלה' : `עד ${pendingPlan.benefits.classroom_management.max_classrooms}`})</span>
                                      </div>
                                    )}
                                    {pendingPlan.benefits.reports_access && (
                                      <div className="flex items-center gap-2 text-xs text-blue-700">
                                        <CheckCircle className="w-3 h-3 flex-shrink-0" />
                                        <span>דוחות מתקדמים ואנליטיקס</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Small Change Plan Link */}
                              <div className="mt-3 text-center">
                                <button
                                  onClick={() => setShowSubscriptionModal(true)}
                                  className="text-xs text-gray-500 hover:text-gray-700 underline transition-colors"
                                >
                                  שנה תוכנית
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      }
                    }

                    return null;
                  })()}

                  {/* Current active subscription status (only if no pending) */}
                  {!subscriptionState.subscriptions?.some(sub => sub.status === 'pending') && subscriptionState.summary?.currentPlan ? (
                    <div className="space-y-3 sm:space-y-4 lg:space-y-6">
                      {/* Current Plan Details */}
                      <div className="p-3 sm:p-4 lg:p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg sm:rounded-xl border border-purple-200">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                          <div className={`w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 ${
                            subscriptionState.summary.currentPlan.price === 0
                              ? 'bg-blue-500'
                              : 'bg-gradient-to-br from-purple-500 to-pink-500'
                          }`}>
                            {subscriptionState.summary.currentPlan.price === 0 ? (
                              <Gift className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" />
                            ) : (
                              <Crown className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 break-words leading-tight">{subscriptionState.summary.currentPlan.name}</h3>
                            <p className="text-gray-600 text-xs sm:text-sm break-words mt-1">{subscriptionState.summary.currentPlan.description}</p>
                          </div>
                          <div className="text-left sm:text-right flex-shrink-0">
                            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-purple-600">
                              {subscriptionState.summary.currentPlan.price === 0 ? 'חינם' : `₪${subscriptionState.summary.currentPlan.price}`}
                            </div>
                            {subscriptionState.summary.currentPlan.price > 0 && (
                              <div className="text-xs sm:text-sm text-gray-500">
                                {subscriptionState.summary.currentPlan.billing_period === 'yearly' ? 'לשנה' : 'לחודש'}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Subscription Status & Dates - Mobile Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 lg:gap-4 text-xs sm:text-sm">
                          <div className="bg-white/60 p-2 sm:p-3 rounded-md sm:rounded-lg">
                            <div className="text-gray-500 mb-1 text-xs sm:text-sm">סטטוס</div>
                            <div className={`font-semibold text-xs sm:text-sm ${
                              subscriptionState.summary?.hasActiveSubscription
                                ? 'text-green-600'
                                : 'text-gray-600'
                            }`}>
                              {subscriptionState.summary?.hasActiveSubscription ? 'פעיל' : 'חינם'}
                            </div>
                          </div>

                          {/* Show subscription dates if available from active subscription */}
                          {subscriptionState.summary?.activeSubscription && (
                            <>
                              <div className="bg-white/60 p-2 sm:p-3 rounded-md sm:rounded-lg sm:col-span-2">
                                <div className="text-gray-500 mb-1 text-xs sm:text-sm">
                                  {subscriptionState.summary.activeSubscription.payplus_subscription_uid ? 'מתחדש ב' : 'פג ב'}
                                </div>
                                <div className="font-semibold text-gray-900 flex flex-wrap items-center gap-1 sm:gap-2">
                                  <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                                  <span className="text-xs sm:text-sm">
                                    {subscriptionState.summary.activeSubscription.next_billing_date ?
                                      new Date(subscriptionState.summary.activeSubscription.next_billing_date).toLocaleDateString('he-IL') :
                                      'תאריך לא ידוע'}
                                  </span>
                                  {subscriptionState.summary.activeSubscription.payplus_subscription_uid && (
                                    <Badge className="bg-blue-100 text-blue-800 text-xs px-1.5 py-0.5">
                                      חיוב אוטומטי
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              {/* Days until renewal/expiry - Mobile Friendly */}
                              {subscriptionState.summary.activeSubscription.next_billing_date && (
                                <div className="bg-white/60 p-3 rounded-lg sm:col-span-2">
                                  <div className="text-gray-500 mb-1 text-sm">
                                    {(() => {
                                      const nextBillingDate = new Date(subscriptionState.summary.activeSubscription.next_billing_date);
                                      const today = new Date();
                                      const diffTime = nextBillingDate.getTime() - today.getTime();
                                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                                      if (diffDays > 0) {
                                        return subscriptionState.summary.activeSubscription.payplus_subscription_uid ?
                                          `מתחדש בעוד ${diffDays} ימים` :
                                          `פג בעוד ${diffDays} ימים`;
                                      } else if (diffDays === 0) {
                                        return 'מתחדש היום';
                                      } else {
                                        return 'פג';
                                      }
                                    })()}
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Next Payment Info (for paid subscriptions) - Mobile Optimized */}
                      {subscriptionState.summary?.activeSubscription?.status === 'active' &&
                       subscriptionState.summary.activeSubscription.payplus_subscription_uid &&
                       subscriptionState.summary.currentPlan.price > 0 && (
                        <div className="p-3 sm:p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                          <div className="flex items-start sm:items-center gap-3">
                            <CreditCard className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5 sm:mt-0" />
                            <div className="min-w-0">
                              <div className="text-green-800 font-medium text-sm sm:text-base">החיוב הבא</div>
                              <div className="text-green-700 text-sm break-words">
                                ₪{subscriptionState.summary.currentPlan.price} ב-{subscriptionState.summary.activeSubscription.next_billing_date ?
                                  new Date(subscriptionState.summary.activeSubscription.next_billing_date).toLocaleDateString('he-IL') :
                                  'תאריך לא ידוע'}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : !subscriptionState.subscriptions?.some(sub => sub.status === 'pending') ? (
                    <div className="text-center py-6 sm:py-8">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Crown className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
                      </div>
                      <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">לא נבחרה תוכנית מנוי</h3>
                      <p className="text-gray-500 mb-4 text-sm sm:text-base">בחר תוכנית מנוי כדי לקבל גישה לכל התכונות</p>
                    </div>
                  ) : null}

                  <Button
                    onClick={() => setShowSubscriptionModal(true)}
                    disabled={subscriptionState.loading || subscriptionState.processing}
                    className={`w-full py-3 rounded-xl text-base sm:text-lg font-semibold transition-all ${
                      subscriptionState.loading || subscriptionState.processing
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                    }`}
                  >
                    <Crown className="w-5 h-5 ml-2" />
                    {subscriptionState.loading ? 'טוען...' :
                     subscriptionState.processing ? 'מעבד...' :
                     accountTexts.changePlan}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Purchase History - Full Width on Mobile */}
          <div className="md:col-span-2">
            <PurchaseHistory
              user={currentUser}
              title={accountTexts.purchaseHistory}
              showHeader={true}
              className=""
            />
          </div>
        </div>

        {/* Subscription Modal - only show if subscription system is enabled */}
        {settings?.subscription_system_enabled && (
          <SubscriptionModal
            isOpen={showSubscriptionModal}
            onClose={() => setShowSubscriptionModal(false)}
            currentUser={currentUser}
            onSubscriptionChange={handleSubscriptionChange}
            isAutoOpened={false}
          />
        )}

      </div>
    </div>
  );
}

export default MyAccount;

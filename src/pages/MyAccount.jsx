import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { User, Notification, Purchase, SubscriptionPlan, Settings, Workshop, Course, File, Tool } from "@/services/entities"; // Added Settings import
import { getProductTypeName } from "@/config/productTypes";
import { purchaseUtils } from "@/utils/api.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  ShoppingBag,
  Download,
  BookOpen,
  FileText,
  Eye,
  ArrowUpDown,
  Filter,
  Gift // New icon imported for free plans
} from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import SubscriptionModal from "../components/SubscriptionModal";
import { processSubscriptionCallbacks } from "@/services/functions";

const MyAccount = () => {
  const navigate = useNavigate();
  const [registrations, setRegistrations] = useState([]);
  const [workshops, setWorkshops] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentSubscriptionPlan, setCurrentSubscriptionPlan] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [supportPopup, setSupportPopup] = useState({ show: false, registrationId: null });
  const [supportMessage, setSupportMessage] = useState("");

  // Edit mode states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editedProfile, setEditedProfile] = useState({});

  // Subscription modal
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  // Purchase history states
  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState([]);
  const [filteredPurchases, setFilteredPurchases] = useState([]);
  const [sortField, setSortField] = useState('created_date');
  const [sortDirection, setSortDirection] = 'desc';
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [accountTexts, setAccountTexts] = useState({});
  const [settings, setSettings] = useState(null); // New state for global settings

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

  // Helper function to load entity by type and id
  const loadEntityById = async (type, id) => {
    try {
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
        default:
          entity = null;
      }
      // Add entity type for UI rendering
      if (entity) {
        entity.entity_type = type;
      }
      return entity;
    } catch (error) {
      console.error(`Error loading ${type} ${id}:`, error);
      return null;
    }
  };

  const loadPurchases = useCallback(async () => {
    if (!currentUser) return;

    try {
      // Load purchases using buyer_user_id
      const userPurchases = await Purchase.filter({ buyer_user_id: currentUser.id }, { order: [['created_at', 'DESC']] });
      setPurchases(userPurchases);

      // Load entities for the purchases (handle both new polymorphic and legacy structures)
      const entitiesData = await Promise.all(
        userPurchases.map(async purchase => {
          try {
            // Try new polymorphic structure first
            if (purchase.purchasable_type && purchase.purchasable_id) {
              return await loadEntityById(purchase.purchasable_type, purchase.purchasable_id);
            }
            // Fall back to legacy product_id (assume workshop for backwards compatibility)
            else if (purchase.product_id) {
              return await loadEntityById('workshop', purchase.product_id);
            }
            return null;
          } catch (error) {
            console.error(`Error loading entity for purchase ${purchase.id}:`, error);
            return null;
          }
        })
      );
      setProducts(entitiesData.filter(Boolean));
    } catch (error) {
      console.error("Error loading purchases:", error);
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
        const product = products.find(p => p.id === purchase.product_id);
        return (
          purchase.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
          aValue = new Date(a.created_date);
          bValue = new Date(b.created_date);
          break;
        case 'payment_amount':
          aValue = a.payment_amount || 0;
          bValue = b.payment_amount || 0;
          break;
        case 'product_name':
          const entityIdA = purchaseUtils.getEntityId(a);
          const entityIdB = purchaseUtils.getEntityId(b);
          const productA = products.find(p => p.id === entityIdA);
          const productB = products.find(p => p.id === entityIdB);
          aValue = productA?.title || '';
          bValue = productB?.title || '';
          break;
        case 'payment_status':
          aValue = a.payment_status || '';
          bValue = b.payment_status || '';
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

          // Import and call the PayPlus status function
          const { getPayplusRecurringStatus } = await import('@/services/functions');

          try {
            const statusResponse = await getPayplusRecurringStatus({
              recurring_uid: user.payplus_subscription_uid,
              environment: 'production'
            });

            if (statusResponse.data?.success && statusResponse.data?.data) {
              const payplusData = statusResponse.data.data;
              const recurringStatus = payplusData.recurring_status || payplusData.status;

              if (recurringStatus === 'active' || recurringStatus === 'Active') {
                // Subscription is still active, update end date
                const nextChargeDate = payplusData.next_charge_date;
                if (nextChargeDate) {
                  console.log('[MY_ACCOUNT] Subscription still active, updating end date');
                  await User.updateMyUserData({
                    subscription_end_date: nextChargeDate,
                    subscription_status_updated_at: now.toISOString()
                  });

                  return {
                    ...user,
                    subscription_end_date: nextChargeDate,
                    subscription_status_updated_at: now.toISOString()
                  };
                }
              } else {
                // Subscription is no longer active
                console.log('[MY_ACCOUNT] Subscription expired, resetting user subscription');
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
          } catch (error) {
            console.error('[MY_ACCOUNT] Error checking PayPlus status:', error);
          }
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

      // Check if user has pending subscription and process it
      if (user.subscription_status === 'pending') {
        console.log('Found user with pending subscription, processing...');
        try {
          await processSubscriptionCallbacks();
          const updatedUserAfterPending = await User.me();
          user = updatedUserAfterPending;

          if (user.subscription_status === 'active') {
            setMessage({ type: 'success', text: 'המנוי שלך עודכן בהצלחה!' });
            setTimeout(() => setMessage(null), 5000);
          }
        } catch (error) {
          console.error('Error processing pending subscription:', error);
          setMessage({ type: 'warning', text: 'יש בעיה בעיבוד המנוי. אנא פנה לתמיכה אם הבעיה נמשכת.' });
        }
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

      // Check and update subscription status
      const potentiallyUpdatedUser = await checkAndUpdateUserSubscription(user);
      if (potentiallyUpdatedUser !== user) {
        user = potentiallyUpdatedUser;
        setCurrentUser(user);
      }

      // Load current subscription plan
      if (user?.current_subscription_plan_id) {
        try {
          const plans = await SubscriptionPlan.filter({ id: user.current_subscription_plan_id });
          if (plans.length > 0) {
            setCurrentSubscriptionPlan(plans[0]);
          }
        } catch (error) {
          console.error("Error loading subscription plan:", error);
        }
      } else {
        setCurrentSubscriptionPlan(null);
      }

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

  useEffect(() => {
    if (currentUser && !isLoading) {
      loadPurchases();
    }
  }, [currentUser, isLoading, loadPurchases]);

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

  const handleProductAccess = (purchase) => {
    const product = products.find(p => p.id === purchase.product_id);
    if (!product) return;

    switch (product.product_type) {
      case 'course':
        navigate(`/course?course=${product.id}`);
        break;
      case 'file':
        if (product.file_url) {
          window.open(product.file_url, '_blank');
        }
        break;
      case 'workshop':
        if (product.recording_url || product.video_file_url) {
          navigate(`/video?workshop=${product.id}`);
        }
        break;
      default:
        break;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return 'text-green-600 bg-green-50';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50';
      case 'refunded':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'paid':
        return 'שולם';
      case 'pending':
        return 'ממתין';
      case 'refunded':
        return 'הוחזר';
      default:
        return status;
    }
  };

  const handleSubscriptionChange = (plan) => {
    setCurrentSubscriptionPlan(plan);
    setCurrentUser(prev => ({
      ...prev,
      current_subscription_plan_id: plan.id,
      ...(plan.price > 0 && { subscription_start_date: new Date().toISOString() }) // Only set start date for paid plans
    }));
  };

  // Ensure all necessary data (user, texts, settings) is loaded before rendering main content
  if (isLoading || settings === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{accountTexts.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/50 py-4 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header - Responsive */}
        <div className="text-center mb-6 sm:mb-10">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <UserIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">{accountTexts.title}</h1>
          </div>
          <p className="text-lg sm:text-xl text-gray-600 px-4 sm:px-0">{accountTexts.subtitle}</p>
        </div>

        {/* Pending Subscription Alert - Responsive (only if system enabled) */}
        {settings?.subscription_system_enabled && currentUser?.subscription_status === 'pending' && (
          <div className="mb-6 sm:mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-2 border-blue-600 border-t-transparent flex-shrink-0"></div>
              <div className="flex-1 min-w-0">
                <h3 className="text-blue-900 font-semibold text-base sm:text-lg mb-1">התשלום שלך נמצא בתהליך עיבוד</h3>
                <p className="text-blue-700 text-sm sm:text-base">
                  המנוי שלך בתהליך אישור. אנא המתן לסיום התהליך לפני ביצוע פעולות נוספות.
                </p>
              </div>
            </div>
          </div>
        )}

        {message && (
          <div className={`mb-6 sm:mb-8 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg ${
            message.type === 'error'
              ? 'bg-gradient-to-r from-red-50 to-pink-50 border border-red-200'
              : message.type === 'warning' || message.type === 'info'
                ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200'
                : 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200'
          }`}>
            <div className="flex items-start gap-3">
              {message.type === 'error' ? (
                <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-red-500 flex-shrink-0 mt-0.5" />
              ) : message.type === 'warning' || message.type === 'info' ? (
                <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-orange-500 flex-shrink-0 mt-0.5" />
              ) : (
                <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-500 flex-shrink-0 mt-0.5" />
              )}
              <p className={`text-sm sm:text-base ${
                message.type === 'error' ? 'text-red-800' :
                message.type === 'warning' || message.type === 'info' ? 'text-orange-800' :
                'text-green-800'
              }`}>
                {message.text}
              </p>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Left Column - Personal Info & Subscription - Stacked on Mobile */}
          <div className="lg:col-span-1 space-y-6 lg:space-y-8">

            {/* Personal Information Card - Mobile Optimized */}
            <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-4 sm:p-6">
                <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-lg flex items-center justify-center">
                      <UserIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <span className="text-lg sm:text-xl">{accountTexts.personalInfo}</span>
                  </div>
                  {!isEditingProfile ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditingProfile(true)}
                      className="text-white hover:bg-white/20 rounded-lg px-3 py-2 text-sm"
                    >
                      <Edit className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">{accountTexts.edit}</span>
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSaveProfile}
                        className="text-white hover:bg-white/20 rounded-lg px-3 py-2 text-sm"
                      >
                        <Save className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCancelEdit}
                        className="text-white hover:bg-white/20 rounded-lg px-3 py-2 text-sm"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                <div>
                  <Label className="text-sm font-medium text-gray-700">{accountTexts.fullName}</Label>
                  {isEditingProfile ? (
                    <Input
                      value={editedProfile.display_name}
                      onChange={(e) => setEditedProfile(prev => ({ ...prev, display_name: e.target.value }))}
                      className="mt-1"
                      placeholder="הכנס שם מלא"
                    />
                  ) : (
                    <p className="mt-1 text-base sm:text-lg font-medium text-gray-900 break-words">
                      {currentUser?.display_name || currentUser?.full_name || 'לא הוגדר'}
                    </p>
                  )}
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700">{accountTexts.email}</Label>
                  <p className="mt-1 text-base sm:text-lg text-gray-600 break-all">{currentUser?.email}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700">{accountTexts.phone}</Label>
                  {isEditingProfile ? (
                    <Input
                      value={editedProfile.phone}
                      onChange={(e) => setEditedProfile(prev => ({ ...prev, phone: e.target.value }))}
                      className="mt-1"
                      placeholder="הכנס מספר טלפון"
                    />
                  ) : (
                    <p className="mt-1 text-base sm:text-lg text-gray-900 break-words">
                      {currentUser?.phone || 'לא הוגדר'}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Subscription Section - COMPLETELY HIDDEN when subscription system is disabled */}
            {settings?.subscription_system_enabled && currentUser && (
              <Card className="bg-white border-none shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-purple-600" />
                    <span className="text-lg sm:text-xl">{accountTexts.mySubscription}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {currentUser?.subscription_status === 'pending' ? (
                    <div className="text-center p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                      <div className="flex items-center justify-center gap-2 mb-3">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
                        <span className="text-blue-800 font-semibold text-base sm:text-lg">מנוי בתהליך עיבוד</span>
                      </div>
                      <p className="text-blue-700 text-sm sm:text-base">
                        המנוי החדש שלך נמצא בתהליך אישור. זה יכול לקחת מספר דקות.
                      </p>
                    </div>
                  ) : currentSubscriptionPlan ? (
                    <div className="space-y-4 sm:space-y-6">
                      {/* Current Plan Details */}
                      <div className="p-4 sm:p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
                          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center ${
                            currentSubscriptionPlan.price === 0
                              ? 'bg-blue-500'
                              : 'bg-gradient-to-br from-purple-500 to-pink-500'
                          }`}>
                            {currentSubscriptionPlan.price === 0 ? (
                              <Gift className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                            ) : (
                              <Crown className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg sm:text-xl font-bold text-gray-900 break-words">{currentSubscriptionPlan.name}</h3>
                            <p className="text-gray-600 text-sm break-words">{currentSubscriptionPlan.description}</p>
                          </div>
                          <div className="text-left sm:text-right">
                            <div className="text-xl sm:text-2xl font-bold text-purple-600">
                              {currentSubscriptionPlan.price === 0 ? 'חינם' : `₪${currentSubscriptionPlan.price}`}
                            </div>
                            {currentSubscriptionPlan.price > 0 && (
                              <div className="text-xs sm:text-sm text-gray-500">
                                {currentSubscriptionPlan.billing_period === 'yearly' ? 'לשנה' : 'לחודש'}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Subscription Status & Dates - Mobile Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                          <div className="bg-white/60 p-3 rounded-lg">
                            <div className="text-gray-500 mb-1">סטטוס</div>
                            <div className={`font-semibold text-sm ${
                              currentUser.subscription_status === 'active'
                                ? 'text-green-600'
                                : 'text-gray-600'
                            }`}>
                              {currentUser.subscription_status === 'active' ? 'פעיל' :
                               currentUser.subscription_status === 'free_plan' ? 'חינם' :
                               currentUser.subscription_status}
                            </div>
                          </div>

                          {currentUser.subscription_end_date && currentUser.subscription_status === 'active' && (
                            <div className="bg-white/60 p-3 rounded-lg sm:col-span-2">
                              <div className="text-gray-500 mb-1">
                                {currentUser.payplus_subscription_uid ? 'מתחדש ב' : 'פג ב'}
                              </div>
                              <div className="font-semibold text-gray-900 flex flex-wrap items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                <span className="text-sm">
                                  {new Date(currentUser.subscription_end_date).toLocaleDateString('he-IL')}
                                </span>
                                {currentUser.payplus_subscription_uid && (
                                  <Badge className="bg-blue-100 text-blue-800 text-xs">
                                    חיוב אוטומטי
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Days until renewal/expiry - Mobile Friendly */}
                          {currentUser.subscription_end_date && (
                            <div className="bg-white/60 p-3 rounded-lg sm:col-span-2">
                              <div className="text-gray-500 mb-1 text-sm">
                                {(() => {
                                  const endDate = new Date(currentUser.subscription_end_date);
                                  const today = new Date();
                                  const diffTime = endDate.getTime() - today.getTime();
                                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                                  if (diffDays > 0) {
                                    return currentUser.payplus_subscription_uid ?
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
                        </div>
                      </div>

                      {/* Next Payment Info (for paid subscriptions) - Mobile Optimized */}
                      {currentUser.subscription_status === 'active' &&
                       currentUser.payplus_subscription_uid &&
                       currentSubscriptionPlan.price > 0 && (
                        <div className="p-3 sm:p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                          <div className="flex items-start sm:items-center gap-3">
                            <CreditCard className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5 sm:mt-0" />
                            <div className="min-w-0">
                              <div className="text-green-800 font-medium text-sm sm:text-base">החיוב הבא</div>
                              <div className="text-green-700 text-sm break-words">
                                ₪{currentSubscriptionPlan.price} ב-{currentUser.subscription_end_date ? new Date(currentUser.subscription_end_date).toLocaleDateString('he-IL') : 'תאריך לא ידוע'}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-6 sm:py-8">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Crown className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
                      </div>
                      <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">לא נבחרה תוכנית מנוי</h3>
                      <p className="text-gray-500 mb-4 text-sm sm:text-base">בחר תוכנית מנוי כדי לקבל גישה לכל התכונות</p>
                    </div>
                  )}

                  <Button
                    onClick={() => setShowSubscriptionModal(true)}
                    disabled={currentUser?.subscription_status === 'pending'}
                    className={`w-full py-3 rounded-xl text-base sm:text-lg font-semibold transition-all ${
                      currentUser?.subscription_status === 'pending'
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                    }`}
                  >
                    <Crown className="w-5 h-5 ml-2" />
                    {currentUser?.subscription_status === 'pending' ? 'ממתין לעיבוד...' : accountTexts.changePlan}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Purchase History - Full Width on Mobile */}
          <div className="lg:col-span-2">
            <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-green-500 to-teal-600 text-white p-4 sm:p-6">
                <CardTitle className="flex items-center gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <span className="text-lg sm:text-xl">{accountTexts.purchaseHistory}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {/* Filters and Search - Mobile Optimized */}
                <div className="p-4 sm:p-6 border-b bg-white/60">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <Input
                        placeholder="חיפוש לפי מספר הזמנה או שם מוצר..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full sm:w-32 text-sm">
                          <SelectValue placeholder="סטטוס" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">הכל</SelectItem>
                          <SelectItem value="paid">שולם</SelectItem>
                          <SelectItem value="pending">ממתין</SelectItem>
                          <SelectItem value="refunded">הוחזר</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Purchase History - Mobile Cards + Desktop Table */}
                {filteredPurchases.length > 0 ? (
                  <>
                    {/* Mobile View - Cards */}
                    <div className="block lg:hidden">
                      {filteredPurchases.map((purchase) => {
                        const product = products.find(p => p.id === purchase.product_id);
                        const isSubscription = !purchase.product_id;

                        return (
                          <div key={purchase.id} className="border-b last:border-b-0 p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900 mb-1 break-words">
                                  {product?.title || 'מנוי פרימיום'}
                                </div>
                                <div className="text-sm text-gray-500 font-mono break-all">
                                  {purchase.order_number}
                                </div>
                                {product && (
                                  <div className="text-xs text-gray-400 mt-1">
                                    {product.product_type === 'course' && getProductTypeName('course', 'singular')}
                                    {product.product_type === 'workshop' && getProductTypeName('workshop', 'singular')}
                                    {product.product_type === 'file' && getProductTypeName('file', 'singular')}
                                  </div>
                                )}
                              </div>
                              <div className="text-left flex-shrink-0">
                                <div className="text-lg font-semibold text-gray-900">
                                  ₪{purchase.payment_amount}
                                </div>
                                <Badge className={`text-xs ${getStatusColor(purchase.payment_status)}`}>
                                  {getStatusText(purchase.payment_status)}
                                </Badge>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                              <span>
                                {(() => {
                                  const date = new Date(purchase.created_date);
                                  return isNaN(date) ? '-' : format(date, 'dd/MM/yyyy HH:mm', { locale: he });
                                })()}
                              </span>
                            </div>

                            {product && purchase.payment_status === 'paid' && !isSubscription && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleProductAccess(purchase)}
                                className="w-full text-xs"
                              >
                                {product.product_type === 'course' && (
                                  <>
                                    <BookOpen className="w-3 h-3 ml-1" />
                                    פתח {getProductTypeName('course', 'singular')}
                                  </>
                                )}
                                {product.product_type === 'workshop' && (
                                  <>
                                    <Play className="w-3 h-3 ml-1" />
                                    צפה בהקלטה
                                  </>
                                )}
                                {product.product_type === 'file' && (
                                  <>
                                    <Download className="w-3 h-3 ml-1" />
                                    הורד קובץ
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Desktop View - Table */}
                    <div className="hidden lg:block overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-100 border-b">
                          <tr>
                            <th className="text-right p-4 font-semibold">
                              <button
                                onClick={() => handleSort('created_date')}
                                className="flex items-center gap-1 hover:text-blue-600"
                              >
                                תאריך
                                <ArrowUpDown className="w-3 h-3" />
                              </button>
                            </th>
                            <th className="text-right p-4 font-semibold">
                              <button
                                onClick={() => handleSort('order_number')}
                                className="flex items-center gap-1 hover:text-blue-600"
                              >
                                מספר הזמנה
                                <ArrowUpDown className="w-3 h-3" />
                              </button>
                            </th>
                            <th className="text-right p-4 font-semibold">
                              <button
                                onClick={() => handleSort('product_name')}
                                className="flex items-center gap-1 hover:text-blue-600"
                              >
                                מוצר
                                <ArrowUpDown className="w-3 h-3" />
                              </button>
                            </th>
                            <th className="text-right p-4 font-semibold">
                              <button
                                onClick={() => handleSort('payment_amount')}
                                className="flex items-center gap-1 hover:text-blue-600"
                              >
                                סכום
                                <ArrowUpDown className="w-3 h-3" />
                              </button>
                            </th>
                            <th className="text-right p-4 font-semibold">
                              <button
                                onClick={() => handleSort('payment_status')}
                                className="flex items-center gap-1 hover:text-blue-600"
                              >
                                סטטוס
                                <ArrowUpDown className="w-3 h-3" />
                              </button>
                            </th>
                            <th className="text-right p-4 font-semibold">פעולות</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredPurchases.map((purchase) => {
                            const product = products.find(p => p.id === purchase.product_id);
                            const isSubscription = !purchase.product_id;

                            return (
                              <tr key={purchase.id} className="border-b hover:bg-gray-50">
                                <td className="p-4">
                                  {(() => {
                                    const date = new Date(purchase.created_date);
                                    return isNaN(date) ? '-' : format(date, 'dd/MM/yyyy HH:mm', { locale: he });
                                  })()}
                                </td>
                                <td className="p-4 font-mono text-sm">
                                  {purchase.order_number}
                                </td>
                                <td className="p-4">
                                  <div>
                                    <div className="font-medium">
                                      {product?.title || 'מנוי פרימיום'}
                                    </div>
                                    {product && (
                                      <div className="text-sm text-gray-500">
                                        {product.product_type === 'course' && getProductTypeName('course', 'singular')}
                                        {product.product_type === 'workshop' && getProductTypeName('workshop', 'singular')}
                                        {product.product_type === 'file' && getProductTypeName('file', 'singular')}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="p-4 font-semibold">
                                  ₪{purchase.payment_amount}
                                </td>
                                <td className="p-4">
                                  <Badge className={getStatusColor(purchase.payment_status)}>
                                    {getStatusText(purchase.payment_status)}
                                  </Badge>
                                </td>
                                <td className="p-4">
                                  {product && purchase.payment_status === 'paid' && !isSubscription && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleProductAccess(purchase)}
                                      className="text-xs"
                                    >
                                      {product.product_type === 'course' && (
                                        <>
                                          <BookOpen className="w-3 h-3 ml-1" />
                                          פתח {getProductTypeName('course', 'singular')}
                                        </>
                                      )}
                                      {product.product_type === 'workshop' && (
                                        <>
                                          <Play className="w-3 h-3 ml-1" />
                                          צפה בהקלטה
                                        </>
                                      )}
                                      {product.product_type === 'file' && (
                                        <>
                                          <Download className="w-3 h-3 ml-1" />
                                          הורד קובץ
                                        </>
                                      )}
                                    </Button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 sm:py-12 px-4">
                    <CreditCard className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 text-base sm:text-lg">{accountTexts.noHistory}</p>
                  </div>
                )}
              </CardContent>
            </Card>
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

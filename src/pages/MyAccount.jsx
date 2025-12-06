import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "@/services/entities"; // Keep User for updateMyUserData calls only
import { useUser } from "@/contexts/UserContext";
import { apiRequest } from '@/services/apiClient';
import { renderQRCode, LUDORA_OFFICIAL_PRESET } from '@/utils/qrCodeUtils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Calendar,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  User as UserIcon,
  X,
  Edit,
  Save,
  Crown,
  CreditCard,
  Gift, // New icon imported for free plans
  Share2,
  QrCode,
  Copy,
  UserPlus,
  GraduationCap,
  BookOpen
} from "lucide-react";
import PurchaseHistory from "@/components/PurchaseHistory";
import { useSubscriptionState } from "@/hooks/useSubscriptionState";
import SubscriptionBusinessLogic from "@/services/SubscriptionBusinessLogic";
import SubscriptionModal from "@/components/SubscriptionModal";
import { ludlog, luderror } from '@/lib/ludlog';
import { toast } from '@/components/ui/use-toast';
import { urls } from '@/config/urls';
import { NAV_VISIBILITY_OPTIONS, NAVIGATION_KEYS } from "@/constants/settingsKeys";
import { usePaymentPageStatusCheck } from '@/hooks/usePaymentPageStatusCheck';
import { useSubscriptionPaymentStatusCheck } from '@/hooks/useSubscriptionPaymentStatusCheck';

// Static fallback arrays for specializations - defined outside component
const FALLBACK_SPECIALIZATIONS = [
  { name: 'מתמטיקה', emoji: '' },
  { name: 'עברית', emoji: '' },
  { name: 'אנגלית', emoji: '' },
  { name: 'מדעים', emoji: '' },
  { name: 'היסטוריה', emoji: '' },
  { name: 'גיאוגרפיה', emoji: '' },
  { name: 'ספורט', emoji: '' },
  { name: 'אמנות', emoji: '' },
  { name: 'מוזיקה', emoji: '' },
  { name: 'מחשבים', emoji: '' },
  { name: 'פיזיקה', emoji: '' },
  { name: 'כימיה', emoji: '' },
  { name: 'ביולוגיה', emoji: '' },
  { name: 'ספרות', emoji: '' },
  { name: 'אזרחות', emoji: '' },
  { name: 'פסיכולוגיה', emoji: '' },
  { name: 'חינוך מיוחד', emoji: '' },
  { name: 'גן ילדים', emoji: '' },
  { name: 'חינוך מוקדם', emoji: '' },
  { name: 'חינוך גופני', emoji: '' }
];

// Education level options based on User model validation constraints
const EDUCATION_LEVELS = [
  { value: 'no_education_degree', label: 'ללא תואר אקדמי' },
  { value: 'bachelor_education', label: 'תואר ראשון (B.A/B.Sc/B.Ed)' },
  { value: 'master_education', label: 'תואר שני (M.A/M.Sc/M.Ed)' },
  { value: 'phd_education', label: 'תואר שלישי (Ph.D)' }
];

const MyAccount = () => {
  const navigate = useNavigate();
  // Use global state from UserContext instead of direct API calls
  const { currentUser, settings, isLoading: userLoading, updateUser } = useUser();

  const [_registrations, setRegistrations] = useState([]);
  const [_workshops, setWorkshops] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState(null);

  // Edit mode states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editedProfile, setEditedProfile] = useState({});

  // Invitation code states
  const [invitationCode, setInvitationCode] = useState(currentUser?.invitation_code || null);
  const [loadingInviteCode, setLoadingInviteCode] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrContainer, setQrContainer] = useState(null);

  // Subscription modal state
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  const [accountTexts, setAccountTexts] = useState({});

  // Use the new subscription state hook
  const subscriptionState = useSubscriptionState(currentUser);

  // Payment page status checking - check for pending payments and handle abandoned pages
  const paymentStatus = usePaymentPageStatusCheck({
    enabled: true,
    showToasts: true, // Show user notifications about payment status changes
    onStatusUpdate: (update) => {
      ludlog.payment('MyAccount: Payment status update received:', { data: update });

      // Refresh subscription data when payments are processed
      if (update.type === 'continue_polling' || update.count > 0) {
        subscriptionState.refreshData();
      }
    }
  });

  // Subscription payment status checking - check for pending subscription payments and handle abandoned pages
  const subscriptionPaymentStatus = useSubscriptionPaymentStatusCheck({
    enabled: true,
    showToasts: true, // Show user notifications about subscription status changes
    checkInterval: 20000, // CRITICAL FIX: Poll every 20 seconds for pending subscriptions
    onStatusUpdate: (update) => {
      ludlog.payment('MyAccount: Subscription status update received:', { data: update });

      // Refresh subscription data when subscription payments are processed
      if (update.type === 'subscription_activated' || update.type === 'subscription_cancelled') {
        subscriptionState.refreshData();

        // Also refresh user data to get updated subscription status
        if (update.type === 'subscription_activated') {
          // User might have new subscription plan active
          window.location.reload(); // Force full page refresh to update all subscription state
        }
      }
    }
  });

  // Use settings-driven data or fallback arrays for specializations
  const availableSpecializations = useMemo(() => {
    if (settings?.available_specializations) {
      return settings.available_specializations
        .filter(spec => spec.enabled)
        .map(spec => ({ name: spec.name, emoji: spec.emoji }));
    }
    return FALLBACK_SPECIALIZATIONS;
  }, [settings]);

  // Generate portal URL from invitation code
  const portalUrl = invitationCode
    ? urls.portal.student.portal(invitationCode)
    : '';

  // Generate invitation code
  const generateInvitationCode = async () => {
    try {
      setLoadingInviteCode(true);
      const response = await apiRequest(`/entities/user/${currentUser.id}/generate-invitation-code`, {
        method: 'POST'
      });

      const newCode = response.user.invitation_code;
      setInvitationCode(newCode);

      // Update user context
      updateUser({ invitation_code: newCode });

      toast({
        title: "קוד הזמנה נוצר בהצלחה!",
        description: `קוד המורה שלך: ${newCode}`,
        variant: "default"
      });
    } catch (error) {
      console.error('Error generating invitation code:', error);
      toast({
        title: "שגיאה",
        description: "לא הצלחנו ליצור קוד הזמנה",
        variant: "destructive"
      });
    } finally {
      setLoadingInviteCode(false);
    }
  };

  // Copy URL to clipboard
  const copyInviteUrlToClipboard = async () => {
    if (!portalUrl) return;

    try {
      await navigator.clipboard.writeText(portalUrl);
      toast({
        title: "הועתק ללוח!",
        description: "כתובת הקטלוג הועתקה ללוח",
        variant: "default"
      });
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast({
        title: "שגיאה",
        description: "לא הצלחנו להעתיק את הכתובת",
        variant: "destructive"
      });
    }
  };

  // Sync local invitation code state with global user state
  useEffect(() => {
    // Update local state when user context changes
    if (currentUser?.invitation_code !== invitationCode) {
      setInvitationCode(currentUser?.invitation_code || null);
    }
  }, [currentUser?.invitation_code, invitationCode]);

  // Generate QR code when modal opens
  useEffect(() => {
    if (showQRModal && qrContainer && portalUrl) {
      (async () => {
        try {
          await renderQRCode(portalUrl, qrContainer, LUDORA_OFFICIAL_PRESET, {
            width: 400,
            height: 400,
            margin: 0
          });
        } catch (error) {
          console.error('Error generating QR code:', error);
          toast({
            title: "שגיאה ביצירת QR",
            description: "לא הצלחנו ליצור את קוד ה-QR. אנא נסה שוב.",
            variant: "destructive"
          });
        }
      })();
    }
  }, [showQRModal, qrContainer, portalUrl]);

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
          // Simple check: if subscription end date has passed, reset to free plan
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
      luderror.payment('Error in checkAndUpdateUserSubscription:', error);
      return user;
    }
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const texts = {
        title: "החשבון שלי",
        personalInfo: "פרטים אישיים",
        fullName: "שם מלא",
        email: "אימייל",
        phone: "טלפון",
        subscriptionInfo: "מידע מנוי",
        mySubscription: "המנוי שלי",
        currentPlan: "תוכנית נוכחית",
        manageSubscription: "ניהול מנוי",
        signUpForSubscription: "הצטרף למנוי",
        purchaseHistory: "היסטוריית רכישות",
        noHistory: "אין היסטוריית רכישות",
        loading: "טוען נתונים...",
        edit: "עריכה",
        save: "שמירה",
        cancel: "ביטול"
      };
      setAccountTexts(texts);

      // Settings and user come from global state, no API calls needed

      // Only proceed with subscription logic if subscription system is enabled
      const isSubscriptionSystemEnabled = settings?.subscription_system_enabled === true;

      if (!isSubscriptionSystemEnabled) {
        setEditedProfile({
          display_name: currentUser?.display_name || currentUser?.full_name || '',
          phone: currentUser?.phone || '',
          birth_date: currentUser?.birth_date || '',
          education_level: currentUser?.education_level || '',
          specializations: currentUser?.specializations || []
        });

        // Clear legacy data since Registration is removed
        setRegistrations([]);
        setWorkshops([]);

        setIsLoading(false);
        return; // Exit early if subscription system is disabled
      }

      // Check if user has pending subscription
      if (currentUser?.subscription_status === 'pending') {
        setMessage({ type: 'info', text: 'המנוי שלך נמצא בתהליך עיבוד. אנא המתן מספר דקות.' });
      }

      // Handle pending subscriptions timeout
      if (currentUser?.subscription_status === 'pending' && currentUser?.subscription_status_updated_at) {
        const updatedAt = new Date(currentUser.subscription_status_updated_at);
        const now = new Date();
        const minutesElapsed = Math.floor((now.getTime() - updatedAt.getTime()) / 60000);

        if (minutesElapsed >= 5) {
          try {
            // Note: This will update the user in the database, the global state will sync automatically
            await User.updateMyUserData({
              current_subscription_plan_id: null,
              subscription_status: 'free_plan',
              subscription_status_updated_at: now.toISOString(),
              payplus_subscription_uid: null
            });
            setMessage({ type: 'info', text: 'המנוי שלך לא אושר בזמן ובוטל. אנא נסה שוב או צור קשר עם התמיכה.' });
          } catch (error) {
            luderror.payment('Error resetting pending subscription:', error);
          }
        }
      }

      setEditedProfile({
        display_name: currentUser?.display_name || currentUser?.full_name || '',
        phone: currentUser?.phone || '',
        birth_date: currentUser?.birth_date || '',
        education_level: currentUser?.education_level || '',
        specializations: currentUser?.specializations || []
      });

      // Note: Subscription state is now handled by useSubscriptionState hook
      // No need to manually load subscription plans or check subscription status

      // Clear legacy data since Registration is removed
      setRegistrations([]);
      setWorkshops([]);

    } catch (error) {
      luderror.validation("Error loading data:", error);
      setMessage({ type: 'error', text: 'שגיאה בטעינת הנתונים' });
    }
    setIsLoading(false);
  }, [checkAndUpdateUserSubscription]);

  useEffect(() => {
    loadData();
  }, [loadData]); // loadData is now a useCallback, so it's a stable dependency.


  const handleSaveProfile = async () => {
    try {
      await User.updateMyUserData(editedProfile);
      updateUser(editedProfile);
      setIsEditingProfile(false);
      setMessage({ type: 'success', text: 'הפרטים עודכנו בהצלחה' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      luderror.media("Error updating profile:", error);
      setMessage({ type: 'error', text: 'שגיאה בעדכון הפרטים' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleCancelEdit = () => {
    setEditedProfile({
      display_name: currentUser.display_name || currentUser.full_name || '',
      phone: currentUser.phone || '',
      birth_date: currentUser?.birth_date || '',
      education_level: currentUser?.education_level || '',
      specializations: currentUser?.specializations || []
    });
    setIsEditingProfile(false);
  };

  // Handle specialization toggle in edit mode
  const handleSpecializationToggle = useCallback((specializationName) => {
    setEditedProfile(prev => {
      const currentSpecs = prev.specializations || [];
      const newSpecializations = currentSpecs.includes(specializationName)
        ? currentSpecs.filter(s => s !== specializationName)
        : [...currentSpecs, specializationName];

      return {
        ...prev,
        specializations: newSpecializations
      };
    });
  }, []);

  // Handle subscription change
  const handleSubscriptionChange = useCallback(() => {
    subscriptionState.refreshData();
  }, [subscriptionState]);



  // Ensure all necessary data (user, texts, settings, subscription) is loaded before rendering main content
  if (userLoading || isLoading || settings === null || (settings?.subscription_system_enabled && subscriptionState.loading)) {
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
          <div className="flex items-center justify-center gap-3 sm:gap-4 mb-3 sm:mb-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg">
              <UserIcon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" />
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-4xl font-bold text-gray-900">{accountTexts.title}</h1>
          </div>
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

        {/* Calculate which sections to show */}
        {(() => {
          const showPersonalInfo = true; // Always shown
          const showGameSharing = currentUser?.user_type === 'teacher' && settings[NAVIGATION_KEYS.NAV_GAMES_VISIBILITY] === NAV_VISIBILITY_OPTIONS.PUBLIC;
          const showSubscription = settings?.subscription_system_enabled && currentUser;

          const sectionsToShow = [
            showPersonalInfo && 'personal',
            showGameSharing && 'gameSharing',
            showSubscription && 'subscription'
          ].filter(Boolean);

          const sectionCount = sectionsToShow.length;

          // Determine responsive grid classes based on section count
          let gridClasses;
          if (sectionCount === 1) {
            gridClasses = 'grid-cols-1';
          } else if (sectionCount === 2) {
            gridClasses = 'grid-cols-1 lg:grid-cols-2';
          } else {
            gridClasses = 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
          }

          return (
            <>
              {/* Top Section - Personal Details, Game Sharing, Subscription */}
              <div className={`grid gap-3 sm:gap-4 lg:gap-6 xl:gap-8 ${gridClasses} mb-6 sm:mb-8`}>

                {/* Personal Information Card */}
                {showPersonalInfo && (
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

                {/* Birth Date Field - Only for teachers */}
                {currentUser?.user_type === 'teacher' && (
                  <div>
                    <Label className="text-xs sm:text-sm font-medium text-gray-700 block mb-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      תאריך לידה
                    </Label>
                    {isEditingProfile ? (
                      <div className="space-y-2">
                        <Input
                          type="date"
                          value={editedProfile.birth_date || ''}
                          onChange={(e) => setEditedProfile(prev => ({ ...prev, birth_date: e.target.value }))}
                          className="text-sm sm:text-base h-9 sm:h-10"
                        />
                        {currentUser?.birth_date && editedProfile.birth_date !== currentUser?.birth_date && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 text-xs text-yellow-800">
                            <div className="flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                              <span>שינוי תאריך לידה עשוי להשפיע על אימות הגיל במערכת</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm sm:text-base lg:text-lg text-gray-900 break-words leading-relaxed">
                        {currentUser?.birth_date
                          ? new Date(currentUser.birth_date).toLocaleDateString('he-IL')
                          : 'לא הוגדר'}
                      </p>
                    )}
                  </div>
                )}

                {/* Education Level Field - Only for teachers */}
                {currentUser?.user_type === 'teacher' && (
                  <div>
                    <Label className="text-xs sm:text-sm font-medium text-gray-700 block mb-1 flex items-center gap-1">
                      <GraduationCap className="w-3.5 h-3.5" />
                      רמת השכלה
                    </Label>
                    {isEditingProfile ? (
                      <Select
                        value={editedProfile.education_level || ''}
                        onValueChange={(value) => setEditedProfile(prev => ({ ...prev, education_level: value }))}
                      >
                        <SelectTrigger className="h-9 sm:h-10 text-sm sm:text-base">
                          <SelectValue placeholder="בחר רמת השכלה" />
                        </SelectTrigger>
                        <SelectContent>
                          {EDUCATION_LEVELS.map((level) => (
                            <SelectItem key={level.value} value={level.value}>
                              {level.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm sm:text-base lg:text-lg text-gray-900 break-words leading-relaxed">
                        {EDUCATION_LEVELS.find(l => l.value === currentUser?.education_level)?.label || 'לא הוגדר'}
                      </p>
                    )}
                  </div>
                )}

                {/* Specializations Field - Only for teachers */}
                {currentUser?.user_type === 'teacher' && (
                  <div>
                    <Label className="text-xs sm:text-sm font-medium text-gray-700 block mb-1 flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5" />
                      התמחויות
                    </Label>
                    {isEditingProfile ? (
                      <div className="space-y-2">
                        <p className="text-gray-500 text-xs">בחר את התחומים שבהם אתה מתמחה:</p>
                        <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2">
                          {availableSpecializations.map((specialization) => (
                            <div
                              key={specialization.name}
                              className={`
                                flex items-center gap-1.5 p-1.5 rounded-md border cursor-pointer transition-all duration-150 text-xs
                                ${(editedProfile.specializations || []).includes(specialization.name)
                                  ? 'bg-blue-50 border-blue-300 text-blue-800'
                                  : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700'
                                }
                              `}
                              onClick={() => handleSpecializationToggle(specialization.name)}
                            >
                              <input
                                type="checkbox"
                                checked={(editedProfile.specializations || []).includes(specialization.name)}
                                onChange={() => handleSpecializationToggle(specialization.name)}
                                className="w-3 h-3 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <span className="font-medium truncate">
                                {specialization.name}
                              </span>
                            </div>
                          ))}
                        </div>
                        {(editedProfile.specializations || []).length > 0 && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                            <p className="text-green-800 text-xs font-medium">
                              נבחרו {(editedProfile.specializations || []).length} התמחויות
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        {currentUser?.specializations && currentUser.specializations.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {currentUser.specializations.map((spec, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                              >
                                {spec}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm sm:text-base lg:text-lg text-gray-500 leading-relaxed">
                            לא הוגדרו התמחויות
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
                )}

            {/* Teacher Invitation Code Card - Only for teachers */}
            {showGameSharing && (
              <Card className="shadow-lg sm:shadow-xl border-0 bg-white/80 backdrop-blur-sm rounded-lg sm:rounded-xl lg:rounded-2xl overflow-hidden mx-1 sm:mx-0">
                <CardHeader className="bg-gradient-to-r from-teal-500 to-blue-600 text-white p-3 sm:p-4 lg:p-6">
                  <CardTitle className="flex items-center gap-2 sm:gap-3">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-white/20 rounded-md sm:rounded-lg flex items-center justify-center flex-shrink-0">
                      <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
                    </div>
                    <span className="text-base sm:text-lg lg:text-xl font-medium">שיתוף המשחקים</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4 lg:space-y-6">
                  {invitationCode ? (
                    <>
                      {/* Code Display */}
                      <div className="text-center">
                        <div className="text-sm sm:text-base lg:text-lg xl:text-xl font-medium text-gray-700 mb-3 lg:mb-4 xl:mb-6">קוד המורה שלך:</div>
                        <div className="text-xl sm:text-2xl lg:text-4xl xl:text-5xl font-bold text-gray-800 font-mono bg-gradient-to-r from-teal-50 to-blue-50 px-4 lg:px-8 xl:px-12 py-3 lg:py-6 xl:py-8 rounded-xl lg:rounded-2xl xl:rounded-3xl shadow-lg border border-teal-200 mb-4 lg:mb-8 xl:mb-10">
                          {invitationCode}
                        </div>

                        {/* URL Display */}
                        <div className="text-center mb-4 lg:mb-8 xl:mb-10">
                          <div className="text-xs sm:text-sm lg:text-base xl:text-lg text-gray-500 mb-2 lg:mb-3 xl:mb-4">כתובת הקטלוג:</div>
                          <div className="text-sm sm:text-base lg:text-lg xl:text-xl text-blue-600 font-medium bg-blue-50 px-3 lg:px-6 xl:px-8 py-2 lg:py-4 xl:py-5 rounded-lg lg:rounded-xl xl:rounded-2xl border border-blue-200 break-all">
                            {urls.portal.student.portal(invitationCode).replace(/^https?:\/\//, '')}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 gap-2 lg:gap-4 xl:gap-6 mb-4 lg:mb-8 xl:mb-10">
                        <Button
                          onClick={() => setShowQRModal(true)}
                          className="bg-teal-500 hover:bg-teal-600 text-white text-sm lg:text-base xl:text-lg py-2 lg:py-4 xl:py-5 rounded-lg lg:rounded-xl xl:rounded-2xl shadow-lg"
                        >
                          <QrCode className="w-4 h-4 lg:w-5 lg:h-5 xl:w-6 xl:h-6 mr-1 lg:mr-2 xl:mr-3" />
                          QR
                        </Button>
                        <Button
                          onClick={copyInviteUrlToClipboard}
                          variant="outline"
                          className="border-2 border-blue-200 hover:bg-blue-50 text-blue-700 text-sm lg:text-base xl:text-lg py-2 lg:py-4 xl:py-5 rounded-lg lg:rounded-xl xl:rounded-2xl"
                        >
                          <Copy className="w-4 h-4 lg:w-5 lg:h-5 xl:w-6 xl:h-6 mr-1 lg:mr-2 xl:mr-3" />
                          העתק
                        </Button>
                      </div>

                      {/* Regenerate Button */}
                      <Button
                        onClick={generateInvitationCode}
                        disabled={loadingInviteCode}
                        variant="outline"
                        className="w-full border-2 border-orange-200 hover:bg-orange-50 text-orange-700 text-sm lg:text-base xl:text-lg py-2 lg:py-4 xl:py-5 rounded-lg lg:rounded-xl xl:rounded-2xl"
                      >
                        {loadingInviteCode ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-orange-600 border-t-transparent mr-1" />
                        ) : (
                          <RefreshCw className="w-4 h-4 lg:w-5 lg:h-5 xl:w-6 xl:h-6 mr-1 lg:mr-2 xl:mr-3" />
                        )}
                        קוד חדש
                      </Button>
                    </>
                  ) : (
                    <>
                      {/* Generate Code Section */}
                      <div className="text-center py-4">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-teal-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <UserPlus className="w-6 h-6 sm:w-8 sm:h-8 text-teal-600" />
                        </div>
                        <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">צור קוד שיתוף</h3>
                        <p className="text-gray-600 mb-4 text-sm sm:text-base">צור קוד ייחודי כדי לשתף את המשחקים שלך עם תלמידים</p>
                      </div>

                      {/* Generate Button */}
                      <Button
                        onClick={generateInvitationCode}
                        disabled={loadingInviteCode}
                        className="w-full bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                      >
                        {loadingInviteCode ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
                            יוצר קוד...
                          </>
                        ) : (
                          <>
                            <Share2 className="w-5 h-5 mr-2" />
                            צור קוד שיתוף
                          </>
                        )}
                      </Button>

                      {/* Info Box */}
                      <div className="bg-gradient-to-r from-teal-50 to-blue-50 rounded-xl p-4 border border-teal-200">
                        <div className="flex items-center gap-3 mb-2">
                          <UserPlus className="w-5 h-5 text-teal-600" />
                          <span className="text-sm font-medium text-gray-700">יתרונות השיתוף:</span>
                        </div>
                        <ul className="text-xs text-gray-600 space-y-1">
                          <li>• תלמידים יגשו למשחקים ללא הרשמה</li>
                          <li>• קטלוג מותאם עם המשחקים שלך</li>
                          <li>• ממשק ידידותי לילדים</li>
                        </ul>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Subscription Section - COMPLETELY HIDDEN when subscription system is disabled */}
            {showSubscription && (
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
                            luderror.payment('Error evaluating subscription action in account page:', error);
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
                                      onClick={() => navigate('/subscriptions')}
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
                                          ניהול מנוי - השלם תשלום ₪{pendingPlan.price}
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
                                  onClick={() => navigate('/subscriptions')}
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
                              {console.log('')}
                              {console.log('')}
                              {console.log('')}
                              {console.log('')}
                              {console.log('')}
                              {console.log('subscriptionState: ', subscriptionState)}
                              {console.log('')}
                              {console.log('')}
                              {console.log('')}
                              {console.log('')}
                              {console.log('')}
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
                    onClick={() => {
                      if (subscriptionState.summary?.hasActiveSubscription) {
                        // User has active subscription → navigate to subscriptions page for management
                        navigate('/subscriptions');
                      } else {
                        // User doesn't have active subscription → open modal directly
                        setShowSubscriptionModal(true);
                      }
                    }}
                    disabled={subscriptionState.loading}
                    className={`w-full py-3 rounded-xl text-base sm:text-lg font-semibold transition-all ${
                      subscriptionState.loading
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : subscriptionState.summary?.hasActiveSubscription
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                          : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                    }`}
                  >
                    <Crown className="w-5 h-5 ml-2" />
                    {subscriptionState.loading ? 'טוען...' :
                     subscriptionState.summary?.hasActiveSubscription ? 'ניהול מנוי' : 'הצטרף למנוי'}
                  </Button>
                </CardContent>
              </Card>
            )}

              </div>

              {/* Purchase History Section - Bottom, Full Width */}
              <div className="w-full">
                <PurchaseHistory
                  user={currentUser}
                  title={accountTexts.purchaseHistory}
                  showHeader={true}
                  className=""
                />
              </div>

            </>
          );
        })()}

        {/* QR Code Modal for Invitation Code */}
        {showQRModal && (
          <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden relative">
              {/* Close Button */}
              <Button
                onClick={() => setShowQRModal(false)}
                variant="ghost"
                size="sm"
                className="absolute top-4 right-4 z-10 bg-white bg-opacity-90 hover:bg-opacity-100"
              >
                <X className="w-5 h-5" />
              </Button>

              {/* Header */}
              <div className="bg-gradient-to-r from-teal-500 to-yellow-500 p-6 text-center">
                <h2 className="text-2xl font-bold text-white mb-2">
                  קטלוג המשחקים של {currentUser?.display_name || currentUser?.full_name}
                </h2>
                <p className="text-white opacity-90">סרוק להצטרפות לקטלוג</p>
              </div>

              {/* QR Code Container */}
              <div className="p-8 flex flex-col items-center">
                <div
                  ref={setQrContainer}
                  className="mb-6 bg-white"
                  style={{ width: 400, height: 400 }}
                />

                {/* Invitation Code */}
                <div className="text-center mb-6">
                  <div className="text-sm text-gray-600 mb-1">קוד מורה:</div>
                  <div className="text-2xl font-bold text-gray-800 font-mono bg-gray-100 px-4 py-2 rounded-lg">
                    {invitationCode}
                  </div>
                </div>

                {/* Instructions */}
                <div className="text-center max-w-md mb-6">
                  <p className="text-gray-600 text-sm leading-relaxed">
                    תלמידים יכולים לסרוק את ה-QR או להזין את הקוד באתר:
                  </p>
                  <p className="text-blue-600 font-medium mt-2">
                    {urls.portal.student.home().replace(/^https?:\/\//, '')}/portal
                  </p>
                </div>

                {/* Copy Button */}
                <Button
                  onClick={copyInviteUrlToClipboard}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  העתק כתובת
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Subscription Modal */}
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

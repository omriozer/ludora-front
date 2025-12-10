import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Crown,
  RefreshCw,
  Plus,
  Minus,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Loader2,
  History,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Settings,
} from 'lucide-react';
import { apiRequest } from '@/services/apiClient';
import { luderror } from '@/lib/ludlog';

export default function AdminSubscriptionModal({
  user,
  isOpen,
  onClose,
  showMessage,
}) {
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Subscription creation states
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [isCreatingSubscription, setIsCreatingSubscription] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    planId: '',
    subscriptionType: 'free', // 'free' or 'paid'
    customPrice: '',
    customStartDate: new Date().toISOString().split('T')[0], // Today's date
    customEndDate: '',
    customBenefits: '',
    adminNotes: '',
    reason: ''
  });

  // Form states
  const [selectedProductType, setSelectedProductType] = useState('file');
  const [adjustmentAmount, setAdjustmentAmount] = useState(0);
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [selectedNewPlan, setSelectedNewPlan] = useState('');
  const [priceOverride, setPriceOverride] = useState('');
  const [planChangeReason, setPlanChangeReason] = useState('');
  const [chargeAmount, setChargeAmount] = useState('');
  const [chargeDescription, setChargeDescription] = useState('');
  const [chargeReason, setChargeReason] = useState('');

  // Auto renew toggle states
  const [showAutoRenewDialog, setShowAutoRenewDialog] = useState(false);
  const [autoRenewReason, setAutoRenewReason] = useState('');
  const [isTogglingAutoRenew, setIsTogglingAutoRenew] = useState(false);

  // Subscription reset states
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetReason, setResetReason] = useState('');
  const [isResettingSubscription, setIsResettingSubscription] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      loadSubscriptionData();
      loadSubscriptionPlans();
    }
  }, [isOpen, user]);

  // Auto-populate end date when plan or start date changes
  useEffect(() => {
    if (createFormData.planId && createFormData.customStartDate && subscriptionPlans.length > 0) {
      const selectedPlan = subscriptionPlans.find(plan => plan.id === createFormData.planId);
      if (selectedPlan && selectedPlan.billing_period) {
        const calculatedEndDate = calculateEndDate(createFormData.customStartDate, selectedPlan.billing_period);
        setCreateFormData(prev => ({
          ...prev,
          customEndDate: calculatedEndDate
        }));
      }
    }
  }, [createFormData.planId, createFormData.customStartDate, subscriptionPlans]);

  const loadSubscriptionData = async () => {
    setIsLoading(true);
    try {
      const data = await apiRequest(`/admin/users/${user.id}/subscription`);
      setSubscriptionData(data);

      // Set default plan selection if available
      if (data.planChangeOptions?.upgradePlans?.length > 0) {
        setSelectedNewPlan(data.planChangeOptions.upgradePlans[0].id);
      }
    } catch (error) {
      showMessage('error', 'שגיאה בטעינת נתוני מנוי');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSubscriptionPlans = async () => {
    try {
      const response = await apiRequest('/admin/subscription-plans');
      const plans = response.plans || [];
      setSubscriptionPlans(plans);

      // Set default plan selection for creation
      if (plans.length > 0) {
        setCreateFormData(prev => ({
          ...prev,
          planId: plans[0].id,
          customStartDate: prev.customStartDate || new Date().toISOString().split('T')[0] // Ensure today's date
        }));
      }
    } catch (error) {
      console.error('Error loading subscription plans:', error);
      showMessage('error', 'שגיאה בטעינת תוכניות המנוי');
    }
  };

  const handleCreateSubscription = async () => {
    const { planId, subscriptionType, customPrice, customStartDate, customEndDate,
            customBenefits, adminNotes, reason } = createFormData;

    if (!planId || !reason) {
      showMessage('error', 'נא למלא תוכנית וסיבה לפחות');
      return;
    }

    setIsCreatingSubscription(true);
    try {
      const requestData = {
        planId,
        subscriptionType,
        adminNotes,
        reason
      };

      // Add optional fields
      if (customPrice) requestData.customPrice = parseFloat(customPrice);
      if (customStartDate) requestData.customStartDate = customStartDate;
      if (customEndDate) requestData.customEndDate = customEndDate;
      if (customBenefits) requestData.customBenefits = customBenefits;

      const response = await apiRequest(`/admin/users/${user.id}/subscription/create`, {
        method: 'POST',
        body: JSON.stringify(requestData)
      });

      showMessage('success', response.message || 'מנוי נוצר בהצלחה');

      // Reset form
      setCreateFormData({
        planId: subscriptionPlans.length > 0 ? subscriptionPlans[0].id : '',
        subscriptionType: 'free',
        customPrice: '',
        customStartDate: new Date().toISOString().split('T')[0], // Today's date
        customEndDate: '',
        customBenefits: '',
        adminNotes: '',
        reason: ''
      });

      // Reload subscription data
      await loadSubscriptionData();
    } catch (error) {
      luderror.payments('Error creating subscription:', error);
      showMessage('error', 'שגיאה ביצירת מנוי');
    } finally {
      setIsCreatingSubscription(false);
    }
  };

  const handlePollPayPlus = async () => {
    setIsProcessing(true);
    try {
      await apiRequest(`/admin/users/${user.id}/subscription/poll-payplus`, {
        method: 'POST'
      });
      showMessage('success', 'PayPlus נשאל בהצלחה');
      await loadSubscriptionData(); // Reload data
    } catch (error) {
      showMessage('error', 'שגיאה בשאילתת PayPlus');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAdjustUsage = async () => {
    if (!adjustmentAmount || !adjustmentReason) {
      showMessage('error', 'נא למלא את כל השדות');
      return;
    }

    setIsProcessing(true);
    try {
      const data = await apiRequest(`/admin/subscriptions/${subscriptionData.subscription.id}/adjust-usage`, {
        method: 'POST',
        body: JSON.stringify({
          productType: selectedProductType,
          adjustment: parseInt(adjustmentAmount),
          reason: adjustmentReason,
        })
      });

      showMessage('success', data.message);
      setAdjustmentAmount(0);
      setAdjustmentReason('');
      await loadSubscriptionData();
    } catch (error) {
      showMessage('error', 'שגיאה בעדכון שימוש');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleChangePlan = async () => {
    if (!selectedNewPlan || !planChangeReason) {
      showMessage('error', 'נא למלא את כל השדות');
      return;
    }

    setIsProcessing(true);
    try {
      const requestData = {
        newPlanId: selectedNewPlan,
        reason: planChangeReason,
      };

      if (priceOverride) {
        requestData.overridePrice = parseFloat(priceOverride);
      }

      const data = await apiRequest(`/admin/subscriptions/${subscriptionData.subscription.id}/change-plan`, {
        method: 'POST',
        body: JSON.stringify(requestData)
      });

      showMessage('success', data.message);
      setPlanChangeReason('');
      setPriceOverride('');
      await loadSubscriptionData();
    } catch (error) {
      showMessage('error', 'שגיאה בשינוי תוכנית');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddCharge = async () => {
    if (!chargeAmount || !chargeDescription || !chargeReason) {
      showMessage('error', 'נא למלא את כל השדות');
      return;
    }

    setIsProcessing(true);
    try {
      const data = await apiRequest(`/admin/subscriptions/${subscriptionData.subscription.id}/add-one-time-charge`, {
        method: 'POST',
        body: JSON.stringify({
          amount: parseFloat(chargeAmount),
          description: chargeDescription,
          reason: chargeReason,
        })
      });

      showMessage('success', data.message);
      setChargeAmount('');
      setChargeDescription('');
      setChargeReason('');
      await loadSubscriptionData();
    } catch (error) {
      showMessage('error', 'שגיאה בהוספת חיוב');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAutoRenewToggle = async () => {
    if (!autoRenewReason.trim()) {
      showMessage('error', 'נא להזין סיבה לשינוי החידוש האוטומטי');
      return;
    }

    setIsTogglingAutoRenew(true);
    try {
      const newAutoRenewStatus = !subscription.auto_renew;
      const data = await apiRequest(`/admin/subscriptions/${subscriptionData.subscription.id}/toggle-auto-renew`, {
        method: 'POST',
        body: JSON.stringify({
          autoRenew: newAutoRenewStatus,
          reason: autoRenewReason,
        })
      });

      showMessage('success', data.message || 'חידוש אוטומטי עודכן בהצלחה');
      setShowAutoRenewDialog(false);
      setAutoRenewReason('');
      await loadSubscriptionData();
    } catch (error) {
      luderror.payments('Error toggling auto-renew:', error);
      showMessage('error', 'שגיאה בעדכון חידוש אוטומטי');
    } finally {
      setIsTogglingAutoRenew(false);
    }
  };

  const handleSubscriptionReset = async () => {
    if (!resetReason.trim()) {
      showMessage('error', 'נא להזין סיבה לאיפוס המנוי');
      return;
    }

    setIsResettingSubscription(true);
    try {
      const data = await apiRequest(`/admin/subscriptions/${subscriptionData.subscription.id}/reset`, {
        method: 'POST',
        body: JSON.stringify({
          reason: resetReason,
        })
      });

      showMessage('success', data.message || 'מנוי נמחק בהצלחה');
      setShowResetDialog(false);
      setResetReason('');

      // Close modal and refresh data since subscription no longer exists
      onClose();
    } catch (error) {
      luderror.payments('Error resetting subscription:', error);
      showMessage('error', 'שגיאה במחיקת המנוי');
    } finally {
      setIsResettingSubscription(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'לא ידוע';
    return new Date(dateString).toLocaleDateString('he-IL');
  };

  const formatPrice = (price) => {
    if (price === null || price === undefined) return '0';
    return `₪${parseFloat(price).toFixed(2)}`;
  };

  const getProductTypeLabel = (type) => {
    const labels = {
      file: 'קבצים',
      game: 'משחקים',
      lesson_plan: 'תכניות לימוד',
      workshop: 'סדנאות',
      course: 'קורסים',
      tool: 'כלים',
    };
    return labels[type] || type;
  };

  const renderAllowanceDisplay = (allowance) => {
    if (!allowance) return 'לא זמין';
    if (allowance.allowed === 'unlimited') return 'ללא הגבלה';
    return `${allowance.remaining} / ${allowance.allowed} (נותרו)`;
  };

  const getBillingPeriodLabel = (billingPeriod) => {
    const labels = {
      daily: 'יום',
      monthly: 'חודש',
      yearly: 'שנה',
      weekly: 'שבוע'
    };
    return labels[billingPeriod] || 'חודש';
  };

  const calculateEndDate = (startDate, billingPeriod) => {
    if (!startDate) return '';

    const start = new Date(startDate);
    const end = new Date(start);

    switch (billingPeriod) {
      case 'daily':
        end.setDate(end.getDate() + 1);
        break;
      case 'weekly':
        end.setDate(end.getDate() + 7);
        break;
      case 'monthly':
        end.setMonth(end.getMonth() + 1);
        break;
      case 'yearly':
        end.setFullYear(end.getFullYear() + 1);
        break;
      default:
        end.setMonth(end.getMonth() + 1); // Default to monthly
    }

    return end.toISOString().split('T')[0]; // Return YYYY-MM-DD format
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!subscriptionData?.hasSubscription) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-600" />
              יצירת מנוי חדש - {user.display_name || user.full_name}
            </DialogTitle>
            <DialogDescription>
              צור מנוי חדש למשתמש עם הגדרות מותאמות
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Subscription Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">הגדרות בסיסיות</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Plan Selection */}
                  <div>
                    <label className="block text-sm font-medium mb-2">בחר תוכנית מנוי</label>
                    <Select
                      value={createFormData.planId}
                      onValueChange={(value) => setCreateFormData(prev => ({ ...prev, planId: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="בחר תוכנית" />
                      </SelectTrigger>
                      <SelectContent>
                        {subscriptionPlans.map(plan => (
                          <SelectItem key={plan.id} value={plan.id}>
                            {plan.name} - {formatPrice(plan.price)}/{getBillingPeriodLabel(plan.billing_period)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Subscription Type */}
                  <div>
                    <label className="block text-sm font-medium mb-2">סוג מנוי</label>
                    <Select
                      value={createFormData.subscriptionType}
                      onValueChange={(value) => setCreateFormData(prev => ({ ...prev, subscriptionType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">חינמי (ללא PayPlus)</SelectItem>
                        <SelectItem value="paid">בתשלום (עם PayPlus)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Reason (Required) */}
                <div>
                  <label className="block text-sm font-medium mb-2">סיבה ליצירת המנוי (נדרש)</label>
                  <Textarea
                    value={createFormData.reason}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder="הסבר מדוע נוצר מנוי זה למשתמש..."
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Custom Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">הגדרות מתקדמות (אופציונלי)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Custom Price Override */}
                  {createFormData.subscriptionType === 'paid' && (
                    <div>
                      <label className="block text-sm font-medium mb-2">עקיפת מחיר (₪)</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={createFormData.customPrice}
                        onChange={(e) => setCreateFormData(prev => ({ ...prev, customPrice: e.target.value }))}
                        placeholder="השאר ריק למחיר התוכנית"
                      />
                    </div>
                  )}

                  {/* Custom Start Date */}
                  <div>
                    <label className="block text-sm font-medium mb-2">תאריך התחלה מותאם</label>
                    <Input
                      type="date"
                      value={createFormData.customStartDate}
                      onChange={(e) => setCreateFormData(prev => ({ ...prev, customStartDate: e.target.value }))}
                    />
                  </div>

                  {/* Custom End Date */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      תאריך סיום מותאם
                      {createFormData.customStartDate && (
                        <span className="text-xs text-gray-500 font-normal"> (מחושב אוטומטית)</span>
                      )}
                    </label>
                    <Input
                      type="date"
                      value={createFormData.customEndDate}
                      onChange={(e) => setCreateFormData(prev => ({ ...prev, customEndDate: e.target.value }))}
                      placeholder={createFormData.customStartDate ? "מחושב לפי תוכנית" : "תאריך סיום"}
                    />
                  </div>

                  {/* Custom Benefits */}
                  <div>
                    <label className="block text-sm font-medium mb-2">הטבות מותאמות</label>
                    <Textarea
                      value={createFormData.customBenefits}
                      onChange={(e) => setCreateFormData(prev => ({ ...prev, customBenefits: e.target.value }))}
                      placeholder='JSON format: {"video_access": true, "workshop_access": false}'
                      rows={2}
                    />
                  </div>
                </div>

                {/* Admin Notes */}
                <div>
                  <label className="block text-sm font-medium mb-2">הערות מנהל</label>
                  <Textarea
                    value={createFormData.adminNotes}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, adminNotes: e.target.value }))}
                    placeholder="הערות פנימיות למעקב..."
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Selected Plan Preview */}
            {createFormData.planId && subscriptionPlans.length > 0 && (
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-sm text-blue-800">תצוגה מקדימה של התוכנית הנבחרת</CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const selectedPlan = subscriptionPlans.find(p => p.id === createFormData.planId);
                    if (!selectedPlan) return null;

                    return (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-700">שם:</span>
                          <span className="font-medium">{selectedPlan.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-700">מחיר:</span>
                          <span className="font-medium">
                            {createFormData.customPrice ?
                              `${formatPrice(createFormData.customPrice)} (מותאם)` :
                              `${formatPrice(selectedPlan.price)}/${getBillingPeriodLabel(selectedPlan.billing_period)}`
                            }
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-700">תיאור:</span>
                          <span className="font-medium">{selectedPlan.description}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-700">סוג:</span>
                          <Badge className={createFormData.subscriptionType === 'free' ? 'bg-green-500' : 'bg-blue-500'}>
                            {createFormData.subscriptionType === 'free' ? 'חינמי' : 'בתשלום'}
                          </Badge>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            )}


            {/* Create Button */}
            <div className="flex gap-3">
              <Button
                onClick={handleCreateSubscription}
                disabled={isCreatingSubscription || !createFormData.planId || !createFormData.reason}
                className="flex-1"
                size="lg"
              >
                {isCreatingSubscription ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    יוצר מנוי...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    צור מנוי
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={onClose} size="lg">
                ביטול
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const { subscription, plan, allowances, history, payplusDetails, planChangeOptions } = subscriptionData;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-yellow-600" />
            ניהול מנוי - {user.display_name || user.full_name}
          </DialogTitle>
          <DialogDescription>
            ניהול מתקדם של מנוי המשתמש, הטבות, תוכניות וחיובים
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">סקירה</TabsTrigger>
            <TabsTrigger value="usage">שימוש והטבות</TabsTrigger>
            <TabsTrigger value="plan">שינוי תוכנית</TabsTrigger>
            <TabsTrigger value="billing">חיובים</TabsTrigger>
            <TabsTrigger value="history">היסטוריה</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Subscription Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">פרטי מנוי</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">תוכנית:</span>
                    <span className="font-medium">{plan.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">סטטוס:</span>
                    <Badge className={subscription.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}>
                      {subscription.status === 'active' ? 'פעיל' : subscription.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">מחיר חיוב:</span>
                    <span className="font-medium">{formatPrice(subscription.billing_price)}</span>
                  </div>
                  {subscription.original_price !== subscription.billing_price && (
                    <div className="flex justify-between text-orange-600">
                      <span>מחיר מקורי:</span>
                      <span>{formatPrice(subscription.original_price)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">תאריך התחלה:</span>
                    <span>{formatDate(subscription.start_date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">חיוב הבא:</span>
                    <span>{formatDate(subscription.next_billing_date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">חידוש אוטומטי:</span>
                    <Badge className={subscription.auto_renew ? 'bg-green-500' : 'bg-red-500'}>
                      {subscription.auto_renew ? 'פעיל' : 'כבוי'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* PayPlus Integration */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>נתוני PayPlus</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePollPayPlus}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {payplusDetails ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">סטטוס PayPlus:</span>
                        <Badge>{payplusDetails.status}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">סכום:</span>
                        <span>{formatPrice(payplusDetails.amount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">מזהה מנוי:</span>
                        <span className="text-xs font-mono">{subscription.payplus_subscription_uid?.substring(0, 20)}...</span>
                      </div>
                      {payplusDetails.nextPaymentDate && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">תשלום הבא:</span>
                          <span>{formatDate(payplusDetails.nextPaymentDate)}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                      <p>אין נתוני PayPlus זמינים</p>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={handlePollPayPlus}
                        className="mt-2"
                      >
                        נסה לשאול שוב
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Admin Management Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    פעולות ניהול
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Auto Renew Toggle */}
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-sm">חידוש אוטומטי</p>
                      <p className="text-xs text-gray-600">
                        {subscription.auto_renew ? 'פעיל - המנוי יתחדש אוטומטית' : 'כבוי - המנוי לא יתחדש אוטומטית'}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAutoRenewDialog(true)}
                      className="flex items-center gap-2"
                    >
                      {subscription.auto_renew ? (
                        <>
                          <ToggleRight className="w-4 h-4 text-green-600" />
                          בטל חידוש
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="w-4 h-4 text-gray-600" />
                          הפעל חידוש
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Subscription Reset */}
                  <div className="flex items-center justify-between p-3 border rounded-lg border-red-200 bg-red-50">
                    <div className="flex-1">
                      <p className="font-medium text-sm text-red-700">איפוס מנוי</p>
                      <p className="text-xs text-red-600">
                        מחיקה מוחלטת של המנוי - פעולה בלתי הפיכה
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowResetDialog(true)}
                      className="border-red-300 text-red-600 hover:bg-red-100 flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      מחק מנוי
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Auto Renew Toggle Dialog */}
            {showAutoRenewDialog && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {subscription.auto_renew ? 'בטל חידוש אוטומטי' : 'הפעל חידוש אוטומטי'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-gray-600">
                      {subscription.auto_renew
                        ? 'בטל את החידוש האוטומטי - המנוי יסתיים בתאריך החיוב הבא.'
                        : 'הפעל חידוש אוטומטי - המנוי יתחדש אוטומטית בתאריך החיוב הבא.'
                      }
                      {subscription.payplus_subscription_uid && (
                        <span className="block mt-2 text-orange-600 font-medium">
                          השינוי יתבצע גם ב-PayPlus.
                        </span>
                      )}
                    </p>

                    <div>
                      <label className="block text-sm font-medium mb-2">סיבה לשינוי (נדרש)</label>
                      <Textarea
                        value={autoRenewReason}
                        onChange={(e) => setAutoRenewReason(e.target.value)}
                        placeholder="הסבר את הסיבה לשינוי החידוש האוטומטי..."
                        rows={3}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={handleAutoRenewToggle}
                        disabled={isTogglingAutoRenew || !autoRenewReason.trim()}
                        className="flex-1"
                      >
                        {isTogglingAutoRenew ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            מעדכן...
                          </>
                        ) : (
                          <>
                            {subscription.auto_renew ? (
                              <ToggleLeft className="w-4 h-4 mr-2" />
                            ) : (
                              <ToggleRight className="w-4 h-4 mr-2" />
                            )}
                            {subscription.auto_renew ? 'בטל חידוש' : 'הפעל חידוש'}
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowAutoRenewDialog(false);
                          setAutoRenewReason('');
                        }}
                      >
                        ביטול
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Subscription Reset Dialog */}
            {showResetDialog && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                  <CardHeader>
                    <CardTitle className="text-lg text-red-700 flex items-center gap-2">
                      <Trash2 className="w-5 h-5" />
                      מחיקת מנוי
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-red-800">אזהרה: פעולה בלתי הפיכה</p>
                          <p className="text-sm text-red-700 mt-1">
                            פעולה זו תמחק את המנוי לחלוטין:
                          </p>
                          <ul className="text-sm text-red-700 mt-2 space-y-1 mr-4">
                            <li>• המנוי יבוטל מיידית</li>
                            <li>• החיוב ב-PayPlus יבוטל (אם קיים)</li>
                            <li>• לא ניתן לשחזר את המנוי לאחר המחיקה</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">סיבה למחיקה (נדרש)</label>
                      <Textarea
                        value={resetReason}
                        onChange={(e) => setResetReason(e.target.value)}
                        placeholder="הסבר את הסיבה למחיקת המנוי למעקב פנימי..."
                        rows={3}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={handleSubscriptionReset}
                        disabled={isResettingSubscription || !resetReason.trim()}
                        variant="destructive"
                        className="flex-1"
                      >
                        {isResettingSubscription ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            מוחק מנוי...
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4 mr-2" />
                            אישור מחיקה
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowResetDialog(false);
                          setResetReason('');
                        }}
                      >
                        ביטול
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Pending Changes */}
            {planChangeOptions?.pendingChange && (
              <Card className="border-orange-300 bg-orange-50">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2 text-orange-700">
                    <AlertCircle className="w-4 h-4" />
                    שינוי ממתין
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  <p>שינוי ל-{planChangeOptions.pendingChange.to_plan_id} מתוכנן ל-{formatDate(planChangeOptions.pendingChange.effective_date)}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Usage and Benefits Tab */}
          <TabsContent value="usage" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">הטבות והשימוש החודשי</CardTitle>
                <p className="text-xs text-gray-600">חודש נוכחי: {subscriptionData.monthYear}</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(allowances).map(([type, allowance]) => (
                    <div key={type} className="border rounded-lg p-3">
                      <p className="text-sm font-medium mb-1">{getProductTypeLabel(type)}</p>
                      <p className="text-lg font-bold text-blue-600">
                        {renderAllowanceDisplay(allowance)}
                      </p>
                      {allowance.hasReachedLimit && (
                        <Badge className="mt-1 bg-red-500 text-xs">הגיע למגבלה</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Adjust Usage */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">התאמת שימוש ידנית</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">סוג מוצר</label>
                    <Select value={selectedProductType} onValueChange={setSelectedProductType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(allowances).map(type => (
                          <SelectItem key={type} value={type}>
                            {getProductTypeLabel(type)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">כמות (חיובי להוספה, שלילי להפחתה)</label>
                    <Input
                      type="number"
                      value={adjustmentAmount}
                      onChange={(e) => setAdjustmentAmount(e.target.value)}
                      placeholder="לדוגמה: 5 או -3"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">סיבה (נדרש)</label>
                  <Textarea
                    value={adjustmentReason}
                    onChange={(e) => setAdjustmentReason(e.target.value)}
                    placeholder="הסבר מדוע מתבצעת ההתאמה..."
                    rows={2}
                  />
                </div>

                <Button
                  onClick={handleAdjustUsage}
                  disabled={isProcessing || !adjustmentAmount || !adjustmentReason}
                  className="w-full"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      מעדכן...
                    </>
                  ) : (
                    <>
                      {parseInt(adjustmentAmount) > 0 ? (
                        <Plus className="w-4 h-4 mr-2" />
                      ) : (
                        <Minus className="w-4 h-4 mr-2" />
                      )}
                      עדכן שימוש
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Plan Change Tab */}
          <TabsContent value="plan" className="space-y-4">
            {planChangeOptions && (
              <>
                {/* Upgrade Plans */}
                {planChangeOptions.upgradePlans.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        תוכניות שדרוג זמינות
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {planChangeOptions.upgradePlans.map(upgradePlan => (
                          <div key={upgradePlan.id} className="border rounded-lg p-3">
                            <p className="font-medium">{upgradePlan.name}</p>
                            <p className="text-sm text-gray-600">{formatPrice(upgradePlan.price)}/חודש</p>
                            {upgradePlan.proration && (
                              <p className="text-xs text-orange-600 mt-1">
                                חיוב מיידי: {formatPrice(upgradePlan.proration.proratedAmount)}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Downgrade Plans */}
                {planChangeOptions.downgradePlans.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <TrendingDown className="w-4 h-4 text-blue-600" />
                        תוכניות שדרוג למטה זמינות
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {planChangeOptions.downgradePlans.map(downgradePlan => (
                          <div key={downgradePlan.id} className="border rounded-lg p-3">
                            <p className="font-medium">{downgradePlan.name}</p>
                            <p className="text-sm text-gray-600">{formatPrice(downgradePlan.price)}/חודש</p>
                            {downgradePlan.scheduling && (
                              <p className="text-xs text-blue-600 mt-1">
                                יכנס לתוקף ב-{formatDate(downgradePlan.scheduling.effectiveDate)}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Admin Plan Change Form */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">שינוי תוכנית (ניהול)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">תוכנית חדשה</label>
                        <Select value={selectedNewPlan} onValueChange={setSelectedNewPlan}>
                          <SelectTrigger>
                            <SelectValue placeholder="בחר תוכנית" />
                          </SelectTrigger>
                          <SelectContent>
                            {[...planChangeOptions.upgradePlans, ...planChangeOptions.downgradePlans].map(p => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name} - {formatPrice(p.price)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          עקיפת מחיר (אופציונלי)
                        </label>
                        <Input
                          type="number"
                          step="0.01"
                          value={priceOverride}
                          onChange={(e) => setPriceOverride(e.target.value)}
                          placeholder="השאר ריק למחיר התוכנית"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">סיבה (נדרש)</label>
                      <Textarea
                        value={planChangeReason}
                        onChange={(e) => setPlanChangeReason(e.target.value)}
                        placeholder="הסבר את הסיבה לשינוי התוכנית..."
                        rows={2}
                      />
                    </div>

                    <Button
                      onClick={handleChangePlan}
                      disabled={isProcessing || !selectedNewPlan || !planChangeReason}
                      className="w-full"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          משנה תוכנית...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          שנה תוכנית
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">הוסף חיוב חד-פעמי או הנחה</CardTitle>
                <p className="text-xs text-gray-600">סכומים שליליים = הנחה, חיוביים = חיוב נוסף</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">סכום (₪)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={chargeAmount}
                      onChange={(e) => setChargeAmount(e.target.value)}
                      placeholder="50 או -50 להנחה"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">תיאור</label>
                    <Input
                      value={chargeDescription}
                      onChange={(e) => setChargeDescription(e.target.value)}
                      placeholder="למשל: הנחת נאמנות"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">סיבה פנימית (נדרש)</label>
                  <Textarea
                    value={chargeReason}
                    onChange={(e) => setChargeReason(e.target.value)}
                    placeholder="סיבה לחיוב/הנחה למעקב פנימי..."
                    rows={2}
                  />
                </div>

                <Button
                  onClick={handleAddCharge}
                  disabled={isProcessing || !chargeAmount || !chargeDescription || !chargeReason}
                  className="w-full"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      מעבד...
                    </>
                  ) : (
                    <>
                      <DollarSign className="w-4 h-4 mr-2" />
                      {parseFloat(chargeAmount) < 0 ? 'הוסף הנחה' : 'הוסף חיוב'}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Admin Charges History */}
            {subscription.metadata?.admin_charges?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">היסטוריית חיובים ניהוליים</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {subscription.metadata.admin_charges.map((charge, idx) => (
                      <div key={idx} className="border-b pb-2 last:border-0">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-sm">{charge.description}</p>
                            <p className="text-xs text-gray-600">{charge.reason}</p>
                            <p className="text-xs text-gray-500">{formatDate(charge.added_at)}</p>
                          </div>
                          <Badge className={parseFloat(charge.amount) < 0 ? 'bg-green-500' : 'bg-blue-500'}>
                            {formatPrice(charge.amount)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <History className="w-4 h-4" />
                  היסטוריית מנוי
                </CardTitle>
              </CardHeader>
              <CardContent>
                {history && history.length > 0 ? (
                  <div className="space-y-3">
                    {history.map((entry) => (
                      <div key={entry.id} className="border-b pb-3 last:border-0">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <Badge className="text-xs">
                              {entry.action_type}
                            </Badge>
                            <p className="text-sm">{entry.notes}</p>
                            {entry.purchased_price && (
                              <p className="text-xs text-gray-600">
                                מחיר: {formatPrice(entry.purchased_price)}
                              </p>
                            )}
                            <p className="text-xs text-gray-500">
                              {formatDate(entry.created_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-4">אין היסטוריה זמינה</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

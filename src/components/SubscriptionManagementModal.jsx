import React, { useState } from "react";
import { User, SubscriptionPlan, SubscriptionHistory, PendingSubscription } from "@/services/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Crown,
  X,
  RefreshCw,
  Calendar,
  Save,
  Loader2,
  AlertTriangle
} from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { ludlog, luderror } from '@/lib/ludlog';
import { showSuccess, showError, showInfo } from '@/utils/messaging';

// Helper component for confirmation dialog
function ConfirmationDialog({ isOpen, onClose, onConfirm, title, message, confirmText, cancelText, variant, isLoading }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
          <p className="text-gray-600 whitespace-pre-line mb-6">{message}</p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              {cancelText}
            </Button>
            <Button 
              variant={variant === 'danger' ? 'destructive' : 'default'} 
              onClick={onConfirm} 
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SubscriptionManagementModal({ user, subscriptionPlans, onClose, onUpdate }) {
  const [selectedPlanId, setSelectedPlanId] = useState(user.current_subscription_plan_id || '');
  const [subscriptionEndDate, setSubscriptionEndDate] = useState(
    user.subscription_end_date ? format(new Date(user.subscription_end_date), 'yyyy-MM-dd') : ''
  );
  const [isLoading, setIsLoading] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const currentPlan = subscriptionPlans.find(p => p.id === user.current_subscription_plan_id);

  const getSubscriptionStatusText = (status) => {
    switch (status) {
      case 'active': return 'פעיל';
      case 'pending': return 'ממתין';
      case 'past_due': return 'חוב';
      case 'cancelled': return 'בוטל';
      case 'free_plan': return 'חינמי';
      case 'trialing': return 'תקופת ניסיון';
      default: return 'לא ידוע';
    }
  };

  const getSubscriptionStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-50';
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'past_due': return 'text-red-600 bg-red-50';
      case 'cancelled': return 'text-gray-600 bg-gray-50';
      case 'free_plan': return 'text-blue-600 bg-blue-50';
      case 'trialing': return 'text-purple-600 bg-purple-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const handleUpdateSubscription = async () => {
    setIsLoading(true);
    try {
      const updateData = {};
      
      // Update plan if changed
      if (selectedPlanId !== user.current_subscription_plan_id) {
        updateData.current_subscription_plan_id = selectedPlanId || null;
        updateData.subscription_status = selectedPlanId ? 'active' : 'free_plan';
        updateData.subscription_status_updated_at = new Date().toISOString();
        
        if (!selectedPlanId) {
          // If removing subscription, clear related fields
          updateData.subscription_start_date = null;
          updateData.subscription_end_date = null;
          updateData.payplus_subscription_uid = null;
        }
      }
      
      // Update end date if changed
      if (subscriptionEndDate && subscriptionEndDate !== (user.subscription_end_date ? format(new Date(user.subscription_end_date), 'yyyy-MM-dd') : '')) {
        updateData.subscription_end_date = new Date(subscriptionEndDate + 'T23:59:59').toISOString();
      } else if (!subscriptionEndDate && user.subscription_end_date) {
        updateData.subscription_end_date = null;
      }

      if (Object.keys(updateData).length > 0) {
        await User.update(user.id, updateData);
        showSuccess('המנוי עודכן בהצלחה');
        onUpdate();
      } else {
        showInfo('לא בוצעו שינויים');
      }
    } catch (error) {
      luderror.payment('Error updating subscription:', error);
      showError('שגיאה בעדכון המנוי');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSubscription = async () => {
    setIsLoading(true);
    try {
      // Delete all subscription history for this user
      const subscriptionHistoryRecords = await SubscriptionHistory.filter({ user_id: user.id });
      for (const record of subscriptionHistoryRecords) {
        await SubscriptionHistory.delete(record.id);
      }

      // Delete any pending subscriptions for this user
      const pendingSubscriptions = await PendingSubscription.filter({ user_id: user.id });
      for (const pending of pendingSubscriptions) {
        await PendingSubscription.delete(pending.id);
      }

      // Reset user subscription data completely
      await User.update(user.id, {
        current_subscription_plan_id: null,
        subscription_start_date: null,
        subscription_end_date: null,
        subscription_status: 'free_plan',
        subscription_status_updated_at: new Date().toISOString(),
        payplus_subscription_uid: null
      });
      showSuccess(`המנוי של המשתמש ${user.display_name || user.full_name} אופס בהצלחה.`);
      onUpdate();

    } catch (error) {
      luderror.payment('Error resetting subscription:', error);
      showError('שגיאה באיפוס המנוי.');
    } finally {
      setIsLoading(false);
      setShowResetConfirm(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9998] p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <Crown className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">ניהול מנוי</h2>
                  <p className="text-sm text-gray-600">{user.display_name || user.full_name}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Current Status */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">מצב נוכחי</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">תוכנית נוכחית:</span>
                  <span className="text-sm font-medium">
                    {currentPlan ? currentPlan.name : 'ללא מנוי'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">סטטוס:</span>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${getSubscriptionStatusColor(user.subscription_status || 'free_plan')}`}>
                    {getSubscriptionStatusText(user.subscription_status || 'free_plan')}
                  </span>
                </div>
                {user.subscription_end_date && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">בתוקף עד:</span>
                    <span className="text-sm font-medium">
                      {format(new Date(user.subscription_end_date), 'dd/MM/yyyy', { locale: he })}
                    </span>
                  </div>
                )}
                {user.payplus_subscription_uid && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">מזהה PayPlus:</span>
                    <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                      {user.payplus_subscription_uid.substring(0, 8)}...
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Manage Subscription Plan */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="planSelect" className="text-sm font-medium text-gray-700 mb-2 block">
                  בחירת תוכנית מנוי
                </Label>
                <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                  <SelectTrigger>
                    <SelectValue placeholder="בחר תוכנית מנוי" />
                  </SelectTrigger>
                  <SelectContent className="z-[9999]">
                    <SelectItem value={null}>ללא מנוי (חינמי)</SelectItem>
                    {subscriptionPlans
                      .filter(plan => plan.is_active)
                      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
                      .map(plan => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name} - ₪{plan.price} ({plan.billing_period === 'monthly' ? 'חודשי' : 'שנתי'})
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>

              {/* Subscription End Date */}
              <div>
                <Label htmlFor="endDate" className="text-sm font-medium text-gray-700 mb-2 block">
                  תאריך תפוגה
                </Label>
                <div className="relative">
                  <Input
                    id="endDate"
                    type="date"
                    value={subscriptionEndDate}
                    onChange={(e) => setSubscriptionEndDate(e.target.value)}
                    className="pr-10"
                  />
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  השאר ריק עבור מנוי ללא תפוגה
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
              <Button
                onClick={handleUpdateSubscription}
                disabled={isLoading}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    שומר...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    שמור שינויים
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={() => setShowResetConfirm(true)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                איפוס מנוי
              </Button>
            </div>

            {/* Warning for Reset */}
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-semibold text-red-900 mb-1">אזהרה - איפוס מנוי</h4>
                  <p className="text-xs text-red-700">
                    פעולת האיפוס תמחק לחלוטין את כל נתוני המנוי, ההיסטוריה והמנויים הממתינים של המשתמש. 
                    פעולה זו אינה ניתנת לביטול.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={handleResetSubscription}
        title="איפוס מנוי משתמש"
        message={`האם אתה בטוח שברצונך לאפס לחלוטין את המנוי של המשתמש ${user.display_name || user.full_name}?\n\nפעולה זו תמחק:\n• את כל היסטוריית המנויים\n• מנויים ממתינים\n• נתוני המנוי הנוכחיים\n\nהפעולה היא בלתי הפיכה!`}
        confirmText="כן, אפס מנוי"
        cancelText="ביטול"
        isLoading={isLoading}
        variant="danger"
      />
    </>
  );
}
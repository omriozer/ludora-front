import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { Purchase, SubscriptionHistory } from "@/services/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CreditCard,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Crown,
  Clock,
  ArrowRight,
  Receipt
} from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import SubscriptionModal from "../components/SubscriptionModal";
import { useSubscriptionState } from "@/hooks/useSubscriptionState";
import { ludlog, luderror } from '@/lib/ludlog';

const Subscriptions = () => {
  const navigate = useNavigate();
  const { currentUser, settings, isLoading: userLoading } = useUser();

  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [billingHistory, setBillingHistory] = useState([]);

  // Use the subscription state hook
  const subscriptionState = useSubscriptionState(currentUser);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Load billing history (both product purchases and subscription payments)
      if (currentUser) {
        // Load subscription payment history
        const subscriptionPayments = await SubscriptionHistory.filter(
          { user_id: currentUser.id },
          { order: [['created_at', 'DESC']] }
        );

        // Load product purchases
        const productPurchases = await Purchase.filter(
          { buyer_user_id: currentUser.id },
          { order: [['created_at', 'DESC']] }
        );

        // Combine and sort by date
        const combinedHistory = [
          ...subscriptionPayments.map(sub => ({
            ...sub,
            type: 'subscription',
            date: sub.created_at || sub.start_date,
            amount: sub.price || 0
          })),
          ...productPurchases.map(purchase => ({
            ...purchase,
            type: 'purchase',
            date: purchase.created_at || purchase.created_date,
            amount: purchase.payment_amount || 0
          }))
        ].sort((a, b) => new Date(b.date) - new Date(a.date));

        setBillingHistory(combinedHistory);
      }
    } catch (error) {
      luderror.payment("Error loading subscription data:", error);
      setMessage({ type: 'error', text: 'שגיאה בטעינת נתוני מנוי' });
    }
    setIsLoading(false);
  }, [currentUser]);

  useEffect(() => {
    if (currentUser && !userLoading) {
      loadData();
    }
  }, [currentUser, userLoading, loadData]);

  const handleSubscriptionChange = () => {
    subscriptionState.refreshData();
    loadData();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
      case 'completed':
      case 'paid':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'cancelled':
      case 'expired':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'failed':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active':
        return 'פעיל';
      case 'completed':
      case 'paid':
        return 'הושלם';
      case 'pending':
        return 'ממתין';
      case 'cancelled':
        return 'בוטל';
      case 'expired':
        return 'פג תוקף';
      case 'failed':
        return 'נכשל';
      default:
        return status;
    }
  };

  if (userLoading || isLoading || subscriptionState.loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">טוען נתוני מנוי...</p>
        </div>
      </div>
    );
  }

  const hasActiveSubscription = subscriptionState.summary?.hasActiveSubscription;
  const currentPlan = subscriptionState.summary?.currentPlan;
  const activeSubscription = subscriptionState.summary?.activeSubscription;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">ניהול מנוי</h1>
              <p className="text-gray-600">נהל את המנוי וצפה בהיסטוריית החיובים</p>
            </div>
          </div>
        </div>

        {message && (
          <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className="mb-6">
            {message.type === 'error' ? (
              <AlertTriangle className="h-4 w-4" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Current Subscription */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current Subscription Card */}
            <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-6">
                <CardTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <Crown className="w-5 h-5" />
                  </div>
                  <span className="text-xl font-medium">המנוי הנוכחי</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {hasActiveSubscription && currentPlan ? (
                  <div className="space-y-6">
                    {/* Plan Details */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">{currentPlan.name}</h3>
                        <p className="text-gray-600">{currentPlan.description}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-purple-600">
                          {currentPlan.price === 0 ? 'חינם' : `₪${currentPlan.price}`}
                        </div>
                        {currentPlan.price > 0 && (
                          <div className="text-sm text-gray-500">
                            {currentPlan.billing_period === 'yearly' ? 'לשנה' : 'לחודש'}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Subscription Status */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-4 rounded-xl">
                        <div className="text-gray-600 text-sm mb-1">סטטוס</div>
                        <Badge className={`${getStatusColor(activeSubscription?.status || 'active')} text-sm`}>
                          {getStatusText(activeSubscription?.status || 'active')}
                        </Badge>
                      </div>

                      {activeSubscription?.next_billing_date && (
                        <div className="bg-gray-50 p-4 rounded-xl">
                          <div className="text-gray-600 text-sm mb-1">
                            {activeSubscription.payplus_subscription_uid ? 'מתחדש ב' : 'פג ב'}
                          </div>
                          <div className="font-semibold text-gray-900 flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {format(new Date(activeSubscription.next_billing_date), 'dd/MM/yyyy', { locale: he })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Next Billing Info */}
                    {activeSubscription?.status === 'active' &&
                     activeSubscription.payplus_subscription_uid &&
                     currentPlan.price > 0 && (
                      <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                        <div className="flex items-center gap-3">
                          <DollarSign className="w-5 h-5 text-green-600" />
                          <div>
                            <div className="text-green-800 font-medium">החיוב הבא</div>
                            <div className="text-green-700 text-sm">
                              ₪{currentPlan.price} ב-{activeSubscription.next_billing_date &&
                                format(new Date(activeSubscription.next_billing_date), 'dd/MM/yyyy', { locale: he })}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Change Plan Button */}
                    <Button
                      onClick={() => setShowSubscriptionModal(true)}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-3 rounded-xl shadow-lg hover:shadow-xl transition-all"
                    >
                      <Crown className="w-5 h-5 ml-2" />
                      שינוי תוכנית
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Crown className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">אין מנוי פעיל</h3>
                    <p className="text-gray-500 mb-6">הצטרף למנוי כדי לקבל גישה לכל התכונות</p>
                    <Button
                      onClick={() => setShowSubscriptionModal(true)}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all"
                    >
                      <Crown className="w-5 h-5 ml-2" />
                      הצטרף למנוי
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Billing History */}
            <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white p-6">
                <CardTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <span className="text-xl font-medium">היסטוריית חיובים</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {billingHistory.length > 0 ? (
                  <div className="divide-y">
                    {billingHistory.map((item, index) => (
                      <div key={`${item.type}-${item.id}-${index}`} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900 mb-1">
                              {item.type === 'subscription' ? (
                                <span className="flex items-center gap-2">
                                  <Crown className="w-4 h-4 text-purple-600" />
                                  חיוב מנוי - {item.subscription_plan?.name || 'מנוי'}
                                </span>
                              ) : (
                                <span className="flex items-center gap-2">
                                  <CreditCard className="w-4 h-4 text-blue-600" />
                                  רכישת מוצר
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500 flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              {format(new Date(item.date), 'dd/MM/yyyy HH:mm', { locale: he })}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold text-gray-900 mb-1">
                              ₪{item.amount}
                            </div>
                            <Badge className={`text-xs ${getStatusColor(item.status || item.payment_status)}`}>
                              {getStatusText(item.status || item.payment_status)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 px-4">
                    <Receipt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">אין היסטוריית חיובים</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Quick Actions */}
          <div className="space-y-6">
            {/* Back to Account */}
            <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden">
              <CardContent className="p-6">
                <Button
                  onClick={() => navigate('/account')}
                  variant="outline"
                  className="w-full border-2 border-gray-200 hover:bg-gray-50"
                >
                  <ArrowRight className="w-5 h-5 ml-2" />
                  חזרה לחשבון
                </Button>
              </CardContent>
            </Card>

            {/* Subscription Benefits */}
            {currentPlan && (
              <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden">
                <CardHeader className="p-6 border-b">
                  <CardTitle className="text-lg">הטבות המנוי</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    {currentPlan.benefits?.games_access?.enabled && (
                      <div className="flex items-center gap-3 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>
                          גישה למשחקים
                          {currentPlan.benefits.games_access.unlimited ?
                            ' (ללא הגבלה)' :
                            ` (עד ${currentPlan.benefits.games_access.monthly_limit})`}
                        </span>
                      </div>
                    )}
                    {currentPlan.benefits?.files_access?.enabled && (
                      <div className="flex items-center gap-3 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>
                          גישה לקבצים
                          {currentPlan.benefits.files_access.unlimited ?
                            ' (ללא הגבלה)' :
                            ` (עד ${currentPlan.benefits.files_access.monthly_limit})`}
                        </span>
                      </div>
                    )}
                    {currentPlan.benefits?.reports_access && (
                      <div className="flex items-center gap-3 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>צפיה בדוחות</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

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
  );
};

export default Subscriptions;

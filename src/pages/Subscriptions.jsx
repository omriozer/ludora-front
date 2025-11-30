import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
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
import { luderror } from '@/lib/ludlog';

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
      if (currentUser) {
        // Import entities
        const { Transaction, SubscriptionHistory } = await import('@/services/entities');

        // Get active subscription to filter billing history
        const activeSubscription = subscriptionState.summary?.activeSubscription;

        if (!activeSubscription) {
          setBillingHistory([]);
          setIsLoading(false);
          return;
        }

        // Load billing history from multiple sources
        const billingItems = [];

        // 1. Load initial payment from Transaction table
        // Transaction records with metadata.subscription_id matching current subscription
        try {
          const transactions = await Transaction.filter({
            user_id: currentUser.id,
            payment_status: 'completed'
          });

          // Filter transactions that have subscription_id in metadata
          const subscriptionTransactions = transactions.filter(txn => {
            const metadata = txn.metadata || {};
            return metadata.subscription_id === activeSubscription.id;
          });

          // Add initial payment transactions to billing history
          subscriptionTransactions.forEach(txn => {
            billingItems.push({
              id: `txn-${txn.id}`,
              type: 'initial_payment',
              date: txn.created_at,
              amount: parseFloat(txn.amount || 0),
              status: txn.payment_status,
              payment_method: txn.payment_method,
              metadata: txn.metadata,
              description: 'תשלום ראשוני למנוי'
            });
          });
        } catch (error) {
          luderror.payments('Error loading subscription transactions:', error);
        }

        // 2. Load renewal payments from SubscriptionHistory table
        try {
          const renewals = await SubscriptionHistory.filter({
            user_id: currentUser.id,
            subscription_id: activeSubscription.id
          });

          // Add renewals to billing history
          renewals.forEach(renewal => {
            billingItems.push({
              id: `renewal-${renewal.id}`,
              type: 'renewal',
              date: renewal.payment_date || renewal.created_at,
              amount: parseFloat(renewal.amount || 0),
              status: renewal.status,
              payment_method: renewal.payment_method,
              metadata: renewal.metadata,
              description: 'חידוש מנוי'
            });
          });
        } catch (error) {
          luderror.payments('Error loading subscription renewals:', error);
        }

        // 3. Sort all billing items by date (newest first)
        const sortedBillingHistory = billingItems.sort((a, b) =>
          new Date(b.date) - new Date(a.date)
        );

        setBillingHistory(sortedBillingHistory);
      }
    } catch (error) {
      luderror.payments("Error loading subscription data:", error);
      setMessage({ type: 'error', text: 'שגיאה בטעינת נתוני מנוי' });
    }
    setIsLoading(false);
  }, [currentUser, subscriptionState.summary]);

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
              <p className="text-gray-600">נהל את המנוי וצפה בהיסטוריית חיובי המנוי</p>
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

                      {activeSubscription?.created_at && (
                        <div className="bg-gray-50 p-4 rounded-xl">
                          <div className="text-gray-600 text-sm mb-1">תאריך יצירת מנוי</div>
                          <div className="font-semibold text-gray-900 flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {format(new Date(activeSubscription.created_at), 'dd/MM/yyyy HH:mm', { locale: he })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Next Renewal Date */}
                    {activeSubscription?.next_billing_date && (
                      <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                        <div className="flex items-center gap-3">
                          <Clock className="w-5 h-5 text-blue-600" />
                          <div>
                            <div className="text-blue-800 font-medium text-sm mb-1">
                              {activeSubscription.payplus_subscription_uid ? 'תאריך החידוש הבא' : 'תוקף המנוי'}
                            </div>
                            <div className="text-blue-700 font-semibold">
                              {format(new Date(activeSubscription.next_billing_date), 'dd/MM/yyyy', { locale: he })}
                              {activeSubscription.billing_period === 'daily' && ' (חיוב יומי - בדיקה)'}
                              {activeSubscription.billing_period === 'monthly' && ' (חיוב חודשי)'}
                              {activeSubscription.billing_period === 'yearly' && ' (חיוב שנתי)'}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

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

            {/* Subscription Billing History */}
            <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white p-6">
                <CardTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <span className="text-xl font-medium">היסטוריית חיובי מנוי</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {billingHistory.length > 0 ? (
                  <div className="divide-y">
                    {billingHistory.map((item) => {
                      // Determine payment type icon and label
                      const isInitialPayment = item.type === 'initial_payment';
                      const isRenewal = item.type === 'renewal';

                      // Get billing period from active subscription
                      const billingPeriodLabel = activeSubscription?.billing_period === 'daily'
                        ? 'יומי (בדיקה)'
                        : activeSubscription?.billing_period === 'monthly'
                        ? 'חודשי'
                        : activeSubscription?.billing_period === 'yearly'
                        ? 'שנתי'
                        : '';

                      return (
                        <div key={item.id} className="p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900 mb-1">
                                <span className="flex items-center gap-2">
                                  {isInitialPayment ? (
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                  ) : (
                                    <Clock className="w-4 h-4 text-blue-600" />
                                  )}
                                  {item.description}
                                  {currentPlan && ` - ${currentPlan.name}`}
                                  {billingPeriodLabel && ` (${billingPeriodLabel})`}
                                </span>
                              </div>
                              <div className="text-sm text-gray-500 flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4" />
                                  תאריך: {format(new Date(item.date), 'dd/MM/yyyy HH:mm', { locale: he })}
                                </div>
                                {item.payment_method && (
                                  <div className="flex items-center gap-2">
                                    <CreditCard className="w-4 h-4" />
                                    אמצעי תשלום: {item.payment_method}
                                  </div>
                                )}
                                {isInitialPayment && (
                                  <div className="text-xs text-green-600 font-medium mt-1">
                                    תשלום ראשוני - הפעלת מנוי
                                  </div>
                                )}
                                {isRenewal && (
                                  <div className="text-xs text-blue-600 font-medium mt-1">
                                    חידוש אוטומטי
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xl font-bold text-gray-900 mb-1">
                                ₪{item.amount.toFixed(2)}
                              </div>
                              <Badge className={`text-xs ${getStatusColor(item.status)}`}>
                                {getStatusText(item.status)}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 px-4">
                    <Receipt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">אין היסטוריית חיובי מנוי</p>
                    {activeSubscription && (
                      <p className="text-gray-500 text-sm">
                        המנוי נוצר ב-{format(new Date(activeSubscription.created_at), 'dd/MM/yyyy', { locale: he })}
                      </p>
                    )}
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

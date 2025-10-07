import React, { useState, useEffect } from "react";
import { getApiBase } from "@/utils/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Users,
  Tag,
  Calendar,
  ArrowRight,
  Download,
  RefreshCw,
  AlertCircle,
  Target,
  Percent,
  Eye,
  Star,
  Activity
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { he } from "date-fns/locale";
import { Link } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";
import { clog, cerror } from "@/lib/utils";

export default function CouponAnalytics() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [message, setMessage] = useState(null);

  // Data
  const [coupons, setCoupons] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [purchases, setPurchases] = useState([]);

  // Analytics data
  const [analytics, setAnalytics] = useState({
    overview: {
      totalCoupons: 0,
      activeCoupons: 0,
      totalUsage: 0,
      totalSavings: 0,
      averageDiscount: 0,
      conversionRate: 0
    },
    topPerformers: [],
    recentActivity: [],
    trends: {
      dailyUsage: [],
      monthlyRevenue: []
    }
  });

  // Filters
  const [dateRange, setDateRange] = useState('30days');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (coupons.length > 0) {
      calculateAnalytics();
    }
  }, [coupons, transactions, purchases, dateRange]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setMessage({ type: 'error', text: 'נדרש להתחבר מחדש' });
        return;
      }

      const apiBase = getApiBase();

      // Get current user
      const userResponse = await fetch(`${apiBase}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!userResponse.ok) {
        throw new Error('Failed to get user data');
      }

      const user = await userResponse.json();
      setCurrentUser(user);
      setIsAdmin(user.role === 'admin');

      if (user.role !== 'admin') {
        return;
      }

      // Load all relevant data
      const [couponsResponse, transactionsResponse, purchasesResponse] = await Promise.all([
        fetch(`${apiBase}/entities/coupon`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`${apiBase}/entities/transaction`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }).catch(() => null), // Transactions might not exist in all setups
        fetch(`${apiBase}/entities/purchase`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
      ]);

      const couponsData = couponsResponse.ok ? await couponsResponse.json() : [];
      const transactionsData = transactionsResponse && transactionsResponse.ok ? await transactionsResponse.json() : [];
      const purchasesData = purchasesResponse.ok ? await purchasesResponse.json() : [];

      setCoupons(Array.isArray(couponsData) ? couponsData : []);
      setTransactions(Array.isArray(transactionsData) ? transactionsData : []);
      setPurchases(Array.isArray(purchasesData) ? purchasesData : []);

    } catch (error) {
      cerror("Error loading analytics data:", error);
      setMessage({ type: 'error', text: 'שגיאה בטעינת נתוני הדוחות' });
    }
    setIsLoading(false);
  };

  const calculateAnalytics = () => {
    const now = new Date();
    let startDate;

    // Calculate date range
    switch (dateRange) {
      case '7days':
        startDate = subDays(now, 7);
        break;
      case '30days':
        startDate = subDays(now, 30);
        break;
      case '90days':
        startDate = subDays(now, 90);
        break;
      case 'thisMonth':
        startDate = startOfMonth(now);
        break;
      case 'lastMonth':
        startDate = startOfMonth(subMonths(now, 1));
        break;
      default:
        startDate = subDays(now, 30);
    }

    // Calculate overview stats
    const totalCoupons = coupons.length;
    const activeCoupons = coupons.filter(c => c.is_active).length;
    const totalUsage = coupons.reduce((sum, c) => sum + (c.usage_count || 0), 0);

    // Calculate savings from transactions with coupon data
    let totalSavings = 0;
    let couponTransactions = 0;

    // Check transactions for coupon data
    transactions.forEach(transaction => {
      if (transaction.payplus_response?.coupon_info?.applied_coupons?.length > 0) {
        const couponInfo = transaction.payplus_response.coupon_info;
        totalSavings += couponInfo.total_discount || 0;
        couponTransactions++;
      }
    });

    // Also check purchases metadata for coupon data
    purchases.forEach(purchase => {
      if (purchase.metadata?.applied_coupons?.length > 0) {
        purchase.metadata.applied_coupons.forEach(coupon => {
          totalSavings += coupon.discountAmount || 0;
        });
        couponTransactions++;
      }
    });

    const averageDiscount = totalUsage > 0 ? totalSavings / totalUsage : 0;
    const conversionRate = purchases.length > 0 ? (couponTransactions / purchases.length) * 100 : 0;

    // Calculate top performers
    const couponPerformance = coupons.map(coupon => ({
      ...coupon,
      savings: 0,
      revenue: 0,
      usageInPeriod: 0
    }));

    // Add transaction data to coupon performance
    transactions.forEach(transaction => {
      if (transaction.payplus_response?.coupon_info?.applied_coupons) {
        transaction.payplus_response.coupon_info.applied_coupons.forEach(appliedCoupon => {
          const coupon = couponPerformance.find(c => c.code === appliedCoupon.code);
          if (coupon) {
            coupon.savings += appliedCoupon.discountAmount || 0;
            coupon.revenue += (transaction.total_amount || 0) - (appliedCoupon.discountAmount || 0);
            coupon.usageInPeriod++;
          }
        });
      }
    });

    const topPerformers = couponPerformance
      .filter(c => c.usageInPeriod > 0)
      .sort((a, b) => b.savings - a.savings)
      .slice(0, 10);

    // Calculate recent activity
    const recentActivity = [
      ...transactions
        .filter(t => t.payplus_response?.coupon_info?.applied_coupons?.length > 0)
        .map(t => ({
          type: 'usage',
          date: t.created_at,
          description: `שימוש בקופון${t.payplus_response.coupon_info.applied_coupons.map(c => ' ' + c.code).join(',')}`,
          amount: t.payplus_response.coupon_info.total_discount || 0
        })),
      ...coupons
        .filter(c => new Date(c.created_at) > startDate)
        .map(c => ({
          type: 'created',
          date: c.created_at,
          description: `נוצר קופון חדש: ${c.code}`,
          amount: 0
        }))
    ]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 20);

    setAnalytics({
      overview: {
        totalCoupons,
        activeCoupons,
        totalUsage,
        totalSavings,
        averageDiscount,
        conversionRate
      },
      topPerformers,
      recentActivity,
      trends: {
        dailyUsage: [], // Would need more complex calculation
        monthlyRevenue: [] // Would need more complex calculation
      }
    });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    toast({
      title: "נתונים עודכנו",
      description: "הדוחות עודכנו בהצלחה",
      variant: "default"
    });
    setRefreshing(false);
  };

  const exportAnalytics = () => {
    const data = {
      overview: analytics.overview,
      topPerformers: analytics.topPerformers,
      dateRange,
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `coupon-analytics-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "דוח יוצא",
      description: "הדוח הורד בהצלחה",
      variant: "default"
    });
  };

  if (!isAdmin) {
    return (
      <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              אין לך הרשאות גישה לדוחות קופונים. רק מנהלים יכולים לגשת לאזור זה.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">טוען דוחות...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/coupons">
                <Button variant="outline" className="flex items-center gap-2">
                  <ArrowRight className="w-4 h-4" />
                  חזור לניהול קופונים
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">דוחות קופונים</h1>
                <p className="text-gray-500">ניתוח ביצועים ותובנות שימוש</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">7 ימים אחרונים</SelectItem>
                  <SelectItem value="30days">30 ימים אחרונים</SelectItem>
                  <SelectItem value="90days">90 ימים אחרונים</SelectItem>
                  <SelectItem value="thisMonth">החודש הנוכחי</SelectItem>
                  <SelectItem value="lastMonth">החודש הקודם</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={exportAnalytics} className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                יצוא
              </Button>
              <Button variant="outline" onClick={handleRefresh} disabled={refreshing} className="flex items-center gap-2">
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                רענן
              </Button>
            </div>
          </div>
        </div>

        {message && (
          <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Tag className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">סה"כ קופונים</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.overview.totalCoupons}</p>
                  <p className="text-sm text-green-600">
                    {analytics.overview.activeCoupons} פעילים
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Activity className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">סה"כ שימושים</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.overview.totalUsage}</p>
                  <p className="text-sm text-gray-500">
                    {analytics.overview.totalUsage > 0 ?
                      `${(analytics.overview.totalUsage / analytics.overview.totalCoupons).toFixed(1)} ממוצע לקופון` :
                      'אין שימושים'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">סה"כ חיסכון</p>
                  <p className="text-2xl font-bold text-gray-900">₪{analytics.overview.totalSavings.toFixed(2)}</p>
                  <p className="text-sm text-gray-500">
                    ממוצע ₪{analytics.overview.averageDiscount.toFixed(2)} לשימוש
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Target className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">שיעור המרה</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.overview.conversionRate.toFixed(1)}%</p>
                  <p className="text-sm text-gray-500">רכישות עם קופון</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">משתמשים פעילים</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {analytics.recentActivity.filter(a => a.type === 'usage').length}
                  </p>
                  <p className="text-sm text-gray-500">בתקופה הנבחרת</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">מגמה</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {analytics.overview.totalUsage > 0 ? '📈' : '📊'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {analytics.overview.totalUsage > 0 ? 'צמיחה' : 'יציב'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Performing Coupons */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5" />
                קופונים מובילים
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.topPerformers.length > 0 ? (
                <div className="space-y-4">
                  {analytics.topPerformers.slice(0, 5).map((coupon, index) => (
                    <div key={coupon.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{coupon.code}</div>
                          <div className="text-sm text-gray-500">
                            {coupon.discount_type === 'percentage' ?
                              `${coupon.discount_value}% הנחה` :
                              `₪${coupon.discount_value} הנחה`
                            }
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-green-600">₪{coupon.savings.toFixed(2)}</div>
                        <div className="text-sm text-gray-500">{coupon.usageInPeriod} שימושים</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p>אין נתוני ביצועים זמינים</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                פעילות אחרונה
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.recentActivity.length > 0 ? (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {analytics.recentActivity.slice(0, 10).map((activity, index) => (
                    <div key={index} className="flex items-center gap-3 p-2 rounded">
                      <div className={`w-2 h-2 rounded-full ${
                        activity.type === 'usage' ? 'bg-green-500' : 'bg-blue-500'
                      }`} />
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">{activity.description}</p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(activity.date), 'dd/MM/yyyy HH:mm', { locale: he })}
                        </p>
                      </div>
                      {activity.amount > 0 && (
                        <div className="text-sm font-medium text-green-600">
                          ₪{activity.amount.toFixed(2)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p>אין פעילות אחרונה</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Coupon Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              פילוח קופונים לפי סטטוס ונראות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Status Breakdown */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">לפי סטטוס</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">פעילים</span>
                    <span className="font-medium">{coupons.filter(c => c.is_active).length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">לא פעילים</span>
                    <span className="font-medium">{coupons.filter(c => !c.is_active).length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">פג תוקף</span>
                    <span className="font-medium">
                      {coupons.filter(c => c.valid_until && new Date(c.valid_until) < new Date()).length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Visibility Breakdown */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">לפי נראות</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">סודיים</span>
                    <span className="font-medium">{coupons.filter(c => c.visibility === 'secret').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">ציבוריים</span>
                    <span className="font-medium">{coupons.filter(c => c.visibility === 'public').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">הצעה אוטומטית</span>
                    <span className="font-medium">{coupons.filter(c => c.visibility === 'auto_suggest').length}</span>
                  </div>
                </div>
              </div>

              {/* Type Breakdown */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">לפי סוג הנחה</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">אחוז הנחה</span>
                    <span className="font-medium">{coupons.filter(c => c.discount_type === 'percentage').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">סכום קבוע</span>
                    <span className="font-medium">{coupons.filter(c => c.discount_type === 'fixed_amount').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">ממוצע ערך הנחה</span>
                    <span className="font-medium">
                      {coupons.length > 0 ?
                        (coupons.reduce((sum, c) => sum + (c.discount_value || 0), 0) / coupons.length).toFixed(1) :
                        '0'
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="mt-8">
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">פעולות מהירות</h3>
              <div className="flex flex-wrap gap-3">
                <Link to="/coupons/create">
                  <Button className="flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    צור קופון חדש
                  </Button>
                </Link>
                <Link to="/coupons/bulk-generate">
                  <Button variant="outline" className="flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    יצירה בכמות
                  </Button>
                </Link>
                <Link to="/coupons">
                  <Button variant="outline" className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    רשימת קופונים
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
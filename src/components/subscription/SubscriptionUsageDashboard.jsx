import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getProductTypeName } from "@/config/productTypes";
import { useToast } from "@/components/ui/use-toast";
import LudoraLoadingSpinner from "@/components/ui/LudoraLoadingSpinner";
import useSubscriptionState from "@/hooks/useSubscriptionState";
import { ludlog, luderror } from '@/lib/ludlog';
import {
  Crown,
  TrendingUp,
  Calendar,
  Infinity,
  Gift,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  RefreshCw,
  Package,
  Star
} from "lucide-react";

/**
 * Subscription Usage Dashboard - Shows users their current subscription usage and allowances
 * Displays allowance status, usage statistics, and subscription plan details
 */
export default function SubscriptionUsageDashboard({
  currentUser,
  className = "",
  showTitle = true,
  compact = false
}) {
  const { toast } = useToast();

  // Get subscription state and allowances
  const { summary, loading: subscriptionLoading, error: subscriptionError } = useSubscriptionState(currentUser);

  // Component state
  const [allowanceStatus, setAllowanceStatus] = useState(null);
  const [loadingAllowance, setLoadingAllowance] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Load allowance status on mount and when user changes
  useEffect(() => {
    if (currentUser && summary?.currentPlan) {
      loadAllowanceStatus();
    }
  }, [currentUser, summary]);

  /**
   * Load current allowance status for the user
   */
  const loadAllowanceStatus = async () => {
    try {
      setLoadingAllowance(true);

      ludlog.ui('Loading subscription usage dashboard', {
        userId: currentUser.id
      });

      // Call the subscription benefits API to get current allowances
      const response = await fetch('/api/subscriptions/benefits/my-allowances', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load allowance status: ${response.status} ${response.statusText}`);
      }

      const allowanceData = await response.json();
      setAllowanceStatus(allowanceData);
      setLastUpdated(new Date());

      ludlog.ui('Subscription usage dashboard loaded successfully', allowanceData);

    } catch (error) {
      luderror.ui('Error loading subscription usage dashboard:', error);

      toast({
        variant: "destructive",
        title: "שגיאה בטעינת נתוני המנוי",
        description: "לא הצלחנו לטעון את סטטוס השימוש במנוי. אנא נסה שוב."
      });
    } finally {
      setLoadingAllowance(false);
    }
  };

  /**
   * Refresh the allowance data
   */
  const handleRefresh = () => {
    loadAllowanceStatus();
  };

  /**
   * Get the product type display name in Hebrew
   */
  const getProductTypeDisplayName = (productType) => {
    return getProductTypeName(productType, 'singular');
  };

  /**
   * Format the next reset date
   */
  const formatResetDate = (resetDate) => {
    if (!resetDate) return 'לא ידוע';

    const date = new Date(resetDate);
    return date.toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  /**
   * Get usage status color and icon
   */
  const getUsageStatus = (allowance) => {
    if (!allowance) return { color: 'text-gray-500', icon: AlertTriangle, status: 'unknown' };

    if (allowance.unlimited) {
      return { color: 'text-green-600', icon: Infinity, status: 'unlimited' };
    }

    const usagePercent = ((allowance.monthly_limit - allowance.remaining) / allowance.monthly_limit) * 100;

    if (usagePercent >= 100) {
      return { color: 'text-red-600', icon: AlertTriangle, status: 'exhausted' };
    } else if (usagePercent >= 80) {
      return { color: 'text-orange-500', icon: Clock, status: 'warning' };
    } else {
      return { color: 'text-green-600', icon: CheckCircle, status: 'available' };
    }
  };

  /**
   * Calculate total usage across all product types
   */
  const getTotalUsageStats = () => {
    if (!allowanceStatus?.allowances) return { used: 0, total: 0, unlimited: 0 };

    let used = 0;
    let total = 0;
    let unlimited = 0;

    Object.values(allowanceStatus.allowances).forEach(allowance => {
      if (allowance.unlimited) {
        unlimited++;
      } else {
        used += (allowance.monthly_limit - allowance.remaining);
        total += allowance.monthly_limit;
      }
    });

    return { used, total, unlimited };
  };

  const totalStats = getTotalUsageStats();

  // Loading state
  if (subscriptionLoading || loadingAllowance) {
    return (
      <Card className={`${className} ${compact ? 'p-4' : ''}`} dir="rtl">
        <CardContent className={compact ? 'p-0' : 'pt-6'}>
          <div className="flex items-center justify-center py-8">
            <LudoraLoadingSpinner
              message="טוען נתוני מנוי..."
              status="loading"
              size="md"
              theme="neon"
              showParticles={false}
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (subscriptionError || !summary?.currentPlan) {
    return (
      <Card className={`${className} border-orange-200 bg-orange-50`} dir="rtl">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0" />
            <div>
              <p className="text-orange-800 font-medium">
                {subscriptionError ? 'שגיאה בטעינת נתוני המנוי' : 'אין מנוי פעיל'}
              </p>
              <p className="text-orange-700 text-sm mt-1">
                {subscriptionError || 'אין לך מנוי פעיל כרגע. לא ניתן להציג נתוני שימוש.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`} dir="rtl">
      {/* Header */}
      {showTitle && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">סטטוס שימוש במנוי</h2>
              <p className="text-gray-600 text-sm">עקוב אחרי השימוש שלך בגבולות המנוי החודשיים</p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loadingAllowance}
            className="text-gray-600 border-gray-300 hover:bg-gray-50"
          >
            <RefreshCw className={`w-4 h-4 ml-1 ${loadingAllowance ? 'animate-spin' : ''}`} />
            רענן
          </Button>
        </div>
      )}

      {/* Current Plan Overview */}
      <Card className="border-green-200 bg-green-50/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                <Crown className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg text-green-900">
                  {summary?.currentPlan?.name || 'מנוי פעיל'}
                </CardTitle>
                <Badge className="bg-green-500 text-white mt-1">
                  <CheckCircle className="w-3 h-3 ml-1" />
                  פעיל
                </Badge>
              </div>
            </div>

            {lastUpdated && (
              <div className="text-left text-xs text-green-700">
                עודכן לאחרונה: {lastUpdated.toLocaleTimeString('he-IL')}
              </div>
            )}
          </div>
        </CardHeader>

        {/* Summary Statistics */}
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{totalStats.used}</div>
              <div className="text-sm text-green-700">נוצלו החודש</div>
            </div>
            <div className="bg-white/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{totalStats.total}</div>
              <div className="text-sm text-green-700">סה״כ זמינים</div>
            </div>
            <div className="bg-white/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{totalStats.unlimited}</div>
              <div className="text-sm text-green-700">בלתי מוגבלים</div>
            </div>
            <div className="bg-white/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-600">
                {Object.keys(allowanceStatus?.allowances || {}).length}
              </div>
              <div className="text-sm text-green-700">סוגי תוכן</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Allowances */}
      {allowanceStatus?.allowances && (
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              פירוט גבולות השימוש
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {Object.entries(allowanceStatus.allowances).map(([productType, allowance]) => {
              const { color, icon: StatusIcon, status } = getUsageStatus(allowance);
              const usagePercent = allowance.unlimited ? 100 :
                ((allowance.monthly_limit - allowance.remaining) / allowance.monthly_limit) * 100;

              return (
                <div
                  key={productType}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      status === 'exhausted' ? 'bg-red-500' :
                      status === 'warning' ? 'bg-orange-500' :
                      status === 'unlimited' ? 'bg-green-500' :
                      'bg-blue-500'
                    }`}>
                      <Package className="w-5 h-5 text-white" />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-gray-900">
                          {getProductTypeDisplayName(productType)}
                        </p>
                        <StatusIcon className={`w-4 h-4 ${color}`} />
                      </div>

                      <div className="flex items-center gap-4 text-sm">
                        {allowance.unlimited ? (
                          <span className="flex items-center gap-1 text-green-600">
                            <Infinity className="w-3 h-3" />
                            בלתי מוגבל
                          </span>
                        ) : (
                          <>
                            <span className={color}>
                              {allowance.remaining} מתוך {allowance.monthly_limit} נותרו
                            </span>
                            <div className="flex-1 max-w-24">
                              <div className="bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full transition-all duration-300 ${
                                    status === 'exhausted' ? 'bg-red-500' :
                                    status === 'warning' ? 'bg-orange-500' :
                                    'bg-green-500'
                                  }`}
                                  style={{ width: `${Math.min(usagePercent, 100)}%` }}
                                />
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="text-left">
                      {allowance.unlimited ? (
                        <Badge className="bg-green-500 text-white">
                          <Star className="w-3 h-3 ml-1" />
                          פרימיום
                        </Badge>
                      ) : allowance.remaining > 0 ? (
                        <Badge variant="outline" className="text-green-700 border-green-300">
                          זמין
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-red-600 border-red-300">
                          מוגבל
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Next Reset Information */}
            {allowanceStatus.nextReset && (
              <div className="flex items-center gap-2 text-sm text-gray-600 pt-4 border-t border-gray-200">
                <Calendar className="w-4 h-4" />
                <span>איפוס גבולות חודשיים: {formatResetDate(allowanceStatus.nextReset)}</span>
              </div>
            )}

            {/* Usage Tips */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <div className="flex items-start gap-3">
                <Gift className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-blue-900 font-medium mb-1">טיפים לשימוש יעיל במנוי</p>
                  <ul className="text-blue-800 text-sm space-y-1">
                    <li>• תוכן שתבעת באמצעות המנוי יישאר זמין גם לאחר תום המנוי</li>
                    <li>• גבולות חודשיים מתאפסים בתחילת כל חודש</li>
                    <li>• תוכן בלתי מוגבל זמין ללא הגבלות במהלך המנוי</li>
                    <li>• ניתן לעקוב אחרי השימוש בדף זה בכל עת</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
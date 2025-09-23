
import React, { useState, useEffect, useCallback } from "react";
import { User, SubscriptionPlan } from "@/services/entities";
import { Card, CardContent } from "@/components/ui/card";
import { Crown, Gift, Wrench } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";

export default function Dashboard() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentSubscriptionPlan, setCurrentSubscriptionPlan] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Add retry logic for subscription plan loading
  const loadSubscriptionPlanWithRetry = useCallback(async (planId, retries = 2, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
      try {
        return await SubscriptionPlan.filter({ id: planId });
      } catch (error) {
        if (error.response?.status === 429 && i < retries - 1) {
          console.log(`[DASHBOARD] Rate limit hit, retrying in ${delay}ms... (${i + 1}/${retries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2;
        } else {
          throw error;
        }
      }
    }
    // This line should technically be unreachable if an error is always thrown on the last retry
    // but added for completeness/typescript type safety in some setups
    throw new Error("Failed to load subscription plan after multiple retries.");
  }, []); // No external dependencies for this function itself

  const loadDashboardData = useCallback(async () => {
    try {
      // Load current user
      const user = await User.me();
      setCurrentUser(user);

      // Load current subscription plan if user has one
      if (user.current_subscription_plan_id) {
        try {
          const plans = await loadSubscriptionPlanWithRetry(user.current_subscription_plan_id);
          if (plans.length > 0) {
            setCurrentSubscriptionPlan(plans[0]);
          }
        } catch (error) {
          console.error("Error loading subscription plan:", error);
          // Continue without subscription plan data if it fails
        }
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [loadSubscriptionPlanWithRetry]); // Dependency on loadSubscriptionPlanWithRetry

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]); // Dependency on loadDashboardData

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">טוען דאשבורד...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/50 py-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Welcome Section */}
        <div className="flex justify-between items-center mb-8">
          {/* Welcome message on the right */}
          <div className="text-right">
            <h1 className="text-xl font-semibold text-gray-900">
              שלום, {currentUser?.display_name || currentUser?.full_name} 👋
            </h1>
          </div>

          {/* Subscription Status on the left */}
          <div>
            {currentSubscriptionPlan && (
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                  currentSubscriptionPlan.price === 0 ? 'bg-blue-500' : 'bg-gradient-to-br from-purple-500 to-pink-500'
                }`}>
                  {currentSubscriptionPlan.price === 0 ? (
                    <Gift className="w-3 h-3 text-white" />
                  ) : (
                    <Crown className="w-3 h-3 text-white" />
                  )}
                </div>
                <div className="text-left">
                  <div className="font-medium text-gray-900 text-sm">{currentSubscriptionPlan.name}</div>
                  <div className="text-xs text-gray-500">
                    {currentUser.subscription_status === 'active' ? 'מנוי פעיל' : currentUser.subscription_status}
                    {currentUser.subscription_end_date && (
                      <span className="mr-2">
                        • {currentUser.payplus_subscription_uid ? 'מתחדש' : 'פג'} {format(new Date(currentUser.subscription_end_date), 'dd/MM/yyyy', { locale: he })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Under Development Message */}
        <div className="text-center">
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-12 shadow-2xl border border-gray-200/50">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Wrench className="w-12 h-12 text-white" />
            </div>
            
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              דאשבורד בפיתוח
            </h2>
            
            <p className="text-gray-600 text-lg leading-relaxed max-w-2xl mx-auto">
              אנחנו עובדים קשה כדי להביא לך חוויית דאשבורד מותאמת אישית עם כל המידע והכלים שאתה צריך.
              <br />
              בקרוב תוכל לראות כאן את כל הפעילויות, ההתקדמות והתכנים שלך במקום אחד!
            </p>
            
            <div className="mt-8 flex justify-center">
              <div className="bg-gradient-to-r from-blue-100 to-indigo-100 rounded-2xl p-4">
                <div className="text-sm font-medium text-blue-800">
                  💡 בינתיים, אתה יכול להשתמש בתפריט העליון כדי לגלוש בין הדפים השונים
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

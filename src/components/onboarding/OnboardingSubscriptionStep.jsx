import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CreditCard,
  CheckCircle,
  Crown,
  Zap,
  Users,
  BarChart3,
  ArrowRight,
  Gift,
  Star,
  AlertCircle,
  Sparkles,
  Trophy,
  Heart,
  Rocket,
  DollarSign
} from 'lucide-react';
import { clog, cerror } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import { SubscriptionPlan } from '@/services/apiClient';

export default function OnboardingSubscriptionStep({ onComplete, onboardingData, currentUser, settings }) {
  const [availablePlans, setAvailablePlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Only render if subscription system is enabled
  if (!settings?.subscription_system_enabled) {
    // Skip this step if subscription system is disabled
    useEffect(() => {
      onComplete({
        subscriptionPlan: null,
        skippedReason: 'subscription_system_disabled'
      });
    }, [onComplete]);

    return null;
  }

  useEffect(() => {
    loadAvailablePlans();
  }, []);

  const loadAvailablePlans = async () => {
    try {
      setIsLoading(true);
      setError('');

      const plans = await SubscriptionPlan.find({ is_active: true });

      // Sort plans by price (free first, then by price)
      const sortedPlans = plans.sort((a, b) => {
        const aPrice = parseFloat(a.price) || 0;
        const bPrice = parseFloat(b.price) || 0;

        if (aPrice === 0 && bPrice > 0) return -1;
        if (bPrice === 0 && aPrice > 0) return 1;
        return aPrice - bPrice;
      });

      setAvailablePlans(sortedPlans);
      clog('[OnboardingSubscriptionStep] Loaded plans:', sortedPlans);

    } catch (err) {
      cerror('[OnboardingSubscriptionStep] Error loading plans:', err);
      setError('שגיאה בטעינת תוכניות המנוי. אנא נסה שוב.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan);
    setError('');
    clog('[OnboardingSubscriptionStep] Selected plan:', plan);
  };

  const handleContinue = () => {
    if (!selectedPlan) {
      setError('יש לבחור תוכנית מנוי');
      return;
    }

    const planPrice = parseFloat(selectedPlan.price) || 0;
    const isFreePlan = planPrice === 0;

    clog('[OnboardingSubscriptionStep] Continuing with plan:', selectedPlan.name, 'Is free:', isFreePlan);

    onComplete({
      subscriptionPlan: selectedPlan,
      isFreePlan,
      requiresPayment: !isFreePlan
    });
  };

  const getPlanIcon = (plan) => {
    const planType = plan.plan_type?.toLowerCase() || '';
    const price = parseFloat(plan.price) || 0;

    if (price === 0 || planType === 'free') return Gift;
    if (planType === 'premium' || planType === 'pro') return Crown;
    return Zap;
  };

  const formatPrice = (price) => {
    const numPrice = parseFloat(price) || 0;
    if (numPrice === 0) return 'חינם';
    return `₪${numPrice}`;
  };

  const getBenefitIcon = (benefitKey) => {
    switch (benefitKey) {
      case 'games_access': return Zap;
      case 'classroom_management': return Users;
      case 'reports_access': return BarChart3;
      default: return CheckCircle;
    }
  };

  const formatBenefitText = (benefitKey, benefitValue) => {
    if (typeof benefitValue === 'boolean') {
      return benefitValue ? 'זמין' : 'לא זמין';
    }

    if (typeof benefitValue === 'object') {
      switch (benefitKey) {
        case 'games_access':
          if (benefitValue.unlimited) return 'גישה בלתי מוגבלת למשחקים';
          if (benefitValue.monthly_limit) return `עד ${benefitValue.monthly_limit} משחקים בחודש`;
          return benefitValue.enabled ? 'גישה למשחקים' : 'ללא גישה למשחקים';

        case 'classroom_management':
          let text = '';
          if (benefitValue.unlimited_classrooms) {
            text += 'כיתות בלתי מוגבלות';
          } else if (benefitValue.max_classrooms) {
            text += `עד ${benefitValue.max_classrooms} כיתות`;
          }

          if (benefitValue.unlimited_students_per_classroom) {
            text += ', תלמידים בלתי מוגבלים בכיתה';
          } else if (benefitValue.max_students_per_classroom) {
            text += `, עד ${benefitValue.max_students_per_classroom} תלמידים בכיתה`;
          }

          return text || (benefitValue.enabled ? 'ניהול כיתות זמין' : 'ללא ניהול כיתות');

        case 'reports_access':
          return benefitValue ? 'דוחות מפורטים' : 'ללא דוחות';

        default:
          return JSON.stringify(benefitValue);
      }
    }

    return String(benefitValue);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 md:space-y-8 px-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 rounded-2xl md:rounded-3xl shadow-2xl mb-4 md:mb-6 relative">
            <CreditCard className="w-10 h-10 md:w-12 md:h-12 text-white animate-pulse" />
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 rounded-2xl md:rounded-3xl blur opacity-30 animate-pulse"></div>
            <div className="absolute -top-1 -right-1 md:-top-2 md:-right-2 w-6 h-6 md:w-8 md:h-8 bg-blue-400 rounded-full flex items-center justify-center animate-bounce">
              <Sparkles className="w-3 h-3 md:w-4 md:h-4 text-blue-800" />
            </div>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 md:mb-4">טוען תוכניות מנוי מדהימות... ✨</h2>
          <p className="text-gray-600 text-lg md:text-xl">מוצא את המתנה המושלמת עבורך 🎁</p>

          <div className="flex items-center justify-center gap-2 mt-4 md:mt-6">
            <div className="flex space-x-1">
              <div className="w-3 h-3 bg-yellow-500 rounded-full animate-bounce"></div>
              <div className="w-3 h-3 bg-orange-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
              <div className="w-3 h-3 bg-red-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 md:space-y-8 px-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl md:rounded-3xl shadow-2xl mb-4 md:mb-6 relative">
            <AlertCircle className="w-10 h-10 md:w-12 md:h-12 text-white" />
            <div className="absolute inset-0 bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl md:rounded-3xl blur opacity-30 animate-pulse"></div>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 md:mb-4">אופס! משהו השתבש 😅</h2>
          <p className="text-gray-600 text-lg md:text-xl">אל תדאג, נפתור את זה יחד!</p>
        </div>

        <div className="bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-2xl md:rounded-3xl p-4 md:p-8 shadow-lg">
          <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-red-500 rounded-full flex items-center justify-center">
              <AlertCircle className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div>
              <p className="text-red-800 font-bold text-base md:text-lg">שגיאה בטעינת התוכניות</p>
              <p className="text-red-700 text-sm md:text-base">{error}</p>
            </div>
          </div>

          <div className="text-center">
            <Button
              onClick={loadAvailablePlans}
              size="lg"
              className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white px-8 md:px-12 py-3 text-base md:text-lg font-bold rounded-xl md:rounded-2xl shadow-xl transform hover:scale-105 transition-all duration-300"
            >
              <Rocket className="w-5 h-5 md:w-6 md:h-6 ml-2" />
              בואו ننסה שוב! 🚀
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">

      {/* Modern Introduction */}
      <div className="text-center px-4">
        <div className="inline-flex items-center justify-center w-20 h-20 md:w-28 md:h-28 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 rounded-2xl md:rounded-3xl shadow-2xl mb-4 md:mb-6 relative">
          <CreditCard className="w-10 h-10 md:w-14 md:h-14 text-white" />
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 rounded-2xl md:rounded-3xl blur opacity-30 animate-pulse"></div>
          <div className="absolute -top-2 -right-2 md:-top-3 md:-right-3 w-8 h-8 md:w-12 md:h-12 bg-green-400 rounded-full flex items-center justify-center animate-bounce shadow-lg">
            <Gift className="w-4 h-4 md:w-6 md:h-6 text-green-800" />
          </div>
          <div className="absolute -bottom-1 -left-1 md:-bottom-2 md:-left-2 text-2xl md:text-4xl animate-pulse">
            💎
          </div>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 md:mb-4">בחר את החבילה המושלמת! 💝</h2>
        <p className="text-gray-600 text-lg md:text-xl leading-relaxed max-w-2xl mx-auto">
          זמן לבחור את התוכנית שתלווה אותך במסע הלמידה המדהים שלך ✨
        </p>

        {/* Features preview */}
        <div className="flex items-center justify-center gap-2 mt-4 md:mt-6">
          <div className="flex items-center gap-1 bg-yellow-100 px-3 md:px-4 py-2 rounded-full">
            <Heart className="w-4 h-4 text-yellow-600" />
            <span className="text-yellow-800 font-medium text-xs md:text-sm">תוכניות מותאמות אישית</span>
          </div>
        </div>
      </div>

      {/* Enhanced Plans Grid */}
      <div className="grid gap-4 md:gap-6 lg:gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {availablePlans.map((plan) => {
          const PlanIcon = getPlanIcon(plan);
          const isSelected = selectedPlan?.id === plan.id;
          const price = parseFloat(plan.price) || 0;
          const isFreePlan = price === 0;

          return (
            <div key={plan.id} className="relative">
              {/* Popular Badge for Free Plans */}
              {isFreePlan && (
                <div className="absolute -top-3 md:-top-4 left-1/2 transform -translate-x-1/2 z-10">
                  <div className="bg-gradient-to-r from-green-400 to-emerald-500 text-white px-3 md:px-4 py-1 rounded-full text-xs md:text-sm font-bold shadow-lg flex items-center gap-1">
                    <Star className="w-3 h-3 md:w-4 md:h-4" />
                    <span className="hidden sm:inline">הכי פופולרי! 🔥</span>
                    <span className="sm:hidden">פופולרי! 🔥</span>
                  </div>
                </div>
              )}

              {/* Discount Badge for Paid Plans */}
              {plan.has_discount && plan.discount_valid_until && !isFreePlan && (
                <div className="absolute -top-3 md:-top-4 left-1/2 transform -translate-x-1/2 z-10">
                  <div className="bg-gradient-to-r from-orange-400 to-red-500 text-white px-3 md:px-4 py-1 rounded-full text-xs md:text-sm font-bold shadow-lg flex items-center gap-1 animate-pulse">
                    <Star className="w-3 h-3 md:w-4 md:h-4" />
                    <span className="hidden sm:inline">הנחה מיוחדת! 🎉</span>
                    <span className="sm:hidden">הנחה! 🎉</span>
                  </div>
                </div>
              )}

              <Card
                className={`cursor-pointer transition-all duration-500 transform hover:scale-105 relative overflow-hidden h-full ${
                  isSelected
                    ? 'ring-4 ring-yellow-500 shadow-2xl shadow-yellow-500/25 border-yellow-300'
                    : 'border-gray-200 hover:shadow-xl hover:border-yellow-400 hover:shadow-yellow-500/20'
                } ${isFreePlan ? 'border-green-300 bg-gradient-to-br from-green-50 to-emerald-50' : 'bg-gradient-to-br from-blue-50 to-purple-50'}`}
                onClick={() => handlePlanSelect(plan)}
              >
                {/* Background decorative elements */}
                <div className="absolute top-0 right-0 w-20 h-20 md:w-32 md:h-32 bg-yellow-200/20 rounded-full -translate-y-10 translate-x-10 md:-translate-y-16 md:translate-x-16"></div>
                <div className="absolute bottom-0 left-0 w-16 h-16 md:w-24 md:h-24 bg-orange-200/20 rounded-full translate-y-8 -translate-x-8 md:translate-y-12 md:-translate-x-12"></div>

                <CardHeader className="text-center relative z-10 pb-3 md:pb-4 p-4 md:p-6">
                  {/* Enhanced Icon */}
                  <div className="relative mx-auto w-fit mb-3 md:mb-4">
                    <div className={`w-16 h-16 md:w-20 md:h-20 mx-auto rounded-2xl md:rounded-3xl flex items-center justify-center shadow-2xl transition-transform duration-300 ${
                      isSelected ? 'scale-110' : ''
                    } ${
                      isFreePlan
                        ? 'bg-gradient-to-br from-green-400 via-emerald-500 to-green-600'
                        : 'bg-gradient-to-br from-blue-500 via-purple-500 to-pink-600'
                    }`}>
                      <PlanIcon className="w-8 h-8 md:w-10 md:h-10 text-white" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 md:-bottom-2 md:-right-2 text-2xl md:text-3xl">
                      {isFreePlan ? '🎁' : '💎'}
                    </div>
                  </div>

                  <CardTitle className="text-lg md:text-2xl mb-2 md:mb-3 flex flex-col sm:flex-row items-center justify-center gap-2 font-bold">
                    <span>{plan.name}</span>
                    {isSelected && (
                      <div className="flex items-center gap-1 bg-yellow-500 text-white px-2 md:px-3 py-1 rounded-xl md:rounded-2xl shadow-lg animate-pulse">
                        <CheckCircle className="w-3 h-3 md:w-4 md:h-4" />
                        <span className="text-xs md:text-sm font-bold">נבחר!</span>
                      </div>
                    )}
                  </CardTitle>

                  {/* Enhanced Price Display */}
                  <div className="text-center">
                    <div className="text-3xl md:text-4xl font-black text-gray-900">
                      {formatPrice(plan.price)}
                      {!isFreePlan && (
                        <span className="text-base md:text-lg font-normal text-gray-500">
                          /{plan.billing_period === 'monthly' ? 'חודש' : 'שנה'}
                        </span>
                      )}
                    </div>
                    {isFreePlan && (
                      <div className="text-green-600 font-bold text-base md:text-lg mt-1">
                        לתמיד! 🎉
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="relative z-10">
                  <p className="text-gray-700 text-center mb-6 text-lg leading-relaxed">{plan.description}</p>

                  {/* Enhanced Benefits */}
                  {plan.benefits && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-4">
                        <Sparkles className="w-5 h-5 text-purple-600" />
                        <h4 className="font-bold text-purple-900 text-lg">מה כלול בחבילה:</h4>
                      </div>
                      <div className="space-y-3">
                        {Object.entries(plan.benefits).map(([benefitKey, benefitValue]) => {
                          const BenefitIcon = getBenefitIcon(benefitKey);
                          const benefitText = formatBenefitText(benefitKey, benefitValue);

                          return (
                            <div key={benefitKey} className="flex items-center gap-3 p-3 bg-white/70 rounded-2xl border border-gray-200">
                              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                                <BenefitIcon className="w-4 h-4 text-white" />
                              </div>
                              <span className="text-gray-800 font-medium">{benefitText}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Enhanced Recommendation */}
                  {isFreePlan && (
                    <div className="mt-6 p-4 bg-gradient-to-r from-green-100 to-emerald-100 border-2 border-green-300 rounded-3xl text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Trophy className="w-6 h-6 text-green-600" />
                        <span className="font-bold text-green-800 text-lg">מומלץ להתחלה!</span>
                      </div>
                      <p className="text-green-700 text-sm">מושלם כדי להכיר את המערכת</p>
                    </div>
                  )}

                  {!isFreePlan && price > 0 && (
                    <div className="mt-6 p-4 bg-gradient-to-r from-blue-100 to-purple-100 border-2 border-blue-300 rounded-3xl text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Crown className="w-6 h-6 text-blue-600" />
                        <span className="font-bold text-blue-800 text-lg">חבילה מקצועית</span>
                      </div>
                      <p className="text-blue-700 text-sm">כל התכונות המתקדמות</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>

      {/* Enhanced Selected Plan Info */}
      {selectedPlan && (
        <div className="bg-gradient-to-r from-yellow-100 to-orange-100 border-2 border-yellow-300 rounded-3xl p-6 shadow-lg animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center shadow-lg">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-yellow-900 font-bold text-xl mb-1">בחירה מעולה! 🎉</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-800 text-lg">
                    <strong>{selectedPlan.name}</strong> - {formatPrice(selectedPlan.price)}
                    {parseFloat(selectedPlan.price) > 0 && ` ל${selectedPlan.billing_period === 'monthly' ? 'חודש' : 'שנה'}`}
                  </p>
                  {parseFloat(selectedPlan.price) === 0 && (
                    <p className="text-yellow-700 text-sm font-medium">ללא תשלום נדרש 💚</p>
                  )}
                </div>
                <div className="text-3xl animate-bounce">
                  {parseFloat(selectedPlan.price) === 0 ? '🎁' : '💎'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Error Display */}
      {error && (
        <div className="bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-3xl p-6 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-red-800 font-bold text-lg">אופס! יש בעיה קטנה 😅</p>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Continue Button */}
      <div className="text-center pt-6 md:pt-8">
        <Button
          onClick={handleContinue}
          disabled={!selectedPlan}
          size="lg"
          className={`
            px-8 md:px-16 py-3 md:py-4 text-lg md:text-xl font-bold rounded-2xl md:rounded-3xl shadow-2xl transition-all duration-300 transform hover:scale-105
            ${selectedPlan
              ? 'bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 hover:from-yellow-600 hover:via-orange-600 hover:to-red-600 text-white hover:shadow-yellow-500/25'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          {selectedPlan && parseFloat(selectedPlan.price) > 0 ? (
            <>
              <CreditCard className="w-5 h-5 md:w-7 md:h-7 ml-2" />
              <span className="hidden sm:inline">בואו לתשלום! הכמעט סיימנו! 💳</span>
              <span className="sm:hidden">לתשלום! 💳</span>
            </>
          ) : selectedPlan ? (
            <>
              <CheckCircle className="w-5 h-5 md:w-7 md:h-7 ml-2" />
              <span className="hidden sm:inline">בואו נמשיך! זה חינם! 🚀</span>
              <span className="sm:hidden">נמשיך! 🚀</span>
            </>
          ) : (
            <>
              <DollarSign className="w-5 h-5 md:w-7 md:h-7 ml-2" />
              <span className="hidden sm:inline">בחר תוכנית כדי להמשיך</span>
              <span className="sm:hidden">בחר תוכנית</span>
            </>
          )}
        </Button>

        {selectedPlan && (
          <div className="mt-4 md:mt-6 bg-gradient-to-r from-green-100 to-emerald-100 border border-green-200 rounded-xl md:rounded-2xl p-3 md:p-4 animate-pulse">
            <p className="text-green-800 font-bold text-base md:text-lg flex items-center justify-center gap-2">
              <Heart className="w-4 h-4 md:w-5 md:h-5" />
              <span className="hidden sm:inline">מעולה! כמעט סיימנו את ההרשמה! 🎉</span>
              <span className="sm:hidden">כמעט סיימנו! 🎉</span>
            </p>
          </div>
        )}
      </div>

      {/* Enhanced Additional Info */}
      <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-2xl md:rounded-3xl p-4 md:p-8 border border-gray-200">
        <div className="text-center space-y-4 md:space-y-6">
          <div className="flex items-center justify-center gap-2 mb-3 md:mb-4">
            <div className="w-6 h-6 md:w-8 md:h-8 bg-gray-500 rounded-full flex items-center justify-center">
              <Sparkles className="w-3 h-3 md:w-4 md:h-4 text-white" />
            </div>
            <span className="text-gray-900 font-bold text-lg md:text-xl">מידע שימושי 💡</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div className="bg-white/70 rounded-xl md:rounded-2xl p-3 md:p-4 border border-gray-200">
              <div className="text-blue-600 font-bold mb-2 flex items-center gap-2 text-sm md:text-base">
                <span className="text-lg md:text-xl">🔄</span>
                גמישות מלאה
              </div>
              <p className="text-gray-600 text-xs md:text-sm">תוכל לשנות את תוכנית המנוי בכל זמן מההגדרות</p>
            </div>
            <div className="bg-white/70 rounded-xl md:rounded-2xl p-3 md:p-4 border border-gray-200">
              <div className="text-purple-600 font-bold mb-2 flex items-center gap-2 text-sm md:text-base">
                <span className="text-lg md:text-xl">🌟</span>
                תמיכה מלאה
              </div>
              <p className="text-gray-600 text-xs md:text-sm">כל התוכניות כוללות תמיכה וגישה לכל התכונות הבסיסיות</p>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-xl md:rounded-2xl p-3 md:p-4">
            <p className="text-yellow-800 text-xs md:text-sm font-medium flex items-center justify-center gap-2">
              <Trophy className="w-4 h-4" />
              <span className="hidden sm:inline">כל התוכניות מגיעות עם אחריות להנאה מלאה! 😊</span>
              <span className="sm:hidden">אחריות להנאה מלאה! 😊</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
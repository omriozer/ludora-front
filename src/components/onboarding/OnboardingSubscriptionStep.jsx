import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  CreditCard,
  CheckCircle,
  Crown,
  ArrowLeft,
  Gift,
  Star,
  Sparkles,
  Trophy,
  Heart
} from 'lucide-react';
import { clog } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import SubscriptionModal from '@/components/SubscriptionModal';

export default function OnboardingSubscriptionStep({ onComplete, onBack, onboardingData, currentUser, settings }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasSelectedPlan, setHasSelectedPlan] = useState(false);

  // Only render if subscription system is enabled
  if (!settings?.subscription_system_enabled) {
    // Skip this step if subscription system is disabled
    useEffect(() => {
      onComplete({
        subscriptionSelected: true,
        skippedReason: 'subscription_system_disabled'
      });
    }, [onComplete]);

    return null;
  }

  const handleOpenModal = () => {
    clog('[OnboardingSubscriptionStep] Opening SubscriptionModal');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    clog('[OnboardingSubscriptionStep] Closing SubscriptionModal');
    setIsModalOpen(false);
  };

  const handleSubscriptionChange = (updatedUser) => {
    clog('[OnboardingSubscriptionStep] Subscription changed:', updatedUser);
    clog('[OnboardingSubscriptionStep] 🔍 updatedUser.onboarding_completed:', updatedUser?.onboarding_completed);
    clog('[OnboardingSubscriptionStep] 🔍 About to call onComplete with data');
    setHasSelectedPlan(true);

    toast({
      title: "תוכנית המנוי נשמרה",
      description: "תוכנית המנוי שלך נבחרה בהצלחה!",
      variant: "default"
    });

    // Close the modal and complete the onboarding step
    setIsModalOpen(false);

    // Complete the onboarding step
    clog('[OnboardingSubscriptionStep] 🚀 Calling onComplete in 1 second...');
    setTimeout(() => {
      clog('[OnboardingSubscriptionStep] 🏁 NOW calling onComplete!');
      onComplete({
        subscriptionSelected: true,
        subscriptionPlan: updatedUser
      });
    }, 1000);
  };

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
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 md:mb-4">בואו נבחר את תוכנית המנוי המושלמת עבורך! 💝</h2>
        <p className="text-gray-600 text-lg md:text-xl leading-relaxed max-w-2xl mx-auto">
          אנחנו מציעים מגוון תוכניות שמתאימות לכל מורה ומוסד חינוכי
        </p>
      </div>

      {/* Subscription Selection Card */}
      <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 relative overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300">
        <div className="absolute top-0 right-0 w-20 h-20 md:w-32 md:h-32 bg-purple-200/20 rounded-full -translate-y-10 translate-x-10 md:-translate-y-16 md:translate-x-16"></div>
        <div className="absolute bottom-0 left-0 w-16 h-16 md:w-24 md:h-24 bg-pink-200/20 rounded-full translate-y-8 -translate-x-8 md:translate-y-12 md:-translate-x-12"></div>

        <CardHeader className="relative z-10 p-4 md:p-6">
          <CardTitle className="flex flex-col sm:flex-row items-center gap-3 text-purple-900 text-center sm:text-right">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg">
              <Crown className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div>
              <span className="text-xl md:text-2xl font-bold">בחירת תוכנית מנוי 👑</span>
              <p className="text-purple-700 text-xs md:text-sm font-normal">גישה לכל האפשרויות שלנו</p>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4 md:space-y-6 relative z-10 p-4 md:p-6">
          <div className="text-center space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm md:text-base">
              <div className="flex items-center gap-2 justify-center">
                <Gift className="w-5 h-5 text-green-600" />
                <span className="text-green-800 font-medium">תוכניות חינם זמינות</span>
              </div>
              <div className="flex items-center gap-2 justify-center">
                <Crown className="w-5 h-5 text-purple-600" />
                <span className="text-purple-800 font-medium">תוכניות פרימיום</span>
              </div>
              <div className="flex items-center gap-2 justify-center">
                <Star className="w-5 h-5 text-yellow-600" />
                <span className="text-yellow-800 font-medium">התאמה אישית</span>
              </div>
            </div>

            <div className="bg-white/70 rounded-2xl p-4 md:p-6 border border-purple-200">
              <h3 className="text-lg md:text-xl font-bold text-purple-900 mb-2">מה תקבל?</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm md:text-base">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>גישה למשחקים חינוכיים</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>ניהול כיתות</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>דוחות התקדמות</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>תמיכה מלאה</span>
                </div>
              </div>
            </div>

            {hasSelectedPlan && (
              <div className="bg-green-100 border border-green-300 rounded-xl p-4 animate-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <span className="text-green-800 font-bold text-lg">מעולה! תוכנית המנוי נבחרה בהצלחה! 🎉</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center pt-6 md:pt-8">
        {/* Back Button */}
        {onBack && (
          <Button
            onClick={onBack}
            variant="outline"
            size="lg"
            className="px-6 md:px-8 py-3 md:py-4 text-base md:text-lg font-bold rounded-xl md:rounded-2xl border-2 border-gray-300 bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-900 transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            <ArrowLeft className="w-5 h-5 md:w-6 md:h-6 ml-2" />
            <span className="hidden sm:inline">חזור לשלב הקודם</span>
            <span className="sm:hidden">חזור</span>
          </Button>
        )}

        {/* Open Subscription Modal Button */}
        <Button
          onClick={handleOpenModal}
          disabled={hasSelectedPlan}
          size="lg"
          className={`
            px-8 md:px-16 py-3 md:py-4 text-lg md:text-xl font-bold rounded-2xl md:rounded-3xl shadow-2xl transition-all duration-300 transform hover:scale-105
            ${hasSelectedPlan
              ? 'bg-green-500 hover:bg-green-600 text-white'
              : 'bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 hover:from-yellow-600 hover:via-orange-600 hover:to-red-600 text-white hover:shadow-yellow-500/25'
            }
          `}
        >
          {hasSelectedPlan ? (
            <>
              <CheckCircle className="w-5 h-5 md:w-7 md:h-7 ml-2" />
              <span className="hidden sm:inline">תוכנית נבחרה! בואו נמשיך! 🚀</span>
              <span className="sm:hidden">בואו נמשיך! 🚀</span>
            </>
          ) : (
            <>
              <Crown className="w-5 h-5 md:w-7 md:h-7 ml-2" />
              <span className="hidden sm:inline">בחר תוכנית מנוי 👑</span>
              <span className="sm:hidden">בחר תוכנית 👑</span>
            </>
          )}
        </Button>
      </div>

      {/* Success Message */}
      {hasSelectedPlan && (
        <div className="mt-4 md:mt-6 bg-gradient-to-r from-green-100 to-emerald-100 border border-green-200 rounded-xl md:rounded-2xl p-3 md:p-4 animate-pulse">
          <p className="text-green-800 font-bold text-base md:text-lg flex items-center justify-center gap-2">
            <Heart className="w-4 h-4 md:w-5 md:h-5" />
            <span className="hidden sm:inline">מעולה! כמעט סיימנו את ההרשמה! 🎉</span>
            <span className="sm:hidden">כמעט סיימנו! 🎉</span>
          </p>
        </div>
      )}

      {/* Subscription Modal */}
      <SubscriptionModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        currentUser={currentUser}
        onSubscriptionChange={handleSubscriptionChange}
        isAutoOpened={false}
      />
    </div>
  );
}
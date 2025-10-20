import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  GraduationCap,
  UserCheck,
  Users,
  Mail,
  CheckCircle,
  Info,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  Sparkles,
  Star,
  Crown
} from 'lucide-react';
import { clog } from '@/lib/utils';

export default function AccountTypeSelector({ onComplete, onBack, onboardingData, currentUser }) {
  const [selectedType, setSelectedType] = useState(onboardingData?.accountType || '');
  const [error, setError] = useState('');

  const accountTypes = [
    {
      id: 'teacher',
      title: 'מורה / מחנך 👨‍🏫',
      description: 'אני מורה, מחנך או איש חינוך המעוניין ליצור כיתות ולנהל תלמידים',
      icon: GraduationCap,
      available: true,
      features: [
        'יצירת כיתות וניהולן 🏫',
        'הזמנת תלמידים למערכת 📧',
        'מעקב אחר התקדמות התלמידים 📊',
        'גישה לדוחות ומשוב מפורט 📈',
        'יצירת תכנים חינוכיים מותאמים ✨'
      ],
      bgColor: 'from-purple-500 via-blue-500 to-cyan-500',
      borderColor: 'border-purple-200',
      bgLight: 'bg-gradient-to-br from-purple-50 to-blue-50',
      emoji: '🎓',
      highlight: 'המסלול הפופולרי ביותר!'
    }
  ];

  const unavailableTypes = [
    {
      id: 'student',
      title: 'תלמיד 🎒',
      description: 'חשבון תלמיד נוצר רק באמצעות הזמנה ממורה',
      icon: Users,
      available: false,
      reason: 'נדרשת הזמנה ממורה 📨',
      bgColor: 'from-orange-400 to-yellow-500',
      borderColor: 'border-orange-200',
      bgLight: 'bg-gradient-to-br from-orange-50 to-yellow-50',
      emoji: '👨‍🎓'
    },
    {
      id: 'parent',
      title: 'הורה / אפוטרופוס 👨‍👩‍👧‍👦',
      description: 'חשבון הורה נוצר רק כחלק מתהליך אישור הרשמת תלמיד',
      icon: UserCheck,
      available: false,
      reason: 'נדרשת הזמנה ממורה 📩',
      bgColor: 'from-green-400 to-emerald-500',
      borderColor: 'border-green-200',
      bgLight: 'bg-gradient-to-br from-green-50 to-emerald-50',
      emoji: '👪'
    }
  ];

  const handleTypeSelect = (typeId) => {
    const accountType = accountTypes.find(type => type.id === typeId);
    if (accountType && accountType.available) {
      setSelectedType(typeId);
      setError('');
      clog('[AccountTypeSelector] Selected account type:', typeId);
    }
  };

  const handleContinue = () => {
    if (!selectedType) {
      setError('יש לבחור סוג חשבון');
      return;
    }

    const selectedAccountType = accountTypes.find(type => type.id === selectedType);
    if (!selectedAccountType || !selectedAccountType.available) {
      setError('סוג החשבון שנבחר אינו זמין');
      return;
    }

    clog('[AccountTypeSelector] Continuing with account type:', selectedType);

    onComplete({
      accountType: selectedType
    });
  };

  return (
    <div className="space-y-6 md:space-y-8">

      {/* Modern Introduction */}
      <div className="text-center px-4">
        <div className="inline-flex items-center justify-center w-16 h-16 md:w-24 md:h-24 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl md:rounded-3xl shadow-2xl mb-4 md:mb-6 relative">
          <UserCheck className="w-8 h-8 md:w-12 md:h-12 text-white" />
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400 rounded-2xl md:rounded-3xl blur opacity-30 animate-pulse"></div>
          <div className="absolute -top-1 -right-1 md:-top-2 md:-right-2 w-6 h-6 md:w-8 md:h-8 bg-yellow-400 rounded-full flex items-center justify-center animate-bounce">
            <Crown className="w-3 h-3 md:w-4 md:h-4 text-yellow-800" />
          </div>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 md:mb-4">איזה סוג חשבון מתאים לך? 🤔</h2>
        <p className="text-gray-600 text-lg md:text-xl leading-relaxed max-w-2xl mx-auto">
          בחר את הדרך שלך להצטרף למשפחת לודורה! ✨
        </p>
      </div>

      {/* Available Account Types */}
      <div className="space-y-4 md:space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl shadow-lg">
            <Star className="w-4 h-4 md:w-5 md:h-5" />
            <span className="font-bold text-base md:text-lg">זמין עכשיו! 🚀</span>
          </div>
        </div>

        {accountTypes.map((type) => {
          const Icon = type.icon;
          const isSelected = selectedType === type.id;

          return (
            <div key={type.id} className="relative">
              {/* Popular Badge */}
              {type.highlight && (
                <div className="absolute -top-2 md:-top-3 left-1/2 transform -translate-x-1/2 z-10">
                  <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 md:px-4 py-1 rounded-full text-xs md:text-sm font-bold shadow-lg flex items-center gap-1">
                    <Sparkles className="w-3 h-3 md:w-4 md:h-4" />
                    <span className="hidden sm:inline">{type.highlight}</span>
                    <span className="sm:hidden">פופולרי!</span>
                  </div>
                </div>
              )}

              <Card
                className={`cursor-pointer transition-all duration-500 transform hover:scale-105 relative overflow-hidden ${
                  isSelected
                    ? `ring-2 md:ring-4 ring-purple-500 shadow-2xl shadow-purple-500/25 border-purple-300`
                    : `border-purple-200 hover:shadow-xl hover:border-purple-400 hover:shadow-purple-500/20`
                }`}
                onClick={() => handleTypeSelect(type.id)}
              >
                {/* Background decorative elements */}
                <div className="absolute top-0 right-0 w-20 h-20 md:w-32 md:h-32 bg-purple-200/20 rounded-full -translate-y-10 translate-x-10 md:-translate-y-16 md:translate-x-16"></div>
                <div className="absolute bottom-0 left-0 w-16 h-16 md:w-24 md:h-24 bg-pink-200/20 rounded-full translate-y-8 -translate-x-8 md:translate-y-12 md:-translate-x-12"></div>

                <CardContent className="p-4 md:p-8 relative z-10">
                  <div className="flex flex-col sm:flex-row items-start gap-4 md:gap-6">
                    {/* Enhanced Icon */}
                    <div className="relative mx-auto sm:mx-0">
                      <div className={`w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br ${type.bgColor} rounded-2xl md:rounded-3xl flex items-center justify-center flex-shrink-0 shadow-2xl transition-transform duration-300 ${isSelected ? 'scale-110' : ''}`}>
                        <Icon className="w-8 h-8 md:w-10 md:h-10 text-white" />
                      </div>
                      <div className="absolute -bottom-1 -right-1 md:-bottom-2 md:-right-2 text-xl md:text-3xl">
                        {type.emoji}
                      </div>
                    </div>

                    <div className="flex-1 space-y-3 md:space-y-4 text-center sm:text-right">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                        <h3 className="text-lg md:text-2xl font-bold text-gray-900">{type.title}</h3>
                        {isSelected && (
                          <div className="flex items-center gap-1 md:gap-2 bg-green-500 text-white px-3 md:px-4 py-1 md:py-2 rounded-xl md:rounded-2xl shadow-lg animate-pulse">
                            <CheckCircle className="w-4 h-4 md:w-5 md:h-5" />
                            <span className="font-bold text-sm md:text-base">נבחר!</span>
                          </div>
                        )}
                      </div>

                      <p className="text-gray-600 text-sm md:text-lg leading-relaxed">
                        {type.description}
                      </p>

                      {type.features && (
                        <div className={`${type.bgLight} border-2 border-purple-200 rounded-xl md:rounded-2xl p-4 md:p-6 mt-4 md:mt-6 relative overflow-hidden`}>
                          <div className="absolute top-0 right-0 w-16 h-16 md:w-20 md:h-20 bg-white/30 rounded-full -translate-y-8 translate-x-8 md:-translate-y-10 md:translate-x-10"></div>
                          <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-3 md:mb-4 justify-center sm:justify-start">
                              <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-purple-600" />
                              <p className="font-bold text-purple-900 text-base md:text-lg">מה תוכל לעשות:</p>
                            </div>
                            <ul className="space-y-2 md:space-y-3">
                              {type.features.map((feature, index) => (
                                <li key={index} className="flex items-center gap-2 md:gap-3 text-gray-700 text-sm md:text-base">
                                  <div className="w-5 h-5 md:w-6 md:h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                                    <CheckCircle className="w-3 h-3 md:w-4 md:h-4 text-white" />
                                  </div>
                                  <span className="font-medium">{feature}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>

      {/* Unavailable Account Types */}
      <div className="space-y-4 md:space-y-6">
        <div className="text-center px-4">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-4 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl shadow-lg">
            <Mail className="w-4 h-4 md:w-5 md:h-5" />
            <span className="font-bold text-base md:text-lg">דרושה הזמנה 📧</span>
          </div>
          <p className="text-gray-600 mt-2 md:mt-3 text-base md:text-lg">סוגי חשבון אלה זמינים רק באמצעות הזמנת מורה</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
          {unavailableTypes.map((type) => {
            const Icon = type.icon;

            return (
              <Card
                key={type.id}
                className={`${type.borderColor} relative overflow-hidden transition-all duration-300 hover:shadow-lg transform hover:scale-105`}
              >
                {/* Background decorative elements */}
                <div className="absolute top-0 right-0 w-16 h-16 md:w-24 md:h-24 bg-gray-200/30 rounded-full -translate-y-8 translate-x-8 md:-translate-y-12 md:translate-x-12"></div>
                <div className="absolute bottom-0 left-0 w-12 h-12 md:w-16 md:h-16 bg-gray-200/20 rounded-full translate-y-6 -translate-x-6 md:translate-y-8 md:-translate-x-8"></div>

                <CardContent className="p-4 md:p-6 relative z-10">
                  <div className="text-center space-y-3 md:space-y-4">
                    {/* Enhanced Icon with Emoji */}
                    <div className="relative mx-auto w-fit">
                      <div className={`w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br ${type.bgColor} rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg`}>
                        <Icon className="w-6 h-6 md:w-8 md:h-8 text-white" />
                      </div>
                      <div className="absolute -bottom-1 -right-1 text-lg md:text-2xl">
                        {type.emoji}
                      </div>
                    </div>

                    <div className="space-y-2 md:space-y-3">
                      <h3 className="text-lg md:text-xl font-bold text-gray-800">{type.title}</h3>
                      <p className="text-gray-600 text-sm md:text-base leading-relaxed">
                        {type.description}
                      </p>

                      {/* Enhanced Reason Badge */}
                      <div className={`${type.bgLight} border-2 ${type.borderColor} rounded-xl md:rounded-2xl p-3 md:p-4`}>
                        <div className="flex items-center justify-center gap-2 text-orange-700">
                          <Info className="w-4 h-4 md:w-5 md:h-5" />
                          <span className="font-bold text-sm md:text-base">{type.reason}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Enhanced Information Alert */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl md:rounded-3xl p-4 md:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-20 h-20 md:w-32 md:h-32 bg-blue-200/20 rounded-full -translate-y-10 translate-x-10 md:-translate-y-16 md:translate-x-16"></div>
        <div className="absolute bottom-0 left-0 w-16 h-16 md:w-24 md:h-24 bg-indigo-200/20 rounded-full translate-y-8 -translate-x-8 md:translate-y-12 md:-translate-x-12"></div>

        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row items-center gap-3 md:gap-4 mb-4 md:mb-6">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl md:rounded-2xl flex items-center justify-center flex-shrink-0">
              <Mail className="w-6 h-6 md:w-8 md:h-8 text-white" />
            </div>
            <div className="text-center sm:text-right">
              <h3 className="text-lg md:text-2xl font-bold text-blue-900 mb-1">איך עובד תהליך ההזמנות? 🤝</h3>
              <p className="text-blue-700 text-sm md:text-base">המדריך המלא להצטרפות למשפחת לודורא!</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            <div className="bg-white/70 rounded-xl md:rounded-2xl p-3 md:p-4 border border-blue-200">
              <div className="text-xl md:text-2xl mb-2 text-center">👨‍🎓</div>
              <div className="font-bold text-blue-900 mb-2 text-center text-sm md:text-base">תלמידים</div>
              <p className="text-blue-700 text-xs md:text-sm text-center">מורה מזמין תלמיד למערכת באמצעות כתובת המייל שלו</p>
            </div>
            <div className="bg-white/70 rounded-xl md:rounded-2xl p-3 md:p-4 border border-blue-200">
              <div className="text-xl md:text-2xl mb-2 text-center">👨‍👩‍👧‍👦</div>
              <div className="font-bold text-blue-900 mb-2 text-center text-sm md:text-base">הורים</div>
              <p className="text-blue-700 text-xs md:text-sm text-center">במידת הצורך, המורה מזמין גם את ההורה לאישור</p>
            </div>
            <div className="bg-white/70 rounded-xl md:rounded-2xl p-3 md:p-4 border border-blue-200 sm:col-span-2 md:col-span-1">
              <div className="text-xl md:text-2xl mb-2 text-center">🏫</div>
              <div className="font-bold text-blue-900 mb-2 text-center text-sm md:text-base">מנהלי בתי ספר</div>
              <p className="text-blue-700 text-xs md:text-sm text-center">מוגדרים על ידי מנהל המערכת בלבד</p>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-xl md:rounded-2xl p-4 md:p-6">
          <div className="flex items-center gap-2 md:gap-3">
            <AlertTriangle className="w-6 h-6 md:w-8 md:h-8 text-red-500 flex-shrink-0" />
            <div>
              <p className="text-red-800 font-bold text-base md:text-lg">אופס! יש בעיה קטנה</p>
              <p className="text-red-700 text-sm md:text-base">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Navigation Buttons */}
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

        {/* Continue Button */}
        <Button
          onClick={handleContinue}
          disabled={!selectedType}
          size="lg"
          className={`
            px-8 md:px-16 py-3 md:py-4 text-lg md:text-xl font-bold rounded-2xl md:rounded-3xl shadow-2xl transition-all duration-300 transform hover:scale-105
            ${selectedType
              ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 hover:from-purple-600 hover:via-pink-600 hover:to-red-600 text-white hover:shadow-purple-500/25'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          <ArrowRight className="w-5 h-5 md:w-7 md:h-7 ml-2" />
          <span className="hidden sm:inline">{selectedType ? 'בואו נמשיך למסע! 🚀' : 'בחר סוג חשבון כדי להמשיך'}</span>
          <span className="sm:hidden">{selectedType ? 'המשך! 🚀' : 'בחר חשבון'}</span>
        </Button>
      </div>

      {/* Success Message */}
      {selectedType && (
        <div className="mt-4 md:mt-6 bg-gradient-to-r from-green-100 to-emerald-100 border border-green-200 rounded-xl md:rounded-2xl p-3 md:p-4 animate-pulse">
          <p className="text-green-800 font-bold text-base md:text-lg">מעולה! המשך להגדרת הפרטים שלך 🎉</p>
          <p className="text-green-700 text-xs md:text-sm mt-1">בשלב הבא נגדיר את הפרופיל שלך כמורה ונתחיל ליצור את הכיתה הראשונה!</p>
        </div>
      )}
    </div>
  );
}
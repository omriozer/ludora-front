import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import {
  Calendar,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Shield,
  Users
} from 'lucide-react';
import { clog } from '@/lib/utils';

export default function AgeVerification({ onComplete, onboardingData, currentUser }) {
  const [birthDate, setBirthDate] = useState(onboardingData?.birthDate || '');
  const [error, setError] = useState('');
  const [showParentalConsentInfo, setShowParentalConsentInfo] = useState(false);

  const calculateAge = (birthDateString) => {
    if (!birthDateString) return null;

    const today = new Date();
    const birth = new Date(birthDateString);

    if (birth > today) return null;

    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age;
  };

  const validateBirthDate = (dateString) => {
    if (!dateString) {
      return 'יש להזין תאריך לידה';
    }

    const date = new Date(dateString);
    const today = new Date();

    if (isNaN(date.getTime())) {
      return 'תאריך לידה לא תקין';
    }

    if (date > today) {
      return 'תאריך לידה לא יכול להיות בעתיד';
    }

    // Check if older than 120 years (reasonable limit)
    const maxAge = new Date();
    maxAge.setFullYear(maxAge.getFullYear() - 120);

    if (date < maxAge) {
      return 'תאריך לידה לא סביר';
    }

    return null;
  };

  const handleDateChange = (e) => {
    const newDate = e.target.value;
    setBirthDate(newDate);
    setError('');

    // Check if user will be under 18
    const age = calculateAge(newDate);
    if (age !== null && age < 18) {
      setShowParentalConsentInfo(true);
    } else {
      setShowParentalConsentInfo(false);
    }
  };

  const handleContinue = () => {
    const validationError = validateBirthDate(birthDate);
    if (validationError) {
      setError(validationError);
      return;
    }

    const age = calculateAge(birthDate);
    const isUnder18 = age < 18;

    clog('[AgeVerification] User age:', age, 'Under 18:', isUnder18);

    // Complete this step
    onComplete({
      birthDate,
      age,
      isUnder18,
      requiresParentalConsent: isUnder18
    });
  };

  const openParentConsentPage = () => {
    window.open('/parent-consent', '_blank');
  };

  const age = calculateAge(birthDate);
  const isValidDate = birthDate && !validateBirthDate(birthDate);
  const isUnder18 = age !== null && age < 18;

  return (
    <div className="space-y-6 md:space-y-8">

      {/* Responsive Introduction */}
      <div className="text-center px-4">
        <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 rounded-2xl md:rounded-3xl shadow-2xl mb-4 md:mb-6 relative">
          <Calendar className="w-8 h-8 md:w-10 md:h-10 text-white" />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 rounded-2xl md:rounded-3xl blur opacity-30 animate-pulse"></div>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 md:mb-4">בואו נכיר! 🎂</h2>
        <p className="text-lg md:text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto">
          אנחנו רוצים לוודא שהחוויה שלכם מותאמת בדיוק לכם
        </p>
      </div>

      {/* Modern Birth Date Input */}
      <div className="relative">
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl md:rounded-3xl p-4 md:p-8 border border-blue-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 md:w-32 md:h-32 bg-blue-200/20 rounded-full -translate-y-10 translate-x-10 md:-translate-y-16 md:translate-x-16"></div>
          <div className="absolute bottom-0 left-0 w-16 h-16 md:w-24 md:h-24 bg-purple-200/20 rounded-full translate-y-8 -translate-x-8 md:translate-y-12 md:-translate-x-12"></div>

          <div className="relative z-10 space-y-4 md:space-y-6">
            <div className="text-center">
              <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">מתי נולדת? 📅</h3>
              <p className="text-sm md:text-base text-gray-600">זה עוזר לנו להכין עבורך את החוויה הטובה ביותר</p>
            </div>

            <div className="max-w-sm md:max-w-md mx-auto">
              <Label htmlFor="birthDate" className="block text-base md:text-lg font-bold text-gray-900 mb-3 text-center">
                תאריך הלידה שלך
              </Label>
              <div className="relative">
                <Input
                  id="birthDate"
                  type="date"
                  value={birthDate}
                  onChange={handleDateChange}
                  className="h-12 md:h-16 text-lg md:text-xl border-2 border-blue-200 focus:border-purple-400 rounded-xl md:rounded-2xl text-center font-medium shadow-lg transition-all duration-300 focus:shadow-xl"
                  max={new Date().toISOString().split('T')[0]}
                />
                <div className="absolute inset-0 rounded-xl md:rounded-2xl bg-gradient-to-r from-blue-400/10 to-purple-400/10 pointer-events-none"></div>
              </div>

              {error && (
                <div className="mt-4 p-3 md:p-4 bg-red-50 border border-red-200 rounded-xl md:rounded-2xl">
                  <div className="flex items-center gap-2 md:gap-3">
                    <AlertTriangle className="h-5 w-5 md:h-6 md:w-6 text-red-500 flex-shrink-0" />
                    <p className="text-red-700 font-medium text-sm md:text-base">{error}</p>
                  </div>
                </div>
              )}

              {/* Animated Age Display */}
              {isValidDate && age !== null && (
                <div className="mt-4 md:mt-6 transform transition-all duration-500 animate-in slide-in-from-bottom-4">
                  <div className="bg-gradient-to-r from-green-400 to-emerald-500 rounded-xl md:rounded-2xl p-4 md:p-6 text-white text-center shadow-xl">
                    <div className="flex items-center justify-center gap-2 md:gap-3 mb-2">
                      <CheckCircle className="w-6 h-6 md:w-8 md:h-8" />
                      <span className="text-xl md:text-2xl font-bold">מעולה!</span>
                    </div>
                    <p className="text-lg md:text-xl">
                      גילך: <span className="text-2xl md:text-3xl font-black">{age}</span> שנים
                    </p>
                    <div className="mt-3 md:mt-4 text-green-100 text-sm md:text-base">
                      {age >= 18 ? "אתה יכול להמשיך בהרשמה! 🎉" : "נצטרך אישור הורים 👨‍👩‍👧‍👦"}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Parental Consent Info for Under 18 */}
      {showParentalConsentInfo && isValidDate && (
        <div className="transform transition-all duration-500 animate-in slide-in-from-bottom-4">
          <div className="bg-gradient-to-br from-orange-50 to-yellow-50 border-2 border-orange-200 rounded-2xl md:rounded-3xl p-4 md:p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 md:w-40 md:h-40 bg-orange-200/20 rounded-full -translate-y-12 translate-x-12 md:-translate-y-20 md:translate-x-20"></div>

            <div className="relative z-10">
              <div className="flex flex-col sm:flex-row items-center gap-3 md:gap-4 mb-4 md:mb-6">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-orange-400 to-yellow-500 rounded-xl md:rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Shield className="w-6 h-6 md:w-8 md:h-8 text-white" />
                </div>
                <div className="text-center sm:text-right">
                  <h3 className="text-lg md:text-2xl font-bold text-orange-900">נדרש אישור הורים 👨‍👩‍👧‍👦</h3>
                  <p className="text-sm md:text-base text-orange-700">זה בשביל הבטיחות שלך!</p>
                </div>
              </div>

              <div className="bg-white/70 rounded-xl md:rounded-2xl p-4 md:p-6 mb-4 md:mb-6">
                <p className="text-gray-700 text-sm md:text-lg leading-relaxed">
                  מכיוון שגילך מתחת ל-18, אנחנו צריכים אישור מההורים שלך לפני שתוכל להשתמש במערכת.
                  <strong className="text-orange-600"> אל תדאג - תוכל להמשיך בהרשמה!</strong>
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                <Button
                  onClick={openParentConsentPage}
                  className="bg-gradient-to-r from-orange-400 to-yellow-500 hover:from-orange-500 hover:to-yellow-600 text-white font-bold py-2 md:py-3 px-4 md:px-6 rounded-xl md:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 text-sm md:text-base"
                >
                  <ExternalLink className="w-4 h-4 md:w-5 md:h-5 ml-2" />
                  דף אישור הורים
                </Button>
                <Button
                  onClick={() => window.open('/terms', '_blank')}
                  variant="outline"
                  className="border-2 border-orange-300 text-orange-700 hover:bg-orange-50 font-bold py-2 md:py-3 px-4 md:px-6 rounded-xl md:rounded-2xl text-sm md:text-base"
                >
                  <ExternalLink className="w-4 h-4 md:w-5 md:h-5 ml-2" />
                  תנאי השימוש
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modern Privacy Information */}
      <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-2xl md:rounded-3xl p-4 md:p-8 border border-gray-200">
        <div className="flex flex-col sm:flex-row items-start gap-4 md:gap-6">
          <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-slate-400 to-gray-500 rounded-xl md:rounded-2xl flex items-center justify-center flex-shrink-0 mx-auto sm:mx-0">
            <Users className="w-6 h-6 md:w-8 md:h-8 text-white" />
          </div>
          <div className="space-y-3 md:space-y-4 flex-1">
            <h3 className="text-lg md:text-2xl font-bold text-gray-900 text-center sm:text-right">למה אנחנו שואלים את הגיל? 🤔</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              <div className="bg-white/70 rounded-xl md:rounded-2xl p-3 md:p-4">
                <div className="text-blue-600 font-bold mb-1 md:mb-2 text-sm md:text-base">🛡️ בטיחות ופרטיות</div>
                <p className="text-gray-600 text-xs md:text-sm">עמידה בתקנות הגנת הפרטיות (GDPR, COPPA)</p>
              </div>
              <div className="bg-white/70 rounded-xl md:rounded-2xl p-3 md:p-4">
                <div className="text-purple-600 font-bold mb-1 md:mb-2 text-sm md:text-base">🎯 התאמה אישית</div>
                <p className="text-gray-600 text-xs md:text-sm">התאמת התכנים והחוויה לפי הגיל שלך</p>
              </div>
              <div className="bg-white/70 rounded-xl md:rounded-2xl p-3 md:p-4">
                <div className="text-green-600 font-bold mb-1 md:mb-2 text-sm md:text-base">👶 הגנה על צעירים</div>
                <p className="text-gray-600 text-xs md:text-sm">הבטחת בטיחות המשתמשים הצעירים</p>
              </div>
              <div className="bg-white/70 rounded-xl md:rounded-2xl p-3 md:p-4">
                <div className="text-orange-600 font-bold mb-1 md:mb-2 text-sm md:text-base">🔐 אבטחת מידע</div>
                <p className="text-gray-600 text-xs md:text-sm">שמירה על הפרטיות שלך</p>
              </div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl md:rounded-2xl p-3 md:p-4 mt-3 md:mt-4">
              <p className="text-yellow-800 text-xs md:text-sm font-medium">
                🔒 המידע שלך שמור אצלנו בצורה מוצפנת ובטוחה לחלוטין
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Continue Button */}
      <div className="text-center pt-4">
        <Button
          onClick={handleContinue}
          disabled={!isValidDate}
          size="lg"
          className={`
            px-8 md:px-12 py-3 md:py-4 text-lg md:text-xl font-bold rounded-xl md:rounded-2xl shadow-2xl transition-all duration-300 transform hover:scale-105
            ${isValidDate
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white hover:shadow-purple-500/25'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          <CheckCircle className="w-5 h-5 md:w-7 md:h-7 ml-2" />
          {isValidDate ? 'בואו נמשיך! 🚀' : 'הזינו תאריך לידה'}
        </Button>

        {isValidDate && (
          <p className="text-gray-500 text-xs md:text-sm mt-3 md:mt-4 animate-pulse">
            מעולה! בואו נעבור לשלב הבא
          </p>
        )}
      </div>

      {/* Additional Info for Under 18 */}
      {isUnder18 && isValidDate && (
        <div className="text-center bg-blue-50 rounded-xl md:rounded-2xl p-4 md:p-6 border border-blue-200">
          <div className="space-y-1 md:space-y-2">
            <div className="text-blue-600 font-bold text-base md:text-lg">💡 טיפ חשוב</div>
            <p className="text-blue-700 text-sm md:text-base">תוכל להמשיך בהרשמה עכשיו</p>
            <p className="text-blue-600 text-xs md:text-sm">אחרי ההרשמה נעזור לך לקבל אישור הורים</p>
          </div>
        </div>
      )}
    </div>
  );
}
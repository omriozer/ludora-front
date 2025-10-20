import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Calendar,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { clog } from '@/lib/utils';

export default function AgeVerification({ onComplete, onboardingData, currentUser }) {
  const [birthDate, setBirthDate] = useState('');
  const [age, setAge] = useState(null);
  const [error, setError] = useState('');

  // Load saved birth date when component mounts
  useEffect(() => {
    const savedDate = onboardingData?.birthDate || currentUser?.birth_date;
    if (savedDate) {
      try {
        const date = new Date(savedDate);
        const formattedDate = date.toISOString().split('T')[0];
        setBirthDate(formattedDate);
        const calculatedAge = calculateAge(formattedDate);
        setAge(calculatedAge);
        clog('[AgeVerification] Loaded saved date:', formattedDate, 'Age:', calculatedAge);
      } catch (error) {
        clog('[AgeVerification] Error formatting saved date:', error);
      }
    }
  }, [onboardingData, currentUser]);

  const calculateAge = (dateString) => {
    if (!dateString) return null;

    const today = new Date();
    const birth = new Date(dateString);

    if (birth > today) return null;

    let calculatedAge = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      calculatedAge--;
    }

    return calculatedAge;
  };

  const handleDateChange = (e) => {
    const newDate = e.target.value;
    setBirthDate(newDate);
    setError('');

    if (newDate) {
      const calculatedAge = calculateAge(newDate);
      setAge(calculatedAge);
      clog('[AgeVerification] Date changed:', newDate, 'Age:', calculatedAge);
    } else {
      setAge(null);
    }
  };

  const validateAndContinue = () => {
    clog('[AgeVerification] 🔘 Continue button clicked');
    clog('[AgeVerification] 📅 Current birthDate:', birthDate);
    clog('[AgeVerification] 👶 Current age:', age);

    // Clear any previous errors
    setError('');

    // Check if date is provided
    if (!birthDate || birthDate.trim() === '') {
      clog('[AgeVerification] ❌ Validation failed: No birth date');
      setError('יש להזין תאריך לידה');
      return;
    }

    // Check if date is valid
    const date = new Date(birthDate);
    if (isNaN(date.getTime())) {
      clog('[AgeVerification] ❌ Validation failed: Invalid date');
      setError('תאריך לידה לא תקין');
      return;
    }

    // Check if date is not in the future
    if (date > new Date()) {
      clog('[AgeVerification] ❌ Validation failed: Future date');
      setError('תאריך לידה לא יכול להיות בעתיד');
      return;
    }

    // Calculate age
    const calculatedAge = calculateAge(birthDate);
    if (calculatedAge === null || calculatedAge < 0) {
      clog('[AgeVerification] ❌ Validation failed: Invalid calculated age');
      setError('תאריך לידה לא תקין');
      return;
    }

    // Check if user is under 18
    if (calculatedAge < 18) {
      clog('[AgeVerification] ❌ Validation failed: Under 18 years old');
      setError('משתמשים מתחת לגיל 18 צריכים להירשם באמצעות הזמנה ממורה. אנא פנה למורה שלך לקבלת הזמנה למערכת.');
      return;
    }

    // All validations passed
    clog('[AgeVerification] ✅ Validation passed, age:', calculatedAge);

    const stepData = {
      birthDate,
      age: calculatedAge,
      isUnder18: false,
      requiresParentalConsent: false
    };

    clog('[AgeVerification] 📤 Calling onComplete with data:', stepData);

    onComplete(stepData);
  };

  // Determine if user can continue (18+ with valid date)
  const isDateValid = birthDate && birthDate.trim() !== '';
  const isAgeValid = age !== null && age >= 18;
  const canContinue = isDateValid && isAgeValid;

  clog('[AgeVerification] Current state:', {
    birthDate,
    age,
    isDateValid,
    isAgeValid,
    canContinue
  });

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Introduction */}
      <div className="text-center px-4">
        <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 rounded-2xl md:rounded-3xl shadow-2xl mb-4 md:mb-6 relative">
          <Calendar className="w-8 h-8 md:w-10 md:h-10 text-white" />
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 md:mb-4">בואו נכיר! 🎂</h2>
        <p className="text-lg md:text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto">
          אנחנו רוצים לוודא שהחוויה שלכם מותאמת בדיוק לכם
        </p>
      </div>

      {/* Birth Date Input */}
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl md:rounded-3xl p-4 md:p-8 border border-blue-100">
        <div className="max-w-sm md:max-w-md mx-auto space-y-4">
          <div className="text-center">
            <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">מתי נולדת? 📅</h3>
            <p className="text-sm md:text-base text-gray-600">זה עוזר לנו להכין עבורך את החוויה הטובה ביותר</p>
          </div>

          <div>
            <Label htmlFor="birthDate" className="block text-base md:text-lg font-bold text-gray-900 mb-3 text-center">
              תאריך הלידה שלך
            </Label>
            <Input
              id="birthDate"
              type="date"
              value={birthDate}
              onChange={handleDateChange}
              className="h-12 md:h-16 text-lg md:text-xl border-2 border-blue-200 focus:border-purple-400 rounded-xl md:rounded-2xl text-center font-medium shadow-lg"
              max={new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* Error Display */}
          {error && (
            <Alert className="bg-red-50 border-red-200">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <AlertDescription className="text-red-700 font-medium">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Age Display */}
          {age !== null && isDateValid && (
            <div className="bg-gradient-to-r from-green-400 to-emerald-500 rounded-xl p-4 text-white text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <CheckCircle className="w-6 h-6" />
                <span className="text-xl font-bold">מעולה!</span>
              </div>
              <p className="text-lg">
                גילך: <span className="text-2xl font-black">{age}</span> שנים
              </p>
              <div className="mt-2 text-green-100 text-sm">
                {age >= 18 ? "אתה יכול להמשיך בהרשמה! 🎉" : "נצטרך אישור הורים 👨‍👩‍👧‍👦"}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Continue Button */}
      <div className="text-center pt-4">
        <button
          onClick={validateAndContinue}
          disabled={!canContinue}
          className={`px-8 md:px-12 py-3 md:py-4 text-lg md:text-xl font-bold rounded-xl md:rounded-2xl shadow-2xl transition-all duration-300 transform ${
            canContinue
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white hover:scale-105 cursor-pointer'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60'
          }`}
        >
          <CheckCircle className="w-5 h-5 md:w-7 md:h-7 ml-2 inline" />
          {!isDateValid ? 'הזינו תאריך לידה' :
           !isAgeValid ? 'נדרשת הזמנה ממורה' :
           'בואו נמשיך! 🚀'}
        </button>

        {age !== null && age < 18 && (
          <div className="mt-4 text-center bg-orange-50 rounded-xl p-4 border border-orange-200">
            <div className="text-orange-600 font-bold mb-2">🏫 איך להירשם למערכת</div>
            <p className="text-orange-700 text-sm">בגלל גילך, אתה צריך הזמנה ממורה כדי להצטרף למערכת</p>
            <div className="bg-orange-100 rounded-lg p-3 mt-2 text-orange-800 text-xs">
              <div className="font-bold mb-1">מה לעשות:</div>
              <div>1. פנה למורה שלך 👨‍🏫</div>
              <div>2. בקש ממנו לשלוח לך הזמנה למערכת 📧</div>
              <div>3. קבל את ההזמנה במייל והירשם דרכה ✅</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
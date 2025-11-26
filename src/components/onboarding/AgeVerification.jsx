import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Calendar,
  AlertTriangle,
  CheckCircle,
  ArrowLeft
} from 'lucide-react';
import { ludlog, luderror } from '@/lib/ludlog';

export default function AgeVerification({ onComplete, onBack, onboardingData, currentUser }) {
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
        ludlog.ui('[AgeVerification] Loaded saved date:', { data: { formattedDate, age: calculatedAge } });
      } catch (error) {
        ludlog.ui('[AgeVerification] Error formatting saved date:', { data: error });
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
      ludlog.ui('[AgeVerification] Date changed:', { data: { newDate, age: calculatedAge } });
    } else {
      setAge(null);
    }
  };

  const validateAndContinue = () => {
    ludlog.ui('[AgeVerification] Continue button clicked');
    ludlog.ui('[AgeVerification] Current birthDate:', { data: birthDate });
    ludlog.ui('[AgeVerification] Current age:', { data: age });

    // Clear any previous errors
    setError('');

    // Check if date is provided
    if (!birthDate || birthDate.trim() === '') {
      ludlog.ui('[AgeVerification] Validation failed: No birth date');
      setError('יש להזין תאריך לידה');
      return;
    }

    // Check if date is valid
    const date = new Date(birthDate);
    if (isNaN(date.getTime())) {
      ludlog.ui('[AgeVerification] Validation failed: Invalid date');
      setError('תאריך לידה לא תקין');
      return;
    }

    // Check if date is not in the future
    if (date > new Date()) {
      ludlog.ui('[AgeVerification] Validation failed: Future date');
      setError('תאריך לידה לא יכול להיות בעתיד');
      return;
    }

    // Calculate age
    const calculatedAge = calculateAge(birthDate);
    if (calculatedAge === null || calculatedAge < 0) {
      ludlog.ui('[AgeVerification] Validation failed: Invalid calculated age');
      setError('תאריך לידה לא תקין');
      return;
    }

    // Check if user is under 18 - teachers must be 18+
    if (calculatedAge < 18) {
      ludlog.ui('[AgeVerification] Validation failed: Under 18 years old');
      setError('הרשמה כמורה מיועדת למשתמשים בגיל 18 ומעלה בלבד.');
      return;
    }

    // All validations passed
    ludlog.ui('[AgeVerification] Validation passed', { data: { age: calculatedAge } });

    const stepData = {
      birthDate,
      age: calculatedAge
    };

    ludlog.ui('[AgeVerification] Calling onComplete with data:', { data: stepData });

    onComplete(stepData);
  };

  // Determine if user can continue (18+ with valid date)
  const isDateValid = birthDate && birthDate.trim() !== '';
  const isAgeValid = age !== null && age >= 18;
  const canContinue = isDateValid && isAgeValid;


  return (
    <div className="space-y-6">
      {/* Introduction */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-4">
          <Calendar className="w-6 h-6 text-blue-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">אימות גיל</h2>
        <p className="text-gray-600 max-w-md mx-auto">
          לצורך הרשמה כמורה במערכת, נדרש אימות גיל מינימלי של 18 שנים
        </p>
      </div>

      {/* Birth Date Input Card */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
        <div className="max-w-sm mx-auto space-y-4">
          <div>
            <Label htmlFor="birthDate" className="block text-sm font-medium text-gray-700 mb-2">
              תאריך לידה
            </Label>
            <Input
              id="birthDate"
              type="date"
              value={birthDate}
              onChange={handleDateChange}
              className="h-11 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg text-center"
              max={new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* Error Display */}
          {error && (
            <Alert className="bg-red-50 border-red-200">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700 text-sm">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Age Display */}
          {age !== null && isDateValid && (
            <div className={`rounded-lg p-4 text-center ${age >= 18 ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
              <div className="flex items-center justify-center gap-2 mb-1">
                <CheckCircle className={`w-5 h-5 ${age >= 18 ? 'text-green-600' : 'text-amber-600'}`} />
                <span className={`font-medium ${age >= 18 ? 'text-green-800' : 'text-amber-800'}`}>
                  {age >= 18 ? 'אומת בהצלחה' : 'שימו לב'}
                </span>
              </div>
              <p className={`text-sm ${age >= 18 ? 'text-green-700' : 'text-amber-700'}`}>
                גיל: <span className="font-semibold">{age}</span> שנים
              </p>
              {age < 18 && (
                <p className="text-xs text-amber-600 mt-2">
                  הרשמה כמורה מיועדת לגיל 18+
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-center pt-4">
        {/* Back Button */}
        {onBack && (
          <Button
            onClick={onBack}
            variant="outline"
            className="w-full sm:w-auto px-6 py-2 text-gray-700 border-gray-300 hover:bg-gray-50"
          >
            <ArrowLeft className="w-4 h-4 ml-2" />
            חזור
          </Button>
        )}

        {/* Continue Button */}
        <Button
          onClick={validateAndContinue}
          disabled={!canContinue}
          className={`w-full sm:w-auto px-8 py-2 font-medium rounded-lg transition-colors ${
            canContinue
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }`}
        >
          <CheckCircle className="w-4 h-4 ml-2" />
          {!isDateValid ? 'הזינו תאריך לידה' :
           !isAgeValid ? 'נדרש גיל 18+' :
           'המשך'}
        </Button>
      </div>

      {/* Info Notice */}
      {age !== null && age < 18 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-amber-800 text-sm font-medium mb-1">דרישת גיל מינימלי</p>
          <p className="text-amber-700 text-sm">
            הרשמה כמורה במערכת לודורה מיועדת למשתמשים בגיל 18 ומעלה בלבד.
          </p>
        </div>
      )}
    </div>
  );
}

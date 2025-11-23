import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  GraduationCap,
  CheckCircle,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { clog } from '@/lib/utils';

export default function AccountTypeSelector({ onComplete, onBack, onboardingData }) {
  // Teacher account type configuration
  const teacherAccount = {
    id: 'teacher',
    title: 'חשבון מורה',
    description: 'חשבון מורה מאפשר יצירת כיתות, ניהול תכנים חינוכיים ומעקב אחר התקדמות התלמידים.',
    features: [
      'יצירת וניהול כיתות',
      'יצירת משחקים חינוכיים',
      'מעקב אחר התקדמות תלמידים',
      'גישה לדוחות ומשוב מפורט',
      'יצירת תכנים חינוכיים מותאמים'
    ]
  };

  // Auto-continue after a brief moment to show the confirmation
  useEffect(() => {
    clog('[AccountTypeSelector] Teacher onboarding - auto-selecting teacher account type');
  }, []);

  const handleContinue = () => {
    clog('[AccountTypeSelector] Continuing with teacher account type');

    onComplete({
      accountType: 'teacher'
    });
  };

  return (
    <div className="space-y-6">
      {/* Introduction */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-4">
          <GraduationCap className="w-6 h-6 text-blue-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">אישור סוג חשבון</h2>
        <p className="text-gray-600 max-w-md mx-auto">
          החשבון שלך יוגדר כחשבון מורה במערכת לודורה
        </p>
      </div>

      {/* Teacher Account Card */}
      <Card className="border border-blue-200 bg-blue-50/50">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            {/* Icon */}
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 mx-auto sm:mx-0">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>

            <div className="flex-1 text-center sm:text-right">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mb-3">
                <h3 className="text-lg font-semibold text-gray-900">{teacherAccount.title}</h3>
                <div className="flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                  <CheckCircle className="w-4 h-4" />
                  <span>נבחר</span>
                </div>
              </div>

              <p className="text-gray-600 text-sm mb-4">
                {teacherAccount.description}
              </p>

              {/* Features List */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="font-medium text-gray-800 text-sm mb-3">יכולות החשבון:</p>
                <ul className="space-y-2">
                  {teacherAccount.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-gray-700 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
          onClick={handleContinue}
          className="w-full sm:w-auto px-8 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
        >
          המשך
          <ArrowRight className="w-4 h-4 mr-2" />
        </Button>
      </div>

      {/* Info Notice */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-gray-700 text-sm">
          בשלב הבא תוכלו להשלים את הגדרת הפרופיל המקצועי שלכם.
        </p>
      </div>
    </div>
  );
}

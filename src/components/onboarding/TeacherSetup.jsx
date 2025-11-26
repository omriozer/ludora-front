import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  GraduationCap,
  User,
  BookOpen,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Phone
} from 'lucide-react';
import { ludlog, luderror } from '@/lib/ludlog';
import { apiRequest } from '@/services/apiClient';

// Static fallback arrays - defined outside component to prevent re-creation
const FALLBACK_SPECIALIZATIONS = [
  { name: 'מתמטיקה', emoji: '' },
  { name: 'עברית', emoji: '' },
  { name: 'אנגלית', emoji: '' },
  { name: 'מדעים', emoji: '' },
  { name: 'היסטוריה', emoji: '' },
  { name: 'גיאוגרפיה', emoji: '' },
  { name: 'ספורט', emoji: '' },
  { name: 'אמנות', emoji: '' },
  { name: 'מוזיקה', emoji: '' },
  { name: 'מחשבים', emoji: '' },
  { name: 'פיזיקה', emoji: '' },
  { name: 'כימיה', emoji: '' },
  { name: 'ביולוגיה', emoji: '' },
  { name: 'ספרות', emoji: '' },
  { name: 'אזרחות', emoji: '' },
  { name: 'פסיכולוגיה', emoji: '' },
  { name: 'חינוך מיוחד', emoji: '' },
  { name: 'גן ילדים', emoji: '' },
  { name: 'חינוך מוקדם', emoji: '' },
  { name: 'חינוך גופני', emoji: '' }
];

export default function TeacherSetup({ onComplete, onBack, onboardingData, currentUser, settings }) {
  const [formData, setFormData] = useState({
    educationLevel: onboardingData?.teacherInfo?.education_level || '',
    phone: onboardingData?.teacherInfo?.phone || currentUser?.phone || '',
    specializations: onboardingData?.teacherInfo?.specializations || [],
    ...onboardingData?.teacherInfo
  });

  const [error, setError] = useState('');
  const [settingsData, setSettingsData] = useState(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  // Education level options based on User model validation constraints
  const educationLevels = [
    { value: 'no_education_degree', label: 'ללא תואר אקדמי' },
    { value: 'bachelor_education', label: 'תואר ראשון (B.A/B.Sc/B.Ed)' },
    { value: 'master_education', label: 'תואר שני (M.A/M.Sc/M.Ed)' },
    { value: 'phd_education', label: 'תואר שלישי (Ph.D)' }
  ];

  // Fetch settings data on component mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await apiRequest('/entities/settings');
        const settingsRecord = data[0]; // Get the first settings record
        ludlog.ui('[TeacherSetup] Settings loaded:', { data: settingsRecord });
        setSettingsData(settingsRecord);
      } catch (error) {
        ludlog.api('[TeacherSetup] Error fetching settings:', { data: error });
      } finally {
        setIsLoadingSettings(false);
      }
    };

    fetchSettings();
  }, []);

  // Use settings-driven data or fallback arrays
  const availableSpecializations = useMemo(() => {
    if (settingsData?.available_specializations) {
      return settingsData.available_specializations
        .filter(spec => spec.enabled)
        .map(spec => ({ name: spec.name, emoji: spec.emoji }));
    }
    return FALLBACK_SPECIALIZATIONS;
  }, [settingsData]);

  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError('');
  }, []);

  const handleSpecializationToggle = useCallback((specializationName) => {
    setFormData(prev => {
      const newSpecializations = prev.specializations.includes(specializationName)
        ? prev.specializations.filter(s => s !== specializationName)
        : [...prev.specializations, specializationName];

      return {
        ...prev,
        specializations: newSpecializations
      };
    });
  }, []);

  const validateForm = () => {
    if (!formData.educationLevel) {
      return 'יש לבחור רמת השכלה';
    }

    return null;
  };

  const handleContinue = useCallback(() => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    // Prepare teacher info data
    const teacherInfo = {
      education_level: formData.educationLevel,
      phone: formData.phone,
      specializations: formData.specializations
    };

    ludlog.ui('[TeacherSetup] Teacher info completed:', { data: teacherInfo });

    onComplete({
      teacherInfo
    });
  }, [formData, onComplete]);

  return (
    <div className="space-y-6">
      {/* Introduction */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-4">
          <GraduationCap className="w-6 h-6 text-blue-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">פרטי פרופיל מקצועי</h2>
        <p className="text-gray-600 max-w-md mx-auto">
          השלימו את הפרטים המקצועיים שלכם כדי להתאים את המערכת לצרכים שלכם
        </p>
      </div>

      <form className="space-y-6">
        {/* Personal Information Card */}
        <Card className="border border-gray-200">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-gray-900">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <span className="text-base font-semibold">פרטים אישיים</span>
                <p className="text-gray-500 text-sm font-normal">מידע בסיסי על הפרופיל שלך</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Education Level */}
            <div className="space-y-2">
              <Label htmlFor="educationLevel" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                רמת השכלה
                <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.educationLevel}
                onValueChange={(value) => handleInputChange('educationLevel', value)}
              >
                <SelectTrigger className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg">
                  <SelectValue placeholder="בחר את רמת ההשכלה שלך" />
                </SelectTrigger>
                <SelectContent>
                  {educationLevels.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Phone className="w-4 h-4" />
                מספר טלפון (אופציונלי)
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="050-1234567"
                className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
              />
            </div>
          </CardContent>
        </Card>

        {/* Professional Information Card */}
        <Card className="border border-gray-200">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-gray-900">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <span className="text-base font-semibold">מידע מקצועי</span>
                <p className="text-gray-500 text-sm font-normal">התמחויות ותחומי הוראה</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Specializations */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700">
                התמחויות ונושאי הוראה (אופציונלי)
              </Label>
              <p className="text-gray-500 text-sm">בחרו את התחומים שבהם אתם מתמחים:</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {availableSpecializations.map((specialization) => (
                  <div
                    key={specialization.name}
                    className={`
                      flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all duration-150
                      ${formData.specializations.includes(specialization.name)
                        ? 'bg-blue-50 border-blue-300 text-blue-800'
                        : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700'
                      }
                    `}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSpecializationToggle(specialization.name);
                    }}
                  >
                    <input
                      type="checkbox"
                      id={`spec-${specialization.name}`}
                      checked={formData.specializations.includes(specialization.name)}
                      onChange={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSpecializationToggle(specialization.name);
                      }}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <span className="text-sm font-medium flex-1">
                      {specialization.name}
                    </span>
                  </div>
                ))}
              </div>
              {formData.specializations.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-green-800 text-sm font-medium">
                    נבחרו {formData.specializations.length} התמחויות
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <div>
                <p className="text-red-800 text-sm font-medium">שגיאה</p>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

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
            type="button"
            onClick={handleContinue}
            className="w-full sm:w-auto px-8 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
          >
            <CheckCircle className="w-4 h-4 ml-2" />
            סיום הרשמה
          </Button>
        </div>

        {/* Info Notice */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <p className="font-medium text-gray-800 mb-1">עריכת פרטים</p>
              <p className="text-gray-600">ניתן לערוך את הפרטים בכל עת דרך הגדרות החשבון</p>
            </div>
            <div>
              <p className="font-medium text-gray-800 mb-1">יצירת כיתות</p>
              <p className="text-gray-600">לאחר השלמת ההרשמה תוכלו ליצור כיתות וניהול תלמידים</p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

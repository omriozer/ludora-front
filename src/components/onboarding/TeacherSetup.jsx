import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import {
  GraduationCap,
  User,
  BookOpen,
  Users,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Plus,
  Sparkles,
  Star,
  Award,
  Heart,
  Zap,
  Phone,
  MessageSquare,
  School,
  Trophy
} from 'lucide-react';
import { clog } from '@/lib/utils';
import { getApiBase } from '@/utils/api.js';
import { apiRequest } from '@/services/apiClient';

// Helper function to get appropriate emoji for each subject
function getSubjectEmoji(key) {
  const emojiMap = {
    civics: '🏛️',
    art: '🎨',
    english: '🇺🇸',
    biology: '🧬',
    chemistry: '⚗️',
    physics: '⚛️',
    mathematics: '🔢',
    history: '📚',
    geography: '🌍',
    literature: '📖',
    hebrew: '🇮🇱',
    arabic: '🇸🇦',
    french: '🇫🇷',
    physical_education: '⚽',
    music: '🎵',
    technology: '💻',
    life_skills: '🛠️',
    social_studies: '👥',
    economics: '💰',
    philosophy: '🤔',
    bible_studies: '📜'
  };
  return emojiMap[key] || '📚';
}

// Static fallback arrays - defined outside component to prevent re-creation
const FALLBACK_GRADE_LEVELS = [
  { value: 'kindergarten', label: '🧸 גן חובה' },
  { value: 'grade_1', label: '1️⃣ כיתה א' },
  { value: 'grade_2', label: '2️⃣ כיתה ב' },
  { value: 'grade_3', label: '3️⃣ כיתה ג' },
  { value: 'grade_4', label: '4️⃣ כיתה ד' },
  { value: 'grade_5', label: '5️⃣ כיתה ה' },
  { value: 'grade_6', label: '6️⃣ כיתה ו' },
  { value: 'grade_7', label: '7️⃣ כיתה ז' },
  { value: 'grade_8', label: '8️⃣ כיתה ח' },
  { value: 'grade_9', label: '9️⃣ כיתה ט' },
  { value: 'grade_10', label: '🔟 כיתה י' },
  { value: 'grade_11', label: '🎯 כיתה יא' },
  { value: 'grade_12', label: '🎓 כיתה יב' }
];

const FALLBACK_SPECIALIZATIONS = [
  { name: 'מתמטיקה', emoji: '🔢' },
  { name: 'עברית', emoji: '📚' },
  { name: 'אנגלית', emoji: '🇺🇸' },
  { name: 'מדעים', emoji: '🔬' },
  { name: 'היסטוריה', emoji: '🏛️' },
  { name: 'גיאוגרפיה', emoji: '🌍' },
  { name: 'ספורט', emoji: '⚽' },
  { name: 'אמנות', emoji: '🎨' },
  { name: 'מוזיקה', emoji: '🎵' },
  { name: 'מחשבים', emoji: '💻' },
  { name: 'פיזיקה', emoji: '⚛️' },
  { name: 'כימיה', emoji: '🧪' },
  { name: 'ביולוגיה', emoji: '🧬' },
  { name: 'ספרות', emoji: '📖' },
  { name: 'אזרחות', emoji: '🏛️' },
  { name: 'פסיכולוגיה', emoji: '🧠' },
  { name: 'חינוך מיוחד', emoji: '💙' },
  { name: 'גן ילדים', emoji: '🧸' },
  { name: 'חינוך מוקדם', emoji: '👶' },
  { name: 'חינוך גופני', emoji: '🏃' }
];

export default function TeacherSetup({ onComplete, onBack, onboardingData, currentUser, settings }) {
  const [formData, setFormData] = useState({
    educationLevel: onboardingData?.teacherInfo?.education_level || '',
    phone: onboardingData?.teacherInfo?.phone || currentUser?.phone || '',
    specializations: onboardingData?.teacherInfo?.specializations || [],
    createFirstClassroom: onboardingData?.teacherInfo?.createFirstClassroom || false,
    firstClassroomName: onboardingData?.teacherInfo?.firstClassroomName || '',
    firstClassroomGrade: onboardingData?.teacherInfo?.firstClassroomGrade || '',
    ...onboardingData?.teacherInfo
  });

  const [error, setError] = useState('');
  const [settingsData, setSettingsData] = useState(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  // Education level options based on User model validation constraints
  const educationLevels = [
    { value: 'no_education_degree', label: '📜 ללא תואר אקדמי', icon: '📜' },
    { value: 'bachelor_education', label: '🎯 תואר ראשון (B.A/B.Sc/B.Ed)', icon: '🎯' },
    { value: 'master_education', label: '⭐ תואר שני (M.A/M.Sc/M.Ed)', icon: '⭐' },
    { value: 'phd_education', label: '👑 תואר שלישי (Ph.D)', icon: '👑' }
  ];

  // Fetch settings data on component mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await apiRequest('/entities/settings');
        const settingsRecord = data[0]; // Get the first settings record
        clog('[TeacherSetup] Settings loaded:', settingsRecord);
        setSettingsData(settingsRecord);
      } catch (error) {
        clog('[TeacherSetup] Error fetching settings:', error);
      } finally {
        setIsLoadingSettings(false);
      }
    };

    fetchSettings();
  }, []);

  // Use settings-driven data or fallback arrays
  const gradeLevels = useMemo(() => {
    if (settingsData?.available_grade_levels) {
      return settingsData.available_grade_levels.filter(grade => grade.enabled);
    }
    return FALLBACK_GRADE_LEVELS;
  }, [settingsData]);

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

    if (formData.createFirstClassroom) {
      if (!formData.firstClassroomName?.trim()) {
        return 'יש למלא שם לכיתה הראשונה';
      }
      if (!formData.firstClassroomGrade) {
        return 'יש לבחור רמת כיתה';
      }
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
      specializations: formData.specializations,
      createFirstClassroom: formData.createFirstClassroom,
      firstClassroomName: formData.firstClassroomName,
      firstClassroomGrade: formData.firstClassroomGrade
    };

    clog('[TeacherSetup] Teacher info completed:', teacherInfo);

    onComplete({
      teacherInfo
    });
  }, [formData, onComplete]);

  return (
    <div className="space-y-6 md:space-y-8">

      {/* Modern Introduction */}
      <div className="text-center px-4">
        <div className="inline-flex items-center justify-center w-20 h-20 md:w-28 md:h-28 bg-gradient-to-br from-emerald-500 via-blue-500 to-purple-600 rounded-2xl md:rounded-3xl shadow-2xl mb-4 md:mb-6 relative">
          <GraduationCap className="w-10 h-10 md:w-14 md:h-14 text-white" />
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 via-blue-400 to-purple-500 rounded-2xl md:rounded-3xl blur opacity-30 animate-pulse"></div>
          <div className="absolute -top-2 -right-2 md:-top-3 md:-right-3 w-8 h-8 md:w-12 md:h-12 bg-yellow-400 rounded-full flex items-center justify-center animate-bounce shadow-lg">
            <Trophy className="w-4 h-4 md:w-6 md:h-6 text-yellow-800" />
          </div>
          <div className="absolute -bottom-1 -left-1 md:-bottom-2 md:-left-2 text-2xl md:text-4xl animate-pulse">
            🌟
          </div>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 md:mb-4">בואו נכיר אותך יותר! 👨‍🏫</h2>
        <p className="text-gray-600 text-lg md:text-xl leading-relaxed max-w-2xl mx-auto">
          עוד כמה פרטים כדי להתאים את המערכת בדיוק לצרכים שלך כמורה מקצועי ✨
        </p>

        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mt-4 md:mt-6">
          <div className="flex items-center gap-1 bg-blue-100 px-3 md:px-4 py-2 rounded-full">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span className="text-blue-800 font-medium text-xs md:text-sm">אנחנו כמעט שם! 🚀</span>
          </div>
        </div>
      </div>

      <form className="space-y-6">

        {/* Enhanced Personal Information */}
        <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 relative overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="absolute top-0 right-0 w-20 h-20 md:w-32 md:h-32 bg-blue-200/20 rounded-full -translate-y-10 translate-x-10 md:-translate-y-16 md:translate-x-16"></div>
          <div className="absolute bottom-0 left-0 w-16 h-16 md:w-24 md:h-24 bg-cyan-200/20 rounded-full translate-y-8 -translate-x-8 md:translate-y-12 md:-translate-x-12"></div>

          <CardHeader className="relative z-10 p-4 md:p-6">
            <CardTitle className="flex flex-col sm:flex-row items-center gap-3 text-blue-900 text-center sm:text-right">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg">
                <User className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div>
                <span className="text-xl md:text-2xl font-bold">פרטים אישיים 📋</span>
                <p className="text-blue-700 text-xs md:text-sm font-normal">בואו נכיר אותך טוב יותר</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 md:space-y-6 relative z-10 p-4 md:p-6">

            {/* Education Level */}
            <div className="space-y-2 md:space-y-3">
              <Label htmlFor="educationLevel" className="text-base md:text-lg font-bold text-blue-900 flex items-center gap-2">
                <Award className="w-4 h-4 md:w-5 md:h-5" />
                רמת השכלה * 🎓
              </Label>
              <Select
                value={formData.educationLevel}
                onValueChange={(value) => handleInputChange('educationLevel', value)}
              >
                <SelectTrigger className="h-12 md:h-14 text-base md:text-lg border-2 border-blue-200 focus:border-blue-500 rounded-xl md:rounded-2xl bg-white/80 shadow-md hover:shadow-lg transition-all duration-300">
                  <SelectValue placeholder="בחר את רמת ההשכלה שלך 📚" />
                </SelectTrigger>
                <SelectContent>
                  {educationLevels.map((level) => (
                    <SelectItem key={level.value} value={level.value} className="text-base md:text-lg">
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Phone */}
            <div className="space-y-2 md:space-y-3">
              <Label htmlFor="phone" className="text-base md:text-lg font-bold text-blue-900 flex items-center gap-2">
                <Phone className="w-4 h-4 md:w-5 md:h-5" />
                מספר טלפון (אופציונלי) 📱
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="050-1234567"
                className="h-12 md:h-14 text-base md:text-lg border-2 border-blue-200 focus:border-blue-500 rounded-xl md:rounded-2xl bg-white/80 shadow-md hover:shadow-lg transition-all duration-300"
              />
            </div>


          </CardContent>
        </Card>

        {/* Enhanced Professional Information */}
        <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 relative overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="absolute top-0 right-0 w-20 h-20 md:w-32 md:h-32 bg-green-200/20 rounded-full -translate-y-10 translate-x-10 md:-translate-y-16 md:translate-x-16"></div>
          <div className="absolute bottom-0 left-0 w-16 h-16 md:w-24 md:h-24 bg-emerald-200/20 rounded-full translate-y-8 -translate-x-8 md:translate-y-12 md:-translate-x-12"></div>

          <CardHeader className="relative z-10 p-4 md:p-6">
            <CardTitle className="flex flex-col sm:flex-row items-center gap-3 text-green-900 text-center sm:text-right">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg">
                <BookOpen className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div>
                <span className="text-xl md:text-2xl font-bold">מידע מקצועי 📚</span>
                <p className="text-green-700 text-xs md:text-sm font-normal">כישורים והתמחויות</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 md:space-y-6 relative z-10 p-4 md:p-6">

            {/* Enhanced Specializations */}
            <div className="space-y-3 md:space-y-4">
              <Label className="text-base md:text-lg font-bold text-green-900 flex items-center gap-2">
                <Star className="w-4 h-4 md:w-5 md:h-5" />
                התמחויות ונושאי הוראה (אופציונלי) ⭐
              </Label>
              <p className="text-green-700 text-xs md:text-sm">בחר את התחומים שבהם אתה מתמחה:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3">
                {availableSpecializations.map((specialization) => (
                  <div
                    key={specialization.name}
                    className={`
                      flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-xl md:rounded-2xl border-2 cursor-pointer transition-all duration-300 hover:scale-105
                      ${formData.specializations.includes(specialization.name)
                        ? 'bg-green-100 border-green-400 shadow-lg shadow-green-200/50'
                        : 'bg-white/80 border-green-200 hover:border-green-300 hover:bg-green-50'
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
                      className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 focus:ring-2"
                    />
                    <div className="flex items-center gap-1 md:gap-2 flex-1 pointer-events-none">
                      <span className="text-lg md:text-xl">{specialization.emoji}</span>
                      <span className="text-xs md:text-sm font-medium flex-1">
                        {specialization.name}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {formData.specializations.length > 0 && (
                <div className="bg-green-100 border border-green-300 rounded-xl md:rounded-2xl p-3 md:p-4 animate-pulse">
                  <p className="text-green-800 font-bold text-center text-sm md:text-base">
                    מעולה! נבחרו {formData.specializations.length} התמחויות 🎉
                  </p>
                </div>
              )}
            </div>


          </CardContent>
        </Card>

        {/* Enhanced First Classroom Setup */}
        <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 relative overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="absolute top-0 right-0 w-20 h-20 md:w-32 md:h-32 bg-purple-200/20 rounded-full -translate-y-10 translate-x-10 md:-translate-y-16 md:translate-x-16"></div>
          <div className="absolute bottom-0 left-0 w-16 h-16 md:w-24 md:h-24 bg-pink-200/20 rounded-full translate-y-8 -translate-x-8 md:translate-y-12 md:-translate-x-12"></div>

          <CardHeader className="relative z-10 p-4 md:p-6">
            <CardTitle className="flex flex-col sm:flex-row items-center gap-3 text-purple-900 text-center sm:text-right">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg">
                <Users className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div>
                <span className="text-xl md:text-2xl font-bold">יצירת כיתה ראשונה 🏫</span>
                <p className="text-purple-700 text-xs md:text-sm font-normal">בואו נתחיל את המסע!</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 md:space-y-6 relative z-10 p-4 md:p-6">

            <div className={`
              flex items-center gap-3 md:gap-4 p-4 md:p-6 rounded-2xl md:rounded-3xl border-2 cursor-pointer transition-all duration-500 hover:scale-105
              ${formData.createFirstClassroom
                ? 'bg-purple-100 border-purple-400 shadow-lg shadow-purple-200/50'
                : 'bg-white/80 border-purple-200 hover:border-purple-300 hover:bg-purple-50'
              }
            `}
            onClick={() => handleInputChange('createFirstClassroom', !formData.createFirstClassroom)}
            >
              <Checkbox
                id="createFirstClassroom"
                checked={formData.createFirstClassroom}
                onCheckedChange={(checked) => handleInputChange('createFirstClassroom', checked)}
                className="pointer-events-none scale-125"
              />
              <div className="flex-1">
                <Label htmlFor="createFirstClassroom" className="text-base md:text-lg font-bold text-purple-900 cursor-pointer flex items-center gap-2">
                  <School className="w-4 h-4 md:w-5 md:h-5" />
                  <span className="hidden sm:inline">אני רוצה ליצור כיתה ראשונה עכשיו! 🎉</span>
                  <span className="sm:hidden">ליצור כיתה עכשיו! 🎉</span>
                </Label>
                <p className="text-purple-700 text-xs md:text-sm mt-1">זה יעזור לך להתחיל מיד עם הזמנת תלמידים</p>
              </div>
              <div className="text-2xl md:text-3xl animate-bounce">
                {formData.createFirstClassroom ? '🚀' : '✨'}
              </div>
            </div>

            {formData.createFirstClassroom && (
              <div className="space-y-4 md:space-y-6 p-4 md:p-6 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl md:rounded-3xl border-2 border-purple-300 shadow-inner animate-in slide-in-from-top-4 duration-500">

                <div className="text-center">
                  <div className="inline-flex items-center gap-2 bg-purple-500 text-white px-3 md:px-4 py-2 rounded-xl md:rounded-2xl shadow-lg">
                    <Zap className="w-4 h-4" />
                    <span className="font-bold text-sm md:text-base">בואו נגדיר את הכיתה שלך! 🌟</span>
                  </div>
                </div>

                {/* Enhanced Classroom Name */}
                <div className="space-y-2 md:space-y-3">
                  <Label htmlFor="firstClassroomName" className="text-base md:text-lg font-bold text-purple-900 flex items-center gap-2">
                    <Star className="w-4 h-4 md:w-5 md:h-5" />
                    שם הכיתה * ✏️
                  </Label>
                  <Input
                    id="firstClassroomName"
                    value={formData.firstClassroomName}
                    onChange={(e) => handleInputChange('firstClassroomName', e.target.value)}
                    placeholder="למשל: כיתה ה' 1, הכיתה שלי, פיזיקה תיכון"
                    className="h-12 md:h-14 text-base md:text-lg border-2 border-purple-200 focus:border-purple-500 rounded-xl md:rounded-2xl bg-white/90 shadow-md hover:shadow-lg transition-all duration-300"
                  />
                </div>

                {/* Enhanced Grade Level */}
                <div className="space-y-2 md:space-y-3">
                  <Label htmlFor="firstClassroomGrade" className="text-base md:text-lg font-bold text-purple-900 flex items-center gap-2">
                    <Award className="w-4 h-4 md:w-5 md:h-5" />
                    רמת כיתה * 📊
                  </Label>
                  <Select
                    value={formData.firstClassroomGrade}
                    onValueChange={(value) => handleInputChange('firstClassroomGrade', value)}
                  >
                    <SelectTrigger className="h-12 md:h-14 text-base md:text-lg border-2 border-purple-200 focus:border-purple-500 rounded-xl md:rounded-2xl bg-white/90 shadow-md hover:shadow-lg transition-all duration-300">
                      <SelectValue placeholder="בחר את רמת הכיתה 🎯" />
                    </SelectTrigger>
                    <SelectContent>
                      {gradeLevels.map((grade) => (
                        <SelectItem key={grade.value} value={grade.value} className="text-base md:text-lg">
                          {grade.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="bg-gradient-to-r from-purple-100 to-pink-100 border-2 border-purple-300 rounded-2xl md:rounded-3xl p-4 md:p-6">
                  <div className="flex items-center gap-2 md:gap-3 mb-3">
                    <div className="w-6 h-6 md:w-8 md:h-8 bg-purple-500 rounded-full flex items-center justify-center">
                      <Plus className="w-3 h-3 md:w-4 md:h-4 text-white" />
                    </div>
                    <span className="font-bold text-purple-900 text-base md:text-lg">מה הלאה? 🎯</span>
                  </div>
                  <ul className="space-y-2 text-purple-800">
                    <li className="flex items-start gap-2">
                      <span className="text-lg md:text-xl flex-shrink-0">✅</span>
                      <span className="text-xs md:text-sm">לאחר יצירת החשבון תוכל ליצור כיתות נוספות</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-lg md:text-xl flex-shrink-0">📧</span>
                      <span className="text-xs md:text-sm">תוכל להזמין תלמידים באמצעות כתובת המייל שלהם</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-lg md:text-xl flex-shrink-0">📊</span>
                      <span className="text-xs md:text-sm">תוכל לנהל ולעקוב אחר התקדמות התלמידים</span>
                    </li>
                  </ul>
                </div>

              </div>
            )}

          </CardContent>
        </Card>

        {/* Enhanced Error Display */}
        {error && (
          <div className="bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-lg">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-red-500 rounded-full flex items-center justify-center">
                <AlertCircle className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div>
                <p className="text-red-800 font-bold text-base md:text-lg">אופס! יש בעיה קטנה 😅</p>
                <p className="text-red-700 text-sm md:text-base">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Navigation Buttons */}
        <div className="text-center pt-6 md:pt-8">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
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
              type="button"
              onClick={handleContinue}
              size="lg"
              className="bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-600 hover:from-emerald-600 hover:via-blue-600 hover:to-purple-700 text-white px-8 md:px-16 py-3 md:py-4 text-lg md:text-xl font-bold rounded-2xl md:rounded-3xl shadow-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-emerald-500/25"
            >
              <CheckCircle className="w-5 h-5 md:w-7 md:h-7 ml-2" />
              <span className="hidden sm:inline">בואו נמשיך! השלב הבא מחכה! 🚀</span>
              <span className="sm:hidden">בואו נמשיך! 🚀</span>
            </Button>
          </div>

          <div className="mt-4 md:mt-6 bg-gradient-to-r from-emerald-100 to-blue-100 border border-emerald-200 rounded-xl md:rounded-2xl p-3 md:p-4">
            <p className="text-emerald-800 font-bold text-base md:text-lg flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 md:w-5 md:h-5" />
              <span className="hidden sm:inline">כמעט סיימנו! עוד רגע תהיה חלק מקהילת המורים שלנו 🎉</span>
              <span className="sm:hidden">כמעט סיימנו! 🎉</span>
            </p>
          </div>
        </div>

        {/* Enhanced Additional Info */}
        <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-2xl md:rounded-3xl p-4 md:p-8 border border-gray-200">
          <div className="text-center space-y-3 md:space-y-4">
            <div className="flex items-center justify-center gap-2 mb-3 md:mb-4">
              <div className="w-6 h-6 md:w-8 md:h-8 bg-gray-500 rounded-full flex items-center justify-center">
                <Heart className="w-3 h-3 md:w-4 md:h-4 text-white" />
              </div>
              <span className="text-gray-900 font-bold text-lg md:text-xl">טיפים שימושיים 💡</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div className="bg-white/70 rounded-xl md:rounded-2xl p-3 md:p-4 border border-gray-200">
                <div className="text-blue-600 font-bold mb-2 flex items-center gap-2 text-sm md:text-base">
                  <span className="text-lg md:text-xl">⚙️</span>
                  עריכת פרטים
                </div>
                <p className="text-gray-600 text-xs md:text-sm">תוכל לערוך את הפרטים הללו בכל זמן דרך הגדרות החשבון</p>
              </div>
              {!formData.createFirstClassroom && (
                <div className="bg-white/70 rounded-xl md:rounded-2xl p-3 md:p-4 border border-gray-200">
                  <div className="text-purple-600 font-bold mb-2 flex items-center gap-2 text-sm md:text-base">
                    <span className="text-lg md:text-xl">🏫</span>
                    יצירת כיתות
                  </div>
                  <p className="text-gray-600 text-xs md:text-sm">תוכל ליצור כיתות בכל זמן לאחר השלמת ההרשמה</p>
                </div>
              )}
              {formData.createFirstClassroom && (
                <div className="bg-white/70 rounded-xl md:rounded-2xl p-3 md:p-4 border border-gray-200">
                  <div className="text-green-600 font-bold mb-2 flex items-center gap-2 text-sm md:text-base">
                    <span className="text-lg md:text-xl">🎯</span>
                    הכיתה שלך מוכנה!
                  </div>
                  <p className="text-gray-600 text-xs md:text-sm">הכיתה "{formData.firstClassroomName}" תיווצר עבורך אוטומטית</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </form>
    </div>
  );
}
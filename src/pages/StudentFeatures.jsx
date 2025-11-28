import React, { useState, useEffect, useCallback } from "react";
import { Settings } from "@/services/entities";
import { useUser } from "@/contexts/UserContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Settings as SettingsIcon,
  Users,
  Eye,
  EyeOff,
  Crown,
  Globe,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Save,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  FileText,
  Play,
  Calendar,
  BookOpen,
  GraduationCap,
  UserIcon,
  Shield,
  User as UserIconLarge,
  Globe2,
  Plus,
  Trash2,
  Keyboard,
  Navigation,
  Info,
  Zap
} from "lucide-react";

import { iconMap } from "@/lib/layoutUtils";
import {
  ADVANCED_FEATURES_KEYS,
  DEFAULT_SP_FEATURES,
  NAV_VISIBILITY_OPTIONS,
  getSetting
} from "@/constants/settingsKeys";

const ICON_OPTIONS = [
  // Essential Navigation & UI
  'Keyboard', 'GraduationCap', 'Navigation', 'Users', 'Settings', 'SettingsIcon',
  'Home', 'Search', 'Star', 'ArrowLeft', 'Crown', 'Globe',

  // Common Actions & Features
  'Play', 'BookOpen', 'Calendar', 'FileText', 'Mail', 'Edit', 'Plus',
  'Check', 'X', 'Shield', 'Code', 'Heart', 'Bookmark',

  // Categories & Tools
  'File', 'Folder', 'Hammer', 'Wrench', 'Gamepad', 'Trophy', 'Building',
  'School', 'Book', 'Brain', 'User', 'UserCircle', 'Camera', 'Video'
];

const FEATURE_TYPES = [
  { value: 'activity_input', label: 'חיפוש פעילות', icon: Keyboard },
  { value: 'navigation', label: 'קישור ניווט', icon: Navigation },
  { value: 'authentication', label: 'אימות', icon: Shield },
  { value: 'teacher_info', label: 'מידע מורה', icon: GraduationCap }
];

export default function StudentFeatures() {
  const { currentUser, settings, isLoading: userLoading } = useUser();
  const [spFeatures, setSpFeatures] = useState(DEFAULT_SP_FEATURES);
  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Use global settings
      const currentSettings = settings || {};

      // Get SP_FEATURES from settings with fallback to defaults
      const currentSpFeatures = getSetting(
        currentSettings,
        ADVANCED_FEATURES_KEYS.SP_FEATURES,
        DEFAULT_SP_FEATURES
      );

      setSpFeatures(currentSpFeatures);
    } catch (error) {
      console.error('Error loading data:', error);
      showMessage('error', 'שגיאה בטעינת הנתונים');
    }
    setIsLoading(false);
  }, [settings]);

  useEffect(() => {
    if (currentUser && !userLoading) {
      loadData();
    }
  }, [currentUser, userLoading, loadData]);

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const newSettings = { ...settings };

      // Update SP_FEATURES in settings
      newSettings[ADVANCED_FEATURES_KEYS.SP_FEATURES] = spFeatures;

      if (settings && settings.id) {
        await Settings.update(settings.id, newSettings);
      } else {
        await Settings.create(newSettings);
      }

      showMessage('success', 'הגדרות פיצ\'רים של הפורטל תלמידים נשמרו בהצלחה');

      setTimeout(() => {
        loadData();
      }, 500);

    } catch (error) {
      console.error('Error saving settings:', error);
      showMessage('error', 'שגיאה בשמירת ההגדרות: ' + error.message);
    }
    setIsSaving(false);
  };

  const updateFeature = (featureKey, updates) => {
    setSpFeatures(prev => ({
      ...prev,
      features: {
        ...prev.features,
        [featureKey]: {
          ...prev.features[featureKey],
          ...updates
        }
      }
    }));
  };

  const addNewFeature = () => {
    const newKey = `custom_feature_${Date.now()}`;
    setSpFeatures(prev => ({
      ...prev,
      order: [...prev.order, newKey],
      features: {
        ...prev.features,
        [newKey]: {
          enabled: true,
          text: 'פיצ\'ר חדש',
          icon: 'Settings',
          visibility: 'public',
          type: 'navigation',
          url: '/'
        }
      }
    }));
  };

  const deleteFeature = (featureKey) => {
    setSpFeatures(prev => ({
      ...prev,
      order: prev.order.filter(key => key !== featureKey),
      features: Object.fromEntries(
        Object.entries(prev.features).filter(([key]) => key !== featureKey)
      )
    }));
  };

  const moveFeature = (featureKey, direction) => {
    setSpFeatures(prev => {
      const currentOrder = [...prev.order];
      const currentIndex = currentOrder.indexOf(featureKey);

      if (currentIndex === -1) return prev;

      const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

      if (newIndex >= 0 && newIndex < currentOrder.length) {
        [currentOrder[currentIndex], currentOrder[newIndex]] = [currentOrder[newIndex], currentOrder[currentIndex]];
      }

      return {
        ...prev,
        order: currentOrder
      };
    });
  };

  const getVisibilityInfo = (visibility) => {
    switch (visibility) {
      case NAV_VISIBILITY_OPTIONS.PUBLIC:
        return {
          label: 'גלוי לכולם',
          icon: Globe,
          color: 'bg-green-100 text-green-800 border-green-200',
          cardBorder: 'border-green-200',
          cardBg: 'bg-green-50/30'
        };
      case NAV_VISIBILITY_OPTIONS.LOGGED_IN_USERS:
        return {
          label: 'משתמשים מחוברים',
          icon: UserIcon,
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          cardBorder: 'border-blue-200',
          cardBg: 'bg-blue-50/30'
        };
      case NAV_VISIBILITY_OPTIONS.ADMINS_AND_TEACHERS:
        return {
          label: 'מנהלים ומורים',
          icon: Shield,
          color: 'bg-purple-100 text-purple-800 border-purple-200',
          cardBorder: 'border-purple-200',
          cardBg: 'bg-purple-50/30'
        };
      case NAV_VISIBILITY_OPTIONS.ADMINS_AND_STUDENTS:
        return {
          label: 'מנהלים ותלמידים',
          icon: GraduationCap,
          color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
          cardBorder: 'border-indigo-200',
          cardBg: 'bg-indigo-50/30'
        };
      case NAV_VISIBILITY_OPTIONS.ADMIN_ONLY:
        return {
          label: 'מנהלים בלבד',
          icon: Crown,
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          cardBorder: 'border-yellow-200',
          cardBg: 'bg-yellow-50/30'
        };
      case NAV_VISIBILITY_OPTIONS.HIDDEN:
        return {
          label: 'מוסתר',
          icon: EyeOff,
          color: 'bg-red-100 text-red-800 border-red-200',
          cardBorder: 'border-red-200',
          cardBg: 'bg-red-50/30'
        };
      default:
        return {
          label: visibility,
          icon: Globe,
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          cardBorder: 'border-gray-200',
          cardBg: 'bg-gray-50/30'
        };
    }
  };

  const getTypeInfo = (type) => {
    const typeConfig = FEATURE_TYPES.find(t => t.value === type);
    return typeConfig || { value: type, label: type, icon: FileText };
  };

  const getIconComponent = (iconName) => {
    return iconMap[iconName] || FileText;
  };

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center p-4" dir="rtl">
        <Alert className="max-w-md w-full border-red-200 mx-auto">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-sm sm:text-base leading-relaxed">
            אין לך הרשאות גישה לדף זה. רק מנהלי מערכת יכולים לגשת לניהול פיצ'רים של פורטל התלמידים.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (userLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4" dir="rtl">
        <div className="text-center max-w-sm mx-auto">
          <RefreshCw className="h-10 w-10 sm:h-12 sm:w-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600 text-base sm:text-lg font-medium">טוען הגדרות פורטל תלמידים...</p>
          <p className="text-gray-500 text-sm mt-2">אנא המתן בזמן שאנו טוענים את הנתונים</p>
        </div>
      </div>
    );
  }

  const orderedFeatures = spFeatures.order?.map(key => ({
    key,
    ...spFeatures.features[key]
  })) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 p-4 sm:p-6 lg:p-8" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg">
              <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">פיצ'רים של פורטל תלמידים</h1>
          </div>
          <div className="px-4 sm:px-6">
            <p className="text-gray-600 text-sm sm:text-base lg:text-lg max-w-2xl mx-auto leading-relaxed">
              נהל את התכונות והניווט של פורטל התלמידים. הגדר פעילויות חיפוש, קישורים וגישה למורים.
            </p>
          </div>
        </div>

        {/* Message */}
        {message && (
          <Alert className={`mb-6 ${message.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
            {message.type === 'success' ?
              <CheckCircle className="h-4 w-4 text-green-600" /> :
              <AlertCircle className="h-4 w-4 text-red-600" />
            }
            <AlertDescription className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        {/* Legend */}
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
              מקרא רמות גישה לפורטל תלמידים
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
              {[
                { key: 'public', label: 'גלוי לכולם', icon: Globe, color: 'bg-green-100 text-green-800 border-green-200', description: 'כל המשתמשים יכולים לראות' },
                { key: 'logged_in_users', label: 'משתמשים מחוברים', icon: UserIcon, color: 'bg-blue-100 text-blue-800 border-blue-200', description: 'רק משתמשים מאומתים יכולים לראות' },
                { key: 'admins_and_teachers', label: 'מנהלים ומורים', icon: Shield, color: 'bg-purple-100 text-purple-800 border-purple-200', description: 'מנהלים ומורים במערכת בלבד' },
                { key: 'admins_and_students', label: 'מנהלים ותלמידים', icon: GraduationCap, color: 'bg-indigo-100 text-indigo-800 border-indigo-200', description: 'מנהלים ותלמידים במערכת בלבד' },
                { key: 'admin_only', label: 'מנהלים בלבד', icon: Crown, color: 'bg-yellow-100 text-yellow-800 border-yellow-200', description: 'רק מנהלי מערכת יכולים לראות' },
                { key: 'hidden', label: 'מוסתר', icon: EyeOff, color: 'bg-red-100 text-red-800 border-red-200', description: 'לא גלוי לאף אחד' }
              ].map(item => (
                <div key={item.key} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl bg-gray-50/50 border border-gray-200 hover:bg-gray-100/50 transition-colors">
                  <Badge className={`${item.color} border flex items-center gap-1 px-2 sm:px-3 py-1 text-xs font-medium w-fit`}>
                    <item.icon className="w-3 h-3" />
                    <span className="whitespace-nowrap">{item.label}</span>
                  </Badge>
                  <div className="flex-1">
                    <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Features List */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <GripVertical className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              פיצ'רים של פורטל תלמידים
            </h2>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs sm:text-sm px-2 py-1">
                {orderedFeatures.length} פיצ'רים
              </Badge>
              <Button
                onClick={addNewFeature}
                size="sm"
                className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
              >
                <Plus className="w-4 h-4 mr-1" />
                הוסף פיצ'ר
              </Button>
            </div>
          </div>

          <div className="grid gap-4">
            {orderedFeatures.map((feature, index) => {
              const visibilityInfo = getVisibilityInfo(feature.visibility);
              const typeInfo = getTypeInfo(feature.type);
              const IconComponent = getIconComponent(feature.icon);

              return (
                <Card key={feature.key} className={`border-2 ${visibilityInfo.cardBorder} ${visibilityInfo.cardBg} shadow-lg transition-all duration-200 hover:shadow-xl`}>
                  <CardContent className="p-3 sm:p-4 lg:p-6">
                    <div className="space-y-4">
                      {/* Top section - Icon, info, and controls */}
                      <div className="flex items-start gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
                            <IconComponent className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{feature.text}</h3>
                            <p className="text-xs sm:text-sm text-gray-500 mt-1 leading-relaxed">
                              {typeInfo.label} • {feature.key}
                            </p>
                          </div>
                        </div>

                        {/* Move and delete buttons */}
                        <div className="flex flex-col gap-1 flex-shrink-0">
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => moveFeature(feature.key, 'up')}
                              disabled={index === 0}
                              className="h-8 w-8 p-0"
                              title="העבר למעלה"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => moveFeature(feature.key, 'down')}
                              disabled={index === orderedFeatures.length - 1}
                              className="h-8 w-8 p-0"
                              title="העבר למטה"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </Button>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteFeature(feature.key)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="מחק פיצ'ר"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Status badges row */}
                      <div className="flex flex-wrap gap-2">
                        <Badge className={`${visibilityInfo.color} border flex items-center gap-1 text-xs px-2 py-1`}>
                          <visibilityInfo.icon className="w-3 h-3" />
                          <span>{visibilityInfo.label}</span>
                        </Badge>

                        <Badge className={`flex items-center gap-1 text-xs px-2 py-1 ${
                          feature.type === 'activity_input' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                          feature.type === 'navigation' ? 'bg-green-100 text-green-800 border-green-200' :
                          feature.type === 'authentication' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                          'bg-purple-100 text-purple-800 border-purple-200'
                        }`}>
                          <typeInfo.icon className="w-3 h-3" />
                          <span>{typeInfo.label}</span>
                        </Badge>

                        <Badge variant={feature.enabled ? "default" : "secondary"} className="text-xs px-2 py-1">
                          {feature.enabled ? 'פעיל' : 'מבוטל'}
                        </Badge>
                      </div>

                      {/* Controls section */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {/* Text input */}
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-gray-600 block">טקסט</label>
                          <Input
                            value={feature.text || ''}
                            onChange={(e) => updateFeature(feature.key, { text: e.target.value })}
                            className="text-sm h-10"
                            placeholder="טקסט הפיצ'ר"
                          />
                        </div>

                        {/* Icon selector */}
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-gray-600 block">אייקון</label>
                          <Select
                            value={feature.icon || 'Settings'}
                            onValueChange={(value) => updateFeature(feature.key, { icon: value })}
                          >
                            <SelectTrigger className="text-sm h-10">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ICON_OPTIONS.map(iconName => {
                                const IconComp = getIconComponent(iconName);
                                return (
                                  <SelectItem key={iconName} value={iconName}>
                                    <div className="flex items-center gap-2">
                                      <IconComp className="w-4 h-4" />
                                      <span className="text-sm">{iconName}</span>
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Type selector */}
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-gray-600 block">סוג פיצ'ר</label>
                          <Select
                            value={feature.type || 'navigation'}
                            onValueChange={(value) => updateFeature(feature.key, { type: value })}
                          >
                            <SelectTrigger className="text-sm h-10">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {FEATURE_TYPES.map(type => (
                                <SelectItem key={type.value} value={type.value}>
                                  <div className="flex items-center gap-2">
                                    <type.icon className="w-4 h-4" />
                                    <span className="text-sm">{type.label}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Visibility selector */}
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-gray-600 block">הרשאות גישה</label>
                          <Select
                            value={feature.visibility || 'public'}
                            onValueChange={(value) => updateFeature(feature.key, { visibility: value })}
                          >
                            <SelectTrigger className="text-sm h-10">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="public">
                                <div className="flex items-center gap-2">
                                  <Globe className="w-4 h-4" />
                                  <span className="text-sm">גלוי לכולם</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="logged_in_users">
                                <div className="flex items-center gap-2">
                                  <UserIcon className="w-4 h-4" />
                                  <span className="text-sm">משתמשים מחוברים</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="admins_and_teachers">
                                <div className="flex items-center gap-2">
                                  <Shield className="w-4 h-4" />
                                  <span className="text-sm">מנהלים ומורים</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="admins_and_students">
                                <div className="flex items-center gap-2">
                                  <GraduationCap className="w-4 h-4" />
                                  <span className="text-sm">מנהלים ותלמידים</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="admin_only">
                                <div className="flex items-center gap-2">
                                  <Crown className="w-4 h-4" />
                                  <span className="text-sm">מנהלים בלבד</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="hidden">
                                <div className="flex items-center gap-2">
                                  <EyeOff className="w-4 h-4" />
                                  <span className="text-sm">מוסתר</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Type-specific controls */}
                      {feature.type === 'navigation' && (
                        <div className="space-y-3 pt-2 border-t border-gray-200">
                          <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <Navigation className="w-4 h-4" />
                            הגדרות ניווט
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-gray-600 block">URL</label>
                              <Input
                                value={feature.url || ''}
                                onChange={(e) => updateFeature(feature.key, { url: e.target.value })}
                                className="text-sm h-10"
                                placeholder="/my-page"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {feature.type === 'activity_input' && (
                        <div className="space-y-3 pt-2 border-t border-gray-200">
                          <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <Keyboard className="w-4 h-4" />
                            הגדרות חיפוש פעילות
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-gray-600 block">placeholder</label>
                              <Input
                                value={feature.placeholder || ''}
                                onChange={(e) => updateFeature(feature.key, { placeholder: e.target.value })}
                                className="text-sm h-10"
                                placeholder="ABC12345"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-gray-600 block">אורך מקסימלי</label>
                              <Input
                                type="number"
                                value={feature.maxLength || 8}
                                onChange={(e) => updateFeature(feature.key, { maxLength: parseInt(e.target.value) || 8 })}
                                className="text-sm h-10"
                                min="1"
                                max="20"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Enable/disable switch */}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={feature.enabled !== false}
                            onCheckedChange={(checked) => updateFeature(feature.key, { enabled: checked })}
                            className="data-[state=checked]:bg-purple-600"
                          />
                          <span className="text-sm font-medium text-gray-700">
                            {feature.enabled !== false ? 'פיצ\'ר פעיל' : 'פיצ\'ר מבוטל'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Save button - sticky on mobile */}
        <div className="sticky bottom-2 sm:bottom-4 pt-4 sm:pt-6 z-10">
          <Card className="border-none shadow-xl bg-white/95 backdrop-blur-sm">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <div className="hidden sm:block sm:flex-1">
                  <h3 className="font-semibold text-gray-900">שמירת הגדרות פורטל תלמידים</h3>
                  <p className="text-sm text-gray-500">שמור את כל השינויים שביצעת בפיצ'רים של פורטל התלמידים</p>
                </div>

                {/* Mobile summary */}
                <div className="sm:hidden flex items-center justify-center gap-2 text-center">
                  <Save className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium text-gray-700">מוכן לשמור את השינויים?</span>
                </div>

                <Button
                  onClick={saveSettings}
                  disabled={isSaving}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold px-6 sm:px-8 py-3 sm:py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 w-full sm:w-auto touch-manipulation"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
                      <span className="text-sm sm:text-base">שומר...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                      <span className="text-sm sm:text-base">שמור הגדרות</span>
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
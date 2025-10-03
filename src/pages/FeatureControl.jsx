import React, { useState, useEffect, useCallback } from "react";
import { Settings, User } from "@/services/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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
  Globe2
} from "lucide-react";

import { NAV_ITEMS, NAV_ITEM_KEYS, getNavItemConfig } from "@/config/productTypes";

const ICON_OPTIONS = [
  'FileText', 'Play', 'Calendar', 'BookOpen', 'UserIcon', 'Users', 'Globe', 'SettingsIcon',
  'Award', 'GraduationCap', 'Shield', 'Mail', 'Phone', 'Home', 'Search', 'Star'
];

export default function FeatureControl() {
  const [currentUser, setCurrentUser] = useState(null);
  const [settings, setSettings] = useState(null);
  const [navItems, setNavItems] = useState([]);
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
      const [userData, settingsData] = await Promise.all([
        User.me(),
        Settings.find()
      ]);

      setCurrentUser(userData);

      let currentSettings = {};
      if (settingsData && settingsData.length > 0) {
        currentSettings = settingsData[0];
        setSettings(currentSettings);
      }

      // Initialize navigation items
      const order = currentSettings.nav_order || NAV_ITEM_KEYS;
      const items = order.map(key => {
        const navItemConfig = getNavItemConfig(key);
        if (!navItemConfig) return null;

        return {
          key,
          text: navItemConfig.text, // Use fixed text from config
          icon: currentSettings[`nav_${key}_icon`] || navItemConfig.defaultIcon,
          visibility: currentSettings[`nav_${key}_visibility`] || 'public',
          enabled: currentSettings[`nav_${key}_enabled`] !== false,
          description: navItemConfig.description
        };
      }).filter(Boolean);

      setNavItems(items);
    } catch (error) {
      console.error('Error loading data:', error);
      showMessage('error', 'שגיאה בטעינת הנתונים');
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const newSettings = { ...settings };

      newSettings.nav_order = navItems.map(item => item.key);

      navItems.forEach(item => {
        // Don't save text - it comes from config file
        newSettings[`nav_${item.key}_icon`] = item.icon;
        newSettings[`nav_${item.key}_visibility`] = item.visibility;
        newSettings[`nav_${item.key}_enabled`] = item.enabled;
      });

      let savedSettings;
      if (settings && settings.id) {
        savedSettings = await Settings.update(settings.id, newSettings);
      } else {
        savedSettings = await Settings.create(newSettings);
      }

      setSettings(savedSettings);
      showMessage('success', 'ההגדרות נשמרו בהצלחה');
      
      setTimeout(() => {
        loadData();
      }, 500);
      
    } catch (error) {
      console.error('Error saving settings:', error);
      showMessage('error', 'שגיאה בשמירת ההגדרות: ' + error.message);
    }
    setIsSaving(false);
  };

  const updateNavItem = (index, updates) => {
    setNavItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], ...updates };
      return updated;
    });
  };

  const moveNavItem = (index, direction) => {
    setNavItems(prev => {
      const updated = [...prev];
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      
      if (newIndex >= 0 && newIndex < updated.length) {
        [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
      }
      
      return updated;
    });
  };

  const getVisibilityInfo = (visibility) => {
    switch (visibility) {
      case 'public':
        return {
          label: 'גלוי לכולם',
          icon: Globe,
          color: 'bg-green-100 text-green-800 border-green-200',
          cardBorder: 'border-green-200',
          cardBg: 'bg-green-50/30'
        };
      case 'logged_in_users':
        return {
          label: 'משתמשים מחוברים',
          icon: UserIcon,
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          cardBorder: 'border-blue-200',
          cardBg: 'bg-blue-50/30'
        };
      case 'admin_only':
        return {
          label: 'מנהלים בלבד',
          icon: Crown,
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          cardBorder: 'border-yellow-200',
          cardBg: 'bg-yellow-50/30'
        };
      case 'hidden':
        return {
          label: 'מוסתר',
          icon: EyeOff,
          color: 'bg-red-100 text-red-800 border-red-200',
          cardBorder: 'border-red-200',
          cardBg: 'bg-red-50/30'
        };
      case 'admins_and_creators':
        return {
          label: 'מנהלים ויוצרי תוכן',
          icon: Shield,
          color: 'bg-purple-100 text-purple-800 border-purple-200',
          cardBorder: 'border-purple-200',
          cardBg: 'bg-purple-50/30'
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

  const getIconComponent = (iconName) => {
    const iconMap = {
      FileText, Play, Calendar, BookOpen, UserIcon, Users, Globe2: Globe, SettingsIcon,
      GraduationCap, Shield
    };
    return iconMap[iconName] || FileText;
  };

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center p-4">
        <Alert className="max-w-md border-red-200">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            אין לך הרשאות גישה לדף זה. רק מנהלי מערכת יכולים לגשת לבקרת פיצ'רים.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">טוען הגדרות פיצ'רים...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 sm:p-6 lg:p-8" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <SettingsIcon className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">בקרת פיצ'רים</h1>
          </div>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            נהל את הגישה והתצוגה של פיצ'רים שונים באתר. שנה את סדר התפריט, הגדר הרשאות וקבע מה יהיה גלוי למשתמשים שונים.
          </p>
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
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Eye className="w-5 h-5 text-indigo-600" />
              מקרא רמות גישה
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { key: 'public', label: 'גלוי לכולם', icon: Globe, color: 'bg-green-100 text-green-800', description: 'כל המשתמשים יכולים לראות' },
                { key: 'logged_in_users', label: 'משתמשים מחוברים', icon: UserIcon, color: 'bg-blue-100 text-blue-800', description: 'רק משתמשים מאומתים יכולים לראות' },
                { key: 'admin_only', label: 'מנהלים בלבד', icon: Crown, color: 'bg-yellow-100 text-yellow-800', description: 'רק מנהלי מערכת יכולים לראות' },
                { key: 'admins_and_creators', label: 'מנהלים ויוצרי תוכן', icon: Shield, color: 'bg-purple-100 text-purple-800', description: 'מנהלים ויוצרי תוכן בלבד' },
                { key: 'hidden', label: 'מוסתר', icon: EyeOff, color: 'bg-red-100 text-red-800', description: 'לא גלוי לאף אחד' }
              ].map(item => (
                <div key={item.key} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/50 border border-gray-200">
                  <Badge className={`${item.color} border flex items-center gap-1 px-3 py-1`}>
                    <item.icon className="w-3 h-3" />
                    {item.label}
                  </Badge>
                  <div className="hidden sm:block">
                    <p className="text-xs text-gray-600">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Navigation Items */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <GripVertical className="w-5 h-5 text-gray-400" />
              פריטי תפריט ניווט
            </h2>
            <Badge variant="outline" className="hidden sm:flex">
              {navItems.length} פריטים
            </Badge>
          </div>

          <div className="grid gap-4">
            {navItems.map((item, index) => {
              const visibilityInfo = getVisibilityInfo(item.visibility);
              const IconComponent = getIconComponent(item.icon);
              
              return (
                <Card key={item.key} className={`border-2 ${visibilityInfo.cardBorder} ${visibilityInfo.cardBg} shadow-lg transition-all duration-200 hover:shadow-xl`}>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      {/* Left side - Icon and info */}
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center shadow-md">
                            <IconComponent className="w-5 h-5 text-white" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-gray-900 truncate">{item.text}</h3>
                            <p className="text-sm text-gray-500 truncate">{item.description}</p>
                          </div>
                        </div>

                        {/* Status badges - mobile responsive */}
                        <div className="flex flex-wrap gap-2 sm:ml-auto lg:ml-0">
                          <Badge className={`${visibilityInfo.color} border flex items-center gap-1 text-xs`}>
                            <visibilityInfo.icon className="w-3 h-3" />
                            <span className="hidden sm:inline">{visibilityInfo.label}</span>
                          </Badge>
                          
                          <Badge variant={item.enabled ? "default" : "secondary"} className="text-xs">
                            {item.enabled ? 'פעיל' : 'מבוטל'}
                          </Badge>
                        </div>
                      </div>

                      {/* Right side - Controls */}
                      <div className="flex flex-col sm:flex-row gap-3 lg:min-w-fit">
                        {/* Icon selector */}
                        <div className="sm:min-w-[120px]">
                          <Select
                            value={item.icon}
                            onValueChange={(value) => updateNavItem(index, { icon: value })}
                          >
                            <SelectTrigger className="text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ICON_OPTIONS.map(iconName => {
                                const IconComp = getIconComponent(iconName);
                                return (
                                  <SelectItem key={iconName} value={iconName}>
                                    <div className="flex items-center gap-2">
                                      <IconComp className="w-4 h-4" />
                                      {iconName}
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Visibility selector */}
                        <div className="sm:min-w-[160px]">
                          <Select
                            value={item.visibility}
                            onValueChange={(value) => updateNavItem(index, { visibility: value })}
                          >
                            <SelectTrigger className="text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {item.key === 'content_creators' ? (
                                <>
                                  <SelectItem value="admins_and_creators">
                                    <div className="flex items-center gap-2">
                                      <Shield className="w-4 h-4" />
                                      מנהלים ויוצרי תוכן
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="logged_in_users">
                                    <div className="flex items-center gap-2">
                                      <UserIcon className="w-4 h-4" />
                                      משתמשים מחוברים
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="admins_only">
                                    <div className="flex items-center gap-2">
                                      <Crown className="w-4 h-4" />
                                      מנהלים בלבד
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="hidden">
                                    <div className="flex items-center gap-2">
                                      <EyeOff className="w-4 h-4" />
                                      מוסתר
                                    </div>
                                  </SelectItem>
                                </>
                              ) : (
                                <>
                                  <SelectItem value="public">
                                    <div className="flex items-center gap-2">
                                      <Globe className="w-4 h-4" />
                                      גלוי לכולם
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="logged_in_users">
                                    <div className="flex items-center gap-2">
                                      <UserIcon className="w-4 h-4" />
                                      משתמשים מחוברים
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="admin_only">
                                    <div className="flex items-center gap-2">
                                      <Crown className="w-4 h-4" />
                                      מנהלים בלבד
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="hidden">
                                    <div className="flex items-center gap-2">
                                      <EyeOff className="w-4 h-4" />
                                      מוסתר
                                    </div>
                                  </SelectItem>
                                </>
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Controls row */}
                        <div className="flex items-center gap-2">
                          {/* Enable/disable switch */}
                          <div className="flex items-center gap-2 bg-white/60 rounded-lg px-3 py-2">
                            <Switch
                              checked={item.enabled}
                              onCheckedChange={(checked) => updateNavItem(index, { enabled: checked })}
                            />
                            <span className="text-sm font-medium text-gray-700">
                              {item.enabled ? 'פעיל' : 'מבוטל'}
                            </span>
                          </div>

                          {/* Move buttons */}
                          <div className="flex flex-col gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => moveNavItem(index, 'up')}
                              disabled={index === 0}
                              className="h-6 w-8 p-0"
                            >
                              <ChevronUp className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => moveNavItem(index, 'down')}
                              disabled={index === navItems.length - 1}
                              className="h-6 w-8 p-0"
                            >
                              <ChevronDown className="w-3 h-3" />
                            </Button>
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

        {/* Save button - sticky on mobile */}
        <div className="sticky bottom-4 pt-6">
          <Card className="border-none shadow-xl bg-white/90 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="hidden sm:block">
                  <h3 className="font-semibold text-gray-900">שמירת הגדרות</h3>
                  <p className="text-sm text-gray-500">שמור את כל השינויים שביצעת בהגדרות התפריט</p>
                </div>
                
                <Button 
                  onClick={saveSettings}
                  disabled={isSaving}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 w-full sm:w-auto"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                      שומר...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5 mr-2" />
                      שמור הגדרות
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
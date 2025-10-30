import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getProductTypeName } from "@/config/productTypes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Settings, User } from "@/services/entities";
import LudoraLoadingSpinner from "@/components/ui/LudoraLoadingSpinner";
import {
  Package,
  Save,
  CheckCircle,
  AlertTriangle,
  Clock,
  Infinity,
  Video,
  BookOpen,
  FileText,
  Play,
  Users,
  Wrench
} from "lucide-react";

export default function ProductSettings() {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(null);
  const [settings, setSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("idle"); // 'idle', 'saving', 'success', 'error'
  const [message, setMessage] = useState(null);
  const [formData, setFormData] = useState({
    // Course settings
    default_course_access_days: 365,
    course_lifetime_access: false,

    // File settings
    default_file_access_days: 365,
    file_lifetime_access: false,

    // Workshop settings
    default_workshop_access_days: 365,
    workshop_lifetime_access: false,

    // Game settings
    default_game_access_days: 365,
    game_lifetime_access: true,

    // Lesson plan settings
    default_lesson_plan_access_days: 365,
    lesson_plan_lifetime_access: false,

    // Tool settings
    default_tool_access_days: 365,
    tool_lifetime_access: false,

    // Navigation settings
    nav_content_creators_enabled: true,

    // Content creator permissions
    allow_content_creator_workshops: true,
    allow_content_creator_courses: true,
    allow_content_creator_files: true,
    allow_content_creator_games: true,
    allow_content_creator_tools: true,
    allow_content_creator_lesson_plans: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Check if user is admin
      const user = await User.me();
      if (user.role !== 'admin') {
        navigate('/');
        return;
      }
      setCurrentUser(user);

      // Load current settings
      const settingsData = await Settings.find();
      const currentSettings = settingsData.length > 0 ? settingsData[0] : {};
      setSettings(currentSettings);

      // Initialize form with current values or defaults
      const newFormData = {
        default_course_access_days: currentSettings.default_course_access_days || 365,
        course_lifetime_access: currentSettings.course_lifetime_access || false,
        default_file_access_days: currentSettings.default_file_access_days || 365,
        file_lifetime_access: currentSettings.file_lifetime_access || false,
        default_workshop_access_days: currentSettings.default_workshop_access_days || 365,
        workshop_lifetime_access: currentSettings.workshop_lifetime_access || false,
        default_game_access_days: currentSettings.default_game_access_days || 365,
        game_lifetime_access: currentSettings.game_lifetime_access ?? true,
        default_lesson_plan_access_days: currentSettings.default_lesson_plan_access_days || 365,
        lesson_plan_lifetime_access: currentSettings.lesson_plan_lifetime_access || false,
        default_tool_access_days: currentSettings.default_tool_access_days || 365,
        tool_lifetime_access: currentSettings.tool_lifetime_access || false,
        nav_content_creators_enabled: currentSettings.nav_content_creators_enabled ?? true,
        allow_content_creator_workshops: currentSettings.allow_content_creator_workshops ?? true,
        allow_content_creator_courses: currentSettings.allow_content_creator_courses ?? true,
        allow_content_creator_files: currentSettings.allow_content_creator_files ?? true,
        allow_content_creator_games: currentSettings.allow_content_creator_games ?? true,
        allow_content_creator_tools: currentSettings.allow_content_creator_tools ?? true,
        allow_content_creator_lesson_plans: currentSettings.allow_content_creator_lesson_plans ?? true
      };

      setFormData(newFormData);

    } catch (error) {
      console.error('Error loading data:', error);
      showMessage('error', 'שגיאה בטעינת הנתונים');
    }
    setIsLoading(false);
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSwitchChange = (field, checked) => {
    setFormData(prev => ({
      ...prev,
      [field]: checked
    }));
  };

  // Helper function to determine if content creator permission can be enabled
  const canEnableContentCreatorPermission = (currentValue) => {
    // If nav_content_creators_enabled is false, only allow turning OFF permissions
    if (!formData.nav_content_creators_enabled) {
      return currentValue; // Can only turn off, not on
    }
    return true; // Can change in any direction if nav is enabled
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus("saving");

    try {
      if (settings) {
        await Settings.update(settings.id, formData);
      } else {
        await Settings.create(formData);
      }

      setSaveStatus("success");
      await loadData(); // Reload to get updated data

      // Reset to idle after showing success animation
      setTimeout(() => {
        setSaveStatus("idle");
      }, 2500);
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveStatus("error");
      showMessage('error', 'שגיאה בשמירת ההגדרות');

      // Reset to idle after showing error animation
      setTimeout(() => {
        setSaveStatus("idle");
      }, 3000);
    }
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LudoraLoadingSpinner
          message="טוען הגדרות מוצרים..."
          status="loading"
          size="lg"
          theme="space"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        
        {message && (
          <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className="mb-6">
            {message.type === 'error' ? (
              <AlertTriangle className="h-4 w-4" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">הגדרות מוצרים</h1>
              <p className="text-gray-600">ברירות מחדל לגישה למוצרים</p>
            </div>
          </div>
        </div>

        {/* Product Access Settings and Content Creator Permissions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-gradient-to-br from-blue-100 to-indigo-200 rounded-lg">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              הגדרות מוצרים והרשאות יוצרי תוכן
            </CardTitle>
            <p className="text-gray-600 text-sm mt-2">
              קבעו ברירת מחדל לימי גישה לכל סוג מוצר והגדירו הרשאות ליוצרי תוכן
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-gray-900">סוג מוצר</th>
                    <th className="text-center px-6 py-4 text-sm font-semibold text-gray-900">ימי גישה</th>
                    <th className="text-center px-6 py-4 text-sm font-semibold text-gray-900">גישה לכל החיים</th>
                    <th className="text-center px-6 py-4 text-sm font-semibold text-gray-900">יוצרי תוכן</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {/* Courses */}
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <BookOpen className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="font-medium">{getProductTypeName('course', 'plural')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Input
                        type="number"
                        min="1"
                        max="9999"
                        value={formData.default_course_access_days}
                        onChange={(e) => handleInputChange('default_course_access_days', parseInt(e.target.value) || 365)}
                        className="w-20 text-center"
                        disabled={formData.course_lifetime_access}
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Switch
                        checked={formData.course_lifetime_access}
                        onCheckedChange={(checked) => handleSwitchChange('course_lifetime_access', checked)}
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Switch
                        checked={formData.allow_content_creator_courses}
                        onCheckedChange={(checked) => handleInputChange('allow_content_creator_courses', checked)}
                        disabled={!formData.nav_content_creators_enabled && !formData.allow_content_creator_courses}
                      />
                    </td>
                  </tr>

                  {/* Files */}
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                          <FileText className="w-4 h-4 text-green-600" />
                        </div>
                        <span className="font-medium">{getProductTypeName('file', 'plural')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Input
                        type="number"
                        min="1"
                        max="9999"
                        value={formData.default_file_access_days}
                        onChange={(e) => handleInputChange('default_file_access_days', parseInt(e.target.value) || 365)}
                        className="w-20 text-center"
                        disabled={formData.file_lifetime_access}
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Switch
                        checked={formData.file_lifetime_access}
                        onCheckedChange={(checked) => handleSwitchChange('file_lifetime_access', checked)}
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Switch
                        checked={formData.allow_content_creator_files}
                        onCheckedChange={(checked) => handleInputChange('allow_content_creator_files', checked)}
                        disabled={!formData.nav_content_creators_enabled && !formData.allow_content_creator_files}
                      />
                    </td>
                  </tr>

                  {/* Workshops */}
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                          <Users className="w-4 h-4 text-purple-600" />
                        </div>
                        <span className="font-medium">{getProductTypeName('workshop', 'plural')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Input
                        type="number"
                        min="1"
                        max="9999"
                        value={formData.default_workshop_access_days}
                        onChange={(e) => handleInputChange('default_workshop_access_days', parseInt(e.target.value) || 365)}
                        className="w-20 text-center"
                        disabled={formData.workshop_lifetime_access}
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Switch
                        checked={formData.workshop_lifetime_access}
                        onCheckedChange={(checked) => handleSwitchChange('workshop_lifetime_access', checked)}
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Switch
                        checked={formData.allow_content_creator_workshops}
                        onCheckedChange={(checked) => handleInputChange('allow_content_creator_workshops', checked)}
                        disabled={!formData.nav_content_creators_enabled && !formData.allow_content_creator_workshops}
                      />
                    </td>
                  </tr>

                  {/* Games */}
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center">
                          <Play className="w-4 h-4 text-pink-600" />
                        </div>
                        <span className="font-medium">{getProductTypeName('game', 'plural')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Input
                        type="number"
                        min="1"
                        max="9999"
                        value={formData.default_game_access_days}
                        onChange={(e) => handleInputChange('default_game_access_days', parseInt(e.target.value) || 365)}
                        className="w-20 text-center"
                        disabled={formData.game_lifetime_access}
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Switch
                        checked={formData.game_lifetime_access}
                        onCheckedChange={(checked) => handleSwitchChange('game_lifetime_access', checked)}
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Switch
                        checked={formData.allow_content_creator_games}
                        onCheckedChange={(checked) => handleInputChange('allow_content_creator_games', checked)}
                        disabled={!formData.nav_content_creators_enabled && !formData.allow_content_creator_games}
                      />
                    </td>
                  </tr>

                  {/* Tools */}
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                          <Wrench className="w-4 h-4 text-gray-600" />
                        </div>
                        <span className="font-medium">{getProductTypeName('tool', 'plural')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Input
                        type="number"
                        min="1"
                        max="9999"
                        value={formData.default_tool_access_days}
                        onChange={(e) => handleInputChange('default_tool_access_days', parseInt(e.target.value) || 365)}
                        className="w-20 text-center"
                        disabled={formData.tool_lifetime_access}
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Switch
                        checked={formData.tool_lifetime_access}
                        onCheckedChange={(checked) => handleSwitchChange('tool_lifetime_access', checked)}
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Switch
                        checked={formData.allow_content_creator_tools}
                        onCheckedChange={(checked) => handleInputChange('allow_content_creator_tools', checked)}
                        disabled={!formData.nav_content_creators_enabled && !formData.allow_content_creator_tools}
                      />
                    </td>
                  </tr>

                  {/* Lesson Plans */}
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                          <BookOpen className="w-4 h-4 text-indigo-600" />
                        </div>
                        <span className="font-medium">{getProductTypeName('lesson_plan', 'plural')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Input
                        type="number"
                        min="1"
                        max="9999"
                        value={formData.default_lesson_plan_access_days}
                        onChange={(e) => handleInputChange('default_lesson_plan_access_days', parseInt(e.target.value) || 365)}
                        className="w-20 text-center"
                        disabled={formData.lesson_plan_lifetime_access}
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Switch
                        checked={formData.lesson_plan_lifetime_access}
                        onCheckedChange={(checked) => handleSwitchChange('lesson_plan_lifetime_access', checked)}
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Switch
                        checked={formData.allow_content_creator_lesson_plans}
                        onCheckedChange={(checked) => handleInputChange('allow_content_creator_lesson_plans', checked)}
                        disabled={!formData.nav_content_creators_enabled && !formData.allow_content_creator_lesson_plans}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-4 space-y-3">
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-2">
                  <Infinity className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">גישה לכל החיים</p>
                    <p className="text-blue-700">כשמופעל, המוצר יהיה זמין ללא הגבלת זמן</p>
                  </div>
                </div>
              </div>

              <div className={`p-3 rounded-lg border ${formData.nav_content_creators_enabled ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                <div className="flex items-start gap-2">
                  <Users className={`w-4 h-4 mt-0.5 flex-shrink-0 ${formData.nav_content_creators_enabled ? 'text-green-600' : 'text-amber-600'}`} />
                  <div className={`text-sm ${formData.nav_content_creators_enabled ? 'text-green-800' : 'text-amber-800'}`}>
                    <p className="font-medium">הרשאות יוצרי תוכן</p>
                    {formData.nav_content_creators_enabled ? (
                      <p className={`${formData.nav_content_creators_enabled ? 'text-green-700' : 'text-amber-700'}`}>
                        פורטל יוצרי התוכן מופעל - ניתן לשנות הרשאות בחופשיות
                      </p>
                    ) : (
                      <p className={`${formData.nav_content_creators_enabled ? 'text-green-700' : 'text-amber-700'}`}>
                        פורטל יוצרי התוכן מושבת - ניתן רק לבטל הרשאות קיימות
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>


        {/* Save Button Section */}
        <div className="flex flex-col items-center">
          {/* Game Loading Spinner - Shows when saving or showing result */}
          {saveStatus !== "idle" && (
            <div className="mb-6 w-full flex justify-center">
              <LudoraLoadingSpinner
                message="שומר הגדרות..."
                status={saveStatus === "saving" ? "loading" : saveStatus}
                size="md"
                theme="arcade"
                onAnimationComplete={() => {
                  if (saveStatus !== "saving") {
                    setSaveStatus("idle");
                  }
                }}
              />
            </div>
          )}

          {/* Save Button - Hidden when showing spinner */}
          {saveStatus === "idle" && (
            <div className="flex justify-end w-full">
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700 px-8 transform transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <Save className="w-4 h-4 ml-2" />
                שמור הגדרות
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
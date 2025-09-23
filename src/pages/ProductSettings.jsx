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
    // Recording settings
    default_recording_access_days: 30,
    recording_lifetime_access: false,

    // Course settings
    default_course_access_days: 365,
    course_lifetime_access: false,

    // File settings
    default_file_access_days: 365,
    file_lifetime_access: false,

    // Content creator permissions
    allow_content_creator_workshops: true,
    allow_content_creator_courses: true,
    allow_content_creator_files: true,
    allow_content_creator_tools: true
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
        default_recording_access_days: currentSettings.default_recording_access_days || 30,
        recording_lifetime_access: currentSettings.recording_lifetime_access || false,
        default_course_access_days: currentSettings.default_course_access_days || 365,
        course_lifetime_access: currentSettings.course_lifetime_access || false,
        default_file_access_days: currentSettings.default_file_access_days || 365,
        file_lifetime_access: currentSettings.file_lifetime_access || false,
        allow_content_creator_workshops: currentSettings.allow_content_creator_workshops ?? true,
        allow_content_creator_courses: currentSettings.allow_content_creator_courses ?? true,
        allow_content_creator_files: currentSettings.allow_content_creator_files ?? true,
        allow_content_creator_tools: currentSettings.allow_content_creator_tools ?? true
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

        {/* Recording Settings */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="w-5 h-5 text-red-500" />
              ימי גישה להקלטה
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm font-medium">ימים</Label>
                <Input
                  type="number"
                  min="1"
                  max="9999"
                  value={formData.default_recording_access_days}
                  onChange={(e) => handleInputChange('default_recording_access_days', parseInt(e.target.value) || 30)}
                  className="w-24"
                  disabled={formData.recording_lifetime_access}
                />
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <Switch
                  checked={formData.recording_lifetime_access}
                  onCheckedChange={(checked) => handleSwitchChange('recording_lifetime_access', checked)}
                />
                <Label className="flex items-center gap-2">
                  <Infinity className="w-4 h-4" />
                  גישה לכל החיים
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Course Settings */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-500" />
              ימי גישה ל{getProductTypeName('course', 'singular')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm font-medium">ימים</Label>
                <Input
                  type="number"
                  min="1"
                  max="9999"
                  value={formData.default_course_access_days}
                  onChange={(e) => handleInputChange('default_course_access_days', parseInt(e.target.value) || 365)}
                  className="w-24"
                  disabled={formData.course_lifetime_access}
                />
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <Switch
                  checked={formData.course_lifetime_access}
                  onCheckedChange={(checked) => handleSwitchChange('course_lifetime_access', checked)}
                />
                <Label className="flex items-center gap-2">
                  <Infinity className="w-4 h-4" />
                  גישה לכל החיים
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* File Settings */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-green-500" />
              ימי גישה ל{getProductTypeName('file', 'singular')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm font-medium">ימים</Label>
                <Input
                  type="number"
                  min="1"
                  max="9999"
                  value={formData.default_file_access_days}
                  onChange={(e) => handleInputChange('default_file_access_days', parseInt(e.target.value) || 365)}
                  className="w-24"
                  disabled={formData.file_lifetime_access}
                />
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <Switch
                  checked={formData.file_lifetime_access}
                  onCheckedChange={(checked) => handleSwitchChange('file_lifetime_access', checked)}
                />
                <Label className="flex items-center gap-2">
                  <Infinity className="w-4 h-4" />
                  גישה לכל החיים
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content Creator Permissions */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="p-2 bg-gradient-to-br from-green-100 to-green-200 rounded-lg">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              הרשאות יוצרי תוכן
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-sm text-gray-600 bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="font-medium text-blue-800 mb-2">הסבר:</p>
              <p>קבעו אילו סוגי מוצרים יוצרי תוכן יכולים ליצור כשהם נכנסים דרך פורטל יוצרי התוכן. מנהלי מערכת תמיד יכולים ליצור את כל סוגי המוצרים כשהם נכנסים דרך התפריט המנהלי.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Workshop Permission */}
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <Video className="w-5 h-5 text-purple-600" />
                  <Label className="font-medium">{getProductTypeName('workshop', 'plural')}</Label>
                </div>
                <Switch
                  checked={formData.allow_content_creator_workshops}
                  onCheckedChange={(checked) => handleInputChange('allow_content_creator_workshops', checked)}
                />
              </div>

              {/* Course Permission */}
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  <Label className="font-medium">{getProductTypeName('course', 'plural')}</Label>
                </div>
                <Switch
                  checked={formData.allow_content_creator_courses}
                  onCheckedChange={(checked) => handleInputChange('allow_content_creator_courses', checked)}
                />
              </div>

              {/* File Permission */}
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-orange-600" />
                  <Label className="font-medium">{getProductTypeName('file', 'plural')}</Label>
                </div>
                <Switch
                  checked={formData.allow_content_creator_files}
                  onCheckedChange={(checked) => handleInputChange('allow_content_creator_files', checked)}
                />
              </div>

              {/* Tool Permission */}
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <Wrench className="w-5 h-5 text-gray-600" />
                  <Label className="font-medium">{getProductTypeName('tool', 'plural')}</Label>
                </div>
                <Switch
                  checked={formData.allow_content_creator_tools}
                  onCheckedChange={(checked) => handleInputChange('allow_content_creator_tools', checked)}
                />
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
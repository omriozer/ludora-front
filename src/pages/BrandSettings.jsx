import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { getProductTypeName } from "@/config/productTypes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
// OptimizedImage removed - using simple img for logo display
import { Settings } from "@/services/entities";
import { UploadFile } from "@/services/integrations";
import { showConfirm } from '@/utils/messaging';
import { ludlog, luderror } from '@/lib/ludlog';
import { config } from '@/config/environment';
import { haveAdminAccess } from "@/utils/adminCheck";
import {
  Palette,
  Save,
  Upload,
  Trash2,
  Eye,
  CheckCircle,
  AlertTriangle,
  Mail,
  Phone,
  Globe,
  FileText,
  Image as ImageIcon
} from "lucide-react";

export default function BrandSettings() {
  const navigate = useNavigate();
  const { currentUser, settings, isLoading: userLoading } = useUser();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    site_name: '',
    site_description: '',
    contact_email: '',
    contact_phone: '',
    logo_url: ''
  });

  useEffect(() => {
    if (!userLoading && currentUser && settings) {
      loadData();
    }
  }, [userLoading, currentUser, settings]);

  const loadData = async () => {
    try {
      // Check if user is admin
      if (!haveAdminAccess(currentUser.role, 'admin_access', settings)) {
        navigate('/');
        return;
      }

      // Initialize form with current values from global settings
      const currentSettings = settings || {};
      setFormData({
        site_name: currentSettings.site_name || '',
        site_description: currentSettings.site_description || '',
        contact_email: currentSettings.contact_email || '',
        contact_phone: currentSettings.contact_phone || '',
        logo_url: currentSettings.logo_url || ''
      });

    } catch (error) {
      luderror.validation('Error loading data:', error);
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

  const handleLogoUpload = async () => {
    if (!logoFile) return;

    setIsUploading(true);
    try {
      const result = await UploadFile({ file: logoFile });
      if (result && result.file_url) {
        handleInputChange('logo_url', result.file_url);
        setLogoFile(null);
        showMessage('success', 'הלוגו הועלה בהצלחה');
      }
    } catch (error) {
      luderror.media('Error uploading logo:', error);

      // Clear the file input on error so user can try again
      const fileInput = document.getElementById('logo-upload');
      if (fileInput) {
        fileInput.value = '';
      }
      setLogoFile(null);

      showMessage('error', 'שגיאה בהעלאת הלוגו');
    }
    setIsUploading(false);
  };

  const handleLogoDelete = async () => {
    const confirmed = await showConfirm('מחיקת לוגו', 'האם אתה בטוח שברצונך למחוק את הלוגו?');
    if (!confirmed) return;
    handleInputChange('logo_url', '');
    showMessage('success', 'הלוגו נמחק');
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (settings) {
        await Settings.update(settings.id, formData);
      } else {
        await Settings.create(formData);
      }
      
      showMessage('success', 'הגדרות המותג נשמרו בהצלחה');
      await loadData(); // Reload to get updated data
    } catch (error) {
      luderror.validation('Error saving settings:', error);
      showMessage('error', 'שגיאה בשמירת ההגדרות');
    }
    setIsSaving(false);
  };

  if (userLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">טוען הגדרות...</p>
        </div>
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
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
              <Palette className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">הגדרות מותג</h1>
              <p className="text-gray-600">נהל את פרטי המותג ופרטי הקשר של האתר</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Site Identity */}
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                זהות האתר
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="site_name">שם האתר</Label>
                  <Input
                    id="site_name"
                    value={formData.site_name}
                    onChange={(e) => handleInputChange('site_name', e.target.value)}
                    placeholder="לודורה"
                  />
                </div>
                
                <div>
                  <Label htmlFor="site_description">תיאור האתר</Label>
                  <Input
                    id="site_description"
                    value={formData.site_description}
                    onChange={(e) => handleInputChange('site_description', e.target.value)}
                    placeholder={`פלטפורמה מתקדמת ל${getProductTypeName('game', 'plural')} חינוכיים`}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Logo Settings */}
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                לוגו האתר
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {/* Current Logo Display */}
                {formData.logo_url && (
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <Label>לוגו נוכחי</Label>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(formData.logo_url, '_blank')}
                        >
                          <Eye className="w-4 h-4 ml-1" />
                          צפייה
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleLogoDelete}
                          className="text-red-600 hover:text-red-700 border-red-200"
                        >
                          <Trash2 className="w-4 h-4 ml-1" />
                          מחק
                        </Button>
                      </div>
                    </div>
                    <img
                      src={formData.logo_url}
                      alt="לוגו האתר"
                      className="max-h-24 object-contain border rounded"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                )}

                {/* Logo Upload */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setLogoFile(e.target.files[0])}
                    className="hidden"
                    id="logo-upload"
                  />
                  
                  {logoFile ? (
                    <div className="space-y-4">
                      <div className="text-sm text-gray-600">
                        קובץ נבחר: {logoFile.name}
                      </div>
                      <Button
                        onClick={handleLogoUpload}
                        disabled={isUploading}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {isUploading ? (
                          <>
                            <div className="animate-spin w-4 h-4 ml-2 border-2 border-white border-t-transparent rounded-full"></div>
                            מעלה...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 ml-2" />
                            העלה לוגו
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <ImageIcon className="w-12 h-12 text-gray-400 mx-auto" />
                      <div>
                        <p className="text-gray-600 mb-2">העלה לוגו חדש לאתר</p>
                        <Label
                          htmlFor="logo-upload"
                          className="cursor-pointer inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <Upload className="w-4 h-4 ml-2" />
                          בחר קובץ
                        </Label>
                      </div>
                      <p className="text-xs text-gray-500">
                        קבצים מומלצים: PNG, JPG, SVG (עד 5MB)
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50">
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                פרטי קשר
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="contact_email">אימייל ליצירת קשר</Label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="contact_email"
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) => handleInputChange('contact_email', e.target.value)}
                      placeholder={config.contact.SUPPORT_EMAIL}
                      className="pr-10"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="contact_phone">טלפון ליצירת קשר</Label>
                  <div className="relative">
                    <Phone className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="contact_phone"
                      type="tel"
                      value={formData.contact_phone}
                      onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                      placeholder="050-1234567"
                      className="pr-10"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700 px-8 py-3 text-lg"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin w-5 h-5 ml-2 border-2 border-white border-t-transparent rounded-full"></div>
                  שומר...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 ml-2" />
                  שמור הגדרות
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
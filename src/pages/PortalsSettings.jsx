import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Settings } from "@/services/entities";
import { luderror } from '@/lib/ludlog';
import { STUDENTS_ACCESS_MODES } from '@/constants/settingsKeys';
import { haveAdminAccess } from "@/utils/adminCheck";
import {
  Globe2,
  Save,
  CheckCircle,
  AlertTriangle,
  Users,
  GraduationCap,
  Settings2,
  Shield,
  UserCheck,
  Clock,
  Baby
} from "lucide-react";

export default function PortalsSettings() {
  const navigate = useNavigate();
  const { currentUser, settings, isLoading: userLoading, refreshSettings } = useUser();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [formData, setFormData] = useState({
    // Students Portal Settings
    students_access: 'all',
    student_onboarding_enabled: false,
    student_invitation_expiry_days: 7,
    parent_consent_required: false,
    teacher_consent_verification_enabled: false,
    // Teachers Portal Settings
    teacher_onboarding_enabled: true
  });

  const loadData = useCallback(async () => {
    try {
      // Check if user is admin
      if (!haveAdminAccess(currentUser.role, 'admin_access', settings)) {
        navigate('/');
        return;
      }

      // Initialize form with current values from global settings
      const currentSettings = settings || {};
      setFormData({
        students_access: currentSettings.students_access || 'all',
        student_onboarding_enabled: currentSettings.student_onboarding_enabled || false,
        student_invitation_expiry_days: currentSettings.student_invitation_expiry_days || 7,
        parent_consent_required: currentSettings.parent_consent_required || false,
        teacher_consent_verification_enabled: currentSettings.teacher_consent_verification_enabled || false,
        teacher_onboarding_enabled: currentSettings.teacher_onboarding_enabled || true
      });

    } catch (error) {
      luderror.validation('Error loading portals settings:', error);
      showMessage('error', 'שגיאה בטעינת הנתונים');
    }
    setIsLoading(false);
  }, [currentUser, settings, navigate]);

  useEffect(() => {
    if (!userLoading && currentUser && settings) {
      loadData();
    }
  }, [userLoading, currentUser, settings, loadData]);

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
    try {
      if (settings) {
        await Settings.update(settings.id, formData);
      } else {
        await Settings.create(formData);
      }

      showMessage('success', 'הגדרות הפורטלים נשמרו בהצלחה');
      // Refresh UserContext settings cache with latest values from API
      await refreshSettings();
      await loadData(); // Reload form with refreshed data
    } catch (error) {
      luderror.validation('Error saving portals settings:', error);
      showMessage('error', 'שגיאה בשמירת ההגדרות');
    }
    setIsSaving(false);
  };

  const getAccessModeInfo = (mode) => {
    switch (mode) {
      case STUDENTS_ACCESS_MODES.INVITE_ONLY:
        return {
          label: 'התחברות אנונימית',
          description: 'התחברות עם משתמש אנונימי המחובר למורה',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        };
      case STUDENTS_ACCESS_MODES.AUTHED_ONLY:
        return {
          label: 'משתמשים מאושרים בלבד',
          description: 'תלמידים צריכים להירשם ולהתחבר כדי להיכנס',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200'
        };
      case STUDENTS_ACCESS_MODES.ALL:
        return {
          label: 'כל האפשרויות',
          description: 'תלמידים יכולים להיכנס עם משתמש מאושר או אנונימי',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        };
      default:
        return {
          label: mode,
          description: '',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200'
        };
    }
  };

  if (userLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">טוען הגדרות פורטלים...</p>
        </div>
      </div>
    );
  }

  const accessModeInfo = getAccessModeInfo(formData.students_access);

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
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Globe2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">הגדרות פורטלים</h1>
              <p className="text-gray-600">נהל את הגדרות הגישה והתנהגות של פורטל המורים ופורטל התלמידים</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Students Portal Settings */}
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Users className="w-6 h-6 text-blue-600" />
                פורטל התלמידים
                <span className="text-sm font-normal text-gray-500">(my.ludora.app)</span>
              </CardTitle>
              <p className="text-gray-600 text-sm mt-2">
                הגדרות הקשורות לגישת התלמידים ותהליכי אימות
              </p>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Students Access Mode */}
              <div>
                <Label htmlFor="students_access" className="text-base font-semibold">מצב גישת תלמידים</Label>
                <p className="text-sm text-gray-600 mb-3">
                  קובע איך תלמידים יכולים להיכנס לפורטל
                </p>
                <Select
                  value={formData.students_access}
                  onValueChange={(value) => handleInputChange('students_access', value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={STUDENTS_ACCESS_MODES.ALL}>
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-green-600" />
                        <span>כל האפשרויות - תלמידים יכולים להתחבר אנונימית או עם משתמש מאושר</span>
                      </div>
                    </SelectItem>
                    <SelectItem value={STUDENTS_ACCESS_MODES.AUTHED_ONLY}>
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-blue-600" />
                        <span>משתמשים מחוברים בלבד - נדרש רישום מאושר</span>
                      </div>
                    </SelectItem>
                    <SelectItem value={STUDENTS_ACCESS_MODES.INVITE_ONLY}>
                      <div className="flex items-center gap-2">
                        <Settings2 className="w-4 h-4 text-red-600" />
                        <span>התחברות אנונימית - התחברות עם משתמש אנונימי המחובר למורה</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>

                {/* Access Mode Info */}
                <div className={`mt-3 p-4 rounded-lg border ${accessModeInfo.bgColor} ${accessModeInfo.borderColor}`}>
                  <div className="flex items-start gap-2">
                    <Shield className={`w-5 h-5 mt-0.5 flex-shrink-0 ${accessModeInfo.color}`} />
                    <div>
                      <p className={`font-medium ${accessModeInfo.color}`}>{accessModeInfo.label}</p>
                      <p className="text-sm text-gray-700 mt-1">{accessModeInfo.description}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Student Invitation Expiry */}
              <div>
                <Label htmlFor="student_invitation_expiry_days" className="text-base font-semibold">
                  <Clock className="w-4 h-4 inline ml-1" />
                  תוקף הזמנות תלמידים (ימים)
                </Label>
                <p className="text-sm text-gray-600 mb-3">
                  כמה ימים הזמנת מורה לתלמיד תהיה תקפה
                </p>
                <Input
                  type="number"
                  min="1"
                  max="365"
                  value={formData.student_invitation_expiry_days}
                  onChange={(e) => handleInputChange('student_invitation_expiry_days', parseInt(e.target.value) || 7)}
                  className="w-32"
                />
              </div>

              {/* Parent Consent Required */}
              <div className="flex items-start justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <Label className="text-base font-semibold">
                    <Baby className="w-4 h-4 inline ml-1" />
                    דרישת הסכמת הורים
                  </Label>
                  <p className="text-sm text-gray-600 mt-1">
                    האם נדרש הסכמת הורים לרישום תלמידים
                  </p>
                </div>
                <Switch
                  checked={formData.parent_consent_required}
                  onCheckedChange={(checked) => handleSwitchChange('parent_consent_required', checked)}
                />
              </div>

              {/* Teacher Consent Verification */}
              <div className="flex items-start justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <Label className="text-base font-semibold">
                    <Shield className="w-4 h-4 inline ml-1" />
                    אישור הסכמת הורים על ידי מורים
                  </Label>
                  <p className="text-sm text-gray-600 mt-1">
                    מאפשר למורים לסמן שהסכמת הורה התקבלה ונטלו אחריות משפטית על אימות ההסכמה
                  </p>
                  {formData.teacher_consent_verification_enabled && (
                    <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                      <strong>אזהרה:</strong> הפעלת האפשרות מעבירה אחריות משפטית למורים לוודא שההסכמה התקבלה באופן חוקי
                    </div>
                  )}
                </div>
                <Switch
                  checked={formData.teacher_consent_verification_enabled}
                  onCheckedChange={(checked) => handleSwitchChange('teacher_consent_verification_enabled', checked)}
                />
              </div>

              {/* Student Onboarding */}
              <div className="flex items-start justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <Label className="text-base font-semibold">
                    <Users className="w-4 h-4 inline ml-1" />
                    תהליך הכנסה לתלמידים
                  </Label>
                  <p className="text-sm text-gray-600 mt-1">
                    הפעלת תהליך הכנסה מיוחד לתלמידים חדשים (לא פעיל כרגע)
                  </p>
                </div>
                <Switch
                  checked={formData.student_onboarding_enabled}
                  onCheckedChange={(checked) => handleSwitchChange('student_onboarding_enabled', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Teachers Portal Settings */}
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
              <CardTitle className="flex items-center gap-2 text-xl">
                <GraduationCap className="w-6 h-6 text-green-600" />
                פורטל המורים
                <span className="text-sm font-normal text-gray-500">(ludora.app)</span>
              </CardTitle>
              <p className="text-gray-600 text-sm mt-2">
                הגדרות הקשורות לחוויית המורים והתהליכים המקצועיים
              </p>
            </CardHeader>
            <CardContent className="p-6">
              {/* Teacher Onboarding */}
              <div className="flex items-start justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <Label className="text-base font-semibold">
                    <GraduationCap className="w-4 h-4 inline ml-1" />
                    תהליך הכנסה למורים
                  </Label>
                  <p className="text-sm text-gray-600 mt-1">
                    הפעלת תהליך הכנסה מונחה למורים חדשים הכולל הגדרת פרופיל והכרת המערכת
                  </p>
                </div>
                <Switch
                  checked={formData.teacher_onboarding_enabled}
                  onCheckedChange={(checked) => handleSwitchChange('teacher_onboarding_enabled', checked)}
                />
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
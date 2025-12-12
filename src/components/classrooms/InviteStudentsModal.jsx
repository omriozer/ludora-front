import React, { useState, useEffect } from "react";
import { useUser } from "@/contexts/UserContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getProductTypeName } from "@/config/productTypes";
import { User, StudentInvitation, ParentConsent as ParentConsentEntity, Settings } from "@/services/entities";
import {
  UserPlus,
  Mail,
  Send,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Users,
  Heart,
  X,
  Shield
} from "lucide-react";
import { triggerEmailAutomation } from "@/services/functions";
import { apiRequest } from "@/services/apiClient";

export default function InviteStudentsModal({ isOpen, onClose, classroom, currentUser }) {
  const { settings } = useUser();
  const [studentEmail, setStudentEmail] = useState("");
  const [studentName, setStudentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [personalMessage, setPersonalMessage] = useState("");
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMarkingConsent, setIsMarkingConsent] = useState(false);
  const [isCheckingStudent, setIsCheckingStudent] = useState(false);
  const [studentStatus, setStudentStatus] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setStudentEmail("");
    setStudentName("");
    setParentEmail("");
    setPersonalMessage("");
    setStudentStatus(null);
    setErrors({});
    setShowEmailPreview(false);
  };

  const checkStudentStatus = async (email) => {
    if (!email || !email.includes('@')) {
      setStudentStatus(null);
      return;
    }

    setIsCheckingStudent(true);
    try {
      // Check if user exists
      const users = await User.filter({ email: email });
      const user = users.length > 0 ? users[0] : null;

      if (user) {
        // Check if user has parent consent
        const consents = await ParentConsentEntity.filter({
          student_email: email,
          is_active: true
        });
        const hasParentConsent = consents.length > 0;

        // Check if already invited to this classroom
        const existingInvitations = await StudentInvitation.filter({
          classroom_id: classroom.id,
          student_email: email,
          status: ['pending_parent_consent', 'pending_student_acceptance', 'accepted']
        });
        const hasExistingInvitation = existingInvitations.length > 0;

        setStudentStatus({
          userExists: true,
          hasParentConsent,
          hasExistingInvitation,
          userName: user.display_name || user.full_name,
          existingInvitation: hasExistingInvitation ? existingInvitations[0] : null
        });
      } else {
        setStudentStatus({
          userExists: false,
          hasParentConsent: false,
          hasExistingInvitation: false
        });
      }
    } catch (error) {
      console.error("Error checking student status:", error);
      setStudentStatus(null);
    }
    setIsCheckingStudent(false);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!studentEmail.trim()) {
      newErrors.studentEmail = "חובה להזין כתובת מייל של התלמיד";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(studentEmail)) {
      newErrors.studentEmail = "כתובת המייל אינה תקינה";
    }

    if (!studentName.trim()) {
      newErrors.studentName = "חובה להזין שם התלמיד";
    }

    if (studentStatus && !studentStatus.hasParentConsent && !parentEmail.trim()) {
      newErrors.parentEmail = "נדרש מייל הורה לאישור הרשמה למערכת";
    }

    if (parentEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail)) {
      newErrors.parentEmail = "כתובת מייל ההורה אינה תקינה";
    }

    if (studentStatus?.hasExistingInvitation) {
      newErrors.general = "התלמיד כבר הוזמן לכיתה זו";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const generateInvitationToken = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const handleInviteStudent = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const invitationToken = generateInvitationToken();
      const parentConsentToken = generateInvitationToken(); // Keep generating, might be needed for internal tracking

      // Calculate expiry date
      const expiryDays = settings?.student_invitation_expiry_days || 7;
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + expiryDays);

      // Determine initial status and required data
      const needsParentConsent = studentStatus && !studentStatus.hasParentConsent;
      const initialStatus = needsParentConsent ? "pending_parent_consent" : "pending_student_acceptance";

      // Create invitation record
      const invitationData = {
        classroom_id: classroom.id,
        teacher_id: currentUser.id,
        student_email: studentEmail.trim(),
        student_name: studentName.trim(),
        parent_email: needsParentConsent ? parentEmail.trim() : null, // Only include parent_email if parent consent is needed
        status: initialStatus,
        invitation_token: invitationToken,
        parent_consent_token: parentConsentToken,
        expires_at: expiryDate.toISOString(),
        notes: personalMessage.trim() || null
      };

      await StudentInvitation.create(invitationData);

      // Prepare email data common to both scenarios
      const siteName = settings?.site_name || "מערכת הלמידה";
      const teacherName = currentUser?.display_name || currentUser?.full_name;
      const gradeText = classroom?.grade_level ? getGradeLevelText(classroom.grade_level) : '';
      
      const baseUrl = window.location.origin;
      const privacyPolicyLink = `${baseUrl}/privacy`;
      const termsOfServiceLink = `${baseUrl}/terms`;

      if (needsParentConsent) {
        // Send parent consent request email - Use general ParentConsent page
        const consentLink = `${baseUrl}/parent-consent`; // Changed from token-based to general page
        
        await triggerEmailAutomation({
          triggerType: "parent_consent_request",
          data: {
            parent_email: parentEmail.trim(),
            parent_name: "הורה יקר", // Placeholder, as parent name isn't collected in this form
            student_name: studentName.trim(),
            teacher_name: teacherName,
            classroom_name: classroom.name || `כיתה של ${teacherName}`,
            classroom_grade: gradeText,
            classroom_year: classroom.year || '',
            consent_link: consentLink, // Now points to general page
            privacy_policy_link: privacyPolicyLink,
            terms_of_service_link: termsOfServiceLink,
            site_name: siteName,
            personal_message: personalMessage.trim() || ''
          }
        });
      } else {
        // Send direct student invitation
        const invitationLink = `${baseUrl}/student-invitation`;
        
        await triggerEmailAutomation({
          triggerType: "student_invitation",
          data: {
            student_email: studentEmail.trim(),
            student_name: studentName.trim(),
            teacher_name: teacherName,
            classroom_name: classroom.name || `כיתה של ${teacherName}`,
            classroom_grade: gradeText,
            classroom_year: classroom.year || '',
            invitation_link: invitationLink,
            site_name: siteName,
            personal_message: personalMessage.trim() || ''
          }
        });
      }

      onClose();
      // TODO: Show success toast or callback to parent component

    } catch (error) {
      console.error("Error sending invitation:", error);
      setErrors({ general: "שגיאה בשליחת ההזמנה. אנא נסו שוב." });
    }
    setIsLoading(false);
  };

  const handleMarkConsent = async () => {
    if (!studentEmail.trim() || !studentName.trim()) {
      setErrors({
        studentEmail: !studentEmail.trim() ? "חובה להזין כתובת מייל של התלמיד" : null,
        studentName: !studentName.trim() ? "חובה להזין שם התלמיד" : null
      });
      return;
    }

    setIsMarkingConsent(true);
    try {
      // Find the student user to get their ID
      const users = await User.filter({ email: studentEmail.trim() });
      if (users.length === 0) {
        throw new Error('Student not found in system');
      }

      const studentUser = users[0];

      // Call the mark-consent API endpoint
      await apiRequest('/auth/mark-consent', {
        method: 'POST',
        data: {
          student_id: studentUser.id
        }
      });

      // Update the student status to reflect the consent has been marked
      setStudentStatus(prev => ({
        ...prev,
        hasParentConsent: true
      }));

      // Clear any errors
      setErrors({});

      // TODO: Show success toast or notification

    } catch (error) {
      console.error("Error marking consent:", error);

      // Handle specific error cases
      let errorMessage = "שגיאה בסימון האישור. אנא נסו שוב.";

      if (error.response?.data?.code === 'FEATURE_DISABLED') {
        errorMessage = "סימון אישור על ידי מורה אינו מופעל במערכת";
      } else if (error.response?.data?.code === 'CONSENT_ALREADY_EXISTS') {
        errorMessage = "כבר קיים אישור פעיל לתלמיד זה";
      } else if (error.response?.status === 403) {
        errorMessage = "אין לך הרשאה לסמן אישור עבור תלמיד זה";
      } else if (error.response?.status === 404) {
        errorMessage = "התלמיד לא נמצא במערכת";
      }

      setErrors({ general: errorMessage });
    }
    setIsMarkingConsent(false);
  };

  const getEmailPreviewContent = () => {
    if (!studentStatus || !classroom) return "";

    const siteName = settings?.site_name || "מערכת הלמידה";
    const teacherName = currentUser?.display_name || currentUser?.full_name || "המורה";

    if (studentStatus.hasParentConsent) {
      // Email to student
      return `
נושא: הזמנה להצטרף לכיתת ${classroom?.name || `כיתה של ${teacherName}`}

שלום ${studentName},

${teacherName} הזמינה אותך להצטרף לכיתה שלה במערכת ${siteName}.

פרטי הכיתה:
- שם הכיתה: ${classroom?.name || 'לא צוין'}
- שכבה: ${classroom?.grade_level ? getGradeLevelText(classroom.grade_level) : 'לא צוין'}
- מחזור: ${classroom?.year || 'לא צוין'}

${personalMessage ? `הודעה אישית מהמורה:\n${personalMessage}\n\n` : ''}

לחץ על הכפתור הבא כדי לקבל את ההזמנה ולהצטרף לכיתה:

[כפתור: הצטרף לכיתה]

בברכה,
צוות ${siteName}
      `.trim();
    } else {
      // Email to parent for consent
      return `
נושא: בקשת אישור הורה - הרשמת ${studentName} למערכת הלמידה

שלום,

${teacherName} הזמינה את ${studentName} להצטרף לכיתה שלה במערכת הלמידה ${siteName}.

כדי שהתלמיד יוכל להצטרף לכיתה, אנו זקוקים לאישורכם להרשמה ואיסוף מידע במערכת.

פרטי הכיתה:
- שם הכיתה: ${classroom?.name || 'לא צוין'}
- שכבה: ${classroom?.grade_level ? getGradeLevelText(classroom.grade_level) : 'לא צוין'}
- מחזור: ${classroom?.year || 'לא צוין'}

${personalMessage ? `הודעה אישית מהמורה:\n${personalMessage}\n\n` : ''}

המערכת משמשת למטרות חינוכיות בלבד ומיועדת לעזור לתלמידים להתקדם בלמידה באמצעות ${getProductTypeName('game', 'plural')} חינוכיים.

לחצו על הכפתור הבא למתן אישור:

[כפתור: מתן אישור הורה]

אתם מוזמנים לעיין במדיניות הפרטיות ותנאי השימוש שלנו לפני מתן האישור.

בברכה,
צוות ${siteName}
      `.trim();
    }
  };

  const getGradeLevelText = (gradeLevel) => {
    const gradeMap = {
      kindergarten: "גן חובה",
      grade_1: "כיתה א",
      grade_2: "כיתה ב",
      grade_3: "כיתה ג",
      grade_4: "כיתה ד",
      grade_5: "כיתה ה",
      grade_6: "כיתה ו",
      grade_7: "כיתה ז",
      grade_8: "כיתה ח",
      grade_9: "כיתה ט",
      grade_10: "כיתה י",
      grade_11: "כיתה יא",
      grade_12: "כיתה יב"
    };
    return gradeMap[gradeLevel] || gradeLevel;
  };

  // Add early return if classroom is not available
  if (!classroom) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" hideCloseButton={true}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            הזמנת תלמידים לכיתה
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Classroom Info */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="font-semibold text-blue-900">
                    {classroom?.name || `כיתה של ${currentUser?.display_name || currentUser?.full_name}`}
                  </h3>
                  <p className="text-sm text-blue-700">
                    {classroom?.grade_level && `${getGradeLevelText(classroom.grade_level)} • `}
                    {classroom?.year && `מחזור ${classroom.year}`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {errors.general && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.general}</AlertDescription>
            </Alert>
          )}

          {/* Student Details */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="studentEmail">כתובת מייל של התלמיד *</Label>
              <Input
                id="studentEmail"
                type="email"
                value={studentEmail}
                onChange={(e) => {
                  setStudentEmail(e.target.value);
                  setErrors(prev => ({ ...prev, studentEmail: null }));
                  // Check status after a delay
                  clearTimeout(window.studentEmailTimeout);
                  window.studentEmailTimeout = setTimeout(() => {
                    checkStudentStatus(e.target.value);
                  }, 1000);
                }}
                placeholder="student@example.com"
                className={errors.studentEmail ? "border-red-300" : ""}
              />
              {errors.studentEmail && (
                <p className="text-sm text-red-600">{errors.studentEmail}</p>
              )}

              {isCheckingStudent && (
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  בודק סטטוס תלמיד...
                </div>
              )}

              {studentStatus && (
                <div className="mt-2">
                  {studentStatus.hasExistingInvitation ? (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        התלמיד כבר הוזמן לכיתה זו (סטטוס: {getStatusText(studentStatus.existingInvitation.status)})
                      </AlertDescription>
                    </Alert>
                  ) : studentStatus.userExists ? (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="flex items-center gap-2">
                          <span>התלמיד רשום במערכת</span>
                          {studentStatus.hasParentConsent ? (
                            <Badge className="bg-green-100 text-green-800">יש אישור הורה</Badge>
                          ) : (
                            <Badge className="bg-orange-100 text-orange-800">נדרש אישור הורה</Badge>
                          )}
                        </div>
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        התלמיד לא רשום במערכת - נדרש אישור הורה להרשמה
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="studentName">שם התלמיד *</Label>
              <Input
                id="studentName"
                value={studentName}
                onChange={(e) => {
                  setStudentName(e.target.value);
                  setErrors(prev => ({ ...prev, studentName: null }));
                }}
                placeholder="שם מלא של התלמיד"
                className={errors.studentName ? "border-red-300" : ""}
              />
              {errors.studentName && (
                <p className="text-sm text-red-600">{errors.studentName}</p>
              )}
              {studentStatus?.userName && (
                <p className="text-sm text-blue-600">שם רשום במערכת: {studentStatus.userName}</p>
              )}
            </div>

            {/* Parent Email - only if needed */}
            {studentStatus && !studentStatus.hasParentConsent && (
              <div className="space-y-2">
                <Label htmlFor="parentEmail">כתובת מייל של ההורה *</Label>
                <Input
                  id="parentEmail"
                  type="email"
                  value={parentEmail}
                  onChange={(e) => {
                    setParentEmail(e.target.value);
                    setErrors(prev => ({ ...prev, parentEmail: null }));
                  }}
                  placeholder="parent@example.com"
                  className={errors.parentEmail ? "border-red-300" : ""}
                />
                {errors.parentEmail && (
                  <p className="text-sm text-red-600">{errors.parentEmail}</p>
                )}
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  <Heart className="w-4 h-4 text-pink-500" />
                  ההורה יקבל מייל לאישור הרשמת התלמיד למערכת
                </p>
              </div>
            )}
          </div>

          <Separator />

          {/* Personal Message */}
          <div className="space-y-2">
            <Label htmlFor="personalMessage">הודעה אישית (אופציונלי)</Label>
            <Textarea
              id="personalMessage"
              value={personalMessage}
              onChange={(e) => setPersonalMessage(e.target.value)}
              placeholder="הוסף הודעה אישית שתתווסף למייל ההזמנה..."
              rows={3}
            />
            <p className="text-sm text-gray-500">
              ההודעה תתווסף למייל ההזמנה מתחת לתבנית הקבועה
            </p>
          </div>

          {/* Email Preview */}
          {studentStatus && (
            <div className="space-y-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEmailPreview(!showEmailPreview)}
                className="w-full flex items-center gap-2"
              >
                {showEmailPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showEmailPreview ? 'הסתר תצוגה מקדימה' : 'הצג תצוגה מקדימה של המייל'}
              </Button>

              {showEmailPreview && (
                <Card className="border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      תצוגה מקדימה - {studentStatus.hasParentConsent ? 'מייל לתלמיד' : 'מייל להורה'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-gray-50 p-4 rounded-lg text-sm whitespace-pre-line font-mono">
                      {getEmailPreviewContent()}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={onClose}>
              <X className="w-4 h-4 ml-2" />
              ביטול
            </Button>

            {/* Show mark consent button if teacher consent verification is enabled and student needs consent */}
            {settings?.teacher_consent_verification_enabled &&
             studentStatus &&
             !studentStatus.hasParentConsent &&
             !studentStatus.hasExistingInvitation && (
              <Button
                onClick={handleMarkConsent}
                disabled={isMarkingConsent || !studentEmail.trim() || !studentName.trim()}
                variant="outline"
                className="bg-orange-50 border-orange-300 text-orange-800 hover:bg-orange-100"
              >
                {isMarkingConsent ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600 ml-2"></div>
                    מסמן אישור...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 ml-2" />
                    סמן אישור התקבל
                  </>
                )}
              </Button>
            )}

            <Button
              onClick={handleInviteStudent}
              disabled={isLoading || !studentStatus || studentStatus.hasExistingInvitation}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                  שולח הזמנה...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 ml-2" />
                  שלח הזמנה
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function getStatusText(status) {
  const statusMap = {
    pending_parent_consent: "ממתין לאישור הורה",
    pending_student_acceptance: "ממתין לאישור תלמיד",
    accepted: "התקבל",
    expired: "פג תוקף",
    rejected: "נדחה"
  };
  return statusMap[status] || status;
}

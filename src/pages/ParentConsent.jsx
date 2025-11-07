
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { StudentInvitation, ParentConsent as ParentConsentEntity, User, ClassroomMembership, Classroom } from "@/services/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Shield,
  CheckCircle,
  AlertCircle,
  Loader2,
  LogIn,
  LogOut,
  User as UserIcon,
  Mail,
  PenTool,
  Trash2,
  Check,
  FileText,
  Lock
} from "lucide-react";
import { triggerEmailAutomation } from "@/services/functions";
import { useUser } from "@/contexts/UserContext";
import { cerror, clog } from "@/lib/utils";

export default function ParentConsent() {
  const navigate = useNavigate();
  const { currentUser, isLoading: userLoading } = useUser();

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [matchingInvitations, setMatchingInvitations] = useState([]);

  // Digital signature canvas
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureData, setSignatureData] = useState(null);

  // Form data
  const [formData, setFormData] = useState({
    studentEmail: "",
    parentRelation: "father",
    parentId: "",
    signatureName: "",
    agreeToTerms: false,
    agreeToPrivacy: false,
    agreeToDataCollection: false
  });

  const handleLogin = async () => {
    try {
      await User.loginWithRedirect(window.location.href);
    } catch (error) {
      setError("שגיאה בהתחברות למערכת");
    }
  };

  const handleLogout = async () => {
    try {
      await User.logout();
      resetForm();
    } catch (error) {
      setError("שגיאה בהתנתקות");
    }
  };

  const resetForm = () => {
    setFormData({
      studentEmail: "",
      parentRelation: "father",
      parentId: "",
      signatureName: "",
      agreeToTerms: false,
      agreeToPrivacy: false,
      agreeToDataCollection: false
    });
    setMatchingInvitations([]);
    setError("");
    setShowSuccess(false);
    setSignatureData(null);
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  // Israeli ID validation
  const validateIsraeliId = (id) => {
    if (!/^\d{9}$/.test(id)) return false;
    
    const digits = id.split('').map(Number);
    let sum = 0;
    
    for (let i = 0; i < 9; i++) {
      let digit = digits[i];
      if (i % 2 === 1) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
    }
    
    return sum % 10 === 0;
  };

  // Signature canvas functions
  const startDrawing = (e) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ctx = canvas.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    // Save signature data
    const canvas = canvasRef.current;
    const signatureUrl = canvas.toDataURL();
    setSignatureData(signatureUrl);
  };

  // Touch events for mobile
  const startDrawingTouch = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    setIsDrawing(true);
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const drawTouch = (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    
    const touch = e.touches[0];
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    const ctx = canvas.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawingTouch = (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    setIsDrawing(false);
    
    const canvas = canvasRef.current;
    const signatureUrl = canvas.toDataURL();
    setSignatureData(signatureUrl);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureData(null);
  };

  useEffect(() => {
    // Initialize canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }, []); // Removed canvasRef.current from dependency array

  const checkStudentConnection = async () => {
    if (!formData.studentEmail.trim()) {
      setError("יש למלא כתובת מייל של הילד");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");

      const invitations = await StudentInvitation.filter({ 
        parent_email: currentUser.email,
        student_email: formData.studentEmail.trim()
      });

      if (invitations.length === 0) {
        setError(`לא נמצא קשר בין המייל שלך (${currentUser.email}) למייל הילד (${formData.studentEmail}). אנא בדוק עם המורה שהמייל הוזן נכון בהזמנה.`);
        setMatchingInvitations([]);
        return;
      }

      setMatchingInvitations(invitations);
      setError("");

    } catch (err) {
      setError("שגיאה בבדיקת הקשר: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (matchingInvitations.length === 0) {
      setError("יש לבדוק תחילה את הקשר עם מייל הילד");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      // Validation
      if (!formData.parentId.trim()) {
        throw new Error("יש למלא מספר תעודת זהות");
      }
      if (!validateIsraeliId(formData.parentId.trim())) {
        throw new Error("מספר תעודת זהות לא תקין");
      }
      if (!signatureData) {
        throw new Error("יש לחתום על הטופס");
      }
      if (!formData.signatureName.trim()) {
        throw new Error("יש למלא שם מלא לחתימה");
      }
      if (!formData.agreeToTerms || !formData.agreeToPrivacy || !formData.agreeToDataCollection) {
        throw new Error("יש לאשר את כל תנאי השימוש והפרטיות");
      }

      // Check if student already has a user account
      let studentUser = null;
      try {
        const users = await User.filter({ email: formData.studentEmail });
        studentUser = users.length > 0 ? users[0] : null;
      } catch (error) {
        clog("No existing user found for student email", error);
      }

      // Create consent record
      const consentText = `אני, ${formData.signatureName}, ת.ז. ${formData.parentId}, הורה/אפוטרופוס של ${formData.studentEmail}, מאשר את הרשמת ילדי למערכת הלמידה והסכמתי לתנאי השירות ומדיניות הפרטיות.`;

      const consentData = {
        student_email: formData.studentEmail,
        parent_email: currentUser.email,
        parent_name: formData.signatureName,
        parent_id: formData.parentId,
        parent_relation: formData.parentRelation,
        consent_text: consentText,
        digital_signature: signatureData,
        signature_ip: "127.0.0.1",
        signature_user_agent: navigator.userAgent,
        is_active: true
      };

      if (studentUser) {
        consentData.student_user_id = studentUser.id;
      }

      await ParentConsentEntity.create(consentData);

      // Update all matching invitations and send emails
      for (const invitation of matchingInvitations) {
        const updateData = {
          status: 'pending_student_acceptance',
          parent_consent_given_at: new Date().toISOString()
        };

        // Link invitation to student user if found
        if (studentUser) {
          updateData.student_user_id = studentUser.id;
        }

        await StudentInvitation.update(invitation.id, updateData);

        try {
          // Get teacher and classroom details for emails
          const [teacher, classroom] = await Promise.all([
            User.get(invitation.teacher_id).catch((err) => {
              cerror("Error fetching teacher:", err);
              return null;
            }),
            invitation.classroom_id ? Classroom.get(invitation.classroom_id).catch((err) => {
              cerror("Error fetching classroom:", err);
              return null;
            }) : null
          ]);

          const siteName = 'לודורה';
          const baseUrl = window.location.origin;

          // Send email to teacher about parent consent approval
          await triggerEmailAutomation({
            triggerType: "parent_consent_approved",
            data: {
              teacher_email: teacher?.email || invitation.teacher_id, // Use teacher.email if available, else fallback
              teacher_name: teacher?.display_name || teacher?.full_name || "המורה",
              parent_name: formData.signatureName,
              student_name: invitation.student_name,
              student_email: invitation.student_email,
              classroom_name: classroom?.name || `הכיתה`,
              site_name: siteName,
              consent_date: new Date().toLocaleDateString('he-IL')
            }
          });

          // Send invitation email to student - redirect to general invitations page
          await triggerEmailAutomation({
            triggerType: "student_invitation",
            data: {
              student_email: invitation.student_email,
              student_name: invitation.student_name,
              teacher_name: teacher?.display_name || teacher?.full_name || "המורה",
              classroom_name: classroom?.name || `הכיתה`,
              classroom_grade: classroom?.grade_level ? getGradeLevelText(classroom.grade_level) : "",
              classroom_year: classroom?.year || "",
              invitation_link: `${baseUrl}/StudentInvitations`, // Changed to general page
              site_name: siteName,
              personal_message: invitation.notes || ''
            }
          });

        } catch (emailError) {
          cerror("Error sending emails:", emailError);
          // Don't fail the whole process if emails fail
        }
      }

      setShowSuccess(true);
      setFormData(prev => ({ ...prev, studentEmail: "", parentId: "", signatureName: "" }));

    } catch (err) {
      setError(err.message || "שגיאה בשמירת האישור");
    } finally {
      setIsSubmitting(false);
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

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">טוען...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8 px-4 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-20 w-32 h-32 bg-blue-500 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-purple-500 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-pink-500 rounded-full blur-2xl animate-pulse delay-500"></div>
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 rounded-3xl shadow-2xl mb-6 transform rotate-3 hover:rotate-0 transition-transform duration-300">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            אישור הורים להרשמה
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            נדרש אישור הורים לצורך הרשמת ילדכם למערכת הלמידה החדשנית שלנו
          </p>
        </div>

        {!currentUser ? (
          // Login Card
          <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-xl">
            <CardHeader className="text-center pb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <LogIn className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl">נדרשת התחברות למערכת</CardTitle>
              <p className="text-gray-600 mt-2">כדי לתת אישור הורים, עליכם להתחבר למערכת תחילה</p>
            </CardHeader>
            <CardContent className="text-center pb-8">
              <Button 
                onClick={handleLogin} 
                size="lg"
                className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 text-white px-12 py-4 text-lg font-bold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
              >
                <LogIn className="w-6 h-6 ml-2" />
                התחבר למערכת
              </Button>
            </CardContent>
          </Card>

        ) : showSuccess ? (
          // Success Card
          <Card className="shadow-2xl border-0 border-t-8 border-t-green-500 bg-white/90 backdrop-blur-xl">
            <CardContent className="text-center py-12">
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-green-800 mb-6">
                🎉 אישור הורים נשמר בהצלחה!
              </h2>
              <div className="bg-green-50 border border-green-200 rounded-2xl p-6 mb-8">
                <p className="text-green-700 text-lg leading-relaxed">
                  תודה רבה על מתן האישור. המערכת עדכנה את המורה והתלמיד יוכל כעת להצטרף לכיתה ולהתחיל ללמוד!
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  onClick={resetForm} 
                  variant="outline"
                  size="lg"
                  className="px-8 py-3"
                >
                  <FileText className="w-5 h-5 ml-2" />
                  מלא אישור חדש
                </Button>
                <Button 
                  onClick={handleLogout} 
                  variant="outline"
                  size="lg"
                  className="px-8 py-3"
                >
                  <LogOut className="w-5 h-5 ml-2" />
                  התנתק
                </Button>
              </div>
            </CardContent>
          </Card>

        ) : (
          // Main Form
          <Card className="shadow-2xl border-0 bg-white/90 backdrop-blur-xl">
            <CardHeader className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <UserIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">טופס אישור הורים</CardTitle>
                    <p className="text-white/90 mt-1">משתמש: {currentUser.full_name} • {currentUser.email}</p>
                  </div>
                </div>
                <Button 
                  onClick={handleLogout} 
                  variant="outline" 
                  size="sm"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <LogOut className="w-4 h-4 ml-1" />
                  התנתק
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="p-8 space-y-8">
              {error && (
                <Alert variant="destructive" className="border-red-200 bg-red-50">
                  <AlertCircle className="h-5 w-5" />
                  <AlertDescription className="text-lg">{error}</AlertDescription>
                </Alert>
              )}

              {/* Student Email Section */}
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
                  <Label htmlFor="studentEmail" className="text-lg font-semibold text-blue-900 mb-3 block">
                    כתובת מייל של הילד *
                  </Label>
                  <div className="flex gap-3">
                    <Input
                      id="studentEmail"
                      type="email"
                      value={formData.studentEmail}
                      onChange={(e) => setFormData(prev => ({ ...prev, studentEmail: e.target.value }))}
                      placeholder="student@example.com"
                      className="flex-1 h-12 text-lg border-blue-200 focus:border-blue-500"
                    />
                    <Button 
                      onClick={checkStudentConnection}
                      disabled={isSubmitting || !formData.studentEmail.trim()}
                      className="bg-blue-600 hover:bg-blue-700 px-8 h-12"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Check className="w-5 h-5 ml-2" />
                          בדוק קשר
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-blue-600 text-sm mt-2">
                    הזינו את כתובת המייל של ילדכם כפי שהוזנה על ידי המורה
                  </p>
                </div>

                {/* Connection Status */}
                {matchingInvitations.length > 0 && (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <AlertDescription className="text-green-800 text-lg">
                      ✅ נמצא קשר תקף! נמצאו {matchingInvitations.length} הזמנות המקשרות את המייל שלכם למייל הילד.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Form Fields (only show if connection verified) */}
              {matchingInvitations.length > 0 && (
                <form onSubmit={handleSubmit} className="space-y-8">
                  
                  {/* Parent Details Section */}
                  <div className="bg-purple-50 border border-purple-200 rounded-2xl p-6 space-y-6">
                    <h3 className="text-xl font-bold text-purple-900 mb-4 flex items-center gap-2">
                      <Lock className="w-6 h-6" />
                      פרטים אישיים
                    </h3>

                    {/* Parent Relation */}
                    <div className="space-y-2">
                      <Label htmlFor="parentRelation" className="text-lg font-semibold">קשר משפחתי לילד *</Label>
                      <Select 
                        value={formData.parentRelation} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, parentRelation: value }))}
                      >
                        <SelectTrigger className="h-12 text-lg border-purple-200 focus:border-purple-500">
                          <SelectValue placeholder="בחר קשר משפחתי" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="father">👨‍👧‍👦 אבא</SelectItem>
                          <SelectItem value="mother">👩‍👧‍👦 אמא</SelectItem>
                          <SelectItem value="guardian">👤 אפוטרופוס</SelectItem>
                          <SelectItem value="other">🤝 אחר</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Parent ID */}
                    <div className="space-y-2">
                      <Label htmlFor="parentId" className="text-lg font-semibold">מספר תעודת זהות *</Label>
                      <Input
                        id="parentId"
                        value={formData.parentId}
                        onChange={(e) => setFormData(prev => ({ ...prev, parentId: e.target.value.replace(/\D/g, '') }))}
                        placeholder="123456789"
                        maxLength={9}
                        className="h-12 text-lg border-purple-200 focus:border-purple-500"
                      />
                      {formData.parentId && !validateIsraeliId(formData.parentId) && (
                        <p className="text-red-600 text-sm">מספר תעודת זהות אינו תקין</p>
                      )}
                    </div>

                    {/* Signature Name */}
                    <div className="space-y-2">
                      <Label htmlFor="signatureName" className="text-lg font-semibold">שם מלא לחתימה *</Label>
                      <Input
                        id="signatureName"
                        value={formData.signatureName}
                        onChange={(e) => setFormData(prev => ({ ...prev, signatureName: e.target.value }))}
                        placeholder="הקלידו את שמכם המלא כפי שמופיע בתעודת הזהות"
                        className="h-12 text-lg border-purple-200 focus:border-purple-500"
                      />
                    </div>
                  </div>

                  {/* Digital Signature Section */}
                  <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-6">
                    <h3 className="text-xl font-bold text-indigo-900 mb-4 flex items-center gap-2">
                      <PenTool className="w-6 h-6" />
                      חתימה דיגיטלית *
                    </h3>
                    <p className="text-indigo-700 mb-4">
                      אנא חתמו באזור הלבן למטה. החתימה הדיגיטלית מהווה אישור משפטי לתנאים.
                    </p>
                    
                    <div className="border-2 border-dashed border-indigo-300 rounded-xl p-4 bg-white">
                      <canvas
                        ref={canvasRef}
                        width={600}
                        height={200}
                        className="w-full h-48 border border-gray-300 rounded-lg cursor-crosshair touch-none"
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawingTouch}
                        onTouchMove={drawTouch}
                        onTouchEnd={stopDrawingTouch}
                      />
                      <div className="flex justify-between items-center mt-4">
                        <p className="text-sm text-gray-600">חתמו כאן עם העכבר או האצבע</p>
                        <Button
                          type="button"
                          onClick={clearSignature}
                          variant="outline"
                          size="sm"
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 ml-1" />
                          נקה חתימה
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Agreements Section */}
                  <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
                    <h3 className="text-xl font-bold text-green-900 mb-6">הסכמות נדרשות</h3>
                    <div className="space-y-6">
                      <div className="flex items-start gap-4 p-4 bg-white rounded-xl border border-green-200">
                        <Checkbox
                          id="terms"
                          checked={formData.agreeToTerms}
                          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, agreeToTerms: checked }))}
                          className="mt-1"
                        />
                        <Label htmlFor="terms" className="text-base leading-relaxed cursor-pointer">
                          אני מאשר את <a href="/terms" target="_blank" className="text-blue-600 underline font-semibold">תנאי השימוש</a> של המערכת
                        </Label>
                      </div>

                      <div className="flex items-start gap-4 p-4 bg-white rounded-xl border border-green-200">
                        <Checkbox
                          id="privacy"
                          checked={formData.agreeToPrivacy}
                          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, agreeToPrivacy: checked }))}
                          className="mt-1"
                        />
                        <Label htmlFor="privacy" className="text-base leading-relaxed cursor-pointer">
                          אני מסכים ל<a href="/privacy" target="_blank" className="text-blue-600 underline font-semibold">מדיניות הפרטיות</a> של המערכת
                        </Label>
                      </div>

                      <div className="flex items-start gap-4 p-4 bg-white rounded-xl border border-green-200">
                        <Checkbox
                          id="dataCollection"
                          checked={formData.agreeToDataCollection}
                          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, agreeToDataCollection: checked }))}
                          className="mt-1"
                        />
                        <Label htmlFor="dataCollection" className="text-base leading-relaxed cursor-pointer">
                          אני מסכים לאיסוף ועיבוד נתונים של ילדי למטרות חינוכיות בלבד
                        </Label>
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4">
                    <Button 
                      type="submit" 
                      disabled={isSubmitting}
                      size="lg"
                      className="w-full bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 hover:from-green-700 hover:via-blue-700 hover:to-purple-700 text-white py-6 text-xl font-bold shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-6 h-6 animate-spin ml-2" />
                          שומר אישור...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-6 h-6 ml-2" />
                          ✨ אשר והגש את הטופס ✨
                        </>
                      )}
                    </Button>
                    
                    <p className="text-center text-gray-500 text-sm mt-4">
                      לחיצה על הכפתור מהווה הסכמה מלאה לתנאים ואישור חתימה דיגיטלית
                    </p>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

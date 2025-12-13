import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { Classroom, ClassroomMembership, StudentInvitation } from "@/services/entities";
import { apiRequest } from "@/services/apiClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft,
  Users,
  UserPlus,
  BookOpen,
  GraduationCap,
  Settings,
  Loader2,
  AlertTriangle,
  Eye,
  Mail,
  Calendar,
  Trash2
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import InviteStudentsModal from "../components/classrooms/InviteStudentsModal";
import LudoraLoadingSpinner from "@/components/ui/LudoraLoadingSpinner";
import SEOHead from '@/components/SEOHead';
import { ludlog, luderror } from '@/lib/ludlog';
import { haveAdminAccess } from "@/utils/adminCheck";

export default function ClassroomManagement() {
  const { classroomId } = useParams();
  const navigate = useNavigate();
  const { currentUser, settings, isLoading: userLoading } = useUser();

  // State management
  const [classroom, setClassroom] = useState(null);
  const [activeStudents, setActiveStudents] = useState([]);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      ludlog.ui('Loading classroom management data:', { classroomId });

      // Load classroom data
      const classroomData = await Classroom.findById(classroomId);
      setClassroom(classroomData);

      // Verify user has access to this classroom
      if (!haveAdminAccess(currentUser?.role, 'admin_access', settings) && classroomData.teacher_id !== currentUser?.id) {
        toast({
          title: "אין הרשאה",
          description: "אין לך הרשאה לנהל כיתה זו",
          variant: "destructive"
        });
        navigate('/classrooms');
        return;
      }

      // Load active students
      const activeMembers = await ClassroomMembership.filter({
        classroom_id: classroomId,
        status: 'active'
      });
      setActiveStudents(activeMembers);

      // Load pending invitations
      const pending = await StudentInvitation.filter({
        classroom_id: classroomId,
        status: ['pending_parent_consent', 'pending_student_acceptance']
      });
      setPendingInvitations(pending);

      ludlog.ui('Classroom management data loaded successfully');
    } catch (error) {
      luderror.ui('Error loading classroom management data:', error);
      toast({
        title: "שגיאה",
        description: "שגיאה בטעינת נתוני הכיתה",
        variant: "destructive"
      });
    }
    setIsLoading(false);
  }, [classroomId, currentUser, navigate]);

  useEffect(() => {
    if (!userLoading && currentUser && settings) {
      loadData();
    }
  }, [loadData, userLoading, currentUser, settings]);

  const handleRemoveStudent = async (membershipId) => {
    try {
      ludlog.ui('Removing student from classroom:', { membershipId });
      await apiRequest(`/entities/classroom-membership/${membershipId}`, {
        method: 'DELETE'
      });

      toast({
        title: "תלמיד הוסר",
        description: "התלמיד הוסר בהצלחה מהכיתה",
        variant: "default"
      });

      // Reload data to reflect changes
      loadData();
    } catch (error) {
      luderror.ui('Error removing student:', error);
      toast({
        title: "שגיאה",
        description: "שגיאה בהסרת התלמיד",
        variant: "destructive"
      });
    }
  };

  const handleResendInvitation = async (invitationId) => {
    try {
      ludlog.ui('Resending invitation:', { invitationId });
      await apiRequest(`/entities/student-invitation/${invitationId}/resend`, {
        method: 'POST'
      });

      toast({
        title: "הזמנה נשלחה",
        description: "ההזמנה נשלחה שוב בהצלחה",
        variant: "default"
      });
    } catch (error) {
      luderror.ui('Error resending invitation:', error);
      toast({
        title: "שגיאה",
        description: "שגיאה בשליחת ההזמנה",
        variant: "destructive"
      });
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

  const formatDate = (dateString) => {
    if (!dateString) return 'לא זמין';

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'תאריך לא תקין';

    return date.toLocaleDateString('he-IL');
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pending_parent_consent: { text: "ממתין להסכמת הורה", variant: "secondary" },
      pending_student_acceptance: { text: "ממתין לתלמיד", variant: "outline" }
    };
    return statusMap[status] || { text: status, variant: "outline" };
  };

  if (userLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50" dir="rtl">
        <div className="container mx-auto px-4 py-8">
          <LudoraLoadingSpinner size="lg" text="טוען נתוני כיתה..." />
        </div>
      </div>
    );
  }

  if (!classroom) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50" dir="rtl">
        <div className="container mx-auto px-4 py-8">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>כיתה לא נמצאה</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEOHead title={`ניהול כיתה - ${classroom.name || getGradeLevelText(classroom.grade_level)}`} />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50" dir="rtl">
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">

          {/* Header with breadcrumb */}
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate('/classrooms')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              חזור לכיתות
            </Button>
            <div className="text-sm text-gray-500">
              הכיתות שלי / {classroom.name || getGradeLevelText(classroom.grade_level)} / ניהול כיתה
            </div>
          </div>

          {/* Page Header */}
          <div className="text-center space-y-4 mb-8">
            <div className="w-20 h-20 bg-gradient-to-r from-teal-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg mx-auto">
              <Settings className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900">ניהול כיתה</h1>
            <div className="flex items-center justify-center gap-2">
              <GraduationCap className="w-5 h-5 text-gray-600" />
              <span className="text-lg text-gray-600">
                {classroom.name || getGradeLevelText(classroom.grade_level)}
              </span>
              {classroom.year && (
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  {classroom.year}
                </Badge>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                פעולות מהירות
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  onClick={() => setShowInviteModal(true)}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
                >
                  <UserPlus className="w-5 h-5 ml-2" />
                  הזמן תלמיד חדש
                </Button>
                <Button
                  onClick={() => navigate(`/classroom/${classroomId}/curriculum`)}
                  variant="outline"
                  className="border-green-200 text-green-600 hover:bg-green-50"
                >
                  <BookOpen className="w-5 h-5 ml-2" />
                  תכנית לימודים
                </Button>
                <Button
                  onClick={() => navigate('/classrooms')}
                  variant="outline"
                  className="border-gray-200 text-gray-600 hover:bg-gray-50"
                >
                  <Eye className="w-5 h-5 ml-2" />
                  חזור לרשימת כיתות
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Active Students */}
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-green-600" />
                  תלמידים פעילים ({activeStudents.length})
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {activeStudents.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">אין תלמידים פעילים בכיתה זו</p>
                  <Button
                    onClick={() => setShowInviteModal(true)}
                    className="mt-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
                  >
                    <UserPlus className="w-4 h-4 ml-2" />
                    הזמן תלמיד ראשון
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeStudents.map(student => (
                    <div key={student.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <Users className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {student.student_display_name || student.Student?.full_name || student.student_id}
                          </p>
                          <p className="text-sm text-gray-500">
                            הצטרף בתאריך: {formatDate(student.joined_at || student.approved_at)}
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleRemoveStudent(student.id)}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Invitations */}
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-orange-600" />
                  הזמנות ממתינות ({pendingInvitations.length})
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {pendingInvitations.length === 0 ? (
                <div className="text-center py-8">
                  <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">אין הזמנות ממתינות</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingInvitations.map(invitation => {
                    const statusInfo = getStatusBadge(invitation.status);
                    return (
                      <div key={invitation.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                            <Mail className="w-4 h-4 text-orange-600" />
                          </div>
                          <div>
                            <p className="font-medium">{invitation.student_name}</p>
                            <p className="text-sm text-gray-500">{invitation.student_email}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant={statusInfo.variant}>{statusInfo.text}</Badge>
                              <span className="text-xs text-gray-400">
                                נשלח: {formatDate(invitation.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleResendInvitation(invitation.id)}
                          variant="outline"
                          size="sm"
                          className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        >
                          שלח שוב
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Invite Students Modal */}
        <InviteStudentsModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          classroom={classroom}
          currentUser={currentUser}
          onInviteSuccess={loadData} // Reload data when invitation is sent
        />
      </div>
    </>
  );
}
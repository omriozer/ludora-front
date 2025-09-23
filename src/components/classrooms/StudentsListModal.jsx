import React, { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { StudentInvitation, User, GameSession, ClassroomMembership } from "@/services/entities";
import {
  Users,
  UserPlus,
  CheckCircle,
  Clock,
  AlertTriangle,
  Trash2,
  X,
  Mail,
  Calendar,
  Activity
} from "lucide-react";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import { triggerEmailAutomation } from "@/services/functions";

export default function StudentsListModal({ isOpen, onClose, classroom, onInviteStudents }) {
  const [students, setStudents] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [message, setMessage] = useState(null);

  const loadStudentsAndInvitations = useCallback(async () => {
    if (!classroom) return;

    setIsLoading(true);
    try {
      // Load classroom memberships (active students)
      const memberships = await ClassroomMembership.filter({
        classroom_id: classroom.id,
        status: 'active'
      });

      // Load user data for active members
      const studentData = [];
      for (const membership of memberships) {
        try {
          const user = await User.findById(membership.student_user_id); // FIX: use findById instead of get
          if (user) {
            studentData.push({
              ...user,
              membership: membership, // Attach the membership object
              joinedAt: membership.joined_at,
              displayName: membership.student_display_name || user.display_name || user.full_name || user.email // Fallback to email
            });
          }
        } catch (error) {
          console.error("Error loading student data for membership:", error);
        }
      }

      setStudents(studentData);

      // Load pending invitations
      const classroomInvitations = await StudentInvitation.filter({
        classroom_id: classroom.id,
        status: ['pending_parent_consent', 'pending_student_acceptance', 'expired', 'rejected'] // Also show expired/rejected as 'pending' for management
      });

      setInvitations(classroomInvitations);

    } catch (error) {
      console.error("Error loading students and invitations:", error);
      setMessage({ type: 'error', text: 'שגיאה בטעינת רשימת התלמידים' });
    }
    setIsLoading(false);
  }, [classroom]);

  useEffect(() => {
    if (isOpen && classroom) {
      loadStudentsAndInvitations();
    }
  }, [isOpen, classroom, loadStudentsAndInvitations]);

  const getStatusText = (status) => {
    const statusMap = {
      pending_parent_consent: "ממתין לאישור הורה",
      pending_student_acceptance: "ממתין לאישור תלמיד",
      accepted: "פעיל בכיתה",
      expired: "פג תוקף",
      rejected: "נדחה"
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status) => {
    const colorMap = {
      pending_parent_consent: "bg-orange-100 text-orange-800",
      pending_student_acceptance: "bg-blue-100 text-blue-800",
      accepted: "bg-green-100 text-green-800",
      expired: "bg-gray-100 text-gray-800",
      rejected: "bg-red-100 text-red-800"
    };
    return colorMap[status] || "bg-gray-100 text-gray-800";
  };

  const getStatusIcon = (status) => {
    const iconMap = {
      pending_parent_consent: Clock,
      pending_student_acceptance: Mail,
      accepted: CheckCircle,
      expired: AlertTriangle,
      rejected: X
    };
    const IconComponent = iconMap[status] || Clock;
    return <IconComponent className="w-4 h-4" />;
  };

  const handleDeleteStudent = (student) => {
    setStudentToDelete(student);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteStudent = async () => {
    if (!studentToDelete) return;

    try {
      const isActiveMember = studentToDelete.membership;

      if (isActiveMember) {
        // For active members: delete membership and related classroom game sessions
        await ClassroomMembership.delete(studentToDelete.membership.id);

        // Delete game sessions related to this classroom for this specific user
        const gameSessions = await GameSession.filter({
          user_id: studentToDelete.id,
          classroom_id: classroom.id
        });

        for (const session of gameSessions) {
          await GameSession.delete(session.id);
        }

        setMessage({
          type: 'success',
          text: `התלמיד ${studentToDelete.displayName} הוסר מהכיתה וכל הנתונים הקשורים נמחקו`
        });
      } else {
        // For pending invitations: just delete the invitation record
        await StudentInvitation.delete(studentToDelete.id);
        setMessage({
          type: 'success',
          text: 'ההזמנה נמחקה בהצלחה'
        });
      }

      setShowDeleteConfirm(false);
      setStudentToDelete(null);
      loadStudentsAndInvitations(); // Reload the list

      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);

    } catch (error) {
      console.error("Error deleting student:", error);
      setMessage({ type: 'error', text: 'שגיאה במחיקת התלמיד' });
    }
  };

  const handleResendInvitation = async (invitation) => {
    try {
      setMessage({ type: 'info', text: 'שולח מייל חוזר...' });

      const siteName = 'לודורה'; // או לטעון מההגדרות
      const teacherName = 'המורה'; // או לטעון מהמשתמש הנוכחי
      const baseUrl = window.location.origin;

      if (invitation.status === 'pending_parent_consent') {
        // שלח מייל חוזר להורה
        const gradeText = classroom?.grade_level ? getGradeLevelText(classroom.grade_level) : '';

        await triggerEmailAutomation({
          triggerType: "parent_consent_request",
          data: {
            parent_email: invitation.parent_email,
            parent_name: invitation.parent_name || "הורה יקר",
            student_name: invitation.student_name,
            teacher_name: teacherName,
            classroom_name: classroom.name || `כיתה של ${teacherName}`,
            classroom_grade: gradeText,
            classroom_year: classroom.year || '',
            consent_link: `${baseUrl}/ParentConsent`,
            privacy_policy_link: `${baseUrl}/privacy`,
            terms_of_service_link: `${baseUrl}/terms`,
            site_name: siteName,
            personal_message: invitation.notes || '',
            expiry_date: invitation.expires_at
          }
        });

        setMessage({ type: 'success', text: `מייל אישור הורה נשלח מחדש ל-${invitation.parent_email}` });

      } else if (invitation.status === 'pending_student_acceptance') {
        // שלח מייל חוזר לתלמיד
        const gradeText = classroom?.grade_level ? getGradeLevelText(classroom.grade_level) : '';
        const invitationLink = `${baseUrl}/StudentInvitations`; // Changed to general page

        await triggerEmailAutomation({
          triggerType: "student_invitation",
          data: {
            student_email: invitation.student_email,
            student_name: invitation.student_name,
            teacher_name: teacherName,
            classroom_name: classroom.name || `כיתה של ${teacherName}`,
            classroom_grade: gradeText,
            classroom_year: classroom.year || '',
            invitation_link: invitationLink, // Now points to general page
            site_name: siteName,
            personal_message: invitation.notes || ''
          }
        });

        setMessage({ type: 'success', text: `מייל הזמנה נשלח מחדש ל-${invitation.student_email}` });
      }

      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);

    } catch (error) {
      console.error("Error resending invitation:", error);
      setMessage({ type: 'error', text: 'שגיאה בשליחת המייל החוזר' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'לא זמין';
    return new Date(dateString).toLocaleDateString('he-IL');
  };

  if (!classroom) return null;

  const totalStudents = students.length;
  const pendingInvitations = invitations.length; // invitations state now only holds pending ones

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              תלמידי {classroom.name || `כיתת ${classroom.grade_level ? getGradeLevelText(classroom.grade_level) : ''}`}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Classroom Summary */}
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-blue-600" />
                    <div>
                      <h3 className="font-semibold text-blue-900">סיכום כיתה</h3>
                      <p className="text-sm text-blue-700">
                        {totalStudents} תלמידים פעילים • {pendingInvitations} הזמנות ממתינות
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={onInviteStudents}
                    size="sm"
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                  >
                    <UserPlus className="w-4 h-4 ml-2" />
                    הזמן תלמידים
                  </Button>
                </div>
              </CardContent>
            </Card>

            {message && (
              <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
                <AlertDescription>{message.text}</AlertDescription>
              </Alert>
            )}

            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">טוען רשימת תלמידים...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Active Students */}
                {students.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      תלמידים פעילים ({students.length})
                    </h3>
                    <div className="space-y-3">
                      {students.map((student) => (
                        <Card key={student.id} className="border-green-200 bg-green-50">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-teal-500 rounded-full flex items-center justify-center">
                                    <span className="text-white font-semibold text-sm">
                                      {student.displayName[0].toUpperCase()}
                                    </span>
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-green-900">
                                      {student.displayName}
                                    </h4>
                                    <p className="text-sm text-green-700">{student.email}</p>
                                  </div>
                                  <Badge className="bg-green-500 text-white">
                                    <CheckCircle className="w-3 h-3 ml-1" />
                                    פעיל
                                  </Badge>
                                </div>
                                <div className="text-xs text-green-600 flex items-center gap-4">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    הצטרף: {formatDate(student.joinedAt)}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Activity className="w-3 h-3" />
                                    פעילות אחרונה: {formatDate(student.updated_date)}
                                  </span>
                                </div>
                              </div>
                              <Button
                                onClick={() => handleDeleteStudent(student)}
                                variant="destructive"
                                size="sm"
                                className="ml-3"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pending Invitations */}
                {invitations.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-orange-600" />
                      הזמנות ממתינות ({invitations.length})
                    </h3>
                    <div className="space-y-3">
                      {invitations.map((invitation) => (
                        <Card key={invitation.id} className="border-orange-200 bg-orange-50">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-full flex items-center justify-center">
                                    <span className="text-white font-semibold text-sm">
                                      {invitation.student_name ? invitation.student_name[0].toUpperCase() : invitation.student_email[0].toUpperCase()}
                                    </span>
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-orange-900">
                                      {invitation.student_name || invitation.student_email}
                                    </h4>
                                    <p className="text-sm text-orange-700">{invitation.student_email}</p>
                                  </div>
                                  <Badge className={getStatusColor(invitation.status)}>
                                    {getStatusIcon(invitation.status)}
                                    <span className="ml-1">{getStatusText(invitation.status)}</span>
                                  </Badge>
                                </div>
                                <div className="text-xs text-orange-600 flex items-center gap-4">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    הוזמן: {formatDate(invitation.created_date)}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    פג תוקף: {formatDate(invitation.expires_at)}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 ml-3">
                                {/* Resend Email Button */}
                                {(invitation.status === 'pending_parent_consent' || invitation.status === 'pending_student_acceptance') && (
                                  <Button
                                    onClick={() => handleResendInvitation(invitation)}
                                    variant="outline"
                                    size="sm"
                                    className="text-blue-600 border-blue-300 hover:bg-blue-50"
                                    title={`שלח מחדש מייל ${invitation.status === 'pending_parent_consent' ? 'להורה' : 'לתלמיד'}`}
                                  >
                                    <Mail className="w-4 h-4" />
                                  </Button>
                                )}

                                {/* Delete Button */}
                                <Button
                                  onClick={() => handleDeleteStudent(invitation)}
                                  variant="destructive"
                                  size="sm"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {students.length === 0 && invitations.length === 0 && (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">אין תלמידים בכיתה</h3>
                    <p className="text-gray-600 mb-4">התחל להזמין תלמידים לכיתה שלך</p>
                    <Button
                      onClick={onInviteStudents}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                    >
                      <UserPlus className="w-5 h-5 ml-2" />
                      הזמן תלמידים
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setStudentToDelete(null);
        }}
        onConfirm={confirmDeleteStudent}
        title={studentToDelete?.membership ? "מחיקת תלמיד מהכיתה" : "מחיקת הזמנה"}
        message={
          studentToDelete?.membership ?
            `האם אתה בטוח שברצונך להסיר את ${studentToDelete?.displayName} מהכיתה?

⚠️ פעולה זו תמחק לצמיתות:
• את כל נתוני המשחקים והפעילות של התלמיד מהכיתה הזו.
• את החיבור שלו לכיתה שלך.

שימו לב: פרופיל התלמיד במערכת לא יימחק, אלא רק החיבור הספציפי לכיתה זו.

פעולה זו אינה ניתנת לביטול!` :
            `האם אתה בטוח שברצונך למחוק את ההזמנה של ${studentToDelete?.student_name || studentToDelete?.student_email}?

פעולה זו תמחק את ההזמנה ותצטרך ליצור הזמנה חדשה אם תרצה להזמין את התלמיד שוב.`
        }
        confirmText={studentToDelete?.membership ? "כן, הסר תלמיד" : "כן, מחק הזמנה"}
        cancelText="ביטול"
        variant="destructive"
      />
    </>
  );
}

function getGradeLevelText(gradeLevel) {
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
}

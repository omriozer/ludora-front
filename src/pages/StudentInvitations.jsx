import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { StudentInvitation, User, Classroom, ClassroomMembership } from "@/services/entities";
import { useUser } from "@/contexts/UserContext";
import { cerror } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle,
  X,
  Clock,
  GraduationCap,
  User as UserIcon,
  Mail,
  Calendar,
  Users,
  Check,
  AlertCircle,
  LogIn
} from "lucide-react";

export default function StudentInvitations() {
  const navigate = useNavigate();
  const { currentUser, isLoading: userLoading } = useUser();

  const [invitations, setInvitations] = useState([]);
  const [classrooms, setClassrooms] = useState({});
  const [teachers, setTeachers] = useState({});
  const [error, setError] = useState("");
  const [processingInvitation, setProcessingInvitation] = useState(null);

  useEffect(() => {
    if (!userLoading && currentUser) {
      loadInvitations(currentUser);
    }
  }, [userLoading, currentUser]);

  // Helper function to clean email addresses (remove qa+ prefix)
  const cleanEmail = (email) => {
    if (!email || typeof email !== 'string') return email;
    if (email.startsWith('qa+')) {
      return email.substring(3);
    }
    return email;
  };

  const loadInvitations = async (user) => {
    try {
      // Search for invitations using both user ID and email variants
      const emailVariants = [user.email];
      if (!user.email.startsWith('qa+')) {
        emailVariants.push(`qa+${user.email}`);
      } else {
        emailVariants.push(user.email.substring(3));
      }

      // Get invitations by user_id (if exists) and by email variants
      const invitationQueries = [
        // By user ID
        StudentInvitation.filter({
          student_user_id: user.id,
          status: 'pending_student_acceptance'
        }),
        // By email variants
        ...emailVariants.map(email => 
          StudentInvitation.filter({
            student_email: email,
            status: 'pending_student_acceptance'
          })
        )
      ];

      const allInvitations = await Promise.all(invitationQueries);
      
      // Flatten and deduplicate invitations
      const studentInvitations = allInvitations.flat().reduce((unique, invitation) => {
        if (!unique.find(inv => inv.id === invitation.id)) {
          unique.push(invitation);
        }
        return unique;
      }, []);

      setInvitations(studentInvitations);

      // Load classroom and teacher details
      const classroomIds = [...new Set(studentInvitations.map(inv => inv.classroom_id).filter(Boolean))];
      const teacherIds = [...new Set(studentInvitations.map(inv => inv.teacher_id).filter(Boolean))];

      const [classroomData, teacherData] = await Promise.all([
        Promise.all(classroomIds.map(async (id) => {
          try {
            const classroom = await Classroom.get(id);
            return { id, data: classroom };
          } catch (error) {
            cerror(`Error loading classroom ${id}:`, error);
            return { id, data: null };
          }
        })),
        Promise.all(teacherIds.map(async (id) => {
          try {
            const teacher = await User.get(id);
            return { id, data: teacher };
          } catch (error) {
            cerror(`Error loading teacher ${id}:`, error);
            return { id, data: null };
          }
        }))
      ]);

      const classroomsLookup = {};
      const teachersLookup = {};

      classroomData.forEach(({ id, data }) => {
        if (data) classroomsLookup[id] = data;
      });

      teacherData.forEach(({ id, data }) => {
        if (data) teachersLookup[id] = data;
      });

      setClassrooms(classroomsLookup);
      setTeachers(teachersLookup);

    } catch (error) {
      cerror("Error loading invitations:", error);
      setError("שגיאה בטעינת ההזמנות");
    }
  };

  const handleLogin = async () => {
    try {
      await User.loginWithRedirect(window.location.href);
    } catch (error) {
      setError("שגיאה בהתחברות למערכת");
    }
  };

  const handleAcceptInvitation = async (invitation) => {
    setProcessingInvitation(invitation.id);
    setError("");

    try {
      // Update the invitation to link it with the current user
      await StudentInvitation.update(invitation.id, {
        status: 'accepted',
        student_user_id: currentUser.id,
        student_accepted_at: new Date().toISOString()
      });

      // Create classroom membership record
      await ClassroomMembership.create({
        classroom_id: invitation.classroom_id,
        student_user_id: currentUser.id,
        teacher_id: invitation.teacher_id,
        joined_at: new Date().toISOString(),
        status: 'active',
        student_display_name: invitation.student_name
      });

      // Mark invitation as converted
      await StudentInvitation.update(invitation.id, {
        status: 'converted_to_membership',
        converted_to_membership_at: new Date().toISOString()
      });

      // Remove from pending list
      setInvitations(prev => prev.filter(inv => inv.id !== invitation.id));

    } catch (error) {
      cerror("Error accepting invitation:", error);
      setError("שגיאה באישור ההזמנה");
    } finally {
      setProcessingInvitation(null);
    }
  };

  const handleRejectInvitation = async (invitation) => {
    setProcessingInvitation(invitation.id);
    setError("");

    try {
      // Update invitation status to rejected
      await StudentInvitation.update(invitation.id, {
        status: 'rejected'
      });

      // Remove from pending list
      setInvitations(prev => prev.filter(inv => inv.id !== invitation.id));

    } catch (error) {
      cerror("Error rejecting invitation:", error);
      setError("שגיאה בדחיית ההזמנה");
    } finally {
      setProcessingInvitation(null);
    }
  };

  const getGradeLevelText = (gradeLevel) => {
    const gradeMap = {
      'kindergarten': 'גן חובה',
      'grade_1': 'כיתה א',
      'grade_2': 'כיתה ב',
      'grade_3': 'כיתה ג',
      'grade_4': 'כיתה ד',
      'grade_5': 'כיתה ה',
      'grade_6': 'כיתה ו',
      'grade_7': 'כיתה ז',
      'grade_8': 'כיתה ח',
      'grade_9': 'כיתה ט',
      'grade_10': 'כיתה י',
      'grade_11': 'כיתה יא',
      'grade_12': 'כיתה יב'
    };
    return gradeMap[gradeLevel] || gradeLevel;
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">טוען הזמנות...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <LogIn className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl">התחברות נדרשת</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              כדי לצפות בהזמנות לכיתות ולקבל אותן, עליך להתחבר למערכת
            </p>
            <Button onClick={handleLogin} className="w-full">
              <LogIn className="w-5 h-5 ml-2" />
              התחבר למערכת
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4" dir="rtl">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center">
                <Users className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">הזמנות לכיתות</h1>
                <p className="text-gray-600 mt-1">
                  שלום {currentUser.display_name || currentUser.full_name || currentUser.email}
                </p>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Invitations List */}
        {invitations.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">אין הזמנות ממתינות</h3>
              <p className="text-gray-600">
                כרגע אין לך הזמנות ממתינות להצטרפות לכיתות
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-500" />
                הזמנות ממתינות ({invitations.length})
              </h2>
              
              <div className="space-y-4">
                {invitations.map((invitation) => {
                  const classroom = classrooms[invitation.classroom_id];
                  const teacher = teachers[invitation.teacher_id];
                  
                  return (
                    <div key={invitation.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-blue-600 rounded-xl flex items-center justify-center">
                              <GraduationCap className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">
                                {classroom?.name || 'כיתה'}
                              </h3>
                              <p className="text-gray-600 text-sm">
                                מורה: {teacher?.display_name || teacher?.full_name || 'לא זמין'}
                              </p>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            {classroom?.grade_level && (
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <span>שכבה:</span>
                                <span className="font-medium">{getGradeLevelText(classroom.grade_level)}</span>
                              </div>
                            )}
                            {classroom?.year && (
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Calendar className="w-4 h-4" />
                                <span>מחזור: {classroom.year}</span>
                              </div>
                            )}
                            {classroom?.description && (
                              <p className="text-sm text-gray-600">{classroom.description}</p>
                            )}
                          </div>

                          {invitation.notes && (
                            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                              <p className="text-sm text-blue-800">
                                <strong>הודעה מהמורה:</strong> {invitation.notes}
                              </p>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex gap-2 mr-4">
                          <Button
                            onClick={() => handleRejectInvitation(invitation)}
                            disabled={processingInvitation === invitation.id}
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                          >
                            <X className="w-4 h-4 ml-1" />
                            דחה
                          </Button>
                          <Button
                            onClick={() => handleAcceptInvitation(invitation)}
                            disabled={processingInvitation === invitation.id}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            {processingInvitation === invitation.id ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-1"></div>
                                מאשר...
                              </>
                            ) : (
                              <>
                                <Check className="w-4 h-4 ml-1" />
                                אשר הצטרפות
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
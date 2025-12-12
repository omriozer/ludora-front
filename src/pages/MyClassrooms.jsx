import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { SubscriptionPlan, Classroom, ClassroomMembership, StudentInvitation } from "@/services/entities";
import { useUser } from "@/contexts/UserContext";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap,
  Plus,
  Users,
  BookOpen,
  Calendar,
  Crown,
  AlertTriangle,
  Loader2,
  Edit,
  Settings as SettingsIcon,
  User as UserIcon
} from "lucide-react";
import SubscriptionLimitModal from "../components/SubscriptionLimitModal";
import SubscriptionModal from "../components/SubscriptionModal";
import ClassroomForm from "../components/classrooms/ClassroomForm";
import SEOHead from '@/components/SEOHead';

export default function MyClassrooms() {
  const navigate = useNavigate();
  const { currentUser, settings, isLoading: userLoading } = useUser();

  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [studentCounts, setStudentCounts] = useState({}); // New state for student counts
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingClassroom, setIsCreatingClassroom] = useState(false);
  const [message, setMessage] = useState(null);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showClassroomForm, setShowClassroomForm] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Load user's classrooms
      if (currentUser.id) {
        const userClassrooms = await Classroom.filter({ teacher_id: currentUser.id });
        setClassrooms(userClassrooms);

        // Load student counts for each classroom
        await loadStudentCounts(userClassrooms);
      }

      // Load subscription plans for upgrade modal (only if subscription system enabled)
      if (settings?.subscription_system_enabled) {
        const plans = await SubscriptionPlan.filter({ is_active: true }, "sort_order");
        setSubscriptionPlans(plans);
      }

    } catch (error) {
      console.error("Error loading data:", error);
      setMessage({ type: 'error', text: 'שגיאה בטעינת הנתונים' });
    }
    setIsLoading(false);
  }, [currentUser, settings]);

  // New function to load student counts
  const loadStudentCounts = async (classrooms) => {
    try {
      const counts = {};
      
      for (const classroom of classrooms) {
        // Get active students count
        const activeStudents = await ClassroomMembership.filter({
          classroom_id: classroom.id,
          status: 'active'
        });

        // Get pending invitations count
        const pendingInvitations = await StudentInvitation.filter({
          classroom_id: classroom.id,
          status: ['pending_parent_consent', 'pending_student_acceptance']
        });

        counts[classroom.id] = {
          active: activeStudents.length,
          pending: pendingInvitations.length,
          total: activeStudents.length + pendingInvitations.length
        };
      }
      
      setStudentCounts(counts);
    } catch (error) {
      console.error("Error loading student counts:", error);
    }
  };

  useEffect(() => {
    if (!userLoading && currentUser && settings) {
      loadData();
    }
  }, [loadData, userLoading, currentUser, settings]);

  const checkClassroomLimits = () => {
    // ✅ NEW APPROACH: Use explicit subscription permissions from API
    const classroomPermissions = currentUser.subscription_permissions?.classroom_management;

    if (!classroomPermissions?.enabled) {
      return {
        canCreate: false,
        limitType: 'feature',
        availableUpgrades: getClassroomUpgrades()
      };
    }

    // Use the explicit can_create_classroom permission from API
    if (!classroomPermissions.can_create_classroom) {
      return {
        canCreate: false,
        limitType: 'quota',
        currentUsage: classroomPermissions.current_classrooms || 0,
        maxAllowed: classroomPermissions.max_classrooms || 0,
        availableUpgrades: getClassroomUpgrades(classroomPermissions.max_classrooms || 0)
      };
    }

    return { canCreate: true };
  };

  const getClassroomUpgrades = (currentLimit = 0) => {
    return subscriptionPlans.filter(plan => {
      const hasAccess = plan.benefits?.classroom_management?.enabled;
      if (!hasAccess) return false;

      const isUnlimited = plan.benefits.classroom_management.unlimited_classrooms;
      const planLimit = plan.benefits.classroom_management.max_classrooms || 0;
      
      return isUnlimited || planLimit > currentLimit;
    }).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  };

  const handleCreateClassroom = () => {
    const limits = checkClassroomLimits();
    
    if (!limits.canCreate) {
      setShowLimitModal(true);
      return;
    }

    setEditingClassroom(null);
    setShowClassroomForm(true);
  };

  const handleEditClassroom = (classroom) => {
    setEditingClassroom(classroom);
    setShowClassroomForm(true);
  };


  const handleViewCurriculum = (classroom) => {
    navigate(`/classroom/${classroom.id}/curriculum`);
  };

  const handleManageClassroom = (classroom) => {
    navigate(`/classroom/${classroom.id}/manage`);
  };

  const handleClassroomSubmit = async (classroomData) => {
    setIsCreatingClassroom(true);
    try {
      if (editingClassroom) {
        await Classroom.update(editingClassroom.id, classroomData);
        setMessage({ type: 'success', text: 'הכיתה עודכנה בהצלחה' });
      } else {
        await Classroom.create({
          ...classroomData,
          teacher_id: currentUser.id
        });
        setMessage({ type: 'success', text: 'הכיתה נוצרה בהצלחה' });
      }
      
      setShowClassroomForm(false);
      setEditingClassroom(null);
      loadData(); // Reload to get updated classrooms list and student counts
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error("Error saving classroom:", error);
      setMessage({ type: 'error', text: 'שגיאה בשמירת הכיתה' });
    }
    setIsCreatingClassroom(false);
  };

  const handleUpgrade = () => {
    setShowLimitModal(false);
    setShowSubscriptionModal(true);
  };

  const handleSubscriptionChange = (plan) => {
    // After subscription change, reload user data to get updated permissions
    // The UserContext will automatically refresh and provide new subscription_permissions
    setShowSubscriptionModal(false);
    // Force a data reload to get updated permissions
    loadData();
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

  if (userLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">טוען נתוני כיתות...</p>
        </div>
      </div>
    );
  }

  // Redirect if subscription system is disabled
  if (!settings?.subscription_system_enabled) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              תכונת ניהול הכיתות אינה זמינה כרגע. אנא פנה למנהל המערכת.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const limits = checkClassroomLimits();

  return (
    <>
      <SEOHead title="הכיתות שלי" />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50" dir="rtl">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                הכיתות שלי
              </h1>
              <p className="text-gray-600 mt-2">נהל את הכיתות והתלמידים שלך במקום אחד</p>
            </div>
            
            <Button 
              onClick={handleCreateClassroom}
              className="bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 text-white shadow-lg"
            >
              <Plus className="w-5 h-5 ml-2" />
              כיתה חדשה
            </Button>
          </div>
        </div>

        {/* Messages */}
        {message && (
          <div className="mb-6">
            <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          </div>
        )}

        {/* Classrooms List */}
        {classrooms.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classrooms.map(classroom => {
              const studentCount = studentCounts[classroom.id] || { active: 0, pending: 0, total: 0 };
              
              return (
                <Card key={classroom.id} className="bg-white/80 backdrop-blur-sm hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-blue-600 rounded-lg flex items-center justify-center">
                          <GraduationCap className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">
                            {classroom.name || `כיתה ${getGradeLevelText(classroom.grade_level)}`}
                          </CardTitle>
                          {classroom.year && (
                            <p className="text-sm text-gray-500">{classroom.year}</p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditClassroom(classroom)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {classroom.grade_level && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          {getGradeLevelText(classroom.grade_level)}
                        </Badge>
                      )}
                      {classroom.year && (
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          {classroom.year}
                        </Badge>
                      )}
                    </div>
                    
                    {classroom.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {classroom.description}
                      </p>
                    )}

                    {/* Student Count and Action Button */}
                    <div className="pt-3 border-t border-gray-100 space-y-3">
                      <div className="flex items-center justify-center text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <UserIcon className="w-4 h-4" />
                          {studentCount.active} תלמידים פעילים
                          {studentCount.pending > 0 && (
                            <span className="text-orange-600">
                              • {studentCount.pending} ממתינים
                            </span>
                          )}
                        </span>
                      </div>

                      <Button
                        onClick={() => handleManageClassroom(classroom)}
                        variant="outline"
                        className="w-full bg-gradient-to-r from-teal-600 to-blue-600 text-white border-0 hover:from-teal-700 hover:to-blue-700 shadow-md"
                      >
                        <SettingsIcon className="w-4 h-4 ml-2" />
                        נהל כיתה
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-12 shadow-2xl border border-gray-200/50 max-w-2xl mx-auto">
              <div className="w-24 h-24 bg-gradient-to-br from-teal-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <GraduationCap className="w-12 h-12 text-white" />
              </div>
              
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                צור את הכיתה הראשונה שלך
              </h2>
              
              <p className="text-gray-600 text-lg leading-relaxed max-w-lg mx-auto mb-8">
                התחל לנהל כיתות ותלמידים במערכת המתקדמת שלנו.
                עקוב אחר התקדמות ותקבל דוחות מפורטים על פעילות הלמידה.
              </p>

              <Button 
                onClick={handleCreateClassroom}
                size="lg"
                className="bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 text-white shadow-lg px-8 py-4 text-lg"
              >
                <Plus className="w-6 h-6 ml-2" />
                צור כיתה חדשה
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Classroom Form Modal */}
      <ClassroomForm
        isOpen={showClassroomForm}
        onClose={() => {
          setShowClassroomForm(false);
          setEditingClassroom(null);
        }}
        onSubmit={handleClassroomSubmit}
        classroom={editingClassroom}
        isLoading={isCreatingClassroom}
      />

      {/* Subscription Limit Modal */}
      <SubscriptionLimitModal
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        onUpgrade={handleUpgrade}
        limitType={limits.limitType}
        featureName="classrooms"
        currentUsage={limits.currentUsage}
        maxAllowed={limits.maxAllowed}
        currentPlan={currentUser.subscription_permissions ? {
          id: currentUser.subscription_permissions.subscription_plan_id,
          name: currentUser.subscription_permissions.subscription_plan_name
        } : null}
        availableUpgrades={limits.availableUpgrades || []}
      />

      {/* Subscription Modal */}
      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        currentUser={currentUser}
        onSubscriptionChange={handleSubscriptionChange}
      />

    </div>
    </>
  );
}

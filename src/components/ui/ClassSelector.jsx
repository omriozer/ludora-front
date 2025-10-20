import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Classroom, Settings, SubscriptionPlan, apiRequest } from "@/services/apiClient";
import { toast } from "@/components/ui/use-toast";
import { clog, cerror } from "@/lib/utils";
import LudoraLoadingSpinner from "@/components/ui/LudoraLoadingSpinner";
import ClassroomForm from "@/components/classrooms/ClassroomForm";
import SubscriptionLimitModal from "@/components/SubscriptionLimitModal";
import {
  GraduationCap,
  Plus,
  Check,
  Users,
  Calendar
} from "lucide-react";

export default function ClassSelector({
  onClassSelect,
  onCreateClass,
  selectedClassId = null,
  showCreateOption = true,
  title = "בחר כיתה",
  description = "בחר כיתה קיימת או צור כיתה חדשה",
  currentUser,
  disabled = false
}) {
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  const [creatingClass, setCreatingClass] = useState(false);

  // Subscription management state
  const [settings, setSettings] = useState(null);
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [userPlan, setUserPlan] = useState(null);
  const [showLimitModal, setShowLimitModal] = useState(false);

  useEffect(() => {
    loadClassrooms();
    loadSubscriptionData();
  }, [currentUser]);

  const loadClassrooms = async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      const userClassrooms = await Classroom.filter({
        teacher_id: currentUser.uid,
        is_active: true
      });
      setClassrooms(userClassrooms);
    } catch (error) {
      cerror('Error loading classrooms:', error);
      toast({
        title: "שגיאה",
        description: "שגיאה בטעינת רשימת הכיתות",
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  const loadSubscriptionData = async () => {
    if (!currentUser) return;

    try {
      const settingsData = await Settings.find();
      if (settingsData && settingsData.length > 0) {
        setSettings(settingsData[0]);

        // Load subscription plans and user plan if subscription system is enabled
        if (settingsData[0]?.subscription_system_enabled) {
          const plans = await SubscriptionPlan.filter({ is_active: true }, "sort_order");
          setSubscriptionPlans(plans);

          if (currentUser.current_subscription_plan_id) {
            const userPlanData = plans.find(plan => plan.id === currentUser.current_subscription_plan_id);
            setUserPlan(userPlanData);
          }
        }
      }
    } catch (error) {
      cerror('Error loading subscription data:', error);
      // Don't show error toast for this, it's not critical for basic functionality
    }
  };

  const checkClassroomLimits = () => {
    // Check if user has classroom management enabled
    const hasClassroomAccess = userPlan?.benefits?.classroom_management?.enabled;

    if (!hasClassroomAccess) {
      return {
        canCreate: false,
        limitType: 'feature',
        availableUpgrades: getClassroomUpgrades()
      };
    }

    // Check classroom quota
    const isUnlimited = userPlan.benefits.classroom_management.unlimited_classrooms;
    const maxClassrooms = userPlan.benefits.classroom_management.max_classrooms || 0;

    if (!isUnlimited && classrooms.length >= maxClassrooms) {
      return {
        canCreate: false,
        limitType: 'quota',
        currentUsage: classrooms.length,
        maxAllowed: maxClassrooms,
        availableUpgrades: getClassroomUpgrades(maxClassrooms)
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

  const handleCreateClassroomClick = () => {
    // Check subscription limits first
    const limits = checkClassroomLimits();

    if (!limits.canCreate) {
      setShowLimitModal(true);
      return;
    }

    // If limits allow, show the create classroom modal
    setShowCreateClassModal(true);
  };

  const handleCreateClassroom = async (classroomData) => {
    setCreatingClass(true);
    try {
      const newClassroom = await Classroom.create({
        ...classroomData,
        teacher_id: currentUser.uid,
        is_active: true
      });

      await loadClassrooms(); // Reload classrooms list
      setShowCreateClassModal(false);

      toast({
        title: "כיתה נוצרה",
        description: "הכיתה החדשה נוצרה בהצלחה",
        variant: "default"
      });

      // Auto-select the newly created classroom
      if (onClassSelect) {
        onClassSelect(newClassroom);
      }

      // Call the onCreateClass callback if provided
      if (onCreateClass) {
        onCreateClass(newClassroom);
      }

    } catch (error) {
      cerror('Error creating classroom:', error);
      toast({
        title: "שגיאה",
        description: error.message || "שגיאה ביצירת הכיתה",
        variant: "destructive"
      });
    }
    setCreatingClass(false);
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

  if (loading) {
    return (
      <div className="p-4">
        <LudoraLoadingSpinner text="טוען רשימת כיתות..." />
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-gray-600 text-sm">{description}</p>
      </div>

      {/* Classroom List */}
      {classrooms.length === 0 ? (
        <Alert>
          <GraduationCap className="h-4 w-4" />
          <AlertDescription>
            עדיין אין לך כיתות. צור כיתה חדשה כדי להתחיל.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {classrooms.map(classroom => (
            <Card
              key={classroom.id}
              className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                selectedClassId === classroom.id
                  ? 'ring-2 ring-blue-500 bg-blue-50'
                  : disabled
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => !disabled && onClassSelect && onClassSelect(classroom)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <GraduationCap className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold">
                        {classroom.name || getGradeLevelText(classroom.grade_level)}
                      </h4>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        {classroom.grade_level && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {getGradeLevelText(classroom.grade_level)}
                          </span>
                        )}
                        {classroom.year && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {classroom.year}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {selectedClassId === classroom.id && (
                    <Check className="w-5 h-5 text-blue-600" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create New Class Button */}
      {showCreateOption && (
        <div className="pt-2 border-t">
          <Button
            onClick={handleCreateClassroomClick}
            variant="outline"
            className="w-full"
            disabled={disabled}
          >
            <Plus className="w-4 h-4 ml-2" />
            צור כיתה חדשה
          </Button>
        </div>
      )}

      {/* Create Classroom Modal */}
      <Dialog open={showCreateClassModal} onOpenChange={setShowCreateClassModal}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>צור כיתה חדשה</DialogTitle>
          </DialogHeader>
          <ClassroomForm
            isOpen={showCreateClassModal}
            onClose={() => setShowCreateClassModal(false)}
            onSubmit={handleCreateClassroom}
            classroom={null}
            isLoading={creatingClass}
          />
        </DialogContent>
      </Dialog>

      {/* Subscription Limit Modal */}
      <SubscriptionLimitModal
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        limitInfo={checkClassroomLimits()}
        currentUser={currentUser}
      />
    </div>
  );
}
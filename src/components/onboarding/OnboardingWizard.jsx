import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Loader2,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Settings,
  SkipForward,
  AlertCircle
} from 'lucide-react';
import { clog, cerror } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import { User, Classroom, StudentInvitation } from '@/services/apiClient';

// Import step components (to be created)
import AgeVerification from './AgeVerification';
import AccountTypeSelector from './AccountTypeSelector';
import TeacherSetup from './TeacherSetup';
import OnboardingSubscriptionStep from './OnboardingSubscriptionStep';

export default function OnboardingWizard() {
  const navigate = useNavigate();
  const { currentUser, settings, updateUser } = useUser();

  // State management
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [onboardingData, setOnboardingData] = useState({
    birthDate: null,
    accountType: '',
    teacherInfo: {},
    subscriptionPlan: null,
    hasCompletedAgeVerification: false,
    hasCompletedAccountSetup: false,
    hasCompletedTeacherSetup: false,
    hasCompletedSubscription: false
  });

  // Define steps based on user type and settings
  const getSteps = () => {
    const steps = [
      {
        id: 'age-verification',
        title: 'אימות גיל',
        description: 'אימות גיל הנדרש לשימוש במערכת',
        component: AgeVerification,
        required: true
      },
      {
        id: 'account-type',
        title: 'סוג חשבון',
        description: 'בחירת סוג החשבון שלך',
        component: AccountTypeSelector,
        required: true
      },
      {
        id: 'teacher-setup',
        title: 'הגדרת חשבון מורה',
        description: 'הגדרת פרטים נוספים למורה',
        component: TeacherSetup,
        required: true,
        conditional: () => onboardingData.accountType === 'teacher'
      }
    ];

    // Add subscription step only if subscription system is enabled
    if (settings?.subscription_system_enabled) {
      steps.push({
        id: 'subscription',
        title: 'תוכנית מנוי',
        description: 'בחירת תוכנית המנוי המתאימה לך',
        component: OnboardingSubscriptionStep,
        required: false
      });
    }

    // Filter out conditional steps that don't apply
    return steps.filter(step => !step.conditional || step.conditional());
  };

  const steps = getSteps();
  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  // Check if user is admin
  const isAdmin = currentUser?.isAdmin?.() || currentUser?.role === 'admin';

  useEffect(() => {
    const checkUserStatus = async () => {
      if (!currentUser) return;

      // If user already has user_type set, they don't need onboarding
      if (currentUser.user_type && currentUser.user_type !== null) {
        clog('[OnboardingWizard] User already has user_type, redirecting to dashboard');
        navigate('/dashboard');
        return;
      }

      // Check if user has pending invitations (student or parent)
      try {
        const studentInvitations = await StudentInvitation.filter({
          student_email: currentUser.email,
          status: ['pending_student_acceptance', 'pending_parent_consent']
        });

        const parentInvitations = await StudentInvitation.filter({
          parent_email: currentUser.email,
          status: ['pending_parent_consent']
        });

        const totalInvitations = [...studentInvitations, ...parentInvitations];

        if (totalInvitations.length > 0) {
          clog('[OnboardingWizard] User has pending invitations, redirecting to invitations page');

          toast({
            title: 'יש לך הזמנות ממתינות',
            description: 'נמצאו הזמנות להצטרפות לכיתות. תועבר לעמוד ההזמנות.',
            variant: 'default'
          });

          navigate('/student-invitations');
          return;
        }
      } catch (error) {
        clog('[OnboardingWizard] Error checking invitations:', error);
        // Continue with onboarding if invitation check fails
      }

      clog('[OnboardingWizard] Starting onboarding flow for user:', currentUser.email);
    };

    checkUserStatus();
  }, [currentUser, navigate]);

  const handleStepComplete = (stepId, stepData) => {
    clog(`[OnboardingWizard] Step ${stepId} completed with data:`, stepData);

    setOnboardingData(prev => ({
      ...prev,
      ...stepData,
      [`hasCompleted${stepId.split('-').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)).join('')}`]: true
    }));

    // Move to next step
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleOnboardingComplete();
    }
  };

  const handleOnboardingComplete = async () => {
    setIsLoading(true);
    setError('');

    try {
      // Prepare user updates (remove classroom-specific fields)
      const userUpdates = {
        user_type: onboardingData.accountType || 'teacher',
        education_level: onboardingData.teacherInfo?.education_level,
        phone: onboardingData.teacherInfo?.phone,
        bio: onboardingData.teacherInfo?.bio,
        experience: onboardingData.teacherInfo?.experience
      };

      // If user completed age verification, store birth date
      if (onboardingData.birthDate) {
        userUpdates.birth_date = onboardingData.birthDate;
      }

      // Update user profile
      const updatedUser = await User.update(currentUser.id, userUpdates);
      updateUser(updatedUser);

      // Create first classroom if requested
      if (onboardingData.teacherInfo?.createFirstClassroom &&
          onboardingData.teacherInfo?.firstClassroomName &&
          onboardingData.teacherInfo?.firstClassroomGrade) {

        clog('[OnboardingWizard] Creating first classroom');

        try {
          await Classroom.create({
            name: onboardingData.teacherInfo.firstClassroomName,
            grade_level: onboardingData.teacherInfo.firstClassroomGrade,
            year: new Date().getFullYear().toString(),
            teacher_id: currentUser.id,
            description: 'כיתה ראשונה שנוצרה במהלך ההרשמה'
          });

          clog('[OnboardingWizard] First classroom created successfully');
        } catch (classroomError) {
          cerror('[OnboardingWizard] Error creating first classroom:', classroomError);
          // Don't fail the entire onboarding process, just log the error
          // User can create classrooms manually later
        }
      }

      clog('[OnboardingWizard] Onboarding completed successfully');

      // Show success message
      const successMessage = onboardingData.teacherInfo?.createFirstClassroom
        ? 'החשבון שלך הוגדר בהצלחה והכיתה הראשונה נוצרה. כעת תועבר לדף הבית.'
        : 'החשבון שלך הוגדר בהצלחה. כעת תועבר לדף הבית.';

      toast({
        title: 'ברוך הבא למערכת!',
        description: successMessage,
        variant: 'default'
      });

      // Redirect to dashboard
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

    } catch (err) {
      cerror('[OnboardingWizard] Error completing onboarding:', err);
      setError('שגיאה בהשלמת ההרשמה. אנא נסה שוב.');

      toast({
        title: 'שגיאה בהשלמת ההרשמה',
        description: 'אנא נסה שוב או פנה לתמיכה.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminSkip = async () => {
    setIsLoading(true);
    setError('');

    try {
      // Set default values for admin skip
      const userUpdates = {
        user_type: 'teacher', // Default for admins who skip
        // Keep existing role and other admin privileges
      };

      const updatedUser = await User.update(currentUser.id, userUpdates);
      updateUser(updatedUser);

      clog('[OnboardingWizard] Admin skipped onboarding');

      toast({
        title: 'דילגת על ההרשמה',
        description: 'החשבון שלך הוגדר עם הגדרות ברירת מחדל.',
        variant: 'default'
      });

      navigate('/dashboard');

    } catch (err) {
      cerror('[OnboardingWizard] Error skipping onboarding:', err);
      setError('שגיאה בדילוג על ההרשמה. אנא נסה שוב.');

      toast({
        title: 'שגיאה',
        description: 'לא הצלחנו לדלג על ההרשמה. אנא נסה שוב.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const goToNextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-6"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-purple-400 rounded-full animate-spin mx-auto" style={{animationDirection: 'reverse', animationDuration: '0.8s'}}></div>
          </div>
          <p className="text-white/80 text-lg font-medium">מכין את החוויה שלך...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full bg-white/[0.02] opacity-40"></div>
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-500/5 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Responsive Header */}
        <div className="text-center pt-4 md:pt-8 pb-4 md:pb-6 px-4">
          <div className="inline-flex items-center justify-center w-16 h-16 md:w-24 md:h-24 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 rounded-2xl md:rounded-3xl shadow-2xl mb-4 md:mb-8 transform hover:scale-105 transition-all duration-300 relative">
            <Settings className="w-8 h-8 md:w-12 md:h-12 text-white" />
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 rounded-2xl md:rounded-3xl blur opacity-60 animate-pulse"></div>
          </div>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white mb-2 md:mb-4">
            בואו נתחיל! 🚀
          </h1>
          <p className="text-lg md:text-xl text-white/80 max-w-3xl mx-auto leading-relaxed font-medium px-4">
            כמה צעדים קצרים וכבר תהיו חלק מקהילת הלמידה שלנו
          </p>
        </div>

        {/* Responsive Progress Indicator */}
        <div className="max-w-4xl mx-auto px-2 md:px-4 mb-4 md:mb-8">
          <div className="bg-white/10 backdrop-blur-xl rounded-xl md:rounded-2xl p-3 md:p-6 border border-white/20">
            {/* Mobile Step Circles - Simplified */}
            <div className="block md:hidden">
              <div className="flex items-center justify-center gap-2 mb-4">
                {steps.map((step, index) => {
                  const isCompleted = index < currentStep;
                  const isCurrent = index === currentStep;
                  const isUpcoming = index > currentStep;

                  return (
                    <div key={step.id} className="flex items-center">
                      <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 relative
                        ${isCompleted ? 'bg-green-500 text-white shadow-lg' : ''}
                        ${isCurrent ? 'bg-white text-purple-900 shadow-lg scale-110' : ''}
                        ${isUpcoming ? 'bg-white/20 text-white/60 border border-white/30' : ''}
                      `}>
                        {isCompleted ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <span>{index + 1}</span>
                        )}
                        {isCurrent && (
                          <div className="absolute inset-0 bg-white rounded-full animate-ping opacity-30"></div>
                        )}
                      </div>
                      {index < steps.length - 1 && (
                        <div className={`w-6 h-0.5 mx-1 rounded transition-all duration-500 ${
                          isCompleted ? 'bg-green-500' : 'bg-white/20'
                        }`}></div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="text-center">
                <div className="text-white font-bold text-sm">{steps[currentStep]?.title}</div>
                <div className="text-xs text-white/70">{steps[currentStep]?.description}</div>
              </div>
            </div>

            {/* Desktop Step Circles - Full Layout */}
            <div className="hidden md:flex items-center justify-between mb-6">
              {steps.map((step, index) => {
                const isCompleted = index < currentStep;
                const isCurrent = index === currentStep;
                const isUpcoming = index > currentStep;

                return (
                  <div key={step.id} className="flex items-center flex-1">
                    <div className="flex items-center">
                      <div className={`
                        w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 relative
                        ${isCompleted ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' : ''}
                        ${isCurrent ? 'bg-white text-purple-900 shadow-lg shadow-white/30 scale-110' : ''}
                        ${isUpcoming ? 'bg-white/20 text-white/60 border-2 border-white/30' : ''}
                      `}>
                        {isCompleted ? (
                          <CheckCircle className="w-6 h-6" />
                        ) : (
                          <span>{index + 1}</span>
                        )}
                        {isCurrent && (
                          <div className="absolute inset-0 bg-white rounded-full animate-ping opacity-30"></div>
                        )}
                      </div>
                      <div className="mr-3 text-right">
                        <div className={`font-bold transition-colors duration-300 ${isCurrent ? 'text-white' : 'text-white/70'}`}>
                          {step.title}
                        </div>
                        <div className="text-xs text-white/50">
                          {step.description}
                        </div>
                      </div>
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`flex-1 h-1 mx-4 rounded transition-all duration-500 ${
                        isCompleted ? 'bg-green-500' : 'bg-white/20'
                      }`}></div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Admin Skip Button - Responsive */}
            {isAdmin && (
              <div className="flex justify-center md:justify-end mt-4 md:mt-0">
                <Button
                  onClick={handleAdminSkip}
                  variant="outline"
                  size="sm"
                  className="bg-white/10 border-white/30 text-white hover:bg-white/20 transition-all duration-300 text-xs md:text-sm px-3 md:px-4 py-2"
                  disabled={isLoading}
                >
                  <SkipForward className="w-3 h-3 md:w-4 md:h-4 ml-1" />
                  דלג על ההרשמה (מנהל)
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Responsive Error Display */}
        {error && (
          <div className="max-w-4xl mx-auto px-2 md:px-4 mb-4 md:mb-6">
            <div className="bg-red-500/20 backdrop-blur-xl border border-red-500/30 rounded-xl md:rounded-2xl p-3 md:p-4">
              <div className="flex items-center gap-2 md:gap-3">
                <AlertCircle className="h-5 w-5 md:h-6 md:w-6 text-red-400 flex-shrink-0" />
                <p className="text-red-100 text-sm md:text-lg font-medium">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Responsive Step Container */}
        <div className="flex-1 max-w-4xl mx-auto px-2 md:px-4 pb-4 md:pb-8">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl md:rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
            {/* Responsive Step Header */}
            <div className="bg-gradient-to-r from-blue-500 via-purple-600 to-pink-500 p-4 md:p-6 text-center relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-600 to-pink-500 opacity-90"></div>
              <div className="relative z-10">
                <h2 className="text-xl md:text-3xl font-bold text-white mb-1 md:mb-2">
                  {currentStepData?.title}
                </h2>
                <p className="text-white/90 text-sm md:text-lg">
                  {currentStepData?.description}
                </p>
              </div>
              {/* Decorative Elements - Hidden on mobile */}
              <div className="hidden md:block absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
              <div className="hidden md:block absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-12 -translate-x-12"></div>
            </div>

            {/* Responsive Step Content */}
            <div className="p-4 md:p-8">
              {currentStepData && (
                <currentStepData.component
                  onComplete={(stepData) => handleStepComplete(currentStepData.id, stepData)}
                  onboardingData={onboardingData}
                  settings={settings}
                  currentUser={currentUser}
                />
              )}
            </div>

            {/* Responsive Navigation */}
            <div className="p-3 md:p-6 bg-gray-50/50 border-t border-gray-200/30">
              <div className="flex justify-between items-center">
                {/* Back button - only visible when there's a previous step */}
                {currentStep > 0 ? (
                  <Button
                    onClick={goToPreviousStep}
                    variant="outline"
                    size="sm"
                    disabled={isLoading}
                    className="px-3 md:px-8 py-2 md:py-3 bg-white/80 border-gray-200 hover:bg-white transition-all duration-300 text-sm md:text-base"
                  >
                    <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 ml-1 md:ml-2" />
                    <span className="hidden sm:inline">חזור</span>
                    <span className="sm:hidden">←</span>
                  </Button>
                ) : (
                  <div></div> /* Empty placeholder to maintain layout */
                )}

                <div className="flex items-center gap-1 md:gap-2">
                  {steps.map((_, index) => (
                    <div
                      key={index}
                      className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full transition-all duration-300 ${
                        index === currentStep ? 'bg-purple-500 w-4 md:w-8' :
                        index < currentStep ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    ></div>
                  ))}
                </div>

                {/* Next button - only visible when there's a next step */}
                {currentStep < steps.length - 1 ? (
                  <Button
                    onClick={goToNextStep}
                    variant="outline"
                    size="sm"
                    disabled={isLoading}
                    className="px-3 md:px-8 py-2 md:py-3 bg-gradient-to-r from-purple-500 to-pink-500 border-0 text-white hover:from-purple-600 hover:to-pink-600 transition-all duration-300 shadow-lg hover:shadow-xl text-sm md:text-base"
                  >
                    <span className="hidden sm:inline">המשך</span>
                    <span className="sm:hidden">→</span>
                    <ArrowRight className="w-4 h-4 md:w-5 md:h-5 mr-1 md:mr-2" />
                  </Button>
                ) : (
                  <div></div> /* Empty placeholder to maintain layout */
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
import React, { useState, useEffect, useCallback } from 'react';
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
import { User, Classroom, SubscriptionHistory } from '@/services/apiClient';

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

  // Load existing user data to pre-populate onboarding forms
  const loadExistingUserData = useCallback(async () => {
    if (!currentUser) return;

    try {
      clog('[OnboardingWizard] Loading existing user data for pre-population');

      // Debug current user data
      clog('[OnboardingWizard] 🔍 Current user object:', currentUser);
      clog('[OnboardingWizard] 🎂 Birth date field:', currentUser.birth_date);
      clog('[OnboardingWizard] 📋 All user fields:', Object.keys(currentUser));

      // Build onboarding data from existing user fields
      const existingData = {
        // Age verification step
        birthDate: currentUser.birth_date || null,
        hasCompletedAgeVerification: !!currentUser.birth_date,

        // Account type step
        accountType: currentUser.user_type || '',
        hasCompletedAccountSetup: !!currentUser.user_type,

        // Teacher setup step
        teacherInfo: {
          education_level: currentUser.education_level || '',
          phone: currentUser.phone || '',
          specializations: currentUser.specializations || [],
          createFirstClassroom: false, // This is a form-only field, not persisted
          firstClassroomName: '',      // This is a form-only field, not persisted
          firstClassroomGrade: ''      // This is a form-only field, not persisted
        },
        hasCompletedTeacherSetup: !!(currentUser.user_type === 'teacher' &&
          (currentUser.education_level || currentUser.phone || currentUser.specializations?.length > 0)),

        // Subscription step
        subscriptionPlan: null, // This will be handled by subscription logic
        hasCompletedSubscription: false // This is not persisted, let subscription flow handle it
      };

      setOnboardingData(existingData);
      clog('[OnboardingWizard] Pre-populated onboarding data:', existingData);

      // Debug step calculation
      clog('[OnboardingWizard] 🔍 STEP CALCULATION DEBUG:');
      clog('[OnboardingWizard] - User birth_date:', currentUser.birth_date);
      clog('[OnboardingWizard] - User user_type:', currentUser.user_type);
      clog('[OnboardingWizard] - User education_level:', currentUser.education_level);
      clog('[OnboardingWizard] - hasCompletedAgeVerification:', existingData.hasCompletedAgeVerification);
      clog('[OnboardingWizard] - hasCompletedAccountSetup:', existingData.hasCompletedAccountSetup);
      clog('[OnboardingWizard] - hasCompletedTeacherSetup:', existingData.hasCompletedTeacherSetup);
      clog('[OnboardingWizard] - accountType:', existingData.accountType);
      clog('[OnboardingWizard] - subscription_system_enabled:', settings?.subscription_system_enabled);

      // Determine what step the user should be on based on completed data
      let appropriateStep = 0;

      if (!existingData.hasCompletedAgeVerification) {
        // No birth date - start at age verification
        appropriateStep = 0;
        clog('[OnboardingWizard] ❌ CONDITION 1: No birth date found - starting at step 0 (age verification)');
      } else if (!existingData.hasCompletedAccountSetup) {
        // Has birth date but no user type - go to account type selection
        appropriateStep = 1;
        clog('[OnboardingWizard] ❌ CONDITION 2: Has birth date but no user type - starting at step 1 (account type)');
      } else if (existingData.accountType === 'teacher' && !existingData.hasCompletedTeacherSetup) {
        // Is teacher but missing teacher info - go to teacher setup
        appropriateStep = 2;
        clog('[OnboardingWizard] ✅ CONDITION 3: Is teacher but missing teacher info - starting at step 2 (teacher setup)');
      } else if (existingData.accountType === 'teacher' && existingData.hasCompletedTeacherSetup) {
        // Teacher with all data - go to subscription or complete
        if (settings?.subscription_system_enabled) {
          appropriateStep = 3; // Subscription step (for teachers: 0=age, 1=account, 2=teacher, 3=subscription)
          clog('[OnboardingWizard] ✅ CONDITION 4A: Teacher with complete data - starting at step 3 (subscription)');
        } else {
          // No subscription step - onboarding should be completed, but let normal flow handle it
          // Don't set a step that doesn't exist - the completion logic will handle this
          appropriateStep = 2; // Stay at teacher step, completion will be triggered
          clog('[OnboardingWizard] ✅ CONDITION 4B: Teacher with all data, no subscription - staying at teacher step for completion');
        }
      } else if (existingData.accountType && existingData.accountType !== 'teacher') {
        // Non-teacher user (student, parent, headmaster) - skip teacher setup
        if (settings?.subscription_system_enabled) {
          appropriateStep = 2; // Subscription step (for non-teachers: 0=age, 1=account, 2=subscription)
          clog(`[OnboardingWizard] ✅ CONDITION 5A: ${existingData.accountType} user - starting at step 2 (subscription)`);
        } else {
          // No subscription step - onboarding should be completed
          // For non-teachers without subscription: only steps 0=age, 1=account exist
          appropriateStep = 1; // Stay at account step, completion will be triggered
          clog(`[OnboardingWizard] ✅ CONDITION 5B: ${existingData.accountType} user, no subscription - staying at account step for completion`);
        }
      } else {
        // Fallback - has all required data
        if (settings?.subscription_system_enabled) {
          // Don't know user type yet, assume subscription exists
          appropriateStep = 2; // Conservative estimate for subscription step
          clog('[OnboardingWizard] ❌ CONDITION 6A: Has basic data - starting at step 2 (subscription fallback)');
        } else {
          // No subscription step - should complete onboarding
          appropriateStep = 1; // Stay at account step
          clog('[OnboardingWizard] ❌ CONDITION 6B: Has all required data, no subscription - staying at account step for completion');
        }
      }

      setCurrentStep(appropriateStep);
      clog(`[OnboardingWizard] Set current step to ${appropriateStep} based on user data`);

    } catch (error) {
      cerror('[OnboardingWizard] Error loading existing user data:', error);
      // Continue with empty data if loading fails
    }
  }, [currentUser]);

  useEffect(() => {
    const checkUserStatus = async () => {
      if (!currentUser) return;

      // If user already completed onboarding, they don't need it again
      if (currentUser.onboarding_completed === true) {
        clog('[OnboardingWizard] User already completed onboarding, redirecting to dashboard');
        navigate('/dashboard');
        return;
      }

      // Load existing user data to pre-populate forms
      await loadExistingUserData();

      // Note: Invitation checking disabled - studentinvitation table not available
      clog('[OnboardingWizard] Skipping invitation check - feature not available');

      clog('[OnboardingWizard] Starting onboarding flow for user:', currentUser.email);
    };

    checkUserStatus();
  }, [currentUser, navigate, loadExistingUserData]);

  const handleStepComplete = async (stepId, stepData) => {
    clog(`[OnboardingWizard] ✅ Step ${stepId} completed with data:`, stepData);
    clog(`[OnboardingWizard] 📍 Current step before processing: ${currentStep}`);

    // Update local state
    const updatedOnboardingData = {
      ...onboardingData,
      ...stepData,
      [`hasCompleted${stepId.split('-').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)).join('')}`]: true
    };
    setOnboardingData(updatedOnboardingData);
    clog(`[OnboardingWizard] 📝 Updated onboarding data:`, updatedOnboardingData);

    // Immediately save user data for this step
    try {
      setIsLoading(true);
      clog(`[OnboardingWizard] 💾 Starting to save user data for step ${stepId}`);

      // Prepare user updates based on step data
      const userUpdates = {};

      // Age verification step
      if (stepId === 'age-verification' && stepData.birthDate) {
        userUpdates.birth_date = stepData.birthDate;
        clog(`[OnboardingWizard] 🎂 Adding birth_date to user updates:`, stepData.birthDate);
      }

      // Account type step
      if (stepId === 'account-type' && stepData.accountType) {
        userUpdates.user_type = stepData.accountType;
      }

      // Teacher setup step
      if (stepId === 'teacher-setup' && stepData.teacherInfo) {
        if (stepData.teacherInfo.education_level) userUpdates.education_level = stepData.teacherInfo.education_level;
        if (stepData.teacherInfo.phone) userUpdates.phone = stepData.teacherInfo.phone;
        if (stepData.teacherInfo.specializations) userUpdates.specializations = stepData.teacherInfo.specializations;
      }

      // Subscription step - handled by SubscriptionModal, no processing needed here
      if (stepId === 'subscription' && stepData.subscriptionSelected) {
        clog(`[OnboardingWizard] 💳 Subscription completed via SubscriptionModal`);

        toast({
          title: "תוכנית המנוי נשמרה",
          description: "תוכנית המנוי שלך נבחרה בהצלחה",
          variant: "default"
        });
      }

      clog(`[OnboardingWizard] 🔄 User updates to be saved:`, userUpdates);

      // Update user if there are changes
      if (Object.keys(userUpdates).length > 0) {
        clog(`[OnboardingWizard] 🔍 Updating user with ID: ${currentUser.uid || currentUser.id}`);
        clog(`[OnboardingWizard] 🔑 Auth token from localStorage:`, localStorage.getItem('authToken') ? 'Present' : 'Missing');
        clog(`[OnboardingWizard] 🔑 Backup token from localStorage:`, localStorage.getItem('token') ? 'Present' : 'Missing');

        try {
          const updatedUser = await User.updateMyUserData(userUpdates);
          clog(`[OnboardingWizard] 📨 API returned updated user:`, updatedUser);
          clog(`[OnboardingWizard] 🎂 Birth date in API response:`, updatedUser.birth_date);
          updateUser(updatedUser);
          clog(`[OnboardingWizard] ✅ User data updated successfully after step ${stepId}:`, userUpdates);
        } catch (updateError) {
          cerror(`[OnboardingWizard] 💥 User.update failed:`, updateError);
          cerror(`[OnboardingWizard] 📋 Update error details:`, {
            message: updateError.message,
            stack: updateError.stack,
            userId: currentUser.uid || currentUser.id,
            userUpdates,
            authToken: localStorage.getItem('authToken') ? 'Present' : 'Missing'
          });
          throw updateError; // Re-throw to trigger the outer catch
        }
      } else {
        clog(`[OnboardingWizard] ℹ️ No user updates needed for step ${stepId}`);
      }

    } catch (error) {
      cerror(`[OnboardingWizard] ❌ Error saving step ${stepId} data:`, error);

      // Show more specific error messages based on error type
      let errorTitle = 'שגיאה בשמירת הנתונים';
      let errorDescription = 'לא הצלחנו לשמור את הנתונים. אנא נסה שוב.';

      if (error.message.includes('Failed to fetch') || error.message.includes('network')) {
        errorTitle = 'בעיית חיבור';
        errorDescription = 'לא הצלחנו להתחבר לשרת. אנא בדוק את החיבור לאינטרנט ונסה שוב.';
      } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        errorTitle = 'שגיאת הרשאה';
        errorDescription = 'יש בעיה עם ההתחברות. אנא התחבר מחדש ונסה שוב.';
      } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
        errorTitle = 'חוסר הרשאה';
        errorDescription = 'אין לך הרשאה לבצע פעולה זו.';
      } else if (error.message.includes('404')) {
        errorTitle = 'משתמש לא נמצא';
        errorDescription = 'לא נמצא משתמש עם המזהה המבוקש.';
      }

      toast({
        title: errorTitle,
        description: errorDescription,
        variant: 'destructive'
      });
      setIsLoading(false);
      return; // Don't advance to next step if save failed
    } finally {
      setIsLoading(false);
    }

    // Move to next step
    clog(`[OnboardingWizard] 🚀 About to advance step. Current step: ${currentStep}, Total steps: ${steps.length}`);
    if (currentStep < steps.length - 1) {
      const nextStep = currentStep + 1;
      clog(`[OnboardingWizard] ➡️ Advancing to step ${nextStep}`);
      setCurrentStep(prev => {
        const newStep = prev + 1;
        clog(`[OnboardingWizard] 📍 Step updated from ${prev} to ${newStep}`);
        return newStep;
      });
    } else {
      clog(`[OnboardingWizard] 🏁 Completing onboarding (last step reached)`);
      handleOnboardingComplete();
    }
  };

  const handleOnboardingComplete = async () => {
    setIsLoading(true);
    setError('');

    try {
      // Mark onboarding as completed (user data already saved step by step)
      const userUpdates = {
        onboarding_completed: true
      };

      // Update user profile
      const updatedUser = await User.updateMyUserData(userUpdates);
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
            teacher_id: currentUser.uid || currentUser.id,
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
      // Simply mark onboarding as completed for admin skip
      const userUpdates = {
        onboarding_completed: true
      };

      const updatedUser = await User.updateMyUserData(userUpdates);
      updateUser(updatedUser);

      clog('[OnboardingWizard] Admin skipped onboarding');

      toast({
        title: 'דילגת על ההרשמה',
        description: 'תוכל לעדכן את פרטיך בהגדרות הפרופיל בכל עת.',
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
                  onBack={currentStep > 0 ? goToPreviousStep : undefined}
                  onboardingData={onboardingData}
                  settings={settings}
                  currentUser={currentUser}
                />
              )}
            </div>

            {/* Responsive Navigation - Hidden on all steps since each component has its own buttons */}
            {false && (
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
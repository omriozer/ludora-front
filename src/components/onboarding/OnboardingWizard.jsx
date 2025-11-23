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
import { User, SubscriptionHistory } from '@/services/apiClient';

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

  // Define steps for teacher onboarding
  const getSteps = () => {
    const steps = [
      {
        id: 'age-verification',
        title: 'אימות גיל',
        description: 'אימות גיל נדרש להרשמה כמורה',
        component: AgeVerification,
        required: true
      },
      {
        id: 'account-type',
        title: 'אישור חשבון מורה',
        description: 'אישור הרשמה כמורה במערכת',
        component: AccountTypeSelector,
        required: true
      },
      {
        id: 'teacher-setup',
        title: 'הגדרת פרופיל מורה',
        description: 'הגדרת פרטים מקצועיים',
        component: TeacherSetup,
        required: true
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

    return steps;
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
          specializations: currentUser.specializations || []
        },
        hasCompletedTeacherSetup: !!(currentUser.user_type === 'teacher' &&
          (currentUser.education_level || currentUser.phone || currentUser.specializations?.length > 0)),

        // Subscription step
        subscriptionPlan: null,
        hasCompletedSubscription: false
      };

      setOnboardingData(existingData);

      // Determine what step the teacher should be on based on completed data
      let appropriateStep = 0;

      if (!existingData.hasCompletedAgeVerification) {
        appropriateStep = 0;
      } else if (!existingData.hasCompletedAccountSetup) {
        appropriateStep = 1;
      } else if (!existingData.hasCompletedTeacherSetup) {
        appropriateStep = 2;
      } else if (existingData.hasCompletedTeacherSetup) {
        if (settings?.subscription_system_enabled) {
          appropriateStep = 3;
        } else {
          appropriateStep = 2;
        }
      }

      setCurrentStep(appropriateStep);

    } catch (error) {
      cerror('[OnboardingWizard] Error loading existing user data:', error);
    }
  }, [currentUser]);

  useEffect(() => {
    const checkUserStatus = async () => {
      if (!currentUser) return;

      // If user already completed onboarding, they don't need it again
      if (currentUser.onboarding_completed === true) {
        navigate('/dashboard');
        return;
      }

      // Load existing user data to pre-populate forms
      await loadExistingUserData();
    };

    checkUserStatus();
  }, [currentUser, navigate, loadExistingUserData]);

  const handleStepComplete = async (stepId, stepData) => {
    clog(`[OnboardingWizard] ✅ Step ${stepId} completed with data:`, stepData);
    clog(`[OnboardingWizard] 📍 Current step before processing: ${currentStep}`);
    clog(`[OnboardingWizard] 📊 Total steps available: ${steps.length}`);
    clog(`[OnboardingWizard] 🔍 Is this the last step?`, currentStep >= steps.length - 1);

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
        clog(`[OnboardingWizard] 🔍 Updating user with ID: ${currentUser.id}`);
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
            userId: currentUser.id,
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
      clog(`[OnboardingWizard] 🎯 Calling handleOnboardingComplete() now...`);
      handleOnboardingComplete();
    }
  };

  const handleOnboardingComplete = async () => {
    clog('[OnboardingWizard] 🎉 STARTING handleOnboardingComplete function');
    setIsLoading(true);
    setError('');

    try {
      // Mark onboarding as completed (user data already saved step by step)
      const userUpdates = {
        onboarding_completed: true
      };

      clog('[OnboardingWizard] 💾 About to update user with:', userUpdates);
      // Update user profile
      const updatedUser = await User.updateMyUserData(userUpdates);
      clog('[OnboardingWizard] ✅ User updated successfully:', updatedUser);
      clog('[OnboardingWizard] 🔍 Updated user onboarding_completed value:', updatedUser.onboarding_completed);

      // Ensure UserContext is updated synchronously
      updateUser(updatedUser);

      // Double-check that the user context has been updated
      clog('[OnboardingWizard] 🔄 UserContext should now have updated user data');

      clog('[OnboardingWizard] Onboarding completed successfully');

      // Show success message
      const successMessage = 'החשבון שלך הוגדר בהצלחה. כעת תועבר לדף הבית.';

      clog('[OnboardingWizard] 🎯 Showing success toast and preparing redirect');
      toast({
        title: 'ברוך הבא למערכת!',
        description: successMessage,
        variant: 'default'
      });

      // Redirect to dashboard
      clog('[OnboardingWizard] 🚀 Setting redirect timeout to /dashboard in 2 seconds...');
      setTimeout(() => {
        clog('[OnboardingWizard] 🏠 NOW redirecting to /dashboard');
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-base font-medium">טוען...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="min-h-screen flex flex-col">
        {/* Professional Header */}
        <div className="bg-white border-b border-gray-200 py-6 md:py-8 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 md:w-14 md:h-14 bg-blue-600 rounded-xl mb-4">
              <Settings className="w-6 h-6 md:w-7 md:h-7 text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              הגדרת חשבון מורה
            </h1>
            <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto">
              השלימו את ההרשמה בכמה צעדים פשוטים
            </p>
          </div>
        </div>

        {/* Professional Progress Indicator */}
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6">
            {/* Mobile Step Circles */}
            <div className="block md:hidden">
              <div className="flex items-center justify-center gap-3 mb-4">
                {steps.map((step, index) => {
                  const isCompleted = index < currentStep;
                  const isCurrent = index === currentStep;
                  const isUpcoming = index > currentStep;

                  return (
                    <div key={step.id} className="flex items-center">
                      <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm transition-all duration-200
                        ${isCompleted ? 'bg-green-600 text-white' : ''}
                        ${isCurrent ? 'bg-blue-600 text-white ring-2 ring-blue-200' : ''}
                        ${isUpcoming ? 'bg-gray-100 text-gray-400 border border-gray-200' : ''}
                      `}>
                        {isCompleted ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <span>{index + 1}</span>
                        )}
                      </div>
                      {index < steps.length - 1 && (
                        <div className={`w-8 h-0.5 mx-1 transition-all duration-200 ${
                          isCompleted ? 'bg-green-600' : 'bg-gray-200'
                        }`}></div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="text-center">
                <div className="text-gray-900 font-semibold text-sm">{steps[currentStep]?.title}</div>
                <div className="text-xs text-gray-500 mt-1">{steps[currentStep]?.description}</div>
              </div>
            </div>

            {/* Desktop Step Circles */}
            <div className="hidden md:flex items-center justify-between">
              {steps.map((step, index) => {
                const isCompleted = index < currentStep;
                const isCurrent = index === currentStep;
                const isUpcoming = index > currentStep;

                return (
                  <div key={step.id} className="flex items-center flex-1">
                    <div className="flex items-center">
                      <div className={`
                        w-10 h-10 rounded-full flex items-center justify-center font-medium text-sm transition-all duration-200
                        ${isCompleted ? 'bg-green-600 text-white' : ''}
                        ${isCurrent ? 'bg-blue-600 text-white ring-2 ring-blue-200' : ''}
                        ${isUpcoming ? 'bg-gray-100 text-gray-400 border border-gray-200' : ''}
                      `}>
                        {isCompleted ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          <span>{index + 1}</span>
                        )}
                      </div>
                      <div className="mr-3 text-right">
                        <div className={`font-medium text-sm transition-colors duration-200 ${isCurrent ? 'text-gray-900' : 'text-gray-500'}`}>
                          {step.title}
                        </div>
                        <div className="text-xs text-gray-400">
                          {step.description}
                        </div>
                      </div>
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-4 transition-all duration-200 ${
                        isCompleted ? 'bg-green-600' : 'bg-gray-200'
                      }`}></div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Admin Skip Button */}
            {isAdmin && (
              <div className="flex justify-center md:justify-end mt-4 pt-4 border-t border-gray-100">
                <Button
                  onClick={handleAdminSkip}
                  variant="outline"
                  size="sm"
                  className="text-gray-600 hover:text-gray-800 border-gray-300 hover:bg-gray-50 text-sm"
                  disabled={isLoading}
                >
                  <SkipForward className="w-4 h-4 ml-1" />
                  דלג על ההרשמה (מנהל)
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="max-w-4xl mx-auto px-4 mb-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                <p className="text-red-800 text-sm font-medium">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Step Container */}
        <div className="flex-1 max-w-4xl mx-auto px-4 pb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Step Header */}
            <div className="bg-gray-50 border-b border-gray-200 p-4 md:p-6">
              <h2 className="text-lg md:text-xl font-semibold text-gray-900 text-center">
                {currentStepData?.title}
              </h2>
              <p className="text-gray-600 text-sm md:text-base text-center mt-1">
                {currentStepData?.description}
              </p>
            </div>

            {/* Step Content */}
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

          </div>
        </div>
      </div>
    </div>
  );
}
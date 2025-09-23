import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, ArrowRight, Check, AlertCircle } from 'lucide-react';

/**
 * WizardShell Component
 *
 * A flexible wizard container that can be customized by plugins.
 * Supports dynamic step management, plugin-driven validation,
 * and consistent navigation UX across different wizard types.
 */
export default function WizardShell({
  title,
  subtitle,
  steps,
  currentStep,
  onStepChange,
  data,
  onDataChange,
  validationErrors = {},
  onSave,
  onSaveDraft,
  onCancel,
  isLoading = false,
  isSaving = false,
  isSavingDraft = false,
  error = null,
  isEditMode = false,
  saveButtonText,
  draftButtonText,
  className = "",
  showProgress = true,
  allowSkipValidation = false
}) {
  const [localValidationErrors, setLocalValidationErrors] = useState({});

  // Merge external and local validation errors
  const allValidationErrors = useMemo(() => ({
    ...localValidationErrors,
    ...validationErrors
  }), [localValidationErrors, validationErrors]);

  // Current step configuration
  const currentStepConfig = useMemo(() => {
    return steps[currentStep] || null;
  }, [steps, currentStep]);

  // Navigation helpers
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  // Step accessibility - check if step can be navigated to
  const getStepAccessibility = useCallback((stepIndex) => {
    // Current step is always accessible
    if (stepIndex === currentStep) return { accessible: true, reason: 'current' };

    // Can always go back to previous steps
    if (stepIndex < currentStep) return { accessible: true, reason: 'completed' };

    // For forward steps, check if all previous steps are valid
    for (let i = 0; i < stepIndex; i++) {
      const step = steps[i];
      if (step.validate) {
        const validation = step.validate(data);
        if (!validation.isValid) {
          return { accessible: false, reason: `Step ${i + 1} has validation errors` };
        }
      }
    }

    return { accessible: true, reason: 'validated' };
  }, [currentStep, steps, data]);

  // Handle direct step navigation
  const handleStepClick = useCallback((stepIndex) => {
    const accessibility = getStepAccessibility(stepIndex);
    if (accessibility.accessible) {
      onStepChange(stepIndex);
    }
  }, [getStepAccessibility, onStepChange]);

  // Validation for current step
  const validateCurrentStep = useCallback(() => {
    if (!currentStepConfig || !currentStepConfig.validate) {
      return { isValid: true, errors: {} };
    }

    const stepValidation = currentStepConfig.validate(data);
    setLocalValidationErrors(stepValidation.errors || {});

    return stepValidation;
  }, [currentStepConfig, data]);

  // Check if current step is valid
  const isCurrentStepValid = useMemo(() => {
    if (allowSkipValidation) return true;

    // Don't call validateCurrentStep here - just check based on existing validation errors
    return Object.keys(allValidationErrors).length === 0;
  }, [allValidationErrors, allowSkipValidation]);

  // Navigation handlers
  const handleNext = useCallback(() => {
    const validation = validateCurrentStep();

    if (!validation.isValid && !allowSkipValidation) {
      return;
    }

    if (currentStep < steps.length - 1) {
      onStepChange(currentStep + 1);
    }
  }, [validateCurrentStep, allowSkipValidation, currentStep, steps.length, onStepChange]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      onStepChange(currentStep - 1);
    }
  }, [currentStep, onStepChange]);

  // Check if entire wizard is complete and valid for publication
  const isWizardComplete = useMemo(() => {
    return steps.every((step, index) => {
      if (!step.validate) return true;
      const validation = step.validate(data);
      return validation.isValid;
    });
  }, [steps, data]);

  const handleSave = useCallback(async () => {
    const validation = validateCurrentStep();

    if (!validation.isValid) {
      return;
    }

    if (onSave) {
      await onSave(data, isWizardComplete);
    }
  }, [validateCurrentStep, onSave, data, isWizardComplete]);

  const handleSaveDraft = useCallback(async () => {
    if (onSaveDraft) {
      await onSaveDraft(data);
    }
  }, [onSaveDraft, data]);

  // Auto-validate when data changes
  useEffect(() => {
    if (currentStepConfig && currentStepConfig.validate) {
      validateCurrentStep();
    }
  }, [data, validateCurrentStep, currentStepConfig]);

  // Loading state
  if (isLoading) {
    return (
      <div className={`min-h-screen bg-gray-50 flex items-center justify-center ${className}`} dir="rtl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">טוען...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`min-h-screen bg-gray-50 p-4 ${className}`} dir="rtl">
        <div className="max-w-4xl mx-auto">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={onCancel} className="mt-4">
            חזרה
          </Button>
        </div>
      </div>
    );
  }

  if (!currentStepConfig) {
    return (
      <div className={`min-h-screen bg-gray-50 p-4 ${className}`} dir="rtl">
        <div className="max-w-4xl mx-auto">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>שלב לא נמצא</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const CurrentStepComponent = currentStepConfig.component;

  return (
    <div className={`min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 ${className}`} dir="rtl">
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="mb-12">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl mb-4 shadow-lg">
              <div className="text-white text-2xl font-bold">🎮</div>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              {title}
            </h1>
            {subtitle && (
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                {subtitle}
              </p>
            )}
          </div>

          {/* Progress Steps */}
          {showProgress && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
              <div className="flex items-center justify-center">
                {steps.map((step, index) => {
                  const accessibility = getStepAccessibility(index);
                  const isClickable = accessibility.accessible;
                  const isCompleted = index < currentStep;
                  const isCurrent = index === currentStep;

                  return (
                    <div key={step.id} className="flex items-center">
                      <div className="flex flex-col items-center">
                        <div
                          className={`
                            relative w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 transform
                            ${isCompleted
                              ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg scale-105'
                              : isCurrent
                                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg scale-110 ring-4 ring-blue-100'
                                : 'bg-gray-100 border-2 border-gray-300 text-gray-400'
                            }
                            ${isClickable
                              ? 'cursor-pointer hover:scale-105 hover:shadow-xl'
                              : 'cursor-not-allowed opacity-60'
                            }
                          `}
                          onClick={() => isClickable && handleStepClick(index)}
                          title={isClickable
                            ? `לחץ כדי לעבור לשלב: ${step.title}`
                            : `שלב לא זמין: ${accessibility.reason}`
                          }
                        >
                          {isCompleted ? (
                            <Check className="w-6 h-6" />
                          ) : (
                            <span className="text-lg">{index + 1}</span>
                          )}

                          {/* Pulsing ring for current step */}
                          {isCurrent && (
                            <div className="absolute inset-0 rounded-full border-2 border-blue-400 animate-ping opacity-75"></div>
                          )}
                        </div>

                        <span
                          className={`mt-3 text-sm font-medium transition-all max-w-24 text-center leading-tight ${
                            isCurrent ? 'text-blue-600 font-bold' :
                            isCompleted ? 'text-green-600' : 'text-gray-400'
                          } ${isClickable ? 'cursor-pointer hover:underline' : 'cursor-not-allowed'}`}
                          data-tutorial={step.tutorialAttribute || ''}
                          onClick={() => isClickable && handleStepClick(index)}
                          title={isClickable
                            ? `לחץ כדי לעבור לשלב: ${step.title}`
                            : `שלב לא זמין: ${accessibility.reason}`
                          }
                        >
                          {step.title}
                        </span>
                      </div>

                      {/* Connection line */}
                      {index < steps.length - 1 && (
                        <div className="flex-1 h-1 mx-6 relative">
                          <div className="absolute inset-0 bg-gray-200 rounded-full"></div>
                          <div
                            className={`absolute inset-0 rounded-full transition-all duration-500 ${
                              index < currentStep
                                ? 'bg-gradient-to-r from-green-500 to-blue-500'
                                : 'bg-gray-200'
                            }`}
                            style={{
                              width: index < currentStep ? '100%' : '0%'
                            }}
                          />
                          {/* Moving dot animation for current transition */}
                          {index === currentStep - 1 && (
                            <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-blue-500 rounded-full animate-pulse shadow-lg"></div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Step Content */}
        <Card className="border-none shadow-2xl bg-white backdrop-blur-sm rounded-3xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-1"></div>
          <CardContent className="p-8 md:p-12">
            <div className="animate-in slide-in-from-right-5 duration-500">
              <CurrentStepComponent
                data={data}
                onDataChange={onDataChange}
                onUpdate={onDataChange}
                validationErrors={allValidationErrors}
                isEditMode={isEditMode}
                stepConfig={currentStepConfig}
                wizard={{
                  currentStep,
                  totalSteps: steps.length,
                  isFirstStep,
                  isLastStep,
                  goNext: handleNext,
                  goPrevious: handlePrevious
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mt-8">
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={isFirstStep}
              className="flex items-center gap-2 px-6 py-3 rounded-xl border-2 hover:bg-gray-50 disabled:opacity-50 transition-all duration-200"
            >
              <ArrowLeft className="w-5 h-5" />
              הקודם
            </Button>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onCancel}
                className="px-6 py-3 rounded-xl border-2 border-gray-200 hover:bg-gray-50 text-gray-600 transition-all duration-200"
              >
                ביטול
              </Button>

              {/* Draft button - available on all steps */}
              {onSaveDraft && (
                <Button
                  variant="outline"
                  onClick={handleSaveDraft}
                  disabled={isSavingDraft}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-yellow-200 text-yellow-700 hover:bg-yellow-50 disabled:opacity-50 transition-all duration-200"
                >
                  {isSavingDraft ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-600"></div>
                      שומר טיוטה...
                    </>
                  ) : (
                    <>
                      📝
                      {draftButtonText || 'שמור כטיוטה'}
                    </>
                  )}
                </Button>
              )}

              {isLastStep ? (
                <Button
                  onClick={handleSave}
                  disabled={isSaving || (!isCurrentStepValid && !allowSkipValidation)}
                  className={`flex items-center gap-2 px-8 py-3 rounded-xl font-semibold shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none ${
                    isWizardComplete
                      ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-green-200'
                      : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-blue-200'
                  }`}
                  data-tutorial="save-button"
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      שומר...
                    </>
                  ) : (
                    <>
                      {isWizardComplete ? '🎉' : '💾'}
                      {isWizardComplete
                        ? (saveButtonText || (isEditMode ? 'עדכן ופרסם' : 'צור ופרסם'))
                        : (isEditMode ? 'עדכן כטיוטה' : 'שמור כטיוטה')
                      }
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  disabled={!isCurrentStepValid && !allowSkipValidation}
                  className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold shadow-lg shadow-blue-200 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
                  data-tutorial-next-step
                >
                  הבא
                  <ArrowRight className="w-5 h-5" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Completion Status for Publication */}
        {isLastStep && !isWizardComplete && (
          <div className="mt-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="mb-2 font-medium">הבדיקות הבאות נדרשות לפרסום:</div>
                <ul className="list-disc list-inside space-y-1">
                  {steps.map((step, index) => {
                    if (!step.validate) return null;
                    const validation = step.validate(data);
                    if (validation.isValid) return null;

                    return (
                      <li key={index} className="text-sm">
                        <button
                          onClick={() => handleStepClick(index)}
                          className="text-blue-600 hover:underline cursor-pointer"
                        >
                          {step.title}
                        </button>
                        : {Object.values(validation.errors).join(', ')}
                      </li>
                    );
                  }).filter(Boolean)}
                </ul>
                <div className="mt-2 text-sm text-gray-600">
                  ניתן לשמור כטיוטה ולחזור לערוך מאוחר יותר.
                </div>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Validation Errors Summary */}
        {Object.keys(allValidationErrors).length > 0 && (
          <div className="mt-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="mb-2 font-medium">יש לתקן את השגיאות הבאות:</div>
                <ul className="list-disc list-inside space-y-1">
                  {Object.values(allValidationErrors).map((error, index) => (
                    <li key={index} className="text-sm">{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          </div>
        )}
      </div>
    </div>
  );
}
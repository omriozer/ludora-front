import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Save,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Lock,
  Check
} from 'lucide-react';
import LudoraLoadingSpinner from '@/components/ui/LudoraLoadingSpinner';
import { getProductTypeName } from '@/config/productTypes';

/**
 * WizardLayout - Step-by-step wizard interface
 * Presents the same sections as guided steps with progress tracking
 */
export const WizardLayout = ({
  editingProduct,
  formData,
  isNewProduct,
  step,
  setStep,
  sections,
  message,
  showMessage,
  isSaving,
  setIsSaving,
  saveAndContinue,
  setSaveAndContinue,
  shouldShowSaveAndContinue,
  canSave,
  canPublish,
  validateForm,
  hasChanges,
  onClose,
  onSave,
  isLoadingData,
  hasUploadedFile = false,
  isPageMode = false
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [stepValidation, setStepValidation] = useState({});

  // Show all sections, regardless of availability (for better UX)
  // User can see all steps but content will be disabled for unavailable sections
  const visibleSections = sections;

  // Current section should always be from visible sections
  const currentSection = visibleSections[currentStepIndex];

  // Removed step accessibility checks for improved UX

  // Validate all visible steps
  useEffect(() => {
    const validation = validateForm();

    // Define step-specific validation rules
    const stepRequirements = {
      basicInfo: () => {
        return !!(formData.title?.trim() &&
                 formData.description?.trim() &&
                 formData.price !== undefined &&
                 formData.price !== '' &&
                 !isNaN(parseFloat(formData.price)) &&
                 parseFloat(formData.price) >= 0 &&
                 formData.product_type);
      },
      productContent: () => {
        if (!formData.product_type) return false;

        // Check if this is a bundle first
        if (formData.type_attributes?.is_bundle === true) {
          const bundleItems = formData.type_attributes?.bundle_items || [];
          return bundleItems.length >= 2; // Bundle products need at least 2 linked products
        }

        if (formData.product_type === 'file') {
          return hasUploadedFile; // File products MUST have an uploaded file
        }
        if (formData.product_type === 'tool') {
          return !!(formData.tool_url?.trim());
        }
        if (formData.product_type === 'course') {
          return !!(formData.course_modules && formData.course_modules.length > 0);
        }
        if (formData.product_type === 'workshop') {
          return !!(formData.total_duration_minutes && formData.total_duration_minutes > 0);
        }
        if (formData.product_type === 'game') {
          return true; // Game products are considered complete when created
        }
        if (formData.product_type === 'lesson_plan') {
          // Lesson plans require either SVG slides OR at least one file in the opening section
          const hasOpeningFiles = !!(formData.file_configs?.files?.some(file => file.file_role === 'opening'));
          const hasSVGSlides = !!(formData.file_configs?.presentation && formData.file_configs.presentation.length > 0);
          const isValid = hasOpeningFiles || hasSVGSlides;

          return isValid;
        }
        return true; // Other product types don't have specific requirements
      },
      marketing: () => {
        return true; // Marketing materials are optional
      },
      accessSettings: () => {
        return true; // Access settings have defaults
      },
      publishing: () => {
        return formData.is_published; // Only completed when actually published
      }
    };

    // Validate all visible sections, not just current one
    const newStepValidation = {};
    const newCompletedSteps = new Set();

    visibleSections.forEach(section => {
      const isStepValid = stepRequirements[section.id] ? stepRequirements[section.id]() : true;
      newStepValidation[section.id] = isStepValid;

      if (isStepValid) {
        newCompletedSteps.add(section.id);
      }
    });

    setStepValidation(newStepValidation);
    setCompletedSteps(newCompletedSteps);
  }, [
    formData.product_type,
    formData.title,
    formData.description,
    formData.price,
    formData.tool_url,
    formData.course_modules?.length,
    formData.total_duration_minutes,
    formData.file_configs?.files?.length, // For lesson plan file validation
    JSON.stringify(formData.file_configs?.files?.filter(f => f.file_role === 'opening')), // Trigger on opening files change
    formData.file_configs?.presentation?.length, // For lesson plan SVG slides validation
    formData.is_published, // For publishing step validation
    formData.type_attributes?.is_bundle, // For bundle product detection
    formData.type_attributes?.bundle_items?.length, // For bundle items count validation
    hasUploadedFile,
    visibleSections.length // Only depend on length, not the entire array
  ]);

  // Reset step index if current step is not in visible sections
  useEffect(() => {
    if (currentStepIndex >= visibleSections.length) {
      setCurrentStepIndex(Math.max(0, visibleSections.length - 1));
    }
  }, [visibleSections.length, currentStepIndex]);

  // Check if step is accessible - improved logic for better UX
  const isStepAccessible = (stepIndex) => {
    // If we have an editing product with an ID, all tabs should be accessible
    if (editingProduct?.id) return true;

    // If we're not dealing with a new product, all tabs should be accessible
    if (!isNewProduct) return true;

    // For truly new products (no ID yet), only first step is accessible until product is saved
    return stepIndex === 0;
  };

  // Navigation functions
  const goToStep = (stepIndex) => {
    if (stepIndex >= 0 && stepIndex < visibleSections.length) {
      // Check accessibility
      if (!isStepAccessible(stepIndex)) {
        return; // Don't allow navigation to locked steps
      }
      setCurrentStepIndex(stepIndex);
    }
  };

  const goNext = () => {
    if (currentStepIndex < visibleSections.length - 1) {
      const nextStepIndex = currentStepIndex + 1;
      if (isStepAccessible(nextStepIndex)) {
        setCurrentStepIndex(nextStepIndex);
      }
    }
  };

  const goPrevious = () => {
    if (currentStepIndex > 0) {
      const prevStepIndex = currentStepIndex - 1;
      if (isStepAccessible(prevStepIndex)) {
        setCurrentStepIndex(prevStepIndex);
      }
    }
  };

  // Handle form submission
  const handleSubmit = async (continueEditing = false) => {
    const validation = validateForm();

    if (!validation.isValid) {
      showMessage('error', 'יש למלא את כל השדות החובה לפני השמירה');
      return;
    }

    const canSaveNow = canSave();

    if (!canSaveNow) {
      showMessage('error', 'לא ניתן לשמור את המוצר כרגע');
      return;
    }

    try {
      setIsSaving(true);
      setSaveAndContinue(continueEditing);

      await onSave(formData, continueEditing);

      if (!continueEditing) {
        onClose();
      } else {
        showMessage('success', 'המוצר נשמר בהצלחה! ניתן להמשיך לערוך');
      }
    } catch (error) {
      showMessage('error', error.message || 'אירעה שגיאה בשמירת המוצר');
    } finally {
      setIsSaving(false);
      setSaveAndContinue(false);
    }
  };

  // Get step status
  const getStepStatus = (sectionId, index) => {
    if (index === currentStepIndex) return 'current';
    if (completedSteps.has(sectionId)) return 'completed';

    // Special handling for publishing section - show "ready" when validation passes but not published
    if (sectionId === 'publishing') {
      const validation = validateForm();
      if (validation.isValid && !formData.is_published) {
        return 'ready'; // Ready to publish but not yet published
      }
    }

    if (index < currentStepIndex) return 'visited';
    return 'upcoming';
  };

  // Get step icon
  const getStepIcon = (sectionId, index) => {
    const status = getStepStatus(sectionId, index);

    if (status === 'completed') {
      return <Check className="w-4 h-4 text-green-600" />;
    }
    if (status === 'ready') {
      return <CheckCircle className="w-4 h-4 text-blue-600" />;
    }
    if (status === 'current') {
      return <div className="w-4 h-4 rounded-full bg-blue-600 border-2 border-white" />;
    }
    if (stepValidation[sectionId] === false) {
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
    return <div className="w-4 h-4 rounded-full bg-gray-300" />;
  };

  // Get modal title
  const getModalTitle = () => {
    if (step === 'typeSelection') {
      return 'יצירת מוצר חדש - שלב 1';
    }

    const productTypeName = getProductTypeName(formData.product_type, 'singular') || 'מוצר';
    const stepTitle = currentSection ? currentSection.title : '';

    // Check if we're actually editing an existing product (has an ID)
    const isEditingExisting = editingProduct?.id;

    return isEditingExisting
      ? `עריכת ${productTypeName} - ${stepTitle}`
      : `יצירת ${productTypeName} חדש - ${stepTitle}`;
  };

  // Show loading spinner if data is loading
  if (isLoadingData) {
    if (isPageMode) {
      return (
        <div className="flex items-center justify-center p-8">
          <LudoraLoadingSpinner />
        </div>
      );
    }

    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          {/* Custom RTL Header for loading state */}
          <div className="flex items-center justify-between p-6 border-b" dir="rtl">
            <h2 className="text-xl font-semibold text-gray-900">
              טוען נתונים...
            </h2>
          </div>
          <div className="flex items-center justify-center p-8">
            <LudoraLoadingSpinner />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Main content layout
  const mainContent = (
    <div className="space-y-6 px-6 pb-6">

          {/* Step Navigation */}
          <div className="flex flex-wrap gap-2 justify-center p-4 bg-gray-50 rounded-lg">
            {visibleSections.map((section, index) => {
              const status = getStepStatus(section.id, index);
              const isAvailable = section.access.available;
              const isStepAccessibleNow = isStepAccessible(index);
              const isLocked = !isStepAccessibleNow;

              return (
                <button
                  key={section.id}
                  onClick={() => goToStep(index)}
                  disabled={isLocked}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isLocked
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-60'
                      : status === 'current'
                      ? 'bg-blue-600 text-white cursor-pointer'
                      : status === 'completed'
                      ? 'bg-green-100 text-green-800 hover:bg-green-200 cursor-pointer'
                      : status === 'ready'
                      ? 'bg-blue-100 text-blue-800 hover:bg-blue-200 cursor-pointer'
                      : status === 'visited'
                      ? 'bg-gray-200 text-gray-700 hover:bg-gray-300 cursor-pointer'
                      : !isAvailable
                      ? 'bg-orange-100 text-orange-600 hover:bg-orange-200 cursor-pointer'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200 cursor-pointer'
                  }`}
                >
                  {isLocked ? (
                    <Lock className="w-4 h-4" />
                  ) : !isAvailable ? (
                    <Lock className="w-4 h-4" />
                  ) : (
                    getStepIcon(section.id, index)
                  )}
                  <span className="hidden sm:inline">{section.title}</span>
                  <span className="sm:hidden">{index + 1}</span>
                </button>
              );
            })}
          </div>

          {/* Message Display - only show at top if not saving */}
          {message && !isSaving && (
            <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
              {message.type === 'error' ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          {/* Current Step Content */}
          {currentSection && (
            <div className="min-h-[400px]">
              <div className={`mb-4 p-4 rounded-lg border ${
                !currentSection.access.available
                  ? 'bg-orange-50 border-orange-200'
                  : 'bg-blue-50 border-blue-200'
              }`}>
                <h3 className={`font-semibold mb-1 ${
                  !currentSection.access.available
                    ? 'text-orange-900'
                    : 'text-blue-900'
                }`}>
                  {currentSection.title}
                  {!currentSection.access.available && (
                    <Lock className="w-4 h-4 inline-block mr-2" />
                  )}
                </h3>
                <p className={`text-sm ${
                  !currentSection.access.available
                    ? 'text-orange-700'
                    : 'text-blue-700'
                }`}>
                  {currentSection.access.description}
                </p>

                {!currentSection.access.available && currentSection.access.reason && (
                  <div className="mt-2 flex items-center gap-2 text-orange-600">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">{currentSection.access.reason}</span>
                  </div>
                )}

                {currentSection.access.available && stepValidation[currentSection.id] === false && (
                  <div className="mt-2 flex items-center gap-2 text-red-600">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">יש להשלים שדות חובה בשלב זה</span>
                  </div>
                )}

                {currentSection.access.available && stepValidation[currentSection.id] !== false && (() => {
                  const stepStatus = getStepStatus(currentSection.id, currentStepIndex);

                  if (stepStatus === 'ready') {
                    return (
                      <div className="mt-2 flex items-center gap-2 text-blue-600">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm">מוכן לפרסום</span>
                      </div>
                    );
                  }

                  if (stepStatus === 'completed') {
                    return (
                      <div className="mt-2 flex items-center gap-2 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm">{currentSection.id === 'publishing' ? 'מוצר פורסם' : 'שלב זה הושלם'}</span>
                      </div>
                    );
                  }

                  return (
                    <div className="mt-2 flex items-center gap-2 text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm">שלב זה הושלם</span>
                    </div>
                  );
                })()}
              </div>

              <div className={
                isSaving || !currentSection.access.available || !isStepAccessible(currentStepIndex)
                  ? 'pointer-events-none opacity-50'
                  : ''
              }>
                <currentSection.component
                  {...currentSection.props}
                  disabled={isSaving || !currentSection.access.available || !isStepAccessible(currentStepIndex)}
                />
              </div>

              {(!currentSection.access.available || !isStepAccessible(currentStepIndex)) && (
                <div className="mt-4 p-4 bg-orange-100 border border-orange-200 rounded-lg">
                  <div className="flex items-center gap-2 text-orange-800">
                    <Lock className="w-5 h-5" />
                    <span className="font-medium">השלב נעול</span>
                  </div>
                  <p className="mt-1 text-sm text-orange-700">
                    {!isStepAccessible(currentStepIndex)
                      ? 'יש לשמור את המוצר תחילה כדי לגשת לשלבים הבאים'
                      : currentSection.access.reason || 'השלב הזה אינו זמין כרגע'
                    }
                  </p>
                </div>
              )}
            </div>
          )}


          {/* Navigation Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
            {/* Message Display near save buttons - only show during/after saving */}
            {message && (isSaving || message.text.includes('נשמר') || message.text.includes('נוצר') || message.text.includes('עודכן')) && (
              <div className="w-full mb-3">
                <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
                  {message.type === 'error' ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  <AlertDescription>{message.text}</AlertDescription>
                </Alert>
              </div>
            )}
            {/* Previous/Next Navigation */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={goPrevious}
                disabled={currentStepIndex === 0 || isSaving || !isStepAccessible(currentStepIndex - 1)}
                className="flex items-center gap-2"
              >
                <ChevronRight className="w-4 h-4" />
                הקודם
              </Button>

              {currentStepIndex < visibleSections.length - 1 ? (
                <Button
                  type="button"
                  onClick={goNext}
                  disabled={isSaving || !isStepAccessible(currentStepIndex + 1)}
                  className="flex items-center gap-2"
                >
                  הבא
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              ) : (
                <Badge variant="secondary" className="px-4 py-2">
                  שלב אחרון
                </Badge>
              )}
            </div>

            {/* Save Actions */}
            <div className="flex-1 flex flex-col sm:flex-row gap-2 sm:justify-end">
              {/* Cancel Button */}
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSaving}
                className="flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                ביטול
              </Button>

              {/* For new products, only show Save and Continue */}
              {isNewProduct ? (
                <Button
                  type="button"
                  onClick={() => handleSubmit(true)}
                  disabled={isSaving || !canSave()}
                  className="flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <LudoraLoadingSpinner size="small" />
                      יוצר מוצר...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      צור מוצר והמשך
                    </>
                  )}
                </Button>
              ) : (
                <>
                  {/* Save and Continue Button for existing products */}
                  {shouldShowSaveAndContinue && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleSubmit(true)}
                      disabled={isSaving || !canSave()}
                      className="flex items-center gap-2"
                    >
                      {isSaving && saveAndContinue ? (
                        <>
                          <LudoraLoadingSpinner size="small" />
                          שומר...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          שמור והמשך
                        </>
                      )}
                    </Button>
                  )}

                  {/* Save and Close Button for existing products */}
                  <Button
                    type="button"
                    onClick={() => handleSubmit()}
                    disabled={isSaving || !canSave()}
                    className="flex items-center gap-2"
                  >
                    {isSaving && !saveAndContinue ? (
                      <>
                        <LudoraLoadingSpinner size="small" />
                        שומר...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        שמור שינויים
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Status Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t text-sm">
            {hasChanges() && !isSaving && (
              <div className="text-amber-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                שינויים לא נשמרו
              </div>
            )}

            {editingProduct && (
              <div className="flex items-center gap-2">
                <span className="text-gray-600">סטטוס:</span>
                <Badge variant={formData.is_published ? 'default' : 'secondary'}>
                  {formData.is_published ? 'פורסם' : 'טיוטה'}
                </Badge>
              </div>
            )}
          </div>
        </div>
      );

  // Return modal or page layout
  if (isPageMode) {
    return mainContent;
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0">
        {/* Custom RTL Header for modal */}
        <div className="flex items-center justify-between p-6 border-b" dir="rtl">
          <h2 className="text-xl font-semibold text-gray-900">
            {getModalTitle()}
          </h2>
        </div>
        {mainContent}
      </DialogContent>
    </Dialog>
  );
};
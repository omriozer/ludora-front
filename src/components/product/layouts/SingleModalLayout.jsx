import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Save, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import LudoraLoadingSpinner from '@/components/ui/LudoraLoadingSpinner';
import { getProductTypeName } from '@/config/productTypes';
import { luderror } from '@/lib/ludlog';

/**
 * SingleModalLayout - Renders all sections in a single scrollable modal
 * Maintains the current UI pattern while using the new component architecture
 */
export const SingleModalLayout = ({
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
  isLoadingData
}) => {

  // Handle form submission
  const handleSubmit = async (continueEditing = false) => {
    const validation = validateForm();
    if (!validation.isValid) {
      showMessage('error', 'יש למלא את כל השדות החובה');
      return;
    }

    if (!canSave()) {
      showMessage('error', 'לא ניתן לשמור את המוצר כרגע');
      return;
    }

    try {
      setIsSaving(true);
      setSaveAndContinue(continueEditing);

      // Call the onSave prop with form data
      await onSave(formData, continueEditing);

      // Note: Modal stays open after saving - only close button closes the modal
    } catch (error) {
      luderror.ui('Save error:', error);
      showMessage('error', error.message || 'אירעה שגיאה בשמירת המוצר');
    } finally {
      setIsSaving(false);
      setSaveAndContinue(false);
    }
  };

  // Get modal title
  const getModalTitle = () => {
    if (step === 'typeSelection') {
      return 'יצירת מוצר חדש';
    }

    const productTypeName = getProductTypeName(formData.product_type, 'singular') || 'מוצר';
    return editingProduct ? `עריכת ${productTypeName}` : `יצירת ${productTypeName} חדש`;
  };

  // Show loading spinner if data is loading
  if (isLoadingData) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center p-8">
            <LudoraLoadingSpinner />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {getModalTitle()}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-6">
          {/* Message Display */}
          {message && (
            <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
              {message.type === 'error' ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          {/* Render all sections */}
          {sections.map((section) => {
            const SectionComponent = section.component;
            return (
              <div key={section.id}>
                <SectionComponent {...section.props} />
              </div>
            );
          })}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
            {/* Save and Continue Button - shown when sections become available after save */}
            {shouldShowSaveAndContinue && isNewProduct && (
              <Button
                type="button"
                variant="outline"
                onClick={() => handleSubmit(true)}
                disabled={isSaving || !canSave()}
                className="w-full sm:w-auto"
              >
                {isSaving && saveAndContinue ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin ml-2" />
                    שומר...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 ml-2" />
                    שמור והמשך עריכה
                  </>
                )}
              </Button>
            )}

            {/* Primary Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 flex-1">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSaving}
                className="w-full sm:w-auto"
              >
                <X className="w-4 h-4 ml-2" />
                סגירה
              </Button>

              <Button
                type="submit"
                disabled={isSaving || !canSave()}
                className="w-full sm:flex-1"
              >
                {isSaving && !saveAndContinue ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin ml-2" />
                    שומר...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 ml-2" />
                    {editingProduct ? 'שמור שינויים' : 'צור מוצר'}
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Save Status Information */}
          {hasChanges() && !isSaving && (
            <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded border border-amber-200">
              יש לך שינויים שלא נשמרו
            </div>
          )}

          {/* Publishing Status Information */}
          {editingProduct && (
            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded border">
              <div className="flex items-center gap-2">
                <span>סטטוס פרסום:</span>
                <span className={`font-medium ${
                  formData.is_published ? 'text-green-600' : 'text-gray-600'
                }`}>
                  {formData.is_published ? 'פורסם' : 'לא פורסם'}
                </span>
              </div>
              {!canPublish() && (
                <p className="text-xs text-amber-600 mt-1">
                  יש למלא את כל השדות החובה כדי לפרסם
                </p>
              )}
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
};
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserIcon, X } from 'lucide-react';
import { showSuccess, showError } from '@/utils/messaging';

/**
 * TeacherAssignmentConfirmation Dialog Component
 *
 * Shows a confirmation dialog when an anonymous player enters a teacher's catalog
 * for the first time, asking if they want to connect to that teacher.
 */
const TeacherAssignmentConfirmation = ({
  teacher,
  isOpen,
  onConfirm,
  onCancel,
  isLoading = false
}) => {
  if (!isOpen || !teacher) return null;

  const handleConfirm = async () => {
    try {
      await onConfirm();
      showSuccess(`התחברתם בהצלחה למורה ${teacher.name}!`);
    } catch (error) {
      showError('שגיאה בהתחברות למורה. נסו שוב.');
      console.error('Teacher assignment error:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md mx-auto bg-white/95 backdrop-blur-sm shadow-2xl border-0 rounded-3xl">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
          <CardTitle className="text-xl font-bold text-gray-900 text-center flex-1">
            התחברות למורה
          </CardTitle>

          {!isLoading && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="h-8 w-8 p-0 hover:bg-gray-100 flex-shrink-0"
              aria-label="סגור"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </CardHeader>

        <CardContent className="space-y-6 p-6 pt-0">
          {/* Teacher Info */}
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserIcon className="w-8 h-8 text-white" />
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {teacher.name || teacher.full_name}
            </h3>

            <p className="text-gray-600 text-center leading-relaxed">
              האם אתם רוצים להתחבר למורה הזה?
              <br />
              לאחר ההתחברות, המורה יוכל לראות את הפעילות שלכם במשחקים
              ולעקוב אחר ההתקדמות שלכם.
            </p>
          </div>

          {/* Privacy Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800 text-sm text-center">
              <strong>הערה חשובה:</strong> ההתחברות בטוחה ומוגנת פרטיות.
              המורה יראה רק את שם התצוגה שלכם ואת תוצאות המשחקים.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <Button
              onClick={handleConfirm}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  מתחבר...
                </>
              ) : (
                <>
                  <UserIcon className="w-5 h-5 mr-2" />
                  כן, אני רוצה להתחבר
                </>
              )}
            </Button>

            {!isLoading && (
              <Button
                onClick={onCancel}
                variant="outline"
                className="w-full py-3 rounded-xl border-2 border-gray-200 hover:bg-gray-50 transition-all"
              >
                לא עכשיו
              </Button>
            )}
          </div>

          {/* Help Text */}
          <p className="text-xs text-gray-500 text-center">
            תוכלו תמיד להמשיך לשחק גם בלי להתחבר למורה
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeacherAssignmentConfirmation;
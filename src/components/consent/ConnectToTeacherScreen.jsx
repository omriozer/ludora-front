import React, { useState } from 'react';
import { useUser } from '@/contexts/UserContext';
import { showSuccess, showError } from '@/utils/messaging';

/**
 * Screen shown to students who need to connect to a teacher using an invitation code.
 * This is part of the parent consent enforcement flow.
 */
const ConnectToTeacherScreen = ({ onTeacherLinked, onCancel }) => {
  const [invitationCode, setInvitationCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { currentUser } = useUser();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!invitationCode.trim()) {
      showError('אנא הכנס קוד הזמנה');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/link-teacher', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ invitation_code: invitationCode.trim() })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to link to teacher');
      }

      showSuccess(`התחברת בהצלחה למורה ${result.teacher.full_name}`);

      if (onTeacherLinked) {
        onTeacherLinked(result.teacher);
      }

    } catch (error) {
      // Error linking to teacher - show user-friendly error messages
      let errorMessage = 'אירעה שגיאה בחיבור למורה';

      if (error.message.includes('Invalid invitation code')) {
        errorMessage = 'קוד הזמנה לא תקין או המורה לא נמצא';
      } else if (error.message.includes('required')) {
        errorMessage = 'קוד הזמנה נדרש';
      }

      showError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">התחבר למורה</h2>
          <p className="text-gray-600 text-sm">
            כדי להמשיך, עליך להתחבר למורה שלך באמצעות קוד הזמנה
          </p>
        </div>

        {/* User Info */}
        {currentUser?.firebaseUser && (
          <div className="bg-blue-50 rounded-lg p-3 mb-6">
            <p className="text-sm text-blue-800">
              מחובר כ: <span className="font-semibold">{currentUser.firebaseUser.full_name || currentUser.firebaseUser.email}</span>
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="invitation-code" className="block text-sm font-medium text-gray-700 mb-2">
              קוד הזמנה מהמורה
            </label>
            <input
              id="invitation-code"
              type="text"
              value={invitationCode}
              onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
              placeholder="הכנס קוד הזמנה (למשל: ABC123XY)"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg font-mono tracking-wider"
              maxLength={8}
              disabled={isSubmitting}
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-2">
              קוד הזמנה מורכב מ-8 תווים באנגלית ומספרים
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isSubmitting || !invitationCode.trim()}
              className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'מתחבר...' : 'התחבר למורה'}
            </button>

            <button
              type="button"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="px-4 py-3 text-gray-600 hover:text-gray-800 font-medium disabled:opacity-50"
            >
              ביטול
            </button>
          </div>
        </form>

        {/* Help Text */}
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-yellow-600 mt-0.5 ml-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-yellow-800 mb-1">איפה מוצאים את קוד הזמנה?</h4>
              <p className="text-xs text-yellow-700">
                המורה שלך יכול לשתף איתך קוד הזמנה אישי דרך הפורטל למורים.
                פנה למורה שלך לקבלת הקוד.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectToTeacherScreen;
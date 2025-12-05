import React from 'react';
import { useUser } from '@/contexts/UserContext';

/**
 * Screen shown to students who are linked to a teacher but are waiting for parent consent.
 * This is part of the parent consent enforcement flow.
 */
const WaitingForConsentScreen = ({ onRefresh, onCancel }) => {
  const { currentUser } = useUser();

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">ממתינים להסכמת הורים</h2>
          <p className="text-gray-600 text-sm">
            נשלח מייל להורים שלך לקבלת הסכמה לשימוש במערכת
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

        {/* Status Message */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-orange-600 mt-0.5 ml-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-orange-800 mb-1">בדיקת הרשאות</h4>
              <p className="text-xs text-orange-700 leading-relaxed">
                בהתאם לחוקי הפרטיות בישראל, אנו זקוקים להסכמת ההורים שלך לפני שתוכל להשתמש במערכת.
                נשלח מייל לכתובת שסופקה למורה שלך.
              </p>
            </div>
          </div>
        </div>

        {/* What to do next */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <h4 className="text-sm font-medium text-green-800 mb-2">מה קורה עכשיו?</h4>
          <ul className="text-xs text-green-700 space-y-1">
            <li className="flex items-center">
              <svg className="w-3 h-3 text-green-600 ml-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              ההורים יקבלו מייל עם טופס הסכמה
            </li>
            <li className="flex items-center">
              <svg className="w-3 h-3 text-green-600 ml-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              לאחר מילוי הטופס תוכל להמשיך לאתר
            </li>
            <li className="flex items-center">
              <svg className="w-3 h-3 text-green-600 ml-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              תקבל מייל אישור כשההסכמה תתקבל
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="flex-1 bg-orange-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-orange-700 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors"
            >
              בדוק שוב
            </button>
          )}

          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-3 text-gray-600 hover:text-gray-800 font-medium"
            >
              יציאה
            </button>
          )}
        </div>

        {/* Contact Info */}
        <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h4 className="text-sm font-medium text-gray-800 mb-2">זקוק לעזרה?</h4>
          <p className="text-xs text-gray-600 leading-relaxed">
            אם יש בעיה עם קבלת המייל או מילוי הטופס, פנה למורה שלך.
            המורה יכול לעזור בתהליך או לפנות לתמיכה טכנית.
          </p>
        </div>

        {/* Debug info for development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-xs text-red-600">
              <strong>Development Mode:</strong> This screen enforces parent consent.
              In production, parent consent collection would be handled separately.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WaitingForConsentScreen;
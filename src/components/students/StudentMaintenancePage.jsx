import React from 'react';
import { AlertTriangle, Clock, Wrench } from 'lucide-react';

/**
 * Student-friendly maintenance page
 * Shows when the system is in maintenance mode or experiencing issues
 */
const StudentMaintenancePage = ({ isTemporaryIssue = false }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-100 via-blue-50 to-indigo-100">
      <div className="max-w-md mx-auto text-center px-6">
        {/* Icon */}
        <div className="mb-8">
          <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            {isTemporaryIssue ? (
              <AlertTriangle className="w-12 h-12 text-white" />
            ) : (
              <Wrench className="w-12 h-12 text-white" />
            )}
          </div>
        </div>

        {/* Message */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            {isTemporaryIssue ? 'בעיה זמנית במערכת' : 'המערכת בתחזוקה'}
          </h1>

          <p className="text-lg text-gray-600 mb-6">
            {isTemporaryIssue
              ? 'יש לנו בעיה זמנית במערכת. אנחנו עובדים על פתרון מהיר.'
              : 'אנחנו עושים תחזוקה למערכת כדי להביא לכם חוויה טובה יותר!'
            }
          </p>

          {/* Fun element for kids */}
          <div className="flex items-center justify-center space-x-2 text-purple-600 mb-6">
            <Clock className="w-5 h-5 animate-spin" />
            <span className="font-medium">
              {isTemporaryIssue ? 'עובדים על פתרון...' : 'עובדים קשה...'}
            </span>
          </div>

          <div className="text-sm text-gray-500">
            {isTemporaryIssue
              ? 'נסו שוב בעוד כמה דקות'
              : 'נחזור בקרוב עם שיפורים מעולים!'
            }
          </div>
        </div>

        {/* Fun decoration */}
        <div className="mt-8 flex justify-center space-x-4">
          <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0s'}} />
          <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}} />
          <div className="w-3 h-3 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}} />
        </div>
      </div>
    </div>
  );
};

export default StudentMaintenancePage;
import React, { useState } from 'react';
import { X, Users, GraduationCap, Send, AlertCircle } from 'lucide-react';
import PropTypes from 'prop-types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiRequest } from '@/services/apiClient';
import { ludlog, luderror } from '@/lib/ludlog';
import { useUser } from '@/contexts/UserContext';
import StudentLoginModal from '@/components/auth/StudentLoginModal';
import RequestSuccessMessage from './RequestSuccessMessage';

// Validation schema for membership request message
const requestSchema = z.object({
  message: z
    .string()
    .max(500, 'הודעה יכולה להכיל עד 500 תווים')
    .optional()
});

/**
 * JoinClassroomModal Component
 * Main membership request interface for students to join classrooms
 * Handles authentication, form submission, and success confirmation
 */
const JoinClassroomModal = ({ classroom, teacher, onClose, onSuccess }) => {
  const { currentUser, isPlayerAuthenticated } = useUser();
  const [requestState, setRequestState] = useState({
    isSubmitting: false,
    hasSubmitted: false,
    error: null,
    membership: null,
    requiresParentConsent: false
  });
  const [showLoginModal, setShowLoginModal] = useState(false);

  // React Hook Form with Zod validation
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      message: ''
    }
  });

  const messageValue = watch('message');

  // Check if user is authenticated (either Firebase or Player)
  const isAuthenticated = currentUser?.firebaseUser || isPlayerAuthenticated;

  // Handle form submission
  const onSubmit = async (data) => {
    // Check authentication before submitting
    if (!isAuthenticated) {
      ludlog.ui('Join request requires authentication, showing login modal');
      setShowLoginModal(true);
      return;
    }

    try {
      setRequestState(prev => ({
        ...prev,
        isSubmitting: true,
        error: null
      }));

      ludlog.ui('Submitting classroom membership request:', {
        classroomId: classroom.id,
        teacherId: teacher?.id,
        hasMessage: !!data.message
      });

      // Call membership request API
      const response = await apiRequest(`/student-portal/classrooms/${classroom.id}/request-membership`, {
        method: 'POST',
        body: JSON.stringify({
          request_message: data.message || null
        })
      });

      ludlog.ui('Membership request successful:', {
        membershipId: response.membership?.id,
        status: response.membership?.status,
        parentConsentRequired: response.parent_consent_required
      });

      setRequestState({
        isSubmitting: false,
        hasSubmitted: true,
        error: null,
        membership: response.membership,
        requiresParentConsent: response.parent_consent_required || false
      });

      // Call success callback if provided
      onSuccess?.(response.membership);
    } catch (error) {
      luderror.ui('Classroom membership request error:', error);

      // Handle specific error cases
      let errorMessage = 'לא הצלחנו לשלוח את הבקשה. נסה שוב!';

      if (error.statusCode === 404) {
        errorMessage = 'הכיתה לא נמצאה. אולי היא נמחקה?';
      } else if (error.statusCode === 409) {
        errorMessage = 'כבר יש לך בקשה או חברות בכיתה זו!';
      } else if (error.statusCode === 400 && error.message?.includes('capacity')) {
        errorMessage = 'הכיתה מלאה ואין מקום פנוי';
      } else if (error.statusCode === 403) {
        errorMessage = 'אין לך הרשאה להצטרף לכיתה זו';
      } else if (error.statusCode === 429) {
        errorMessage = 'יותר מדי בקשות. נסה שוב בעוד כמה דקות';
      } else if (error.message) {
        errorMessage = error.message;
      }

      setRequestState(prev => ({
        ...prev,
        isSubmitting: false,
        error: errorMessage
      }));
    }
  };

  // Handle login success - retry submission
  const handleLoginSuccess = () => {
    setShowLoginModal(false);
    ludlog.ui('Login successful, will retry membership request');
    // Form data is still in the form, user can resubmit
  };

  // Handle escape key to close modal
  React.useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && !showLoginModal) {
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose, showLoginModal]);

  // Show success message after submission
  if (requestState.hasSubmitted && requestState.membership) {
    return (
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose?.();
        }}
      >
        <div className="mobile-safe-container bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mobile-no-scroll-x">
          <RequestSuccessMessage
            classroom={classroom}
            teacher={teacher}
            membership={requestState.membership}
            requiresParentConsent={requestState.requiresParentConsent}
            onClose={onClose}
          />
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Main Modal */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose?.();
        }}
      >
        {/* Modal Container */}
        <div className="mobile-safe-container bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mobile-no-scroll-x">
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-purple-500 to-blue-500 text-white p-4 mobile-padding rounded-t-2xl z-10">
            <div className="mobile-safe-flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-bold mobile-truncate">הצטרף לכיתה</h2>
                <p className="text-sm opacity-90 mobile-safe-text">שלח בקשה למורה</p>
              </div>
              <Button
                onClick={onClose}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 p-2 rounded-lg flex-shrink-0"
                aria-label="סגור"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 mobile-padding">
            {/* Classroom Info Summary */}
            <Card className="mb-6 border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
              <CardHeader className="mobile-padding pb-3">
                <CardTitle className="mobile-safe-flex items-center gap-2 text-lg">
                  <Users className="w-5 h-5 text-purple-600 flex-shrink-0" />
                  <span className="mobile-truncate">{classroom.name}</span>
                </CardTitle>
                {teacher && (
                  <CardDescription className="mobile-safe-flex items-center gap-2 mt-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-blue-400 rounded-full flex items-center justify-center flex-shrink-0">
                      <GraduationCap className="w-4 h-4 text-white" />
                    </div>
                    <span className="mobile-truncate font-medium">
                      מורה: {teacher.full_name}
                    </span>
                  </CardDescription>
                )}
              </CardHeader>
              {classroom.description && (
                <CardContent className="mobile-padding pt-0">
                  <p className="text-sm text-gray-600 mobile-safe-text mobile-line-clamp-2">
                    {classroom.description}
                  </p>
                </CardContent>
              )}
            </Card>

            {/* Request Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Optional Message Field */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  הודעה למורה (אופציונלי)
                </label>
                <Textarea
                  {...register('message')}
                  placeholder="למה אתה רוצה להצטרף לכיתה? ספר למורה קצת על עצמך..."
                  className={`mobile-safe-text min-h-[120px] border-2 rounded-lg resize-none ${
                    errors.message
                      ? 'border-red-300 focus:border-red-500'
                      : 'border-gray-300 focus:border-purple-500'
                  }`}
                  maxLength={500}
                />

                {/* Character Count */}
                <div className="mobile-safe-flex items-center justify-between mt-2">
                  <div>
                    {errors.message && (
                      <p className="text-red-600 text-xs mobile-safe-text flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 flex-shrink-0" />
                        {errors.message.message}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {messageValue?.length || 0}/500
                  </span>
                </div>
              </div>

              {/* Error Display */}
              {requestState.error && (
                <div className="mobile-safe-card bg-red-50 border-2 border-red-200 rounded-xl p-4">
                  <div className="mobile-safe-flex items-center gap-3">
                    <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-red-900 mobile-safe-text">שגיאה</h3>
                      <p className="text-sm text-red-700 mobile-safe-text">{requestState.error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Authentication Warning */}
              {!isAuthenticated && (
                <div className="mobile-safe-card bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                  <div className="mobile-safe-flex items-center gap-3">
                    <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-blue-900 mobile-safe-text">נדרשת התחברות</h3>
                      <p className="text-sm text-blue-700 mobile-safe-text">
                        כדי להצטרף לכיתה, צריך להתחבר תחילה
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="mobile-safe-flex gap-3 pt-4">
                <Button
                  type="button"
                  onClick={onClose}
                  variant="outline"
                  className="flex-1 mobile-safe-text border-2 border-gray-300 hover:bg-gray-50 font-bold py-3 rounded-xl"
                >
                  ביטול
                </Button>
                <Button
                  type="submit"
                  disabled={requestState.isSubmitting}
                  className="flex-1 mobile-safe-text bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {requestState.isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent ml-2"></div>
                      שולח...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 ml-2" />
                      {isAuthenticated ? 'שלח בקשה' : 'התחבר ושלח'}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Login Modal */}
      {showLoginModal && (
        <StudentLoginModal
          onClose={() => setShowLoginModal(false)}
          onLoginSuccess={handleLoginSuccess}
          message="התחבר כדי להצטרף לכיתה"
        />
      )}
    </>
  );
};

JoinClassroomModal.propTypes = {
  classroom: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    max_students: PropTypes.number,
    current_student_count: PropTypes.number
  }).isRequired,
  teacher: PropTypes.shape({
    id: PropTypes.string,
    full_name: PropTypes.string,
    email: PropTypes.string
  }),
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func // Optional callback on successful submission
};

export default JoinClassroomModal;

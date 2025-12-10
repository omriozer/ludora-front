import { CheckCircle2, GraduationCap, Users, AlertCircle, PartyPopper } from 'lucide-react';
import PropTypes from 'prop-types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import MembershipStatusBadge from './MembershipStatusBadge';

/**
 * RequestSuccessMessage Component
 * Success confirmation UI shown after membership request is sent
 * Displays next steps and parent consent notification if applicable
 */
const RequestSuccessMessage = ({
  classroom,
  teacher,
  membership,
  requiresParentConsent,
  onClose
}) => {
  return (
    <>
      {/* Header with Success Icon */}
      <div className="bg-gradient-to-r from-emerald-500 to-green-500 text-white p-6 mobile-padding rounded-t-2xl">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full mb-4">
            <PartyPopper className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-3xl font-bold mb-2">הבקשה נשלחה!</h2>
          <p className="text-lg opacity-90">
            הבקשה שלך להצטרף לכיתה בדרך למורה
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 mobile-padding space-y-6">
        {/* Classroom Info Card */}
        <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50">
          <CardHeader className="mobile-padding pb-3">
            <CardTitle className="mobile-safe-flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span className="mobile-truncate">{classroom.name}</span>
            </CardTitle>
            {teacher && (
              <CardDescription className="mobile-safe-flex items-center gap-2 mt-2">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-green-400 rounded-full flex items-center justify-center flex-shrink-0">
                  <GraduationCap className="w-4 h-4 text-white" />
                </div>
                <span className="mobile-truncate font-medium">
                  מורה: {teacher.full_name}
                </span>
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="mobile-padding pt-0">
            <MembershipStatusBadge
              status={membership.status}
              variant="large"
              showIcon={true}
            />
          </CardContent>
        </Card>

        {/* Parent Consent Notice */}
        {requiresParentConsent && (
          <div className="mobile-safe-card bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
            <div className="mobile-safe-flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-blue-900 mb-1 mobile-safe-text">
                  נדרש אישור הורה
                </h3>
                <p className="text-sm text-blue-700 mobile-safe-text">
                  כדי להשלים את ההצטרפות, המורה יצטרך לקבל אישור מההורים שלך.
                  זה חלק מההגנה על הפרטיות שלך.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Next Steps Card */}
        <Card className="border-2 border-purple-200">
          <CardHeader className="mobile-padding">
            <CardTitle className="text-lg mobile-safe-text">
              מה קורה עכשיו?
            </CardTitle>
          </CardHeader>
          <CardContent className="mobile-padding space-y-3">
            {/* Step 1 */}
            <div className="mobile-safe-flex gap-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  1
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 mobile-safe-text">
                  המורה יקבל התראה
                </h4>
                <p className="text-sm text-gray-600 mobile-safe-text">
                  {teacher?.full_name || 'המורה'} יראה את הבקשה שלך ויוכל לאשר אותה
                </p>
              </div>
            </div>

            {/* Step 2 - Parent Consent if needed */}
            {requiresParentConsent && (
              <div className="mobile-safe-flex gap-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    2
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 mobile-safe-text">
                    אישור הורה
                  </h4>
                  <p className="text-sm text-gray-600 mobile-safe-text">
                    המורה יצטרך לקבל אישור מההורים שלך לפני האישור הסופי
                  </p>
                </div>
              </div>
            )}

            {/* Step 3 - Notification */}
            <div className="mobile-safe-flex gap-3">
              <div className="flex-shrink-0">
                <div className={`w-8 h-8 ${requiresParentConsent ? 'bg-emerald-500' : 'bg-blue-500'} text-white rounded-full flex items-center justify-center font-bold text-sm`}>
                  {requiresParentConsent ? '3' : '2'}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 mobile-safe-text">
                  תקבל התראה
                </h4>
                <p className="text-sm text-gray-600 mobile-safe-text">
                  כשהמורה יאשר את הבקשה, תקבל הודעה ותוכל להתחיל ללמוד!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Message if provided */}
        {membership.request_message && (
          <Card className="border-2 border-gray-200">
            <CardHeader className="mobile-padding">
              <CardTitle className="text-sm text-gray-700 mobile-safe-text">
                ההודעה שלך למורה:
              </CardTitle>
            </CardHeader>
            <CardContent className="mobile-padding pt-0">
              <p className="text-sm text-gray-600 mobile-safe-text bg-gray-50 rounded-lg p-3 border border-gray-200">
                &quot;{membership.request_message}&quot;
              </p>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="mobile-safe-flex gap-3 pt-4">
          <Button
            onClick={onClose}
            className="flex-1 mobile-safe-text bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <CheckCircle2 className="w-4 h-4 ml-2" />
            סגור
          </Button>
        </div>

        {/* Additional Info */}
        <div className="text-center">
          <p className="text-xs text-gray-500 mobile-safe-text">
            בקשת ההצטרפות נשלחה ב-{new Date(membership.requested_at).toLocaleDateString('he-IL')}
          </p>
        </div>
      </div>
    </>
  );
};

RequestSuccessMessage.propTypes = {
  classroom: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string
  }).isRequired,
  teacher: PropTypes.shape({
    id: PropTypes.string,
    full_name: PropTypes.string,
    email: PropTypes.string
  }),
  membership: PropTypes.shape({
    id: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
    request_message: PropTypes.string,
    requested_at: PropTypes.string.isRequired
  }).isRequired,
  requiresParentConsent: PropTypes.bool,
  onClose: PropTypes.func.isRequired
};

export default RequestSuccessMessage;

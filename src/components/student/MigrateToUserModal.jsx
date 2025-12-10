import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/services/apiClient';
import { ludlog, luderror } from '@/lib/ludlog';
import { useUser } from '@/contexts/UserContext';
import { showSuccess, showError } from '@/utils/messaging';
import MigrationWizard from './MigrationWizard';
import MigrationSuccessMessage from './MigrationSuccessMessage';
import PlayerDataPreview from './PlayerDataPreview';

/**
 * MigrateToUserModal Component
 *
 * Main interface for anonymous players to migrate to full user accounts.
 * Features:
 * - 3-step wizard (Explain → Enter Email → Confirm)
 * - Shows player achievements/classrooms that will be preserved
 * - Email verification handling
 * - Success celebration with migration summary
 *
 * Integration with Student Portal authentication patterns.
 */
const MigrateToUserModal = ({ isOpen, onClose, player }) => {
  const { refreshUser } = useUser();
  const [currentStep, setCurrentStep] = useState(1);
  const [migrationData, setMigrationData] = useState({
    email: '',
    confirmationToken: ''
  });
  const [migrationState, setMigrationState] = useState({
    isLoading: false,
    isComplete: false,
    error: null,
    result: null,
    needsEmailVerification: false
  });

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setMigrationData({ email: '', confirmationToken: '' });
      setMigrationState({
        isLoading: false,
        isComplete: false,
        error: null,
        result: null,
        needsEmailVerification: false
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Close handler with confirmation if in progress
  const handleClose = () => {
    if (currentStep > 1 && !migrationState.isComplete) {
      const confirmClose = window.confirm(
        'תהליך המעבר לחשבון מלא עדיין לא הושלם. האם אתה בטוח שברצונך לצאת?'
      );
      if (!confirmClose) return;
    }
    onClose();
  };

  // Step navigation
  const handleNextStep = () => {
    setCurrentStep(prev => Math.min(prev + 1, 3));
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // Email input handler
  const handleEmailChange = (email) => {
    setMigrationData(prev => ({ ...prev, email }));
    setMigrationState(prev => ({ ...prev, error: null }));
  };

  // Confirmation token handler
  const handleConfirmationTokenChange = (token) => {
    setMigrationData(prev => ({ ...prev, confirmationToken: token }));
  };

  // Main migration handler
  const handleMigrate = async () => {
    if (!player?.id) {
      showError('שגיאה', 'לא נמצא מזהה שחקן תקף');
      return;
    }

    try {
      setMigrationState(prev => ({
        ...prev,
        isLoading: true,
        error: null
      }));

      ludlog.auth('Starting player migration:', {
        playerId: player.id,
        email: migrationData.email
      });

      // Call migration API
      const response = await apiRequest('/student-portal/migrate-player', {
        method: 'POST',
        body: JSON.stringify({
          player_id: player.id,
          user_email: migrationData.email,
          confirmation_token: migrationData.confirmationToken || undefined
        })
      });

      ludlog.auth('Player migration successful:', {
        userId: response.user?.id,
        classroomsTransferred: response.migrated_data?.classrooms_transferred,
        sessionsTransferred: response.migrated_data?.sessions_transferred
      });

      // Mark migration as complete
      setMigrationState({
        isLoading: false,
        isComplete: true,
        error: null,
        result: response,
        needsEmailVerification: false
      });

      // Show success message
      showSuccess(
        'החשבון שלך שודרג בהצלחה! 🎉',
        `${response.migrated_data?.classrooms_transferred || 0} כיתות ו-${response.migrated_data?.sessions_transferred || 0} סשנים הועברו`
      );

      // Refresh user context to load new user data
      setTimeout(async () => {
        await refreshUser();
      }, 2000);

    } catch (error) {
      luderror.auth('Player migration error:', error);

      // Handle specific error cases
      let errorMessage = 'לא הצלחנו להשלים את המעבר לחשבון מלא. נסה שוב!';

      if (error.statusCode === 403) {
        errorMessage = 'השחקן כבר הועבר לחשבון משתמש';
      } else if (error.statusCode === 404) {
        errorMessage = 'השחקן לא נמצא במערכת';
      } else if (error.statusCode === 400) {
        if (error.message?.includes('email')) {
          errorMessage = 'כתובת האימייל כבר קיימת במערכת או אינה תקינה';
        } else if (error.message?.includes('verification')) {
          errorMessage = 'נדרש אימות אימייל. בדוק את תיבת הדואר שלך';
          setMigrationState(prev => ({
            ...prev,
            isLoading: false,
            needsEmailVerification: true,
            error: errorMessage
          }));
          return;
        }
      } else if (error.statusCode === 429) {
        errorMessage = 'יותר מדי ניסיונות. נסה שוב בעוד כמה דקות';
      } else if (error.message) {
        errorMessage = error.message;
      }

      setMigrationState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));

      showError('שגיאה במעבר לחשבון', errorMessage);
    }
  };

  // Show success screen if migration is complete
  if (migrationState.isComplete && migrationState.result) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4">
        <div className="mobile-safe-container bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mobile-no-scroll-x">
          <MigrationSuccessMessage
            migrationResult={migrationState.result}
            onClose={handleClose}
          />
        </div>
      </div>
    );
  }

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            {/* Welcome and explanation */}
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">🎓</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                שדרגו לחשבון מלא!
              </h3>
              <p className="text-gray-600 leading-relaxed">
                המעבר לחשבון מלא יאפשר לכם להמשיך לשמור על כל ההתקדמות שלכם
                גם אם תחליפו מכשיר או תשכחו את קוד הפרטיות.
              </p>
            </div>

            {/* Benefits list */}
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl p-6">
              <h4 className="font-bold text-purple-900 mb-4">מה תקבלו בחשבון מלא?</h4>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-sm">✓</span>
                  </div>
                  <span className="text-gray-700">
                    <strong>כל הנתונים שלכם נשמרים:</strong> כיתות, משחקים, והישגים
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-sm">✓</span>
                  </div>
                  <span className="text-gray-700">
                    <strong>כניסה מכל מכשיר:</strong> אין צורך לזכור קוד פרטיות
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-sm">✓</span>
                  </div>
                  <span className="text-gray-700">
                    <strong>אבטחה משופרת:</strong> החשבון שלכם מוגן באימייל וסיסמה
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-sm">✓</span>
                  </div>
                  <span className="text-gray-700">
                    <strong>תכונות נוספות:</strong> גישה למאגר המשחקים המלא
                  </span>
                </li>
              </ul>
            </div>

            {/* Player data preview */}
            <PlayerDataPreview player={player} />
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            {/* Email input section */}
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-3xl">📧</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                הזינו כתובת אימייל
              </h3>
              <p className="text-gray-600 text-sm">
                כתובת האימייל תשמש אתכם לכניסה לחשבון בעתיד
              </p>
            </div>

            {/* Email input field */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                כתובת אימייל
              </label>
              <input
                type="email"
                value={migrationData.email}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder="your.email@example.com"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all text-center"
                dir="ltr"
              />
            </div>

            {/* Email verification notice (if needed) */}
            {migrationState.needsEmailVerification && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-bold text-blue-900 mb-1">נדרש אימות אימייל</h4>
                    <p className="text-sm text-blue-700 mb-3">
                      נשלח אליכם קוד אימות לאימייל. הזינו את הקוד למטה כדי להמשיך.
                    </p>
                    <input
                      type="text"
                      value={migrationData.confirmationToken}
                      onChange={(e) => handleConfirmationTokenChange(e.target.value)}
                      placeholder="הזן קוד אימות"
                      className="w-full px-4 py-2 border-2 border-blue-300 rounded-lg focus:border-blue-500 text-center"
                      maxLength={6}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Error display */}
            {migrationState.error && !migrationState.needsEmailVerification && (
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-bold text-red-900">שגיאה</h4>
                    <p className="text-sm text-red-700">{migrationState.error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Important notice */}
            <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-amber-800 text-sm">
                  <strong>שימו לב:</strong> לאחר המעבר לא תוכלו להשתמש בקוד הפרטיות יותר.
                  תצטרכו להתחבר עם כתובת האימייל והסיסמה שלכם.
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            {/* Confirmation section */}
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-3xl">✅</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                אישור מעבר לחשבון מלא
              </h3>
              <p className="text-gray-600 text-sm">
                בדקו שכל הפרטים נכונים לפני ההמשך
              </p>
            </div>

            {/* Summary of migration */}
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl p-6 space-y-4">
              <div>
                <div className="text-sm text-purple-700 font-medium mb-1">כתובת אימייל</div>
                <div className="text-lg font-bold text-gray-900" dir="ltr">{migrationData.email}</div>
              </div>

              <div className="border-t-2 border-purple-200 pt-4">
                <div className="text-sm text-purple-700 font-medium mb-2">מה יועבר:</div>
                <PlayerDataPreview player={player} compact />
              </div>
            </div>

            {/* Final warning */}
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-yellow-700 flex-shrink-0 mt-0.5" />
                <div className="text-yellow-900 text-sm">
                  <strong>פעולה חד-פעמית:</strong> לאחר המעבר לא ניתן לחזור לחשבון אנונימי.
                  ודאו שהאימייל נכון!
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Check if can proceed to next step
  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 1:
        return true; // Always can proceed from explanation
      case 2:
        // Need valid email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(migrationData.email);
      case 3:
        return true; // Ready to migrate
      default:
        return false;
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      {/* Modal Container */}
      <div className="mobile-safe-container bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mobile-no-scroll-x">

        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-500 to-blue-500 text-white p-6 mobile-padding rounded-t-3xl z-10">
          <div className="mobile-safe-flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold mobile-truncate">שדרוג לחשבון מלא</h2>
              <p className="text-sm opacity-90 mobile-safe-text">
                שמרו על ההתקדמות שלכם לתמיד
              </p>
            </div>
            <Button
              onClick={handleClose}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 p-2 rounded-lg flex-shrink-0"
              aria-label="סגור"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Wizard Steps */}
        <div className="p-6 mobile-padding">
          <MigrationWizard
            currentStep={currentStep}
            totalSteps={3}
            stepTitles={['הסבר', 'אימייל', 'אישור']}
          />
        </div>

        {/* Step Content */}
        <div className="px-6 pb-6 mobile-padding">
          {renderStepContent()}
        </div>

        {/* Navigation Buttons */}
        <div className="sticky bottom-0 bg-white border-t-2 border-gray-200 p-6 mobile-padding rounded-b-3xl">
          <div className="mobile-safe-flex gap-3">
            {/* Back Button */}
            {currentStep > 1 && (
              <Button
                onClick={handlePrevStep}
                variant="outline"
                className="flex-1 mobile-safe-text border-2 border-gray-300 hover:bg-gray-50 font-bold py-3 rounded-xl"
                disabled={migrationState.isLoading}
              >
                חזור
              </Button>
            )}

            {/* Next/Complete Button */}
            {currentStep < 3 ? (
              <Button
                onClick={handleNextStep}
                disabled={!canProceedToNextStep()}
                className="flex-1 mobile-safe-text bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                המשך
              </Button>
            ) : (
              <Button
                onClick={handleMigrate}
                disabled={migrationState.isLoading || !canProceedToNextStep()}
                className="flex-1 mobile-safe-text bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {migrationState.isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent ml-2"></div>
                    מעביר נתונים...
                  </>
                ) : (
                  '✨ שדרג חשבון!'
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

MigrateToUserModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  player: PropTypes.shape({
    id: PropTypes.string.isRequired,
    display_name: PropTypes.string,
    privacy_code: PropTypes.string
  }).isRequired
};

export default MigrateToUserModal;

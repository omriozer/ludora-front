import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { CheckCircle, Trophy, Users, Gamepad2, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

/**
 * MigrationSuccessMessage Component
 *
 * Celebration screen shown after successful player migration.
 * Features:
 * - Success animation with confetti effect
 * - Migration summary (classrooms, sessions, achievements)
 * - Welcome message for new account
 * - Next steps guidance
 * - Auto-redirect countdown
 * - Kid-friendly design with emojis and colors
 */
const MigrationSuccessMessage = ({ migrationResult, onClose }) => {
  const [countdown, setCountdown] = useState(10);
  const [showConfetti, setShowConfetti] = useState(true);

  const { user, migrated_data } = migrationResult;

  // Countdown timer for auto-redirect
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      // Auto-close after countdown
      onClose?.();
    }
  }, [countdown, onClose]);

  // Hide confetti after 5 seconds
  useEffect(() => {
    const confettiTimer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(confettiTimer);
  }, []);

  return (
    <div className="relative">
      {/* Confetti Animation */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Confetti particles */}
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-10%',
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899'][Math.floor(Math.random() * 5)]
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Main Content */}
      <div className="p-8 mobile-padding">
        {/* Success Icon with Animation */}
        <div className="text-center mb-6">
          <div className="relative inline-block">
            <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
              <CheckCircle className="w-16 h-16 text-white" strokeWidth={2.5} />
            </div>
            <div className="absolute -top-2 -right-2">
              <Sparkles className="w-8 h-8 text-yellow-400 animate-pulse" />
            </div>
            <div className="absolute -bottom-2 -left-2">
              <Sparkles className="w-6 h-6 text-purple-400 animate-pulse" style={{ animationDelay: '0.5s' }} />
            </div>
          </div>

          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            מזל טוב! 🎉
          </h2>
          <p className="text-lg text-gray-600">
            החשבון שלך שודרג בהצלחה!
          </p>
        </div>

        {/* Welcome Message */}
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 rounded-2xl p-6 mb-6">
          <div className="text-center">
            <h3 className="text-xl font-bold text-purple-900 mb-2">
              ברוך הבא, {user?.full_name || user?.email}!
            </h3>
            <p className="text-purple-700">
              עכשיו יש לך חשבון מלא עם כל ההתקדמות שלך
            </p>
          </div>
        </div>

        {/* Migration Summary */}
        <div className="space-y-3 mb-6">
          <h4 className="font-bold text-gray-900 text-center mb-4">
            מה שמרנו בשבילך:
          </h4>

          {/* Classrooms Transferred */}
          <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50">
            <CardContent className="p-4">
              <div className="mobile-safe-flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-blue-900 mobile-safe-text">
                    {migrated_data?.classrooms_transferred || 0} כיתות
                  </div>
                  <div className="text-sm text-blue-700 mobile-safe-text">
                    כל הכיתות והמורים שלך עברו
                  </div>
                </div>
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>

          {/* Sessions Transferred */}
          <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
            <CardContent className="p-4">
              <div className="mobile-safe-flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Gamepad2 className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-purple-900 mobile-safe-text">
                    {migrated_data?.sessions_transferred || 0} סשנים
                  </div>
                  <div className="text-sm text-purple-700 mobile-safe-text">
                    כל ההתקדמות במשחקים נשמרה
                  </div>
                </div>
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>

          {/* Achievements Preserved */}
          {migrated_data?.achievements_preserved && (
            <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-yellow-50">
              <CardContent className="p-4">
                <div className="mobile-safe-flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Trophy className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-orange-900 mobile-safe-text">
                      ההישגים שלך
                    </div>
                    <div className="text-sm text-orange-700 mobile-safe-text">
                      כל ההישגים והנקודות נשמרו
                    </div>
                  </div>
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Next Steps */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6 mb-6">
          <h4 className="font-bold text-green-900 mb-3 text-center">
            מה הלאה?
          </h4>
          <ul className="space-y-2 text-sm text-green-800">
            <li className="flex items-start gap-2">
              <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs">1</span>
              </div>
              <span>תועבר אוטומטית לעמוד הבית תוך {countdown} שניות</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs">2</span>
              </div>
              <span>בכניסות הבאות, השתמש באימייל וסיסמה במקום קוד פרטיות</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs">3</span>
              </div>
              <span>המשך ליהנות מכל המשחקים והכיתות שלך!</span>
            </li>
          </ul>
        </div>

        {/* Important Notice */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6">
          <div className="text-center text-sm text-blue-800">
            <strong>זכור:</strong> קוד הפרטיות הישן שלך ({migrationResult.old_privacy_code})
            כבר לא בשימוש. תכנס עם האימייל שלך מהיום.
          </div>
        </div>

        {/* Action Button */}
        <Button
          onClick={onClose}
          className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 text-lg"
        >
          <span>בואו נמשיך!</span>
          <ArrowRight className="w-5 h-5 mr-2" />
        </Button>

        {/* Countdown Display */}
        <div className="text-center mt-4 text-sm text-gray-500">
          מעבר אוטומטי בעוד {countdown} שניות...
        </div>
      </div>

      {/* CSS for confetti animation */}
      <style jsx>{`
        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti linear forwards;
        }
      `}</style>
    </div>
  );
};

MigrationSuccessMessage.propTypes = {
  migrationResult: PropTypes.shape({
    success: PropTypes.bool,
    message: PropTypes.string,
    migrated_data: PropTypes.shape({
      classrooms_transferred: PropTypes.number,
      sessions_transferred: PropTypes.number,
      achievements_preserved: PropTypes.bool
    }),
    user: PropTypes.shape({
      id: PropTypes.string,
      email: PropTypes.string,
      full_name: PropTypes.string,
      role: PropTypes.string
    }),
    old_privacy_code: PropTypes.string
  }).isRequired,
  onClose: PropTypes.func.isRequired
};

export default MigrationSuccessMessage;

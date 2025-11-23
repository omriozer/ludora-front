import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  UserIcon,
  X,
  Copy,
  Mail,
  MessageCircle,
  CheckCircle,
  Sparkles
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/messaging';

/**
 * PlayerWelcomeModal Component
 *
 * Shows a welcome message when a new anonymous player is created,
 * displays their privacy code and offers sharing options.
 */
const PlayerWelcomeModal = ({
  player,
  isOpen,
  onClose
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !player) return null;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(player.privacy_code);
      setCopied(true);
      showSuccess('קוד הפרטיות הועתק בהצלחה!');

      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      showError('לא הצלחנו להעתיק את הקוד. נסו להעתיק ידנית.');
    }
  };

  const handleEmailShare = () => {
    const subject = 'קוד הפרטיות שלי בלודורה';
    const body = `שלום!\n\nקיבלתי קוד פרטיות בלודורה: ${player.privacy_code}\n\nאני אשמור אותו לכניסות עתידיות למשחקים.\n\nתודה!`;

    const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink, '_blank');
  };

  const handleWhatsAppShare = () => {
    const message = `שלום! קיבלתי קוד פרטיות בלודורה: ${player.privacy_code}\nאני אשמור אותו לכניסות עתידיות למשחקים. תודה!`;
    const whatsappLink = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappLink, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <Card className="w-full max-w-md mx-auto bg-white/95 backdrop-blur-sm shadow-2xl border-0 rounded-3xl">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
          <CardTitle className="text-xl font-bold text-gray-900 text-center flex-1">
            ברוך הבא לודורה!
          </CardTitle>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 hover:bg-gray-100 flex-shrink-0"
            aria-label="סגור"
          >
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-6 p-6 pt-0">
          {/* Welcome Message */}
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 relative">
              <UserIcon className="w-8 h-8 text-white" />
              <div className="absolute -top-1 -right-1">
                <Sparkles className="w-5 h-5 text-yellow-400" />
              </div>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              שלום {player.display_name}! 🎉
            </h3>

            <p className="text-gray-600 text-center leading-relaxed mb-4">
              חשבון התלמיד שלך נוצר בהצלחה!
              <br />
              קיבלת קוד פרטיות אישי למשחקים.
            </p>
          </div>

          {/* Privacy Code Display */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-4">
            <div className="text-center">
              <div className="text-sm text-blue-800 font-medium mb-2">
                קוד הפרטיות שלך
              </div>

              <div className="bg-white border-2 border-blue-300 rounded-lg p-3 mb-3">
                <div className="text-2xl font-mono font-bold text-blue-900 tracking-widest">
                  {player.privacy_code}
                </div>
              </div>

              <div className="text-xs text-blue-700">
                שמרו קוד זה בבטחה - תזדקקו אליו לכניסות עתידיות!
              </div>
            </div>
          </div>

          {/* Important Notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-amber-800 text-sm">
                <strong>חשוב לזכור:</strong>
                <ul className="mt-1 space-y-1 list-disc list-inside text-xs">
                  <li>הקוד הוא האופן היחיד להתחבר לחשבון שלכם</li>
                  <li>אל תשתפו את הקוד עם אחרים</li>
                  <li>שמרו אותו במקום בטוח</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Sharing Options */}
          <div>
            <div className="text-sm font-medium text-gray-700 mb-3 text-center">
              רוצים לשמור את הקוד?
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button
                onClick={handleCopyCode}
                variant="outline"
                className="flex flex-col items-center gap-1 h-auto py-3 px-2 text-xs"
              >
                {copied ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                {copied ? 'הועתק!' : 'העתקה'}
              </Button>

              <Button
                onClick={handleEmailShare}
                variant="outline"
                className="flex flex-col items-center gap-1 h-auto py-3 px-2 text-xs"
              >
                <Mail className="w-4 h-4" />
                אימייל
              </Button>

              <Button
                onClick={handleWhatsAppShare}
                variant="outline"
                className="flex flex-col items-center gap-1 h-auto py-3 px-2 text-xs"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </Button>
            </div>
          </div>

          {/* Continue Button */}
          <div className="pt-4">
            <Button
              onClick={onClose}
              className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              בואו נתחיל לשחק! 🚀
            </Button>
          </div>

          {/* Help Text */}
          <p className="text-xs text-gray-500 text-center">
            תוכלו תמיד לגשת למשחקים באמצעות קוד הפרטיות
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlayerWelcomeModal;
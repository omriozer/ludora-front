import React, { useState, useEffect } from 'react';
import { Share2, QrCode, Copy, RefreshCw, X, UserPlus, Users } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { apiRequest } from '@/services/apiClient';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { renderQRCode, LUDORA_OFFICIAL_PRESET } from '@/utils/qrCodeUtils';

/**
 * GameSharingWidget - Dashboard widget for teachers to manage their invitation code
 * Provides quick access to generate codes, view QR codes, and share game catalogs
 */
const GameSharingWidget = ({ widgetId, settings = {} }) => {
  const { currentUser } = useUser();
  const [invitationCode, setInvitationCode] = useState(currentUser?.invitation_code || null);
  const [loading, setLoading] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrContainer, setQrContainer] = useState(null);

  // Only show widget for teachers
  if (currentUser?.user_type !== 'teacher') {
    return null;
  }

  // Generate portal URL
  const portalUrl = invitationCode
    ? `https://my.ludora.app/portal/${invitationCode}`
    : '';

  // Generate invitation code
  const generateCode = async () => {
    try {
      setLoading(true);
      const response = await apiRequest(`/entities/user/${currentUser.id}/generate-invitation-code`, {
        method: 'POST'
      });

      setInvitationCode(response.user.invitation_code);
      toast({
        title: "קוד הזמנה נוצר בהצלחה!",
        description: `קוד המורה שלך: ${response.user.invitation_code}`,
        variant: "default"
      });
    } catch (error) {
      console.error('Error generating invitation code:', error);
      toast({
        title: "שגיאה",
        description: "לא הצלחנו ליצור קוד הזמנה",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Copy URL to clipboard
  const copyToClipboard = async () => {
    if (!portalUrl) return;

    try {
      await navigator.clipboard.writeText(portalUrl);
      toast({
        title: "הועתק ללוח!",
        description: "כתובת הקטלוג הועתקה ללוח",
        variant: "default"
      });
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast({
        title: "שגיאה",
        description: "לא הצלחנו להעתיק את הכתובת",
        variant: "destructive"
      });
    }
  };

  // Generate QR code when modal opens
  useEffect(() => {
    if (showQRModal && qrContainer && portalUrl) {
      try {
        renderQRCode(portalUrl, qrContainer, LUDORA_OFFICIAL_PRESET, {
          width: 400,
          height: 400,
          margin: 0
        });
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
    }
  }, [showQRModal, qrContainer, portalUrl]);

  return (
    <>
      {/* Widget Content */}
      <div className="h-full flex flex-col p-6 bg-gradient-to-br from-teal-50 to-blue-100 rounded-xl">
        {/* Widget Header */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-1">שיתוף המשחקים</h3>
          <p className="text-sm text-gray-600">שתף את קטלוג המשחקים שלך עם תלמידים</p>
        </div>

        {invitationCode ? (
          // Show existing code management
          <>
            {/* Code Display */}
            <div className="flex-1 flex flex-col justify-center mb-4">
              <div className="text-center mb-4">
                <div className="text-sm text-gray-600 mb-2">קוד המורה שלך:</div>
                <div className="text-xl font-bold text-gray-800 font-mono bg-white/70 backdrop-blur-sm px-4 py-3 rounded-xl shadow-lg border border-teal-200">
                  {invitationCode}
                </div>
              </div>

              {/* URL Display */}
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">כתובת הקטלוג:</div>
                <div className="text-sm text-blue-600 font-medium bg-white/50 px-3 py-2 rounded-lg border border-blue-200">
                  my.ludora.app/portal/{invitationCode}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <Button
                onClick={() => setShowQRModal(true)}
                className="bg-teal-500 hover:bg-teal-600 text-white text-sm py-2 rounded-lg shadow-lg"
              >
                <QrCode className="w-4 h-4 mr-1" />
                QR
              </Button>
              <Button
                onClick={copyToClipboard}
                variant="outline"
                className="border-2 border-blue-200 hover:bg-blue-50 text-blue-700 text-sm py-2 rounded-lg"
              >
                <Copy className="w-4 h-4 mr-1" />
                העתק
              </Button>
            </div>

            {/* Regenerate Button */}
            <Button
              onClick={generateCode}
              disabled={loading}
              variant="outline"
              className="w-full border-2 border-orange-200 hover:bg-orange-50 text-orange-700 text-sm py-2 rounded-lg"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-orange-600 border-t-transparent mr-1" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-1" />
              )}
              קוד חדש
            </Button>
          </>
        ) : (
          // Show initial generation
          <>
            {/* Main Button */}
            <div className="flex-1 flex items-center justify-center mb-6">
              <button
                onClick={generateCode}
                disabled={loading}
                className="w-full h-full min-h-[120px] bg-gradient-to-br from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white text-lg font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col items-center justify-center gap-3 group relative overflow-hidden"
                aria-label="צור קוד הזמנה"
              >
                {/* Background Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent" />
                    <span className="text-center px-4 leading-tight relative z-10">
                      יוצר קוד...
                    </span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-12 h-12 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 relative z-10" />
                    <span className="text-center px-4 leading-tight relative z-10 group-hover:text-teal-100 transition-colors duration-300">
                      צור קוד שיתוף
                    </span>
                  </>
                )}
              </button>
            </div>

            {/* Info Box */}
            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-lg">
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-5 h-5 text-teal-600" />
                <span className="text-sm font-medium text-gray-700">יתרונות השיתוף:</span>
              </div>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• תלמידים יגשו למשחקים ללא הרשמה</li>
                <li>• קטלוג מותאם עם המשחקים שלך</li>
                <li>• ממשק ידידותי לילדים</li>
              </ul>
            </div>
          </>
        )}
      </div>

      {/* Full-Screen QR Code Modal */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden relative">
            {/* Close Button */}
            <Button
              onClick={() => setShowQRModal(false)}
              variant="ghost"
              size="sm"
              className="absolute top-4 right-4 z-10 bg-white bg-opacity-90 hover:bg-opacity-100"
            >
              <X className="w-5 h-5" />
            </Button>

            {/* Header */}
            <div className="bg-gradient-to-r from-teal-500 to-yellow-500 p-6 text-center">
              <h2 className="text-2xl font-bold text-white mb-2">
                קטלוג המשחקים של {currentUser?.display_name || currentUser?.full_name}
              </h2>
              <p className="text-white opacity-90">סרוק להצטרפות לקטלוג</p>
            </div>

            {/* QR Code Container */}
            <div className="p-8 flex flex-col items-center">
              <div
                ref={setQrContainer}
                className="mb-6 bg-white"
                style={{ width: 400, height: 400 }}
              />

              {/* Invitation Code */}
              <div className="text-center mb-6">
                <div className="text-sm text-gray-600 mb-1">קוד מורה:</div>
                <div className="text-2xl font-bold text-gray-800 font-mono bg-gray-100 px-4 py-2 rounded-lg">
                  {invitationCode}
                </div>
              </div>

              {/* Instructions */}
              <div className="text-center max-w-md mb-6">
                <p className="text-gray-600 text-sm leading-relaxed">
                  תלמידים יכולים לסרוק את ה-QR או להזין את הקוד באתר:
                </p>
                <p className="text-blue-600 font-medium mt-2">
                  my.ludora.app/portal
                </p>
              </div>

              {/* Copy Button */}
              <Button
                onClick={copyToClipboard}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
              >
                <Copy className="w-4 h-4 mr-2" />
                העתק כתובת
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GameSharingWidget;
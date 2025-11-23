import React, { useState, useEffect, useRef } from 'react';
import { GamepadIcon, PuzzleIcon, BookOpenIcon, StarIcon, Keyboard, QrCode, CameraOff, ChevronDown, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ConfirmationDialog from '@/components/ui/confirmation-dialog';
import { useUser } from '@/contexts/UserContext';
import { checkCameraAvailability } from '@/utils/qrScannerUtils';
import { useActivityCodeHandler } from '@/hooks/useActivityCodeHandler';
import LogoDisplay from '@/components/ui/LogoDisplay';

/**
 * Beautiful home page for the student portal
 * Features engaging design with placeholder content areas
 */
const StudentHome = () => {
  const { settings } = useUser();
  const [isCameraAvailable, setIsCameraAvailable] = useState(false);
  const [showScrollArrow, setShowScrollArrow] = useState(true);
  const [confirmationDialog, setConfirmationDialog] = useState({ isOpen: false });
  const actionSectionRef = useRef(null);

  // Use the activity code handler hook
  const {
    codeInput,
    isLoading,
    handleCodeInputChange,
    handleCodeInputKeyDown,
    handleCodeEntry,
    handleQRScan,
    isInputValid
  } = useActivityCodeHandler({
    showConfirmationDialog: setConfirmationDialog
  });

  // Check camera availability on component mount (without opening camera)
  useEffect(() => {
    const checkCamera = async () => {
      const isAvailable = await checkCameraAvailability();
      setIsCameraAvailable(isAvailable);
    };

    checkCamera();
  }, []);

  // Intersection Observer to detect if action section is visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Show arrow when action section is NOT visible
        setShowScrollArrow(!entry.isIntersecting);
      },
      {
        threshold: 0.1, // Trigger when 10% of the section is visible
        rootMargin: '-100px 0px 0px 0px' // Add some margin from top
      }
    );

    if (actionSectionRef.current) {
      observer.observe(actionSectionRef.current);
    }

    return () => {
      if (actionSectionRef.current) {
        observer.unobserve(actionSectionRef.current);
      }
    };
  }, []);

  const scrollToActions = () => {
    if (actionSectionRef.current) {
      actionSectionRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  };

  const handleEnterCode = () => {
    handleCodeEntry();
  };
  return (
    <>
      {/* Custom animation styles */}
      <style>{`
        @keyframes gentle-bounce {
          0%, 20%, 50%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-8px);
          }
          60% {
            transform: translateY(-4px);
          }
        }
      `}</style>

    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-16 px-4 sm:px-6 lg:px-8 text-center overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-200/30 via-blue-200/20 to-indigo-200/30" />
        <div className="absolute top-10 left-10 w-20 h-20 bg-yellow-300/40 rounded-full blur-xl" />
        <div className="absolute bottom-10 right-10 w-32 h-32 bg-pink-300/40 rounded-full blur-xl" />

        <div className="relative max-w-4xl mx-auto">
          <div className="inline-flex items-center justify-center">
            <LogoDisplay
              className="h-40 w-40 md:h-48 md:w-48 object-contain transform hover:scale-105 transition-transform duration-300 drop-shadow-lg"
              alt={settings?.site_name || "לודורה"}
            />
          </div>

          <p className="text-3xl md:text-4xl text-gray-800 mb-8 max-w-2xl mx-auto leading-relaxed font-bold">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">
              ללמוד זה משחק ילדים
            </span>
          </p>

          {/* Feature highlight cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto mb-12">
            <div className="group bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-red-400 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <GamepadIcon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">משחקים חינוכיים</h3>
              <p className="text-gray-600 text-sm">משחקים מעוררי השראה שעוזרים לכם ללמוד</p>
            </div>

            <div className="group bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-400 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <PuzzleIcon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">פעילויות אינטראקטיביות</h3>
              <p className="text-gray-600 text-sm">חוויות למידה מרתקות ומעשירות</p>
            </div>

            <div className="group bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-400 rounded-xl flex items-center justify-center mb-4 mx-auto">
                <BookOpenIcon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">תכנים לימודיים</h3>
              <p className="text-gray-600 text-sm">חומרים איכותיים מותאמים לכם</p>
            </div>
          </div>
        </div>
      </section>

      {/* Fun illustration section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="relative">
            {/* Decorative elements */}
            <div className="absolute top-0 left-1/4 w-4 h-4 bg-yellow-400 rounded-full animate-bounce" style={{animationDelay: '0s'}} />
            <div className="absolute top-8 right-1/4 w-6 h-6 bg-pink-400 rounded-full animate-bounce" style={{animationDelay: '0.5s'}} />
            <div className="absolute bottom-0 left-1/3 w-5 h-5 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '1s'}} />

            <div className="bg-gradient-to-r from-purple-100 via-blue-100 to-indigo-100 rounded-3xl p-12 mx-4">
              <h3 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
                🎯 מוכנים להתחיל?
              </h3>

              {/* Action Section */}
              <div ref={actionSectionRef} className="mb-6 space-y-6">

                {/* Code Entry Section */}
                <div className="text-center">
                  {/* Explaining text 1 */}
                  <p className="text-lg text-gray-600 mb-4">מכניסים קוד כדי להתחבר למורה או למשחק</p>

                  {/* Action 1 */}
                  <div className="flex flex-col items-center gap-3">
                    <input
                      type="text"
                      value={codeInput}
                      onChange={handleCodeInputChange}
                      onKeyDown={handleCodeInputKeyDown}
                      placeholder="ABC12345"
                      maxLength={8}
                      className="w-32 h-12 text-center text-xl font-bold uppercase border-3 border-purple-300 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-200 transition-all duration-300 bg-gradient-to-br from-white to-purple-50 shadow-lg"
                      title="הכניסו קוד פעילות (6 תווים ללובי משחק או 8 תווים לפורטל מורה)"
                    />
                    <Button
                      onClick={handleEnterCode}
                      disabled={!isInputValid() || isLoading}
                      className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-bold py-3 px-8 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      <Keyboard className="w-5 h-5" />
                      <span className="text-lg">הזן קוד פעילות</span>
                    </Button>
                  </div>
                </div>

                {/* OR separator */}
                <div className="text-center">
                  <div className="text-2xl text-gray-400 font-bold">או</div>
                </div>

                {/* QR Scanner Section */}
                <div className="text-center">
                  {/* Explaining text 2 */}
                  <p className="text-lg text-gray-600 mb-4">שמצלמים את תמונת QR שקיבלתם</p>

                  {/* Action 2 */}
                  <div className="flex flex-col items-center">
                    {isCameraAvailable ? (
                      <Button
                        onClick={handleQRScan}
                        variant="outline"
                        className="border-3 border-blue-500 text-blue-600 hover:bg-blue-50 font-bold py-4 px-8 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center gap-3"
                      >
                        <QrCode className="w-6 h-6" />
                        <span className="text-lg">סרוק QR</span>
                      </Button>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-gray-500 text-center">
                        <CameraOff className="w-8 h-8" />
                        <div className="text-center">
                          <p className="text-sm font-medium">מצלמה לא זמינה</p>
                          <p className="text-xs">זמין במכשירי נייד</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              <div className="inline-block bg-white/70 backdrop-blur-sm rounded-2xl px-6 py-3 shadow-lg">
                <span className="text-purple-700 font-medium">✨ ההרפתקה מתחילה כאן ✨</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Floating Scroll Arrow - only show when action section is not visible */}
      {showScrollArrow && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
          <button
            onClick={scrollToActions}
            className="group bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white p-4 rounded-full shadow-2xl hover:animate-none transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-purple-300"
            style={{
              animation: 'gentle-bounce 2s ease-in-out infinite'
            }}
            aria-label="גלול למטה כדי לראות אפשרויות התחברות"
            title="גלול למטה כדי לראות אפשרויות התחברות"
          >
            <ChevronDown className="w-6 h-6" />

            {/* Pulsing ring effect */}
            <div className="absolute inset-0 bg-purple-400 rounded-full opacity-75 animate-ping"></div>

            {/* Subtle text hint */}
            <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-3 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
              התחברות למורה
            </div>
          </button>
        </div>
      )}
    </div>

    {/* Confirmation Dialog for error messages */}
    <ConfirmationDialog
      isOpen={confirmationDialog.isOpen}
      onClose={() => setConfirmationDialog({ isOpen: false })}
      onConfirm={confirmationDialog.onConfirm || (() => setConfirmationDialog({ isOpen: false }))}
      title={confirmationDialog.title}
      message={confirmationDialog.message}
      variant={confirmationDialog.variant || 'warning'}
      confirmText={confirmationDialog.confirmText || 'בסדר'}
      cancelText={confirmationDialog.cancelText}
      operationStatus={confirmationDialog.operationStatus}
      loadingMessage={confirmationDialog.loadingMessage}
      successMessage={confirmationDialog.successMessage}
      errorMessage={confirmationDialog.errorMessage}
    />
    </>
  );
};

export default StudentHome;
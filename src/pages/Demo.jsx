
import React, { useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { ShieldAlert, Eye, EyeOff, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { useUser } from "@/contexts/UserContext";
import { isStaff } from "@/lib/userUtils";
import { validateAdminPassword, isAnonymousAdmin } from "@/utils/adminCheck";
import { ludlog, luderror } from '@/lib/ludlog';
import LudoraLoadingSpinner from '../components/ui/LudoraLoadingSpinner';

export default function Demo() {
  const { currentUser, isLoading: userLoading } = useUser();

  // Admin password bypass state
  const [adminPassword, setAdminPassword] = useState('');
  const [isValidatingPassword, setIsValidatingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);

  // Demo functionality state
  const [activeDemo, setActiveDemo] = useState(null);
  const [demoTimeout, setDemoTimeout] = useState(null);

  // Check admin access on component load
  React.useEffect(() => {
    if (!userLoading) {
      // Check if user is already admin or has anonymous admin access
      const isUserAdmin = currentUser && isStaff(currentUser) && !currentUser._isImpersonated;
      const hasAnonymousAccess = isAnonymousAdmin();
      setHasAdminAccess(isUserAdmin || hasAnonymousAccess);
    }
  }, [currentUser, userLoading]);

  const startDemo = useCallback((demoConfig) => {
    // Clear any existing timeout
    if (demoTimeout) {
      clearTimeout(demoTimeout);
    }

    // Start the new demo
    setActiveDemo(demoConfig);

    // Set timeout to stop demo after 10 seconds
    const timeout = setTimeout(() => {
      setActiveDemo(null);
      setDemoTimeout(null);
    }, 10000);

    setDemoTimeout(timeout);
  }, [demoTimeout]);

  const stopDemo = useCallback(() => {
    if (demoTimeout) {
      clearTimeout(demoTimeout);
      setDemoTimeout(null);
    }
    setActiveDemo(null);
  }, [demoTimeout]);

  // Admin password validation handler
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setIsValidatingPassword(true);
    setPasswordError('');

    try {
      if (!adminPassword.trim()) {
        throw new Error('נדרשת סיסמה');
      }

      // Validate password with server
      const result = await validateAdminPassword(adminPassword);

      if (result.success) {
        // Password validated and token stored successfully
        setHasAdminAccess(true);
        setAdminPassword('');
        setShowPasswordSection(false);
        ludlog.auth('Anonymous admin access granted for demo page');
      } else {
        throw new Error(result.error || 'סיסמה שגויה');
      }
    } catch (error) {
      luderror.ui('Admin password validation error on demo page:', error);

      let errorMessage = 'שגיאה בבדיקת הסיסמה. נסו שוב.';

      if (error.message) {
        if (error.message.includes('נדרשת סיסמה')) {
          errorMessage = 'נדרשת סיסמה';
        } else if (error.message.includes('סיסמה שגויה')) {
          errorMessage = 'סיסמה שגויה. נסו שוב.';
        } else if (error.message.includes('Too many attempts')) {
          errorMessage = 'יותר מדי נסיונות. נסו שוב מאוחר יותר.';
        }
      }

      setPasswordError(errorMessage);
    } finally {
      setIsValidatingPassword(false);
    }
  };

  // Simplified demo configurations focusing on the working features
  const demos = [
    {
      title: 'Loading Animation',
      status: 'loading',
      size: 'md',
      showParticles: true,
      message: 'טוען את התוכן...'
    },
    {
      title: 'Success State',
      status: 'success',
      size: 'md',
      showParticles: true,
      message: 'הושלם בהצלחה!'
    },
    {
      title: 'Error State',
      status: 'error',
      size: 'md',
      showParticles: true,
      message: 'אירעה שגיאה'
    },
    {
      title: 'Small Size',
      status: 'loading',
      size: 'sm',
      showParticles: true,
      message: 'גודל קטן...'
    },
    {
      title: 'Large Size',
      status: 'loading',
      size: 'lg',
      showParticles: true,
      message: 'גודל גדול...'
    },
    {
      title: 'Extra Large',
      status: 'loading',
      size: 'xl',
      showParticles: true,
      message: 'גודל ענק...'
    },
    {
      title: 'Without Particles',
      status: 'loading',
      size: 'md',
      showParticles: false,
      message: 'בלי חלקיקים...'
    },
    {
      title: 'Different Status',
      status: 'loading',
      size: 'lg',
      showParticles: true,
      message: 'סטטוס שונה...'
    }
  ];

  const DemoButton = ({ demo, children }) => (
    <button
      onClick={() => startDemo(demo)}
      className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-105 transition-all"
    >
      {children}
    </button>
  );

  // Show loading spinner while checking user authentication
  if (userLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <LudoraLoadingSpinner status="loading" size="md" message="טוען..." />
      </div>
    );
  }

  // Show access denied if not admin and no admin access
  if (!hasAdminAccess) {
    return (
      <div className="min-h-screen relative overflow-hidden flex flex-col" dir="rtl">
        {/* Background similar to maintenance page */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50"></div>
        <div className="absolute inset-0 bg-gradient-to-tr from-purple-100/30 via-transparent to-blue-100/30"></div>

        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-4 left-4 sm:top-10 sm:left-10 w-48 h-48 sm:w-72 sm:h-72 max-w-[40vw] max-h-[40vh] bg-purple-200/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-4 right-4 sm:bottom-10 sm:right-10 w-56 h-56 sm:w-96 sm:h-96 max-w-[45vw] max-h-[45vh] bg-blue-200/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-40 sm:w-64 sm:h-64 max-w-[35vw] max-h-[35vh] bg-pink-200/20 rounded-full blur-3xl animate-pulse delay-500"></div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 relative z-10 min-h-[80vh]">
          <div className="text-center max-w-4xl mx-auto">
            {/* Icon with click functionality for password section */}
            <div className="mb-6 sm:mb-8 relative">
              <div className="relative mx-auto w-20 h-20 md:w-24 md:h-24 group">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-blue-500 rounded-3xl blur-xl opacity-75"></div>
                <div
                  className="relative w-full h-full bg-gradient-to-br from-purple-500 to-blue-600 rounded-3xl flex items-center justify-center cursor-pointer"
                  onClick={() => setShowPasswordSection(!showPasswordSection)}
                >
                  <ShieldAlert className="w-12 h-12 text-white drop-shadow-lg" />
                </div>
                <div className="absolute -top-2 -right-2 w-3 h-3 bg-purple-300 rounded-full"></div>
                <div className="absolute -bottom-2 -left-2 w-2 h-2 bg-blue-300 rounded-full"></div>
              </div>
            </div>

            {/* Access Denied Message */}
            <div className="mb-8">
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-4 leading-tight">
                גישה מוגבלת
              </h1>
              <p className="text-gray-600 text-lg leading-relaxed mb-6">
                דף הדגמות זמין רק למנהלי מערכת.
              </p>
            </div>

            {/* Admin Password Section */}
            {showPasswordSection && (
              <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-2xl border border-white/30 relative overflow-hidden mb-8 max-w-md mx-auto">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-50/50 via-transparent to-red-50/50"></div>

                <div className="relative z-10">
                  <h3 className="text-xl font-bold text-gray-900 text-center mb-4">
                    גישת מנהל זמנית
                  </h3>
                  <p className="text-sm text-gray-600 text-center mb-6">
                    הזינו סיסמת מנהל לגישה לדף ההדגמות
                  </p>

                  {passwordError && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertDescription className="text-right">
                        {passwordError}
                      </AlertDescription>
                    </Alert>
                  )}

                  <form onSubmit={handlePasswordSubmit}>
                    <div className="relative mb-4">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="סיסמת מנהל"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        className="w-full h-12 pr-4 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        disabled={isValidatingPassword}
                      />
                      <button
                        type="button"
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>

                    <Button
                      type="submit"
                      disabled={isValidatingPassword || !adminPassword.trim()}
                      className="w-full h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium rounded-lg shadow-lg transition-all duration-200 mb-4"
                    >
                      {isValidatingPassword ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin ml-2" />
                          בודק סיסמה...
                        </>
                      ) : (
                        'כניסה'
                      )}
                    </Button>
                  </form>

                  <Button
                    onClick={() => setShowPasswordSection(false)}
                    variant="ghost"
                    className="w-full mt-4 text-gray-500 hover:text-gray-700"
                  >
                    ביטול
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Render demo page if admin access is granted
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8" dir="rtl">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6 tracking-tight">
            לוגו לודורה מונפש
          </h1>
          <p className="text-gray-700 text-xl mb-8 leading-relaxed">
            לחצו על כל כפתור כדי לראות את הלוגו המונפש של לודורה במשך 10 שניות
          </p>
          <div className="text-lg text-gray-600 bg-white rounded-lg p-4 inline-block shadow-sm">
            🎨 לוגו LUDORA מונפש עם אותיות צבעוניות וחלקיקים נוצצים
          </div>
          {activeDemo && (
            <button
              onClick={stopDemo}
              className="mt-6 px-8 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200 font-semibold shadow-md"
            >
              עצור הדגמה
            </button>
          )}
        </div>

        {/* Demo Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {demos.map((demo, index) => (
            <div key={index} className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-200 text-center">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                {demo.title}
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                {demo.message}
              </p>
              <DemoButton demo={demo}>
                הרץ הדגמה
              </DemoButton>
            </div>
          ))}
        </div>

        {/* Info Section */}
        <div className="bg-white rounded-xl p-8 shadow-lg">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">
            מאפיינים
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="text-center">
              <div className="text-4xl mb-2">🎭</div>
              <h3 className="font-semibold text-gray-800 mb-2">מצבי סטטוס</h3>
              <p className="text-gray-600 text-sm">טעינה, הצלחה, שגיאה</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-2">📏</div>
              <h3 className="font-semibold text-gray-800 mb-2">גדלים שונים</h3>
              <p className="text-gray-600 text-sm">קטן, בינוני, גדול, ענק</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-2">🎨</div>
              <h3 className="font-semibold text-gray-800 mb-2">עיצוב אחיד</h3>
              <p className="text-gray-600 text-sm">תמיד נושא חינוכי</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-2">✨</div>
              <h3 className="font-semibold text-gray-800 mb-2">אפקטים</h3>
              <p className="text-gray-600 text-sm">חלקיקים ואנימציות</p>
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Spinner Overlay */}
      {activeDemo && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-12 max-w-lg mx-4 shadow-2xl">
            <LudoraLoadingSpinner
              status={activeDemo.status}
              size={activeDemo.size}
              showParticles={activeDemo.showParticles}
              message={activeDemo.message}
              onAnimationComplete={() => {
                if (activeDemo.status !== 'loading') {
                  setTimeout(stopDemo, 1000);
                }
              }}
            />
            <div className="text-center mt-8 border-t pt-6">
              <div className="text-sm text-gray-500 mb-3">
                ההדגמה תסתיים אוטומטית בעוד 10 שניות
              </div>
              <button
                onClick={stopDemo}
                className="px-6 py-2 bg-gray-500 text-white rounded-lg text-sm hover:bg-gray-600 transition-colors font-medium"
              >
                עצור כעת
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

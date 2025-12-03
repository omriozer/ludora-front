
import { useState, useCallback } from 'react';
import LudoraLoadingSpinner from '../components/ui/LudoraLoadingSpinner';

export default function Demo() {
  const [activeDemo, setActiveDemo] = useState(null);
  const [demoTimeout, setDemoTimeout] = useState(null);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
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

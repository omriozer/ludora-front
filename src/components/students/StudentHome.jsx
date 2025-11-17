import React from 'react';
import { GamepadIcon, PuzzleIcon, BookOpenIcon, StarIcon } from 'lucide-react';

/**
 * Beautiful home page for the student portal
 * Features engaging design with placeholder content areas
 */
const StudentHome = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-16 px-4 sm:px-6 lg:px-8 text-center overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-200/30 via-blue-200/20 to-indigo-200/30" />
        <div className="absolute top-10 left-10 w-20 h-20 bg-yellow-300/40 rounded-full blur-xl" />
        <div className="absolute bottom-10 right-10 w-32 h-32 bg-pink-300/40 rounded-full blur-xl" />

        <div className="relative max-w-4xl mx-auto">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-purple-500 to-blue-500 rounded-3xl mb-6 shadow-lg transform hover:scale-105 transition-transform">
              <span className="text-4xl text-white font-bold">ל</span>
            </div>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold text-gray-800 mb-6 leading-tight">
            ברוכים הבאים ל
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">
              לודורה
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
            הפלטפורמה החינוכית המתקדמת שלכם
            <br />
            <span className="text-purple-600 font-semibold">למידה, משחקים והנאה!</span>
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

      {/* Coming Soon Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-100 to-blue-100 rounded-full px-6 py-2 mb-6">
            <StarIcon className="w-5 h-5 text-purple-500" />
            <span className="text-purple-700 font-medium">בקרוב</span>
          </div>

          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-6">
            התכוננו לחוויה מדהימה!
          </h2>

          <p className="text-lg text-gray-600 mb-12 max-w-2xl mx-auto">
            אנחנו עובדים קשה כדי להביא לכם את הפלטפורמה החינוכית המתקדמת ביותר.
            בקרוב תוכלו ליהנות ממגוון רחב של פעילויות ומשחקים חינוכיים.
          </p>

          {/* Placeholder feature grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Games placeholder */}
            <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl p-8 border border-pink-100">
              <div className="w-16 h-16 bg-gradient-to-br from-pink-400 to-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <GamepadIcon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">משחקי זיכרון</h3>
              <p className="text-gray-600">משחקים מותאמים שעוזרים לחזק את הזיכרון והריכוז</p>
            </div>

            {/* Activities placeholder */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-100">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <PuzzleIcon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">פעילויות כיתתיות</h3>
              <p className="text-gray-600">התחברות לפעילויות שהמורה שלכם יוצר במיוחד עבורכם</p>
            </div>

            {/* Progress placeholder */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 border border-green-100 md:col-span-2 lg:col-span-1">
              <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <BookOpenIcon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">מעקב התקדמות</h3>
              <p className="text-gray-600">ראו איך אתם מתקדמים ורוכשים כישורים חדשים</p>
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
              <p className="text-lg text-gray-600 mb-6">
                בקרוב תוכלו לקבל קישור מהמורה שלכם ולהתחיל ללמוד ולשחק!
              </p>
              <div className="inline-block bg-white/70 backdrop-blur-sm rounded-2xl px-6 py-3 shadow-lg">
                <span className="text-purple-700 font-medium">✨ ההרפתקה מתחילה כאן ✨</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default StudentHome;
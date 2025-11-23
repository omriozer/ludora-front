import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home, SearchX, ArrowRight } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import LogoDisplay from '@/components/ui/LogoDisplay';

/**
 * Fun 404 page for students with playful design and kid-friendly messaging
 */
const StudentNotFound = () => {
  const { settings } = useUser();

  return (
    <>
      {/* Custom animation styles */}
      <style>{`
        @keyframes bounce-fun {
          0%, 20%, 50%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-20px);
          }
          60% {
            transform: translateY(-10px);
          }
        }
        @keyframes wiggle {
          0%, 7% {
            transform: rotateZ(0);
          }
          15% {
            transform: rotateZ(-15deg);
          }
          20% {
            transform: rotateZ(10deg);
          }
          25% {
            transform: rotateZ(-10deg);
          }
          30% {
            transform: rotateZ(6deg);
          }
          35% {
            transform: rotateZ(-4deg);
          }
          40%, 100% {
            transform: rotateZ(0);
          }
        }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-purple-200/40 via-blue-200/30 to-pink-200/40 flex items-center justify-center p-4">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-20 w-24 h-24 bg-yellow-300/30 rounded-full blur-2xl animate-pulse" />
          <div className="absolute top-40 right-32 w-32 h-32 bg-pink-300/40 rounded-full blur-2xl animate-pulse" style={{animationDelay: '1s'}} />
          <div className="absolute bottom-32 left-40 w-28 h-28 bg-blue-300/30 rounded-full blur-2xl animate-pulse" style={{animationDelay: '2s'}} />
          <div className="absolute bottom-20 right-20 w-20 h-20 bg-purple-300/40 rounded-full blur-2xl animate-pulse" style={{animationDelay: '0.5s'}} />
        </div>

        <div className="relative max-w-2xl w-full text-center">

          {/* Logo */}
          <div className="mb-6">
            <LogoDisplay
              className="h-24 w-24 md:h-32 md:w-32 object-contain mx-auto drop-shadow-lg"
              style={{animation: 'wiggle 3s ease-in-out infinite'}}
            />
          </div>

          {/* 404 Section */}
          <div className="mb-8">
            <div className="text-6xl md:text-8xl font-bold text-transparent bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 bg-clip-text mb-4"
                 style={{animation: 'bounce-fun 3s ease-in-out infinite'}}>
              404
            </div>
            <div className="relative">
              <SearchX className="w-16 h-16 mx-auto text-purple-400 mb-4 animate-pulse" />
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">
                  אופס! לא מצאנו את מה שחיפשת
                </span>
              </h1>
              <p className="text-lg md:text-xl text-gray-600 max-w-lg mx-auto leading-relaxed">
                נראה שהדף הזה הלך לטיול... 🎮
                <br />
                <span className="text-purple-600 font-medium">בואו נחזור הביתה ונמצא משהו כיף!</span>
              </p>
            </div>
          </div>

          {/* Fun encouraging message */}
          <div className="mb-8 bg-white/70 backdrop-blur-sm rounded-3xl p-6 shadow-xl">
            <div className="text-4xl mb-3">🎯🎨🧩</div>
            <p className="text-lg text-purple-700 font-medium">
              יש לנו עוד הרבה דברים כיפיים!
              <br />
              <span className="text-gray-600 text-base">משחקים, פעילויות ותכנים שיעשו לכם כיף</span>
            </p>
          </div>

          {/* Back to Home Button */}
          <div>
            <Link to="/">
              <Button
                size="lg"
                className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-bold px-8 py-4 text-lg rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 flex items-center gap-3 mx-auto"
              >
                <Home className="w-6 h-6" />
                <span>חזרה לעמוד הבית</span>
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>

          {/* Extra encouragement */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              💫 תמיד אפשר לחזור ולהתחיל מחדש 💫
            </p>
          </div>

        </div>
      </div>
    </>
  );
};

export default StudentNotFound;
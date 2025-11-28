import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Home, GraduationCap } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import ConnectedTeachersList from '@/components/students/ConnectedTeachersList';
import { Card, CardContent } from '@/components/ui/card';

/**
 * MyTeachersPage - Dedicated page showing all connected teachers
 * Student portal page with purple/blue theme showing connected teachers in full detail
 */
export default function MyTeachersPage() {
  const { currentPlayer, isPlayerAuthenticated, isAuthenticated } = useUser();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simple loading delay to prevent flash
    const timer = setTimeout(() => setIsLoading(false), 100);
    return () => clearTimeout(timer);
  }, []);

  const hasAnyAuth = isAuthenticated || isPlayerAuthenticated;

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 flex items-center justify-center">
        <div className="animate-pulse text-purple-600 text-xl font-bold">טוען...</div>
      </div>
    );
  }

  // Not authenticated state
  if (!hasAnyAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-4">
        <div className="max-w-4xl mx-auto pt-8">
          {/* Breadcrumb Navigation */}
          <nav className="mb-6 flex items-center gap-2 text-sm text-gray-600" dir="rtl">
            <Link to="/" className="hover:text-purple-600 transition-colors flex items-center gap-1">
              <Home className="w-4 h-4" />
              <span>דף הבית</span>
            </Link>
            <span>/</span>
            <span className="text-purple-600 font-semibold">המורים שלי</span>
          </nav>

          {/* Not Authenticated Message */}
          <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-l-4 border-orange-500">
            <CardContent className="p-8 text-center">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-gradient-to-br from-orange-500 to-red-500 p-4">
                  <GraduationCap className="w-12 h-12 text-white" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-3">נדרשת התחברות</h2>
              <p className="text-gray-600 mb-6">
                כדי לראות את רשימת המורים שלך, עליך להתחבר תחילה
              </p>
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold rounded-xl hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                <Home className="w-5 h-5" />
                חזרה לדף הבית
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // No teachers connected state
  const hasTeachers = currentPlayer?.teachers?.length > 0 || currentPlayer?.teacher_id;

  if (!hasTeachers) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-4">
        <div className="max-w-4xl mx-auto pt-8">
          {/* Breadcrumb Navigation */}
          <nav className="mb-6 flex items-center gap-2 text-sm text-gray-600" dir="rtl">
            <Link to="/" className="hover:text-purple-600 transition-colors flex items-center gap-1">
              <Home className="w-4 h-4" />
              <span>דף הבית</span>
            </Link>
            <span>/</span>
            <span className="text-purple-600 font-semibold">המורים שלי</span>
          </nav>

          {/* No Teachers Message */}
          <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-l-4 border-blue-500">
            <CardContent className="p-8 text-center">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-gradient-to-br from-purple-500 to-blue-500 p-4">
                  <GraduationCap className="w-12 h-12 text-white" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-3">עדיין אין מורים מחוברים</h2>
              <p className="text-gray-600 mb-6">
                כשתתחבר למורה דרך קוד הזמנה או משחק, הוא יופיע כאן
              </p>
              <div className="space-y-3">
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold rounded-xl hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  <Home className="w-5 h-5" />
                  חזרה לדף הבית
                </Link>
                <p className="text-sm text-gray-500 mt-4">
                  רמז: הזן קוד פעילות בתפריט הצדי כדי להצטרף למשחק של מורה
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Has teachers - show full list
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-4">
      <div className="max-w-4xl mx-auto pt-8">
        {/* Breadcrumb Navigation */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-gray-600" dir="rtl">
          <Link to="/" className="hover:text-purple-600 transition-colors flex items-center gap-1">
            <Home className="w-4 h-4" />
            <span>דף הבית</span>
          </Link>
          <span>/</span>
          <span className="text-purple-600 font-semibold">המורים שלי</span>
        </nav>

        {/* Page Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center mb-4">
            <div className="rounded-full bg-gradient-to-br from-purple-500 to-blue-500 p-4 shadow-xl">
              <GraduationCap className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-3">
            המורים שלי
          </h1>
          <p className="text-gray-600 text-lg">
            כאן תוכל למצוא את כל המורים שלך ולגשת לקטלוגים שלהם
          </p>
        </div>

        {/* Connected Teachers List */}
        <div className="mb-8">
          <ConnectedTeachersList
            currentPlayer={currentPlayer}
            variant="full"
            className="animate-fade-in"
          />
        </div>

        {/* Back Button */}
        <div className="text-center pb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white/80 backdrop-blur-sm border-2 border-purple-300 text-purple-600 font-bold rounded-xl hover:bg-purple-50 hover:shadow-lg transition-all duration-300 hover:scale-105"
          >
            <Home className="w-5 h-5" />
            חזרה לדף הבית
          </Link>
        </div>
      </div>
    </div>
  );
}

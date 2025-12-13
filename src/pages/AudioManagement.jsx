import React, { useState, useEffect } from "react";
import { User } from "@/services/entities";
import { useUser } from "@/contexts/UserContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, Volume2 } from "lucide-react";

// Import audio components
import AudioLibrary from "../components/audio/AudioLibrary";

export default function AudioManagement() {
  const { currentUser, isLoading: userLoading, isAdmin } = useUser();
  const [isLoading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (!userLoading && currentUser) {
      try {
        // Admin check is now handled by useUser context
      } catch (error) {
        console.error("Error loading user:", error);
        setMessage({ type: 'error', text: 'שגיאה בטעינת נתונים' });
      }
      setLoading(false);
    }
  }, [userLoading, currentUser]);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  if (userLoading || isLoading) {
    return (
      <div className="p-4 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">טוען נתונים...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin()) {
    return (
      <div className="p-4 bg-gray-50 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              אין לך הרשאות גישה לניהול צלילים. רק מנהלים יכולים לגשת לאזור זה.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <main className="flex-1 overflow-auto bg-gray-50">
        <div className="max-w-7xl mx-auto p-4 md:p-8">
          {message && (
            <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className="mb-6">
              {message.type === 'error' ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          {/* Audio Management Header */}
          <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-3xl shadow-lg border-0 overflow-hidden mb-6">
            <div className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Volume2 className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">ספריית צלילים</h1>
                  <p className="text-green-100 mt-1">העלאה וניהול קבצי אודיו</p>
                </div>
              </div>
            </div>
          </div>

          <AudioLibrary showMessage={showMessage} />
        </div>
      </main>
    </div>
  );
}
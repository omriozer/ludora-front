import React, { useState, useEffect } from "react";
import { User } from "@/services/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, Volume2, Settings as SettingsIcon, Play } from "lucide-react";

// Import audio components
import AudioLibrary from "../components/audio/AudioLibrary";
import AudioSettings from "../components/audio/AudioSettings";

export default function AudioManagement() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [message, setMessage] = useState(null);
  const [activeAudioTab, setActiveAudioTab] = useState('settings');

  useEffect(() => {
    const checkUser = async () => {
      setLoading(true);
      try {
        const user = await User.me();
        setCurrentUser(user);
        setIsAdmin(user.role === 'admin');
      } catch (error) {
        console.error("Error loading user:", error);
        setMessage({ type: 'error', text: 'שגיאה בטעינת נתונים' });
      }
      setLoading(false);
    };

    checkUser();
  }, []);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  if (isLoading) {
    return (
      <div className="p-4 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">טוען נתונים...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
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
                  <h1 className="text-3xl font-bold text-white">ניהול צלילים</h1>
                  <p className="text-green-100 mt-1">נהל ספריית צלילים והגדרות ברירת מחדל</p>
                </div>
              </div>
            </div>
          </div>

          <Tabs value={activeAudioTab} onValueChange={setActiveAudioTab} className="w-full" dir="rtl">
            <TabsList className="grid w-full grid-cols-2 bg-gray-100 p-1 rounded-xl mb-6 h-auto">
              <TabsTrigger
                value="settings"
                className="flex flex-col items-center gap-2 p-4 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center">
                  <SettingsIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-center">
                  <div className="font-bold text-gray-900 text-sm">הגדרות צלילים</div>
                  <div className="text-xs text-gray-500 mt-1">ברירות מחדל למשחקים</div>
                </div>
              </TabsTrigger>

              <TabsTrigger
                value="library"
                className="flex flex-col items-center gap-2 p-4 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center">
                  <Play className="w-5 h-5 text-purple-600" />
                </div>
                <div className="text-center">
                  <div className="font-bold text-gray-900 text-sm">ספריית צלילים</div>
                  <div className="text-xs text-gray-500 mt-1">העלאה וניהול קבצים</div>
                </div>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="settings">
              <AudioSettings showMessage={showMessage} />
            </TabsContent>

            <TabsContent value="library">
              <AudioLibrary showMessage={showMessage} />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
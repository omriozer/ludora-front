import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Settings, Save, Eye } from "lucide-react";
import { toast } from '@/components/ui/use-toast';
import LudoraLoadingSpinner from '@/components/ui/LudoraLoadingSpinner';
import { getApiBase } from '@/utils/api.js';

export default function GameSettings() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [gameData, setGameData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (gameId) {
      loadGameData();
    }
  }, [gameId]);

  const loadGameData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${getApiBase()}/entities/product/${gameId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load game data');
      }

      const data = await response.json();
      setGameData(data);
    } catch (err) {
      setError(err.message);
      toast({
        title: "שגיאה בטעינת נתוני המשחק",
        description: "לא ניתן לטעון את נתוני המשחק. נסה לרענן את הדף.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToProduct = () => {
    navigate('/products');
  };

  const handlePreviewGame = () => {
    toast({
      title: "תצוגה מקדימה",
      description: "תצוגה מקדימה של המשחק תיפתח בקרוב",
      variant: "default"
    });
  };

  const handleSaveSettings = () => {
    toast({
      title: "שמירת הגדרות",
      description: "שמירת הגדרות המשחק תתווסף בקרוב",
      variant: "default"
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LudoraLoadingSpinner />
      </div>
    );
  }

  if (error || !gameData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold text-red-600 mb-2">שגיאה בטעינת המשחק</h2>
            <p className="text-gray-600 mb-4">לא ניתן לטעון את נתוני המשחק</p>
            <Button onClick={handleBackToProduct} className="w-full">
              חזרה לרשימת המוצרים
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToProduct}
                className="flex items-center gap-2"
              >
                <ArrowRight className="w-4 h-4" />
                חזרה למוצרים
              </Button>
              <div className="h-6 w-px bg-gray-300" />
              <div className="flex items-center gap-3">
                <Play className="w-6 h-6 text-pink-600" />
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">
                    עורך הגדרות משחק
                  </h1>
                  <p className="text-sm text-gray-600">{gameData.title}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviewGame}
                className="flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                תצוגה מקדימה
              </Button>
              <Button
                size="sm"
                onClick={handleSaveSettings}
                className="flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                שמור הגדרות
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left Panel - Game Settings */}
          <div className="lg:col-span-2 space-y-6">

            {/* Game Information Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  פרטי המשחק
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      שם המשחק
                    </label>
                    <div className="p-3 bg-gray-50 rounded-md text-gray-600">
                      {gameData.title}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      סוג המשחק
                    </label>
                    <div className="p-3 bg-gray-50 rounded-md text-gray-600">
                      {gameData.type_attributes?.game_type || 'לא מוגדר'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      תאימות מכשירים
                    </label>
                    <div className="p-3 bg-gray-50 rounded-md text-gray-600">
                      {gameData.type_attributes?.device_compatibility === 'both' && 'הכל'}
                      {gameData.type_attributes?.device_compatibility === 'desktop_only' && 'מחשב בלבד'}
                      {gameData.type_attributes?.device_compatibility === 'mobile_only' && 'מכשירי טאץ בלבד'}
                      {!gameData.type_attributes?.device_compatibility && 'לא מוגדר'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      משך המשחק (דקות)
                    </label>
                    <div className="p-3 bg-gray-50 rounded-md text-gray-600">
                      {gameData.type_attributes?.estimated_duration || 'לא מוגדר'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Game Content Editor Placeholder */}
            <Card>
              <CardHeader>
                <CardTitle>עורך תוכן המשחק</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                  <Play className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">
                    עורך המשחק יתווסף בקרוב
                  </h3>
                  <p className="text-gray-500">
                    כאן יופיע עורך התוכן של המשחק עם כלים ליצירה ועריכה
                  </p>
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Right Panel - Preview & Settings */}
          <div className="space-y-6">

            {/* Game Preview */}
            <Card>
              <CardHeader>
                <CardTitle>תצוגה מקדימה</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg p-8 text-center text-white">
                  <Play className="w-12 h-12 mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">{gameData.title}</h3>
                  <p className="text-purple-100 text-sm mb-4">
                    תצוגה מקדימה של המשחק תופיע כאן
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handlePreviewGame}
                    className="bg-white text-purple-600 hover:bg-purple-50"
                  >
                    הפעל תצוגה מקדימה
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>פעולות מהירות</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => toast({ title: "בקרוב", description: "האפשרות תתווסף בקרוב" })}
                >
                  <Play className="w-4 h-4 ml-2" />
                  בדיקת המשחק
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => toast({ title: "בקרוב", description: "האפשרות תתווסף בקרוב" })}
                >
                  <Settings className="w-4 h-4 ml-2" />
                  הגדרות מתקדמות
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleBackToProduct}
                >
                  <ArrowRight className="w-4 h-4 ml-2" />
                  חזרה לעריכת המוצר
                </Button>
              </CardContent>
            </Card>

          </div>
        </div>
      </main>
    </div>
  );
}
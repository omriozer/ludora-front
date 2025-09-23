import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Play, Eye, Info, Settings, ExternalLink } from 'lucide-react';
import { getGameTypeName, getGameTypeIcon, getDeviceCompatibilityText } from '@/config/gameTypes';
import GameEngine from '@/components/gamesEngine/GameEngine';

export default function GamePreviewStep({ data, onDataChange, validationErrors, isEditMode }) {
  const [showGamePreview, setShowGamePreview] = useState(false);

  const formatPrice = (price) => {
    return price === 0 ? 'חינם' : `₪${price}`;
  };

  const formatSkills = (skills) => {
    return Array.isArray(skills) ? skills.join(', ') : '';
  };

  return (
    <div className="space-y-8">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-100 to-red-100 rounded-3xl mb-6 shadow-lg">
          <div className="text-4xl">👁️</div>
        </div>
        <h2 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-4">
          תצוגה מקדימה
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
          בדוק ובחן את המשחק לפני השמירה הסופית - וודא שהכל נראה מושלם!
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Game Details Summary */}
        <div className="space-y-8">
          <Card className="border-none shadow-xl bg-gradient-to-br from-white to-blue-50 rounded-3xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 h-1"></div>
            <CardHeader className="pb-6">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <Info className="w-6 h-6 text-white" />
                </div>
                <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  📋 סיכום המשחק
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Game Title and Type */}
              <div className="flex items-center gap-4 p-6 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl border-2 border-blue-200 shadow-lg">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-3xl text-white">{getGameTypeIcon(data.game_type)}</span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-800 to-cyan-800 bg-clip-text text-transparent">
                    {data.title}
                  </h3>
                  <p className="text-blue-700 font-medium mt-1">
                    🎮 {getGameTypeName(data.game_type)}
                  </p>
                </div>
              </div>

              {/* Basic Info */}
              <div className="space-y-3">
                <div>
                  <span className="font-medium text-gray-700">תיאור קצר:</span>
                  <p className="text-gray-600 mt-1">{data.short_description}</p>
                </div>

                {data.description && (
                  <div>
                    <span className="font-medium text-gray-700">תיאור מלא:</span>
                    <p className="text-gray-600 mt-1">{data.description}</p>
                  </div>
                )}

                <div className="flex items-center gap-4">
                  <div>
                    <span className="font-medium text-gray-700">מחיר:</span>
                    <span className="mr-2 text-lg font-bold text-green-600">
                      {formatPrice(data.price)}
                    </span>
                  </div>

                  <div>
                    <span className="font-medium text-gray-700">סטטוס:</span>
                    <Badge
                      variant={data.is_published ? "default" : "secondary"}
                      className="mr-2"
                    >
                      {data.is_published ? 'פורסם' : 'טיוטה'}
                    </Badge>
                  </div>
                </div>

                {data.subject && (
                  <div>
                    <span className="font-medium text-gray-700">מקצוע:</span>
                    <span className="mr-2 text-gray-600">{data.subject}</span>
                  </div>
                )}

                <div>
                  <span className="font-medium text-gray-700">תאימות מכשירים:</span>
                  <span className="mr-2 text-gray-600">
                    {getDeviceCompatibilityText(data.device_compatibility)}
                  </span>
                </div>

                {data.skills.length > 0 && (
                  <div>
                    <span className="font-medium text-gray-700">מיומנויות:</span>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {data.skills.map(skill => (
                        <Badge key={skill} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Game Settings */}
          <Card className="border-none shadow-xl bg-gradient-to-br from-white to-purple-50 rounded-3xl overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-1"></div>
            <CardHeader className="pb-6">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <Settings className="w-6 h-6 text-white" />
                </div>
                <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  ⚙️ הגדרות המשחק
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(data.game_settings).length > 0 ? (
                <div className="bg-gradient-to-r from-gray-50 to-purple-50 rounded-2xl border-2 border-purple-200 overflow-hidden">
                  <pre className="text-sm p-6 overflow-auto max-h-60 text-gray-700">
                    {JSON.stringify(data.game_settings, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <Settings className="w-8 h-8 text-purple-600" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-700 mb-2">אין הגדרות ספציפיות</h4>
                  <p className="text-gray-500 text-sm">הגדרות מותאמות למשחק יתווספו בעתיד</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Game Preview */}
        <div className="space-y-8">
          <Card className="border-none shadow-xl bg-gradient-to-br from-white to-orange-50 rounded-3xl overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 h-1"></div>
            <CardHeader className="pb-6">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <Eye className="w-6 h-6 text-white" />
                </div>
                <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                  👁️ תצוגה מקדימה של המשחק
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Game Image */}
              {data.image_url ? (
                <img
                  src={data.image_url}
                  alt={data.title}
                  className="w-full h-48 object-cover rounded-lg border mb-4"
                />
              ) : (
                <div className="w-full h-48 bg-gray-100 rounded-lg border mb-4 flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <span className="text-4xl block mb-2">{getGameTypeIcon(data.game_type)}</span>
                    <p>אין תמונה</p>
                  </div>
                </div>
              )}

              {/* Preview Notice */}
              <Alert className="mb-4">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                      תצוגה מקדימה
                    </Badge>
                    <span>המשחק עדיין בפיתוח ויציג תוכן מקום אחיזה</span>
                  </div>
                </AlertDescription>
              </Alert>

              {/* Preview Buttons */}
              <div className="space-y-4">
                <Button
                  onClick={() => setShowGamePreview(!showGamePreview)}
                  className={`w-full flex items-center gap-2 px-6 py-3 rounded-xl font-semibold shadow-lg transition-all duration-200 transform hover:scale-105 ${
                    showGamePreview
                      ? 'bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white shadow-gray-200'
                      : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-orange-200'
                  }`}
                >
                  <Play className="w-5 h-5" />
                  {showGamePreview ? '🔒 הסתר תצוגה מקדימה' : '▶️ הצג תצוגה מקדימה'}
                </Button>

                <Button
                  variant="outline"
                  className="w-full flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-orange-200 text-orange-700 hover:bg-orange-50 transition-all duration-200"
                  onClick={() => {
                    // TODO: Open in new tab/window for full preview
                    alert('תצוגה מלאה תתווסף בעתיד 🚀');
                  }}
                >
                  <ExternalLink className="w-5 h-5" />
                  🚀 פתח בחלון נפרד
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Game Engine Preview */}
          {showGamePreview && (
            <Card>
              <CardHeader>
                <CardTitle>תצוגה מקדימה של המשחק</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <GameEngine
                    game={{
                      ...data,
                      id: 'preview',
                      created_at: new Date().toISOString()
                    }}
                    data={{
                      ...data,
                      id: 'preview',
                      created_at: new Date().toISOString()
                    }}
                    isPreviewMode={true}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Final Actions */}
      <Card className="border-none shadow-2xl bg-gradient-to-br from-green-50 via-white to-emerald-50 rounded-3xl overflow-hidden animate-in slide-in-from-bottom duration-500">
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 h-1"></div>
        <CardContent className="p-8">
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
              <div className="text-4xl text-white">
                {isEditMode ? '✏️' : '🎉'}
              </div>
            </div>
            <h3 className="text-2xl font-bold bg-gradient-to-r from-green-700 to-emerald-700 bg-clip-text text-transparent mb-3">
              {isEditMode ? '🔄 עדכון המשחק' : '🎉 יצירת המשחק'}
            </h3>
            <p className="text-green-700 text-lg mb-6 max-w-md mx-auto leading-relaxed">
              {isEditMode
                ? 'לחץ "עדכן משחק" כדי לשמור את השינויים החדשים'
                : 'לחץ "צור משחק" כדי לשמור את המשחק החדש במערכת ולהתחיל לשחק!'
              }
            </p>
            <div className="flex flex-wrap gap-3 justify-center mb-4">
              <Badge variant="outline" className="bg-white border-2 border-green-200 text-green-700 px-4 py-2 rounded-full shadow-sm">
                🎮 {data.title}
              </Badge>
              <Badge variant="outline" className="bg-white border-2 border-blue-200 text-blue-700 px-4 py-2 rounded-full shadow-sm">
                🎯 {getGameTypeName(data.game_type)}
              </Badge>
              <Badge variant="outline" className="bg-white border-2 border-orange-200 text-orange-700 px-4 py-2 rounded-full shadow-sm">
                💰 {formatPrice(data.price)}
              </Badge>
              {data.is_published && (
                <Badge variant="outline" className="bg-gradient-to-r from-green-100 to-emerald-100 border-2 border-green-300 text-green-800 px-4 py-2 rounded-full shadow-sm animate-pulse">
                  🚀 יפורסם מיד
                </Badge>
              )}
            </div>
            <div className="text-center text-sm text-green-600">
              כל הפרטים נראים מעולים! המשחק מוכן להשקה 🚀
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
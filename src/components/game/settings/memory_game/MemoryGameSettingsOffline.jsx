import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Settings, Printer } from 'lucide-react';

/**
 * MemoryGameSettingsOffline - Offline/Print version settings for memory games
 * Handles configuration for printable memory game materials
 */
const MemoryGameSettingsOffline = ({
  gameProduct,
  gameEntity,
  onSettingsChange,
  isUpdating = false
}) => {
  return (
    <Card className="border-green-200">
      <CardHeader className="bg-green-50 border-b border-green-200">
        <CardTitle className="flex items-center gap-2 text-green-800">
          <FileText className="w-5 h-5" />
          הגדרות משחק זיכרון להדפסה
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Game Info */}
          <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <Printer className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-green-800">משחק זיכרון להדפסה</h3>
              <p className="text-sm text-green-600">
                הגדרות ליצירת קלפים פיזיים למשחק זיכרון
              </p>
            </div>
          </div>

          {/* Placeholder Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Settings className="w-4 h-4 text-gray-600" />
                <span className="font-medium text-gray-700">גודל קלפים</span>
              </div>
              <p className="text-sm text-gray-500">הגדרת גודל הקלפים להדפסה</p>
            </div>

            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Settings className="w-4 h-4 text-gray-600" />
                <span className="font-medium text-gray-700">מספר זוגות</span>
              </div>
              <p className="text-sm text-gray-500">כמה זוגות קלפים ייכללו בקובץ ההדפסה</p>
            </div>

            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Settings className="w-4 h-4 text-gray-600" />
                <span className="font-medium text-gray-700">פריסת עמוד</span>
              </div>
              <p className="text-sm text-gray-500">סידור הקלפים בעמוד PDF</p>
            </div>

            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Settings className="w-4 h-4 text-gray-600" />
                <span className="font-medium text-gray-700">הוראות משחק</span>
              </div>
              <p className="text-sm text-gray-500">כללת הוראות ברורות למורה/תלמיד</p>
            </div>

            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Settings className="w-4 h-4 text-gray-600" />
                <span className="font-medium text-gray-700">גב הקלף</span>
              </div>
              <p className="text-sm text-gray-500">עיצוב אחורי הקלפים</p>
            </div>

            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Settings className="w-4 h-4 text-gray-600" />
                <span className="font-medium text-gray-700">איכות הדפסה</span>
              </div>
              <p className="text-sm text-gray-500">רזולוציה ואיכות לצורך הדפסה</p>
            </div>
          </div>

          {/* Development Note */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-600 text-center">
              🚧 רכיב זה נמצא בפיתוח - הגדרות פרטניות יתווספו בהמשך
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MemoryGameSettingsOffline;
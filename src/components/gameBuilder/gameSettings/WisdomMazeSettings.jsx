import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Construction } from 'lucide-react';

export default function WisdomMazeSettings({ settings, onSettingsChange, validationErrors }) {
  // Placeholder component - returns empty settings for now

  return (
    <div className="space-y-4">
      <Alert className="border-purple-200 bg-purple-50">
        <Construction className="h-4 w-4 text-purple-600" />
        <AlertDescription className="text-purple-800">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300">
              מימוש מבוך החוכמה
            </Badge>
            <span>הגדרות מבוך החוכמה יתווספו בקרוב</span>
          </div>
        </AlertDescription>
      </Alert>

      <div className="text-center py-8 text-gray-500">
        <h3 className="text-lg font-medium text-gray-700 mb-2">הגדרות מבוך החוכמה</h3>
        <p className="text-gray-600 mb-4">
          כאן יתווספו הגדרות ספציפיות למבוך החוכמה כמו:
        </p>
        <ul className="text-sm text-gray-600 space-y-1 max-w-md mx-auto">
          <li>• גודל המבוך</li>
          <li>• מספר שאלות בכל רמה</li>
          <li>• סוגי משימות (שאלות פתוחות, בחירה מרובה)</li>
          <li>• רמת קושי השאלות</li>
          <li>• זמן לכל שאלה</li>
          <li>• מספר רמזים מותרים</li>
          <li>• נושאי השאלות</li>
        </ul>
      </div>

    </div>
  );
}
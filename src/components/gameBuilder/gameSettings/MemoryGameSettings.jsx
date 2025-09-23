import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Construction } from 'lucide-react';

export default function MemoryGameSettings({ settings, onSettingsChange, validationErrors }) {
  // Placeholder component - returns empty settings for now

  return (
    <div className="space-y-4">
      <Alert className="border-green-200 bg-green-50">
        <Construction className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
              מימוש משחק זיכרון
            </Badge>
            <span>הגדרות משחק הזיכרון יתווספו בקרוב</span>
          </div>
        </AlertDescription>
      </Alert>

      <div className="text-center py-8 text-gray-500">
        <h3 className="text-lg font-medium text-gray-700 mb-2">הגדרות משחק זיכרון</h3>
        <p className="text-gray-600 mb-4">
          כאן יתווספו הגדרות ספציפיות למשחק הזיכרון כמו:
        </p>
        <ul className="text-sm text-gray-600 space-y-1 max-w-md mx-auto">
          <li>• גודל לוח המשחק (4x4, 6x6, 8x8)</li>
          <li>• סוגי כרטיסיות (תמונות, מילים, מספרים)</li>
          <li>• זמן הצגת הכרטיסיות</li>
          <li>• מספר ניסיונות מותרים</li>
          <li>• רמת קושי</li>
          <li>• זמן מוגבל/בלתי מוגבל</li>
          <li>• אפקטים וסאונד</li>
        </ul>
      </div>

    </div>
  );
}
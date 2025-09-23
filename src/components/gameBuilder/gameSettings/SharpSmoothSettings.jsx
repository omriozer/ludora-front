import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Construction } from 'lucide-react';

export default function SharpSmoothSettings({ settings, onSettingsChange, validationErrors }) {
  // Placeholder component - returns empty settings for now

  return (
    <div className="space-y-4">
      <Alert className="border-orange-200 bg-orange-50">
        <Construction className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-800">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
              מימוש חד וחלק
            </Badge>
            <span>הגדרות משחק חד וחלק יתווספו בקרוב</span>
          </div>
        </AlertDescription>
      </Alert>

      <div className="text-center py-8 text-gray-500">
        <h3 className="text-lg font-medium text-gray-700 mb-2">הגדרות חד וחלק</h3>
        <p className="text-gray-600 mb-4">
          כאן יתווספו הגדרות ספציפיות למשחק חד וחלק כמו:
        </p>
        <ul className="text-sm text-gray-600 space-y-1 max-w-md mx-auto">
          <li>• מהירות תנועת הבועות</li>
          <li>• מספר בועות בכל רמה</li>
          <li>• סוגי בועות (חדות, חלקות, מיוחדות)</li>
          <li>• חוקי פיצוץ הבועות</li>
          <li>• רמת קושי</li>
          <li>• זמן מוגבל/בלתי מוגבל</li>
          <li>• אפקטים חזותיים וקוליים</li>
        </ul>
      </div>

    </div>
  );
}
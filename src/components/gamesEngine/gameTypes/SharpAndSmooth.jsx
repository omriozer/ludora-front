import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function SharpAndSmooth({
  gameContents,
  isPreviewMode,
  onGameUpdate,
  onGameComplete,
  onFirstInteraction,
  isPaused,
  showHints
}) {
  return (
    <Card className="w-full h-96">
      <CardContent className="p-8 text-center h-full flex flex-col justify-center">
        <div className="space-y-4">
          <div className="text-6xl mb-4">✏️</div>
          <h3 className="text-xl font-bold text-gray-800">חד וחלק</h3>
          <p className="text-gray-600">
            {isPreviewMode ? 'תצוגה מקדימה של חד וחלק' : 'משחק חד וחלק יתווסף בהמשך'}
          </p>
          <div className="text-sm text-gray-500">
            <p>מילים זמינות: {gameContents.words.length}</p>
            <p>שאלות: {gameContents.questions.length}</p>
            <p>תמונות: {gameContents.images.length}</p>
          </div>
          {!isPreviewMode && (
            <Button
              onClick={() => onFirstInteraction && onFirstInteraction()}
              className="mt-4"
            >
              התחל משחק
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
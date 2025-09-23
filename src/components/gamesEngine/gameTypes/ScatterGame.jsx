import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function ScatterGame({
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
          <div className="text-6xl mb-4">🎯</div>
          <h3 className="text-xl font-bold text-gray-800">תפזורת</h3>
          <p className="text-gray-600">
            {isPreviewMode ? 'תצוגה מקדימה של משחק התפזורת' : 'משחק התפזורת יתווסף בהמשך'}
          </p>
          <div className="text-sm text-gray-500">
            <p>תוכן זמין: {gameContents.words.length} מילים</p>
            <p>תמונות: {gameContents.images.length}</p>
            <p>קולות: {gameContents.audio.length}</p>
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
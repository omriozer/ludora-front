import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ALL_GAME_TYPES, getGameTypeIcon } from '@/config/gameTypes';
import { Check } from 'lucide-react';

export default function GameTypeStep({ data, onDataChange, validationErrors, isEditMode = false }) {
  const [selectedType, setSelectedType] = useState(data?.game_type || '');

  const handleSelectType = (gameTypeKey) => {
    // Prevent changing game type in edit mode
    if (isEditMode) {
      return;
    }

    setSelectedType(gameTypeKey);
    const gameTypeConfig = ALL_GAME_TYPES.find(type => type.key === gameTypeKey);
    onDataChange({
      game_type: gameTypeKey,
      price: gameTypeConfig?.defaultPrice || 0,
      device_compatibility: gameTypeConfig?.deviceCompatibility || 'both'
    });

    // Auto-advance to next step after selecting game type
    setTimeout(() => {
      // Trigger next step in GameBuilder
      const nextButton = document.querySelector('[data-tutorial-next-step]');
      if (nextButton) {
        nextButton.click();
      }
    }, 500);
  };

  return (
    <div className="space-y-8">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-3xl mb-6 shadow-lg">
          <div className="text-4xl">🎮</div>
        </div>
        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
          {isEditMode ? 'סוג המשחק' : 'בחר סוג משחק'}
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
          {isEditMode
            ? 'סוג המשחק לא ניתן לשינוי במצב עריכה - ניתן לעיין במידע על סוג המשחק הנבחר'
            : 'בחר את סוג המשחק שברצונך ליצור. כל סוג משחק מציע חוויה ייחודית למשתמשים'
          }
        </p>
      </div>

      {validationErrors.game_type && (
        <div className="text-red-600 text-sm mb-4">
          {validationErrors.game_type}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" data-tutorial="game-type-cards">
        {ALL_GAME_TYPES.map((gameType, index) => (
          <Card
            key={gameType.key}
            className={`group relative overflow-hidden transition-all duration-300 transform hover:scale-105 ${
              isEditMode
                ? `${selectedType === gameType.key
                    ? 'ring-4 ring-blue-400 border-blue-400 bg-gradient-to-br from-blue-50 to-blue-100 shadow-xl'
                    : 'border-gray-200 bg-gray-50 opacity-75'
                  } cursor-not-allowed`
                : `cursor-pointer hover:shadow-2xl hover:shadow-blue-100 ${
                    selectedType === gameType.key
                      ? 'ring-4 ring-blue-400 border-blue-400 bg-gradient-to-br from-blue-50 to-purple-50 shadow-xl scale-105'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-gradient-to-br hover:from-gray-50 hover:to-blue-50'
                  }`
            } rounded-2xl border-2`}
            onClick={() => handleSelectType(gameType.key)}
            data-tutorial-game-type={gameType.key}
            style={{
              animationDelay: `${index * 100}ms`
            }}
          >
            {/* Background gradient overlay */}
            <div className={`absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity duration-300 ${
              selectedType === gameType.key ? 'from-blue-400 to-purple-400' : 'from-blue-400 to-cyan-400'
            }`}></div>

            <CardContent className="relative p-8">
              <div className="text-center mb-6">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 transition-all duration-300 ${
                  selectedType === gameType.key
                    ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg scale-110'
                    : 'bg-gradient-to-br from-gray-100 to-gray-200 group-hover:from-blue-100 group-hover:to-purple-100'
                }`}>
                  <span className="text-3xl">{gameType.emoji}</span>
                </div>

                <h3 className={`text-xl font-bold mb-2 transition-colors duration-300 ${
                  selectedType === gameType.key ? 'text-blue-700' : 'text-gray-900 group-hover:text-blue-600'
                }`}>
                  {gameType.singular}
                </h3>

                <p className="text-sm text-gray-600 leading-relaxed mb-4">
                  {gameType.description}
                </p>
              </div>

              {/* Selection indicator */}
              {selectedType === gameType.key && (
                <div className="absolute top-4 left-4 w-8 h-8 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-lg animate-in zoom-in duration-300">
                  <Check className="w-5 h-5 text-white" />
                </div>
              )}

              {/* Disabled overlay for edit mode */}
              {isEditMode && selectedType !== gameType.key && (
                <div className="absolute inset-0 bg-gray-500 bg-opacity-20 rounded-2xl flex items-center justify-center">
                  <div className="bg-white px-3 py-1 rounded-full text-xs text-gray-600 shadow-sm">
                    לא זמין
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {/* Game Type Properties */}
                <div className="flex flex-wrap gap-2 justify-center">
                  {gameType.defaultPrice === 0 && (
                    <Badge variant="outline" className="bg-gradient-to-r from-green-50 to-green-100 text-green-700 border-green-200 px-3 py-1 rounded-full shadow-sm">
                      💰 חינם
                    </Badge>
                  )}

                  {gameType.deviceCompatibility === 'both' && (
                    <Badge variant="outline" className="bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border-blue-200 px-3 py-1 rounded-full shadow-sm">
                      📱💻 כל המכשירים
                    </Badge>
                  )}

                  {gameType.deviceCompatibility === 'mobile_only' && (
                    <Badge variant="outline" className="bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 border-purple-200 px-3 py-1 rounded-full shadow-sm">
                      📱 מובייל בלבד
                    </Badge>
                  )}

                  {gameType.deviceCompatibility === 'desktop_only' && (
                    <Badge variant="outline" className="bg-gradient-to-r from-orange-50 to-orange-100 text-orange-700 border-orange-200 px-3 py-1 rounded-full shadow-sm">
                      💻 דסקטופ בלבד
                    </Badge>
                  )}

                  {gameType.isDevelopment && (
                    <Badge variant="outline" className="bg-gradient-to-r from-yellow-50 to-yellow-100 text-yellow-700 border-yellow-200 px-3 py-1 rounded-full shadow-sm animate-pulse">
                      🚧 בפיתוח
                    </Badge>
                  )}

                  {!gameType.isPublished && (
                    <Badge variant="outline" className="bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 border-gray-200 px-3 py-1 rounded-full shadow-sm">
                      📝 טיוטה
                    </Badge>
                  )}

                  {!gameType.allowContentCreator && (
                    <Badge variant="outline" className="bg-gradient-to-r from-red-50 to-red-100 text-red-700 border-red-200 px-3 py-1 rounded-full shadow-sm">
                      🔒 מנהלים בלבד
                    </Badge>
                  )}
                </div>

                {/* Implementation Status */}
                <div className="text-xs text-gray-500 text-center italic bg-gray-50 rounded-lg py-2 px-3">
                  🔄 הגדרות ומימוש המשחק יתווספו בהדרגה
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedType && (
        <div className="mt-12 p-8 bg-gradient-to-r from-blue-50 via-purple-50 to-blue-50 rounded-3xl border-2 border-blue-200 shadow-lg animate-in slide-in-from-bottom duration-500">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl mb-4 shadow-lg">
              <span className="text-3xl text-white">{getGameTypeIcon(selectedType)}</span>
            </div>

            <div className="flex items-center justify-center gap-3 mb-4">
              <h3 className="text-2xl font-bold text-blue-800">
                {isEditMode ? 'סוג המשחק: ' : '🎉 נבחר: '}
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {ALL_GAME_TYPES.find(type => type.key === selectedType)?.singular}
                </span>
              </h3>
              {isEditMode && (
                <Badge variant="outline" className="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border-gray-300 px-3 py-1 rounded-full shadow-sm">
                  🔒 לא ניתן לשינוי
                </Badge>
              )}
            </div>

            <p className="text-lg text-blue-700 font-medium">
              {isEditMode
                ? '✏️ המשך לעריכת פרטי המשחק'
                : '🚀 לחץ "הבא" כדי להמשיך להגדרת פרטי המשחק'
              }
            </p>

            {/* Celebration animation for selection */}
            {!isEditMode && (
              <div className="flex justify-center mt-4 space-x-2 animate-bounce">
                <span className="text-2xl">🎮</span>
                <span className="text-2xl">✨</span>
                <span className="text-2xl">🎯</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
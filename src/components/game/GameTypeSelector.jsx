import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUser } from '@/contexts/UserContext';
import { clog } from '@/lib/utils';

/**
 * GameTypeSelector - Displays all available game types in a nice grid for selection
 */
const GameTypeSelector = ({ onGameTypeSelect, overrideSettingsDisabled = false, className = '' }) => {
  const { settings } = useUser();
  const gameTypes = settings?.game_types ? Object.values(settings.game_types) : [];

  // Filter to only show enabled game types (not disabled)
  const availableGameTypes = overrideSettingsDisabled ? gameTypes : gameTypes.filter(gameType => !gameType.disabled);

  const handleGameTypeClick = (gameType) => {
    clog('🎮 Game type selected:', gameType);
    onGameTypeSelect(gameType);
  };

  if (availableGameTypes.length === 0) {
    return (
      <div className={`p-6 text-center text-gray-500 ${className}`}>
        <p>אין סוגי משחק זמינים כרגע</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="text-center">
        <h3 className="text-xl font-bold text-gray-900 mb-2">בחר סוג משחק</h3>
        <p className="text-gray-600">בחר את סוג המשחק המתאים למוצר שלך</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {availableGameTypes.map((gameType) => (
          <Card
            key={gameType.key}
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 ${gameType.borderColor || 'border-gray-200'} ${gameType.bgColor || 'bg-white'}`}
            onClick={() => handleGameTypeClick(gameType)}
          >
            <CardContent className="p-6 text-center">
              <div className="mb-3">
                <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center bg-gradient-to-br ${gameType.gradient || 'from-gray-400 to-gray-600'} shadow-lg`}>
                  <span className="text-2xl">{gameType.emoji || '🎮'}</span>
                </div>
              </div>

              <h4 className="font-semibold text-gray-900 mb-2">
                {gameType.singular || gameType.key}
              </h4>

              {gameType.description && (
                <p className="text-sm text-gray-600 mb-3">
                  {gameType.description}
                </p>
              )}

              <Button
                variant="outline"
                size="sm"
                className={`w-full ${gameType.color ? `border-current` : ''}`}
                style={gameType.color ? { color: `var(--${gameType.color.split('-')[1]}-600)` } : {}}
              >
                בחר סוג זה
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default GameTypeSelector;
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUser } from '@/contexts/UserContext';
import { Edit } from 'lucide-react';

/**
 * GameTypeDisplay - Displays the selected game type with emoji and name
 */
const GameTypeDisplay = ({
  gameTypeKey,
  onEdit,
  showEditButton = true,
  size = 'medium', // 'small', 'medium', 'large'
  variant = 'card', // 'card', 'inline', 'badge'
  className = ''
}) => {
  const { settings } = useUser();
  const gameTypes = settings?.game_types ? Object.values(settings.game_types) : [];
  const gameType = gameTypes.find(gt => gt.key === gameTypeKey);

  if (!gameType) {
    return (
      <div className={`text-gray-500 text-sm ${className}`}>
        סוג משחק לא ידוע: {gameTypeKey}
      </div>
    );
  }

  // Size configurations
  const sizeConfig = {
    small: {
      emoji: 'text-lg',
      icon: 'w-8 h-8',
      title: 'text-sm font-medium',
      description: 'text-xs',
      padding: 'p-3',
      button: 'h-7 px-2 text-xs'
    },
    medium: {
      emoji: 'text-2xl',
      icon: 'w-12 h-12',
      title: 'text-base font-semibold',
      description: 'text-sm',
      padding: 'p-4',
      button: 'h-8 px-3 text-sm'
    },
    large: {
      emoji: 'text-3xl',
      icon: 'w-16 h-16',
      title: 'text-lg font-bold',
      description: 'text-base',
      padding: 'p-6',
      button: 'h-9 px-4'
    }
  };

  const config = sizeConfig[size] || sizeConfig.medium;

  // Inline variant - compact display
  if (variant === 'inline') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className={config.emoji}>{gameType.emoji || '🎮'}</span>
        <span className={config.title}>{gameType.singular}</span>
        {showEditButton && onEdit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="ml-auto"
          >
            <Edit className="w-3 h-3" />
          </Button>
        )}
      </div>
    );
  }

  // Badge variant - minimal display
  if (variant === 'badge') {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${gameType.bgColor || 'bg-gray-100'} ${gameType.borderColor || 'border-gray-200'} border ${className}`}>
        <span className="text-sm">{gameType.emoji || '🎮'}</span>
        <span className="text-sm font-medium">{gameType.singular}</span>
        {showEditButton && onEdit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="h-5 w-5 p-0 ml-1"
          >
            <Edit className="w-3 h-3" />
          </Button>
        )}
      </div>
    );
  }

  // Card variant - full display (default)
  return (
    <Card className={`${gameType.borderColor || 'border-gray-200'} ${gameType.bgColor || 'bg-white'} ${className}`}>
      <CardContent className={config.padding}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Game Type Icon */}
            <div className={`${config.icon} flex items-center justify-center rounded-full bg-gradient-to-br ${gameType.gradient || 'from-gray-400 to-gray-600'} shadow-md`}>
              <span className={config.emoji}>{gameType.emoji || '🎮'}</span>
            </div>

            {/* Game Type Info */}
            <div>
              <h4 className={`${config.title} text-gray-900`}>
                {gameType.singular}
              </h4>
              {gameType.description && size !== 'small' && (
                <p className={`${config.description} text-gray-600 mt-1`}>
                  {gameType.description}
                </p>
              )}
            </div>
          </div>

          {/* Edit Button */}
          {showEditButton && onEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              className={`${config.button} flex items-center gap-2`}
            >
              <Edit className="w-4 h-4" />
              {size !== 'small' && 'שנה'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default GameTypeDisplay;
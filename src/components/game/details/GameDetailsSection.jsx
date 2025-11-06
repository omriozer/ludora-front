import React from 'react';
import MemoryGameDetails from './MemoryGameDetails';

/**
 * GameDetailsSection - Router component for different game type details
 * Displays game-specific information based on game_type
 */
const GameDetailsSection = ({ gameDetails }) => {
  if (!gameDetails || !gameDetails.game_type) {
    return null;
  }

  // Route to appropriate game type component
  switch (gameDetails.game_type) {
    case 'memory_game':
      return <MemoryGameDetails gameDetails={gameDetails} />;

    case 'quiz_game':
      // TODO: Implement QuizGameDetails component
      return (
        <div className="game-details-section bg-gray-50 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">פרטי משחק החידונים</h3>
          <div className="text-center py-8 text-gray-500">
            <div className="text-lg mb-2">🧩</div>
            <div className="text-sm">פרטי משחק החידונים יוצגו כאן בקרוב</div>
          </div>
        </div>
      );

    case 'puzzle_game':
      // TODO: Implement PuzzleGameDetails component
      return (
        <div className="game-details-section bg-gray-50 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">פרטי משחק הפאזל</h3>
          <div className="text-center py-8 text-gray-500">
            <div className="text-lg mb-2">🧩</div>
            <div className="text-sm">פרטי משחק הפאזל יוצגו כאן בקרוב</div>
          </div>
        </div>
      );

    default:
      // Fallback for unknown game types
      return (
        <div className="game-details-section bg-gray-50 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">פרטי המשחק</h3>
          <div className="text-center py-8 text-gray-500">
            <div className="text-lg mb-2">🎮</div>
            <div className="text-sm">סוג משחק לא נתמך: {gameDetails.game_type}</div>
          </div>
        </div>
      );
  }
};

export default GameDetailsSection;
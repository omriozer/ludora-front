import React, { useState } from 'react';
import { Dices } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import DiceRollerScreen from './DiceRollerScreen';

/**
 * DiceRollerWidget - Dashboard widget for dice rolling
 * Provides configurable dice count with full-screen rolling animation
 */
const DiceRollerWidget = ({ widgetId, settings = {} }) => {
  const [isDiceRollerOpen, setIsDiceRollerOpen] = useState(false);
  const [diceCount, setDiceCount] = useState(settings?.diceCount || 2);

  const handleOpenDiceRoller = () => {
    setIsDiceRollerOpen(true);
  };

  const handleCloseDiceRoller = () => {
    setIsDiceRollerOpen(false);
  };

  return (
    <>
      {/* Widget Content */}
      <div className="h-full flex flex-col p-4">

        {/* Main Button */}
        <div className="flex-1 flex items-center justify-center mb-4">
          <button
            onClick={handleOpenDiceRoller}
            className="w-full h-full min-h-[120px] bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-lg md:text-xl font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex flex-col items-center justify-center gap-3 group"
            aria-label="הטל קוביות"
          >
            <Dices className="w-8 h-8 md:w-10 md:h-10 group-hover:scale-110 transition-transform duration-200" />
            <span className="text-center px-2 leading-tight">
              הטל קוביות
            </span>
          </button>
        </div>

        {/* Dice Count Selector */}
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
            מספר קוביות
          </label>
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5, 6].map((count) => (
              <button
                key={count}
                onClick={() => setDiceCount(count)}
                className={`w-8 h-8 rounded-full text-sm font-semibold transition-all duration-200 ${
                  diceCount === count
                    ? 'bg-green-600 text-white shadow-md'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {count}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Dice Roller Screen - Full Screen Overlay */}
      {isDiceRollerOpen && (
        <DiceRollerScreen
          onClose={handleCloseDiceRoller}
          diceCount={diceCount}
        />
      )}
    </>
  );
};

export default DiceRollerWidget;
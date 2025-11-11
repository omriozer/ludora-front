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
      <div className="h-full flex flex-col p-6 bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl">
        {/* Widget Header */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-1">הטלת קוביות</h3>
          <p className="text-sm text-gray-600">הטל {diceCount} קוביות בצורה אקראית</p>
        </div>

        {/* Main Button */}
        <div className="flex-1 flex items-center justify-center mb-6">
          <button
            onClick={handleOpenDiceRoller}
            className="w-full h-full min-h-[120px] bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-lg md:text-xl font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col items-center justify-center gap-3 group relative overflow-hidden"
            aria-label="הטל קוביות"
          >
            {/* Background Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

            <Dices className="w-12 h-12 md:w-14 md:h-14 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 relative z-10" />
            <span className="text-center px-2 leading-tight relative z-10">
              הטל קוביות
            </span>

            {/* Floating Dice Dots */}
            <div className="absolute top-4 right-4 grid grid-cols-2 gap-1">
              <div className="w-1 h-1 bg-white/30 rounded-full animate-pulse"></div>
              <div className="w-1 h-1 bg-white/30 rounded-full animate-pulse delay-100"></div>
              <div className="w-1 h-1 bg-white/30 rounded-full animate-pulse delay-200"></div>
              <div className="w-1 h-1 bg-white/30 rounded-full animate-pulse delay-300"></div>
            </div>
          </button>
        </div>

        {/* Dice Count Selector */}
        <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-lg">
          <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
            מספר קוביות
          </label>
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5, 6].map((count) => (
              <button
                key={count}
                onClick={() => setDiceCount(count)}
                className={`w-9 h-9 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  diceCount === count
                    ? 'bg-green-500 text-white shadow-lg scale-110'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105'
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
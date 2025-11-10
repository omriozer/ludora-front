import React, { useState, useEffect, useCallback } from 'react';
import FullScreenOverlay from './shared/FullScreenOverlay';

/**
 * DiceRollerScreen - Full-screen dice rolling interface
 * Provides realistic rolling animations with random timing
 */
const DiceRollerScreen = ({ onClose, diceCount = 2 }) => {
  const [diceValues, setDiceValues] = useState([]);
  const [isRolling, setIsRolling] = useState(false);
  const [showTotal, setShowTotal] = useState(false);

  // Initialize dice with random starting values
  useEffect(() => {
    const initialValues = Array(diceCount).fill(null).map(() =>
      Math.floor(Math.random() * 6) + 1
    );
    setDiceValues(initialValues);
    setShowTotal(false);
  }, [diceCount]);

  // Generate random values during rolling
  const generateRandomValues = useCallback(() => {
    return Array(diceCount).fill(null).map(() =>
      Math.floor(Math.random() * 6) + 1
    );
  }, [diceCount]);

  // Realistic dice rolling animation
  const rollDice = useCallback(() => {
    if (isRolling) return;

    setIsRolling(true);
    setShowTotal(false);

    // Rolling phase - rapid value changes
    const rollingInterval = setInterval(() => {
      setDiceValues(generateRandomValues());
    }, 80); // Fast changes during rolling

    // Gradual slowdown and stop
    const rollDuration = 1500 + Math.random() * 1000; // 1.5-2.5 seconds

    setTimeout(() => {
      clearInterval(rollingInterval);

      // Generate final values
      const finalValues = generateRandomValues();

      // Gradual slowdown effect
      const slowDownSteps = [300, 500, 800];
      let stepIndex = 0;

      const slowDownInterval = setInterval(() => {
        if (stepIndex < slowDownSteps.length) {
          setDiceValues(generateRandomValues());
          stepIndex++;
        } else {
          clearInterval(slowDownInterval);
          // Set final values and show total
          setDiceValues(finalValues);
          setIsRolling(false);
          setShowTotal(true);
        }
      }, slowDownSteps[stepIndex] || 200);

    }, rollDuration);
  }, [isRolling, generateRandomValues]);

  // Removed auto-roll - user must click to start

  // Calculate total
  const total = diceValues.reduce((sum, value) => sum + value, 0);

  // Create realistic 3D dice dots pattern
  const getDiceDotsPattern = (value) => {
    const DiceDot = ({ position }) => (
      <div
        className={`absolute w-4 h-4 bg-gray-800 rounded-full shadow-lg ${position}`}
        style={{
          background: 'radial-gradient(circle at 30% 30%, #4a5568, #1a202c)',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
        }}
      ></div>
    );

    const patterns = {
      1: (
        <div className="relative w-full h-full">
          <DiceDot position="top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
        </div>
      ),
      2: (
        <div className="relative w-full h-full">
          <DiceDot position="top-2 left-2" />
          <DiceDot position="bottom-2 right-2" />
        </div>
      ),
      3: (
        <div className="relative w-full h-full">
          <DiceDot position="top-2 left-2" />
          <DiceDot position="top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          <DiceDot position="bottom-2 right-2" />
        </div>
      ),
      4: (
        <div className="relative w-full h-full">
          <DiceDot position="top-2 left-2" />
          <DiceDot position="top-2 right-2" />
          <DiceDot position="bottom-2 left-2" />
          <DiceDot position="bottom-2 right-2" />
        </div>
      ),
      5: (
        <div className="relative w-full h-full">
          <DiceDot position="top-2 left-2" />
          <DiceDot position="top-2 right-2" />
          <DiceDot position="top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          <DiceDot position="bottom-2 left-2" />
          <DiceDot position="bottom-2 right-2" />
        </div>
      ),
      6: (
        <div className="relative w-full h-full">
          <DiceDot position="top-2 left-2" />
          <DiceDot position="top-2 right-2" />
          <DiceDot position="top-1/2 left-2 transform -translate-y-1/2" />
          <DiceDot position="top-1/2 right-2 transform -translate-y-1/2" />
          <DiceDot position="bottom-2 left-2" />
          <DiceDot position="bottom-2 right-2" />
        </div>
      ),
    };

    return patterns[value] || patterns[1];
  };

  return (
    <FullScreenOverlay onClose={onClose} backgroundColor="bg-gradient-to-br from-slate-100 via-gray-50 to-blue-50">
      {/* Textured Background */}
      <div className="absolute inset-0 opacity-3">
        <div className="w-full h-full" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='0.2'%3E%3Ccircle cx='5' cy='5' r='1'/%3E%3Ccircle cx='25' cy='25' r='1'/%3E%3Ccircle cx='35' cy='15' r='1'/%3E%3Ccircle cx='15' cy='35' r='1'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '40px 40px'
        }}></div>
      </div>

      <div className="text-center relative z-10">

        {/* 3D Dice Display */}
        <div className="flex items-center justify-center gap-8 mb-12">
          {diceValues.map((value, index) => (
            <div
              key={index}
              className={`relative ${isRolling ? 'animate-bounce' : ''}`}
              style={{
                animationDelay: `${index * 0.15}s`,
                animationDuration: isRolling ? '0.4s' : '0s'
              }}
            >
              {/* Multiple Shadow Layers for Depth */}
              <div className="absolute top-6 left-6 w-32 h-32 bg-gray-800 rounded-2xl opacity-20 blur-xl"></div>
              <div className="absolute top-4 left-4 w-32 h-32 bg-gray-700 rounded-2xl opacity-25 blur-lg"></div>
              <div className="absolute top-2 left-2 w-32 h-32 bg-gray-600 rounded-2xl opacity-30 blur-md"></div>

              {/* 3D Dice */}
              <div
                className={`relative w-32 h-32 rounded-2xl transition-all duration-300 transform-gpu ${
                  isRolling
                    ? 'rotate-12 scale-95'
                    : 'hover:scale-105 hover:rotate-2'
                }`}
                style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 25%, #e2e8f0 50%, #cbd5e1 100%)',
                  boxShadow: `
                    0 25px 50px -12px rgba(0, 0, 0, 0.25),
                    0 0 0 1px rgba(0, 0, 0, 0.05),
                    inset 0 1px 0 rgba(255, 255, 255, 0.7),
                    inset 0 -1px 0 rgba(0, 0, 0, 0.1)
                  `,
                  border: '2px solid #e2e8f0'
                }}
              >
                {/* Dice Face with Realistic Dots */}
                <div className="absolute inset-0 flex items-center justify-center p-4">
                  {getDiceDotsPattern(value)}
                </div>

                {/* Dice Edge Highlights */}
                <div className="absolute top-0 left-4 right-4 h-1 bg-gradient-to-r from-transparent via-white to-transparent opacity-60 rounded-full"></div>
                <div className="absolute left-0 top-4 bottom-4 w-1 bg-gradient-to-b from-transparent via-white to-transparent opacity-60 rounded-full"></div>
              </div>

              {/* Individual Value Display */}
              {!isRolling && (
                <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2">
                  <div className="bg-white px-4 py-2 rounded-xl shadow-lg border border-gray-200">
                    <span className="text-xl font-bold text-gray-700">
                      {value}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Total Display */}
        {showTotal && diceCount > 1 && (
          <div className="mb-8 animate-fade-in">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl px-8 py-4 shadow-2xl inline-block">
              <span className="text-3xl font-bold">
                סה"כ: {total}
              </span>
            </div>
          </div>
        )}

        {/* Roll Button */}
        {!isRolling && (
          <button
            onClick={rollDice}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xl font-bold px-12 py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
          >
            {showTotal ? "הטל שוב" : "הטל קוביות"}
          </button>
        )}

        {/* Rolling Status */}
        {isRolling && (
          <div className="text-xl text-gray-600 font-semibold animate-pulse">
            מטיל קוביות...
          </div>
        )}

      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
      `}</style>
    </FullScreenOverlay>
  );
};

export default DiceRollerScreen;
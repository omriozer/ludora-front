import React, { useState } from 'react';
import { Palette } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import ColorWheelScreen from './ColorWheelScreen';

/**
 * ColorWheelWidget - Dashboard widget for color wheel spinning
 * Provides configurable colors and spinning animation for random color selection
 */
const ColorWheelWidget = ({ widgetId, settings = {} }) => {
  const [isColorWheelOpen, setIsColorWheelOpen] = useState(false);
  const [colorCount, setColorCount] = useState(settings?.colorCount || 6);
  const [colors, setColors] = useState(settings?.colors || [
    '#FF0000', // Red
    '#00FF00', // Green
    '#0000FF', // Blue
    '#FFFF00', // Yellow
    '#FF00FF', // Magenta
    '#00FFFF', // Cyan
    '#FF8000', // Orange
    '#8000FF'  // Purple
  ]);

  const handleOpenColorWheel = () => {
    setIsColorWheelOpen(true);
  };

  const handleCloseColorWheel = () => {
    setIsColorWheelOpen(false);
  };

  const handleColorCountChange = (newCount) => {
    setColorCount(newCount);
    // Ensure we have enough colors
    if (newCount > colors.length) {
      const additionalColors = [
        '#FFB6C1', '#98FB98', '#87CEFA', '#DDA0DD',
        '#F0E68C', '#FFA07A', '#20B2AA', '#FF69B4'
      ];
      const neededColors = newCount - colors.length;
      setColors([...colors, ...additionalColors.slice(0, neededColors)]);
    }
  };

  const handleColorChange = (index, newColor) => {
    const updatedColors = [...colors];
    updatedColors[index] = newColor;
    setColors(updatedColors);
  };

  return (
    <>
      {/* Widget Content */}
      <div className="h-full flex flex-col p-6 bg-gradient-to-br from-purple-50 to-pink-100 rounded-xl">
        {/* Widget Header */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-1">גלגל צבעים</h3>
          <p className="text-sm text-gray-600">בחר צבע אקראי מתוך {colorCount} צבעים</p>
        </div>

        {/* Main Button */}
        <div className="flex-1 flex items-center justify-center mb-6">
          <button
            onClick={handleOpenColorWheel}
            className="w-full h-full min-h-[120px] bg-gradient-to-br from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white text-lg md:text-xl font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col items-center justify-center gap-3 group relative overflow-hidden"
            aria-label="סובב גלגל צבעים"
          >
            {/* Background Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

            <Palette className="w-12 h-12 md:w-14 md:h-14 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 relative z-10" />
            <span className="text-center px-2 leading-tight relative z-10">
              גלגל צבעים
            </span>

            {/* Color Dots */}
            <div className="absolute top-4 right-4 flex gap-1">
              {colors.slice(0, Math.min(colorCount, 4)).map((color, index) => (
                <div
                  key={index}
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ backgroundColor: color, animationDelay: `${index * 100}ms` }}
                />
              ))}
            </div>
          </button>
        </div>

        {/* Configuration Section */}
        <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-lg space-y-4">
          {/* Color Count Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
              מספר צבעים
            </label>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {[2, 3, 4, 5, 6, 7, 8].map((count) => (
                <button
                  key={count}
                  onClick={() => handleColorCountChange(count)}
                  className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all duration-200 ${
                    colorCount === count
                      ? 'bg-purple-500 text-white shadow-lg scale-110'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105'
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          {/* Color Preview */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
              עריכת צבעים
            </label>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {colors.slice(0, colorCount).map((color, index) => (
                <div key={index} className="relative">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => handleColorChange(index, e.target.value)}
                    className="w-8 h-8 rounded-lg border-2 border-white shadow-lg cursor-pointer hover:scale-110 transition-transform duration-200"
                    title={`צבע ${index + 1}`}
                  />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full shadow text-xs flex items-center justify-center text-gray-600 font-bold">
                    {index + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Color Wheel Screen - Full Screen Overlay */}
      {isColorWheelOpen && (
        <ColorWheelScreen
          onClose={handleCloseColorWheel}
          colors={colors.slice(0, colorCount)}
          colorCount={colorCount}
        />
      )}
    </>
  );
};

export default ColorWheelWidget;
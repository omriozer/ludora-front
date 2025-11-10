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
      <div className="h-full flex flex-col p-4">

        {/* Main Button */}
        <div className="flex-1 flex items-center justify-center mb-4">
          <button
            onClick={handleOpenColorWheel}
            className="w-full h-full min-h-[120px] bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-lg md:text-xl font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex flex-col items-center justify-center gap-3 group"
            aria-label="סובב גלגל צבעים"
          >
            <Palette className="w-8 h-8 md:w-10 md:h-10 group-hover:scale-110 transition-transform duration-200" />
            <span className="text-center px-2 leading-tight">
              גלגל צבעים
            </span>
          </button>
        </div>

        {/* Configuration Section */}
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 space-y-3">

          {/* Color Count Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
              מספר צבעים
            </label>
            <div className="flex items-center justify-center gap-2">
              {[2, 3, 4, 5, 6, 7, 8].map((count) => (
                <button
                  key={count}
                  onClick={() => handleColorCountChange(count)}
                  className={`w-8 h-8 rounded-full text-sm font-semibold transition-all duration-200 ${
                    colorCount === count
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          {/* Color Preview */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
              צבעים נוכחיים
            </label>
            <div className="flex items-center justify-center gap-1">
              {colors.slice(0, colorCount).map((color, index) => (
                <input
                  key={index}
                  type="color"
                  value={color}
                  onChange={(e) => handleColorChange(index, e.target.value)}
                  className="w-6 h-6 rounded border border-gray-300 cursor-pointer"
                  title={`צבע ${index + 1}`}
                />
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
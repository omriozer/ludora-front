import React, { useState, useEffect, useCallback, useRef } from 'react';
import FullScreenOverlay from './shared/FullScreenOverlay';

/**
 * ColorWheelScreen - Full-screen color wheel spinning interface
 * Provides realistic spinning animation with random timing and color selection
 */
const ColorWheelScreen = ({ onClose, colors = [], colorCount = 6 }) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedColor, setSelectedColor] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const wheelRef = useRef(null);

  // Calculate segment angle
  const segmentAngle = 360 / colorCount;

  // Generate color names for display
  const getColorName = (hex) => {
    const colorNames = {
      '#FF0000': 'אדום',
      '#00FF00': 'ירוק',
      '#0000FF': 'כחול',
      '#FFFF00': 'צהוב',
      '#FF00FF': 'מגנטה',
      '#00FFFF': 'ציאן',
      '#FF8000': 'כתום',
      '#8000FF': 'סגול',
      '#FFB6C1': 'ורוד בהיר',
      '#98FB98': 'ירוק בהיר',
      '#87CEFA': 'כחול בהיר',
      '#DDA0DD': 'סגול בהיר',
      '#F0E68C': 'צהוב בהיר',
      '#FFA07A': 'כתום בהיר',
      '#20B2AA': 'טורקיז',
      '#FF69B4': 'ורוד חם'
    };
    return colorNames[hex] || 'צבע מותאם';
  };

  // Spin the wheel with realistic physics
  const spinWheel = useCallback(() => {
    if (isSpinning) return;

    setIsSpinning(true);
    setShowResult(false);
    setSelectedColor(null);

    // Random spin parameters for realistic feel
    const baseSpins = 3; // Minimum number of full rotations
    const randomSpins = Math.random() * 4; // Additional 0-4 rotations
    const totalRotation = (baseSpins + randomSpins) * 360;

    // Random final position within a segment
    const finalSegmentIndex = Math.floor(Math.random() * colorCount);
    const segmentOffset = Math.random() * segmentAngle;
    const finalRotation = rotation + totalRotation + (finalSegmentIndex * segmentAngle) + segmentOffset;

    // Apply CSS animation
    if (wheelRef.current) {
      wheelRef.current.style.transition = 'transform 3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      wheelRef.current.style.transform = `rotate(${finalRotation}deg)`;
    }

    // Calculate selected color after animation
    setTimeout(() => {
      // Normalize rotation to 0-360 range
      const normalizedRotation = finalRotation % 360;
      // Convert to index (wheel spins clockwise, so we need to adjust)
      const pointerAngle = (360 - normalizedRotation) % 360;
      const selectedIndex = Math.floor(pointerAngle / segmentAngle);

      setRotation(finalRotation);
      setSelectedColor(colors[selectedIndex]);
      setIsSpinning(false);
      setShowResult(true);

      // Remove transition for next spin
      if (wheelRef.current) {
        wheelRef.current.style.transition = 'none';
      }
    }, 3000); // Match animation duration

  }, [isSpinning, rotation, colors, colorCount, segmentAngle]);

  // Removed auto-spin - user must click to start

  return (
    <FullScreenOverlay
      onClose={onClose}
      title={null}
      backgroundColor="bg-gradient-to-br from-slate-100 via-gray-50 to-blue-50"
    >
      {/* Textured Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="w-full h-full" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.4'%3E%3Ccircle cx='7' cy='7' r='1'/%3E%3Ccircle cx='37' cy='37' r='1'/%3E%3Ccircle cx='52' cy='22' r='1'/%3E%3Ccircle cx='22' cy='52' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px'
        }}></div>
      </div>

      {/* Floating geometric shapes for depth */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/4 w-20 h-20 bg-gradient-to-br from-purple-200 to-pink-200 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute top-3/4 right-1/4 w-16 h-16 bg-gradient-to-br from-blue-200 to-cyan-200 rounded-lg opacity-20 animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-1/4 left-1/3 w-12 h-12 bg-gradient-to-br from-yellow-200 to-orange-200 rounded-full opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="text-center relative z-10">

        {/* Wheel Container */}
        <div className="relative mb-8">

          {/* 3D Base/Platform */}
          <div className="absolute top-6 left-1/2 transform -translate-x-1/2 w-96 h-96 bg-gradient-to-br from-gray-300 via-gray-200 to-gray-100 rounded-full shadow-2xl opacity-30 blur-sm"></div>
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-[400px] h-[400px] bg-gradient-to-br from-slate-400 via-slate-300 to-slate-200 rounded-full shadow-xl opacity-20 blur-lg"></div>

          {/* Clean Downward Pointer */}
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-3 z-30">
            <div className="relative">
              {/* Pointer shadow */}
              <div className="absolute top-2 left-2 w-0 h-0 border-l-[15px] border-r-[15px] border-t-[30px] border-l-transparent border-r-transparent border-t-gray-600 opacity-40 blur-sm"></div>

              {/* Main pointer */}
              <div className="w-0 h-0 border-l-[15px] border-r-[15px] border-t-[30px] border-l-transparent border-r-transparent border-t-gray-800 drop-shadow-lg"></div>

              {/* Pointer highlight */}
              <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[8px] border-r-[8px] border-t-[16px] border-l-transparent border-r-transparent border-t-gray-400"></div>
            </div>
          </div>

          {/* Premium 3D Color Wheel */}
          <div className="relative w-96 h-96 mx-auto">

            {/* Multiple shadow layers for depth */}
            <div className="absolute top-8 left-8 w-96 h-96 bg-gradient-radial from-gray-900 via-gray-700 to-transparent rounded-full opacity-30 blur-2xl"></div>
            <div className="absolute top-6 left-6 w-96 h-96 bg-gradient-radial from-gray-800 via-gray-600 to-transparent rounded-full opacity-25 blur-xl"></div>
            <div className="absolute top-4 left-4 w-96 h-96 bg-gradient-radial from-gray-700 via-gray-500 to-transparent rounded-full opacity-20 blur-lg"></div>

            {/* Wheel base platform */}
            <div className="absolute top-2 left-2 w-96 h-96 bg-gradient-to-br from-gray-300 via-gray-200 to-gray-400 rounded-full shadow-inner opacity-40"></div>

            <svg
              ref={wheelRef}
              width="384"
              height="384"
              className="relative z-10"
              style={{
                transform: `rotate(${rotation}deg)`,
                filter: 'drop-shadow(0 20px 40px rgba(0, 0, 0, 0.4)) drop-shadow(0 8px 16px rgba(0, 0, 0, 0.2))'
              }}
            >
              <defs>
                {/* Advanced gradients for realistic 3D effect */}
                <radialGradient id="wheelBevel" cx="0.3" cy="0.3" r="1.2">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.6)" />
                  <stop offset="30%" stopColor="rgba(255,255,255,0.2)" />
                  <stop offset="70%" stopColor="rgba(0,0,0,0.1)" />
                  <stop offset="100%" stopColor="rgba(0,0,0,0.3)" />
                </radialGradient>

                <linearGradient id="rimGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#e0e0e0" />
                  <stop offset="25%" stopColor="#f5f5f5" />
                  <stop offset="50%" stopColor="#d0d0d0" />
                  <stop offset="75%" stopColor="#c0c0c0" />
                  <stop offset="100%" stopColor="#a0a0a0" />
                </linearGradient>

                <radialGradient id="centerHubGradient" cx="0.2" cy="0.2" r="1.0">
                  <stop offset="0%" stopColor="#888" />
                  <stop offset="20%" stopColor="#555" />
                  <stop offset="60%" stopColor="#333" />
                  <stop offset="100%" stopColor="#111" />
                </radialGradient>

                {/* Individual segment gradients for depth */}
                {colors.map((color, index) => (
                  <linearGradient key={`segGrad-${index}`} id={`segmentGradient-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={`${color}ee`} />
                    <stop offset="50%" stopColor={color} />
                    <stop offset="100%" stopColor={`${color}cc`} />
                  </linearGradient>
                ))}
              </defs>

              {/* Outer decorative rim */}
              <circle
                cx="192"
                cy="192"
                r="185"
                fill="url(#rimGradient)"
                stroke="rgba(0,0,0,0.2)"
                strokeWidth="2"
              />
              <circle
                cx="192"
                cy="192"
                r="180"
                fill="none"
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="1"
              />
              <circle
                cx="192"
                cy="192"
                r="175"
                fill="none"
                stroke="rgba(0,0,0,0.1)"
                strokeWidth="1"
              />

              {/* Color segments with enhanced 3D effect */}
              {colors.map((color, index) => {
                const startAngle = index * segmentAngle;
                const endAngle = (index + 1) * segmentAngle;

                const outerRadius = 170;
                const innerRadius = 35; // Larger inner radius for better proportions
                const centerX = 192;
                const centerY = 192;

                const startAngleRad = (startAngle * Math.PI) / 180;
                const endAngleRad = (endAngle * Math.PI) / 180;

                // Outer arc points
                const x1Outer = centerX + outerRadius * Math.cos(startAngleRad);
                const y1Outer = centerY + outerRadius * Math.sin(startAngleRad);
                const x2Outer = centerX + outerRadius * Math.cos(endAngleRad);
                const y2Outer = centerY + outerRadius * Math.sin(endAngleRad);

                // Inner arc points
                const x1Inner = centerX + innerRadius * Math.cos(startAngleRad);
                const y1Inner = centerY + innerRadius * Math.sin(startAngleRad);
                const x2Inner = centerX + innerRadius * Math.cos(endAngleRad);
                const y2Inner = centerY + innerRadius * Math.sin(endAngleRad);

                const largeArc = segmentAngle > 180 ? 1 : 0;

                // Create annular sector (donut slice)
                const pathData = [
                  `M ${x1Inner} ${y1Inner}`,
                  `L ${x1Outer} ${y1Outer}`,
                  `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2Outer} ${y2Outer}`,
                  `L ${x2Inner} ${y2Inner}`,
                  `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x1Inner} ${y1Inner}`,
                  'Z'
                ].join(' ');

                return (
                  <g key={index}>
                    {/* Segment shadow */}
                    <path
                      d={pathData}
                      fill="rgba(0,0,0,0.15)"
                      transform="translate(2, 3)"
                    />

                    {/* Main colored segment */}
                    <path
                      d={pathData}
                      fill={`url(#segmentGradient-${index})`}
                      stroke="rgba(255,255,255,0.8)"
                      strokeWidth="1.5"
                      className={`transition-all duration-300 ${isSpinning ? 'opacity-85' : 'opacity-100'}`}
                    />

                    {/* Segment highlight */}
                    <path
                      d={pathData}
                      fill="url(#wheelBevel)"
                      className="pointer-events-none"
                      opacity="0.6"
                    />
                  </g>
                );
              })}

              {/* Central hub with premium finish */}
              <circle
                cx="194"
                cy="194"
                r="32"
                fill="rgba(0,0,0,0.4)"
              />
              <circle
                cx="192"
                cy="192"
                r="30"
                fill="url(#centerHubGradient)"
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="2"
              />
              <circle
                cx="187"
                cy="187"
                r="12"
                fill="rgba(255,255,255,0.4)"
              />
              <circle
                cx="192"
                cy="192"
                r="8"
                fill="rgba(0,0,0,0.6)"
              />
              <circle
                cx="190"
                cy="190"
                r="3"
                fill="rgba(255,255,255,0.8)"
              />

              {/* Decorative rim details */}
              {[...Array(24)].map((_, i) => {
                const angle = (i * 15) * Math.PI / 180;
                const x = 192 + 178 * Math.cos(angle);
                const y = 192 + 178 * Math.sin(angle);
                return (
                  <circle
                    key={`rim-${i}`}
                    cx={x}
                    cy={y}
                    r="2"
                    fill="rgba(255,255,255,0.6)"
                    stroke="rgba(0,0,0,0.2)"
                    strokeWidth="0.5"
                  />
                );
              })}
            </svg>

            {/* Spinning indicator */}
            {isSpinning && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-white bg-opacity-90 rounded-full px-4 py-2 shadow-lg">
                  <span className="text-lg font-semibold text-gray-800 animate-pulse">
                    מסתובב...
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Result Display */}
        {showResult && selectedColor && (
          <div className="mb-8 animate-fade-in">
            <div
              className="inline-flex items-center gap-4 rounded-2xl px-8 py-4 text-white text-2xl font-bold shadow-2xl transform hover:scale-105 transition-transform duration-200"
              style={{
                backgroundColor: selectedColor,
                boxShadow: `0 0 30px ${selectedColor}44, 0 20px 40px rgba(0, 0, 0, 0.3)`
              }}
            >
              <div
                className="w-8 h-8 rounded-full border-2 border-white shadow-lg"
                style={{ backgroundColor: selectedColor }}
              ></div>
              <span>
                {getColorName(selectedColor)}
              </span>
            </div>
          </div>
        )}

        {/* Spin Button */}
        {!isSpinning && (
          <button
            onClick={spinWheel}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-xl font-bold px-12 py-4 rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-200 transform hover:scale-105 active:scale-95"
            style={{
              boxShadow: `
                0 0 20px rgba(147, 51, 234, 0.4),
                0 15px 30px rgba(0, 0, 0, 0.3)
              `
            }}
          >
            {showResult ? "סובב שוב" : "סובב גלגל"}
          </button>
        )}

        {/* Color List */}
        <div className="mt-8">
          <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 text-center">צבעים בגלגל:</h3>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {colors.map((color, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-100"
                >
                  <div
                    className="w-4 h-4 rounded-full border border-gray-300"
                    style={{ backgroundColor: color }}
                  ></div>
                  <span className="text-xs text-gray-600">
                    {getColorName(color)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

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

export default ColorWheelScreen;
import React from "react";

export const Slider = React.forwardRef(({
  value = [0],
  onValueChange,
  min = 0,
  max = 1,
  step = 0.01,
  className = "",
  ...props
}, ref) => {
  const currentValue = Array.isArray(value) ? value[0] : value;

  const handleChange = (e) => {
    const newValue = parseFloat(e.target.value);
    if (onValueChange && !isNaN(newValue)) {
      onValueChange([newValue]);
    }
  };

  const handleInput = (e) => {
    // Handle real-time changes during drag
    const newValue = parseFloat(e.target.value);
    if (onValueChange && !isNaN(newValue)) {
      onValueChange([newValue]);
    }
  };

  return (
    <div className={`relative w-full ${className}`}>
      <input
        ref={ref}
        type="range"
        min={min}
        max={max}
        step={step}
        value={currentValue || 0}
        onChange={handleChange}
        onInput={handleInput}
        className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
        {...props}
      />
      <style jsx>{`
        .slider {
          background: rgba(255, 255, 255, 0.2);
        }
        
        .slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: 2px solid #6366f1;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          transition: all 0.15s ease;
        }
        
        .slider::-webkit-slider-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        }
        
        .slider::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: 2px solid #6366f1;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          transition: all 0.15s ease;
        }

        .slider::-webkit-slider-track {
          width: 100%;
          height: 4px;
          cursor: pointer;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 2px;
        }

        .slider::-moz-range-track {
          width: 100%;
          height: 4px;
          cursor: pointer;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 2px;
          border: none;
        }

        .slider::-moz-range-progress {
          background: #6366f1;
          height: 4px;
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
});

Slider.displayName = 'Slider';
import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Minus, Plus } from 'lucide-react';

/**
 * NumberInput Component with increment/decrement buttons
 *
 * @param {number} value - Current value
 * @param {function} onChange - Callback when value changes
 * @param {number} min - Minimum value (default: 0)
 * @param {number} max - Maximum value (default: 100)
 * @param {number} step - Step size for increment/decrement (default: 1)
 * @param {string} suffix - Text to display after value (e.g., '%', 'px')
 * @param {string} placeholder - Input placeholder
 * @param {boolean} disabled - Whether input is disabled
 */
export const NumberInput = ({
  value,
  onChange,
  min = 0,
  max = 999999999,
  step = 1,
  suffix = '',
  placeholder = '',
  disabled = false,
  className = ''
}) => {
  const handleIncrement = () => {
    const newValue = Math.min(max, (value || 0) + step);
    onChange(newValue);
  };

  const handleDecrement = () => {
    const newValue = Math.max(min, (value || 0) - step);
    onChange(newValue);
  };

  const handleInputChange = (e) => {
    const inputValue = e.target.value;

    // Allow empty input for easier editing
    if (inputValue === '') {
      onChange(0);
      return;
    }

    // Parse as number and validate range
    const numValue = parseFloat(inputValue);
    if (!isNaN(numValue)) {
      const clampedValue = Math.max(min, Math.min(max, numValue));
      onChange(clampedValue);
    }
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleDecrement}
        disabled={disabled || value <= min}
        className="h-8 w-8 p-0 shrink-0"
      >
        <Minus className="h-3 w-3" />
      </Button>

      <div className="relative flex-1">
        <Input
          type="number"
          value={value || ''}
          onChange={handleInputChange}
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
          disabled={disabled}
          className="h-8 text-center pr-8"
        />
        {suffix && (
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none">
            {suffix}
          </span>
        )}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleIncrement}
        disabled={disabled || value >= max}
        className="h-8 w-8 p-0 shrink-0"
      >
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  );
};
import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * ExitButton - Reusable exit button for full-screen overlays
 * Consistent styling and positioning across all full-screen widgets
 */
const ExitButton = ({ onClose, label = "יציאה", tooltip = "יציאה (ESC)" }) => {
  return (
    <div className="absolute top-4 left-4 z-[100]">
      <Button
        onClick={onClose}
        size="lg"
        className="bg-red-500 hover:bg-red-600 text-white rounded-xl px-4 py-3 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
        title={tooltip}
      >
        <X className="w-5 h-5" />
        <span className="font-semibold">{label}</span>
      </Button>
    </div>
  );
};

export default ExitButton;
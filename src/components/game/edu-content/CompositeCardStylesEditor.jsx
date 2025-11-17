/**
 * CompositeCardStylesEditor - Enhanced modal for editing composite card text styles
 *
 * Features visual positioning, color picker with opacity, font selection, and live preview
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import {
  Palette,
  Settings,
  RotateCcw,
  MousePointer,
  Type,
  Brush,
  Eye,
  Target,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  CornerLeftUp,
  CornerRightUp,
  CornerLeftDown,
  CornerRightDown
} from 'lucide-react';
import CompositeCardDisplay from './CompositeCardDisplay';

// Default style settings
const DEFAULT_STYLES = {
  position: 'center',
  textColor: '#ffffff',
  textOpacity: 1,
  fontSize: 1, // Multiplier (1 = normal size)
  fontWeight: 'bold',
  fontFamily: 'Inter',
  textShadow: true,
  backgroundOpacity: 0.2, // For text area background
  padding: 8, // Padding around text
};

// Available fonts
const FONT_OPTIONS = [
  { value: 'Inter', label: 'Inter', description: 'מודרני ונקי' },
  { value: 'NotoSansHebrew', label: 'Noto Sans Hebrew', description: 'תמיכה מושלמת בעברית' },
  { value: 'Rubik', label: 'Rubik', description: 'עגלגל וידידותי' },
  { value: 'Heebo', label: 'Heebo', description: 'מעוצב לעברית' },
  { value: 'Assistant', label: 'Assistant', description: 'קל לקריאה' },
  { value: 'Frank Ruehl Libre', label: 'Frank Ruehl Libre', description: 'מסורתי עברי' },
];

// Position options with visual data - simple visual mapping
const POSITION_OPTIONS = [
  {
    value: 'top-left',
    label: 'עליון שמאל',
    icon: CornerLeftUp,
    gridPos: 'row-1 col-1'
  },
  {
    value: 'top',
    label: 'עליון',
    icon: ArrowUp,
    gridPos: 'row-1 col-2'
  },
  {
    value: 'top-right',
    label: 'עליון ימין',
    icon: CornerRightUp,
    gridPos: 'row-1 col-3'
  },
  {
    value: 'left',
    label: 'שמאל',
    icon: ArrowLeft,
    gridPos: 'row-2 col-1'
  },
  {
    value: 'center',
    label: 'מרכז',
    icon: Target,
    gridPos: 'row-2 col-2'
  },
  {
    value: 'right',
    label: 'ימין',
    icon: ArrowRight,
    gridPos: 'row-2 col-3'
  },
  {
    value: 'bottom-left',
    label: 'תחתון שמאל',
    icon: CornerLeftDown,
    gridPos: 'row-3 col-1'
  },
  {
    value: 'bottom',
    label: 'תחתון',
    icon: ArrowDown,
    gridPos: 'row-3 col-2'
  },
  {
    value: 'bottom-right',
    label: 'תחתון ימין',
    icon: CornerRightDown,
    gridPos: 'row-3 col-3'
  },
];

// Font weight options
const FONT_WEIGHT_OPTIONS = [
  { value: 'normal', label: 'רגיל', description: 'משקל רגיל' },
  { value: 'bold', label: 'מודגש', description: 'טקסט מודגש' },
  { value: '900', label: 'מודגש מאוד', description: 'טקסט מודגש מאוד' },
];

// Helper function to convert hex color to rgba
const hexToRgba = (hex, alpha) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;

  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const CompositeCardStylesEditor = ({
  isOpen,
  onClose,
  onSave,
  bgContent,
  dataContent,
  initialStyles = {}
}) => {
  const [styles, setStyles] = useState({ ...DEFAULT_STYLES, ...initialStyles });
  const [isSaving, setIsSaving] = useState(false);

  // Reset styles when modal opens
  useEffect(() => {
    if (isOpen) {
      setStyles({ ...DEFAULT_STYLES, ...initialStyles });
    }
  }, [isOpen, initialStyles]);

  const handleStyleChange = (key, value) => {
    setStyles(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Handle color change with opacity
  const handleColorChange = (color, opacity = styles.textOpacity) => {
    setStyles(prev => ({
      ...prev,
      textColor: color,
      textOpacity: opacity
    }));
  };

  // Handle position change
  const handlePositionChange = (position) => {
    setStyles(prev => ({
      ...prev,
      position: position
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(styles);
      onClose();
    } catch (error) {
      console.error('Error saving styles:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setStyles(DEFAULT_STYLES);
  };

  // Get final text color with opacity
  const getFinalTextColor = () => {
    return hexToRgba(styles.textColor, styles.textOpacity);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg">
              <Palette className="w-6 h-6 text-purple-600" />
            </div>
            עיצוב טקסט מתקדם
          </DialogTitle>
          <DialogDescription className="text-base">
            התאם את הופעת הטקסט על הקלף המשולב באמצעות כלים מתקדמים
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 py-6">
          {/* Interactive Position & Preview Panel */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <MousePointer className="w-5 h-5 text-orange-600" />
              <h3 className="text-lg font-semibold text-gray-800">מיקום הטקסט</h3>
            </div>

            {/* Interactive Position Control */}
            <div className="relative bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-xl border-2 border-gray-200">
              {/* Large preview card with position overlay */}
              <div className="relative w-80 h-80 mx-auto">
                <CompositeCardDisplay
                  bgContent={bgContent}
                  dataContent={dataContent}
                  size="xl"
                  showMetadata={false}
                  customStyles={{
                    ...styles,
                    textColor: getFinalTextColor(),
                    fontFamily: styles.fontFamily
                  }}
                  className="w-full h-full shadow-lg"
                />

                {/* Position control overlay */}
                <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-200">
                  <div className="absolute inset-0 bg-black/10 rounded-lg" />

                  {/* Position buttons positioned around the card */}
                  {POSITION_OPTIONS.map((option) => {
                    const IconComponent = option.icon;
                    const isActive = styles.position === option.value;

                    // Calculate button position based on option value - position button WHERE text will appear
                    let positionClasses = '';
                    switch (option.value) {
                      case 'top-left':
                        // Button for top-left should appear where top-left text appears
                        positionClasses = 'top-2 left-2';
                        break;
                      case 'top':
                        positionClasses = 'top-2 left-1/2 -translate-x-1/2';
                        break;
                      case 'top-right':
                        // Button for top-right should appear where top-right text appears
                        positionClasses = 'top-2 right-2';
                        break;
                      case 'left':
                        // Button for left should appear where left text appears
                        positionClasses = 'top-1/2 left-2 -translate-y-1/2';
                        break;
                      case 'center':
                        positionClasses = 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
                        break;
                      case 'right':
                        // Button for right should appear where right text appears
                        positionClasses = 'top-1/2 right-2 -translate-y-1/2';
                        break;
                      case 'bottom-left':
                        // Button for bottom-left should appear where bottom-left text appears
                        positionClasses = 'bottom-2 left-2';
                        break;
                      case 'bottom':
                        positionClasses = 'bottom-2 left-1/2 -translate-x-1/2';
                        break;
                      case 'bottom-right':
                        // Button for bottom-right should appear where bottom-right text appears
                        positionClasses = 'bottom-2 right-2';
                        break;
                    }

                    return (
                      <Button
                        key={option.value}
                        onClick={() => handlePositionChange(option.value)}
                        variant={isActive ? "default" : "secondary"}
                        size="sm"
                        className={`
                          absolute h-8 w-8 p-0 transition-all duration-200
                          ${positionClasses}
                          ${isActive
                            ? 'bg-purple-600 text-white shadow-lg ring-2 ring-purple-300 ring-offset-2 scale-110'
                            : 'bg-white/90 hover:bg-purple-50 hover:border-purple-300 shadow-md'
                          }
                        `}
                        title={option.label}
                      >
                        <IconComponent className="w-3 h-3" />
                      </Button>
                    );
                  })}
                </div>
              </div>

              <p className="text-center text-sm text-gray-600 mt-4 font-medium">
                מיקום נוכחי: <span className="font-bold text-purple-700">
                  {POSITION_OPTIONS.find(p => p.value === styles.position)?.label}
                </span>
                <br />
                <span className="text-xs text-gray-500">העבר עכבר מעל הקלף כדי לראות כפתורי מיקום</span>
              </p>
            </div>
          </div>

          {/* Style Controls Panel */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Brush className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-800">עיצוב הטקסט</h3>
            </div>

            {/* Font Family */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Type className="w-4 h-4" />
                גופן
              </Label>
              <Select value={styles.fontFamily} onValueChange={(value) => handleStyleChange('fontFamily', value)}>
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map((font) => (
                    <SelectItem key={font.value} value={font.value}>
                      <div className="text-right">
                        <div className="font-medium" style={{ fontFamily: font.value }}>
                          {font.label}
                        </div>
                        <div className="text-xs text-gray-500">{font.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Color Picker */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Palette className="w-4 h-4" />
                צבע ושקיפות טקסט
              </Label>
              <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Input
                    type="color"
                    value={styles.textColor}
                    onChange={(e) => handleColorChange(e.target.value)}
                    className="w-16 h-10 p-1 rounded"
                  />
                  <div className="flex-1">
                    <Input
                      type="text"
                      value={styles.textColor}
                      onChange={(e) => handleColorChange(e.target.value)}
                      className="uppercase"
                      placeholder="#ffffff"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">שקיפות טקסט</Label>
                  <Slider
                    value={[styles.textOpacity]}
                    onValueChange={(value) => handleStyleChange('textOpacity', value[0])}
                    min={0.1}
                    max={1}
                    step={0.1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>שקוף</span>
                    <span>{Math.round(styles.textOpacity * 100)}%</span>
                    <span>אטום</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Font Size */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">גודל טקסט</Label>
              <div className="px-3">
                <Slider
                  value={[styles.fontSize]}
                  onValueChange={(value) => handleStyleChange('fontSize', value[0])}
                  min={0.5}
                  max={3}
                  step={0.1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>קטן (0.5x)</span>
                  <span className="font-medium">{styles.fontSize}x</span>
                  <span>גדול (3x)</span>
                </div>
              </div>
            </div>

            {/* Font Weight */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">עובי טקסט</Label>
              <Select value={styles.fontWeight} onValueChange={(value) => handleStyleChange('fontWeight', value)}>
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_WEIGHT_OPTIONS.map((weight) => (
                    <SelectItem key={weight.value} value={weight.value}>
                      <div className="text-right">
                        <div className="font-medium">{weight.label}</div>
                        <div className="text-xs text-gray-500">{weight.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Background Opacity */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">שקיפות רקע הטקסט</Label>
              <div className="px-3">
                <Slider
                  value={[styles.backgroundOpacity]}
                  onValueChange={(value) => handleStyleChange('backgroundOpacity', value[0])}
                  min={0}
                  max={0.8}
                  step={0.05}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>שקוף</span>
                  <span>{Math.round(styles.backgroundOpacity * 100)}%</span>
                  <span>אטום</span>
                </div>
              </div>
            </div>

            {/* Text Shadow */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <Label className="text-sm font-medium">צל טקסט</Label>
              <Button
                variant={styles.textShadow ? "default" : "outline"}
                size="sm"
                onClick={() => handleStyleChange('textShadow', !styles.textShadow)}
                className="min-w-16"
              >
                {styles.textShadow ? 'פעיל' : 'כבוי'}
              </Button>
            </div>

            {/* Style Summary */}
            <div className="space-y-3 p-4 bg-white border border-gray-200 rounded-lg">
              <h4 className="font-medium text-gray-800 flex items-center gap-2">
                <Eye className="w-4 h-4 text-green-600" />
                סיכום עיצוב נוכחי:
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                <div>מיקום: <span className="font-medium">{POSITION_OPTIONS.find(p => p.value === styles.position)?.label}</span></div>
                <div>גופן: <span className="font-medium">{styles.fontFamily}</span></div>
                <div>גודל: <span className="font-medium">{styles.fontSize}x</span></div>
                <div>צבע: <span className="font-medium">{styles.textColor}</span></div>
                <div>עובי: <span className="font-medium">{FONT_WEIGHT_OPTIONS.find(w => w.value === styles.fontWeight)?.label}</span></div>
                <div>צל: <span className="font-medium">{styles.textShadow ? 'פעיל' : 'כבוי'}</span></div>
              </div>
            </div>

            {/* Reset Button */}
            <Button
              variant="outline"
              onClick={handleReset}
              className="w-full flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              איפוס להגדרות ברירת מחדל
            </Button>
          </div>
        </div>

        <DialogFooter className="border-t pt-4 flex gap-3">
          <Button
            onClick={onClose}
            variant="outline"
            disabled={isSaving}
            className="min-w-24"
          >
            ביטול
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="min-w-32 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            {isSaving ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                שומר...
              </div>
            ) : (
              <>
                <Brush className="w-4 h-4 mr-1" />
                שמור עיצוב
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export { DEFAULT_STYLES };
export default CompositeCardStylesEditor;
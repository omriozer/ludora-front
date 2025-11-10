import React, { useState, useRef } from 'react';
import { X, Crown, Trash2, RotateCw, EyeOff, Eye } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { NumberInput } from '@/components/ui/number-input';
import { Button } from '@/components/ui/button';

const FloatingSettingsMenu = ({
  selectedItem,
  footerConfig,
  onConfigChange,
  onStyleChange,
  userRole,
  onClose,
  onDeleteElement
}) => {
  // Early return must be before any hooks
  const itemConfig = footerConfig[selectedItem] || footerConfig.customElements?.[selectedItem];
  if (!selectedItem || !itemConfig) return null;

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const menuRef = useRef(null);

  const isAdmin = userRole === 'admin' || userRole === 'sysadmin';
  const isCustomElement = footerConfig.customElements?.[selectedItem];

  const handleMouseDown = (e) => {
    if (e.target.closest('.menu-content')) return; // Don't drag when clicking on controls

    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;

    // Keep menu within viewport bounds
    const maxX = window.innerWidth - 320; // menu width
    const maxY = window.innerHeight - 400; // approximate menu height

    setPosition({
      x: Math.max(0, Math.min(maxX, newX)),
      y: Math.max(0, Math.min(maxY, newY))
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add global event listeners for dragging
  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  const getItemDisplayName = () => {
    if (isCustomElement) {
      const elementType = itemConfig.type;
      switch (elementType) {
        case 'box': return 'תיבה';
        case 'line': return 'קו';
        case 'dotted-line': return 'קו מנוקד';
        case 'watermark-text': return 'טקסט סימן מים';
        case 'watermark-logo': return 'לוגו סימן מים';
        case 'free-text': return 'טקסט חופשי';
        default: return elementType;
      }
    }

    switch (selectedItem) {
      case 'logo': return 'לוגו';
      case 'text': return 'טקסט זכויות יוצרים';
      case 'url': return 'קישור URL';
      default: return selectedItem;
    }
  };

  const getItemColor = () => {
    if (isCustomElement) {
      const elementType = itemConfig.type;
      switch (elementType) {
        case 'box': return 'bg-green-50 border-green-200';
        case 'line': return 'bg-yellow-50 border-yellow-200';
        case 'dotted-line': return 'bg-orange-50 border-orange-200';
        case 'watermark-text': return 'bg-red-50 border-red-200';
        case 'watermark-logo': return 'bg-pink-50 border-pink-200';
        case 'free-text': return 'bg-blue-50 border-blue-200';
        default: return 'bg-gray-50 border-gray-200';
      }
    }

    switch (selectedItem) {
      case 'logo': return 'bg-gray-50 border-gray-200';
      case 'text': return 'bg-blue-50 border-blue-200';
      case 'url': return 'bg-purple-50 border-purple-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const renderLogoControls = () => (
    <>
      {/* Hidden Toggle */}
      {isAdmin && (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">אלמנט מוסתר</Label>
            <Crown className="w-3 h-3 text-orange-500" />
          </div>
          <button
            onClick={() => onConfigChange('logo', 'hidden', !itemConfig.hidden)}
            className={`p-1 rounded transition-colors ${
              itemConfig.hidden ? 'text-red-500 bg-red-50' : 'text-gray-600 hover:bg-gray-200'
            }`}
            title={itemConfig.hidden ? 'הלוגו מוסתר' : 'הסתר לוגו (ללא מחיקה)'}
          >
            {itemConfig.hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      )}

      {isAdmin && (
        <>
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label className="text-sm">גודל</Label>
              <Crown className="w-3 h-3 text-orange-500" />
            </div>
            <NumberInput
              value={itemConfig.style.size}
              onChange={(value) => onStyleChange('logo', 'size', value)}
              min={20}
              step={10}
              suffix="px"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label className="text-sm">שקיפות</Label>
              <Crown className="w-3 h-3 text-orange-500" />
            </div>
            <NumberInput
              value={itemConfig.style.opacity}
              onChange={(value) => onStyleChange('logo', 'opacity', value)}
              min={0}
              max={100}
              step={5}
              suffix="%"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <RotateCw className="w-3 h-3 text-blue-500" />
              <Label className="text-sm">סיבוב</Label>
              <Crown className="w-3 h-3 text-orange-500" />
            </div>
            <div className="flex items-center gap-2">
              <NumberInput
                value={itemConfig.rotation || 0}
                onChange={(value) => onConfigChange('logo', 'rotation', value)}
                min={-180}
                max={180}
                step={15}
                suffix="°"
                className="flex-1"
              />
              <Button
                onClick={() => onConfigChange('logo', 'rotation', 0)}
                size="sm"
                variant="outline"
                className="px-2"
                title="איפוס סיבוב"
              >
                <RotateCw className="w-3 h-3" />
              </Button>
            </div>
            {(itemConfig.rotation || 0) !== 0 && (
              <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded border">
                ⚠️ סיבוב עדיין לא יוצג ב-PDF הסופי (בפיתוח)
              </p>
            )}
          </div>
        </>
      )}
    </>
  );

  const renderTextControls = () => (
    <>
      {/* Hidden Toggle */}
      {isAdmin && (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">אלמנט מוסתר</Label>
            <Crown className="w-3 h-3 text-orange-500" />
          </div>
          <button
            onClick={() => onConfigChange('text', 'hidden', !itemConfig.hidden)}
            className={`p-1 rounded transition-colors ${
              itemConfig.hidden ? 'text-red-500 bg-red-50' : 'text-gray-600 hover:bg-gray-200'
            }`}
            title={itemConfig.hidden ? 'הטקסט מוסתר' : 'הסתר טקסט (ללא מחיקה)'}
          >
            {itemConfig.hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      )}

      {isAdmin && (
        <div className="space-y-2">
          <div className="flex items-center gap-1">
            <Label className="text-sm">תוכן הטקסט</Label>
            <Crown className="w-3 h-3 text-orange-500" />
          </div>
          <Textarea
            value={itemConfig.content}
            onChange={(e) => onConfigChange('text', 'content', e.target.value)}
            rows={3}
            className="resize-none"
            dir="rtl"
          />
        </div>
      )}

      {isAdmin && (
        <>
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label className="text-sm">גודל גופן</Label>
              <Crown className="w-3 h-3 text-orange-500" />
            </div>
            <NumberInput
              value={itemConfig.style.fontSize}
              onChange={(value) => onStyleChange('text', 'fontSize', value)}
              min={8}
              step={1}
              suffix="px"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label className="text-sm">צבע</Label>
              <Crown className="w-3 h-3 text-orange-500" />
            </div>
            <Input
              type="color"
              value={itemConfig.style.color}
              onChange={(e) => onStyleChange('text', 'color', e.target.value)}
              className="h-10 w-full"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label className="text-sm">שקיפות</Label>
              <Crown className="w-3 h-3 text-orange-500" />
            </div>
            <NumberInput
              value={itemConfig.style.opacity}
              onChange={(value) => onStyleChange('text', 'opacity', value)}
              min={0}
              max={100}
              step={5}
              suffix="%"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label className="text-sm">רוחב מיכל הטקסט</Label>
              <Crown className="w-3 h-3 text-orange-500" />
            </div>
            <NumberInput
              value={itemConfig.style.width || 300}
              onChange={(value) => onStyleChange('text', 'width', value)}
              min={100}
              step={10}
              suffix="px"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <RotateCw className="w-3 h-3 text-blue-500" />
              <Label className="text-sm">סיבוב</Label>
              <Crown className="w-3 h-3 text-orange-500" />
            </div>
            <div className="flex items-center gap-2">
              <NumberInput
                value={itemConfig.rotation || 0}
                onChange={(value) => onConfigChange('text', 'rotation', value)}
                min={-180}
                max={180}
                step={15}
                suffix="°"
                className="flex-1"
              />
              <Button
                onClick={() => onConfigChange('text', 'rotation', 0)}
                size="sm"
                variant="outline"
                className="px-2"
                title="איפוס סיבוב"
              >
                <RotateCw className="w-3 h-3" />
              </Button>
            </div>
            {(itemConfig.rotation || 0) !== 0 && (
              <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded border">
                ⚠️ סיבוב עדיין לא יוצג ב-PDF הסופי (בפיתוח)
              </p>
            )}
          </div>

          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={itemConfig.style.bold}
                onCheckedChange={(checked) => onStyleChange('text', 'bold', checked)}
              />
              <div className="flex items-center gap-1">
                <Label className="text-sm">מודגש</Label>
                <Crown className="w-3 h-3 text-orange-500" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={itemConfig.style.italic}
                onCheckedChange={(checked) => onStyleChange('text', 'italic', checked)}
              />
              <div className="flex items-center gap-1">
                <Label className="text-sm">נטוי</Label>
                <Crown className="w-3 h-3 text-orange-500" />
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );

  const renderUrlControls = () => (
    <>
      {/* Hidden Toggle */}
      {isAdmin && (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">אלמנט מוסתר</Label>
            <Crown className="w-3 h-3 text-orange-500" />
          </div>
          <button
            onClick={() => onConfigChange('url', 'hidden', !itemConfig.hidden)}
            className={`p-1 rounded transition-colors ${
              itemConfig.hidden ? 'text-red-500 bg-red-50' : 'text-gray-600 hover:bg-gray-200'
            }`}
            title={itemConfig.hidden ? 'הקישור מוסתר' : 'הסתר קישור (ללא מחיקה)'}
          >
            {itemConfig.hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      )}

      {isAdmin && (
        <>
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label className="text-sm">גודל גופן</Label>
              <Crown className="w-3 h-3 text-orange-500" />
            </div>
            <NumberInput
              value={itemConfig.style.fontSize}
              onChange={(value) => onStyleChange('url', 'fontSize', value)}
              min={8}
              step={1}
              suffix="px"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label className="text-sm">צבע</Label>
              <Crown className="w-3 h-3 text-orange-500" />
            </div>
            <Input
              type="color"
              value={itemConfig.style.color}
              onChange={(e) => onStyleChange('url', 'color', e.target.value)}
              className="h-10 w-full"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label className="text-sm">שקיפות</Label>
              <Crown className="w-3 h-3 text-orange-500" />
            </div>
            <NumberInput
              value={itemConfig.style.opacity}
              onChange={(value) => onStyleChange('url', 'opacity', value)}
              min={0}
              max={100}
              step={5}
              suffix="%"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <RotateCw className="w-3 h-3 text-blue-500" />
              <Label className="text-sm">סיבוב</Label>
              <Crown className="w-3 h-3 text-orange-500" />
            </div>
            <div className="flex items-center gap-2">
              <NumberInput
                value={itemConfig.rotation || 0}
                onChange={(value) => onConfigChange('url', 'rotation', value)}
                min={-180}
                max={180}
                step={15}
                suffix="°"
                className="flex-1"
              />
              <Button
                onClick={() => onConfigChange('url', 'rotation', 0)}
                size="sm"
                variant="outline"
                className="px-2"
                title="איפוס סיבוב"
              >
                <RotateCw className="w-3 h-3" />
              </Button>
            </div>
            {(itemConfig.rotation || 0) !== 0 && (
              <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded border">
                ⚠️ סיבוב עדיין לא יוצג ב-PDF הסופי (בפיתוח)
              </p>
            )}
          </div>

          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={itemConfig.style.bold}
                onCheckedChange={(checked) => onStyleChange('url', 'bold', checked)}
              />
              <div className="flex items-center gap-1">
                <Label className="text-sm">מודגש</Label>
                <Crown className="w-3 h-3 text-orange-500" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={itemConfig.style.italic}
                onCheckedChange={(checked) => onStyleChange('url', 'italic', checked)}
              />
              <div className="flex items-center gap-1">
                <Label className="text-sm">נטוי</Label>
                <Crown className="w-3 h-3 text-orange-500" />
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );

  const renderCustomElementControls = () => {
    if (!isCustomElement || !isAdmin) return null;

    const elementType = itemConfig.type;

    const renderBasicDimensions = () => {
      // Check if this element has width/height properties (only for box, line, dotted-line)
      if (!itemConfig.style || (!('width' in itemConfig.style) && !('height' in itemConfig.style))) {
        return null; // Don't render dimensions for elements that don't have them
      }

      return (
        <>
          <div className="space-y-2">
            <Label className="text-sm">רוחב</Label>
            <NumberInput
              value={itemConfig.style.width || 100}
              onChange={(value) => onStyleChange(selectedItem, 'width', value)}
              min={10}
              step={5}
              suffix="px"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">גובה</Label>
            <NumberInput
              value={itemConfig.style.height || 10}
              onChange={(value) => onStyleChange(selectedItem, 'height', value)}
              min={1}
              step={1}
              suffix="px"
            />
          </div>
        </>
      );
    };

    const renderColorAndOpacity = () => {
      if (!itemConfig.style) {
        return null; // Don't render if style object doesn't exist
      }

      return (
        <>
          <div className="space-y-2">
            <Label className="text-sm">צבע</Label>
            <Input
              type="color"
              value={itemConfig.style.color || itemConfig.style.borderColor || '#000000'}
              onChange={(e) => onStyleChange(selectedItem, elementType === 'box' ? 'borderColor' : 'color', e.target.value)}
              className="h-10 w-full"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">שקיפות</Label>
            <NumberInput
              value={itemConfig.style.opacity || 100}
              onChange={(value) => onStyleChange(selectedItem, 'opacity', value)}
              min={0}
              max={100}
              step={5}
              suffix="%"
            />
          </div>
        </>
      );
    };

    switch (elementType) {
      case 'box':
        return (
          <>
            {renderBasicDimensions()}
            {renderColorAndOpacity()}
            <div className="space-y-2">
              <Label className="text-sm">עובי מסגרת</Label>
              <NumberInput
                value={itemConfig.style.borderWidth}
                onChange={(value) => onStyleChange(selectedItem, 'borderWidth', value)}
                min={0}
                step={1}
                suffix="px"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">צבע רקע</Label>
              <Input
                type="color"
                value={itemConfig.style.backgroundColor === 'transparent' ? '#ffffff' : itemConfig.style.backgroundColor}
                onChange={(e) => onStyleChange(selectedItem, 'backgroundColor', e.target.value)}
                className="h-10 w-full"
              />
            </div>
          </>
        );

      case 'line':
      case 'dotted-line':
        return (
          <>
            {renderBasicDimensions()}
            {renderColorAndOpacity()}
          </>
        );

      case 'free-text':
      case 'watermark-text':
        return (
          <>
            <div className="space-y-2">
              <Label className="text-sm">תוכן הטקסט</Label>
              <Textarea
                value={itemConfig.content || ''}
                onChange={(e) => onConfigChange(selectedItem, 'content', e.target.value)}
                rows={3}
                className="resize-none"
                dir="rtl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">גודל גופן</Label>
              <NumberInput
                value={itemConfig.style?.fontSize || (elementType === 'free-text' ? 24 : 36)}
                onChange={(value) => onStyleChange(selectedItem, 'fontSize', value)}
                min={8}
                step={1}
                suffix="px"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">צבע</Label>
              <Input
                type="color"
                value={itemConfig.style?.color || (elementType === 'free-text' ? '#000000' : '#cccccc')}
                onChange={(e) => onStyleChange(selectedItem, 'color', e.target.value)}
                className="h-10 w-full"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">שקיפות</Label>
              <NumberInput
                value={itemConfig.style?.opacity || (elementType === 'free-text' ? 100 : 30)}
                onChange={(value) => onStyleChange(selectedItem, 'opacity', value)}
                min={0}
                max={100}
                step={5}
                suffix="%"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <RotateCw className="w-3 h-3 text-blue-500" />
                <Label className="text-sm">סיבוב</Label>
              </div>
              <div className="flex items-center gap-2">
                <NumberInput
                  value={itemConfig.style?.rotation || 0}
                  onChange={(value) => onStyleChange(selectedItem, 'rotation', value)}
                  min={-180}
                  max={180}
                  step={15}
                  suffix="°"
                  className="flex-1"
                />
                <Button
                  onClick={() => onStyleChange(selectedItem, 'rotation', 0)}
                  size="sm"
                  variant="outline"
                  className="px-2"
                  title="איפוס סיבוב"
                >
                  <RotateCw className="w-3 h-3" />
                </Button>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={itemConfig.style?.bold || false}
                  onCheckedChange={(checked) => onStyleChange(selectedItem, 'bold', checked)}
                />
                <Label className="text-sm">מודגש</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={itemConfig.style?.italic || false}
                  onCheckedChange={(checked) => onStyleChange(selectedItem, 'italic', checked)}
                />
                <Label className="text-sm">נטוי</Label>
              </div>
            </div>
          </>
        );

      case 'watermark-logo':
        return (
          <>
            <div className="space-y-2">
              <Label className="text-sm">URL תמונה</Label>
              <Input
                type="text"
                value={itemConfig.url || ''}
                onChange={(e) => onConfigChange(selectedItem, 'url', e.target.value)}
                placeholder="https://example.com/logo.png"
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">גודל</Label>
              <NumberInput
                value={itemConfig.style?.size || 80}
                onChange={(value) => onStyleChange(selectedItem, 'size', value)}
                min={20}
                step={10}
                suffix="px"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">שקיפות</Label>
              <NumberInput
                value={itemConfig.style?.opacity || 100}
                onChange={(value) => onStyleChange(selectedItem, 'opacity', value)}
                min={0}
                max={100}
                step={5}
                suffix="%"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <RotateCw className="w-3 h-3 text-blue-500" />
                <Label className="text-sm">סיבוב</Label>
              </div>
              <div className="flex items-center gap-2">
                <NumberInput
                  value={itemConfig.style?.rotation || 0}
                  onChange={(value) => onStyleChange(selectedItem, 'rotation', value)}
                  min={-180}
                  max={180}
                  step={15}
                  suffix="°"
                  className="flex-1"
                />
                <Button
                  onClick={() => onStyleChange(selectedItem, 'rotation', 0)}
                  size="sm"
                  variant="outline"
                  className="px-2"
                  title="איפוס סיבוב"
                >
                  <RotateCw className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </>
        );

      default:
        return renderBasicDimensions();
    }
  };

  return (
    <div
      ref={menuRef}
      className={`fixed z-50 w-80 rounded-lg shadow-2xl border-2 ${getItemColor()} ${
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-gray-50 to-slate-50 rounded-t-lg">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-lg text-gray-800">{getItemDisplayName()}</h3>
          {isAdmin && <Crown className="w-4 h-4 text-amber-500" />}
        </div>
        <div className="flex items-center gap-2">
          {isCustomElement && itemConfig.deletable && (
            <Button
              onClick={() => onDeleteElement?.(selectedItem)}
              variant="outline"
              size="sm"
              className="p-1 h-8 w-8 text-red-600 hover:bg-red-50"
              title="מחק אלמנט"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="menu-content p-4 space-y-4 max-h-96 overflow-y-auto">
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800 font-medium">
            🖱️ גרור את האלמנט בתצוגה המקדימה כדי לשנות את מיקומו
          </p>
        </div>

        {!isCustomElement && selectedItem === 'logo' && renderLogoControls()}
        {!isCustomElement && selectedItem === 'text' && renderTextControls()}
        {!isCustomElement && selectedItem === 'url' && renderUrlControls()}

        {isCustomElement && renderCustomElementControls()}

        {/* Info for content creators */}
        {!isAdmin && (
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-300 rounded-lg shadow-sm">
            <p className="text-sm text-blue-900 font-medium">
              💡 כיוצר תוכן, תוכל לשנות רק את מיקום האלמנטים. עיצוב וטקסט ניתנים לעריכה על ידי מנהלים בלבד.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FloatingSettingsMenu;
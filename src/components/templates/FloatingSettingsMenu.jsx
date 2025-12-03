import React, { useState, useRef } from 'react';
import { X, Crown, Trash2, Copy, RotateCw, EyeOff, Eye, Type, Palette, Move, Sparkles, FileText, Lock, Unlock } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { NumberInput } from '@/components/ui/number-input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const FloatingSettingsMenu = ({
  selectedItem,
  templateConfig,
  onConfigChange,
  onStyleChange,
  userRole,
  onClose,
  onDeleteElement,
  onDuplicateElement,
  onLockToggle
}) => {
  // ALL hooks must be called before any conditional returns
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const menuRef = useRef(null);

  // Define event handlers before useEffect
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

  // ALL useEffect hooks must be called before conditional returns
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

  // Helper function to find element in both unified and legacy structures
  const findElement = (elementKey) => {
    if (!templateConfig || !elementKey) return null;

    const hasUnifiedStructure = templateConfig?.elements;

    if (hasUnifiedStructure) {
      // NEW UNIFIED STRUCTURE: search in element arrays
      for (const [elementType, elementArray] of Object.entries(templateConfig.elements)) {
        if (Array.isArray(elementArray)) {
          for (let index = 0; index < elementArray.length; index++) {
            const element = elementArray[index];
            const currentElementKey = element.id || `${elementType}_${index}`;
            if (currentElementKey === elementKey) {
              return { element, elementType, index, isCustom: true };
            }
          }
        }
      }
    } else {
      // LEGACY STRUCTURE: search in customElements and direct properties
      if (templateConfig.customElements?.[elementKey]) {
        return { element: templateConfig.customElements[elementKey], isCustom: true };
      } else if (templateConfig[elementKey]) {
        return { element: templateConfig[elementKey], isCustom: false };
      }
    }

    return null;
  };

  // Early return AFTER all hooks
  const elementInfo = findElement(selectedItem);
  if (!selectedItem || !elementInfo) return null;

  const itemConfig = elementInfo.element;
  const isAdmin = userRole === 'admin' || userRole === 'sysadmin';
  const isCustomElement = elementInfo.isCustom;

  // Determine element capabilities
  const elementCapabilities = {
    hasContent: ['text', 'copyright-text', 'url', 'user-info', 'free-text', 'watermark-text'].includes(selectedItem) ||
                (isCustomElement && ['free-text', 'watermark-text', 'user-info'].includes(itemConfig.type)),
    hasTextStyling: ['text', 'copyright-text', 'url', 'user-info', 'free-text', 'watermark-text'].includes(selectedItem) ||
                    (isCustomElement && ['free-text', 'watermark-text', 'user-info'].includes(itemConfig.type)),
    hasDimensions: ['logo'].includes(selectedItem) ||
                   (isCustomElement && ['box', 'circle', 'line', 'dotted-line', 'logo', 'watermark-logo'].includes(itemConfig.type)),
    hasSize: ['logo'].includes(selectedItem) ||
             (isCustomElement && ['logo', 'watermark-logo'].includes(itemConfig.type)),
    hasRotation: true, // All elements can rotate
    hasOpacity: true, // All elements can have opacity
    hasPosition: true, // All elements have position (handled via drag)
    hasShadow: true, // All elements can have shadow effects
    isTextual: ['text', 'copyright-text', 'url', 'user-info', 'free-text', 'watermark-text'].includes(selectedItem) ||
               (isCustomElement && ['free-text', 'watermark-text', 'user-info'].includes(itemConfig.type))
  };

  const getItemDisplayName = () => {
    if (isCustomElement) {
      const elementType = itemConfig.type;
      switch (elementType) {
        case 'box': return 'תיבה';
        case 'circle': return 'עיגול';
        case 'line': return 'קו';
        case 'dotted-line': return 'קו מנוקד';
        case 'watermark-text': return 'טקסט סימן מים';
        case 'watermark-logo': return 'לוגו סימן מים';
        case 'free-text': return 'טקסט חופשי';
        case 'user-info': return 'פרטי משתמש';
        case 'logo': return 'לוגו מותאם';
        default: return elementType;
      }
    }

    switch (selectedItem) {
      case 'logo': return 'לוגו';
      case 'text': return 'טקסט זכויות יוצרים';
      case 'copyright-text': return 'זכויות יוצרים';
      case 'url': return 'קישור לאתר';
      case 'user-info': return 'פרטי משתמש';
      default: return selectedItem;
    }
  };

  const getItemColor = () => {
    if (isCustomElement) {
      const elementType = itemConfig.type;
      switch (elementType) {
        case 'box': return 'bg-green-50 border-green-200';
        case 'circle': return 'bg-pink-50 border-pink-200';
        case 'line': return 'bg-yellow-50 border-yellow-200';
        case 'dotted-line': return 'bg-orange-50 border-orange-200';
        case 'watermark-text': return 'bg-red-50 border-red-200';
        case 'watermark-logo': return 'bg-pink-50 border-pink-200';
        case 'free-text': return 'bg-blue-50 border-blue-200';
        case 'user-info': return 'bg-violet-50 border-violet-200';
        default: return 'bg-gray-50 border-gray-200';
      }
    }

    switch (selectedItem) {
      case 'logo': return 'bg-purple-50 border-purple-200';
      case 'text': return 'bg-blue-50 border-blue-200';
      case 'copyright-text': return 'bg-gray-50 border-gray-200';
      case 'url': return 'bg-cyan-50 border-cyan-200';
      case 'user-info': return 'bg-violet-50 border-violet-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  // Unified render functions for each tab
  const renderContentTab = () => {
    if (!elementCapabilities.hasContent || !isAdmin) return null;

    const contentLabel = elementCapabilities.isTextual ? 'תוכן הטקסט' : 'תוכן';

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-1">
            <Label className="text-sm">{contentLabel}</Label>
            <Crown className="w-3 h-3 text-orange-500" />
          </div>
          <Textarea
            value={itemConfig.content || ''}
            onChange={(e) => {
              const elementKey = isCustomElement ? selectedItem : selectedItem;
              onConfigChange(elementKey, 'content', e.target.value);
            }}
            rows={3}
            className="resize-none"
            dir="rtl"
          />
        </div>

        {/* Element-specific content controls */}
        {selectedItem === 'url' && (
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label className="text-sm">כתובת הקישור</Label>
              <Crown className="w-3 h-3 text-orange-500" />
            </div>
            <Input
              value={itemConfig.href || itemConfig.content || ''}
              onChange={(e) => onConfigChange('url', 'href', e.target.value)}
              dir="ltr"
              placeholder="https://example.com"
            />
          </div>
        )}
      </div>
    );
  };

  const renderStylingTab = () => {
    if (!isAdmin) return null;

    return (
      <div className="space-y-4">
        {/* Text styling for textual elements */}
        {elementCapabilities.hasTextStyling && (
          <>
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <Label className="text-sm">גודל גופן</Label>
                <Crown className="w-3 h-3 text-orange-500" />
              </div>
              <NumberInput
                value={itemConfig.style?.fontSize || 12}
                onChange={(value) => {
                  const elementKey = isCustomElement ? selectedItem : selectedItem;
                  onStyleChange(elementKey, 'fontSize', value);
                }}
                min={8}
                step={1}
                suffix="px"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <Label className="text-sm">צבע הטקסט</Label>
                <Crown className="w-3 h-3 text-orange-500" />
              </div>
              <Input
                type="color"
                value={itemConfig.style?.color || '#000000'}
                onChange={(e) => {
                  const elementKey = isCustomElement ? selectedItem : selectedItem;
                  onStyleChange(elementKey, 'color', e.target.value);
                }}
                className="h-10 w-full"
              />
            </div>

            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={itemConfig.style?.bold || false}
                  onCheckedChange={(checked) => {
                    const elementKey = isCustomElement ? selectedItem : selectedItem;
                    onStyleChange(elementKey, 'bold', checked);
                  }}
                />
                <div className="flex items-center gap-1">
                  <Label className="text-sm">מודגש</Label>
                  <Crown className="w-3 h-3 text-orange-500" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={itemConfig.style?.italic || false}
                  onCheckedChange={(checked) => {
                    const elementKey = isCustomElement ? selectedItem : selectedItem;
                    onStyleChange(elementKey, 'italic', checked);
                  }}
                />
                <div className="flex items-center gap-1">
                  <Label className="text-sm">נטוי</Label>
                  <Crown className="w-3 h-3 text-orange-500" />
                </div>
              </div>
            </div>

            {elementCapabilities.hasTextStyling && (
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Label className="text-sm">רוחב מיכל הטקסט</Label>
                  <Crown className="w-3 h-3 text-orange-500" />
                </div>
                <NumberInput
                  value={itemConfig.style?.width || 300}
                  onChange={(value) => {
                    const elementKey = isCustomElement ? selectedItem : selectedItem;
                    onStyleChange(elementKey, 'width', value);
                  }}
                  min={100}
                  step={10}
                  suffix="px"
                />
              </div>
            )}
          </>
        )}

        {/* Size controls for elements with size */}
        {elementCapabilities.hasSize && (
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label className="text-sm">גודל</Label>
              <Crown className="w-3 h-3 text-orange-500" />
            </div>
            <NumberInput
              value={itemConfig.style?.size || 80}
              onChange={(value) => {
                const elementKey = isCustomElement ? selectedItem : selectedItem;
                onStyleChange(elementKey, 'size', value);
              }}
              min={20}
              step={10}
              suffix="px"
            />
          </div>
        )}

        {/* Dimensions for shapes */}
        {elementCapabilities.hasDimensions && !elementCapabilities.hasSize && (
          <>
            <div className="space-y-2">
              <Label className="text-sm">רוחב</Label>
              <NumberInput
                value={itemConfig.style?.width || 100}
                onChange={(value) => {
                  onStyleChange(selectedItem, 'width', value);
                }}
                min={10}
                step={5}
                suffix="px"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">גובה</Label>
              <NumberInput
                value={itemConfig.style?.height || 10}
                onChange={(value) => {
                  onStyleChange(selectedItem, 'height', value);
                }}
                min={1}
                step={1}
                suffix="px"
              />
            </div>

            {/* Color for shapes */}
            <div className="space-y-2">
              <Label className="text-sm">צבע</Label>
              <Input
                type="color"
                value={itemConfig.style?.color || itemConfig.style?.borderColor || '#000000'}
                onChange={(e) => {
                  const colorProperty = ['box', 'circle'].includes(itemConfig.type) ? 'borderColor' : 'color';
                  onStyleChange(selectedItem, colorProperty, e.target.value);
                }}
                className="h-10 w-full"
              />
            </div>

            {/* Additional box and circle controls */}
            {['box', 'circle'].includes(itemConfig.type) && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm">עובי מסגרת</Label>
                  <NumberInput
                    value={itemConfig.style?.borderWidth || 1}
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
                    value={itemConfig.style?.backgroundColor === 'transparent' ? '#ffffff' : itemConfig.style?.backgroundColor || '#ffffff'}
                    onChange={(e) => onStyleChange(selectedItem, 'backgroundColor', e.target.value)}
                    className="h-10 w-full"
                  />
                </div>
              </>
            )}
          </>
        )}
      </div>
    );
  };

  const renderTransformTab = () => {
    if (!isAdmin) return null;

    return (
      <div className="space-y-4">
        {/* Position hint */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800 font-medium">
            🖱️ גרור את האלמנט בתצוגה המקדימה כדי לשנות את מיקומו
          </p>
        </div>

        {/* Rotation for all elements */}
        {elementCapabilities.hasRotation && (
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <RotateCw className="w-3 h-3 text-blue-500" />
              <Label className="text-sm">סיבוב</Label>
              <Crown className="w-3 h-3 text-orange-500" />
            </div>
            <div className="flex items-center gap-2">
              <NumberInput
                value={
                  isCustomElement
                    ? (itemConfig.style?.rotation || 0)
                    : (itemConfig.rotation || 0)
                }
                onChange={(value) => {
                  const elementKey = isCustomElement ? selectedItem : selectedItem;
                  if (isCustomElement) {
                    onStyleChange(elementKey, 'rotation', value);
                  } else {
                    onConfigChange(elementKey, 'rotation', value);
                  }
                }}
                min={-180}
                max={180}
                step={15}
                suffix="°"
                className="flex-1"
              />
              <Button
                onClick={() => {
                  const elementKey = isCustomElement ? selectedItem : selectedItem;
                  if (isCustomElement) {
                    onStyleChange(elementKey, 'rotation', 0);
                  } else {
                    onConfigChange(elementKey, 'rotation', 0);
                  }
                }}
                size="sm"
                variant="outline"
                className="px-2"
                title="איפוס סיבוב"
              >
                <RotateCw className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderEffectsTab = () => {
    if (!isAdmin) return null;

    return (
      <div className="space-y-4">
        {/* Opacity for all elements */}
        {elementCapabilities.hasOpacity && (
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label className="text-sm">שקיפות</Label>
              <Crown className="w-3 h-3 text-orange-500" />
            </div>
            <NumberInput
              value={itemConfig.style?.opacity || 100}
              onChange={(value) => {
                const elementKey = isCustomElement ? selectedItem : selectedItem;
                onStyleChange(elementKey, 'opacity', value);
              }}
              min={0}
              max={100}
              step={5}
              suffix="%"
            />
          </div>
        )}

        {/* Shadow settings for all elements */}
        {elementCapabilities.hasShadow && (
          <>
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-purple-500" />
                <Label className="text-sm">הצללה</Label>
                <Crown className="w-3 h-3 text-orange-500" />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={itemConfig.style?.shadow?.enabled || false}
                  onCheckedChange={(checked) => {
                    const elementKey = isCustomElement ? selectedItem : selectedItem;
                    const currentShadow = itemConfig.style?.shadow || {};
                    const newShadow = {
                      ...currentShadow,
                      enabled: checked,
                      color: currentShadow.color || '#000000',
                      offsetX: currentShadow.offsetX || 2,
                      offsetY: currentShadow.offsetY || 2,
                      blur: currentShadow.blur || 4,
                      opacity: currentShadow.opacity || 50
                    };
                    onStyleChange(elementKey, 'shadow', newShadow);
                  }}
                />
                <Label className="text-sm">הפעל הצללה</Label>
              </div>
            </div>

            {itemConfig.style?.shadow?.enabled && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm">צבע הצללה</Label>
                  <Input
                    type="color"
                    value={itemConfig.style?.shadow?.color || '#000000'}
                    onChange={(e) => {
                      const elementKey = isCustomElement ? selectedItem : selectedItem;
                      const currentShadow = itemConfig.style?.shadow || {};
                      const newShadow = { ...currentShadow, color: e.target.value };
                      onStyleChange(elementKey, 'shadow', newShadow);
                    }}
                    className="h-10 w-full"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm">הסטה X</Label>
                    <NumberInput
                      value={itemConfig.style?.shadow?.offsetX || 2}
                      onChange={(value) => {
                        const elementKey = isCustomElement ? selectedItem : selectedItem;
                        const currentShadow = itemConfig.style?.shadow || {};
                        const newShadow = { ...currentShadow, offsetX: value };
                        onStyleChange(elementKey, 'shadow', newShadow);
                      }}
                      min={-20}
                      max={20}
                      step={1}
                      suffix="px"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">הסטה Y</Label>
                    <NumberInput
                      value={itemConfig.style?.shadow?.offsetY || 2}
                      onChange={(value) => {
                        const elementKey = isCustomElement ? selectedItem : selectedItem;
                        const currentShadow = itemConfig.style?.shadow || {};
                        const newShadow = { ...currentShadow, offsetY: value };
                        onStyleChange(elementKey, 'shadow', newShadow);
                      }}
                      min={-20}
                      max={20}
                      step={1}
                      suffix="px"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">טשטוש</Label>
                  <NumberInput
                    value={itemConfig.style?.shadow?.blur || 4}
                    onChange={(value) => {
                      const elementKey = isCustomElement ? selectedItem : selectedItem;
                      const currentShadow = itemConfig.style?.shadow || {};
                      const newShadow = { ...currentShadow, blur: value };
                      onStyleChange(elementKey, 'shadow', newShadow);
                    }}
                    min={0}
                    max={20}
                    step={1}
                    suffix="px"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">עוצמת הצללה</Label>
                  <NumberInput
                    value={itemConfig.style?.shadow?.opacity || 50}
                    onChange={(value) => {
                      const elementKey = isCustomElement ? selectedItem : selectedItem;
                      const currentShadow = itemConfig.style?.shadow || {};
                      const newShadow = { ...currentShadow, opacity: value };
                      onStyleChange(elementKey, 'shadow', newShadow);
                    }}
                    min={0}
                    max={100}
                    step={5}
                    suffix="%"
                  />
                </div>
              </>
            )}
          </>
        )}

        {/* Hidden toggle */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">אלמנט מוסתר</Label>
            <Crown className="w-3 h-3 text-orange-500" />
          </div>
          <button
            onClick={() => {
              const elementKey = isCustomElement ? selectedItem : selectedItem;
              onConfigChange(elementKey, 'hidden', !itemConfig.hidden);
            }}
            className={`p-1 rounded transition-colors ${
              itemConfig.hidden ? 'text-red-500 bg-red-50' : 'text-gray-600 hover:bg-gray-200'
            }`}
            title={itemConfig.hidden ? 'האלמנט מוסתר' : 'הסתר אלמנט (ללא מחיקה)'}
          >
            {itemConfig.hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
    );
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
          {/* Lock toggle button - always available for any element */}
          <Button
            onClick={() => onLockToggle?.(selectedItem)}
            variant="outline"
            size="sm"
            className={`p-1 h-8 w-8 ${
              itemConfig.locked
                ? 'text-red-600 hover:bg-red-50 bg-red-50'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
            title={itemConfig.locked ? "בטל נעילה" : "נעל אלמנט"}
          >
            {itemConfig.locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
          </Button>
          {/* Duplicate button - always available for any element */}
          <Button
            onClick={() => onDuplicateElement?.(selectedItem)}
            variant="outline"
            size="sm"
            className="p-1 h-8 w-8 text-blue-600 hover:bg-blue-50"
            title="שכפל אלמנט"
          >
            <Copy className="w-4 h-4" />
          </Button>
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

      {/* Content with Tabbed Interface */}
      <div className="menu-content max-h-96 overflow-y-auto">
        {isAdmin ? (
          <Tabs defaultValue="content" className="w-full">
            <TabsList className="grid w-full grid-cols-4 m-2">
              <TabsTrigger value="content" className="text-xs flex items-center gap-1">
                <FileText className="w-3 h-3" />
                תוכן
              </TabsTrigger>
              <TabsTrigger value="styling" className="text-xs flex items-center gap-1">
                <Palette className="w-3 h-3" />
                עיצוב
              </TabsTrigger>
              <TabsTrigger value="transform" className="text-xs flex items-center gap-1">
                <Move className="w-3 h-3" />
                מיקום
              </TabsTrigger>
              <TabsTrigger value="effects" className="text-xs flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                אפקטים
              </TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="p-4 space-y-4 mt-0">
              {renderContentTab()}
              {!elementCapabilities.hasContent && (
                <div className="text-center py-4 text-gray-500 text-sm">
                  אין תוכן לעריכה עבור אלמנט זה
                </div>
              )}
            </TabsContent>

            <TabsContent value="styling" className="p-4 space-y-4 mt-0">
              {renderStylingTab()}
              {!elementCapabilities.hasTextStyling && !elementCapabilities.hasSize && !elementCapabilities.hasDimensions && (
                <div className="text-center py-4 text-gray-500 text-sm">
                  אין אפשרויות עיצוב זמינות עבור אלמנט זה
                </div>
              )}
            </TabsContent>

            <TabsContent value="transform" className="p-4 space-y-4 mt-0">
              {renderTransformTab()}
            </TabsContent>

            <TabsContent value="effects" className="p-4 space-y-4 mt-0">
              {renderEffectsTab()}
            </TabsContent>
          </Tabs>
        ) : (
          <div className="p-4">
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-300 rounded-lg shadow-sm">
              <p className="text-sm text-blue-900 font-medium">
                💡 כיוצר תוכן, תוכל לשנות רק את מיקום האלמנטים. עיצוב וטקסט ניתנים לעריכה על ידי מנהלים בלבד.
              </p>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mt-4">
              <p className="text-sm text-blue-800 font-medium">
                🖱️ גרור את האלמנט בתצוגה המקדימה כדי לשנות את מיקומו
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FloatingSettingsMenu;
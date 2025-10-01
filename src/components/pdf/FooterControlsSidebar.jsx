import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

const FooterControlsSidebar = ({
  footerConfig,
  onConfigChange,
  userRole
}) => {
  const isAdmin = userRole === 'admin' || userRole === 'sysadmin';
  const isContentCreator = !isAdmin;

  const updateConfig = (section, field, value) => {
    onConfigChange({
      ...footerConfig,
      [section]: {
        ...footerConfig[section],
        [field]: value
      }
    });
  };

  const updateStyle = (section, styleField, value) => {
    onConfigChange({
      ...footerConfig,
      [section]: {
        ...footerConfig[section],
        style: {
          ...footerConfig[section].style,
          [styleField]: value
        }
      }
    });
  };

  const updatePosition = (section, axis, value) => {
    onConfigChange({
      ...footerConfig,
      [section]: {
        ...footerConfig[section],
        position: {
          ...footerConfig[section].position,
          [axis]: value
        }
      }
    });
  };

  return (
    <div className="h-full flex flex-col bg-white border-l" style={{ width: '350px' }}>
      {/* Header */}
      <div className="p-4 border-b bg-gray-50">
        <h3 className="font-semibold text-lg">הגדרות כותרת תחתונה</h3>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Logo Controls */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">לוגו</Label>
            <Switch
              checked={footerConfig.logo.visible}
              onCheckedChange={(checked) => updateConfig('logo', 'visible', checked)}
            />
          </div>

          {footerConfig.logo.visible && (
            <>
              {/* Logo Position */}
              <div className="space-y-2">
                <Label className="text-sm">מיקום אופקי (X)</Label>
                <div className="flex items-center gap-2">
                  <Slider
                    value={[footerConfig.logo.position.x]}
                    onValueChange={([value]) => updatePosition('logo', 'x', value)}
                    min={0}
                    max={100}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-sm w-12 text-left">{footerConfig.logo.position.x}%</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">מיקום אנכי (Y)</Label>
                <div className="flex items-center gap-2">
                  <Slider
                    value={[footerConfig.logo.position.y]}
                    onValueChange={([value]) => updatePosition('logo', 'y', value)}
                    min={0}
                    max={100}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-sm w-12 text-left">{footerConfig.logo.position.y}%</span>
                </div>
              </div>

              {/* Logo Style - Admin Only */}
              {isAdmin && (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm">גודל</Label>
                    <div className="flex items-center gap-2">
                      <Slider
                        value={[footerConfig.logo.style.size]}
                        onValueChange={([value]) => updateStyle('logo', 'size', value)}
                        min={20}
                        max={200}
                        step={10}
                        className="flex-1"
                      />
                      <span className="text-sm w-12 text-left">{footerConfig.logo.style.size}px</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">שקיפות</Label>
                    <div className="flex items-center gap-2">
                      <Slider
                        value={[footerConfig.logo.style.opacity]}
                        onValueChange={([value]) => updateStyle('logo', 'opacity', value)}
                        min={0}
                        max={100}
                        step={5}
                        className="flex-1"
                      />
                      <span className="text-sm w-12 text-left">{footerConfig.logo.style.opacity}%</span>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <div className="border-t pt-4"></div>

        {/* Copyright Text Controls */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">טקסט זכויות יוצרים</Label>
            <Switch
              checked={footerConfig.text.visible}
              onCheckedChange={(checked) => updateConfig('text', 'visible', checked)}
            />
          </div>

          {footerConfig.text.visible && (
            <>
              {/* Text Content - Admin Only */}
              {isAdmin && (
                <div className="space-y-2">
                  <Label className="text-sm">תוכן הטקסט</Label>
                  <Textarea
                    value={footerConfig.text.content}
                    onChange={(e) => updateConfig('text', 'content', e.target.value)}
                    rows={3}
                    className="resize-none"
                    dir="rtl"
                  />
                </div>
              )}

              {/* Text Position */}
              <div className="space-y-2">
                <Label className="text-sm">מיקום אופקי (X)</Label>
                <div className="flex items-center gap-2">
                  <Slider
                    value={[footerConfig.text.position.x]}
                    onValueChange={([value]) => updatePosition('text', 'x', value)}
                    min={0}
                    max={100}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-sm w-12 text-left">{footerConfig.text.position.x}%</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">מיקום אנכי (Y)</Label>
                <div className="flex items-center gap-2">
                  <Slider
                    value={[footerConfig.text.position.y]}
                    onValueChange={([value]) => updatePosition('text', 'y', value)}
                    min={0}
                    max={100}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-sm w-12 text-left">{footerConfig.text.position.y}%</span>
                </div>
              </div>

              {/* Text Style - Admin Only */}
              {isAdmin && (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm">גודל גופן</Label>
                    <div className="flex items-center gap-2">
                      <Slider
                        value={[footerConfig.text.style.fontSize]}
                        onValueChange={([value]) => updateStyle('text', 'fontSize', value)}
                        min={8}
                        max={32}
                        step={1}
                        className="flex-1"
                      />
                      <span className="text-sm w-12 text-left">{footerConfig.text.style.fontSize}px</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">צבע</Label>
                    <Input
                      type="color"
                      value={footerConfig.text.style.color}
                      onChange={(e) => updateStyle('text', 'color', e.target.value)}
                      className="h-10 w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">שקיפות</Label>
                    <div className="flex items-center gap-2">
                      <Slider
                        value={[footerConfig.text.style.opacity]}
                        onValueChange={([value]) => updateStyle('text', 'opacity', value)}
                        min={0}
                        max={100}
                        step={5}
                        className="flex-1"
                      />
                      <span className="text-sm w-12 text-left">{footerConfig.text.style.opacity}%</span>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={footerConfig.text.style.bold}
                        onCheckedChange={(checked) => updateStyle('text', 'bold', checked)}
                      />
                      <Label className="text-sm">מודגש</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={footerConfig.text.style.italic}
                        onCheckedChange={(checked) => updateStyle('text', 'italic', checked)}
                      />
                      <Label className="text-sm">נטוי</Label>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <div className="border-t pt-4"></div>

        {/* URL Link Controls */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">קישור URL</Label>
            <Switch
              checked={footerConfig.url.visible}
              onCheckedChange={(checked) => updateConfig('url', 'visible', checked)}
            />
          </div>

          {footerConfig.url.visible && (
            <>
              {/* URL Position */}
              <div className="space-y-2">
                <Label className="text-sm">מיקום אופקי (X)</Label>
                <div className="flex items-center gap-2">
                  <Slider
                    value={[footerConfig.url.position.x]}
                    onValueChange={([value]) => updatePosition('url', 'x', value)}
                    min={0}
                    max={100}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-sm w-12 text-left">{footerConfig.url.position.x}%</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">מיקום אנכי (Y)</Label>
                <div className="flex items-center gap-2">
                  <Slider
                    value={[footerConfig.url.position.y]}
                    onValueChange={([value]) => updatePosition('url', 'y', value)}
                    min={0}
                    max={100}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-sm w-12 text-left">{footerConfig.url.position.y}%</span>
                </div>
              </div>

              {/* URL Style - Admin Only */}
              {isAdmin && (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm">גודל גופן</Label>
                    <div className="flex items-center gap-2">
                      <Slider
                        value={[footerConfig.url.style.fontSize]}
                        onValueChange={([value]) => updateStyle('url', 'fontSize', value)}
                        min={8}
                        max={32}
                        step={1}
                        className="flex-1"
                      />
                      <span className="text-sm w-12 text-left">{footerConfig.url.style.fontSize}px</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">צבע</Label>
                    <Input
                      type="color"
                      value={footerConfig.url.style.color}
                      onChange={(e) => updateStyle('url', 'color', e.target.value)}
                      className="h-10 w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">שקיפות</Label>
                    <div className="flex items-center gap-2">
                      <Slider
                        value={[footerConfig.url.style.opacity]}
                        onValueChange={([value]) => updateStyle('url', 'opacity', value)}
                        min={0}
                        max={100}
                        step={5}
                        className="flex-1"
                      />
                      <span className="text-sm w-12 text-left">{footerConfig.url.style.opacity}%</span>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={footerConfig.url.style.bold}
                        onCheckedChange={(checked) => updateStyle('url', 'bold', checked)}
                      />
                      <Label className="text-sm">מודגש</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={footerConfig.url.style.italic}
                        onCheckedChange={(checked) => updateStyle('url', 'italic', checked)}
                      />
                      <Label className="text-sm">נטוי</Label>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Info message for content creators */}
        {isContentCreator && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              כיוצר תוכן, אתה יכול לשנות רק את מיקום האלמנטים. עיצוב וטקסט ניתנים לעריכה על ידי מנהלים בלבד.
            </p>
          </div>
        )}
      </div>

      {/* Footer with note */}
      <div className="p-4 border-t bg-gray-50">
        <p className="text-xs text-gray-600 text-center">
          השינויים מוצגים בתצוגה מקדימה בלבד ולא נשמרים
        </p>
      </div>
    </div>
  );
};

export default FooterControlsSidebar;

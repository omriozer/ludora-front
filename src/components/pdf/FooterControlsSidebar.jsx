import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { NumberInput } from '@/components/ui/number-input';
import { Crown } from 'lucide-react';

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
    <div className="h-full flex flex-col bg-white">
      {/* Modern Header */}
      <div className="p-5 border-b bg-gradient-to-r from-gray-50 to-slate-50">
        <h3 className="font-bold text-lg text-gray-800">הגדרות</h3>
        <p className="text-xs text-gray-600 mt-1">התאם את הכותרת התחתונה</p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Logo Controls */}
        <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label className="text-base font-bold text-gray-800">לוגו</Label>
              {isAdmin && <Crown className="w-4 h-4 text-amber-500" />}
            </div>
            {isAdmin && (
              <Switch
                checked={footerConfig.logo.visible}
                onCheckedChange={(checked) => updateConfig('logo', 'visible', checked)}
              />
            )}
          </div>

          {footerConfig.logo.visible && (
            <>
              {/* Drag and Drop Info */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800 font-medium">
                  🖱️ גרור את הלוגו בתצוגה המקדימה כדי לשנות את מיקומו
                </p>
              </div>

              {/* Logo Style - Admin Only */}
              {isAdmin && (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center gap-1">
                      <Label className="text-sm">גודל</Label>
                      <Crown className="w-3 h-3 text-orange-500" />
                    </div>
                    <NumberInput
                      value={footerConfig.logo.style.size}
                      onChange={(value) => updateStyle('logo', 'size', value)}
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
                      value={footerConfig.logo.style.opacity}
                      onChange={(value) => updateStyle('logo', 'opacity', value)}
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
        </div>

        {/* Copyright Text Controls */}
        <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label className="text-base font-bold text-gray-800">טקסט זכויות יוצרים</Label>
              {isAdmin && <Crown className="w-4 h-4 text-amber-500" />}
            </div>
            {isAdmin && (
              <Switch
                checked={footerConfig.text.visible}
                onCheckedChange={(checked) => updateConfig('text', 'visible', checked)}
              />
            )}
          </div>

          {footerConfig.text.visible && (
            <>
              {/* Text Content - Admin Only */}
              {isAdmin && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1">
                    <Label className="text-sm">תוכן הטקסט</Label>
                    <Crown className="w-3 h-3 text-orange-500" />
                  </div>
                  <Textarea
                    value={footerConfig.text.content}
                    onChange={(e) => {
                      console.log('📝 Textarea onChange:', e.target.value);
                      updateConfig('text', 'content', e.target.value);
                    }}
                    rows={3}
                    className="resize-none"
                    dir="rtl"
                  />
                </div>
              )}

              {/* Drag and Drop Info */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800 font-medium">
                  🖱️ גרור את הטקסט בתצוגה המקדימה כדי לשנות את מיקומו
                </p>
              </div>

              {/* Text Style - Admin Only */}
              {isAdmin && (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center gap-1">
                      <Label className="text-sm">גודל גופן</Label>
                      <Crown className="w-3 h-3 text-orange-500" />
                    </div>
                    <NumberInput
                      value={footerConfig.text.style.fontSize}
                      onChange={(value) => updateStyle('text', 'fontSize', value)}
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
                      value={footerConfig.text.style.color}
                      onChange={(e) => updateStyle('text', 'color', e.target.value)}
                      className="h-10 w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-1">
                      <Label className="text-sm">שקיפות</Label>
                      <Crown className="w-3 h-3 text-orange-500" />
                    </div>
                    <NumberInput
                      value={footerConfig.text.style.opacity}
                      onChange={(value) => updateStyle('text', 'opacity', value)}
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
                      value={footerConfig.text.style.width || 300}
                      onChange={(value) => updateStyle('text', 'width', value)}
                      min={100}
                      step={10}
                      suffix="px"
                    />
                  </div>

                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={footerConfig.text.style.bold}
                        onCheckedChange={(checked) => updateStyle('text', 'bold', checked)}
                      />
                      <div className="flex items-center gap-1">
                        <Label className="text-sm">מודגש</Label>
                        <Crown className="w-3 h-3 text-orange-500" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={footerConfig.text.style.italic}
                        onCheckedChange={(checked) => updateStyle('text', 'italic', checked)}
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
          )}
        </div>

        {/* URL Link Controls */}
        <div className="space-y-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label className="text-base font-bold text-gray-800">קישור URL</Label>
              {isAdmin && <Crown className="w-4 h-4 text-amber-500" />}
            </div>
            {isAdmin && (
              <Switch
                checked={footerConfig.url.visible}
                onCheckedChange={(checked) => updateConfig('url', 'visible', checked)}
              />
            )}
          </div>

          {footerConfig.url.visible && (
            <>
              {/* Drag and Drop Info */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800 font-medium">
                  🖱️ גרור את הקישור בתצוגה המקדימה כדי לשנות את מיקומו
                </p>
              </div>

              {/* URL Style - Admin Only */}
              {isAdmin && (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center gap-1">
                      <Label className="text-sm">גודל גופן</Label>
                      <Crown className="w-3 h-3 text-orange-500" />
                    </div>
                    <NumberInput
                      value={footerConfig.url.style.fontSize}
                      onChange={(value) => updateStyle('url', 'fontSize', value)}
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
                      value={footerConfig.url.style.color}
                      onChange={(e) => updateStyle('url', 'color', e.target.value)}
                      className="h-10 w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-1">
                      <Label className="text-sm">שקיפות</Label>
                      <Crown className="w-3 h-3 text-orange-500" />
                    </div>
                    <NumberInput
                      value={footerConfig.url.style.opacity}
                      onChange={(value) => updateStyle('url', 'opacity', value)}
                      min={0}
                      max={100}
                      step={5}
                      suffix="%"
                    />
                  </div>

                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={footerConfig.url.style.bold}
                        onCheckedChange={(checked) => updateStyle('url', 'bold', checked)}
                      />
                      <div className="flex items-center gap-1">
                        <Label className="text-sm">מודגש</Label>
                        <Crown className="w-3 h-3 text-orange-500" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={footerConfig.url.style.italic}
                        onCheckedChange={(checked) => updateStyle('url', 'italic', checked)}
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
          )}
        </div>

        {/* Info message for content creators */}
        {isContentCreator && (
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-300 rounded-lg shadow-sm">
            <p className="text-sm text-blue-900 font-medium">
              💡 כיוצר תוכן, תוכל לשנות רק את מיקום האלמנטים. עיצוב וטקסט ניתנים לעריכה על ידי מנהלים בלבד.
            </p>
          </div>
        )}
      </div>

      {/* Footer - Removed outdated message, changes ARE saved */}
    </div>
  );
};

export default FooterControlsSidebar;

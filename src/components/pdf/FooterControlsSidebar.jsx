import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { NumberInput } from '@/components/ui/number-input';
import { Button } from '@/components/ui/button';
import { Crown, RotateCw, EyeOff, Eye, Template, Loader2 } from 'lucide-react';
import { getApiBase } from '@/utils/api';
import { clog, cerror } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';

const FooterControlsSidebar = ({
  footerConfig,
  onConfigChange,
  userRole,
  currentFileId = null
}) => {
  const isAdmin = userRole === 'admin' || userRole === 'sysadmin';
  const isContentCreator = !isAdmin;

  // Template management state
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [savingAsTemplate, setSavingAsTemplate] = useState(false);

  // Load available templates
  useEffect(() => {
    if (isAdmin) {
      loadFooterTemplates();
    }
  }, [isAdmin]);

  const loadFooterTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const response = await fetch(`${getApiBase()}/system-templates/footer`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to load templates');

      const result = await response.json();
      setTemplates(result.data || []);
      clog('Footer templates loaded:', result.data);
    } catch (error) {
      cerror('Error loading footer templates:', error);
      toast({
        title: "שגיאה בטעינת תבניות",
        description: "לא ניתן לטעון את רשימת התבניות",
        variant: "destructive"
      });
    }
    setLoadingTemplates(false);
  };

  const applyTemplate = async (templateId) => {
    if (!templateId) return;

    try {
      const template = templates.find(t => t.id === templateId);
      if (!template) return;

      clog('Applying template:', template);
      onConfigChange(template.template_data);
      setSelectedTemplateId(templateId);

      toast({
        title: "תבנית הוחלה בהצלחה",
        description: `התבנית "${template.name}" הוחלה על הכותרת התחתונה`
      });
    } catch (error) {
      cerror('Error applying template:', error);
      toast({
        title: "שגיאה בהחלת התבנית",
        description: "לא ניתן להחיל את התבנית",
        variant: "destructive"
      });
    }
  };

  const saveAsTemplate = async () => {
    if (!isAdmin || !currentFileId) return;

    const templateName = prompt('הזן שם לתבנית החדשה:');
    if (!templateName) return;

    setSavingAsTemplate(true);
    try {
      const response = await fetch(`${getApiBase()}/system-templates/save-from-file/${currentFileId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: templateName,
          description: `תבנית שנוצרה מקובץ מספר ${currentFileId}`,
          category: 'custom'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save template');
      }

      toast({
        title: "התבנית נשמרה בהצלחה",
        description: `התבנית "${templateName}" נוצרה ותהיה זמינה לשימוש בקבצים אחרים`
      });

      // Reload templates
      await loadFooterTemplates();
    } catch (error) {
      cerror('Error saving template:', error);
      toast({
        title: "שגיאה בשמירת התבנית",
        description: error.message,
        variant: "destructive"
      });
    }
    setSavingAsTemplate(false);
  };

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
        {/* Template Picker - Admin Only */}
        {isAdmin && (
          <div className="space-y-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Template className="w-5 h-5 text-indigo-600" />
                <Label className="text-base font-bold text-gray-800">תבניות מערכת</Label>
                <Crown className="w-4 h-4 text-amber-500" />
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-sm">החל תבנית קיימת</Label>
                <div className="flex gap-2">
                  <select
                    value={selectedTemplateId || ''}
                    onChange={(e) => e.target.value && applyTemplate(parseInt(e.target.value))}
                    className="flex-1 px-3 py-2 border rounded-lg bg-white disabled:opacity-50"
                    disabled={loadingTemplates}
                  >
                    <option value="">בחר תבנית...</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name} {template.is_default ? '(ברירת מחדל)' : ''} - {template.category}
                      </option>
                    ))}
                  </select>
                  {loadingTemplates && (
                    <div className="flex items-center justify-center px-3">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={saveAsTemplate}
                  disabled={savingAsTemplate || !currentFileId}
                  size="sm"
                  variant="outline"
                  className="text-indigo-600 border-indigo-300 hover:bg-indigo-50"
                >
                  {savingAsTemplate ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin ml-2" />
                      שומר...
                    </>
                  ) : (
                    <>
                      <Template className="w-4 h-4 ml-2" />
                      שמור כתבנית
                    </>
                  )}
                </Button>
                <Button
                  onClick={loadFooterTemplates}
                  disabled={loadingTemplates}
                  size="sm"
                  variant="outline"
                  className="text-gray-600 border-gray-300 hover:bg-gray-50"
                >
                  {loadingTemplates ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'רענן'
                  )}
                </Button>
              </div>

              <div className="text-xs text-gray-600 bg-white p-2 rounded border">
                💡 <strong>תבניות מאפשרות:</strong> שמירה ושימוש חוזר בהגדרות כותרת תחתונה מותאמות.
                שמור את ההגדרות הנוכחיות כתבנית או החל תבנית קיימת על הקובץ הזה.
              </div>
            </div>
          </div>
        )}

        {/* Logo Controls */}
        <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label className="text-base font-bold text-gray-800">לוגו</Label>
              {isAdmin && <Crown className="w-4 h-4 text-amber-500" />}
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <>
                  <Switch
                    checked={footerConfig.logo.visible && !footerConfig.logo.hidden}
                    onCheckedChange={(checked) => {
                      updateConfig('logo', 'visible', checked);
                      updateConfig('logo', 'hidden', !checked);
                    }}
                  />
                  <button
                    onClick={() => updateConfig('logo', 'hidden', !footerConfig.logo.hidden)}
                    className={`p-1 rounded hover:bg-gray-200 transition-colors ${
                      footerConfig.logo.hidden ? 'text-red-500' : 'text-gray-600'
                    }`}
                    title={footerConfig.logo.hidden ? 'הלוגו מוסתר' : 'הסתר לוגו (ללא מחיקה)'}
                  >
                    {footerConfig.logo.hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </>
              )}
            </div>
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

                  <div className="space-y-2">
                    <div className="flex items-center gap-1">
                      <RotateCw className="w-3 h-3 text-blue-500" />
                      <Label className="text-sm">סיבוב</Label>
                      <Crown className="w-3 h-3 text-orange-500" />
                    </div>
                    <div className="flex items-center gap-2">
                      <NumberInput
                        value={footerConfig.logo.rotation || 0}
                        onChange={(value) => updateConfig('logo', 'rotation', value)}
                        min={-180}
                        max={180}
                        step={15}
                        suffix="°"
                        className="flex-1"
                      />
                      <Button
                        onClick={() => updateConfig('logo', 'rotation', 0)}
                        size="sm"
                        variant="outline"
                        className="px-2"
                        title="איפוס סיבוב"
                      >
                        <RotateCw className="w-3 h-3" />
                      </Button>
                    </div>
                    {(footerConfig.logo.rotation || 0) !== 0 && (
                      <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded border">
                        ⚠️ סיבוב עדיין לא יוצג ב-PDF הסופי (בפיתוח)
                      </p>
                    )}
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
            <div className="flex items-center gap-2">
              {isAdmin && (
                <>
                  <Switch
                    checked={footerConfig.text.visible && !footerConfig.text.hidden}
                    onCheckedChange={(checked) => {
                      updateConfig('text', 'visible', checked);
                      updateConfig('text', 'hidden', !checked);
                    }}
                  />
                  <button
                    onClick={() => updateConfig('text', 'hidden', !footerConfig.text.hidden)}
                    className={`p-1 rounded hover:bg-gray-200 transition-colors ${
                      footerConfig.text.hidden ? 'text-red-500' : 'text-gray-600'
                    }`}
                    title={footerConfig.text.hidden ? 'הטקסט מוסתר' : 'הסתר טקסט (ללא מחיקה)'}
                  >
                    {footerConfig.text.hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </>
              )}
            </div>
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

                  <div className="space-y-2">
                    <div className="flex items-center gap-1">
                      <RotateCw className="w-3 h-3 text-blue-500" />
                      <Label className="text-sm">סיבוב</Label>
                      <Crown className="w-3 h-3 text-orange-500" />
                    </div>
                    <div className="flex items-center gap-2">
                      <NumberInput
                        value={footerConfig.text.rotation || 0}
                        onChange={(value) => updateConfig('text', 'rotation', value)}
                        min={-180}
                        max={180}
                        step={15}
                        suffix="°"
                        className="flex-1"
                      />
                      <Button
                        onClick={() => updateConfig('text', 'rotation', 0)}
                        size="sm"
                        variant="outline"
                        className="px-2"
                        title="איפוס סיבוב"
                      >
                        <RotateCw className="w-3 h-3" />
                      </Button>
                    </div>
                    {(footerConfig.text.rotation || 0) !== 0 && (
                      <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded border">
                        ⚠️ סיבוב עדיין לא יוצג ב-PDF הסופי (בפיתוח)
                      </p>
                    )}
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
            <div className="flex items-center gap-2">
              {isAdmin && (
                <>
                  <Switch
                    checked={footerConfig.url.visible && !footerConfig.url.hidden}
                    onCheckedChange={(checked) => {
                      updateConfig('url', 'visible', checked);
                      updateConfig('url', 'hidden', !checked);
                    }}
                  />
                  <button
                    onClick={() => updateConfig('url', 'hidden', !footerConfig.url.hidden)}
                    className={`p-1 rounded hover:bg-gray-200 transition-colors ${
                      footerConfig.url.hidden ? 'text-red-500' : 'text-gray-600'
                    }`}
                    title={footerConfig.url.hidden ? 'הקישור מוסתר' : 'הסתר קישור (ללא מחיקה)'}
                  >
                    {footerConfig.url.hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </>
              )}
            </div>
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

                  <div className="space-y-2">
                    <div className="flex items-center gap-1">
                      <RotateCw className="w-3 h-3 text-blue-500" />
                      <Label className="text-sm">סיבוב</Label>
                      <Crown className="w-3 h-3 text-orange-500" />
                    </div>
                    <div className="flex items-center gap-2">
                      <NumberInput
                        value={footerConfig.url.rotation || 0}
                        onChange={(value) => updateConfig('url', 'rotation', value)}
                        min={-180}
                        max={180}
                        step={15}
                        suffix="°"
                        className="flex-1"
                      />
                      <Button
                        onClick={() => updateConfig('url', 'rotation', 0)}
                        size="sm"
                        variant="outline"
                        className="px-2"
                        title="איפוס סיבוב"
                      >
                        <RotateCw className="w-3 h-3" />
                      </Button>
                    </div>
                    {(footerConfig.url.rotation || 0) !== 0 && (
                      <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded border">
                        ⚠️ סיבוב עדיין לא יוצג ב-PDF הסופי (בפיתוח)
                      </p>
                    )}
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

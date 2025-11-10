import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, Settings, Palette, Plus, Info, Sparkles } from 'lucide-react';
import { apiRequest } from '@/services/apiClient';
import { clog, cerror } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import VisualTemplateEditor from '@/components/templates/VisualTemplateEditor';

/**
 * TemplateSelector - Enhanced template selection component
 * Allows users to:
 * 1. Enable/disable template usage
 * 2. Select from existing system templates
 * 3. Edit custom templates for specific files
 *
 * Supports: branding, watermark templates
 */
const TemplateSelector = ({
  entityType = 'file', // 'file' or 'lessonplan'
  entityId,
  templateType, // 'branding', 'watermark'
  targetFormat = 'pdf-a4-portrait', // 'pdf-a4-portrait', 'pdf-a4-landscape', 'svg-lessonplan'
  currentTemplateId,
  customTemplateData,
  enabled = false,
  hideToggle = false, // Hide the enable/disable toggle
  onTemplateChange,
  onCustomTemplateChange,
  onEnabledChange,
  fileExists = false,
  userRole,
  className = ""
}) => {
  // State
  const [availableTemplates, setAvailableTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(currentTemplateId || '');
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(!!customTemplateData);

  // Derived state
  const isAdmin = userRole === 'admin' || userRole === 'sysadmin';

  // Template type configuration
  const getTemplateConfig = () => {
    switch (templateType) {
      case 'branding':
        return {
          name: 'מיתוג',
          description: 'מיתוג עם לוגו, זכויות יוצרים ומידע על הארגון',
          icon: <Settings className="w-4 h-4" />,
          color: 'blue',
          enabledDescription: 'כאשר מופעל, יתווסף מיתוג הארגון לקובץ'
        };
      case 'watermark':
        return {
          name: 'סימן מים',
          description: 'סימן מים להגנה על התוכן ומיתוג',
          icon: <Sparkles className="w-4 h-4" />,
          color: 'purple',
          enabledDescription: 'כאשר מופעל, יתווסף סימן מים למעצרי התצוגה המקדימה'
        };
      default:
        return {
          name: 'תבנית',
          description: 'תבנית עיצוב',
          icon: <Settings className="w-4 h-4" />,
          color: 'gray',
          enabledDescription: 'כאשר מופעל, יתווסף עיצוב מותאם אישית'
        };
    }
  };

  const config = getTemplateConfig();

  // Debug logging
  clog(`🐛 TemplateSelector render - templateType: ${templateType}, enabled: ${enabled}, fileExists: ${fileExists}, selectedTemplateId: ${selectedTemplateId}, availableTemplates.length: ${availableTemplates.length}, currentTemplateId: ${currentTemplateId}, isCustomMode: ${isCustomMode}, customTemplateData:`, customTemplateData);

  // Sync isCustomMode with customTemplateData prop changes
  useEffect(() => {
    const hasCustomData = !!customTemplateData;
    if (hasCustomData !== isCustomMode) {
      setIsCustomMode(hasCustomData);
      clog(`🔄 Updated isCustomMode to ${hasCustomData} based on customTemplateData`);
    }
  }, [customTemplateData]);

  // Fetch available templates
  useEffect(() => {
    if (enabled || fileExists) { // Load templates when enabled OR when file exists (for preview/configuration)
      fetchAvailableTemplates();
    }
  }, [enabled, templateType, targetFormat, fileExists]);

  const fetchAvailableTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      clog(`🎨 Fetching ${templateType} templates for ${targetFormat}... (enabled: ${enabled}, fileExists: ${fileExists})`);
      const response = await apiRequest(`/system-templates?type=${templateType}&format=${targetFormat}`);
      clog('🎨 Raw API response:', response);

      // Handle different response formats
      let templates = [];
      if (Array.isArray(response)) {
        templates = response;
      } else if (response?.success && Array.isArray(response.data)) {
        templates = response.data;
      } else if (response?.data && Array.isArray(response.data)) {
        templates = response.data;
      } else {
        clog('⚠️ Unexpected response format:', response);
        templates = [];
      }

      setAvailableTemplates(templates);
      clog(`✅ Loaded ${templates.length} ${templateType} templates:`, templates);

      // Auto-select default template if none selected
      if (!selectedTemplateId && templates.length > 0) {
        const defaultTemplate = templates.find(t => t.is_default) || templates[0];
        if (defaultTemplate) {
          clog(`🎯 Auto-selecting default template: ${defaultTemplate.name} (ID: ${defaultTemplate.id})`);
          setSelectedTemplateId(defaultTemplate.id.toString());
          onTemplateChange?.(defaultTemplate.id, defaultTemplate);
        }
      } else {
        clog(`🎯 Not auto-selecting template. selectedTemplateId: ${selectedTemplateId}, templates.length: ${templates.length}`);
      }
    } catch (error) {
      cerror('Error fetching templates:', error);
      toast({
        title: "שגיאה בטעינת תבניות",
        description: "לא הצלחנו לטעון את רשימת התבניות. נסה שוב מאוחר יותר.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  // Handle enabling/disabling template
  const handleEnabledToggle = (checked) => {
    onEnabledChange?.(checked);
    if (!checked) {
      // Reset selection when disabling
      setSelectedTemplateId('');
      setIsCustomMode(false);
      onTemplateChange?.(null, null);
      onCustomTemplateChange?.(null);
    }
  };

  // Handle template selection
  const handleTemplateSelect = (templateId) => {
    setSelectedTemplateId(templateId);
    const selectedTemplate = availableTemplates.find(t => t.id.toString() === templateId);

    if (selectedTemplate) {
      setIsCustomMode(false);
      onTemplateChange?.(selectedTemplate.id, selectedTemplate);
      onCustomTemplateChange?.(null); // Clear custom data when using system template
      clog(`📋 Selected system template: ${selectedTemplate.name}`);
    }
  };

  // Handle custom template editing
  const handleCustomEdit = () => {
    setIsCustomMode(true);
    setShowTemplateEditor(true);

    // Use selected template as base or create new custom template
    const baseTemplate = selectedTemplateId ?
      availableTemplates.find(t => t.id.toString() === selectedTemplateId) :
      availableTemplates.find(t => t.is_default) || availableTemplates[0];

    if (baseTemplate) {
      clog(`🎨 Starting custom edit based on template: ${baseTemplate.name}`);
    }
  };

  // Handle custom template save
  const handleCustomTemplateSave = (customData) => {
    setIsCustomMode(true);
    onCustomTemplateChange?.(customData);
    onTemplateChange?.(null, null); // Clear system template when using custom
    setShowTemplateEditor(false);
    clog('💾 Custom template data saved for specific entity');

    toast({
      title: "תבנית מותאמת נשמרה",
      description: `התבנית המותאמת אישית ל${config.name} נשמרה בהצלחה`,
      variant: "default"
    });
  };

  // Get initial template data for editor
  const getInitialTemplateData = () => {
    if (customTemplateData) {
      return customTemplateData;
    }

    if (selectedTemplateId) {
      const template = availableTemplates.find(t => t.id.toString() === selectedTemplateId);
      return template?.template_data || null;
    }

    return null;
  };

  return (
    <div className={`space-y-4 ${className}`} dir="rtl">
      {/* Enable/Disable Toggle - Only show if not hidden */}
      {!hideToggle && (
        <div className={`flex items-center justify-between p-4 rounded-lg border-2 ${
          enabled
            ? `bg-${config.color}-50 border-${config.color}-200`
            : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="space-y-0.5">
            <Label className={`text-sm font-medium flex items-center gap-2 ${
              enabled ? `text-${config.color}-900` : 'text-gray-700'
            }`}>
              {config.icon}
              {config.name}
            </Label>
            <p className={`text-xs ${
              enabled ? `text-${config.color}-700` : 'text-gray-500'
            }`}>
              {config.enabledDescription}
            </p>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={handleEnabledToggle}
          />
        </div>
      )}

      {/* Header when toggle is hidden */}
      {hideToggle && (
        <div className={`p-4 rounded-lg border-2 bg-${config.color}-50 border-${config.color}-200`}>
          <Label className={`text-sm font-medium flex items-center gap-2 text-${config.color}-900`}>
            {config.icon}
            {config.name}
          </Label>
          <p className={`text-xs text-${config.color}-700 mt-1`}>
            {templateType === 'watermark'
              ? 'סימן מים יתווסף אוטומטית כאשר תצוגה מקדימה מותרת'
              : config.enabledDescription
            }
          </p>
        </div>
      )}

      {/* Template Selection - Show when file exists (allow configuration even when disabled) */}
      {fileExists && (
        <div className={`space-y-3 ${!enabled ? 'opacity-60' : ''}`}>
          {/* Template Mode Selection */}
          <div className="flex items-center gap-4 p-3 bg-white rounded-lg border border-gray-200">
            <div className="flex-1">
              <Label className="text-sm font-medium text-gray-900">אופן עיצוב</Label>
              <div className="flex items-center gap-4 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name={`template-mode-${templateType}`}
                    checked={!isCustomMode}
                    onChange={() => {
                      setIsCustomMode(false);
                      if (selectedTemplateId) {
                        handleTemplateSelect(selectedTemplateId);
                      }
                    }}
                    className={`text-${config.color}-600`}
                    disabled={!enabled}
                  />
                  <span className="text-sm">השתמש בתבנית קיימת</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name={`template-mode-${templateType}`}
                    checked={isCustomMode}
                    onChange={() => setIsCustomMode(true)}
                    className={`text-${config.color}-600`}
                    disabled={!enabled}
                  />
                  <span className="text-sm">עיצוב מותאם אישית</span>
                </label>
              </div>
            </div>
          </div>

          {/* System Template Selection */}
          {!isCustomMode && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Label className="text-sm font-medium">בחר תבנית</Label>
                <Palette className={`w-4 h-4 text-${config.color}-600`} />
              </div>

              <Select
                value={selectedTemplateId}
                onValueChange={handleTemplateSelect}
                disabled={isLoadingTemplates || !enabled}
              >
                <SelectTrigger className={`border-${config.color}-300 focus:ring-${config.color}-500`}>
                  <SelectValue placeholder={isLoadingTemplates ? "טוען תבניות..." : enabled ? "בחר תבנית" : "בחר תבנית (יופעל עם הפעלת המיתוג)"} />
                </SelectTrigger>
                <SelectContent>
                  {availableTemplates.length > 0 ? (
                    availableTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id.toString()}>
                        <div className="flex items-center gap-2">
                          <span>{template.name}</span>
                          {template.is_default && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                              ברירת מחדל
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-templates" disabled>
                      {isLoadingTemplates ? 'טוען תבניות...' : 'אין תבניות זמינות'}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>

              {selectedTemplateId && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTemplateEditor(true)}
                    className={`border-${config.color}-300 text-${config.color}-700 hover:bg-${config.color}-100`}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    תצוגה מקדימה ועריכה
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Custom Template Mode */}
          {isCustomMode && (
            <div className={`p-4 bg-${config.color}-50 rounded-lg border border-${config.color}-200`}>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className={`text-sm font-medium text-${config.color}-900`}>עיצוב מותאם אישית</h4>
                  <p className={`text-xs text-${config.color}-700 mt-1`}>
                    {customTemplateData
                      ? 'תבנית מותאמת אישית נוצרה עבור קובץ זה'
                      : 'צור תבנית מותאמת אישית עבור קובץ זה בלבד'
                    }
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCustomEdit}
                  className={`border-${config.color}-300 text-${config.color}-700 hover:bg-${config.color}-100`}
                  disabled={!enabled}
                >
                  {customTemplateData ? (
                    <>
                      <Settings className="w-4 h-4 mr-2" />
                      ערוך תבנית
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      צור תבנית
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Info Alert */}
          <Alert className={`border-${config.color}-200 bg-${config.color}-50`}>
            <Info className={`h-4 w-4 text-${config.color}-600`} />
            <AlertDescription className={`text-${config.color}-800 text-xs`}>
              {!enabled ? (
                `הגדר תבנית ${config.name} מראש - תופעל כאשר תדליק את המיתוג למעלה`
              ) : isCustomMode ? (
                `תבנית מותאמת אישית תשמר עבור הקובץ הזה בלבד ולא תשפיע על תבניות אחרות במערכת`
              ) : (
                `השימוש בתבנית קיימת מאפשר עדכון אוטומטי כאשר התבנית משתנה ברמת המערכת`
              )}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* File Not Uploaded Message */}
      {enabled && !fileExists && (
        <Alert className="border-amber-200 bg-amber-50">
          <Info className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 text-xs">
            יש להעלות קובץ תחילה על מנת לערוך את הגדרות ה{config.name}
          </AlertDescription>
        </Alert>
      )}

      {/* Template Editor Modal */}
      {showTemplateEditor && (
        <VisualTemplateEditor
          isOpen={showTemplateEditor}
          onClose={() => setShowTemplateEditor(false)}
          onSave={handleCustomTemplateSave}
          fileEntityId={entityId}
          userRole={userRole}
          initialFooterConfig={getInitialTemplateData()}
          targetFormat={targetFormat}
          templateType={templateType}
          currentTemplateId={isCustomMode ? null : selectedTemplateId}
          onTemplateChange={(templateId, templateData) => {
            // Handle template change from within the editor
            if (templateId) {
              // User selected a system template
              setIsCustomMode(false);
              setSelectedTemplateId(templateId.toString());
              onTemplateChange?.(templateId, templateData);
              onCustomTemplateChange?.(null); // Clear custom data
            } else {
              // User switched to custom mode
              setIsCustomMode(true);
              setSelectedTemplateId('');
              onTemplateChange?.(null, null);
              // Don't clear custom data here - it will be saved when editor closes
            }
          }}
        />
      )}
    </div>
  );
};

export default TemplateSelector;
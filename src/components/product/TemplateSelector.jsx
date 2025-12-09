import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, Settings, Palette, Plus, Info, Sparkles } from 'lucide-react';
import { apiRequest } from '@/services/apiClient';
import { ludlog, luderror } from '@/lib/ludlog';
import { toast } from '@/components/ui/use-toast';
import { showConfirm } from '@/utils/messaging';
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
  currentUser = null, // Current user object for email template resolution
  className = "",
  fileEntity = null // File entity object for template filtering
}) => {
  // State
  const [availableTemplates, setAvailableTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(currentTemplateId || '');
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(!!customTemplateData);
  const [pendingCustomData, setPendingCustomData] = useState(null); // Store initialized custom data locally

  // Derived state
  const isAdmin = userRole === 'admin' || userRole === 'sysadmin';
  const [isSaving, setIsSaving] = useState(false);

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
  ludlog.media(`🐛 TemplateSelector render - templateType: ${templateType}`, { data: { enabled, fileExists, selectedTemplateId, availableTemplatesLength: availableTemplates.length, currentTemplateId, isCustomMode, customTemplateData } });

  // Sync isCustomMode with customTemplateData prop changes
  useEffect(() => {
    const hasCustomData = !!customTemplateData;
    if (hasCustomData !== isCustomMode) {
      setIsCustomMode(hasCustomData);
      ludlog.ui(`🔄 Updated isCustomMode to ${hasCustomData} based on customTemplateData`);
    }
  }, [customTemplateData]);

  // Fetch available templates
  useEffect(() => {
    if (enabled || fileExists) { // Load templates when enabled OR when file exists (for preview/configuration)
      fetchAvailableTemplates();
    }
  }, [enabled, templateType, targetFormat, fileExists, fileEntity?.target_format]);

  // Immediate save function to persist template changes to database
  const saveTemplateSettingsImmediately = async (templateId, customData) => {
    if (!entityId) {
      ludlog.media('⚠️ No entityId provided', { data: { action: 'cannotSaveTemplateSettings' } });
      return;
    }

    setIsSaving(true);
    try {
      const updateData = {};

      // Set template fields based on templateType
      if (templateType === 'branding') {
        updateData.branding_template_id = templateId;
        updateData.branding_settings = customData;
      } else if (templateType === 'watermark') {
        updateData.watermark_template_id = templateId;
        updateData.watermark_settings = customData;
      }

      // Make API call to update the entity immediately
      const endpoint = entityType === 'file'
        ? `/entities/file/${entityId}`
        : `/entities/lesson_plan/${entityId}`;

      await apiRequest(endpoint, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });

      ludlog.media(`✅ Template settings saved immediately for ${entityType} ${entityId}:`, { data: updateData });
      toast({
        title: "הגדרות נשמרו",
        description: `הגדרות ${config.name} נשמרו בהצלחה`,
        variant: "default"
      });
    } catch (error) {
      luderror.media('Error saving template settings immediately:', error);
      toast({
        title: "שגיאה בשמירה",
        description: `לא הצלחנו לשמור את הגדרות ה${config.name}. נסה שוב.`,
        variant: "destructive"
      });
      throw error; // Re-throw to let caller handle the error
    } finally {
      setIsSaving(false);
    }
  };

  const fetchAvailableTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      // Use fileEntity target_format if available, fallback to targetFormat prop
      const effectiveFormat = fileEntity?.target_format || targetFormat;
      ludlog.api(`🎨 Fetching ${templateType} templates for ${effectiveFormat}...`, { data: { enabled, fileExists, fileEntityFormat: fileEntity?.target_format } });
      const response = await apiRequest(`/system-templates?type=${templateType}&format=${effectiveFormat}`);
      ludlog.api('🎨 Raw API response:', { data: response });

      // Handle different response formats
      let templates = [];
      if (Array.isArray(response)) {
        templates = response;
      } else if (response?.success && Array.isArray(response.data)) {
        templates = response.data;
      } else if (response?.data && Array.isArray(response.data)) {
        templates = response.data;
      } else {
        ludlog.api('⚠️ Unexpected response format:', { data: response });
        templates = [];
      }

      setAvailableTemplates(templates);
      ludlog.ui(`✅ Loaded ${templates.length} ${templateType} templates:`, { data: templates });

      // Handle template selection logic based on availability
      if (templates.length === 0) {
        // No templates available for this format - force custom mode
        ludlog.ui(`⚠️ No ${templateType} templates available for ${effectiveFormat} - switching to custom mode`);
        setIsCustomMode(true);
        setSelectedTemplateId('');
        onTemplateChange?.(null, null);

        // Clear any custom data to ensure clean state
        onCustomTemplateChange?.(null);
      } else {
        // Templates available - but check for custom template data first
        const hasCustomData = !!customTemplateData;

        if (hasCustomData) {
          // Custom template data exists - stay in custom mode regardless of selectedTemplateId
          ludlog.ui(`🎨 Custom template data detected - staying in custom mode`);
          setIsCustomMode(true);
          setSelectedTemplateId(''); // Clear any system template selection
          onTemplateChange?.(null, null); // Clear system template
          // Don't change customTemplateData - let parent handle that
        } else if (!selectedTemplateId) {
          // No custom data and no selected template - auto-select default
          const defaultTemplate = templates.find(t => t.is_default) || templates[0];
          if (defaultTemplate) {
            ludlog.ui(`🎯 Auto-selecting default template: ${defaultTemplate.name} (ID: ${defaultTemplate.id});`);
            setSelectedTemplateId(defaultTemplate.id.toString());
            setIsCustomMode(false);
            onTemplateChange?.(defaultTemplate.id, defaultTemplate);
          }
        } else {
          // Check if currently selected template is still available for this format
          const currentTemplate = templates.find(t => t.id.toString() === selectedTemplateId);
          if (!currentTemplate) {
            ludlog.ui(`⚠️ Current template ${selectedTemplateId} not available for ${effectiveFormat} - auto-selecting new default`);
            const defaultTemplate = templates.find(t => t.is_default) || templates[0];
            if (defaultTemplate) {
              setSelectedTemplateId(defaultTemplate.id.toString());
              setIsCustomMode(false);
              onTemplateChange?.(defaultTemplate.id, defaultTemplate);
            }
          }
        }
      }
    } catch (error) {
      luderror.api('Error fetching templates:', error);
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

  // Handle template selection with confirmation and immediate saving
  const handleTemplateSelect = async (templateId) => {
    const selectedTemplate = availableTemplates.find(t => t.id.toString() === templateId);

    // Check if user has custom template data and warn before switching
    if (customTemplateData && isCustomMode) {
      const confirmed = await showConfirm(
        `עבור לתבנית מערכת?`,
        `יש לך תבנית מותאמת אישית של ${config.name}. העברה לתבנית "${selectedTemplate?.name}" תמחק את ההתאמות שלך. האם להמשיך?`,
        {
          confirmText: "כן, החלף לתבנית מערכת",
          cancelText: "ביטול",
          variant: "warning"
        }
      );

      if (!confirmed) {
        return; // User cancelled, keep current selection
      }
    }

    try {
      setSelectedTemplateId(templateId);

      if (selectedTemplate) {
        setIsCustomMode(false);
        setPendingCustomData(null); // Clear pending custom data when switching to system template

        // Call parent callbacks
        onTemplateChange?.(selectedTemplate.id, selectedTemplate);
        onCustomTemplateChange?.(null); // Clear custom data when using system template

        // Save immediately to database
        await saveTemplateSettingsImmediately(selectedTemplate.id, null);

        ludlog.ui(`📋 Selected system template: ${selectedTemplate.name}`);
      }
    } catch (error) {
      // If save failed, revert the UI state
      luderror.state('Failed to save template selection, reverting UI state');
      setIsCustomMode(true);
      if (customTemplateData) {
        onCustomTemplateChange?.(customTemplateData);
      }
    }
  };

  // Handle custom template editing with confirmation
  const handleCustomEdit = async () => {
    // Check if user has selected system template and warn before switching to custom
    if (selectedTemplateId && !customTemplateData) {
      const selectedTemplate = availableTemplates.find(t => t.id.toString() === selectedTemplateId);
      const confirmed = await showConfirm(
        `צור תבנית מותאמת אישית?`,
        `אתה עובר מהתבנית "${selectedTemplate?.name}" לעיצוב מותאם אישית. זה יבטל את השימוש בתבנית המערכת. האם להמשיך?`,
        {
          confirmText: "כן, צור תבנית מותאמת",
          cancelText: "ביטול",
          variant: "warning"
        }
      );

      if (!confirmed) {
        return; // User cancelled, keep current template
      }

      // Initialize custom template with base template data when switching from system template
      try {
        setIsCustomMode(true);

        // Use selected template as base for custom template
        const baseTemplate = availableTemplates.find(t => t.id.toString() === selectedTemplateId);
        let initialCustomData = null;

        if (baseTemplate) {
          // Use the selected template's data as base for custom template
          initialCustomData = JSON.parse(JSON.stringify(baseTemplate.template_data));
          ludlog.ui(`🎨 Initializing custom template with data from: ${baseTemplate.name}`);
        }

        // If no base template, try to use default template
        if (!initialCustomData) {
          const defaultTemplate = availableTemplates.find(t => t.is_default) || availableTemplates[0];
          if (defaultTemplate) {
            initialCustomData = JSON.parse(JSON.stringify(defaultTemplate.template_data));
            ludlog.ui(`🎨 Initializing custom template with default template data: ${defaultTemplate.name}`);
          }
        }

        // Store pending data locally for immediate use in editor
        setPendingCustomData(initialCustomData);

        // Call parent callbacks
        onTemplateChange?.(null, null); // Clear system template
        onCustomTemplateChange?.(initialCustomData); // Set initial custom data

        // Save immediately to database with initial custom data
        await saveTemplateSettingsImmediately(null, initialCustomData);
        setSelectedTemplateId(''); // Clear selected template ID

        ludlog.ui(`📋 Initialized custom mode via button with template data`);
      } catch (error) {
        // If save failed, revert UI state
        luderror.state('Failed to initialize custom template, reverting UI state');
        setIsCustomMode(false);
        if (selectedTemplateId) {
          const template = availableTemplates.find(t => t.id.toString() === selectedTemplateId);
          onTemplateChange?.(template?.id, template);
        }
        onCustomTemplateChange?.(null);
        return; // Don't open editor if initialization failed
      }
    }

    // Open the template editor
    setShowTemplateEditor(true);

    // Use selected template as base or create new custom template
    const baseTemplate = selectedTemplateId ?
      availableTemplates.find(t => t.id.toString() === selectedTemplateId) :
      availableTemplates.find(t => t.is_default) || availableTemplates[0];

    if (baseTemplate) {
      ludlog.ui(`🎨 Starting custom edit based on template: ${baseTemplate.name}`);
    }
  };

  // Handle custom template save with immediate saving
  const handleCustomTemplateSave = async (customData) => {
    try {
      setIsCustomMode(true);

      // Clear pending data since we now have the final saved data
      setPendingCustomData(null);

      // Call parent callbacks
      onCustomTemplateChange?.(customData);
      onTemplateChange?.(null, null); // Clear system template when using custom

      // Save immediately to database
      await saveTemplateSettingsImmediately(null, customData);

      setShowTemplateEditor(false);
      ludlog.ui('💾 Custom template data saved for specific entity');

      toast({
        title: "תבנית מותאמת נשמרה",
        description: `התבנית המותאמת אישית ל${config.name} נשמרה בהצלחה`,
        variant: "default"
      });
    } catch (error) {
      // If save failed, revert UI state
      luderror.state('Failed to save custom template, reverting UI state');
      setIsCustomMode(false);
      setPendingCustomData(null); // Clear pending data on error
      if (selectedTemplateId) {
        onTemplateChange?.(selectedTemplateId, availableTemplates.find(t => t.id.toString() === selectedTemplateId));
      }
      onCustomTemplateChange?.(null);
    }
  };

  // Get initial template data for editor
  const getInitialTemplateData = () => {
    // Use pending custom data if available (from recent initialization)
    if (pendingCustomData) {
      return pendingCustomData;
    }

    // Fall back to prop from parent component
    if (customTemplateData) {
      return customTemplateData;
    }

    // Fall back to system template data if in preview mode
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
        <div className={`space-y-3 ${!enabled ? 'opacity-60' : ''} ${isSaving ? 'opacity-70 pointer-events-none' : ''}`}>
          {/* Template Mode Selection */}
          <div className="flex items-center gap-4 p-3 bg-white rounded-lg border border-gray-200">
            <div className="flex-1">
              <Label className="text-sm font-medium text-gray-900">אופן עיצוב</Label>
              <div className="flex items-center gap-4 mt-2">
                {isSaving && (
                  <div className="flex items-center gap-2 text-blue-600 text-xs">
                    <div className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span>שומר...</span>
                  </div>
                )}
                <label className={`flex items-center gap-2 ${availableTemplates.length === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                  <input
                    type="radio"
                    name={`template-mode-${templateType}`}
                    checked={!isCustomMode && availableTemplates.length > 0}
                    onChange={async (e) => {
                      if (availableTemplates.length > 0) {
                        // Check if user has custom template data and warn before switching
                        if (customTemplateData && isCustomMode) {
                          const confirmed = await showConfirm(
                            `עבור לתבנית מערכת?`,
                            `יש לך תבנית מותאמת אישית של ${config.name}. העברה לתבנית מערכת תמחק את ההתאמות שלך. האם להמשיך?`,
                            {
                              confirmText: "כן, עבור לתבנית מערכת",
                              cancelText: "ביטול",
                              variant: "warning"
                            }
                          );

                          if (!confirmed) {
                            e.preventDefault(); // Prevent radio button state change
                            return; // User cancelled, keep current selection
                          }
                        }

                        // Proceed with switch to system template
                        try {
                          setIsCustomMode(false);
                          setPendingCustomData(null); // Clear pending custom data when switching to system template

                          // Auto-select default template if none selected
                          let templateToSelect = selectedTemplateId;
                          if (!templateToSelect) {
                            const defaultTemplate = availableTemplates.find(t => t.is_default) || availableTemplates[0];
                            if (defaultTemplate) {
                              templateToSelect = defaultTemplate.id.toString();
                              setSelectedTemplateId(templateToSelect);
                            }
                          }

                          if (templateToSelect) {
                            const template = availableTemplates.find(t => t.id.toString() === templateToSelect);
                            if (template) {
                              // Call parent callbacks
                              onTemplateChange?.(template.id, template);
                              onCustomTemplateChange?.(null);

                              // Save immediately to database
                              await saveTemplateSettingsImmediately(template.id, null);

                              ludlog.ui(`📋 Switched to system template via radio button: ${template.name}`);
                            }
                          }
                        } catch (error) {
                          // If save failed, revert UI state
                          luderror.state('Failed to save template selection via radio button, reverting UI state');
                          setIsCustomMode(true);
                          if (customTemplateData) {
                            onCustomTemplateChange?.(customTemplateData);
                          }
                        }
                      }
                    }}
                    className={`text-${config.color}-600`}
                    disabled={!enabled || availableTemplates.length === 0}
                  />
                  <span className="text-sm">
                    השתמש בתבנית קיימת
                    {availableTemplates.length === 0 && (
                      <span className="text-xs text-gray-500 mr-1">(לא זמין)</span>
                    )}
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name={`template-mode-${templateType}`}
                    checked={isCustomMode}
                    onChange={async (e) => {
                      // Check if user has selected system template and warn before switching
                      if (selectedTemplateId && !customTemplateData) {
                        const selectedTemplate = availableTemplates.find(t => t.id.toString() === selectedTemplateId);
                        const confirmed = await showConfirm(
                          `עבור לעיצוב מותאם אישית?`,
                          `אתה עובר מהתבנית "${selectedTemplate?.name}" לעיצוב מותאם אישית. זה יבטל את השימוש בתבנית המערכת. האם להמשיך?`,
                          {
                            confirmText: "כן, עבור לעיצוב מותאם",
                            cancelText: "ביטול",
                            variant: "warning"
                          }
                        );

                        if (!confirmed) {
                          e.preventDefault(); // Prevent radio button state change
                          return; // User cancelled, keep current selection
                        }
                      }

                      // Proceed with switch to custom mode
                      try {
                        setIsCustomMode(true);

                        // Initialize custom template with base template data if switching from system template
                        let initialCustomData = null;
                        if (selectedTemplateId) {
                          const baseTemplate = availableTemplates.find(t => t.id.toString() === selectedTemplateId);
                          if (baseTemplate) {
                            // Use the selected template's data as base for custom template
                            initialCustomData = JSON.parse(JSON.stringify(baseTemplate.template_data));
                            ludlog.ui(`🎨 Initializing custom template with data from: ${baseTemplate.name}`);
                          }
                        }

                        // If no base template, try to use default template
                        if (!initialCustomData) {
                          const defaultTemplate = availableTemplates.find(t => t.is_default) || availableTemplates[0];
                          if (defaultTemplate) {
                            initialCustomData = JSON.parse(JSON.stringify(defaultTemplate.template_data));
                            ludlog.ui(`🎨 Initializing custom template with default template data: ${defaultTemplate.name}`);
                          }
                        }

                        // Store pending data locally for immediate use in editor
                        setPendingCustomData(initialCustomData);

                        // Call parent callbacks
                        onTemplateChange?.(null, null); // Clear system template
                        onCustomTemplateChange?.(initialCustomData); // Set initial custom data

                        // Save immediately to database with initial custom data
                        await saveTemplateSettingsImmediately(null, initialCustomData);
                        setSelectedTemplateId(''); // Clear selected template ID

                        ludlog.ui(`📋 Switched to custom mode via radio button with initialized data`);
                      } catch (error) {
                        // If save failed, revert UI state
                        luderror.state('Failed to save custom mode selection via radio button, reverting UI state');
                        setIsCustomMode(false);
                        if (selectedTemplateId) {
                          const template = availableTemplates.find(t => t.id.toString() === selectedTemplateId);
                          onTemplateChange?.(template?.id, template);
                        }
                      }
                    }}
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

              {availableTemplates.length > 0 ? (
                <>
                  <Select
                    value={selectedTemplateId}
                    onValueChange={handleTemplateSelect}
                    disabled={isLoadingTemplates || !enabled}
                  >
                    <SelectTrigger className={`border-${config.color}-300 focus:ring-${config.color}-500`}>
                      <SelectValue placeholder={isLoadingTemplates ? "טוען תבניות..." : enabled ? "בחר תבנית" : "בחר תבנית (יופעל עם הפעלת המיתוג)"} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTemplates.map((template) => (
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
                      ))}
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
                </>
              ) : (
                <div className={`p-4 bg-amber-50 rounded-lg border border-amber-200`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="w-4 h-4 text-amber-600" />
                    <span className="text-sm font-medium text-amber-900">
                      אין תבניות זמינות
                    </span>
                  </div>
                  <p className="text-xs text-amber-800 mb-3">
                    לא נמצאו תבניות {config.name} עבור הפורמט הנוכחי של הקובץ.
                    תוכל ליצור תבנית מותאמת אישית במקום.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsCustomMode(true);
                      onTemplateChange?.(null, null);
                    }}
                    className="border-amber-300 text-amber-700 hover:bg-amber-100"
                    disabled={!enabled}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    צור תבנית מותאמת אישית
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
          currentUser={currentUser} // Pass current user for email template resolution
          initialTemplateConfig={getInitialTemplateData()}
          targetFormat={fileEntity?.target_format || targetFormat} // Use fileEntity format if available for current form state
          templateType={templateType}
          currentTemplateId={isCustomMode ? null : selectedTemplateId}
          fileEntity={fileEntity}
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
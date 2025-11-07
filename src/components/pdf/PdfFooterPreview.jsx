import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Save, RotateCcw, Palette } from 'lucide-react';
import logo from '@/assets/images/logo.png';
import PdfCanvasWithFooter from './PdfCanvasWithFooter';
import ItemButtons from './ItemButtons';
import FloatingSettingsMenu from './FloatingSettingsMenu';
import { apiDownload, apiRequest } from '@/services/apiClient';
import LudoraLoadingSpinner from '@/components/ui/LudoraLoadingSpinner';
import { clog, cerror } from '@/lib/utils';

const PdfFooterPreview = ({
  isOpen,
  onClose,
  onSave,
  fileEntityId,
  userRole,
  initialFooterConfig
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [copyrightText, setCopyrightText] = useState('');
  const [loadedFooterSettings, setLoadedFooterSettings] = useState(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [focusedItem, setFocusedItem] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);


  const getDefaultConfig = (copyrightTextValue) => {
    const config = {
      logo: {
        visible: true,
        url: logo,
        position: { x: 50, y: 95 },
        style: {
          size: 80,
          opacity: 100
        }
      },
      text: {
        visible: true,
        content: copyrightTextValue || '',
        position: { x: 50, y: 90 },
        style: {
          fontSize: 12,
          color: '#000000',
          bold: false,
          italic: false,
          opacity: 80,
          width: 300
        }
      },
      url: {
        visible: true,
        href: 'https://ludora.app',
        position: { x: 50, y: 85 },
        style: {
          fontSize: 12,
          color: '#0066cc',
          bold: false,
          italic: false,
          opacity: 100
        }
      },
      customElements: {}
    };
    clog('📝 getDefaultConfig called with copyrightTextValue:', copyrightTextValue, 'resulting text.content:', config.text.content);
    return config;
  };

  const [footerConfig, setFooterConfig] = useState(getDefaultConfig(''));

  // Removed separate useEffect - we'll update footerConfig directly in the fetch function

  // Debug: Track footerConfig changes
  useEffect(() => {
    clog('🔄 footerConfig state changed, text content:', footerConfig.text.content);
    clog('🔄 footerConfig full text object:', footerConfig.text);
    clog('🔄 footerConfig full object:', footerConfig);
  }, [footerConfig]);

  // Fetch system footer settings when modal opens
  useEffect(() => {
    if (isOpen && fileEntityId) {
      const fetchData = async () => {
        setIsLoadingSettings(true);
        try {
          // Fetch full footer settings from system
          clog('Fetching system footer settings...');
          const settingsResponse = await apiRequest('/entities/settings');
          clog('Raw settings response:', settingsResponse);
          const settings = Array.isArray(settingsResponse) ? settingsResponse[0] : settingsResponse;
          clog('Parsed settings object:', settings);

          // Get system footer settings or use defaults
          const systemFooterSettings = settings?.footer_settings || getDefaultConfig('');
          const copyrightText = systemFooterSettings?.text?.content || settings?.copyright_footer_text || '';

          clog('📄 System footer settings:', systemFooterSettings);
          clog('📄 Copyright text extracted:', copyrightText);
          setCopyrightText(copyrightText);

          // Merge with provided initialFooterConfig (file-specific settings)
          let finalConfig;
          if (initialFooterConfig) {
            clog('Merging initialFooterConfig with system settings');
            setLoadedFooterSettings(initialFooterConfig);

            // File settings override positioning/styling, system settings provide content
            finalConfig = {
              ...systemFooterSettings,
              ...initialFooterConfig,
              text: {
                ...systemFooterSettings.text,
                ...initialFooterConfig.text,
                content: copyrightText // ALWAYS use system text content
              },
              logo: {
                ...systemFooterSettings.logo,
                ...initialFooterConfig.logo,
                url: logo // Use backend logoUrl or fallback to frontend asset
              }
            };
            clog('🔧 Merged config with system settings:', finalConfig);
          } else {
            clog('Using system footer settings as defaults');
            finalConfig = {
              ...systemFooterSettings,
              text: {
                ...systemFooterSettings.text,
                content: copyrightText
              },
              logo: {
                ...systemFooterSettings.logo,
                url: logo
              }
            };
            clog('🔧 System default config:', finalConfig);
          }

          setFooterConfig(finalConfig);
        } catch (error) {
          cerror('Error fetching settings or footer config:', error);
          // Fall back to defaults on error
          setFooterConfig(getDefaultConfig(''));
        } finally {
          setIsLoadingSettings(false);
        }
      };

      fetchData();
    }
  }, [isOpen, fileEntityId]);

  // Fetch available templates when modal opens
  useEffect(() => {
    if (isOpen) {
      const fetchTemplates = async () => {
        setIsLoadingTemplates(true);
        try {
          clog('Fetching available footer templates...');
          const response = await apiRequest('/system-templates?type=footer');
          const templateList = Array.isArray(response) ? response : [];
          clog('Available templates:', templateList);
          setTemplates(templateList);
        } catch (error) {
          cerror('Error fetching templates:', error);
          setTemplates([]);
        } finally {
          setIsLoadingTemplates(false);
        }
      };

      fetchTemplates();
    }
  }, [isOpen]);

  // Fetch PDF file via API when modal opens
  useEffect(() => {
    if (isOpen && fileEntityId) {
      const fetchPdf = async () => {
        try {
          clog('Fetching PDF from API for preview:', fileEntityId);

          // Add skipFooter=true to skip backend footer merge (we render our own overlay)
          const blob = await apiDownload(`/assets/download/file/${fileEntityId}?skipFooter=true`);

          const blobUrl = URL.createObjectURL(blob);
          clog('PDF blob URL created:', blobUrl);
          setPdfBlobUrl(blobUrl);
        } catch (error) {
          cerror('Error fetching PDF - will show placeholder:', error);
          // Don't set pdfBlobUrl, will show placeholder message instead
        }
      };

      fetchPdf();
    }

    // Cleanup blob URL when modal closes
    return () => {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
        setPdfBlobUrl(null);
      }
    };
  }, [isOpen, fileEntityId]);

  const handleConfigChange = (newConfig, metadata) => {
    setFooterConfig(newConfig);

    // DEBUG: Log scaling metadata for coordinate verification
    if (metadata) {
      clog('📐 Scaling metadata received:', {
        actualPdfDimensions: metadata.actualPdfDimensions,
        scaleFactor: metadata.scaleFactor,
        previewDimensions: metadata.previewDimensions,
        note: 'This helps ensure frontend and backend use same coordinate system'
      });
    }
  };

  const updateConfig = (section, field, value) => {
    const newConfig = {
      ...footerConfig,
      [section]: {
        ...footerConfig[section],
        [field]: value
      }
    };
    setFooterConfig(newConfig);
  };

  const updateStyle = (section, styleField, value) => {
    let newConfig;

    // Check if it's a custom element or built-in element
    if (footerConfig.customElements?.[section]) {
      // Handle custom elements
      newConfig = {
        ...footerConfig,
        customElements: {
          ...footerConfig.customElements,
          [section]: {
            ...footerConfig.customElements[section],
            style: {
              ...footerConfig.customElements[section].style,
              [styleField]: value
            }
          }
        }
      };
    } else {
      // Handle built-in elements (logo, text, url)
      newConfig = {
        ...footerConfig,
        [section]: {
          ...footerConfig[section],
          style: {
            ...footerConfig[section].style,
            [styleField]: value
          }
        }
      };
    }

    setFooterConfig(newConfig);
  };

  const handleItemClick = (item) => {
    if (selectedItem === item) {
      // If clicking the same item, close the menu
      setSelectedItem(null);
      setFocusedItem(null);
    } else {
      // Focus on the new item and open its menu
      setSelectedItem(item);
      setFocusedItem(item);
    }
  };

  const handleMenuClose = () => {
    setSelectedItem(null);
    setFocusedItem(null);
  };

  const handleCenterX = (elementKey) => {
    let newConfig;

    // Check if it's a custom element or built-in element
    if (footerConfig.customElements?.[elementKey]) {
      // Handle custom elements
      newConfig = {
        ...footerConfig,
        customElements: {
          ...footerConfig.customElements,
          [elementKey]: {
            ...footerConfig.customElements[elementKey],
            position: {
              ...footerConfig.customElements[elementKey].position,
              x: 50
            }
          }
        }
      };
    } else {
      // Handle built-in elements (logo, text, url)
      newConfig = {
        ...footerConfig,
        [elementKey]: {
          ...footerConfig[elementKey],
          position: {
            ...footerConfig[elementKey].position,
            x: 50
          }
        }
      };
    }

    setFooterConfig(newConfig);
    clog(`✨ Centered ${elementKey} on X axis to 50%`);
  };

  const handleCenterY = (elementKey) => {
    let newConfig;

    // Check if it's a custom element or built-in element
    if (footerConfig.customElements?.[elementKey]) {
      // Handle custom elements
      newConfig = {
        ...footerConfig,
        customElements: {
          ...footerConfig.customElements,
          [elementKey]: {
            ...footerConfig.customElements[elementKey],
            position: {
              ...footerConfig.customElements[elementKey].position,
              y: 50
            }
          }
        }
      };
    } else {
      // Handle built-in elements (logo, text, url)
      newConfig = {
        ...footerConfig,
        [elementKey]: {
          ...footerConfig[elementKey],
          position: {
            ...footerConfig[elementKey].position,
            y: 50
          }
        }
      };
    }

    setFooterConfig(newConfig);
    clog(`✨ Centered ${elementKey} on Y axis to 50%`);
  };

  const handleAddElement = (elementType) => {
    // Use fixed element ID - each type can only exist once
    const elementId = elementType;

    // Check if element already exists
    if (footerConfig.customElements?.[elementId]) {
      // Element exists, just select it for editing
      setSelectedItem(elementId);
      setFocusedItem(elementId);
      clog(`🎯 Selected existing ${elementType} element:`, elementId);
      return;
    }

    // Element doesn't exist, create it
    const newElement = getDefaultElementConfig(elementType, elementId);

    const newConfig = {
      ...footerConfig,
      customElements: {
        ...footerConfig.customElements,
        [elementId]: newElement
      }
    };

    setFooterConfig(newConfig);
    setSelectedItem(elementId);
    setFocusedItem(elementId);
    clog(`✨ Added new ${elementType} element:`, elementId);
  };

  const getDefaultElementConfig = (elementType, elementId) => {
    const baseConfig = {
      id: elementId,
      type: elementType,
      visible: true,
      position: { x: 50, y: 50 },
      deletable: true
    };

    switch (elementType) {
      case 'box':
        return {
          ...baseConfig,
          style: {
            width: 100,
            height: 50,
            borderColor: '#000000',
            borderWidth: 2,
            backgroundColor: 'transparent',
            opacity: 100
          }
        };
      case 'line':
        return {
          ...baseConfig,
          style: {
            width: 100,
            height: 2,
            color: '#000000',
            opacity: 100
          }
        };
      case 'dotted-line':
        return {
          ...baseConfig,
          style: {
            width: 100,
            height: 2,
            color: '#000000',
            opacity: 100,
            dashArray: '5,5'
          }
        };
      default:
        return baseConfig;
    }
  };

  const handleDeleteElement = (elementId) => {
    if (footerConfig.customElements?.[elementId]?.deletable) {
      const newConfig = {
        ...footerConfig,
        customElements: {
          ...footerConfig.customElements
        }
      };
      delete newConfig.customElements[elementId];

      setFooterConfig(newConfig);
      setSelectedItem(null);
      setFocusedItem(null);
      clog(`🗑️ Deleted custom element:`, elementId);
    }
  };

  const handleReset = async () => {
    try {
      // Fetch fresh footer settings from system
      clog('🔄 Reset: Fetching fresh system footer settings...');
      const settingsResponse = await apiRequest('/entities/settings');
      clog('🔄 Reset: Raw settings response:', settingsResponse);
      const settings = Array.isArray(settingsResponse) ? settingsResponse[0] : settingsResponse;

      // Get system footer settings or fallback to defaults
      const systemFooterSettings = settings?.footer_settings || getDefaultConfig('');
      const copyrightText = systemFooterSettings?.text?.content || settings?.copyright_footer_text || '';

      clog('🔄 Reset: System footer settings:', systemFooterSettings);
      clog('🔄 Reset: Extracted copyright text:', copyrightText);

      // Reset to system defaults
      const resetConfig = {
        ...systemFooterSettings,
        text: {
          ...systemFooterSettings.text,
          content: copyrightText
        },
        logo: {
          ...systemFooterSettings.logo,
          url: logo
        }
      };

      clog('🔄 Reset: Setting footer config:', resetConfig);
      setFooterConfig(resetConfig);
      setCopyrightText(copyrightText);

      // Debug: Check state after setting
      setTimeout(() => {
        clog('🔄 Reset: footerConfig after setState:', footerConfig);
      }, 100);

      clog('✅ Reset to system footer settings completed');
    } catch (error) {
      cerror('Error resetting footer settings:', error);
    }
  };

  const handleSave = async () => {
    try {
      clog('💾 Save: footerConfig being saved:', footerConfig);
      clog('💾 Save: text content being saved:', footerConfig.text.content);

      // Check if copyright text has changed and update system settings if needed
      if (footerConfig.text.content !== copyrightText) {
        clog('💾 Save: Copyright text changed, updating system settings...');
        const { Settings: SettingsEntity } = await import('@/services/entities');

        // Update system settings with new copyright text
        await SettingsEntity.update(1, {
          copyright_footer_text: footerConfig.text.content
        });

        clog('✅ Save: System settings updated with new copyright text');
      }

      // Save footer configuration (without text content - that's in system settings)
      if (onSave) {
        onSave(footerConfig);
      }
      onClose();
    } catch (error) {
      cerror('Error saving footer settings:', error);
    }
  };

  const handleSaveAsDefault = async () => {
    if (!userRole || (userRole !== 'admin' && userRole !== 'sysadmin')) {
      cerror('Only admins can save footer settings as default');
      return;
    }

    try {
      clog('🌐 Save as Default: Saving current footer config as system default...');
      const { Settings: SettingsEntity } = await import('@/services/entities');

      // Get current settings to update
      const settingsResponse = await apiRequest('/entities/settings');
      const settings = Array.isArray(settingsResponse) ? settingsResponse[0] : settingsResponse;

      if (!settings || !settings.id) {
        cerror('Could not find settings to update');
        return;
      }

      // Save current footer config as system default
      await SettingsEntity.update(settings.id, {
        footer_settings: footerConfig
      });

      clog('✅ Current footer configuration saved as system default');

      // Show success message (you can replace with toast if available)
      alert('כותרת תחתונה נשמרה כברירת מחדל למערכת');
    } catch (error) {
      cerror('Error saving footer settings as default:', error);
      alert('שגיאה בשמירת הגדרות ברירת המחדל');
    }
  };

  const handleApplyTemplate = async (templateId) => {
    if (!templateId) return;

    try {
      const template = templates.find(t => t.id === parseInt(templateId));
      if (!template) {
        cerror('Template not found:', templateId);
        return;
      }

      clog('🎨 Applying template:', template);

      // Apply template configuration while preserving system text content
      const newConfig = {
        ...template.template_data,
        text: {
          ...template.template_data.text,
          content: copyrightText // Always preserve system copyright text
        },
        logo: {
          ...template.template_data.logo,
          url: logo // Use the logo from assets
        }
      };

      clog('🎨 Template applied config:', newConfig);
      setFooterConfig(newConfig);
      setSelectedTemplateId(templateId);

      // Clear any selected item
      setSelectedItem(null);
      setFocusedItem(null);

      clog(`✅ Applied template: ${template.name}`);
    } catch (error) {
      cerror('Error applying template:', error);
    }
  };

  const handleClose = () => {
    // Reset to loaded settings on close without saving
    setCurrentPage(1);

    // Reset to the originally loaded config
    if (initialFooterConfig) {
      setFooterConfig({
        ...initialFooterConfig,
        text: { ...initialFooterConfig.text, content: copyrightText },
        logo: { ...initialFooterConfig.logo, url: logo }
      });
    } else if (loadedFooterSettings) {
      setFooterConfig({
        logo: { ...loadedFooterSettings.logo, url: logo },
        text: { ...loadedFooterSettings.text, content: copyrightText },
        url: { ...loadedFooterSettings.url }
      });
    } else {
      setFooterConfig(getDefaultConfig(copyrightText));
    }

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-[98vw] max-h-[98vh] p-0 gap-0" dir="rtl">
        <DialogTitle className="sr-only">תצוגה מקדימה - כותרת תחתונה</DialogTitle>
        <DialogDescription className="sr-only">
          תצוגה מקדימה של קובץ PDF עם כותרת תחתונה של זכויות יוצרים
        </DialogDescription>
        <div className="flex flex-col h-[98vh]">
          {/* Modern Header with gradient */}
          <div className="px-6 py-4 border-b flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">עיצוב כותרת תחתונה</h2>
              <p className="text-sm text-gray-600 mt-1">התאם אישית את מיקום ועיצוב הכותרת התחתונה</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Template Picker */}
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-purple-600" />
                <Select
                  value={selectedTemplateId || ""}
                  onValueChange={handleApplyTemplate}
                  disabled={isLoadingTemplates}
                >
                  <SelectTrigger className="w-40 text-sm border-purple-300 text-purple-700 hover:bg-purple-50">
                    <SelectValue placeholder="בחר תבנית" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.length > 0 ? (
                      templates.map((template) => (
                        <SelectItem key={template.id} value={template.id.toString()}>
                          {template.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        {isLoadingTemplates ? 'טוען תבניות...' : 'אין תבניות זמינות'}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleReset} variant="outline" className="gap-2 border-orange-300 text-orange-700 hover:bg-orange-50">
                <RotateCcw className="w-4 h-4" />
                איפוס להגדרות ברירת מחדל
              </Button>
              {(userRole === 'admin' || userRole === 'sysadmin') && (
                <Button
                  onClick={handleSaveAsDefault}
                  variant="outline"
                  className="gap-2 border-green-300 text-green-700 hover:bg-green-50"
                >
                  <Save className="w-4 h-4" />
                  שמור כברירת מחדל למערכת
                </Button>
              )}
              <Button onClick={handleSave} className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-md">
                <Save className="w-4 h-4" />
                שמור שינויים
              </Button>
              <Button onClick={handleClose} variant="outline" className="gap-2">
                <X className="w-4 h-4" />
                ביטול
              </Button>
            </div>
          </div>

          {/* Main content area - responsive layout */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* PDF Preview - responsive width */}
            <div className="flex-1 flex flex-col bg-gray-100 p-4 lg:p-6 overflow-hidden">
              {pdfBlobUrl ? (
                <PdfCanvasWithFooter
                  pdfUrl={pdfBlobUrl}
                  footerConfig={footerConfig}
                  onPageChange={setCurrentPage}
                  onFooterConfigChange={handleConfigChange}
                  focusedItem={focusedItem}
                  currentPage={currentPage}
                />
              ) : isLoadingSettings ? (
                <div className="flex items-center justify-center h-full">
                  <LudoraLoadingSpinner />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center p-8 bg-white rounded-lg shadow-sm border border-gray-200 max-w-md">
                    <div className="text-6xl mb-4">📄</div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">אין קובץ PDF להצגה</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      תוכל לערוך את הגדרות הכותרת התחתונה באמצעות הפאנל מצד ימין.
                      לאחר שתעלה קובץ PDF תוכל לראות תצוגה מקדימה מלאה.
                    </p>
                    <p className="text-xs text-gray-500">
                      השינויים יישמרו גם ללא קובץ PDF קיים
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Item Buttons Sidebar - collapsible on mobile */}
            <div className="w-full lg:w-80">
              <ItemButtons
                footerConfig={footerConfig}
                onItemClick={handleItemClick}
                selectedItem={selectedItem}
                userRole={userRole}
                onCenterX={handleCenterX}
                onCenterY={handleCenterY}
                onAddElement={handleAddElement}
              />
            </div>
          </div>

          {/* Floating Settings Menu */}
          <FloatingSettingsMenu
            selectedItem={selectedItem}
            footerConfig={footerConfig}
            onConfigChange={updateConfig}
            onStyleChange={updateStyle}
            userRole={userRole}
            onClose={handleMenuClose}
            onDeleteElement={handleDeleteElement}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PdfFooterPreview;

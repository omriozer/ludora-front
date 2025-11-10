import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Save, Palette, Undo2, Redo2 } from 'lucide-react';
import logo from '@/assets/images/logo.png';
import TemplateCanvas from './TemplateCanvas';
import ItemButtons from './ItemButtons';
import EnhancedSidebar from './EnhancedSidebar';
import FloatingSettingsMenu from './FloatingSettingsMenu';
import { apiDownload, apiRequest } from '@/services/apiClient';
import LudoraLoadingSpinner from '@/components/ui/LudoraLoadingSpinner';
import { clog, cerror } from '@/lib/utils';
import { getTextFontFamily, containsHebrew } from '@/utils/hebrewUtils';


const VisualTemplateEditor = ({
  isOpen,
  onClose,
  onSave,
  fileEntityId,
  userRole,
  initialFooterConfig,
  targetFormat = 'pdf-a4-portrait', // Default to portrait if not specified
  templateType = 'branding', // Default to footer if not specified
  currentTemplateId = null, // ID of currently selected template to show as selected
  onTemplateChange = null // Callback when template selection changes in editor
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
  const [selectedTemplateId, setSelectedTemplateId] = useState(currentTemplateId);
  const [pendingTemplateId, setPendingTemplateId] = useState(null);
  const [showTemplateConfirmation, setShowTemplateConfirmation] = useState(false);
  const [hasCustomChanges, setHasCustomChanges] = useState(false);
  const [showCustomConfirmation, setShowCustomConfirmation] = useState(false);
  const [initialTemplateConfig, setInitialTemplateConfig] = useState(null);

  // Undo/Redo state - Snapshot-based
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [isUndoRedoAction, setIsUndoRedoAction] = useState(false);
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState(null);
  const changeTimeoutRef = useRef(null);

  // Enhanced UI state
  const [groups, setGroups] = useState({});
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Placeholder PDF caching for template mode
  const [placeholderPdfUrl, setPlaceholderPdfUrl] = useState(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);

  const getDefaultConfig = (copyrightTextValue) => {
    const config = {
      logo: {
        visible: true,
        url: logo,
        position: { x: 50, y: 75 }, // Moved up from 95% to 75% for better visibility
        style: {
          size: 80,
          opacity: 100
        }
      },
      text: {
        visible: true,
        content: copyrightTextValue || '',
        position: { x: 50, y: 82 }, // Moved up from 90% to 82% for better visibility
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
        position: { x: 50, y: 88 }, // Moved up from 85% to 88% for better visibility
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

  const getDefaultWatermarkConfig = () => {
    const config = {
      textElements: [
        {
          id: 'watermark-text-1',
          content: 'לתצוגה בלבד',
          position: { x: 50, y: 50 },
          style: {
            fontSize: 24,
            color: '#FF6B6B',
            opacity: 40,
            rotation: 45,
            fontFamily: 'Arial, sans-serif',
            bold: true
          },
          pattern: 'single',
          visible: true
        }
      ],
      logoElements: [
        {
          id: 'watermark-logo-1',
          source: 'system-logo',
          url: logo,
          position: { x: 85, y: 15 },
          style: {
            size: 60,
            opacity: 30,
            rotation: 0
          },
          pattern: 'single',
          visible: true  // Show logo by default
        }
      ],
      globalSettings: {
        layerBehindContent: false,
        preserveReadability: true
      }
    };
    clog('🔮 getDefaultWatermarkConfig created:', config);
    return config;
  };

  // Adapter functions to convert between watermark structure and footer/header structure
  const convertWatermarkToFooterStructure = (watermarkConfig) => {
    if (!watermarkConfig) return { customElements: {} };

    const customElements = {};

    // Convert text elements
    if (watermarkConfig.textElements) {
      watermarkConfig.textElements.forEach((textElement) => {
        customElements[textElement.id] = {
          id: textElement.id,
          type: 'free-text',  // Use free-text as the primary type for UI
          visible: textElement.visible !== false,
          position: textElement.position,
          style: textElement.style,
          content: textElement.content,
          deletable: true
        };
      });
    }

    // Convert logo elements
    if (watermarkConfig.logoElements) {
      watermarkConfig.logoElements.forEach((logoElement) => {
        customElements[logoElement.id] = {
          id: logoElement.id,
          type: 'watermark-logo',  // Keep watermark-logo for watermark templates
          visible: logoElement.visible !== false,
          position: logoElement.position,
          style: logoElement.style,
          url: logoElement.url,
          deletable: true
        };
      });
    }

    const result = {
      // Built-in elements work exactly the same as footer/header templates
      logo: {
        visible: true,
        url: logo,
        position: { x: 15, y: 15 },
        style: { size: 60, opacity: 30 }
      },
      text: {
        visible: true,
        content: 'לתצוגה בלבד',
        position: { x: 50, y: 90 },
        style: {
          fontSize: 16,
          color: '#FF6B6B',
          bold: true,
          italic: false,
          opacity: 40
        }
      },
      url: {
        visible: true,
        href: 'https://ludora.app',
        position: { x: 50, y: 95 },
        style: {
          fontSize: 12,
          color: '#0066cc',
          bold: false,
          italic: false,
          opacity: 100
        }
      },
      customElements,
      globalSettings: watermarkConfig.globalSettings || {
        layerBehindContent: false,
        preserveReadability: true
      }
    };

    clog('🔄 Converted watermark to footer structure:', { input: watermarkConfig, output: result });
    return result;
  };

  const convertFooterToWatermarkStructure = (footerConfig) => {
    if (!footerConfig) return getDefaultWatermarkConfig();

    const textElements = [];
    const logoElements = [];

    // Convert custom elements back to watermark elements
    Object.entries(footerConfig.customElements || {}).forEach(([id, element]) => {
      if (element.type === 'watermark-text' || element.type === 'free-text') {
        textElements.push({
          id: id,
          content: element.content || '',
          position: element.position,
          style: element.style,
          pattern: 'single',
          visible: element.visible !== false
        });
      } else if (element.type === 'watermark-logo' || element.type === 'logo') {
        logoElements.push({
          id: id,
          url: element.url || '',
          position: element.position,
          style: element.style,
          visible: element.visible !== false
        });
      }
    });

    const result = {
      textElements,
      logoElements,
      globalSettings: footerConfig.globalSettings || {
        layerBehindContent: false,
        preserveReadability: true
      }
    };

    clog('🔄 Converted footer to watermark structure:', { input: footerConfig, output: result });
    return result;
  };

  const [footerConfig, setFooterConfig] = useState(getDefaultConfig(''));

  // Snapshot-based Undo/Redo System
  const saveSnapshot = (config) => {
    if (isUndoRedoAction) return;

    const snapshot = JSON.parse(JSON.stringify(config));

    // Only save if this snapshot is different from the last saved one
    if (lastSavedSnapshot && JSON.stringify(lastSavedSnapshot) === JSON.stringify(snapshot)) {
      return;
    }

    setUndoStack(prev => {
      const newStack = [...prev];

      // Add the last saved snapshot to undo stack (not the current one)
      if (lastSavedSnapshot) {
        newStack.push(JSON.parse(JSON.stringify(lastSavedSnapshot)));
      }

      // Keep only last 10 snapshots
      if (newStack.length > 10) {
        newStack.shift();
      }

      clog('📸 Snapshot saved to undo stack. Stack length:', newStack.length);
      return newStack;
    });

    setLastSavedSnapshot(snapshot);
    setRedoStack([]); // Clear redo stack when new changes are made
  };

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  const handleUndo = () => {
    if (!canUndo) {
      clog('↶ Cannot undo - undo stack is empty');
      return;
    }

    setIsUndoRedoAction(true);

    const previousSnapshot = undoStack[undoStack.length - 1];
    clog('↶ Undo: Restoring snapshot');

    // Save current state to redo stack
    setRedoStack(prev => [...prev, JSON.parse(JSON.stringify(footerConfig))]);

    // Remove last snapshot from undo stack
    setUndoStack(prev => prev.slice(0, -1));

    // Update the last saved snapshot
    setLastSavedSnapshot(JSON.parse(JSON.stringify(previousSnapshot)));

    // Apply the previous snapshot
    setFooterConfig(JSON.parse(JSON.stringify(previousSnapshot)));

    setTimeout(() => setIsUndoRedoAction(false), 100);
  };

  const handleRedo = () => {
    if (!canRedo) {
      clog('↷ Cannot redo - redo stack is empty');
      return;
    }

    setIsUndoRedoAction(true);

    const nextSnapshot = redoStack[redoStack.length - 1];
    clog('↷ Redo: Restoring snapshot');

    // Save current state to undo stack
    setUndoStack(prev => [...prev, JSON.parse(JSON.stringify(footerConfig))]);

    // Remove last snapshot from redo stack
    setRedoStack(prev => prev.slice(0, -1));

    // Update the last saved snapshot
    setLastSavedSnapshot(JSON.parse(JSON.stringify(nextSnapshot)));

    // Apply the next snapshot
    setFooterConfig(JSON.parse(JSON.stringify(nextSnapshot)));

    setTimeout(() => setIsUndoRedoAction(false), 100);
  };

  const clearHistory = () => {
    setUndoStack([]);
    setRedoStack([]);
    setLastSavedSnapshot(null);
    clog('🗑️ History cleared');
  };

  // Debounced change detection - wait for changes to settle
  const scheduleSnapshotSave = () => {
    if (isUndoRedoAction) return;

    // Clear any existing timeout
    if (changeTimeoutRef.current) {
      clearTimeout(changeTimeoutRef.current);
    }

    // Schedule a snapshot save after changes settle (1 second delay)
    changeTimeoutRef.current = setTimeout(() => {
      clog('⏱️ Changes settled, saving snapshot');
      saveSnapshot(footerConfig);
    }, 1000);
  };

  // Check if current config differs from initial template config
  const hasConfigChangesFromTemplate = () => {
    if (!initialTemplateConfig || !footerConfig) return false;

    // Compare the current config with the initial template config
    const currentJson = JSON.stringify(footerConfig);
    const initialJson = JSON.stringify(initialTemplateConfig);

    return currentJson !== initialJson;
  };

  // Track footerConfig changes with debounced snapshot saving and custom changes detection
  useEffect(() => {
    if (!isUndoRedoAction && footerConfig && Object.keys(footerConfig).length > 0) {
      scheduleSnapshotSave();

      // Check if we now have custom changes
      const hasChanges = hasConfigChangesFromTemplate();
      if (hasChanges !== hasCustomChanges) {
        setHasCustomChanges(hasChanges);

        // If we now have custom changes and still have a template selected, show custom confirmation
        if (hasChanges && selectedTemplateId && selectedTemplateId !== 'custom' && !showCustomConfirmation) {
          setShowCustomConfirmation(true);
        }
      }
    }

    // Cleanup timeout on unmount
    return () => {
      if (changeTimeoutRef.current) {
        clearTimeout(changeTimeoutRef.current);
      }
    };
  }, [footerConfig, hasCustomChanges, initialTemplateConfig, selectedTemplateId]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyboard = (e) => {
      // Only handle if the modal is open
      if (!isOpen) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
    };

    document.addEventListener('keydown', handleKeyboard);
    return () => document.removeEventListener('keydown', handleKeyboard);
  }, [isOpen, canUndo, canRedo]);

  // Fetch system footer settings when modal opens
  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        setIsLoadingSettings(true);
        try {
          // Fetch full footer settings from system
          clog('Fetching system footer settings...');
          const settingsResponse = await apiRequest('/entities/settings');
          clog('Raw settings response:', settingsResponse);
          const settings = Array.isArray(settingsResponse) ? settingsResponse[0] : settingsResponse;
          clog('Parsed settings object:', settings);

          let finalConfig;

          if (templateType === 'watermark') {
            // Handle watermark templates - use same structure as footer/header
            if (initialFooterConfig && initialFooterConfig.logo && initialFooterConfig.text && initialFooterConfig.url) {
              // If initialFooterConfig already has proper footer structure, use it directly
              finalConfig = initialFooterConfig;
              setLoadedFooterSettings(initialFooterConfig);
            } else if (initialFooterConfig && (initialFooterConfig.textElements || initialFooterConfig.logoElements)) {
              // Convert old watermark structure to new footer structure
              finalConfig = convertWatermarkToFooterStructure(initialFooterConfig);
              setLoadedFooterSettings(finalConfig);
            } else {
              // Use default footer structure for watermarks
              finalConfig = {
                ...getDefaultConfig(''),
                text: {
                  visible: true,
                  content: 'לתצוגה בלבד',
                  position: { x: 50, y: 50 },
                  style: {
                    fontSize: 24,
                    color: '#FF6B6B',
                    bold: true,
                    italic: false,
                    opacity: 40,
                    width: 300
                  }
                }
              };
            }
            clog('🔧 Watermark config (same as footer structure):', finalConfig);
          } else {
            // Handle footer/header templates
            const systemFooterSettings = settings?.footer_settings || getDefaultConfig('');
            const copyrightText = systemFooterSettings?.text?.content || settings?.copyright_footer_text || '';

            clog('📄 System footer settings:', systemFooterSettings);
            clog('📄 Copyright text extracted:', copyrightText);
            setCopyrightText(copyrightText);

            // Merge with provided initialFooterConfig (file-specific settings)
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
          }

          setFooterConfig(finalConfig);

          // Store initial template configuration for comparison
          setInitialTemplateConfig(JSON.parse(JSON.stringify(finalConfig)));

          // Clear history and set initial snapshot after loading configuration
          clearHistory();
          setTimeout(() => {
            setLastSavedSnapshot(JSON.parse(JSON.stringify(finalConfig)));
          }, 100);
        } catch (error) {
          cerror('Error fetching settings or footer config:', error);
          // Fall back to defaults on error
          setFooterConfig(getDefaultConfig(''));
          setTimeout(() => {
            setLastSavedSnapshot(JSON.parse(JSON.stringify(getDefaultConfig(''))));
          }, 100);
        } finally {
          setIsLoadingSettings(false);
        }
      };

      fetchData();
    }
  }, [isOpen]);

  // Fetch available templates when modal opens
  useEffect(() => {
    if (isOpen) {
      const fetchTemplates = async () => {
        setIsLoadingTemplates(true);
        try {
          clog(`🎨 Fetching available ${templateType} templates...`);
          const response = await apiRequest(`/system-templates?type=${templateType}&format=${targetFormat}`);
          clog('🎨 Raw template API response:', response);

          // Handle different response formats - same logic as TemplateSelector
          let templateList = [];
          if (Array.isArray(response)) {
            templateList = response;
          } else if (response?.success && Array.isArray(response.data)) {
            templateList = response.data;
          } else if (response?.data && Array.isArray(response.data)) {
            templateList = response.data;
          } else {
            clog('⚠️ Unexpected template response format:', response);
            templateList = [];
          }

          clog(`✅ Loaded ${templateList.length} ${templateType} templates:`, templateList);
          setTemplates(templateList);

          // Auto-set the selected template if we have a currentTemplateId
          if (currentTemplateId && templateList.length > 0) {
            const currentTemplate = templateList.find(t => t.id.toString() === currentTemplateId.toString());
            if (currentTemplate) {
              clog(`🎯 Setting current template: ${currentTemplate.name} (ID: ${currentTemplate.id})`);
              setSelectedTemplateId(currentTemplateId.toString());
            } else {
              clog(`⚠️ Current template ID ${currentTemplateId} not found in available templates`);
            }
          } else if (!currentTemplateId && templateList.length > 0) {
            // No current template, try to select default
            const defaultTemplate = templateList.find(t => t.is_default) || templateList[0];
            if (defaultTemplate) {
              clog(`🎯 Auto-selecting default template: ${defaultTemplate.name} (ID: ${defaultTemplate.id})`);
              setSelectedTemplateId(defaultTemplate.id.toString());
            }
          }
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

  // Cache placeholder PDF/SVG for template mode
  useEffect(() => {
    if (isOpen && !placeholderPdfUrl) {
      const fetchPlaceholder = async () => {
        try {
          let placeholderFile;
          let fileType;

          // Choose the appropriate placeholder based on target format
          if (targetFormat === 'svg-lessonplan') {
            placeholderFile = 'template-editor-lessonplan.svg';
            fileType = 'SVG';
          } else if (targetFormat === 'pdf-a4-landscape') {
            placeholderFile = 'preview-not-available-landscape.pdf';
            fileType = 'Landscape PDF';
          } else {
            placeholderFile = 'preview-not-available.pdf';
            fileType = 'Portrait PDF';
          }

          clog(`📄 Fetching ${fileType} placeholder for template mode...`);
          const blob = await apiDownload(`/assets/placeholders/${placeholderFile}`);
          const blobUrl = URL.createObjectURL(blob);
          setPlaceholderPdfUrl(blobUrl);
          clog(`📄 ${fileType} placeholder cached successfully:`, blobUrl);
        } catch (error) {
          cerror('Error fetching placeholder:', error);
        }
      };

      fetchPlaceholder();
    }
  }, [isOpen, placeholderPdfUrl, targetFormat]);

  // Unified PDF fetching logic for both real files and template mode
  useEffect(() => {
    if (isOpen) {
      if (fileEntityId) {
        // Fetch actual file
        const fetchPdf = async () => {
          try {
            setIsLoadingPdf(true);
            clog('Fetching PDF from API for preview:', fileEntityId);

            // Add skipFooter=true to skip backend footer merge (we render our own overlay)
            const blob = await apiDownload(`/assets/download/file/${fileEntityId}?skipFooter=true`);

            const blobUrl = URL.createObjectURL(blob);
            clog('PDF blob URL created:', blobUrl);
            setPdfBlobUrl(blobUrl);
          } catch (error) {
            cerror('Error fetching PDF - will show placeholder:', error);
            // Don't set pdfBlobUrl, will show placeholder message instead
          } finally {
            setIsLoadingPdf(false);
          }
        };

        fetchPdf();
      } else if (placeholderPdfUrl) {
        // Template mode: use cached placeholder PDF
        clog('📄 Using placeholder PDF for template mode:', placeholderPdfUrl);
        setPdfBlobUrl(placeholderPdfUrl);
      }
    }

    // Cleanup only real file blob URLs (keep placeholder cached)
    return () => {
      if (pdfBlobUrl && fileEntityId !== null) {
        URL.revokeObjectURL(pdfBlobUrl);
        setPdfBlobUrl(null);
      }
    };
  }, [isOpen, fileEntityId, placeholderPdfUrl]);

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
    // Generate unique element ID to allow multiple instances
    const timestamp = Date.now();
    const elementId = `${elementType}-${timestamp}`;

    // Create new element - allow multiple instances of any type
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
      case 'free-text':
        return {
          ...baseConfig,
          content: templateType === 'watermark' ? 'לתצוגה בלבד' : 'טקסט חופשי',
          style: {
            fontSize: templateType === 'watermark' ? 24 : 14,
            color: templateType === 'watermark' ? '#FF6B6B' : '#000000',
            opacity: templateType === 'watermark' ? 40 : 100,
            rotation: templateType === 'watermark' ? 45 : 0,
            fontFamily: 'Arial, sans-serif',
            bold: templateType === 'watermark',
            italic: false
          }
        };
      case 'watermark-text':
        return {
          ...baseConfig,
          content: 'לתצוגה בלבד',
          style: {
            fontSize: 24,
            color: '#FF6B6B',
            opacity: 40,
            rotation: 45,
            fontFamily: 'Arial, sans-serif',
            bold: true,
            italic: false
          }
        };
      case 'logo':
      case 'watermark-logo':
        return {
          ...baseConfig,
          url: logo, // Use default logo
          style: {
            size: 80,
            opacity: 60,
            rotation: 0
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

  // Enhanced UI Handler Functions
  const handleToggleVisibility = (elementKey) => {
    let newConfig;

    if (footerConfig.customElements?.[elementKey]) {
      newConfig = {
        ...footerConfig,
        customElements: {
          ...footerConfig.customElements,
          [elementKey]: {
            ...footerConfig.customElements[elementKey],
            visible: !footerConfig.customElements[elementKey].visible
          }
        }
      };
    } else {
      newConfig = {
        ...footerConfig,
        [elementKey]: {
          ...footerConfig[elementKey],
          visible: !footerConfig[elementKey].visible
        }
      };
    }

    setFooterConfig(newConfig);
    clog(`👁️ Toggled visibility for ${elementKey}`);
  };

  const handleLockToggle = (elementKey) => {
    let newConfig;

    if (footerConfig.customElements?.[elementKey]) {
      newConfig = {
        ...footerConfig,
        customElements: {
          ...footerConfig.customElements,
          [elementKey]: {
            ...footerConfig.customElements[elementKey],
            locked: !footerConfig.customElements[elementKey].locked
          }
        }
      };
    } else {
      newConfig = {
        ...footerConfig,
        [elementKey]: {
          ...footerConfig[elementKey],
          locked: !footerConfig[elementKey].locked
        }
      };
    }

    setFooterConfig(newConfig);
    clog(`🔒 Toggled lock for ${elementKey}`);
  };

  const handleDuplicate = (elementKey) => {
    const sourceElement = footerConfig.customElements?.[elementKey] || footerConfig[elementKey];
    if (!sourceElement) return;

    if (footerConfig.customElements?.[elementKey]) {
      // Duplicate custom element
      const newElementId = `${elementKey}_copy_${Date.now()}`;
      const newConfig = {
        ...footerConfig,
        customElements: {
          ...footerConfig.customElements,
          [newElementId]: {
            ...sourceElement,
            id: newElementId,
            position: {
              x: sourceElement.position.x + 10,
              y: sourceElement.position.y + 10
            }
          }
        }
      };
      setFooterConfig(newConfig);
      clog(`📄 Duplicated custom element ${elementKey} as ${newElementId}`);
    } else {
      clog(`⚠️ Cannot duplicate built-in element: ${elementKey}`);
    }
  };

  // Group Management Handlers
  const handleGroupCreate = (elementIds) => {
    const groupId = `group_${Date.now()}`;
    const groupColor = getNextGroupColor();

    const newGroup = {
      id: groupId,
      name: `קבוצה ${Object.keys(groups).length + 1}`,
      color: groupColor,
      created: Date.now()
    };

    // Update elements to belong to this group
    let newConfig = { ...footerConfig };

    elementIds.forEach(elementId => {
      if (newConfig.customElements?.[elementId]) {
        newConfig.customElements[elementId].groupId = groupId;
      } else if (newConfig[elementId]) {
        newConfig[elementId].groupId = groupId;
      }
    });

    setGroups({ ...groups, [groupId]: newGroup });
    setFooterConfig(newConfig);
    setSelectedItems([]);
    clog(`👥 Created group ${groupId} with elements:`, elementIds);
  };

  const getNextGroupColor = () => {
    const colors = ['blue', 'green', 'purple', 'red', 'orange', 'yellow', 'pink', 'indigo'];
    const usedColors = Object.values(groups).map(group => group.color);
    return colors.find(color => !usedColors.includes(color)) || colors[0];
  };

  const handleGroupUpdate = (groupId, updates) => {
    setGroups({
      ...groups,
      [groupId]: {
        ...groups[groupId],
        ...updates
      }
    });
    clog(`📝 Updated group ${groupId}:`, updates);
  };

  const handleGroupDelete = (groupId) => {
    // Remove group reference from all elements
    let newConfig = { ...footerConfig };

    Object.keys(newConfig.customElements || {}).forEach(elementId => {
      if (newConfig.customElements[elementId].groupId === groupId) {
        delete newConfig.customElements[elementId].groupId;
      }
    });

    ['logo', 'text', 'url'].forEach(elementKey => {
      if (newConfig[elementKey]?.groupId === groupId) {
        delete newConfig[elementKey].groupId;
      }
    });

    const newGroups = { ...groups };
    delete newGroups[groupId];

    setGroups(newGroups);
    setFooterConfig(newConfig);
    setSelectedGroupId(null);
    clog(`🗑️ Deleted group ${groupId}`);
  };

  const handleGroupToggleVisibility = (groupId) => {
    const groupElements = getGroupElements(groupId);
    const allVisible = groupElements.every(([, element]) => element.visible !== false);

    let newConfig = { ...footerConfig };

    groupElements.forEach(([elementId]) => {
      if (newConfig.customElements?.[elementId]) {
        newConfig.customElements[elementId].visible = !allVisible;
      } else if (newConfig[elementId]) {
        newConfig[elementId].visible = !allVisible;
      }
    });

    setFooterConfig(newConfig);
    clog(`👁️ Toggled visibility for group ${groupId}: ${!allVisible ? 'show' : 'hide'}`);
  };

  const handleGroupToggleLock = (groupId) => {
    const groupElements = getGroupElements(groupId);
    const allLocked = groupElements.every(([, element]) => element.locked);

    let newConfig = { ...footerConfig };

    groupElements.forEach(([elementId]) => {
      if (newConfig.customElements?.[elementId]) {
        newConfig.customElements[elementId].locked = !allLocked;
      } else if (newConfig[elementId]) {
        newConfig[elementId].locked = !allLocked;
      }
    });

    setFooterConfig(newConfig);
    clog(`🔒 Toggled lock for group ${groupId}: ${!allLocked ? 'lock' : 'unlock'}`);
  };

  const handleGroupDuplicate = (groupId) => {
    const groupElements = getGroupElements(groupId);
    const newGroupId = `group_${Date.now()}`;
    const newGroup = {
      ...groups[groupId],
      id: newGroupId,
      name: `${groups[groupId].name} (עותק)`,
      created: Date.now()
    };

    let newConfig = { ...footerConfig };

    groupElements.forEach(([elementId, element]) => {
      if (newConfig.customElements?.[elementId]) {
        const newElementId = `${elementId}_copy_${Date.now()}`;
        newConfig.customElements[newElementId] = {
          ...element,
          id: newElementId,
          groupId: newGroupId,
          position: {
            x: element.position.x + 10,
            y: element.position.y + 10
          }
        };
      }
    });

    setGroups({ ...groups, [newGroupId]: newGroup });
    setFooterConfig(newConfig);
    clog(`📄 Duplicated group ${groupId} as ${newGroupId}`);
  };

  const handleElementAddToGroup = (elementId, groupId) => {
    let newConfig = { ...footerConfig };

    if (newConfig.customElements?.[elementId]) {
      newConfig.customElements[elementId].groupId = groupId;
    } else if (newConfig[elementId]) {
      newConfig[elementId].groupId = groupId;
    }

    setFooterConfig(newConfig);
    clog(`➕ Added element ${elementId} to group ${groupId}`);
  };

  const handleElementRemoveFromGroup = (elementId, groupId) => {
    let newConfig = { ...footerConfig };

    if (newConfig.customElements?.[elementId]) {
      delete newConfig.customElements[elementId].groupId;
    } else if (newConfig[elementId]) {
      delete newConfig[elementId].groupId;
    }

    setFooterConfig(newConfig);
    clog(`➖ Removed element ${elementId} from group ${groupId}`);
  };

  const handleGroupSelect = (groupId) => {
    setSelectedGroupId(groupId);
    setSelectedItem(null);
    clog(`🎯 Selected group ${groupId}`);
  };

  const getGroupElements = (groupId) => {
    const elements = [];

    // Check custom elements
    Object.entries(footerConfig.customElements || {}).forEach(([elementId, element]) => {
      if (element.groupId === groupId) {
        elements.push([elementId, element]);
      }
    });

    // Check built-in elements
    ['logo', 'text', 'url'].forEach(elementKey => {
      if (footerConfig[elementKey]?.groupId === groupId) {
        elements.push([elementKey, footerConfig[elementKey]]);
      }
    });

    return elements;
  };


  // Multi-selection Handlers
  const handleSelectionChange = (items) => {
    setSelectedItems(items);
    clog(`🎯 Selection changed:`, items);
  };

  const handleBulkAction = (operation, data) => {
    switch (operation) {
      case 'group':
        handleGroupCreate(data);
        break;
      case 'ungroup':
        data.forEach(elementId => {
          const element = footerConfig.customElements?.[elementId] || footerConfig[elementId];
          if (element?.groupId) {
            handleElementRemoveFromGroup(elementId, element.groupId);
          }
        });
        break;
      case 'duplicate':
        data.forEach(elementId => handleDuplicate(elementId));
        break;
      case 'delete':
        data.forEach(elementId => handleDeleteElement(elementId));
        break;
      case 'lock':
        data.forEach(elementId => {
          const element = footerConfig.customElements?.[elementId] || footerConfig[elementId];
          if (!element?.locked) handleLockToggle(elementId);
        });
        break;
      case 'unlock':
        data.forEach(elementId => {
          const element = footerConfig.customElements?.[elementId] || footerConfig[elementId];
          if (element?.locked) handleLockToggle(elementId);
        });
        break;
      case 'show':
        data.forEach(elementId => {
          const element = footerConfig.customElements?.[elementId] || footerConfig[elementId];
          if (!element?.visible) handleToggleVisibility(elementId);
        });
        break;
      case 'hide':
        data.forEach(elementId => {
          const element = footerConfig.customElements?.[elementId] || footerConfig[elementId];
          if (element?.visible !== false) handleToggleVisibility(elementId);
        });
        break;
      case 'alignLeft':
        data.forEach(elementId => {
          // Align all selected elements to the leftmost position
          const positions = data.map(id => {
            const element = footerConfig.customElements?.[id] || footerConfig[id];
            return element?.position?.x || 0;
          });
          const leftmostX = Math.min(...positions);

          let newConfig = { ...footerConfig };
          if (newConfig.customElements?.[elementId]) {
            newConfig.customElements[elementId].position.x = leftmostX;
          } else if (newConfig[elementId]) {
            newConfig[elementId].position.x = leftmostX;
          }
          setFooterConfig(newConfig);
        });
        break;
      case 'alignTop':
        data.forEach(elementId => {
          // Align all selected elements to the topmost position
          const positions = data.map(id => {
            const element = footerConfig.customElements?.[id] || footerConfig[id];
            return element?.position?.y || 0;
          });
          const topmostY = Math.min(...positions);

          let newConfig = { ...footerConfig };
          if (newConfig.customElements?.[elementId]) {
            newConfig.customElements[elementId].position.y = topmostY;
          } else if (newConfig[elementId]) {
            newConfig[elementId].position.y = topmostY;
          }
          setFooterConfig(newConfig);
        });
        break;
      case 'alignCenter':
        // Center all elements horizontally at 50%
        data.forEach(elementId => handleCenterX(elementId));
        break;
      default:
        clog(`⚠️ Unknown bulk operation: ${operation}`);
    }
  };


  const handleSave = async () => {
    try {
      let configToSave;

      if (templateType === 'watermark') {
        // Save watermark config using same structure as footer/header
        configToSave = footerConfig;
        clog('💾 Save: watermark config being saved (same structure):', configToSave);
      } else {
        // Save footer/header config as-is
        configToSave = footerConfig;
        clog('💾 Save: footerConfig being saved:', configToSave);
        clog('💾 Save: text content being saved:', footerConfig.text?.content);

        // Check if copyright text has changed and update system settings if needed
        if (footerConfig.text?.content !== copyrightText) {
          clog('💾 Save: Copyright text changed, updating system settings...');
          const { Settings: SettingsEntity } = await import('@/services/entities');

          // Update system settings with new copyright text
          await SettingsEntity.update(1, {
            copyright_footer_text: footerConfig.text.content
          });

          clog('✅ Save: System settings updated with new copyright text');
        }
      }

      // Save configuration to working file/custom template
      // If we have custom changes, save as custom template data
      // If using system template, clear custom template data
      if (onSave) {
        if (selectedTemplateId === 'custom' || hasCustomChanges) {
          // Save as custom template data for this product
          onSave(configToSave);
        } else {
          // Using system template - call with null to clear custom data
          onSave(null);
        }
      }

      // Clear history and set snapshot after successful save
      clearHistory();
      setTimeout(() => {
        setLastSavedSnapshot(JSON.parse(JSON.stringify(footerConfig)));
      }, 100);

      onClose();
    } catch (error) {
      cerror('Error saving template settings:', error);
    }
  };

  // Check if there are differences between current config and a template
  const hasConfigDifferences = (templateData) => {
    if (!templateData) return false;

    // Create a comparable version of the current config
    const currentComparable = {
      logo: {
        visible: footerConfig.logo.visible,
        position: footerConfig.logo.position,
        style: footerConfig.logo.style
      },
      text: {
        visible: footerConfig.text.visible,
        position: footerConfig.text.position,
        style: footerConfig.text.style
      },
      url: {
        visible: footerConfig.url.visible,
        href: footerConfig.url.href,
        position: footerConfig.url.position,
        style: footerConfig.url.style
      },
      customElements: footerConfig.customElements || {}
    };

    // Create a comparable version of the template
    const templateComparable = {
      logo: {
        visible: templateData.logo?.visible,
        position: templateData.logo?.position,
        style: templateData.logo?.style
      },
      text: {
        visible: templateData.text?.visible,
        position: templateData.text?.position,
        style: templateData.text?.style
      },
      url: {
        visible: templateData.url?.visible,
        href: templateData.url?.href,
        position: templateData.url?.position,
        style: templateData.url?.style
      },
      customElements: templateData.customElements || {}
    };

    // Compare using JSON stringify (simple but effective for this use case)
    return JSON.stringify(currentComparable) !== JSON.stringify(templateComparable);
  };

  // Get the system default template (assume it's marked with is_default: true)
  const getSystemDefaultTemplate = () => {
    return templates.find(template => template.is_default) || null;
  };

  // Format template display name
  const formatTemplateName = (template) => {
    if (template.is_default) {
      return `${template.name} (ברירת מחדל)`;
    }
    return template.name;
  };

  // Handle template selection with confirmation if needed
  const handleTemplateSelect = (templateId) => {
    if (!templateId) return;

    // Ignore selection of custom template (it's just a display item)
    if (templateId === 'custom') return;

    const template = templates.find(t => t.id === parseInt(templateId));
    if (!template) return;

    // Check if there are differences that would be lost
    if (hasConfigDifferences(template.template_data)) {
      setPendingTemplateId(templateId);
      setShowTemplateConfirmation(true);
    } else {
      // No differences, apply directly
      handleApplyTemplate(templateId);
    }
  };

  // Confirm template application
  const handleConfirmTemplate = () => {
    handleApplyTemplate(pendingTemplateId);
    setShowTemplateConfirmation(false);
    setPendingTemplateId(null);
  };

  // Cancel template application
  const handleCancelTemplate = () => {
    setShowTemplateConfirmation(false);
    setPendingTemplateId(null);
  };

  // Handle custom template creation confirmation
  const handleCustomConfirmCreate = () => {
    setShowCustomConfirmation(false);
    // Set selected template to indicate custom mode
    setSelectedTemplateId('custom');

    // Notify parent component that we've switched to custom mode
    if (onTemplateChange) {
      onTemplateChange(null, null);
    }

    clog('✅ User confirmed custom template creation');
  };

  // Handle custom template creation cancellation (revert to original template)
  const handleCustomConfirmCancel = () => {
    if (initialTemplateConfig) {
      setFooterConfig(JSON.parse(JSON.stringify(initialTemplateConfig)));
      setHasCustomChanges(false);
    }
    setShowCustomConfirmation(false);
    clog('↩️ User cancelled custom changes, reverted to template');
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

      let newConfig;
      if (templateType === 'watermark') {
        // Handle watermark template - use same structure as footer/header
        newConfig = {
          ...template.template_data,
          text: {
            ...template.template_data.text,
            content: template.template_data.text?.content || 'לתצוגה בלבד' // Use watermark text or default
          },
          logo: {
            ...template.template_data.logo,
            url: logo // Use the logo from assets
          }
        };
        clog('🔧 Applied watermark template (same structure):', newConfig);
      } else {
        // Handle footer/header template - use as-is with system content
        newConfig = {
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
        clog('🎨 Applied footer/header template config:', newConfig);
      }

      setFooterConfig(newConfig);

      // Update the selected template ID to reflect the applied template
      setSelectedTemplateId(templateId);

      // Update initial template config for comparison
      setInitialTemplateConfig(JSON.parse(JSON.stringify(newConfig)));

      // Reset custom changes state
      setHasCustomChanges(false);

      // Notify parent component of template change
      if (onTemplateChange) {
        const selectedTemplate = templates.find(t => t.id === parseInt(templateId));
        onTemplateChange(parseInt(templateId), selectedTemplate);
      }

      // Clear any selected item
      setSelectedItem(null);
      setFocusedItem(null);

      // Clear history and set initial snapshot when applying template (new starting point)
      clearHistory();
      setTimeout(() => {
        setLastSavedSnapshot(JSON.parse(JSON.stringify(newConfig)));
      }, 100);

      clog(`✅ Applied template: ${template.name} - now working on independent footer config`);
    } catch (error) {
      cerror('Error applying template:', error);
    }
  };

  // Dynamic title based on template type and target format
  const getPageTitle = () => {
    if (fileEntityId !== null) {
      // Real file mode - different titles based on template type
      switch (templateType) {
        case 'header':
          return 'עיצוב כותרת עליונה';
        case 'watermark':
          return 'עיצוב סימן מים';
        case 'footer':
        default:
          return 'עיצוב כותרת תחתונה';
      }
    } else {
      // Template creation mode - titles based on template type + target format
      const baseTitle = {
        header: 'עיצוב תבנית כותרת עליונה',
        watermark: 'עיצוב תבנית סימן מים',
        footer: 'עיצוב תבנית כותרת תחתונה'
      }[templateType] || 'עיצוב תבנית כותרת תחתונה';

      const formatSuffix = {
        'pdf-a4-portrait': ' (PDF אנכי)',
        'pdf-a4-landscape': ' (PDF אופקי)',
        'svg-lessonplan': ' (SVG מצגת)'
      }[targetFormat] || '';

      return baseTitle + formatSuffix;
    }
  };

  // Dynamic subtitle based on template type and mode
  const getPageSubtitle = () => {
    if (fileEntityId !== null) {
      // Real file mode
      switch (templateType) {
        case 'header':
          return 'התאם אישית את מיקום ועיצוב הכותרת העליונה';
        case 'watermark':
          return 'התאם אישית את מיקום ועיצוב סימן המים';
        case 'footer':
        default:
          return 'התאם אישית את מיקום ועיצוב הכותרת התחתונה';
      }
    } else {
      // Template creation mode
      switch (templateType) {
        case 'header':
          return 'צור ועצב תבנית כותרת עליונה חדשה';
        case 'watermark':
          return 'צור ועצב תבנית סימן מים חדשה';
        case 'footer':
        default:
          return 'צור ועצב תבנית כותרת תחתונה חדשה';
      }
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
              <h2 className="text-2xl font-bold text-gray-800">
                {getPageTitle()}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {getPageSubtitle()}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Undo/Redo Controls */}
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    clog('🔘 Undo button clicked. Can undo:', canUndo, 'Undo stack length:', undoStack.length);
                    handleUndo();
                  }}
                  disabled={!canUndo}
                  className="h-8 w-8 p-0 border-slate-300 hover:bg-slate-50 disabled:opacity-40"
                  title={`בטל פעולה אחרונה (Ctrl+Z) - ${canUndo ? 'זמין' : 'לא זמין'}`}
                >
                  <Undo2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    clog('🔘 Redo button clicked. Can redo:', canRedo, 'Redo stack length:', redoStack.length);
                    handleRedo();
                  }}
                  disabled={!canRedo}
                  className="h-8 w-8 p-0 border-slate-300 hover:bg-slate-50 disabled:opacity-40"
                  title={`חזור על פעולה (Ctrl+Y) - ${canRedo ? 'זמין' : 'לא זמין'}`}
                >
                  <Redo2 className="w-4 h-4" />
                </Button>
              </div>

              {/* Template Picker */}
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-purple-600" />
                <Select
                  value={selectedTemplateId || ""}
                  onValueChange={handleTemplateSelect}
                  disabled={isLoadingTemplates}
                >
                  <SelectTrigger className="w-40 text-sm border-purple-300 text-purple-700 hover:bg-purple-50">
                    <SelectValue placeholder="בחר תבנית" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedTemplateId === 'custom' && (
                      <SelectItem value="custom">
                        <div className="flex items-center gap-2">
                          <span className="text-orange-600">🎨</span>
                          <span>תבנית מותאמת אישית</span>
                        </div>
                      </SelectItem>
                    )}
                    {templates.length > 0 ? (
                      templates.map((template) => (
                        <SelectItem key={template.id} value={template.id.toString()}>
                          {formatTemplateName(template)}
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
                <TemplateCanvas
                  pdfUrl={pdfBlobUrl}
                  footerConfig={footerConfig}
                  onPageChange={setCurrentPage}
                  onFooterConfigChange={handleConfigChange}
                  focusedItem={focusedItem}
                  currentPage={currentPage}
                  groups={groups}
                  targetFormat={targetFormat} // Pass format for correct display dimensions
                  templateType={templateType} // Pass template type for correct rendering
                />
              ) : (isLoadingSettings || isLoadingPdf) ? (
                <div className="flex items-center justify-center h-full">
                  <LudoraLoadingSpinner />
                  <span className="mr-2">
                    {isLoadingPdf ? 'טוען קובץ PDF...' : 'טוען הגדרות...'}
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center p-8 bg-white rounded-lg shadow-sm border border-gray-200 max-w-md">
                    <div className="text-6xl mb-4">📄</div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                      {fileEntityId === null ? 'טוען תבנית עיצוב...' : 'אין קובץ PDF להצגה'}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      {fileEntityId === null
                        ? 'טוען קובץ PDF לדוגמה עבור עיצוב התבנית...'
                        : 'תוכל לערוך את הגדרות הכותרת התחתונה באמצעות הפאנל מצד ימין. לאחר שתעלה קובץ PDF תוכל לראות תצוגה מקדימה מלאה.'
                      }
                    </p>
                    <p className="text-xs text-gray-500">
                      השינויים יישמרו גם ללא קובץ PDF קיים
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Enhanced Sidebar - modern tabbed interface */}
            <div className="w-full lg:w-80">
              <EnhancedSidebar
                footerConfig={footerConfig}
                onItemClick={handleItemClick}
                selectedItem={selectedItem}
                userRole={userRole}
                onCenterX={handleCenterX}
                onCenterY={handleCenterY}
                onAddElement={handleAddElement}
                onToggleVisibility={handleToggleVisibility}
                onLockToggle={handleLockToggle}
                onDuplicate={handleDuplicate}
                onDelete={handleDeleteElement}

                groups={groups}
                onGroupCreate={handleGroupCreate}
                onGroupUpdate={handleGroupUpdate}
                onGroupDelete={handleGroupDelete}
                onGroupToggleVisibility={handleGroupToggleVisibility}
                onGroupToggleLock={handleGroupToggleLock}
                onGroupDuplicate={handleGroupDuplicate}
                onElementAddToGroup={handleElementAddToGroup}
                onElementRemoveFromGroup={handleElementRemoveFromGroup}
                onGroupSelect={handleGroupSelect}
                selectedGroupId={selectedGroupId}


                selectedItems={selectedItems}
                onSelectionChange={handleSelectionChange}
                onBulkAction={handleBulkAction}

                templateType={templateType}
                isOpen={sidebarOpen}
                onToggleOpen={() => setSidebarOpen(!sidebarOpen)}
                position="right"
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
            templateType={templateType}
          />
        </div>
      </DialogContent>

      {/* Template Confirmation Dialog */}
      {showTemplateConfirmation && pendingTemplateId && (
        <Dialog open={showTemplateConfirmation} onOpenChange={handleCancelTemplate}>
          <DialogContent className="max-w-md" dir="rtl">
            <DialogTitle>החלפת תבנית</DialogTitle>
            <DialogDescription>
              בחירת תבנית חדשה תמחק את השינויים הנוכחיים בעיצוב הכותרת התחתונה.
              <br /><br />
              האם אתה בטוח שברצונך להמשיך?
            </DialogDescription>
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={handleCancelTemplate}>
                ביטול
              </Button>
              <Button variant="destructive" onClick={handleConfirmTemplate}>
                החלף תבנית
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Custom Template Confirmation Dialog */}
      {showCustomConfirmation && (
        <Dialog open={showCustomConfirmation} onOpenChange={handleCustomConfirmCancel}>
          <DialogContent className="max-w-lg" dir="rtl">
            <DialogTitle>יצירת תבנית מותאמת אישית</DialogTitle>
            <DialogDescription>
              שינוי התבנית יצור תבנית מותאמת אישית עבור {templateType === 'watermark' ? 'סימן מים' : 'מיתוג'} זה בלבד.
              <br /><br />
              <strong>שינויים בתבנית המותאמת:</strong>
              <br />• ישמרו עבור המוצר הזה בלבד
              <br />• לא ישפיעו על תבניות אחרות במערכת
              <br />• יהיו ניתנים לעדכון ידני בלבד
              <br /><br />
              האם תרצה להמשיך ליצור תבנית מותאמת אישית?
            </DialogDescription>
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={handleCustomConfirmCancel}>
                בטל וחזור לתבנית המקורית
              </Button>
              <Button onClick={handleCustomConfirmCreate} className="bg-orange-600 hover:bg-orange-700">
                צור תבנית מותאמת אישית
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
};

export default VisualTemplateEditor;

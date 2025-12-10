import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Save, Palette, Undo2, Redo2, Eye, EyeOff, Layers, Trash2 } from 'lucide-react';
import LogoDisplay from '@/components/ui/LogoDisplay';
import TemplateCanvas from './TemplateCanvas';
import ItemButtons from './ItemButtons';
import EnhancedSidebar from './EnhancedSidebar';
import FloatingSettingsMenu from './FloatingSettingsMenu';
import { apiDownload, apiRequest } from '@/services/apiClient';
import LudoraLoadingSpinner from '@/components/ui/LudoraLoadingSpinner';
import { ludlog, luderror } from '@/lib/ludlog';
import { getTextFontFamily, containsHebrew } from '@/utils/hebrewUtils';
import { useUser } from '@/contexts/UserContext';


const VisualTemplateEditor = ({
  isOpen,
  onClose,
  onSave,
  fileEntityId,
  userRole,
  currentUser = null, // Current user object for email template resolution
  initialTemplateConfig: propInitialTemplateConfig,
  targetFormat = 'pdf-a4-portrait', // Default to portrait if not specified
  templateType = 'branding', // Default to branding if not specified
  currentTemplateId = null, // ID of currently selected template to show as selected
  onTemplateChange = null, // Callback when template selection changes in editor
  fileEntity = null // File entity with target_format for template filtering
}) => {
  // Get global settings from UserContext
  const { settings } = useUser();

  const [currentPage, setCurrentPage] = useState(1);
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);

  // SVG slide navigation state
  const [availableSlides, setAvailableSlides] = useState([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [totalSlides, setTotalSlides] = useState(0);
  const [preloadedSlides, setPreloadedSlides] = useState({}); // Cache for preloaded slide blobs
  const [copyrightText, setCopyrightText] = useState('');
  const [loadedBrandingSettings, setLoadedBrandingSettings] = useState(null);
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
  const [isPdfDocumentLoaded, setIsPdfDocumentLoaded] = useState(false); // Track actual PDF rendering state

  // File content visibility toggle state
  const [showFileContent, setShowFileContent] = useState(true);

  // Template elements visibility toggle state (visual only, no changes)
  const [showTemplateElements, setShowTemplateElements] = useState(true);

  // Clear all elements confirmation dialog state
  const [showClearAllConfirmation, setShowClearAllConfirmation] = useState(false);

  const getDefaultConfig = () => {
    // Start with completely blank canvas for unified editor
    const config = {
      customElements: {},
      globalSettings: {
        layerBehindContent: false,
        preserveReadability: true
      }
    };
    // Reduced logging: ludlog.ui('📝 getDefaultConfig - returning blank canvas for unified editor:', { data: config });
    return config;
  };

  const getDefaultWatermarkConfig = () => {
    // Start with completely blank canvas for unified editor (same as branding)
    const config = {
      customElements: {},
      globalSettings: {
        layerBehindContent: false,
        preserveReadability: true
      }
    };
    // Reduced logging: ludlog.ui('🔮 getDefaultWatermarkConfig - returning blank canvas for unified editor:', { data: config });
    return config;
  };

  // SIMPLIFIED: Only unified structure is supported now
  // Legacy conversion functions removed - all templates use unified elements structure

  const [templateConfig, setTemplateConfig] = useState(getDefaultConfig());

  // Calculate effective format once at component level
  // Use fileEntity target_format if available, fallback to prop targetFormat
  const effectiveFormat = fileEntity?.target_format || targetFormat;

  // Preload all slides for faster navigation
  const preloadAllSlides = async (slides, entityId) => {
    try {
      // Reduced logging: ludlog.ui('🚀 Starting to preload all slides...', { data: slides.length, 'slides' });
      const slideBlobs = {};

      // Process all slides in parallel
      const processPromises = slides.map(async (slide, index) => {
        try {
          let blobUrl;

          // Check if slide has content from preview endpoint (preferred method)
          if (slide.content && slide.content.trim()) {
            // Create blob URL from SVG content directly (no download needed)
            const blob = new Blob([slide.content], { type: 'image/svg+xml' });
            blobUrl = URL.createObjectURL(blob);
            // Reduced logging: ludlog.ui(`✅ Preloaded slide ${index + 1}/${slides.length} from content:`, { data: slide.id });
          } else {
            // Fallback: download individual slide file (should rarely happen)
            const slideBlob = await apiDownload(`/assets/download/lesson-plan-slide/${entityId}/${slide.id}`);
            blobUrl = URL.createObjectURL(slideBlob);
            // Reduced logging: ludlog.ui(`✅ Preloaded slide ${index + 1}/${slides.length} from download:`, { data: slide.id });
          }

          slideBlobs[index] = blobUrl;
          return { index, blobUrl };
        } catch (error) {
          luderror.ui(`❌ Failed to preload slide ${index}:`, error);
          return null;
        }
      });

      await Promise.all(processPromises);
      setPreloadedSlides(slideBlobs);
      ludlog.ui('🎉 All slides preloaded successfully!', { data: { count: Object.keys(slideBlobs).length, status: 'slidesCached' } });

      return slideBlobs;
    } catch (error) {
      luderror.ui('❌ Error preloading slides:', error);
      return {};
    }
  };

  // SVG slide loading helper function - now uses cache
  const loadSlideByIndex = async (slideIndex, slides, entityId) => {
    try {
      // Reduced logging: ludlog.ui('🎬 loadSlideByIndex called with:', { data: { slideIndex, slidesCount: slides?.length, entityId } });

      if (!slides || slideIndex < 0 || slideIndex >= slides.length) {
        ludlog.ui('❌ Invalid slide index:', { data: { slideIndex, availableSlides: slides?.length || 0 } });
        return;
      }

      const slide = slides[slideIndex];
      // Reduced logging: ludlog.ui('✅ Loading slide:', { data: slide.id, 'Index:', slideIndex });

      // Check if slide is already preloaded
      if (preloadedSlides[slideIndex]) {
        // Reduced logging: ludlog.ui('⚡ Using preloaded slide from cache:', { data: slideIndex });
        const cachedBlobUrl = preloadedSlides[slideIndex];

        // Clean up previous blob URL (but keep the cached ones)
        if (pdfBlobUrl && pdfBlobUrl.startsWith('blob:') && !Object.values(preloadedSlides).includes(pdfBlobUrl)) {
          // Reduced logging: ludlog.ui('🗑️ Cleaning up previous blob URL:', { data: pdfBlobUrl });
          URL.revokeObjectURL(pdfBlobUrl);
        }

        setPdfBlobUrl(cachedBlobUrl);
        setCurrentSlideIndex(slideIndex);
        // Reduced logging: ludlog.ui('📍 Instant slide switch to index:', { data: slideIndex });
        return;
      }

      // If not cached, create blob URL from slide content or download as fallback
      let blobUrl;

      // Check if slide has content from preview endpoint (preferred method)
      if (slide.content && slide.content.trim()) {
        // Create blob URL from SVG content directly (no download needed)
        const blob = new Blob([slide.content], { type: 'image/svg+xml' });
        blobUrl = URL.createObjectURL(blob);
        // Reduced logging: ludlog.ui('🎯 SVG slide blob URL created from content for slide', { data: slideIndex, ':', blobUrl });
      } else {
        // Fallback: download individual slide file (should rarely happen)
        // Reduced logging: ludlog.api('📥 Slide not in cache, { data: downloading:', `/assets/download/lesson-plan-slide/${entityId}/${slide.id}` });
        const slideBlob = await apiDownload(`/assets/download/lesson-plan-slide/${entityId}/${slide.id}`);
        blobUrl = URL.createObjectURL(slideBlob);
        // Reduced logging: ludlog.ui('🎯 SVG slide blob URL created from download for slide', { data: slideIndex, ':', blobUrl });
      }

      // Clean up previous blob URL
      if (pdfBlobUrl && pdfBlobUrl.startsWith('blob:')) {
        // Reduced logging: ludlog.ui('🗑️ Cleaning up previous blob URL:', { data: pdfBlobUrl });
        URL.revokeObjectURL(pdfBlobUrl);
      }

      // Cache this slide for future use
      setPreloadedSlides(prev => ({ ...prev, [slideIndex]: blobUrl }));

      setPdfBlobUrl(blobUrl);
      setCurrentSlideIndex(slideIndex);
      // Reduced logging: ludlog.ui('📍 Current slide index updated to:', { data: slideIndex });
    } catch (error) {
      luderror.ui('❌ Error loading slide:', slideIndex, { context: error });
    }
  };

  // SVG slide navigation handlers
  const handlePrevSlide = () => {
    // Reduced logging: ludlog.api('🔙 Previous slide requested. Current:', { data: currentSlideIndex, 'Available:', availableSlides.length });
    if (currentSlideIndex > 0 && availableSlides.length > 0) {
      loadSlideByIndex(currentSlideIndex - 1, availableSlides, fileEntityId);
    }
  };

  const handleNextSlide = () => {
    // Reduced logging: ludlog.api('▶️ Next slide requested. Current:', { data: currentSlideIndex, 'Total:', totalSlides, 'Available:', availableSlides.length });
    if (currentSlideIndex < totalSlides - 1 && availableSlides.length > 0) {
      loadSlideByIndex(currentSlideIndex + 1, availableSlides, fileEntityId);
    }
  };

  const handleSlideChange = (newPageNumber) => {
    // Convert 1-based page number to 0-based slide index
    const newSlideIndex = newPageNumber - 1;
    // Reduced logging: ludlog.api('📄 Slide change requested. Page number:', { data: newPageNumber, 'Slide index:', newSlideIndex, 'Total:', totalSlides });
    if (newSlideIndex >= 0 && newSlideIndex < totalSlides && availableSlides.length > 0) {
      loadSlideByIndex(newSlideIndex, availableSlides, fileEntityId);
    }
  };

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

      // Reduced logging: ludlog.websocket('📸 Snapshot saved to undo stack. Stack length:', { data: newStack.length });
      return newStack;
    });

    setLastSavedSnapshot(snapshot);
    setRedoStack([]); // Clear redo stack when new changes are made
  };

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  const handleUndo = () => {
    if (!canUndo) {
      ludlog.ui('↶ Cannot undo - undo stack is empty');
      return;
    }

    setIsUndoRedoAction(true);

    const previousSnapshot = undoStack[undoStack.length - 1];
    ludlog.ui('↶ Undo: Restoring snapshot');

    // Save current state to redo stack
    setRedoStack(prev => [...prev, JSON.parse(JSON.stringify(templateConfig))]);

    // Remove last snapshot from undo stack
    setUndoStack(prev => prev.slice(0, -1));

    // Update the last saved snapshot
    setLastSavedSnapshot(JSON.parse(JSON.stringify(previousSnapshot)));

    // Apply the previous snapshot
    setTemplateConfig(JSON.parse(JSON.stringify(previousSnapshot)));

    setTimeout(() => setIsUndoRedoAction(false), 100);
  };

  const handleRedo = () => {
    if (!canRedo) {
      ludlog.ui('↷ Cannot redo - redo stack is empty');
      return;
    }

    setIsUndoRedoAction(true);

    const nextSnapshot = redoStack[redoStack.length - 1];
    ludlog.ui('↷ Redo: Restoring snapshot');

    // Save current state to undo stack
    setUndoStack(prev => [...prev, JSON.parse(JSON.stringify(templateConfig))]);

    // Remove last snapshot from redo stack
    setRedoStack(prev => prev.slice(0, -1));

    // Update the last saved snapshot
    setLastSavedSnapshot(JSON.parse(JSON.stringify(nextSnapshot)));

    // Apply the next snapshot
    setTemplateConfig(JSON.parse(JSON.stringify(nextSnapshot)));

    setTimeout(() => setIsUndoRedoAction(false), 100);
  };

  const clearHistory = () => {
    setUndoStack([]);
    setRedoStack([]);
    setLastSavedSnapshot(null);
    ludlog.navigation('🗑️ History cleared');
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
      // Reduced logging: ludlog.ui('⏱️ Changes settled, { data: saving snapshot' });
      saveSnapshot(templateConfig);
    }, 1000);
  };

  // Check if current config differs from initial template config
  const hasConfigChangesFromTemplate = () => {
    if (!initialTemplateConfig || !templateConfig) return false;

    // Compare the current config with the initial template config
    const currentJson = JSON.stringify(templateConfig);
    const initialJson = JSON.stringify(initialTemplateConfig);

    return currentJson !== initialJson;
  };

  // Track templateConfig changes with debounced snapshot saving and custom changes detection
  useEffect(() => {
    if (!isUndoRedoAction && templateConfig && Object.keys(templateConfig).length > 0) {
      scheduleSnapshotSave();

      // Check if we now have custom changes
      const hasChanges = hasConfigChangesFromTemplate();
      if (hasChanges !== hasCustomChanges) {
        setHasCustomChanges(hasChanges);

        // If we now have custom changes and still have a template selected, show custom confirmation
        // Only show this for product editing mode (fileEntityId !== null), not for template manager mode
        if (hasChanges && selectedTemplateId && selectedTemplateId !== 'custom' && !showCustomConfirmation && fileEntityId !== null) {
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
  }, [templateConfig, hasCustomChanges, initialTemplateConfig, selectedTemplateId]);

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

  // Initialize template configuration when modal opens
  useEffect(() => {
    if (isOpen) {
      const initializeData = async () => {
        setIsLoadingSettings(true);
        try {
          // Extract copyright text from global settings
          const systemCopyrightText = settings?.copyright_text || settings?.footer_settings?.text?.content || '';
          setCopyrightText(systemCopyrightText);
          ludlog.ui('System copyright text loaded from global settings:', { data: systemCopyrightText });

          let finalConfig;

          // Use unified approach for both watermark and branding templates
          if (fileEntityId === null) {
            // Template creation/editing mode from template manager
            if (currentTemplateId && propInitialTemplateConfig && Object.keys(propInitialTemplateConfig).length > 0) {
              // Use provided template config when opening from template manager with specific template
              finalConfig = propInitialTemplateConfig;
              ludlog.ui(`🎨 Using provided template config from template manager:`, { data: propInitialTemplateConfig });
            } else {
              // Start with blank canvas for creating new custom templates
              finalConfig = getDefaultConfig();
              ludlog.ui(`🆕 Using blank canvas for unified ${templateType} template creation`);
            }
          } else {
            // File editing mode - load existing template configuration
            if (propInitialTemplateConfig && Object.keys(propInitialTemplateConfig).length > 0) {
              // Using unified template configuration
              finalConfig = propInitialTemplateConfig;
              ludlog.ui('✅ Using unified template configuration');
              setLoadedBrandingSettings(propInitialTemplateConfig);
            } else {
              // No existing config - use blank canvas
              finalConfig = getDefaultConfig();
              ludlog.ui('📝 No existing config - using blank canvas');
            }
          }

          setTemplateConfig(finalConfig);

          // Store initial template configuration for comparison
          setInitialTemplateConfig(JSON.parse(JSON.stringify(finalConfig)));

          // Clear history and set initial snapshot after loading configuration
          clearHistory();
          setTimeout(() => {
            setLastSavedSnapshot(JSON.parse(JSON.stringify(finalConfig)));
          }, 100);
        } catch (error) {
          luderror.ui('Error initializing template config:', error);
          // Fall back to defaults on error
          setTemplateConfig(getDefaultConfig());
          setTimeout(() => {
            setLastSavedSnapshot(JSON.parse(JSON.stringify(getDefaultConfig())));
          }, 100);
        } finally {
          setIsLoadingSettings(false);
        }
      };

      initializeData();
    }
  }, [isOpen, settings]);

  // Fetch available templates when modal opens
  useEffect(() => {
    if (isOpen) {
      const fetchTemplates = async () => {
        setIsLoadingTemplates(true);
        try {
          // effectiveFormat is now calculated at component level
          ludlog.api(`🎨 Fetching available ${templateType} templates for format: ${effectiveFormat}...`);
          const response = await apiRequest(`/system-templates?type=${templateType}&format=${effectiveFormat}`);
          ludlog.api('🎨 Raw template API response:', { data: response });

          // Handle different response formats - same logic as TemplateSelector
          let templateList = [];
          if (Array.isArray(response)) {
            templateList = response;
          } else if (response?.success && Array.isArray(response.data)) {
            templateList = response.data;
          } else if (response?.data && Array.isArray(response.data)) {
            templateList = response.data;
          } else {
            ludlog.api('⚠️ Unexpected template response format:', { data: response });
            templateList = [];
          }

          ludlog.ui(`✅ Loaded ${templateList.length} ${templateType} templates:`, { data: templateList });
          // Log first template data for debugging
          if (templateList.length > 0) {
          }
          setTemplates(templateList);

          // Auto-set and apply the selected template if we have a currentTemplateId
          if (currentTemplateId && templateList.length > 0) {
            const currentTemplate = templateList.find(t => t.id.toString() === currentTemplateId.toString());
            if (currentTemplate) {
              ludlog.ui(`🎯 Setting and applying current template: ${currentTemplate.name} (ID: ${currentTemplate.id});`);
              setSelectedTemplateId(currentTemplateId.toString());
              // Auto-apply the template when opened from template manager
              // IMMEDIATE APPLICATION - no timeout delay to prevent empty canvas flash
              handleApplyTemplate(currentTemplateId.toString());
            } else {
              ludlog.ui(`⚠️ Current template ID ${currentTemplateId} not found in available templates`);
            }
          } else if (!currentTemplateId && fileEntityId !== null && templateList.length > 0) {
            // Only auto-select default for existing files, not for custom template creation
            const defaultTemplate = templateList.find(t => t.is_default) || templateList[0];
            if (defaultTemplate) {
              ludlog.media(`🎯 Auto-selecting default template for existing file: ${defaultTemplate.name} (ID: ${defaultTemplate.id});`);
              setSelectedTemplateId(defaultTemplate.id.toString());
            }
          } else if (!currentTemplateId && fileEntityId === null) {
            // For custom template creation, don't auto-select any template
            ludlog.ui(`🆕 Starting with clean system defaults for custom ${templateType} design`);
            setSelectedTemplateId(null);
          }
        } catch (error) {
          luderror.api('Error fetching templates:', error);
          setTemplates([]);
        } finally {
          setIsLoadingTemplates(false);
        }
      };

      fetchTemplates();
    }
  }, [isOpen, effectiveFormat]);

  // Cache placeholder PDF/SVG for template mode
  useEffect(() => {
    if (isOpen && !placeholderPdfUrl) {
      const fetchPlaceholder = async () => {
        try {
          let placeholderFile;
          let fileType;

          // Choose the appropriate placeholder based on effective format
          if (effectiveFormat === 'svg-lessonplan') {
            placeholderFile = 'template-editor-lessonplan.svg';
            fileType = 'SVG';
          } else if (effectiveFormat === 'pdf-a4-landscape') {
            placeholderFile = 'preview-not-available-landscape.pdf';
            fileType = 'Landscape PDF';
          } else {
            placeholderFile = 'preview-not-available.pdf';
            fileType = 'Portrait PDF';
          }

          ludlog.api(`📄 Fetching ${fileType} placeholder for template mode...`);
          const blob = await apiDownload(`/assets/placeholders/${placeholderFile}`);
          const blobUrl = URL.createObjectURL(blob);
          setPlaceholderPdfUrl(blobUrl);
          ludlog.media(`📄 ${fileType} placeholder cached successfully:`, { data: blobUrl });
        } catch (error) {
          luderror.api('Error fetching placeholder:', error);
        }
      };

      fetchPlaceholder();
    }
  }, [isOpen, placeholderPdfUrl, effectiveFormat]);

  // Unified PDF/SVG fetching logic for both real files and template mode
  useEffect(() => {
    if (isOpen) {
      if (fileEntityId) {
        // Fetch actual file - different logic for PDF vs SVG LessonPlan
        const fetchFile = async () => {
          try {
            setIsLoadingPdf(true);
            setIsPdfDocumentLoaded(false); // Reset document loaded state

            // Check if this is a LessonPlan entity (SVG slides)
            if (effectiveFormat === 'svg-lessonplan') {
              ludlog.api('Fetching SVG slides from LessonPlan API for preview:', { data: fileEntityId });

              // Fetch SVG slides for LessonPlan
              const slidesResponse = await apiRequest(`/svg-slides/${fileEntityId}/preview`);

              if (slidesResponse.success && slidesResponse.data.slides && slidesResponse.data.slides.length > 0) {
                const slides = slidesResponse.data.slides;
                ludlog.api('🎬 Found SVG slides for navigation:', { data: slides });
                ludlog.api('📊 Setting up slide state - Total slides:', { data: slides.length });

                // Store all available slides for navigation
                setAvailableSlides(slides);
                setTotalSlides(slides.length);
                setCurrentSlideIndex(0); // Start with first slide

                ludlog.state('📍 Initial slide state set', { data: { available: slides.length, total: slides.length, currentIndex: 0 } });

                // Start preloading all slides in the background for fast navigation
                const preloadSlides = async () => {
                  ludlog.game('🏁 Starting background preload of all slides...');
                  const cachedSlides = await preloadAllSlides(slides, fileEntityId);

                  // Set the first slide immediately if it's cached
                  if (cachedSlides[0]) {
                    ludlog.ui('⚡ Setting first slide from preloaded cache');
                    setPdfBlobUrl(cachedSlides[0]);
                  }
                };

                // Load the first slide immediately (don't wait for preloading)
                ludlog.media('🎯 Loading initial slide (index 0);');
                await loadSlideByIndex(0, slides, fileEntityId);

                // Start preloading other slides in the background
                preloadSlides();

                // For SVG, set document loaded immediately since we don't use Document component
                setIsPdfDocumentLoaded(true);
              } else {
                ludlog.state('❌ No SVG slides found', { data: { status: 'usingPlaceholder' } });
                // Reset slide state
                setAvailableSlides([]);
                setTotalSlides(0);
                setCurrentSlideIndex(0);
                // No slides available, will show placeholder
                setIsPdfDocumentLoaded(true); // Even with no slides, we're "loaded"
              }
            } else {
              // Regular PDF file
              ludlog.api('Fetching PDF from API for preview:', { data: fileEntityId });

              // Skip the correct template type based on what we're editing:
              // - Branding editor: skip branding from API (skipBranding=true)
              // - Watermark editor: skip watermarks from API (skipWatermarks=true)
              const skipParam = templateType === 'branding' ? 'skipBranding=true' : 'skipWatermarks=true';
              const blob = await apiDownload(`/assets/download/file/${fileEntityId}?${skipParam}`);

              const blobUrl = URL.createObjectURL(blob);
              ludlog.ui('PDF blob URL created:', { data: blobUrl });
              setPdfBlobUrl(blobUrl);
            }
          } catch (error) {
            luderror.api('Error fetching file - will show placeholder:', error);
            // Don't set pdfBlobUrl, will show placeholder message instead
          } finally {
            setIsLoadingPdf(false);
          }
        };

        fetchFile();
      } else if (placeholderPdfUrl) {
        // Template mode: use cached placeholder PDF/SVG
        ludlog.media('📄 Using placeholder file for template mode:', { data: placeholderPdfUrl });
        setPdfBlobUrl(placeholderPdfUrl);
        // For template mode with placeholder, we don't need to wait for document loading
        // but we still need to track it for PDFs (SVGs don't use Document component)
        if (effectiveFormat === 'svg-lessonplan') {
          setIsPdfDocumentLoaded(true); // SVG doesn't use Document component
        }
        // For PDF placeholders, the Document component will handle setting loaded state
      }
    }

    // Cleanup only real file blob URLs (keep placeholder cached)
    return () => {
      if (pdfBlobUrl && fileEntityId !== null) {
        URL.revokeObjectURL(pdfBlobUrl);
        setPdfBlobUrl(null);
      }

      // Reset slide state when fileEntityId changes or modal closes
      if (!fileEntityId) {
        // Clean up all preloaded slide blobs
        Object.values(preloadedSlides).forEach(blobUrl => {
          if (blobUrl && blobUrl.startsWith('blob:')) {
            URL.revokeObjectURL(blobUrl);
          }
        });

        setAvailableSlides([]);
        setTotalSlides(0);
        setCurrentSlideIndex(0);
        setPreloadedSlides({});
        ludlog.ui('🗑️ Cleaned up all preloaded slides');
      }

      // Reset document loaded state when component unmounts or fileEntityId changes
      setIsPdfDocumentLoaded(false);
    };
  }, [isOpen, fileEntityId, placeholderPdfUrl, effectiveFormat]);

  const handleConfigChange = (newConfig, metadata) => {
    setTemplateConfig(newConfig);
  };

  // Helper function to find element in unified structure
  const findElementForUpdate = (elementKey) => {
    if (!templateConfig?.elements || !elementKey) return null;

    // UNIFIED STRUCTURE: search in element arrays
    for (const [elementType, elementArray] of Object.entries(templateConfig.elements)) {
      if (Array.isArray(elementArray)) {
        for (let index = 0; index < elementArray.length; index++) {
          const element = elementArray[index];
          const currentElementKey = element.id || `${elementType}_${index}`;
          if (currentElementKey === elementKey) {
            return { element, elementType, index };
          }
        }
      }
    }

    return null;
  };

  const updateConfig = (elementKey, field, value) => {
    const elementInfo = findElementForUpdate(elementKey);
    if (!elementInfo) return;

    const { elementType, index } = elementInfo;

    const newConfig = {
      ...templateConfig,
      elements: {
        ...templateConfig.elements,
        [elementType]: templateConfig.elements[elementType].map((item, idx) =>
          idx === index ? { ...item, [field]: value } : item
        )
      }
    };

    setTemplateConfig(newConfig);
  };

  const updateStyle = (elementKey, styleField, value) => {
    const elementInfo = findElementForUpdate(elementKey);
    if (!elementInfo) return;

    const { elementType, index } = elementInfo;

    const newConfig = {
      ...templateConfig,
      elements: {
        ...templateConfig.elements,
        [elementType]: templateConfig.elements[elementType].map((item, idx) =>
          idx === index ? {
            ...item,
            style: {
              ...item.style,
              [styleField]: value
            }
          } : item
        )
      }
    };

    setTemplateConfig(newConfig);
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
    const elementInfo = findElementForUpdate(elementKey);
    if (!elementInfo) return;

    const { elementType, index } = elementInfo;

    const newConfig = {
      ...templateConfig,
      elements: {
        ...templateConfig.elements,
        [elementType]: templateConfig.elements[elementType].map((item, idx) =>
          idx === index ? {
            ...item,
            position: {
              ...item.position,
              x: 50
            }
          } : item
        )
      }
    };

    setTemplateConfig(newConfig);
    // Reduced logging: ludlog.ui(`✨ Centered ${elementKey} on X axis to 50%`);
  };

  const handleCenterY = (elementKey) => {
    const elementInfo = findElementForUpdate(elementKey);
    if (!elementInfo) return;

    const { elementType, index } = elementInfo;

    const newConfig = {
      ...templateConfig,
      elements: {
        ...templateConfig.elements,
        [elementType]: templateConfig.elements[elementType].map((item, idx) =>
          idx === index ? {
            ...item,
            position: {
              ...item.position,
              y: 50
            }
          } : item
        )
      }
    };

    setTemplateConfig(newConfig);
    // Reduced logging: ludlog.ui(`✨ Centered ${elementKey} on Y axis to 50%`);
  };

  const handleAddElement = (elementType) => {
    // Support unified structure
    const hasUnifiedStructure = templateConfig?.elements;

    if (hasUnifiedStructure) {
      // NEW UNIFIED STRUCTURE: Add elements to arrays
      const timestamp = Date.now();
      const elementId = `${elementType}-${timestamp}`;
      const newElement = getDefaultElementConfig(elementType, elementId);

      const newConfig = {
        ...templateConfig,
        elements: {
          ...templateConfig.elements,
          [elementType]: [
            ...(templateConfig.elements[elementType] || []),
            newElement
          ]
        }
      };

      setTemplateConfig(newConfig);
      setSelectedItem(elementId);
      setFocusedItem(elementId);
      ludlog.ui(`✨ Added new ${elementType} element to unified structure:`, { data: elementId });
    } else {
      // LEGACY STRUCTURE: Support backward compatibility
      const builtInElements = ['logo', 'text', 'url', 'copyright-text', 'user-info', 'watermark-logo'];

      if (builtInElements.includes(elementType)) {
        // Handle built-in elements - add directly to template config
        const newElement = getDefaultElementConfig(elementType, elementType);

        const newConfig = {
          ...templateConfig,
          [elementType]: newElement
        };

        setTemplateConfig(newConfig);
        setSelectedItem(elementType);
        setFocusedItem(elementType);
        ludlog.ui(`✨ Added new built-in ${elementType} element`);
      } else {
        // Handle custom elements - add to customElements
        const timestamp = Date.now();
        const elementId = `${elementType}-${timestamp}`;

        const newElement = getDefaultElementConfig(elementType, elementId);

        const newConfig = {
          ...templateConfig,
          customElements: {
            ...templateConfig.customElements,
            [elementId]: newElement
          }
        };

        setTemplateConfig(newConfig);
        setSelectedItem(elementId);
        setFocusedItem(elementId);
        ludlog.ui(`✨ Added new custom ${elementType} element:`, { data: elementId });
      }
    }
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
      case 'logo':
        return {
          ...baseConfig,
          // Logo uses current SVG file to prevent fallback to "LOGO" text
          url: '/logo.svg',
          style: {
            size: 80,
            opacity: 100,
            rotation: 0
          }
        };
      case 'copyright-text':
        const copyrightContent = copyrightText || 'טקסט זכויות יוצרים';
        return {
          ...baseConfig,
          content: copyrightContent,
          style: {
            fontSize: 12,
            color: '#000000',
            opacity: 80,
            rotation: 0,
            fontFamily: getTextFontFamily(copyrightContent, false),
            bold: false,
            italic: false,
            width: 300
          }
        };
      case 'url':
        const urlContent = '${FRONTEND_URL}'; // Use variable that resolves to configured URL
        return {
          ...baseConfig,
          content: urlContent,
          style: {
            fontSize: 12,
            color: '#0066cc',
            opacity: 100,
            rotation: 0,
            fontFamily: getTextFontFamily(urlContent, false),
            bold: false,
            italic: false,
            textDecoration: 'underline'
          }
        };
      case 'free-text':
        const freeTextContent = 'טקסט חופשי';
        return {
          ...baseConfig,
          content: freeTextContent,
          style: {
            fontSize: 16,
            color: '#000000',
            opacity: 100,
            rotation: 0,
            fontFamily: getTextFontFamily(freeTextContent, false),
            bold: false,
            italic: false,
            width: 200
          }
        };
      case 'box':
        return {
          ...baseConfig,
          style: {
            width: 100,
            height: 50,
            borderColor: '#000000',
            borderWidth: 2,
            backgroundColor: 'transparent',
            opacity: 100,
            rotation: 0
          }
        };
      case 'line':
        return {
          ...baseConfig,
          style: {
            width: 100,
            height: 2,
            color: '#000000',
            opacity: 100,
            rotation: 0
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
            dashArray: '5,5',
            rotation: 0
          }
        };
      case 'circle':
        return {
          ...baseConfig,
          style: {
            size: 50,
            borderColor: '#000000',
            borderWidth: 2,
            backgroundColor: 'transparent',
            opacity: 100,
            rotation: 0
          }
        };
      case 'user-info':
        const userInfoContent = 'קובץ זה נוצר עבור {{user.email}}';
        return {
          ...baseConfig,
          content: userInfoContent,
          editable: false, // Text content is not editable, only style
          style: {
            fontSize: 11,
            color: '#666666',
            opacity: 70,
            rotation: 0,
            fontFamily: getTextFontFamily(userInfoContent, false),
            bold: false,
            italic: true,
            width: 250
          }
        };
      default:
        return baseConfig;
    }
  };

  const handleDeleteElement = (elementId) => {
    const elementInfo = findElementForUpdate(elementId);
    if (!elementInfo) return;

    const { elementType, index } = elementInfo;

    // Check if element is deletable
    if (!templateConfig.elements[elementType][index]?.deletable) return;

    const newConfig = {
      ...templateConfig,
      elements: {
        ...templateConfig.elements,
        [elementType]: templateConfig.elements[elementType].filter((_, idx) => idx !== index)
      }
    };

    setTemplateConfig(newConfig);
    setSelectedItem(null);
    setFocusedItem(null);
    // Reduced logging: ludlog.ui(`🗑️ Deleted element:`, { data: elementId });
  };

  // Enhanced UI Handler Functions
  const handleToggleVisibility = (elementKey) => {
    const elementInfo = findElementForUpdate(elementKey);
    if (!elementInfo) return;

    const { elementType, index } = elementInfo;

    const newConfig = {
      ...templateConfig,
      elements: {
        ...templateConfig.elements,
        [elementType]: templateConfig.elements[elementType].map((item, idx) =>
          idx === index ? { ...item, visible: !item.visible } : item
        )
      }
    };

    setTemplateConfig(newConfig);
    // Reduced logging: ludlog.ui(`👁️ Toggled visibility for ${elementKey}`);
  };

  const handleLockToggle = (elementKey) => {
    const elementInfo = findElementForUpdate(elementKey);
    if (!elementInfo) return;

    const { elementType, index } = elementInfo;

    const newConfig = {
      ...templateConfig,
      elements: {
        ...templateConfig.elements,
        [elementType]: templateConfig.elements[elementType].map((item, idx) =>
          idx === index ? { ...item, locked: !item.locked } : item
        )
      }
    };

    setTemplateConfig(newConfig);
    // Reduced logging: ludlog.ui(`🔒 Toggled lock for ${elementKey}`);
  };

  const handleDuplicate = (elementKey) => {
    const elementInfo = findElementForUpdate(elementKey);
    if (!elementInfo) {
      ludlog.ui(`⚠️ Cannot duplicate element: ${elementKey} - element not found`);
      return;
    }

    const { elementType } = elementInfo;
    const sourceElement = elementInfo.element;
    const newElementId = `${elementKey}_copy_${Date.now()}`;

    // Deep clone the source element to preserve all nested properties including styles
    const deepCloneElement = (element) => {
      const cloned = { ...element };

      // Deep clone style object if it exists
      if (element.style) {
        cloned.style = { ...element.style };

        // Deep clone nested objects within style
        if (element.style.shadow) {
          cloned.style.shadow = { ...element.style.shadow };
        }
      }

      // Deep clone position if it exists
      if (element.position) {
        cloned.position = { ...element.position };
      }

      return cloned;
    };

    const duplicatedElement = deepCloneElement(sourceElement);
    duplicatedElement.id = newElementId;
    duplicatedElement.deletable = true; // Duplicated elements are always deletable

    // Update position with offset
    duplicatedElement.position = {
      x: (sourceElement.position?.x || 0) + 10,
      y: (sourceElement.position?.y || 0) + 10
    };

    const newConfig = {
      ...templateConfig,
      elements: {
        ...templateConfig.elements,
        [elementType]: [...templateConfig.elements[elementType], duplicatedElement]
      }
    };

    setTemplateConfig(newConfig);
    ludlog.ui(`📄 Duplicated element ${elementKey} as ${newElementId} with styles preserved`);
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
    const newConfig = { ...templateConfig };

    elementIds.forEach(elementId => {
      if (newConfig.customElements?.[elementId]) {
        newConfig.customElements[elementId].groupId = groupId;
      } else if (newConfig[elementId]) {
        newConfig[elementId].groupId = groupId;
      }
    });

    setGroups({ ...groups, [groupId]: newGroup });
    setTemplateConfig(newConfig);
    setSelectedItems([]);
    // Reduced logging: ludlog.ui(`👥 Created group ${groupId} with elements:`, { data: elementIds });
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
    ludlog.ui(`📝 Updated group ${groupId}:`, { data: updates });
  };

  const handleGroupDelete = (groupId) => {
    // Remove group reference from all elements
    const newConfig = { ...templateConfig };

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
    setTemplateConfig(newConfig);
    setSelectedGroupId(null);
    ludlog.ui(`🗑️ Deleted group ${groupId}`);
  };

  const handleGroupToggleVisibility = (groupId) => {
    const groupElements = getGroupElements(groupId);
    const allVisible = groupElements.every(([, element]) => element.visible !== false);

    const newConfig = { ...templateConfig };

    groupElements.forEach(([elementId]) => {
      if (newConfig.customElements?.[elementId]) {
        newConfig.customElements[elementId].visible = !allVisible;
      } else if (newConfig[elementId]) {
        newConfig[elementId].visible = !allVisible;
      }
    });

    setTemplateConfig(newConfig);
    ludlog.ui(`👁️ Toggled visibility for group ${groupId}: ${!allVisible ? 'show' : 'hide'}`);
  };

  const handleGroupToggleLock = (groupId) => {
    const groupElements = getGroupElements(groupId);
    const allLocked = groupElements.every(([, element]) => element.locked);

    const newConfig = { ...templateConfig };

    groupElements.forEach(([elementId]) => {
      if (newConfig.customElements?.[elementId]) {
        newConfig.customElements[elementId].locked = !allLocked;
      } else if (newConfig[elementId]) {
        newConfig[elementId].locked = !allLocked;
      }
    });

    setTemplateConfig(newConfig);
    ludlog.ui(`🔒 Toggled lock for group ${groupId}: ${!allLocked ? 'lock' : 'unlock'}`);
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

    const newConfig = { ...templateConfig };

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
    setTemplateConfig(newConfig);
    ludlog.ui(`📄 Duplicated group ${groupId} as ${newGroupId}`);
  };

  const handleElementAddToGroup = (elementId, groupId) => {
    const newConfig = { ...templateConfig };

    if (newConfig.customElements?.[elementId]) {
      newConfig.customElements[elementId].groupId = groupId;
    } else if (newConfig[elementId]) {
      newConfig[elementId].groupId = groupId;
    }

    setTemplateConfig(newConfig);
    ludlog.ui(`➕ Added element ${elementId} to group ${groupId}`);
  };

  const handleElementRemoveFromGroup = (elementId, groupId) => {
    const newConfig = { ...templateConfig };

    if (newConfig.customElements?.[elementId]) {
      delete newConfig.customElements[elementId].groupId;
    } else if (newConfig[elementId]) {
      delete newConfig[elementId].groupId;
    }

    setTemplateConfig(newConfig);
    ludlog.ui(`➖ Removed element ${elementId} from group ${groupId}`);
  };

  const handleGroupSelect = (groupId) => {
    setSelectedGroupId(groupId);
    setSelectedItem(null);
    ludlog.ui(`🎯 Selected group ${groupId}`);
  };

  const getGroupElements = (groupId) => {
    const elements = [];

    // Check custom elements
    Object.entries(templateConfig.customElements || {}).forEach(([elementId, element]) => {
      if (element.groupId === groupId) {
        elements.push([elementId, element]);
      }
    });

    // Check built-in elements
    ['logo', 'text', 'url'].forEach(elementKey => {
      if (templateConfig[elementKey]?.groupId === groupId) {
        elements.push([elementKey, templateConfig[elementKey]]);
      }
    });

    return elements;
  };


  // Multi-selection Handlers
  const handleSelectionChange = (items) => {
    setSelectedItems(items);
    ludlog.ui(`🎯 Selection changed:`, { data: items });
  };

  const handleBulkAction = (operation, data) => {
    switch (operation) {
      case 'group':
        handleGroupCreate(data);
        break;
      case 'ungroup':
        data.forEach(elementId => {
          const element = templateConfig.customElements?.[elementId] || templateConfig[elementId];
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
          const element = templateConfig.customElements?.[elementId] || templateConfig[elementId];
          if (!element?.locked) handleLockToggle(elementId);
        });
        break;
      case 'unlock':
        data.forEach(elementId => {
          const element = templateConfig.customElements?.[elementId] || templateConfig[elementId];
          if (element?.locked) handleLockToggle(elementId);
        });
        break;
      case 'show':
        data.forEach(elementId => {
          const element = templateConfig.customElements?.[elementId] || templateConfig[elementId];
          if (!element?.visible) handleToggleVisibility(elementId);
        });
        break;
      case 'hide':
        data.forEach(elementId => {
          const element = templateConfig.customElements?.[elementId] || templateConfig[elementId];
          if (element?.visible !== false) handleToggleVisibility(elementId);
        });
        break;
      case 'alignLeft':
        data.forEach(elementId => {
          // Align all selected elements to the leftmost position
          const positions = data.map(id => {
            const element = templateConfig.customElements?.[id] || templateConfig[id];
            return element?.position?.x || 0;
          });
          const leftmostX = Math.min(...positions);

          const newConfig = { ...templateConfig };
          if (newConfig.customElements?.[elementId]) {
            newConfig.customElements[elementId].position.x = leftmostX;
          } else if (newConfig[elementId]) {
            newConfig[elementId].position.x = leftmostX;
          }
          setTemplateConfig(newConfig);
        });
        break;
      case 'alignTop':
        data.forEach(elementId => {
          // Align all selected elements to the topmost position
          const positions = data.map(id => {
            const element = templateConfig.customElements?.[id] || templateConfig[id];
            return element?.position?.y || 0;
          });
          const topmostY = Math.min(...positions);

          const newConfig = { ...templateConfig };
          if (newConfig.customElements?.[elementId]) {
            newConfig.customElements[elementId].position.y = topmostY;
          } else if (newConfig[elementId]) {
            newConfig[elementId].position.y = topmostY;
          }
          setTemplateConfig(newConfig);
        });
        break;
      case 'alignCenter':
        // Center all elements horizontally at 50%
        data.forEach(elementId => handleCenterX(elementId));
        break;
      default:
        ludlog.ui(`⚠️ Unknown bulk operation: ${operation}`);
    }
  };


  const handleSave = async () => {
    try {
      let configToSave;

      // VALIDATION: Ensure all elements have required 'type' field
      const validateAndFixElementTypes = (config) => {
        const fixedConfig = JSON.parse(JSON.stringify(config)); // Deep clone
        let hasChanges = false;

        // Check unified structure elements (new format)
        if (fixedConfig.elements) {
          Object.entries(fixedConfig.elements).forEach(([elementType, elementArray]) => {
            if (Array.isArray(elementArray)) {
              elementArray.forEach((element, index) => {
                if (!element.type || typeof element.type !== 'string') {
                  element.type = elementType;
                  hasChanges = true;
                  ludlog.ui(`🔧 Fixed missing type field for ${elementType}[${index}]: added type="${elementType}"`);
                }
              });
            }
          });
        }

        // Check custom elements
        if (fixedConfig.customElements) {
          Object.entries(fixedConfig.customElements).forEach(([elementId, element]) => {
            if (!element.type || typeof element.type !== 'string') {
              // Try to infer type from element ID or use 'free-text' as default
              const inferredType = elementId.includes('logo') ? 'logo' :
                                 elementId.includes('text') ? 'free-text' :
                                 elementId.includes('url') ? 'url' :
                                 elementId.includes('user-info') ? 'user-info' :
                                 elementId.includes('copyright') ? 'copyright-text' :
                                 elementId.includes('watermark') ? 'watermark-logo' :
                                 'free-text'; // Default fallback
              element.type = inferredType;
              hasChanges = true;
              ludlog.ui(`🔧 Fixed missing type field for custom element ${elementId}: inferred type="${inferredType}"`);
            }
          });
        }

        if (hasChanges) {
          ludlog.ui('✅ Template validation: Fixed missing type fields');
        }

        return fixedConfig;
      };

      if (templateType === 'watermark') {
        // Save watermark config using same structure as footer/header
        configToSave = validateAndFixElementTypes(templateConfig);
        ludlog.ui('💾 Save: watermark config being saved (same structure);:', configToSave);
      } else {
        // Save footer/header config as-is
        configToSave = validateAndFixElementTypes(templateConfig);
        ludlog.ui('💾 Save: templateConfig being saved:', { data: configToSave });
        ludlog.ui('💾 Save: text content being saved:', { data: templateConfig.text?.content });

        // Check if copyright text has changed and update system settings if needed
        if (templateConfig.text?.content && templateConfig.text.content !== copyrightText) {
          ludlog.ui('💾 Save: Copyright text changed', { data: { action: 'updatingSystemSettings' } });
          const { Settings: SettingsEntity } = await import('@/services/entities');

          // Update system settings with new copyright text
          await SettingsEntity.update(1, {
            copyright_footer_text: templateConfig.text.content
          });

          ludlog.ui('✅ Save: System settings updated with new copyright text');
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
        setLastSavedSnapshot(JSON.parse(JSON.stringify(templateConfig)));
      }, 100);

      onClose();
    } catch (error) {
      luderror.ui('Error saving template settings:', error);
    }
  };

  // Check if there are differences between current config and a template
  const hasConfigDifferences = (templateData) => {
    if (!templateData) return false;

    // Create a comparable version of the current config
    const currentComparable = {
      logo: {
        visible: templateConfig.logo.visible,
        position: templateConfig.logo.position,
        style: templateConfig.logo.style
      },
      text: {
        visible: templateConfig.text.visible,
        position: templateConfig.text.position,
        style: templateConfig.text.style
      },
      url: {
        visible: templateConfig.url.visible,
        href: templateConfig.url.href,
        position: templateConfig.url.position,
        style: templateConfig.url.style
      },
      customElements: templateConfig.customElements || {}
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

    const template = templates.find(t => t.id.toString() === templateId.toString());
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

    ludlog.ui('✅ User confirmed custom template creation');
  };

  // Handle custom template creation cancellation (revert to original template)
  const handleCustomConfirmCancel = () => {
    if (initialTemplateConfig) {
      setTemplateConfig(JSON.parse(JSON.stringify(initialTemplateConfig)));
      setHasCustomChanges(false);
    }
    setShowCustomConfirmation(false);
    ludlog.ui('↩️ User cancelled custom changes', { data: { action: 'revertedToTemplate' } });
  };

  const handleApplyTemplate = async (templateId) => {
    if (!templateId) return;

    try {
      const template = templates.find(t => t.id.toString() === templateId.toString());
      if (!template) {
        luderror.ui('Template not found:', templateId);
        return;
      }

      ludlog.ui('🎨 Applying template:', { data: template });
      ludlog.ui('🎨 Template data structure:', { data: JSON.stringify(template.template_data, null, 2) });

      let newConfig;

      // Apply template data directly - our new templates already have the correct structure
      newConfig = {
        ...template.template_data
        // Logo uses static file, no URL needed
      };

      ludlog.ui('🎨 New config after template application:', { data: JSON.stringify(newConfig, null, 2) });

      // For branding templates, preserve system copyright text
      if (templateType === 'branding') {
        newConfig.text = {
          ...template.template_data.text,
          content: copyrightText // Always preserve system copyright text
        };
      }

      // Ensure logo elements use the current logo.svg file
      if (newConfig.customElements) {
        Object.keys(newConfig.customElements).forEach(elementId => {
          const element = newConfig.customElements[elementId];
          if (element.type === 'logo' || element.type === 'watermark-logo') {
            // Set logo URL to current SVG file to prevent "LOGO" fallback
            element.url = '/logo.svg';
            ludlog.media(`🔧 Set logo URL for custom element ${elementId} to use /logo.svg`);
          }
        });
      }

      ludlog.ui('🎨 Applied template config:', { data: newConfig });

      setTemplateConfig(newConfig);

      // Update the selected template ID to reflect the applied template
      setSelectedTemplateId(templateId);

      // Update initial template config for comparison
      setInitialTemplateConfig(JSON.parse(JSON.stringify(newConfig)));

      // Reset custom changes state
      setHasCustomChanges(false);

      // Notify parent component of template change
      if (onTemplateChange) {
        const selectedTemplate = templates.find(t => t.id.toString() === templateId.toString());
        onTemplateChange(templateId, selectedTemplate);
      }

      // Clear any selected item
      setSelectedItem(null);
      setFocusedItem(null);

      // Clear history and set initial snapshot when applying template (new starting point)
      clearHistory();
      setTimeout(() => {
        setLastSavedSnapshot(JSON.parse(JSON.stringify(newConfig)));
      }, 100);

      ludlog.ui(`✅ Applied template: ${template.name} - now working on independent branding config`);
    } catch (error) {
      luderror.ui('Error applying template:', error);
    }
  };

  // Dynamic title based on template type and target format
  const getPageTitle = () => {
    let baseTitle;

    if (fileEntityId !== null) {
      // Real file mode - different titles based on template type
      switch (templateType) {
        case 'branding':
          baseTitle = 'עיצוב מיתוג';
          break;
        case 'watermark':
          baseTitle = 'עיצוב סימן מים';
          break;
        default:
          baseTitle = 'עיצוב תבנית';
      }

      // Add product context if we have fileEntity information
      if (fileEntity?.name && fileEntity?.type) {
        const productName = fileEntity.name.length > 20
          ? fileEntity.name.substring(0, 17) + '...'
          : fileEntity.name;
        const productType = fileEntity.type === 'Course' ? 'קורס' :
                          fileEntity.type === 'Workshop' ? 'סדנה' :
                          fileEntity.type === 'LessonPlan' ? 'מצגת' :
                          fileEntity.type;
        baseTitle += ` - עבור ${productType} ${productName}`;
      }
    } else {
      // Template creation/editing mode from template manager
      const templateBaseTitle = {
        branding: 'עיצוב תבנית מיתוג',
        watermark: 'עיצוב תבנית סימן מים'
      }[templateType] || 'עיצוב תבנית';

      const formatSuffix = {
        'pdf-a4-portrait': ' (PDF אנכי)',
        'pdf-a4-landscape': ' (PDF אופקי)',
        'svg-lessonplan': ' (SVG מצגת)'
      }[effectiveFormat] || '';

      baseTitle = templateBaseTitle + formatSuffix;

      // Add system template context if opened from template manager
      if (currentTemplateId) {
        const currentTemplate = templates.find(t => t.id.toString() === currentTemplateId.toString());
        if (currentTemplate) {
          const isDefault = currentTemplate.is_default;
          baseTitle += ' - תבנית מערכת';
          if (isDefault) {
            baseTitle += ' ⭐';
          }
        }
      }
    }

    return baseTitle;
  };

  // Dynamic subtitle based on template type and mode
  const getPageSubtitle = () => {
    if (fileEntityId !== null) {
      // Real file mode
      switch (templateType) {
        case 'branding':
          return 'התאם אישית את מיקום ועיצוב המיתוג';
        case 'watermark':
          return 'התאם אישית את מיקום ועיצוב סימן המים';
        default:
          return 'התאם אישית את מיקום ועיצוב התבנית';
      }
    } else {
      // Template creation mode
      switch (templateType) {
        case 'branding':
          return 'צור ועצב תבנית מיתוג חדשה';
        case 'watermark':
          return 'צור ועצב תבנית סימן מים חדשה';
        default:
          return 'צור ועצב תבנית חדשה';
      }
    }
  };

  // Context information to display in header
  const getContextInfo = () => {
    // Show context for both template manager and product editing modes
    const contextItems = [];

    if (fileEntityId === null) {
      // Template manager mode - still show some context

      // Show template type if we know it
      if (templateType) {
        const typeLabel = templateType === 'branding' ? 'מיתוג' :
                         templateType === 'watermark' ? 'סימן מים' :
                         templateType;
        contextItems.push(
          <span key="templateType" className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-xs font-medium">
            🎨 {typeLabel}
          </span>
        );
      }

      // Show target format if we know it
      if (effectiveFormat) {
        const formatLabel = effectiveFormat === 'pdf-a4-portrait' ? 'PDF אנכי' :
                           effectiveFormat === 'pdf-a4-landscape' ? 'PDF אופקי' :
                           effectiveFormat === 'svg-lessonplan' ? 'SVG מצגת' :
                           effectiveFormat;
        contextItems.push(
          <span key="fallbackFormat" className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-medium">
            📄 {formatLabel}
          </span>
        );
      }

      // Add template manager badge
      contextItems.push(
        <span key="mode" className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium">
          ⚙️ עריכת תבנית
        </span>
      );
    } else {
      // Product editing mode - show product context

      // Product information (for product editing mode)
      if (fileEntity) {
        // Product type - check both type and product_type fields
        const productType = fileEntity.type || fileEntity.product_type;
        if (productType) {
          const typeLabel = productType === 'Course' ? 'קורס' :
                           productType === 'Workshop' ? 'סדנה' :
                           productType === 'LessonPlan' ? 'מצגת' :
                           productType === 'file' ? 'קובץ' :
                           productType;
          contextItems.push(
            <span key="type" className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium">
              📚 {typeLabel}
            </span>
          );
        }

        // Product name - check both name and title fields
        const productName = fileEntity.name || fileEntity.title;
        if (productName) {
          const displayName = productName.length > 25
            ? productName.substring(0, 22) + '...'
            : productName;
          contextItems.push(
            <span key="name" className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-medium">
              📝 {displayName}
            </span>
          );
        }

        // Target format
        if (effectiveFormat) {
          const format = effectiveFormat;
          const formatLabel = format === 'pdf-a4-portrait' ? 'PDF אנכי' :
                             format === 'pdf-a4-landscape' ? 'PDF אופקי' :
                             format === 'svg-lessonplan' ? 'SVG מצגת' :
                             format;
          contextItems.push(
            <span key="format" className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-medium">
              📄 {formatLabel}
            </span>
          );
        }
      } else {
        // Fallback information when fileEntity is not available but we have a fileEntityId
        contextItems.push(
          <span key="product" className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium">
            📝 עריכת מוצר
          </span>
        );

        // Show template type if we know it
        if (templateType) {
          const typeLabel = templateType === 'branding' ? 'מיתוג' :
                           templateType === 'watermark' ? 'סימן מים' :
                           templateType;
          contextItems.push(
            <span key="templateType" className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-xs font-medium">
              🎨 {typeLabel}
            </span>
          );
        }

        // Show target format if we know it
        if (effectiveFormat) {
          const formatLabel = effectiveFormat === 'pdf-a4-portrait' ? 'PDF אנכי' :
                             effectiveFormat === 'pdf-a4-landscape' ? 'PDF אופקי' :
                             effectiveFormat === 'svg-lessonplan' ? 'SVG מצגת' :
                             effectiveFormat;
          contextItems.push(
            <span key="fallbackFormat" className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-medium">
              📄 {formatLabel}
            </span>
          );
        }
      }
    }

    // Template source information
    if (selectedTemplateId && templates.length > 0) {
      const currentTemplate = templates.find(t => t.id.toString() === selectedTemplateId.toString());
      if (currentTemplate) {
        const isSystemTemplate = true; // All templates from API are system templates
        const isDefault = currentTemplate.is_default;

        let templateLabel = 'תבנית מערכת';
        if (isDefault) {
          templateLabel += ' (ברירת מחדל)';
        }

        contextItems.push(
          <span key="template" className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-medium">
            🎨 {templateLabel}
          </span>
        );
      }
    } else if (selectedTemplateId === 'custom' || hasCustomChanges) {
      contextItems.push(
        <span key="custom" className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs font-medium">
          ✏️ תבנית מותאמת אישית
        </span>
      );
    }

    return contextItems.length > 0 ? contextItems : null;
  };

  // Handle toggle template elements visibility (visual only, no config changes)
  const handleToggleTemplateElementsVisibility = () => {
    setShowTemplateElements(!showTemplateElements);
    ludlog.ui(`👁️ Template elements visibility toggled to: ${!showTemplateElements}`);
  };

  // Handle clear all elements from template (with confirmation)
  const handleClearAllElements = () => {
    setShowClearAllConfirmation(true);
  };

  // Confirm clearing all elements
  const handleConfirmClearAll = () => {
    const newConfig = {
      ...templateConfig,
      customElements: {} // Clear all custom elements
    };

    // Reset built-in elements to default invisible state if they exist
    ['logo', 'text', 'url', 'copyright-text', 'user-info', 'watermark-logo'].forEach(elementType => {
      if (newConfig[elementType]) {
        newConfig[elementType] = {
          ...newConfig[elementType],
          visible: false
        };
      }
    });

    setTemplateConfig(newConfig);
    setShowClearAllConfirmation(false);
    setSelectedItem(null);
    setFocusedItem(null);
    ludlog.ui('🗑️ Cleared all template elements');
  };

  // Cancel clearing all elements
  const handleCancelClearAll = () => {
    setShowClearAllConfirmation(false);
  };

  const handleClose = () => {
    // Reset to loaded settings on close without saving
    setCurrentPage(1);

    // Reset to the originally loaded config
    if (initialTemplateConfig) {
      setTemplateConfig({
        ...initialTemplateConfig,
        text: { ...initialTemplateConfig.text, content: copyrightText },
        logo: { ...initialTemplateConfig.logo }
      });
    } else if (loadedBrandingSettings) {
      setTemplateConfig({
        logo: { ...loadedBrandingSettings.logo },
        text: { ...loadedBrandingSettings.text, content: copyrightText },
        url: { ...loadedBrandingSettings.url }
      });
    } else {
      setTemplateConfig(getDefaultConfig());
    }

    // Reset loading states
    setIsPdfDocumentLoaded(false);
    setPdfBlobUrl(null);

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
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-800">
                {getPageTitle()}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {getPageSubtitle()}
              </p>
              {/* Context Information */}
              {(() => {
                const contextInfo = getContextInfo();
                return contextInfo && (
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    {contextInfo}
                  </div>
                );
              })()}
            </div>
            <div className="flex items-center gap-3">
              {/* Undo/Redo Controls */}
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    ludlog.ui('🔘 Undo button clicked', { data: { canUndo, undoStackLength: undoStack.length } });
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
                    ludlog.ui('🔘 Redo button clicked', { data: { canRedo, redoStackLength: redoStack.length } });
                    handleRedo();
                  }}
                  disabled={!canRedo}
                  className="h-8 w-8 p-0 border-slate-300 hover:bg-slate-50 disabled:opacity-40"
                  title={`חזור על פעולה (Ctrl+Y) - ${canRedo ? 'זמין' : 'לא זמין'}`}
                >
                  <Redo2 className="w-4 h-4" />
                </Button>
              </div>

              {/* File Content Visibility Toggle and Template Management */}
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFileContent(!showFileContent)}
                  className="h-8 w-8 p-0 border-slate-300 hover:bg-slate-50"
                  title={showFileContent ? 'הסתר קובץ רקע' : 'הצג קובץ רקע'}
                >
                  {showFileContent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToggleTemplateElementsVisibility}
                  className="h-8 w-8 p-0 border-slate-300 hover:bg-slate-50"
                  title={showTemplateElements ? 'הסתר אלמנטי תבנית' : 'הצג אלמנטי תבנית'}
                >
                  <Layers className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearAllElements}
                  className="h-8 w-8 p-0 border-slate-300 hover:bg-red-50 hover:border-red-300"
                  title="נקה את כל האלמנטים מהתבנית"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {/* Template Picker - Only show for file editing mode */}
              {fileEntityId !== null && (
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
            <div className="flex-1 flex flex-col bg-gray-100 overflow-hidden">
              {pdfBlobUrl ? (
                <TemplateCanvas
                  pdfUrl={pdfBlobUrl}
                  templateConfig={templateConfig}
                  onPageChange={effectiveFormat === 'svg-lessonplan' ? handleSlideChange : setCurrentPage}
                  onTemplateConfigChange={handleConfigChange}
                  focusedItem={focusedItem}
                  currentPage={effectiveFormat === 'svg-lessonplan' ? currentSlideIndex + 1 : currentPage}
                  numPages={effectiveFormat === 'svg-lessonplan' ? totalSlides : undefined}
                  groups={groups}
                  targetFormat={effectiveFormat} // Pass effective format for correct display dimensions
                  templateType={templateType} // Pass template type for correct rendering
                  showFileContent={showFileContent} // Pass file content visibility state
                  showTemplateElements={showTemplateElements} // Pass template elements visibility state
                  currentUser={currentUser} // Pass current user for email template resolution
                  fileId={fileEntityId} // Pass file ID for template content resolution
                  onDocumentLoad={() => setIsPdfDocumentLoaded(true)} // Callback for when PDF is rendered
                />
              ) : (isLoadingSettings || isLoadingPdf || (!isPdfDocumentLoaded && pdfBlobUrl)) ? (
                <div className="flex items-center justify-center h-full">
                  <LudoraLoadingSpinner
                    message={effectiveFormat === 'svg-lessonplan'
                      ? 'טוען עורך תבניות SVG...'
                      : 'טוען עורך תבניות PDF...'
                    }
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center p-8 bg-white rounded-lg shadow-sm border border-gray-200 max-w-md">
                    <div className="text-6xl mb-4">
                      {effectiveFormat === 'svg-lessonplan' ? '📐' : '📄'}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                      {fileEntityId === null
                        ? 'טוען תבנית עיצוב...'
                        : effectiveFormat === 'svg-lessonplan'
                          ? 'אין שקפי SVG להצגה'
                          : 'אין קובץ PDF להצגה'
                      }
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      {fileEntityId === null
                        ? effectiveFormat === 'svg-lessonplan'
                          ? 'טוען שקף SVG לדוגמה עבור עיצוב התבנית...'
                          : 'טוען קובץ PDF לדוגמה עבור עיצוב התבנית...'
                        : effectiveFormat === 'svg-lessonplan'
                          ? 'תוכל לערוך את הגדרות המיתוג באמצעות הפאנל מצד ימין. לאחר שתעלה שקפי SVG תוכל לראות תצוגה מקדימה מלאה.'
                          : 'תוכל לערוך את הגדרות הכותרת התחתונה באמצעות הפאנל מצד ימין. לאחר שתעלה קובץ PDF תוכל לראות תצוגה מקדימה מלאה.'
                      }
                    </p>
                    <p className="text-xs text-gray-500">
                      {effectiveFormat === 'svg-lessonplan'
                        ? 'השינויים יישמרו גם ללא שקפי SVG קיימים'
                        : 'השינויים יישמרו גם ללא קובץ PDF קיים'
                      }
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Enhanced Sidebar - modern tabbed interface */}
            <div className="w-full lg:w-80">
              <EnhancedSidebar
                templateConfig={templateConfig}
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
            templateConfig={templateConfig}
            onConfigChange={updateConfig}
            onStyleChange={updateStyle}
            userRole={userRole}
            onClose={handleMenuClose}
            onDeleteElement={handleDeleteElement}
            onDuplicateElement={handleDuplicate}
            onLockToggle={handleLockToggle}
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

      {/* Clear All Elements Confirmation Dialog */}
      {showClearAllConfirmation && (
        <Dialog open={showClearAllConfirmation} onOpenChange={handleCancelClearAll}>
          <DialogContent className="max-w-md" dir="rtl">
            <DialogTitle>ניקוי התבנית</DialogTitle>
            <DialogDescription>
              פעולה זו תמחק את כל האלמנטים מהתבנית.
              <br /><br />
              תוכל לבטל את הפעולה באמצעות כפתור הביטול (Undo).
              <br /><br />
              האם תרצה להמשיך?
            </DialogDescription>
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={handleCancelClearAll}>
                ביטול
              </Button>
              <Button variant="destructive" onClick={handleConfirmClearAll}>
                נקה את כל האלמנטים
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
};

export default VisualTemplateEditor;

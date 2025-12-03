import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { getTextFontFamily, containsHebrew, applyHebrewFontStyle } from '@/utils/hebrewUtils';
import { getCanvasDimensions, isSVGFormat } from '@/utils/canvasDimensions';
import { getElementTransformStyle, getElementShadowStyle } from '@/utils/elementHelpers.js';
import {
  fetchResolvedTemplateContent,
  getElementDisplayContent,
  getElementDisplayHref
} from '@/utils/templateContentResolver.js';
import LogoDisplay from '@/components/ui/LogoDisplay';
import { ludlog, luderror } from '@/lib/ludlog';
import { urls } from '@/config/urls';

// Configure PDF.js worker - use CDN for compatibility
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const TemplateCanvas = ({
  pdfUrl,
  templateConfig,
  onPageChange,
  onTemplateConfigChange,
  focusedItem,
  currentPage = 1,
  numPages: propNumPages, // Accept numPages as prop for SVG slides
  groups = {},
  targetFormat = 'pdf-a4-portrait', // Add target format prop
  templateType = 'branding', // Add template type prop
  showFileContent = true, // Add file content visibility prop
  showTemplateElements = true, // Add template elements visibility prop
  currentUser = null, // Current user object for email template resolution
  fileId = null, // File ID for fetching resolved template content
  onDocumentLoad = null // Callback for when PDF document is fully loaded
}) => {
  const [numPages, setNumPages] = useState(propNumPages || null);
  const [pageWidth, setPageWidth] = useState(() => {
    // Set initial width based on format using centralized dimensions
    const dimensions = getCanvasDimensions(targetFormat);
    // Scale down SVG slides to fit in reasonable screen space (800px width)
    return isSVGFormat(targetFormat) ? 800 : dimensions.width;
  });
  const [isDragging, setIsDragging] = useState(null);
  const [dragStart, setDragStart] = useState(null);
  const [actualPdfDimensions, setActualPdfDimensions] = useState(null);
  const [scaleFactor, setScaleFactor] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 }); // Allow pan via scroll
  const [isPanning] = useState(false); // Drag panning disabled, scroll panning enabled
  const [showInstructions, setShowInstructions] = useState(() => {
    // Check localStorage for user preference, default to true for first-time users
    const stored = localStorage.getItem('pdfViewer.showInstructions');
    return stored === null ? true : stored === 'true';
  });
  const [resolvedTemplateContent, setResolvedTemplateContent] = useState(null);
  const [isLoadingResolvedContent, setIsLoadingResolvedContent] = useState(false);
  const overlayRef = React.useRef(null);
  const containerRef = React.useRef(null);

  // Helper function to check if we're working with SVG
  const isSvgFormat = () => {
    return isSVGFormat(targetFormat);
  };

  // Helper function to get correct dimensions based on format
  const getPageDimensions = () => {
    const dimensions = getCanvasDimensions(targetFormat);
    return {
      width: dimensions.width,
      height: dimensions.height,
      aspectRatio: dimensions.height / dimensions.width // height / width
    };
  };

  const onDocumentLoadSuccess = async (pdf) => {
    setNumPages(pdf.numPages);

    // Extract actual PDF page dimensions for scaling calculations
    try {
      const page = await pdf.getPage(currentPage);
      const viewport = page.getViewport({ scale: 1.0 });

      const actualDimensions = {
        width: viewport.width,
        height: viewport.height
      };

      setActualPdfDimensions(actualDimensions);

      // Notify parent component that PDF document is fully loaded and ready
      if (onDocumentLoad) {
        onDocumentLoad();
      }

    } catch (error) {
      luderror.ui('Failed to extract PDF dimensions:', error);
      // Even if dimensions extraction fails, notify that document is loaded
      if (onDocumentLoad) {
        onDocumentLoad();
      }
    }
  };

  // Pan handlers disabled - canvas is no longer draggable
  const handlePanStart = () => {
    // Panning disabled - do nothing
  };

  const handlePanMove = () => {
    // Panning disabled - do nothing
  };

  const handlePanEnd = () => {
    // Panning disabled - do nothing
  };

  // Zoom handlers
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.25, 5));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.25, 0.25));
  };

  const handleZoomReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };


  // Wheel handler for zoom and scroll-based panning
  const handleWheel = (event) => {
    if (event.ctrlKey || event.metaKey) {
      // Zoom when holding Ctrl/Cmd
      event.preventDefault();
      const delta = event.deltaY > 0 ? 0.9 : 1.1;
      setZoom(prev => Math.max(0.25, Math.min(5, prev * delta)));
    } else {
      // Pan when normal scrolling
      event.preventDefault();
      const scrollSensitivity = 1.5;
      const deltaY = -event.deltaY * scrollSensitivity / zoom; // Negative for natural scroll direction

      setPan(prev => {
        // Calculate boundaries for vertical panning
        const pageDimensions = getPageDimensions();
        const documentHeight = pageWidth * pageDimensions.aspectRatio;
        const scaledDocHeight = documentHeight * zoom;
        const containerHeight = containerRef.current?.getBoundingClientRect().height || 600;

        const minVisiblePx = 100;
        const maxPanY = Math.max(0, (scaledDocHeight - minVisiblePx) / 2);
        const minPanY = -maxPanY;

        const newY = Math.max(minPanY / zoom, Math.min(maxPanY / zoom, prev.y + deltaY));

        return {
          ...prev,
          y: newY
        };
      });
    }
  };

  // Update pageWidth when targetFormat changes
  useEffect(() => {
    const dimensions = getCanvasDimensions(targetFormat);
    // Scale down SVG slides to fit in reasonable screen space (800px width)
    const width = isSVGFormat(targetFormat) ? 800 : dimensions.width;
    setPageWidth(width);

    // For SVG slides, set the actual dimensions to the full 1920x1080 for coordinate calculations
    if (isSVGFormat(targetFormat)) {
      setActualPdfDimensions({
        width: dimensions.width,  // 1920
        height: dimensions.height // 1080
      });
    } else {
      // For PDF formats, set the actual A4 dimensions for coordinate calculations
      setActualPdfDimensions({
        width: dimensions.width,   // 595 for A4 portrait
        height: dimensions.height  // 842 for A4 portrait
      });
    }

  }, [targetFormat]);

  // Update numPages when propNumPages changes (for SVG slides)
  useEffect(() => {
    if (propNumPages !== undefined) {
      setNumPages(propNumPages);
    }
  }, [propNumPages]);

  // Calculate scale factor when both dimensions are available
  useEffect(() => {
    if (actualPdfDimensions && pageWidth) {
      // Calculate the scale factor between frontend preview and actual PDF
      // Frontend displays at pageWidth, actual PDF is actualPdfDimensions.width
      const calculatedScaleFactor = actualPdfDimensions.width / pageWidth;

      setScaleFactor(calculatedScaleFactor);

    }
  }, [actualPdfDimensions, pageWidth]);

  // Save instructions visibility preference to localStorage
  useEffect(() => {
    localStorage.setItem('pdfViewer.showInstructions', showInstructions.toString());
  }, [showInstructions]);

  // Fetch resolved template content when fileId changes
  useEffect(() => {
    if (fileId && templateType === 'branding') {
      setIsLoadingResolvedContent(true);
      fetchResolvedTemplateContent(fileId)
        .then((resolvedData) => {
          if (resolvedData) {
            setResolvedTemplateContent(resolvedData.resolvedTemplate);
          } else {
            setResolvedTemplateContent(null);
            ludlog.game('Failed to resolve template content - using fallback display');
          }
        })
        .catch((error) => {
          luderror.api('Error fetching resolved template content:', error);
          setResolvedTemplateContent(null);
        })
        .finally(() => {
          setIsLoadingResolvedContent(false);
        });
    } else {
      setResolvedTemplateContent(null);
    }
  }, [fileId, templateType]);

  // Group helper functions
  const getElementGroup = (elementKey) => {
    let element;
    if (templateConfig.customElements?.[elementKey]) {
      element = templateConfig.customElements[elementKey];
    } else if (templateConfig[elementKey]) {
      element = templateConfig[elementKey];
    }

    if (element?.groupId && groups[element.groupId]) {
      return groups[element.groupId];
    }
    return null;
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
    ['logo', 'text', 'url', 'copyright-text', 'user-info', 'watermark-logo'].forEach(elementKey => {
      if (templateConfig[elementKey]?.groupId === groupId) {
        elements.push([elementKey, templateConfig[elementKey]]);
      }
    });

    return elements;
  };

  const isGroupLocked = (groupId) => {
    const groupElements = getGroupElements(groupId);
    return groupElements.every(([, element]) => element.locked);
  };

  // Helper function to find element in both unified and legacy structures
  const findElement = (elementKey) => {
    const hasUnifiedStructure = templateConfig?.elements;

    if (hasUnifiedStructure) {
      // NEW UNIFIED STRUCTURE: search in element arrays
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
    } else {
      // LEGACY STRUCTURE: search in customElements and direct properties
      if (templateConfig.customElements?.[elementKey]) {
        return { element: templateConfig.customElements[elementKey], isCustom: true };
      } else if (templateConfig[elementKey]) {
        return { element: templateConfig[elementKey], isBuiltIn: true };
      }
    }

    return null;
  };

  const handleMouseDown = (elementKey, event) => {
    event.preventDefault();
    event.stopPropagation();

    // If a menu is open, only allow dragging of the selected item
    if (focusedItem && focusedItem !== elementKey) {
      return; // Don't start drag for non-selected items when menu is open
    }

    // Find the element in the appropriate structure
    const elementInfo = findElement(elementKey);
    if (!elementInfo) {
      luderror.ui('Element not found:', elementKey);
      return;
    }

    // Check if the individual element is locked
    if (elementInfo.element.locked) {
      return; // Prevent dragging locked elements
    }

    // Check if element is in a locked group
    const elementGroup = getElementGroup(elementKey);
    if (elementGroup && isGroupLocked(elementGroup.id)) {
      return; // Prevent dragging locked groups
    }

    setIsDragging(elementKey);

    const elementPosition = elementInfo.element.position;
    setDragStart({
      x: event.clientX,
      y: event.clientY,
      elementX: elementPosition.x,
      elementY: elementPosition.y
    });
  };

  // Helper function to update element position in both structures
  const updateElementPosition = (config, elementKey, newX, newY) => {
    const hasUnifiedStructure = config?.elements;

    if (hasUnifiedStructure) {
      // NEW UNIFIED STRUCTURE: update element in array
      const newConfig = JSON.parse(JSON.stringify(config)); // Deep clone

      for (const [elementType, elementArray] of Object.entries(newConfig.elements)) {
        if (Array.isArray(elementArray)) {
          for (let index = 0; index < elementArray.length; index++) {
            const element = elementArray[index];
            const currentElementKey = element.id || `${elementType}_${index}`;
            if (currentElementKey === elementKey) {
              newConfig.elements[elementType][index] = {
                ...element,
                position: {
                  ...element.position,
                  x: Math.round(newX),
                  y: Math.round(newY)
                }
              };
              return newConfig;
            }
          }
        }
      }
    } else {
      // LEGACY STRUCTURE: update in customElements or direct property
      const newConfig = { ...config };

      if (config.customElements?.[elementKey]) {
        newConfig.customElements = {
          ...config.customElements,
          [elementKey]: {
            ...config.customElements[elementKey],
            position: {
              ...config.customElements[elementKey].position,
              x: Math.round(newX),
              y: Math.round(newY)
            }
          }
        };
      } else if (config[elementKey]) {
        newConfig[elementKey] = {
          ...config[elementKey],
          position: {
            ...config[elementKey].position,
            x: Math.round(newX),
            y: Math.round(newY)
          }
        };
      }

      return newConfig;
    }

    return config; // Return unchanged if element not found
  };

  const handleMouseMove = (event) => {
    if (!isDragging || !dragStart || !overlayRef.current) return;

    const overlayElement = overlayRef.current;
    const rect = overlayElement.getBoundingClientRect();

    // Calculate mouse position relative to the overlay
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // 🎯 PDF-NORMALIZED COORDINATE CALCULATION
    // Convert mouse position to PDF-relative percentages that are consistent across all screen sizes
    let newX, newY;

    if (actualPdfDimensions) {
      // Calculate the scale factor between display and actual PDF
      const displayScale = rect.width / actualPdfDimensions.width;

      // Convert mouse position to actual PDF coordinates
      const pdfMouseX = mouseX / displayScale;
      const pdfMouseY = mouseY / displayScale;

      // Convert to percentages based on actual PDF dimensions
      newX = (pdfMouseX / actualPdfDimensions.width) * 100;
      newY = (pdfMouseY / actualPdfDimensions.height) * 100;
    } else {
      // Fallback to basic calculation if PDF dimensions not available yet
      newX = (mouseX / rect.width) * 100;
      newY = (mouseY / rect.height) * 100;

      ludlog.ui('PDF dimensions not available', { data: { action: 'usingFallbackCoordinateCalculation' } });
    }

    // Add boundary constraints with minimal padding to allow full page coverage
    // Use smaller padding for better element placement freedom, especially for A4 templates
    const paddingX = 2; // 2% horizontal padding (minimal constraint)
    const paddingY = 1; // 1% vertical padding (allows near-edge positioning)
    newX = Math.max(paddingX, Math.min(100 - paddingX, newX));
    newY = Math.max(paddingY, Math.min(100 - paddingY, newY));

    // Update position during drag
    if (onTemplateConfigChange) {
      // Find the current dragged element
      const draggedElementInfo = findElement(isDragging);
      if (!draggedElementInfo) return;

      // Check if the dragged element is in a group
      const draggedElementGroup = getElementGroup(isDragging);

      if (draggedElementGroup) {
        // Group movement: move all elements in the group together
        const currentElement = draggedElementInfo.element;
        const deltaX = Math.round(newX) - currentElement.position.x;
        const deltaY = Math.round(newY) - currentElement.position.y;

        // Move all elements in the group by the same delta
        let newConfig = { ...templateConfig };
        const groupElements = getGroupElements(draggedElementGroup.id);

        groupElements.forEach(([elementId, element]) => {
          const newElementX = Math.max(2, Math.min(98, element.position.x + deltaX));
          const newElementY = Math.max(1, Math.min(99, element.position.y + deltaY));
          newConfig = updateElementPosition(newConfig, elementId, newElementX, newElementY);
        });

        onTemplateConfigChange(newConfig, {
          actualPdfDimensions,
          scaleFactor,
          previewDimensions: {
            width: overlayElement.clientWidth,
            height: overlayElement.clientHeight
          }
        });
      } else {
        // Single element movement
        const newConfig = updateElementPosition(templateConfig, isDragging, newX, newY);

        onTemplateConfigChange(newConfig, {
          actualPdfDimensions,
          scaleFactor,
          previewDimensions: {
            width: overlayElement.clientWidth,
            height: overlayElement.clientHeight
          }
        });
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(null);
    setDragStart(null);
  };

  // Function to handle element duplication
  const handleDuplicateElement = (elementId) => {
    const element = templateConfig.customElements[elementId];
    if (!element) return;

    const newElementId = `${elementId}_copy_${Date.now()}`;
    const newElement = {
      ...element,
      id: newElementId,
      position: {
        x: element.position.x + 5, // Offset by 5% to make it visible
        y: element.position.y + 5
      }
    };

    const newConfig = {
      ...templateConfig,
      customElements: {
        ...templateConfig.customElements,
        [newElementId]: newElement
      }
    };

    onTemplateConfigChange(newConfig);
  };

  // Helper function to render duplicate button
  const renderDuplicateButton = (elementId) => {
    return (
      <button
        className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 hover:bg-blue-600 text-white rounded-full
                   flex items-center justify-center text-xs shadow-lg opacity-0 group-hover:opacity-100
                   transition-opacity duration-200 z-20 border-2 border-white"
        onClick={(e) => {
          e.stopPropagation();
          handleDuplicateElement(elementId);
        }}
        title="שכפל אלמנט"
        style={{ pointerEvents: 'auto' }}
      >
        📋
      </button>
    );
  };

  // Add global event listeners for drag operations only (pan drag disabled)
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    // Note: Pan drag event listeners removed - only scroll-based panning available

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart]);

  // Add wheel event listener with non-passive option to allow preventDefault
  useEffect(() => {
    const containerElement = containerRef.current;
    if (containerElement) {
      containerElement.addEventListener('wheel', handleWheel, { passive: false });

      return () => {
        containerElement.removeEventListener('wheel', handleWheel, { passive: false });
      };
    }
  }, []);

  // Helper function to resolve user email templates
  const resolveUserEmailTemplate = (content) => {
    if (!content || typeof content !== 'string') {
      return 'משתמש@דוגמה.com';
    }

    // Check if content contains user email template
    if (content.includes('{{user.email}}') && currentUser?.email) {
      return content.replace(/\{\{user\.email\}\}/g, currentUser.email);
    }

    // Return original content if no template or no user
    return content;
  };

  const renderTemplateOverlay = () => {
    if (!templateConfig || !showTemplateElements) return null;

    // Unified rendering for all template types
    return renderUnifiedElements();
  };

  const renderUnifiedElements = () => {
    // Add null checks and defaults to prevent errors during initial load
    if (!templateConfig) return null;

    // Support both new unified structure and legacy structure during transition
    const hasUnifiedStructure = templateConfig.elements;

    return (
      <div
        ref={overlayRef}
        className="absolute pointer-events-none"
        style={{
          width: '100%',
          height: '100%',
          top: 0,
          left: 0,
          zIndex: 10
        }}
      >

        {/* Render all elements from unified array structure */}
        {hasUnifiedStructure ? (
          // NEW UNIFIED STRUCTURE: elements.logo[], elements.url[], etc.
          Object.entries(templateConfig.elements).flatMap(([elementType, elementArray]) => {
            if (!Array.isArray(elementArray)) return [];

            return elementArray.map((element, index) => {
              if (!element || !element.visible || element.hidden) return null;

              // Generate unique element key for arrays: use element.id or fallback to type_index
              const elementKey = element.id || `${elementType}_${index}`;
              const isFocused = focusedItem === elementKey;
              const isDraggingThis = isDragging === elementKey;

              return renderElementByType(elementType, element, elementKey, isFocused, isDraggingThis);
            }).filter(Boolean);
          })
        ) : (
          // LEGACY STRUCTURE SUPPORT: Direct built-in elements + customElements
          <>
            {['logo', 'text', 'url', 'copyright-text', 'user-info', 'watermark-logo'].map(builtInKey => {
              const builtInElement = templateConfig[builtInKey];
              if (!builtInElement || !builtInElement.visible || builtInElement.hidden) return null;

              const isFocused = focusedItem === builtInKey;
              const isDraggingThis = isDragging === builtInKey;

              return renderElementByType(builtInKey, builtInElement, builtInKey, isFocused, isDraggingThis);
            })}

            {templateConfig.customElements && Object.entries(templateConfig.customElements).map(([elementId, element]) => {
              if (!element || !element.visible || element.hidden) return null;

              const isFocused = focusedItem === elementId;
              const isDraggingThis = isDragging === elementId;

              return renderElementByType(element.type, element, elementId, isFocused, isDraggingThis);
            })}
          </>
        )}
      </div>
    );
  };

  // Unified element rendering function - handles any element type
  const renderElementByType = (elementType, element, elementKey, isFocused, isDraggingThis) => {
    const isLocked = element.locked;
    const commonClasses = `absolute pointer-events-auto select-none transition-all duration-200 group ${
      isDraggingThis ? 'cursor-grabbing scale-105 z-50' :
      isLocked ? 'cursor-not-allowed opacity-75' : 'cursor-grab hover:scale-105'
    } ${isFocused ? 'ring-4 ring-blue-400 ring-opacity-75 rounded-lg' : ''} ${
      element.groupId ? 'ring-2 ring-purple-300' : ''
    } ${isLocked ? 'ring-2 ring-red-300' : ''}`;

    const commonStyle = {
      left: `${element.position.x}%`,
      top: `${element.position.y}%`,
      transform: 'translate(-50%, -50%)',
      opacity: (element.style?.opacity || 100) / 100
    };

    switch (elementType) {
      case 'logo':
      case 'watermark-logo':
        return (
          <div
            key={elementKey}
            className={commonClasses}
            style={{
              ...commonStyle,
              transform: getElementTransformStyle(element, elementType)
            }}
            onMouseDown={(e) => handleMouseDown(elementKey, e)}
          >
            <LogoDisplay
              size="small"
              alt={elementType === 'watermark-logo' ? 'Watermark Logo' : 'Logo'}
              style={{
                width: `${element.style?.size || 60}px`,
                height: 'auto',
                filter: `drop-shadow(${getElementShadowStyle(element, elementType)})`
              }}
              draggable={false}
            />
          </div>
        );

      case 'text':
        const displayContent = getElementDisplayContent(element, elementType, resolvedTemplateContent);
        return (
          <div
            key={elementKey}
            className={commonClasses}
            style={{
              ...commonStyle,
              ...applyHebrewFontStyle(
                displayContent,
                element.style?.bold,
                element.style?.italic,
                {
                  fontSize: `${element.style?.fontSize || 12}px`,
                  color: element.style?.color || '#000000',
                  textAlign: 'center',
                  width: `${element.style?.width || 300}px`,
                  wordWrap: 'break-word',
                  overflow: 'visible',
                  transform: getElementTransformStyle(element, elementType),
                  textShadow: getElementShadowStyle(element, elementType, true)
                }
              )
            }}
            onMouseDown={(e) => handleMouseDown(elementKey, e)}
            title={isLoadingResolvedContent ? 'טוען תוכן...' : ''}
          >
            {displayContent || 'Your copyright text here'}
          </div>
        );

      case 'url':
        const displayHref = getElementDisplayHref(element, resolvedTemplateContent);
        return (
          <div
            key={elementKey}
            className={commonClasses}
            style={{
              ...commonStyle,
              ...applyHebrewFontStyle(
                displayHref,
                element.style?.bold,
                element.style?.italic,
                {
                  fontSize: `${element.style?.fontSize || 12}px`,
                  color: element.style?.color || '#0066cc',
                  textAlign: 'center',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  transform: getElementTransformStyle(element, elementType),
                  textShadow: getElementShadowStyle(element, elementType, true)
                }
              )
            }}
            onMouseDown={(e) => handleMouseDown(elementKey, e)}
            title={isLoadingResolvedContent ? 'טוען תוכן...' : ''}
          >
            {displayHref || urls.external.marketing.main()}
          </div>
        );

      case 'copyright-text':
      case 'free-text':
        const textContent = getElementDisplayContent(element, elementType, resolvedTemplateContent) || element.content;
        return (
          <div
            key={elementKey}
            className={commonClasses}
            style={{
              ...commonStyle,
              ...applyHebrewFontStyle(
                textContent,
                element.style?.bold,
                element.style?.italic,
                {
                  fontSize: `${element.style?.fontSize || 12}px`,
                  color: element.style?.color || '#000000',
                  textAlign: 'center',
                  width: `${element.style?.width || 300}px`,
                  wordWrap: 'break-word',
                  overflow: 'visible',
                  transform: getElementTransformStyle(element, elementType),
                  textShadow: getElementShadowStyle(element, elementType, true)
                }
              )
            }}
            onMouseDown={(e) => handleMouseDown(elementKey, e)}
            title={isLoadingResolvedContent ? 'טוען תוכן...' : ''}
          >
            {textContent || (elementType === 'copyright-text' ? 'זכויות יוצרים' : 'טקסט חופשי')}
          </div>
        );

      case 'user-info':
        const userInfoContent = getElementDisplayContent(element, elementType, resolvedTemplateContent) ||
                               resolveUserEmailTemplate(element.content);
        return (
          <div
            key={elementKey}
            className={commonClasses}
            style={{
              ...commonStyle,
              ...applyHebrewFontStyle(
                userInfoContent,
                element.style?.bold,
                element.style?.italic,
                {
                  fontSize: `${element.style?.fontSize || 12}px`,
                  color: element.style?.color || '#000000',
                  textAlign: 'center',
                  width: `${element.style?.width || 300}px`,
                  wordWrap: 'break-word',
                  overflow: 'visible',
                  transform: getElementTransformStyle(element, elementType),
                  textShadow: getElementShadowStyle(element, elementType, true)
                }
              )
            }}
            onMouseDown={(e) => handleMouseDown(elementKey, e)}
            title={isLoadingResolvedContent ? 'טוען תוכן...' : ''}
          >
            {userInfoContent}
          </div>
        );

      case 'box':
        return (
          <div
            key={elementKey}
            className={commonClasses}
            style={{
              ...commonStyle,
              transform: getElementTransformStyle(element, elementType)
            }}
            onMouseDown={(e) => handleMouseDown(elementKey, e)}
          >
            <div
              style={{
                width: `${element.style.width}px`,
                height: `${element.style.height}px`,
                border: `${element.style.borderWidth}px solid ${element.style.borderColor}`,
                backgroundColor: element.style.backgroundColor === 'transparent' ? 'transparent' : element.style.backgroundColor,
                boxShadow: getElementShadowStyle(element, elementType)
              }}
            />
          </div>
        );

      case 'line':
        return (
          <div
            key={elementKey}
            className={commonClasses}
            style={{
              ...commonStyle,
              transform: getElementTransformStyle(element, elementType)
            }}
            onMouseDown={(e) => handleMouseDown(elementKey, e)}
          >
            <div
              style={{
                width: `${element.style.width}px`,
                height: `${element.style.height}px`,
                backgroundColor: element.style.color,
                boxShadow: getElementShadowStyle(element, elementType)
              }}
            />
          </div>
        );

      case 'dotted-line':
        return (
          <div
            key={elementKey}
            className={commonClasses}
            style={{
              ...commonStyle,
              transform: getElementTransformStyle(element, elementType)
            }}
            onMouseDown={(e) => handleMouseDown(elementKey, e)}
          >
            <div
              style={{
                width: `${element.style.width}px`,
                height: `${element.style.height}px`,
                backgroundColor: element.style.color,
                backgroundImage: `repeating-linear-gradient(90deg, ${element.style.color} 0px, ${element.style.color} 5px, transparent 5px, transparent 10px)`,
                boxShadow: getElementShadowStyle(element, elementType)
              }}
            />
          </div>
        );

      case 'circle':
        return (
          <div
            key={elementKey}
            className={commonClasses}
            style={{
              ...commonStyle,
              transform: getElementTransformStyle(element, elementType)
            }}
            onMouseDown={(e) => handleMouseDown(elementKey, e)}
          >
            <div
              style={{
                width: `${element.style?.size || 50}px`,
                height: `${element.style?.size || 50}px`,
                borderRadius: '50%',
                border: `${element.style?.borderWidth || 2}px solid ${element.style?.borderColor || '#000000'}`,
                backgroundColor: element.style?.backgroundColor === 'transparent' ? 'transparent' : (element.style?.backgroundColor || 'transparent'),
                boxShadow: getElementShadowStyle(element, elementType)
              }}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Unified Toolbar - Sticks to header */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 z-50">
        <div className="flex items-center justify-between">
          {/* Left side - Zoom Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleZoomOut}
              className="w-8 h-8 flex items-center justify-center rounded border border-gray-300 hover:bg-gray-50 text-sm font-bold"
              title="הקטן תצוגה"
            >
              −
            </button>
            <span className="text-sm font-medium min-w-[60px] text-center px-2 py-1 bg-gray-50 rounded">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="w-8 h-8 flex items-center justify-center rounded border border-gray-300 hover:bg-gray-50 text-sm font-bold"
              title="הגדל תצוגה"
            >
              +
            </button>
            <div className="mx-2 h-5 w-px bg-gray-300"></div>
            <button
              onClick={handleZoomReset}
              className="px-3 py-1 text-sm rounded border border-gray-300 hover:bg-gray-50"
              title="איפוס תצוגה ומיקום"
            >
              🎯 מרכז
            </button>
            {!showInstructions && (
              <>
                <div className="mx-2 h-5 w-px bg-gray-300"></div>
                <button
                  onClick={() => setShowInstructions(true)}
                  className="w-8 h-8 flex items-center justify-center rounded border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm"
                  title="הצג הוראות ניווט"
                >
                  ?
                </button>
              </>
            )}
          </div>

          {/* Right side - Page Navigation */}
          {numPages && numPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onPageChange?.(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 rounded disabled:cursor-not-allowed text-sm"
              >
                הקודם
              </button>
              <span className="text-sm font-medium text-gray-700 px-3 py-1 bg-gray-50 rounded min-w-[120px] text-center">
                {isSvgFormat() ? `שקף ${currentPage} מתוך ${numPages}` : `עמוד ${currentPage} מתוך ${numPages}`}
              </span>
              <button
                onClick={() => onPageChange?.(Math.min(numPages, currentPage + 1))}
                disabled={currentPage >= numPages}
                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 rounded disabled:cursor-not-allowed text-sm"
              >
                הבא
              </button>
            </div>
          )}
        </div>
      </div>


      {/* Fixed PDF Viewport - This is the "window" that NEVER changes size */}
      <div
        ref={containerRef}
        className="flex-1 bg-gray-100 relative"
        style={{
          cursor: 'default', // No drag cursor - drag panning disabled
          overflow: 'hidden' // CRITICAL: This clips content that goes outside
        }}
      >
        {/* PDF Content - ONLY this zooms/moves, viewport stays fixed */}
        <div
          className="absolute left-1/2 top-1/2"
          style={{
            transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transition: isPanning ? 'none' : 'transform 0.1s ease-out'
          }}
        >
{isSvgFormat() ? (
            // SVG rendering for lesson plans
            <div
              className="relative bg-white rounded-lg shadow-lg"
              style={{
                width: `${pageWidth}px`,
                height: `${pageWidth * getPageDimensions().aspectRatio}px`
              }}
            >
              {/* SVG Content - conditionally rendered based on showFileContent */}
              {showFileContent && (
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage: `url(${pdfUrl})`,
                    backgroundSize: 'contain', // Use 'contain' to show full slide without cropping
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center'
                  }}
                />
              )}
              {renderTemplateOverlay()}
            </div>
          ) : (
            // PDF rendering for PDF formats
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={
                <div className="flex items-center justify-center p-8 bg-white rounded-lg shadow-lg border border-gray-200">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
              }
              error={
                <div className="flex items-center justify-center p-8 text-red-500 bg-white rounded-lg shadow-lg border border-gray-200">
                  {(() => {
                    // Call onDocumentLoad even on error to stop the loading spinner
                    if (onDocumentLoad) {
                      setTimeout(() => onDocumentLoad(), 0);
                    }
                    return 'שגיאה בטעינת הקובץ';
                  })()}
                </div>
              }
            >
              <div
                className="relative bg-white rounded-lg shadow-lg"
                style={{
                  width: `${pageWidth}px`,
                  height: `${pageWidth * getPageDimensions().aspectRatio}px`
                }}
              >
                {/* PDF Page Content - conditionally rendered based on showFileContent */}
                {showFileContent && (
                  <Page
                    pageNumber={currentPage}
                    width={pageWidth}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                  />
                )}
                {renderTemplateOverlay()}
              </div>
            </Document>
          )}
        </div>
      </div>

      {/* Instructions */}
      {showInstructions && (
        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur rounded-lg shadow-lg border border-gray-200 p-3 text-xs text-gray-600 max-w-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium">💡 טיפים לניווט:</div>
            <button
              onClick={() => setShowInstructions(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded"
              title="סגור הוראות"
            >
              ✕
            </button>
          </div>
          <ul className="space-y-1">
            <li>• <strong>גלילה</strong>: גלגלת עכבר למעלה/מטה</li>
            <li>• <strong>זום</strong>: Ctrl + גלגלת עכבר</li>
            <li>• <strong>עריכה</strong>: לחץ על אלמנטים לגרירה</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default TemplateCanvas;

import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { getTextFontFamily, containsHebrew } from '@/utils/hebrewUtils';
import logo from '@/assets/images/logo.png';

// Configure PDF.js worker - use CDN for compatibility
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const TemplateCanvas = ({
  pdfUrl,
  footerConfig,
  onPageChange,
  onFooterConfigChange,
  focusedItem,
  currentPage = 1,
  groups = {},
  targetFormat = 'pdf-a4-portrait', // Add target format prop
  templateType = 'branding' // Add template type prop
}) => {
  const [numPages, setNumPages] = useState(null);
  const [pageWidth, setPageWidth] = useState(() => {
    // Set initial width based on format
    if (targetFormat === 'pdf-a4-landscape') {
      return 842;
    } else if (targetFormat === 'svg-lessonplan') {
      return 800;
    } else {
      return 595;
    }
  });
  const [isDragging, setIsDragging] = useState(null);
  const [dragStart, setDragStart] = useState(null);
  const [actualPdfDimensions, setActualPdfDimensions] = useState(null);
  const [scaleFactor, setScaleFactor] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const [showInstructions, setShowInstructions] = useState(() => {
    // Check localStorage for user preference, default to true for first-time users
    const stored = localStorage.getItem('pdfViewer.showInstructions');
    return stored === null ? true : stored === 'true';
  });
  const overlayRef = React.useRef(null);
  const containerRef = React.useRef(null);

  // Helper function to check if we're working with SVG
  const isSvgFormat = () => {
    return targetFormat === 'svg-lessonplan';
  };

  // Helper function to get correct dimensions based on format
  const getPageDimensions = () => {
    if (targetFormat === 'pdf-a4-landscape') {
      return {
        width: 842,
        height: 595,
        aspectRatio: 595 / 842 // height / width for landscape
      };
    } else if (targetFormat === 'svg-lessonplan') {
      return {
        width: 800,
        height: 600,
        aspectRatio: 600 / 800 // height / width for SVG lesson plans
      };
    } else {
      return {
        width: 595,
        height: 842,
        aspectRatio: 842 / 595 // height / width for portrait
      };
    }
  };

  const onDocumentLoadSuccess = async ({ numPages, getDocument }) => {
    setNumPages(numPages);

    // Extract actual PDF page dimensions for scaling calculations
    try {
      const pdfDocument = await getDocument();
      const page = await pdfDocument.getPage(currentPage);
      const viewport = page.getViewport({ scale: 1.0 });

      const actualDimensions = {
        width: viewport.width,
        height: viewport.height
      };

      setActualPdfDimensions(actualDimensions);

      console.log('📐 PDF Dimensions extracted:', {
        actualWidth: actualDimensions.width,
        actualHeight: actualDimensions.height,
        note: 'These are the real PDF units that backend uses'
      });
    } catch (error) {
      console.error('Failed to extract PDF dimensions:', error);
    }
  };

  // Pan handlers for canvas movement
  const handlePanStart = (event) => {
    // Start panning unless clicking on draggable footer elements
    const target = event.target;
    const isFooterElement = target.closest('[data-footer-element]') ||
                           target.closest('.pointer-events-auto');

    if (!isFooterElement) {
      setIsPanning(true);
      setLastPanPoint({ x: event.clientX, y: event.clientY });
      event.preventDefault();
    }
  };

  const handlePanMove = (event) => {
    if (isPanning && containerRef.current) {
      const deltaX = event.clientX - lastPanPoint.x;
      const deltaY = event.clientY - lastPanPoint.y;

      // Get container dimensions for boundary calculations
      const containerRect = containerRef.current.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const containerHeight = containerRect.height;

      // Calculate document dimensions at current zoom
      const pageDimensions = getPageDimensions();
      const documentHeight = pageWidth * pageDimensions.aspectRatio;
      const scaledDocWidth = pageWidth * zoom;
      const scaledDocHeight = documentHeight * zoom;

      // Calculate maximum pan values to keep document partially visible
      const minVisiblePx = 100; // Minimum pixels that must remain visible
      const maxPanX = Math.max(0, (scaledDocWidth - minVisiblePx) / 2);
      const maxPanY = Math.max(0, (scaledDocHeight - minVisiblePx) / 2);
      const minPanX = -maxPanX;
      const minPanY = -maxPanY;

      // Apply natural pan sensitivity for smooth navigation
      const sensitivity = 1.0; // Good sensitivity for natural panning
      const zoomCompensation = 1 / zoom; // Compensate for zoom scaling
      const compensatedDeltaX = deltaX * sensitivity * zoomCompensation;
      const compensatedDeltaY = deltaY * sensitivity * zoomCompensation;

      // Calculate new pan position with boundaries
      const newPanX = Math.max(minPanX / zoom, Math.min(maxPanX / zoom, prev.x + compensatedDeltaX));
      const newPanY = Math.max(minPanY / zoom, Math.min(maxPanY / zoom, prev.y + compensatedDeltaY));

      setPan(prev => ({
        x: newPanX,
        y: newPanY
      }));

      setLastPanPoint({ x: event.clientX, y: event.clientY });
      event.preventDefault();
    }
  };

  const handlePanEnd = () => {
    setIsPanning(false);
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


  // Enhanced wheel handler for both zoom and scroll
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

  // Calculate scale factor when both dimensions are available
  useEffect(() => {
    if (actualPdfDimensions && pageWidth) {
      // Calculate the scale factor between frontend preview and actual PDF
      // Frontend displays at pageWidth, actual PDF is actualPdfDimensions.width
      const calculatedScaleFactor = actualPdfDimensions.width / pageWidth;

      setScaleFactor(calculatedScaleFactor);

      console.log('📏 Scale Factor calculated:', {
        actualPdfWidth: actualPdfDimensions.width,
        actualPdfHeight: actualPdfDimensions.height,
        previewWidth: pageWidth,
        scaleFactor: calculatedScaleFactor,
        note: 'Frontend positions × scaleFactor = Backend positions'
      });
    }
  }, [actualPdfDimensions, pageWidth]);

  // Save instructions visibility preference to localStorage
  useEffect(() => {
    localStorage.setItem('pdfViewer.showInstructions', showInstructions.toString());
  }, [showInstructions]);

  // Group helper functions
  const getElementGroup = (elementKey) => {
    let element;
    if (footerConfig.customElements?.[elementKey]) {
      element = footerConfig.customElements[elementKey];
    } else if (footerConfig[elementKey]) {
      element = footerConfig[elementKey];
    }

    if (element?.groupId && groups[element.groupId]) {
      return groups[element.groupId];
    }
    return null;
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

  const isGroupLocked = (groupId) => {
    const groupElements = getGroupElements(groupId);
    return groupElements.every(([, element]) => element.locked);
  };

  const handleMouseDown = (element, event) => {
    event.preventDefault();
    event.stopPropagation();

    // If a menu is open, only allow dragging of the selected item
    if (focusedItem && focusedItem !== element) {
      return; // Don't start drag for non-selected items when menu is open
    }

    // Check if element is in a locked group
    const elementGroup = getElementGroup(element);
    if (elementGroup && isGroupLocked(elementGroup.id)) {
      console.log(`🔒 Cannot drag element ${element} - group ${elementGroup.name} is locked`);
      return; // Prevent dragging locked groups
    }

    setIsDragging(element);

    // Get element position from correct location
    let elementPosition;
    if (footerConfig.customElements?.[element]) {
      elementPosition = footerConfig.customElements[element].position;
    } else if (footerConfig[element]) {
      elementPosition = footerConfig[element].position;
    } else {
      console.error('Element not found:', element);
      return;
    }

    setDragStart({
      x: event.clientX,
      y: event.clientY,
      elementX: elementPosition.x,
      elementY: elementPosition.y
    });
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

      console.log('🎯 PDF-NORMALIZED Coordinate Calculation:', {
        mousePosition: { x: mouseX, y: mouseY },
        displayDimensions: { width: rect.width, height: rect.height },
        actualPdfDimensions: actualPdfDimensions,
        displayScale: displayScale,
        pdfMousePosition: { x: pdfMouseX, y: pdfMouseY },
        finalPercentages: { x: newX, y: newY },
        verification: {
          backToPdfCoords: {
            x: actualPdfDimensions.width * newX / 100,
            y: actualPdfDimensions.height * newY / 100
          },
          shouldMatch: { x: pdfMouseX, y: pdfMouseY }
        },
        note: 'These percentages are now consistent across all screen sizes and match actual PDF positioning'
      });

    } else {
      // Fallback to basic calculation if PDF dimensions not available yet
      newX = (mouseX / rect.width) * 100;
      newY = (mouseY / rect.height) * 100;

      console.warn('⚠️ PDF dimensions not available, using fallback coordinate calculation');
    }

    // Add boundary constraints with padding to keep elements fully inside
    const padding = 5; // 5% padding from edges
    newX = Math.max(padding, Math.min(100 - padding, newX));
    newY = Math.max(padding, Math.min(100 - padding, newY));

    // DETAILED COORDINATE DEBUGGING
    console.log('🎯 FINAL Frontend Coordinates (PDF-Normalized):', {
      inputMouse: { x: mouseX, y: mouseY },
      canvasSize: { width: rect.width, height: rect.height },
      outputPercentages: { x: newX, y: newY },
      pdfEquivalent: actualPdfDimensions ? {
        x: (actualPdfDimensions.width * newX / 100),
        y: actualPdfDimensions.height - (actualPdfDimensions.height * newY / 100)
      } : 'PDF dimensions not loaded',
      consistency: 'These percentages will produce the same PDF position on any screen size',
      note: 'Y=0 at top, Y=100 at bottom (CSS coordinate system)'
    });

    // Update position during drag
    if (onFooterConfigChange) {
      let newConfig = { ...footerConfig };

      // Check if the dragged element is in a group
      const draggedElementGroup = getElementGroup(isDragging);

      if (draggedElementGroup) {
        // Group movement: move all elements in the group together
        console.log(`👥 Moving group ${draggedElementGroup.name} with element ${isDragging}`);

        // Calculate movement delta
        let currentElement;
        if (footerConfig.customElements?.[isDragging]) {
          currentElement = footerConfig.customElements[isDragging];
        } else {
          currentElement = footerConfig[isDragging];
        }

        const deltaX = Math.round(newX) - currentElement.position.x;
        const deltaY = Math.round(newY) - currentElement.position.y;

        console.log(`📐 Group movement delta: x=${deltaX}, y=${deltaY}`);

        // Move all elements in the group by the same delta
        const groupElements = getGroupElements(draggedElementGroup.id);
        groupElements.forEach(([elementId, element]) => {
          const newElementX = Math.max(5, Math.min(95, element.position.x + deltaX));
          const newElementY = Math.max(5, Math.min(95, element.position.y + deltaY));

          if (newConfig.customElements?.[elementId]) {
            newConfig.customElements[elementId] = {
              ...newConfig.customElements[elementId],
              position: {
                ...newConfig.customElements[elementId].position,
                x: newElementX,
                y: newElementY
              }
            };
          } else if (newConfig[elementId]) {
            newConfig[elementId] = {
              ...newConfig[elementId],
              position: {
                ...newConfig[elementId].position,
                x: newElementX,
                y: newElementY
              }
            };
          }
        });

      } else {
        // Single element movement
        if (footerConfig.customElements?.[isDragging]) {
          // Handle custom elements
          newConfig.customElements = {
            ...newConfig.customElements,
            [isDragging]: {
              ...newConfig.customElements[isDragging],
              position: {
                ...newConfig.customElements[isDragging].position,
                x: Math.round(newX),
                y: Math.round(newY)
              }
            }
          };
        } else {
          // Handle built-in elements (logo, text, url)
          newConfig[isDragging] = {
            ...newConfig[isDragging],
            position: {
              ...newConfig[isDragging].position,
              x: Math.round(newX),
              y: Math.round(newY)
            }
          };
        }
      }

      onFooterConfigChange(newConfig, {
        actualPdfDimensions,
        scaleFactor,
        previewDimensions: {
          width: overlayElement.clientWidth,
          height: overlayElement.clientHeight
        }
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(null);
    setDragStart(null);
  };

  // Add global event listeners for drag and pan operations
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    if (isPanning) {
      document.addEventListener('mousemove', handlePanMove);
      document.addEventListener('mouseup', handlePanEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousemove', handlePanMove);
      document.removeEventListener('mouseup', handlePanEnd);
    };
  }, [isDragging, dragStart, isPanning]);


  const renderTemplateOverlay = () => {
    if (!footerConfig) return null;

    // Unified rendering for all template types
    return renderUnifiedElements();
  };

  const renderUnifiedElements = () => {
    const { logo, text, url } = footerConfig;

    // Debug logging
    console.log('🖼️ Rendering unified overlay for templateType:', templateType);
    console.log('🖼️ Footer config:', footerConfig);

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
        {/* Logo */}
        {logo.visible && logo.url && (
          <div
            className={`absolute pointer-events-auto select-none transition-all duration-200 ${
              isDragging === 'logo' ? 'cursor-grabbing scale-105 z-50' : 'cursor-grab hover:scale-105'
            } ${
              focusedItem === 'logo' ? 'ring-4 ring-blue-400 ring-opacity-75 rounded-lg' : ''
            } ${
              logo.groupId ? 'ring-2 ring-purple-300' : ''
            }`}
            style={{
              left: `${logo.position.x}%`,
              top: `${logo.position.y}%`,
              transform: 'translate(-50%, -50%)',
              opacity: logo.style.opacity / 100
            }}
            onMouseDown={(e) => handleMouseDown('logo', e)}
          >
            <img
              src={logo.url}
              alt="Logo"
              style={{
                width: `${logo.style.size}px`,
                height: 'auto'
              }}
              draggable={false}
            />
          </div>
        )}

        {/* Copyright Text */}
        {text.visible && text.content && text.content.length > 0 && (
          <div
            className={`absolute pointer-events-auto select-none transition-all duration-200 ${
              isDragging === 'text' ? 'cursor-grabbing scale-105 z-50' : 'cursor-grab hover:scale-105'
            } ${
              focusedItem === 'text' ? 'ring-4 ring-blue-400 ring-opacity-75 rounded-lg' : ''
            } ${
              text.groupId ? 'ring-2 ring-purple-300' : ''
            }`}
            style={{
              left: `${text.position.x}%`,
              top: `${text.position.y}%`,
              transform: 'translate(-50%, -50%)',
              fontSize: `${text.style.fontSize}px`,
              fontFamily: getTextFontFamily(text.content, text.style.bold),
              color: text.style.color,
              fontWeight: text.style.bold ? 'bold' : 'normal',
              fontStyle: text.style.italic ? 'italic' : 'normal',
              opacity: text.style.opacity / 100,
              textAlign: 'center',
              direction: containsHebrew(text.content) ? 'rtl' : 'ltr',
              width: `${text.style.width || 300}px`,
              wordWrap: 'break-word',
              overflow: 'visible'
            }}
            onMouseDown={(e) => handleMouseDown('text', e)}
            ref={(el) => {
              if (el) {
                // Log frontend text rendering details for comparison with backend
                console.log('📝 FRONTEND Text Rendering Details:', {
                  text: text.content,
                  fontSize: text.style.fontSize,
                  containerWidth: text.style.width || 300,
                  actualRenderedWidth: el.getBoundingClientRect().width,
                  actualRenderedHeight: el.getBoundingClientRect().height,
                  computedStyle: {
                    fontSize: window.getComputedStyle(el).fontSize,
                    fontFamily: window.getComputedStyle(el).fontFamily,
                    lineHeight: window.getComputedStyle(el).lineHeight,
                    width: window.getComputedStyle(el).width
                  },
                  lineCount: el.innerHTML.split('<br>').length,
                  note: 'Compare with backend wrapping analysis'
                });
              }
            }}
          >
            {text.content}
          </div>
        )}

        {/* URL Link */}
        {url.visible && (
          <div
            className={`absolute pointer-events-auto select-none transition-all duration-200 ${
              isDragging === 'url' ? 'cursor-grabbing scale-105 z-50' : 'cursor-grab hover:scale-105'
            } ${
              focusedItem === 'url' ? 'ring-4 ring-blue-400 ring-opacity-75 rounded-lg' : ''
            } ${
              url.groupId ? 'ring-2 ring-purple-300' : ''
            }`}
            style={{
              left: `${url.position.x}%`,
              top: `${url.position.y}%`,
              transform: 'translate(-50%, -50%)',
              fontSize: `${url.style.fontSize}px`,
              fontFamily: getTextFontFamily(url.href, url.style.bold),
              color: url.style.color,
              fontWeight: url.style.bold ? 'bold' : 'normal',
              fontStyle: url.style.italic ? 'italic' : 'normal',
              opacity: url.style.opacity / 100,
              direction: containsHebrew(url.href) ? 'rtl' : 'ltr',
              textDecoration: 'underline'
            }}
            onMouseDown={(e) => handleMouseDown('url', e)}
            onClick={(e) => {
              e.stopPropagation();
              if (!isDragging) {
                window.open(url.href, '_blank');
              }
            }}
          >
            {url.href}
          </div>
        )}

        {/* Custom Elements */}
        {footerConfig.customElements && Object.entries(footerConfig.customElements).map(([elementId, element]) => {
          if (!element.visible) return null;

          const isFocused = focusedItem === elementId;
          const isDraggingThis = isDragging === elementId;

          const commonClasses = `absolute pointer-events-auto select-none transition-all duration-200 ${
            isDraggingThis ? 'cursor-grabbing scale-105 z-50' : 'cursor-grab hover:scale-105'
          } ${isFocused ? 'ring-4 ring-blue-400 ring-opacity-75 rounded-lg' : ''} ${
            element.groupId ? 'ring-2 ring-purple-300' : ''
          }`;

          const commonStyle = {
            left: `${element.position.x}%`,
            top: `${element.position.y}%`,
            transform: 'translate(-50%, -50%)',
            opacity: element.style.opacity / 100
          };

          switch (element.type) {
            case 'box':
              return (
                <div
                  key={elementId}
                  className={commonClasses}
                  style={{
                    ...commonStyle,
                    width: `${element.style.width}px`,
                    height: `${element.style.height}px`,
                    border: `${element.style.borderWidth}px solid ${element.style.borderColor}`,
                    backgroundColor: element.style.backgroundColor === 'transparent' ? 'transparent' : element.style.backgroundColor
                  }}
                  onMouseDown={(e) => handleMouseDown(elementId, e)}
                />
              );

            case 'line':
              return (
                <div
                  key={elementId}
                  className={commonClasses}
                  style={{
                    ...commonStyle,
                    width: `${element.style.width}px`,
                    height: `${element.style.height}px`,
                    backgroundColor: element.style.color
                  }}
                  onMouseDown={(e) => handleMouseDown(elementId, e)}
                />
              );

            case 'dotted-line':
              return (
                <div
                  key={elementId}
                  className={commonClasses}
                  style={{
                    ...commonStyle,
                    width: `${element.style.width}px`,
                    height: `${element.style.height}px`,
                    backgroundColor: element.style.color,
                    backgroundImage: `repeating-linear-gradient(90deg, ${element.style.color} 0px, ${element.style.color} 5px, transparent 5px, transparent 10px)`
                  }}
                  onMouseDown={(e) => handleMouseDown(elementId, e)}
                />
              );

            case 'free-text':
              return (
                <div
                  key={elementId}
                  className={commonClasses}
                  style={{
                    ...commonStyle,
                    fontSize: `${element.style?.fontSize || 16}px`,
                    fontFamily: getTextFontFamily(element.content, element.style?.bold),
                    color: element.style?.color || '#000000',
                    fontWeight: element.style?.bold ? 'bold' : 'normal',
                    fontStyle: element.style?.italic ? 'italic' : 'normal',
                    textAlign: 'center',
                    direction: containsHebrew(element.content) ? 'rtl' : 'ltr',
                    width: `${element.style?.width || 200}px`,
                    wordWrap: 'break-word',
                    overflow: 'visible',
                    transform: `translate(-50%, -50%) rotate(${element.style?.rotation || 0}deg)`
                  }}
                  onMouseDown={(e) => handleMouseDown(elementId, e)}
                >
                  {element.content || 'לתצוגה בלבד'}
                </div>
              );

            case 'logo':
            case 'watermark-logo':
              return (
                <div
                  key={elementId}
                  className={commonClasses}
                  style={{
                    ...commonStyle,
                    transform: `translate(-50%, -50%) rotate(${element.style?.rotation || 0}deg)`
                  }}
                  onMouseDown={(e) => handleMouseDown(elementId, e)}
                >
                  <img
                    src={element.url || logo}
                    alt={element.alt || 'Logo'}
                    style={{
                      width: `${element.style?.size || 60}px`,
                      height: 'auto'
                    }}
                    draggable={false}
                  />
                </div>
              );

            default:
              return null;
          }
        })}
      </div>
    );
  };

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Zoom Controls */}
      <div className="absolute top-4 left-4 z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-2 flex items-center gap-2">
        <button
          onClick={handleZoomOut}
          className="w-8 h-8 flex items-center justify-center rounded border border-gray-300 hover:bg-gray-50 text-sm font-bold"
          title="הקטן תצוגה"
        >
          −
        </button>
        <span className="text-sm font-medium min-w-[50px] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={handleZoomIn}
          className="w-8 h-8 flex items-center justify-center rounded border border-gray-300 hover:bg-gray-50 text-sm font-bold"
          title="הגדל תצוגה"
        >
          +
        </button>
        <button
          onClick={handleZoomReset}
          className="px-2 py-1 text-xs rounded border border-gray-300 hover:bg-gray-50"
          title="איפוס תצוגה ומיקום"
        >
          🎯 מרכז
        </button>
        {!showInstructions && (
          <button
            onClick={() => setShowInstructions(true)}
            className="w-8 h-8 flex items-center justify-center rounded border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm"
            title="הצג הוראות ניווט"
          >
            ?
          </button>
        )}
      </div>

      {/* Fixed PDF Viewport - This is the "window" that NEVER changes size */}
      <div
        ref={containerRef}
        className="flex-1 bg-gray-100 relative"
        style={{
          cursor: isPanning ? 'grabbing' : 'grab',
          overflow: 'hidden' // CRITICAL: This clips content that goes outside
        }}
        onMouseDown={handlePanStart}
        onWheel={handleWheel}
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
              {/* SVG Content */}
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `url(${pdfUrl})`,
                  backgroundSize: 'contain',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center'
                }}
              />
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
                  שגיאה בטעינת הקובץ
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
                <Page
                  pageNumber={currentPage}
                  width={pageWidth}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                />
                {renderTemplateOverlay()}
              </div>
            </Document>
          )}
        </div>
      </div>

      {/* Page Navigation */}
      {numPages && (
        <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur rounded-lg shadow-lg border border-gray-200 p-2 flex items-center gap-4">
          <button
            onClick={() => onPageChange?.(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            הקודם
          </button>
          <span className="text-sm font-medium">
            עמוד {currentPage} מתוך {numPages}
          </span>
          <button
            onClick={() => onPageChange?.(Math.min(numPages, currentPage + 1))}
            disabled={currentPage >= numPages}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            הבא
          </button>
        </div>
      )}

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
            <li>• <strong>גרירה</strong>: גרור על הרקע להזזת הקנבס</li>
            <li>• <strong>זום</strong>: Ctrl + גלגלת עכבר</li>
            <li>• <strong>עריכה</strong>: לחץ על אלמנטים לגרירה</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default TemplateCanvas;

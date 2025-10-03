import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { getTextFontFamily, containsHebrew } from '@/utils/hebrewUtils';

// Configure PDF.js worker - use CDN for compatibility
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const PdfCanvasWithFooter = ({
  pdfUrl,
  footerConfig,
  onPageChange,
  onFooterConfigChange,
  focusedItem,
  currentPage = 1
}) => {
  const [numPages, setNumPages] = useState(null);
  const [pageWidth, setPageWidth] = useState(600);
  const [isDragging, setIsDragging] = useState(null);
  const [dragStart, setDragStart] = useState(null);
  const [actualPdfDimensions, setActualPdfDimensions] = useState(null);
  const [scaleFactor, setScaleFactor] = useState(1);
  const overlayRef = React.useRef(null);

  const onDocumentLoadSuccess = async ({ numPages, getDocument }) => {
    setNumPages(numPages);

    // Extract actual PDF page dimensions for scaling calculations
    try {
      const pdfDocument = await getDocument;
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

  useEffect(() => {
    // Calculate page width based on container
    const updatePageWidth = () => {
      const container = document.getElementById('pdf-preview-container');
      if (container) {
        setPageWidth(container.clientWidth - 40);
      }
    };

    updatePageWidth();
    window.addEventListener('resize', updatePageWidth);
    return () => window.removeEventListener('resize', updatePageWidth);
  }, []);

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

  const handleMouseDown = (element, event) => {
    event.preventDefault();

    // If a menu is open, only allow dragging of the selected item
    if (focusedItem && focusedItem !== element) {
      return; // Don't start drag for non-selected items when menu is open
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
      let newConfig;

      // Check if it's a custom element or built-in element
      if (footerConfig.customElements?.[isDragging]) {
        // Handle custom elements
        newConfig = {
          ...footerConfig,
          customElements: {
            ...footerConfig.customElements,
            [isDragging]: {
              ...footerConfig.customElements[isDragging],
              position: {
                ...footerConfig.customElements[isDragging].position,
                x: Math.round(newX),
                y: Math.round(newY)
              }
            }
          }
        };
      } else {
        // Handle built-in elements (logo, text, url)
        newConfig = {
          ...footerConfig,
          [isDragging]: {
            ...footerConfig[isDragging],
            position: {
              ...footerConfig[isDragging].position,
              x: Math.round(newX),
              y: Math.round(newY)
            }
          }
        };
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

  // Add global event listeners for drag operations
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  const renderFooterOverlay = () => {
    if (!footerConfig) return null;

    const { logo, text, url } = footerConfig;

    // Debug logging
    console.log('🖼️ Rendering footer overlay - text visible:', text.visible, 'text content:', text.content);
    console.log('🖼️ Text content length:', text.content?.length);
    console.log('🖼️ Will render copyright text?', text.visible && text.content && text.content.length > 0);
    console.log('🖼️ Full text object:', text);
    console.log('🖼️ Full footerConfig received:', footerConfig);

    // DETAILED POSITION LOGGING WITH PDF VERIFICATION
    console.log('🎯 FRONTEND RENDERING POSITIONS (PDF-Normalized):', {
      logoPosition: logo.position,
      textPosition: text.position,
      urlPosition: url.position,
      overlayDimensions: overlayRef.current?.getBoundingClientRect(),
      actualPdfDimensions: actualPdfDimensions,
      scaleFactor: scaleFactor,
      pdfCoordinateVerification: actualPdfDimensions ? {
        logoOnPdf: {
          x: actualPdfDimensions.width * logo.position.x / 100,
          y: actualPdfDimensions.height * logo.position.y / 100
        },
        textOnPdf: {
          x: actualPdfDimensions.width * text.position.x / 100,
          y: actualPdfDimensions.height * text.position.y / 100
        },
        urlOnPdf: {
          x: actualPdfDimensions.width * url.position.x / 100,
          y: actualPdfDimensions.height * url.position.y / 100
        }
      } : 'PDF dimensions not loaded',
      coordinateSystem: 'CSS percentages that represent actual PDF positions',
      note: 'These coordinates should produce the same visual result on any screen size'
    });

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
          } ${isFocused ? 'ring-4 ring-blue-400 ring-opacity-75 rounded-lg' : ''}`;

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


            default:
              return null;
          }
        })}
      </div>
    );
  };

  return (
    <div id="pdf-preview-container" className="relative bg-gray-100 rounded-lg overflow-auto" style={{ maxHeight: '70vh' }}>
      <Document
        file={pdfUrl}
        onLoadSuccess={onDocumentLoadSuccess}
        loading={
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        }
        error={
          <div className="flex items-center justify-center p-8 text-red-500">
            שגיאה בטעינת הקובץ
          </div>
        }
      >
        <div className="relative inline-block">
          <Page
            pageNumber={currentPage}
            width={pageWidth}
            renderTextLayer={true}
            renderAnnotationLayer={true}
          />
          {renderFooterOverlay()}
        </div>
      </Document>

      {numPages && (
        <div className="sticky bottom-0 bg-white border-t p-2 flex items-center justify-center gap-4">
          <button
            onClick={() => onPageChange?.(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            הקודם
          </button>
          <span className="text-sm">
            עמוד {currentPage} מתוך {numPages}
          </span>
          <button
            onClick={() => onPageChange?.(Math.min(numPages, currentPage + 1))}
            disabled={currentPage >= numPages}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            הבא
          </button>
        </div>
      )}
    </div>
  );
};

export default PdfCanvasWithFooter;

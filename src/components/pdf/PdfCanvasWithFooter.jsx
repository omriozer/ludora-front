import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker - using local worker from node_modules
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const PdfCanvasWithFooter = ({
  pdfUrl,
  footerConfig,
  onPageChange,
  currentPage = 1
}) => {
  const [numPages, setNumPages] = useState(null);
  const [pageWidth, setPageWidth] = useState(600);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
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

  const renderFooterOverlay = () => {
    if (!footerConfig) return null;

    const { logo, text, url } = footerConfig;

    return (
      <div
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
            className="absolute pointer-events-auto"
            style={{
              left: `${logo.position.x}%`,
              top: `${logo.position.y}%`,
              transform: 'translate(-50%, -50%)',
              opacity: logo.style.opacity / 100
            }}
          >
            <img
              src={logo.url}
              alt="Logo"
              style={{
                width: `${logo.style.size}px`,
                height: 'auto'
              }}
            />
          </div>
        )}

        {/* Copyright Text */}
        {text.visible && (
          <div
            className="absolute pointer-events-auto"
            style={{
              left: `${text.position.x}%`,
              top: `${text.position.y}%`,
              transform: 'translate(-50%, -50%)',
              fontSize: `${text.style.fontSize}px`,
              color: text.style.color,
              fontWeight: text.style.bold ? 'bold' : 'normal',
              fontStyle: text.style.italic ? 'italic' : 'normal',
              opacity: text.style.opacity / 100,
              textAlign: 'center',
              direction: 'rtl',
              maxWidth: '80%'
            }}
          >
            {text.content}
          </div>
        )}

        {/* URL Link */}
        {url.visible && (
          <div
            className="absolute pointer-events-auto"
            style={{
              left: `${url.position.x}%`,
              top: `${url.position.y}%`,
              transform: 'translate(-50%, -50%)',
              fontSize: `${url.style.fontSize}px`,
              color: url.style.color,
              fontWeight: url.style.bold ? 'bold' : 'normal',
              fontStyle: url.style.italic ? 'italic' : 'normal',
              opacity: url.style.opacity / 100,
              textDecoration: 'underline',
              cursor: 'pointer'
            }}
            onClick={(e) => {
              e.stopPropagation();
              window.open(url.href, '_blank');
            }}
          >
            {url.href}
          </div>
        )}
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

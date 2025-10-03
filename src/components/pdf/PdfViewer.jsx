import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  Printer,
  X,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { apiDownload } from '@/services/apiClient';
import { clog, cerror } from '@/lib/utils';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const PdfViewer = ({
  fileId,
  fileName,
  hasAccess = false,
  allowPreview = true,
  onClose = null,
  className = ""
}) => {
  const [numPages, setNumPages] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [rotation, setRotation] = useState(0);
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Derive preview mode from access logic - no need for separate prop
  const isPreviewMode = !hasAccess && allowPreview;

  useEffect(() => {
    if (fileId) {
      loadPdf();
    }
    return () => {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [fileId]);

  const loadPdf = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check access permissions
      if (!hasAccess && !allowPreview) {
        throw new Error('אין הרשאה לצפייה בקובץ זה');
      }

      // All valid cases use the same endpoint - backend handles access control and watermarks
      const endpoint = `/assets/download/file/${fileId}`;

      clog('📄 Loading PDF from endpoint:', endpoint);
      const blob = await apiDownload(endpoint);

      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
      }

      const blobUrl = URL.createObjectURL(blob);
      setPdfBlobUrl(blobUrl);
      clog('📄 PDF loaded successfully');
    } catch (error) {
      cerror('Error loading PDF:', error);
      setError('שגיאה בטעינת הקובץ');
    } finally {
      setIsLoading(false);
    }
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    clog('📄 PDF document loaded, pages:', numPages);
  };

  const onDocumentLoadError = (error) => {
    cerror('PDF load error:', error);
    setError('שגיאה בטעינת קובץ PDF');
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= numPages) {
      setCurrentPage(newPage);
    }
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.2, 3.0));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, 0.5));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleDownload = async () => {
    if (!hasAccess) {
      // Show purchase prompt for preview users
      return;
    }

    try {
      const blob = await apiDownload(`/assets/download/file/${fileId}`);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || 'download.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      cerror('Error downloading PDF:', error);
    }
  };

  const handlePrint = () => {
    if (!hasAccess) {
      // Show purchase prompt for preview users
      return;
    }

    if (pdfBlobUrl) {
      const printWindow = window.open(pdfBlobUrl, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    }
  };

  // Note: Watermarks are now handled server-side by the API
  // No client-side watermark rendering needed

  const PdfContent = () => (
    <div className="flex flex-col h-full bg-gray-100 min-h-0">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 p-3 flex items-center justify-between gap-4 flex-wrap flex-shrink-0">
        <div className="flex items-center gap-2">
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose} className="p-2">
              <X className="w-4 h-4" />
            </Button>
          )}
          <div className="text-sm font-medium text-gray-700">
            {fileName || 'קובץ PDF'}
            {isPreviewMode && !hasAccess && (
              <span className="text-orange-600 mr-2">(תצוגה מקדימה)</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Page Navigation */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>

          <span className="text-sm text-gray-600 px-2">
            {numPages ? `עמוד ${currentPage} מתוך ${numPages}` : 'טוען...'}
          </span>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= numPages}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          {/* Zoom Controls */}
          <div className="border-r border-gray-300 pr-2 mr-2"></div>
          <Button variant="ghost" size="sm" onClick={handleZoomOut}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm text-gray-600 px-2">{Math.round(scale * 100)}%</span>
          <Button variant="ghost" size="sm" onClick={handleZoomIn}>
            <ZoomIn className="w-4 h-4" />
          </Button>

          {/* Rotate */}
          <Button variant="ghost" size="sm" onClick={handleRotate}>
            <RotateCw className="w-4 h-4" />
          </Button>

          {/* Action Buttons */}
          <div className="border-r border-gray-300 pr-2 mr-2"></div>

          {hasAccess && (
            <>
              <Button variant="ghost" size="sm" onClick={handlePrint}>
                <Printer className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleDownload}>
                <Download className="w-4 h-4" />
              </Button>
            </>
          )}

          {/* Fullscreen Toggle */}
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
          )}
        </div>
      </div>

      {/* PDF Display Area */}
      <div className="flex-1 overflow-auto relative" style={{ minHeight: 0 }}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 text-center">
            <div className="text-red-600 mb-4">{error}</div>
            <Button onClick={loadPdf} variant="outline">
              נסה שוב
            </Button>
          </div>
        )}

        {pdfBlobUrl && !isLoading && !error && (
          <div className="p-4 min-h-full flex justify-center">
            <div className="relative">
              <Document
                file={pdfBlobUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={null}
                error={null}
                noData={null}
              >
                <Page
                  pageNumber={currentPage}
                  scale={scale}
                  rotate={rotation}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                />
              </Document>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // If onClose is provided, render in a modal
  if (onClose) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent
          className={`max-w-[95vw] max-h-[95vh] p-0 overflow-hidden ${isFullscreen ? 'w-[95vw] h-[95vh]' : 'w-[80vw] h-[80vh]'}`}
          hideCloseButton={true}
        >
          <PdfContent />
        </DialogContent>
      </Dialog>
    );
  }

  // Otherwise render inline
  return (
    <div className={`w-full h-full ${className}`}>
      <PdfContent />
    </div>
  );
};

export default PdfViewer;
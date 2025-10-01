import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import PdfCanvasWithFooter from './PdfCanvasWithFooter';
import FooterControlsSidebar from './FooterControlsSidebar';
import { apiDownload } from '@/services/apiClient';
import LudoraLoadingSpinner from '@/components/ui/LudoraLoadingSpinner';
import { clog, cerror } from '@/lib/utils';

const DEFAULT_COPYRIGHT_TEXT = 'כל הזכויות שמורות. תוכן זה מוגן בזכויות יוצרים ואסור להעתיקו, להפיצו או לשתפו ללא אישור בכתב מהמחבר או מלודורה.';

const PdfFooterPreview = ({
  isOpen,
  onClose,
  fileEntityId,
  logoUrl,
  userRole
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [footerConfig, setFooterConfig] = useState({
    logo: {
      visible: true,
      url: logoUrl,
      position: { x: 50, y: 95 },
      style: {
        size: 80,
        opacity: 100
      }
    },
    text: {
      visible: true,
      content: DEFAULT_COPYRIGHT_TEXT,
      position: { x: 50, y: 90 },
      style: {
        fontSize: 12,
        color: '#000000',
        bold: false,
        italic: false,
        opacity: 80
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
    }
  });

  // Fetch PDF file via API when modal opens
  useEffect(() => {
    if (isOpen && fileEntityId) {
      const fetchPdf = async () => {
        try {
          clog('Fetching PDF from API:', fileEntityId);

          const blob = await apiDownload(`/media/file/download/${fileEntityId}`);

          const blobUrl = URL.createObjectURL(blob);
          clog('PDF blob URL created:', blobUrl);
          setPdfBlobUrl(blobUrl);
        } catch (error) {
          cerror('Error fetching PDF:', error);
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

  // Update logo URL if it changes
  useEffect(() => {
    if (logoUrl) {
      setFooterConfig(prev => ({
        ...prev,
        logo: {
          ...prev.logo,
          url: logoUrl
        }
      }));
    }
  }, [logoUrl]);

  const handleConfigChange = (newConfig) => {
    setFooterConfig(newConfig);
  };

  const handleClose = () => {
    // Reset to defaults on close
    setCurrentPage(1);
    setFooterConfig({
      logo: {
        visible: true,
        url: logoUrl,
        position: { x: 50, y: 95 },
        style: {
          size: 80,
          opacity: 100
        }
      },
      text: {
        visible: true,
        content: DEFAULT_COPYRIGHT_TEXT,
        position: { x: 50, y: 90 },
        style: {
          fontSize: 12,
          color: '#000000',
          bold: false,
          italic: false,
          opacity: 80
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
      }
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 gap-0 [&>button]:hidden" dir="rtl">
        <DialogTitle className="sr-only">תצוגה מקדימה - כותרת תחתונה</DialogTitle>
        <DialogDescription className="sr-only">
          תצוגה מקדימה של קובץ PDF עם כותרת תחתונה של זכויות יוצרים
        </DialogDescription>
        <div className="flex h-[95vh]">
          {/* Main Preview Area */}
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between bg-gray-50">
              <h2 className="text-xl font-semibold">תצוגה מקדימה - כותרת תחתונה</h2>
            </div>

            {/* PDF Preview */}
            <div className="flex-1 p-4 overflow-hidden">
              {pdfBlobUrl ? (
                <PdfCanvasWithFooter
                  pdfUrl={pdfBlobUrl}
                  footerConfig={footerConfig}
                  onPageChange={setCurrentPage}
                  currentPage={currentPage}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <LudoraLoadingSpinner />
                </div>
              )}
            </div>

            {/* Info Banner */}
            <div className="p-3 bg-yellow-50 border-t border-yellow-200">
              <p className="text-sm text-yellow-800 text-center">
                זוהי תצוגה מקדימה בלבד. השינויים לא יישמרו.
              </p>
            </div>
          </div>

          {/* Controls Sidebar */}
          <FooterControlsSidebar
            footerConfig={footerConfig}
            onConfigChange={handleConfigChange}
            userRole={userRole}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PdfFooterPreview;

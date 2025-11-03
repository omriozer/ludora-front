import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Eye, Download } from 'lucide-react';
import { useProductAccess } from '@/hooks/useProductAccess';
import { apiDownload } from '@/services/apiClient';

/**
 * File Access Button - Handles file viewing/downloading for users with access
 * @param {Object} product - Product object (should be a file)
 * @param {string} className - Additional CSS classes
 * @param {string} size - Button size
 * @param {boolean} fullWidth - Whether button should be full width
 * @param {function} onFileAccess - Callback when file is accessed
 * @param {function} onPdfPreview - Callback to open PDF preview
 */
export default function FileAccessButton({
  product,
  className = '',
  size = 'lg',
  fullWidth = false,
  onFileAccess,
  onPdfPreview
}) {
  const [isAccessing, setIsAccessing] = useState(false);

  const { hasAccess, productType } = useProductAccess(product);

  // Only render for files when user has access
  if (!hasAccess || productType !== 'file') {
    return null;
  }

  const handleFileAccess = async (e) => {
    e.stopPropagation(); // Prevent event bubbling to parent card

    if (!product.id) return;

    setIsAccessing(true);

    try {
      // Check if it's a PDF file
      const isPdf = product.file_type === 'pdf' || product.file_name?.toLowerCase().endsWith('.pdf');

      if (isPdf && onPdfPreview) {
        // Open PDF in viewer modal
        onPdfPreview(product);
      } else if (onFileAccess) {
        // Use custom file access handler
        await onFileAccess(product);
      } else {
        // Default file access behavior - download/open
        await handleDefaultFileAccess();
      }
    } catch (error) {
      console.error('Error accessing file:', error);
    } finally {
      setIsAccessing(false);
    }
  };

  const handleDefaultFileAccess = async () => {
    try {
      // Use apiDownload with proper authentication
      const blob = await apiDownload(`/assets/download/file/${product.entity_id || product.id}`);

      // Create blob URL and open/download
      const blobUrl = URL.createObjectURL(blob);

      // For PDFs and images, try to open in new tab, otherwise download
      const isPdf = product.file_type === 'pdf' || product.file_name?.toLowerCase().endsWith('.pdf');
      const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(product.file_type?.toLowerCase());

      if (isPdf || isImage) {
        window.open(blobUrl, '_blank');
      } else {
        // Download file
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = product.file_name || `${product.title}.${product.file_type || 'file'}`;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      // Clean up blob URL after a delay
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  const isPdf = product.file_type === 'pdf' || product.file_name?.toLowerCase().endsWith('.pdf');

  return (
    <Button
      onClick={handleFileAccess}
      disabled={isAccessing}
      className={`group relative overflow-hidden bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold rounded-full shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 border-2 border-green-400/20 ${fullWidth ? 'w-full' : ''} ${className}`}
      size={size}
    >
      <span className="relative z-10 flex items-center justify-center gap-2 sm:gap-3">
        {isPdf ? (
          <Eye className="w-5 h-5 sm:w-6 sm:h-6 group-hover:scale-110 transition-transform duration-300" />
        ) : (
          <Download className="w-5 h-5 sm:w-6 sm:h-6 group-hover:scale-110 transition-transform duration-300" />
        )}
        <span>צפיה בקובץ</span>
      </span>
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 animate-pulse"></div>
    </Button>
  );
}
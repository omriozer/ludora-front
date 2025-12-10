import { useNavigate } from 'react-router-dom';
import { apiDownload } from '@/services/apiClient';
import { luderror } from '@/lib/ludlog';

/**
 * Reusable hook for product action handlers
 * Extracted from ProductDetails page for consistent behavior across the app
 */
export const useProductActions = () => {
  const navigate = useNavigate();

  // Enhanced file access logic with PDF viewer support
  const handleFileAccess = async (file, { setPdfViewerOpen }) => {
    if (!file.id && !file.entity_id) return;

    const fileId = file.entity_id || file.id;

    // Check if it's a PDF file
    const isPdf = file.file_type === 'pdf' || file.file_name?.toLowerCase().endsWith('.pdf');

    if (isPdf && setPdfViewerOpen) {
      // Open PDF in viewer modal if setPdfViewerOpen is provided
      setPdfViewerOpen(true);
    } else {
      // For non-PDF files or when no modal handler, use direct download
      try {
        // Use apiDownload to get blob with auth headers
        const blob = await apiDownload(`/assets/download/file/${fileId}`);

        // Create blob URL and trigger download
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');

        // Clean up blob URL after a delay
        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
      } catch (error) {
        luderror.api('Error downloading file:', error);
      }
    }
  };

  // Handle PDF preview for users without access
  const handlePdfPreview = ({ setPdfViewerOpen }) => {
    if (setPdfViewerOpen) {
      setPdfViewerOpen(true);
    }
  };

  // Handle course access
  const handleCourseAccess = (course) => {
    const courseId = course.entity_id || course.id;
    navigate(`/course?course=${courseId}`);
  };

  // Handle workshop access
  const handleWorkshopAccess = (workshop) => {
    const workshopId = workshop.entity_id || workshop.id;
    const now = new Date();
    const scheduledDate = workshop.scheduled_date ? new Date(workshop.scheduled_date) : null;
    const isLive = scheduledDate && scheduledDate > now;

    if (isLive && workshop.zoom_link) {
      // Live workshop - open Zoom link
      window.open(workshop.zoom_link, '_blank');
    } else if (workshop.recording_url || workshop.video_file_url) {
      // Recorded workshop - navigate to video viewer
      navigate(`/video?workshop=${workshopId}`);
    } else {
      // Fallback - navigate to workshop details
      navigate(`/product-details?type=workshop&id=${workshopId}`);
    }
  };

  // Navigate to product details page
  const handleViewDetails = (product) => {
    const productId = product.entity_id || product.id;
    const productType = product.entity_type || product.product_type || 'file';
    navigate(`/product-details?type=${productType}&id=${productId}`);
  };

  return {
    handleFileAccess,
    handlePdfPreview,
    handleCourseAccess,
    handleWorkshopAccess,
    handleViewDetails
  };
};
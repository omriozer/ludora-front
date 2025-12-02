import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Masonry from 'react-masonry-css';
import ProductCard from '@/components/ProductCard';
import { apiDownload } from '@/services/apiClient';
import PdfViewer from '@/components/pdf/PdfViewer';
import { showConfirm } from '@/utils/messaging';
import { useProductAccess } from '@/hooks/useProductAccess';

/**
 * Unified Product Grid Component
 * Renders products in a responsive grid layout with animations
 * Works with all product types (games, files, workshops, courses, tools)
 */
export default function ProductGrid({
  products,
  config,
  currentUser,
  userPurchases = [],
  subscriptionEligibility = null,
  onSubscriptionSuccess
}) {
  const navigate = useNavigate();

  // Enhanced file access logic with PDF viewer support (same as ProductDetails)
  const handleFileAccess = async (file) => {
    if (!file.id) return;

    setSelectedFile(file);

    // Check if it's a PDF file
    const isPdf = file.file_type === 'pdf' || file.file_name?.toLowerCase().endsWith('.pdf');

    if (isPdf) {
      // Open PDF in viewer modal
      setPdfViewerOpen(true);
    } else {
      // For non-PDF files, use direct download
      try {
        // Use apiDownload to get blob with auth headers
        const blob = await apiDownload(`/assets/download/file/${file.id}`);

        // Create blob URL and trigger download
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');

        // Clean up blob URL after a delay
        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
      } catch (error) {
        console.error('Error downloading file:', error);
      }
    }
  };

  // Handle PDF preview for users without access
  const handlePdfPreview = (file) => {
    setSelectedFile(file);
    setPdfViewerOpen(true);
  };

  // Pinterest-style masonry breakpoints - optimized for mobile
  const getMasonryBreakpoints = () => {
    if (config.cardLayout === 'compact') {
      return {
        default: 5,
        1200: 4,
        900: 3,
        600: 2,
        450: 1  // Better mobile threshold
      };
    } else if (config.cardLayout === 'detailed') {
      return {
        default: 4,
        1100: 3,
        768: 2,  // iPad and larger phones
        480: 1   // Mobile devices
      };
    } else {
      // Default Pinterest layout - mobile-optimized
      return {
        default: 4,
        1100: 3,
        768: 2,  // iPad and larger phones
        480: 1   // Mobile devices
      };
    }
  };

  const masonryBreakpoints = getMasonryBreakpoints();

  // State for managing single card expansion
  const [expandedCardId, setExpandedCardId] = useState(null);

  // PDF viewer state
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  // Use centralized product access logic for selected file (checks backend subscription access)
  const { hasAccess: selectedFileHasAccess } = useProductAccess(selectedFile, userPurchases);

  // Handle card expansion toggle - only one card can be expanded at a time
  const handleToggleExpanded = (productId) => {
    setExpandedCardId(expandedCardId === productId ? null : productId);
  };

  // Handle product edit - navigate to edit page
  const handleProductEdit = async (product) => {
    const confirmed = await showConfirm(
      "עריכת מוצר",
      `האם ברצונך לערוך את המוצר "${product.title}"?\n\nתועבר לעמוד עריכת מוצרים.`,
      { confirmText: "ערוך מוצר", cancelText: "ביטול" }
    );
    if (confirmed) {
      navigate(`/products/edit/${product.id}`);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="mobile-safe-container"
    >
      <Masonry
        breakpointCols={masonryBreakpoints}
        className="flex w-auto -ml-2 md:-ml-4 mobile-safe-flex"
        columnClassName="pl-2 md:pl-4 bg-clip-padding mobile-safe-container"
      >
      {products.map((product, index) => {
        return (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="mobile-safe-card w-full"
          >
            <ProductCard
              product={product}
              userPurchases={userPurchases}
              onFileAccess={handleFileAccess}
              onPdfPreview={handlePdfPreview}
              isExpanded={expandedCardId === product.id}
              onToggleExpanded={handleToggleExpanded}
              onEdit={handleProductEdit}
              subscriptionEligibility={subscriptionEligibility}
              onSubscriptionSuccess={onSubscriptionSuccess}
            />
          </motion.div>
        );
      })}
      </Masonry>

      {/* PDF Viewer Modal */}
      {pdfViewerOpen && selectedFile && (
        <PdfViewer
          fileId={selectedFile.entity_id || selectedFile.id}
          fileName={selectedFile.file_name || `${selectedFile.title}.pdf`}
          hasAccess={selectedFileHasAccess}
          allowPreview={selectedFile.allow_preview}
          onClose={() => {
            setPdfViewerOpen(false);
            setSelectedFile(null);
          }}
        />
      )}
    </motion.div>
  );
}
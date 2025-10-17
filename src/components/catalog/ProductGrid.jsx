import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Masonry from 'react-masonry-css';
import ProductCard from '@/components/ProductCard';
import { apiDownload } from '@/services/apiClient';
import PdfViewer from '@/components/pdf/PdfViewer';
import ProductModal from '@/components/modals/ProductModal';

/**
 * Unified Product Grid Component
 * Renders products in a responsive grid layout with animations
 * Works with all product types (games, files, workshops, courses, tools)
 */
export default function ProductGrid({
  products,
  config,
  currentUser,
  userPurchases = []
}) {

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

  // Pinterest-style masonry breakpoints
  const getMasonryBreakpoints = () => {
    if (config.cardLayout === 'compact') {
      return {
        default: 5,
        1100: 4,
        700: 3,
        500: 2,
        350: 1
      };
    } else if (config.cardLayout === 'detailed') {
      return {
        default: 4,
        1100: 3,
        700: 2,
        500: 1
      };
    } else {
      // Default Pinterest layout
      return {
        default: 4,
        1100: 3,
        700: 2,
        500: 1
      };
    }
  };

  const masonryBreakpoints = getMasonryBreakpoints();

  // State for managing single card expansion
  const [expandedCardId, setExpandedCardId] = useState(null);

  // PDF viewer state
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  // Product edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Handle card expansion toggle - only one card can be expanded at a time
  const handleToggleExpanded = (productId) => {
    setExpandedCardId(expandedCardId === productId ? null : productId);
  };

  // Handle product edit
  const handleProductEdit = (product) => {
    setEditingProduct(product);
    setShowEditModal(true);
  };

  // Handle modal save
  const handleModalSave = () => {
    setShowEditModal(false);
    setEditingProduct(null);
    // Optionally reload data or trigger refresh
    console.log('Product updated successfully');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <Masonry
        breakpointCols={masonryBreakpoints}
        className="flex w-auto -ml-4"
        columnClassName="pl-4 bg-clip-padding"
      >
      {products.map((product, index) => {
        return (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <ProductCard
              product={product}
              userPurchases={userPurchases}
              onFileAccess={handleFileAccess}
              onPdfPreview={handlePdfPreview}
              isExpanded={expandedCardId === product.id}
              onToggleExpanded={handleToggleExpanded}
              onEdit={handleProductEdit}
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
          hasAccess={userPurchases.some(purchase => {
            const purchaseEntityId = purchase.purchasable_id || purchase.product_id;
            const isRelevant = ['paid', 'completed'].includes(purchase.payment_status);
            return (purchaseEntityId === selectedFile.id || purchaseEntityId === selectedFile.entity_id) && isRelevant;
          })}
          allowPreview={selectedFile.allow_preview}
          onClose={() => setPdfViewerOpen(false)}
        />
      )}

      {/* Product Edit Modal */}
      <ProductModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        editingProduct={editingProduct}
        onSave={handleModalSave}
        currentUser={currentUser}
      />
    </motion.div>
  );
}
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Masonry from 'react-masonry-css';
import ProductCard from '@/components/ProductCard';
import { getProductTypeName } from '@/config/productTypes';
import { apiDownload } from '@/services/apiClient';
import PdfViewer from '@/components/pdf/PdfViewer';

/**
 * Unified Product Grid Component
 * Renders products in a responsive grid layout with animations
 * Works with all product types (games, files, workshops, courses, tools)
 */
export default function ProductGrid({
  products,
  productType,
  config,
  typeConfig,
  currentUser,
  userPurchases = [],
  settings,
  activeTab
}) {
  // Helper function to get user purchase for a product (using polymorphic structure like PurchaseHistory)
  const getUserPurchase = (productId) => {
    console.log(`🔍 Looking for purchase for product ID: ${productId}`);
    console.log(`🔍 Available purchases:`, userPurchases.length);

    const foundPurchase = userPurchases.find(purchase => {
      // Use polymorphic structure: purchasable_id (new) or product_id (legacy)
      const entityId = purchase.purchasable_id || purchase.product_id;
      // Handle both 'paid' and 'completed' statuses like PurchaseHistory does
      const isSuccessful = purchase.payment_status === 'paid' || purchase.payment_status === 'completed';

      console.log(`  - Purchase ${purchase.id}: entityId=${entityId}, status=${purchase.payment_status}, matches=${entityId === productId && isSuccessful}`);

      return entityId === productId && isSuccessful;
    });

    console.log(`🔍 Found purchase for product ${productId}:`, foundPurchase);
    return foundPurchase;
  };

  // Helper function to handle product access
  const handleProductAccess = (product) => {
    const purchase = getUserPurchase(product.id);
    if (!purchase) return;

    // Navigate based on product type
    switch (productType) {
      case 'game':
        window.location.href = `/launcher?id=${product.id}`;
        break;
      case 'file':
        window.location.href = `${PRODUCT_TYPES.file.url}/${product.id}`;
        break;
      case 'workshop':
        window.location.href = `/workshops/${product.id}`;
        break;
      case 'course':
        window.location.href = `/courses/${product.id}`;
        break;
      case 'tool':
        window.location.href = `/tools/${product.id}`;
        break;
      default:
        console.warn('Unknown product type:', productType);
    }
  };

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

  // Helper function to handle product purchase
  const handleProductPurchase = (product) => {
    // Navigate to purchase flow
    window.location.href = `/product-details?product=${product.id}`;
  };

  // Get texts based on product type and config
  const getProductTexts = () => {
    const baseTexts = {
      buyNow: 'רכישה',
      owned: 'ברשותך',
      access: 'גישה'
    };

    // Add product-specific texts
    switch (productType) {
      case 'game':
        return {
          ...baseTexts,
          access: 'שחק עכשיו'
        };
      case 'course':
        return {
          ...baseTexts,
          startCourse: `התחל ${getProductTypeName('course', 'singular')}`,
          continueCourse: `המשך ${getProductTypeName('course', 'singular')}`
        };
      case 'tool':
        return {
          ...baseTexts,
          download: 'הורדה'
        };
      case 'workshop':
        return {
          ...baseTexts,
          watchRecording: 'צפה בהקלטה'
        };
      case 'file':
        return {
          ...baseTexts,
          download: 'הורדה'
        };
      default:
        return baseTexts;
    }
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

  const texts = getProductTexts();
  const masonryBreakpoints = getMasonryBreakpoints();

  // State for managing single card expansion
  const [expandedCardId, setExpandedCardId] = useState(null);

  // PDF viewer state
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  // Handle card expansion toggle - only one card can be expanded at a time
  const handleToggleExpanded = (productId) => {
    setExpandedCardId(expandedCardId === productId ? null : productId);
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
        const userPurchase = getUserPurchase(product.id);

        return (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <ProductCard
              product={product}
              userPurchase={userPurchase}
              onAccess={() => handleProductAccess(product)}
              onPurchase={() => handleProductPurchase(product)}
              texts={texts}
              showYouTubeIndicator={productType === 'workshop' || productType === 'course'}
              onFileAccess={handleFileAccess}
              onPdfPreview={handlePdfPreview}
              userPurchases={userPurchases}
              isExpanded={expandedCardId === product.id}
              onToggleExpanded={handleToggleExpanded}
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
          hasAccess={getUserPurchase(selectedFile.id) ? true : false}
          allowPreview={selectedFile.allow_preview}
          onClose={() => setPdfViewerOpen(false)}
        />
      )}
    </motion.div>
  );
}
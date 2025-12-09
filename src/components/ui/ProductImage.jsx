import React, { useState, useEffect } from 'react';
import { getProductImageUrl } from '@/utils/videoUtils.js';
import { getProductTypeConfig } from '@/config/productTypes';
import {
  FileText,
  Play,
  BookOpen,
  Calendar,
  Settings
} from 'lucide-react';

// Product type icons mapping
const PRODUCT_TYPE_ICONS = {
  file: FileText,
  game: Play,
  course: BookOpen,
  workshop: Calendar,
  tool: Settings,
  lesson_plan: BookOpen
};

/**
 * ProductImage - Reusable component for displaying product images with smart fallbacks
 *
 * @param {Object} product - Product object
 * @param {string} className - CSS classes for the image
 * @param {string} iconClassName - CSS classes for the fallback icon
 * @param {string} containerClassName - CSS classes for the container div
 * @param {boolean} showIcon - Whether to show icon as final fallback (default: true)
 */
export default function ProductImage({
  product,
  className = "",
  iconClassName = "w-8 h-8 text-gray-400",
  containerClassName = "",
  showIcon = true,
  alt
}) {
  const [currentImageUrl, setCurrentImageUrl] = useState(null);
  const [hasError, setHasError] = useState(false);
  const [fallbackError, setFallbackError] = useState(false);

  // Get product type configuration and icon
  const productTypeConfig = getProductTypeConfig(product.product_type);
  const ProductTypeIcon = PRODUCT_TYPE_ICONS[product.product_type] || FileText;

  // Initialize image URL when component mounts or product changes
  useEffect(() => {
    setHasError(false);
    setFallbackError(false);

    // Try to get the product's custom image first
    const productImageUrl = getProductImageUrl(product);

    // If no product image, use fallback immediately
    if (!productImageUrl) {
      const fallbackImageUrl = productTypeConfig?.fallbackImageUrl;
      setCurrentImageUrl(fallbackImageUrl);
    } else {
      setCurrentImageUrl(productImageUrl);
    }
  }, [product.id, product.product_type, productTypeConfig]);

  // Handle primary image load error
  const handleImageError = () => {
    if (!hasError) {
      setHasError(true);
      // Switch to product type fallback image
      const fallbackImageUrl = productTypeConfig?.fallbackImageUrl;
      if (fallbackImageUrl) {
        setCurrentImageUrl(fallbackImageUrl);
      } else {
        // No fallback image available, show icon
        setCurrentImageUrl(null);
      }
    }
  };

  // Handle fallback image load error
  const handleFallbackError = () => {
    setFallbackError(true);
    setCurrentImageUrl(null);
  };

  // If we have a valid image URL, render the image
  if (currentImageUrl) {
    return (
      <img
        src={currentImageUrl}
        alt={alt || product.title}
        className={className}
        onError={hasError ? handleFallbackError : handleImageError}
      />
    );
  }

  // Final fallback: show product type icon or empty container
  if (showIcon) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${containerClassName}`}>
        <ProductTypeIcon className={iconClassName} />
      </div>
    );
  }

  // Return empty container if no icon should be shown
  return <div className={`bg-gray-100 ${containerClassName}`} />;
}
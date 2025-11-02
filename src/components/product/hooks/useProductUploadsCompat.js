import { useUnifiedAssetUploads } from './useUnifiedAssetUploads';

/**
 * Backward Compatibility Wrapper for useProductUploads
 *
 * This wrapper provides a drop-in replacement for the legacy useProductUploads hook.
 * It uses the new unified asset upload system under the hood while maintaining the
 * exact same API interface for existing components.
 *
 * Migration Path:
 * 1. Replace import: useProductUploads → useProductUploadsCompat
 * 2. Test that everything works exactly the same
 * 3. Gradually migrate to useUnifiedAssetUploads with new API
 * 4. Remove this compatibility wrapper once migration is complete
 */
export const useProductUploadsCompat = (editingProduct = null) => {
  const unifiedHook = useUnifiedAssetUploads(editingProduct);

  // Legacy-compatible wrapper for handleFileUpload
  const handleFileUpload = async (event, fileType, moduleIndex = null) => {
    console.log('🔄 Legacy compatibility: handleFileUpload called with:', {
      fileType,
      moduleIndex,
      usingUnifiedBackend: true
    });

    const options = {};
    if (moduleIndex !== null) {
      options.moduleIndex = moduleIndex;
    }

    // Map legacy file types to new asset types
    if (fileType === 'marketing_video') {
      options.isPublic = true;
    }

    return unifiedHook.handleAssetUpload(event, fileType, options);
  };

  // Legacy-compatible wrapper for handleDeleteFile
  const handleDeleteFile = async (fileType, moduleIndex = null) => {
    console.log('🔄 Legacy compatibility: handleDeleteFile called with:', {
      fileType,
      moduleIndex,
      usingUnifiedBackend: true
    });

    const options = {};
    if (moduleIndex !== null) {
      options.moduleIndex = moduleIndex;
    }

    return unifiedHook.handleAssetDelete(fileType, options);
  };

  // Legacy-compatible file existence check
  const checkFileUploadExists = async (product) => {
    if (!product?.entity_id || (product?.product_type !== 'file' && product?.product_type !== 'lesson_plan')) return null;

    try {
      const assetInfo = await unifiedHook.checkAssetExists(product, 'document');
      if (assetInfo?.exists) {
        return {
          exists: true,
          filename: assetInfo.filename
        };
      }
    } catch (error) {
      console.error('Error checking file upload:', error);
    }

    return null;
  };

  // Legacy-compatible existence checkers
  const hasUploadedFile = () => {
    return unifiedHook.hasAsset('document');
  };

  // Legacy-compatible info getters
  const uploadedFileInfo = unifiedHook.getAssetInfo('document');
  const marketingVideoExists = unifiedHook.hasAsset('marketing_video');

  // Legacy-compatible setters
  const setUploadedFileInfo = (info) => {
    unifiedHook.setAssetInfo(prev => ({
      ...prev,
      document: info
    }));
  };

  const setMarketingVideoExists = (exists) => {
    unifiedHook.setAssetInfo(prev => ({
      ...prev,
      marketing_video: { ...prev.marketing_video, exists }
    }));
  };

  // Return exact same interface as legacy useProductUploads
  return {
    // Upload state (same as before)
    uploadStates: unifiedHook.uploadStates,
    uploadProgress: unifiedHook.uploadProgress,
    isDeletingFile: unifiedHook.isDeletingAsset, // Renamed but same concept

    // Asset info (legacy format)
    uploadedFileInfo,
    marketingVideoExists,

    // Legacy setters
    setUploadedFileInfo,
    setMarketingVideoExists,

    // Main operations (same interface, unified backend)
    handleFileUpload,
    handleDeleteFile,

    // Utility functions (same interface)
    isUploading: unifiedHook.isUploading,
    getUploadProgress: unifiedHook.getUploadProgress,
    hasUploadedFile,

    // Additional utility from original
    checkFileUploadExists,

    // Legacy alias
    setHasUploadedFile: setUploadedFileInfo
  };
};

/**
 * Drop-in replacement export
 *
 * Change your import from:
 *   import { useProductUploads } from './useProductUploads';
 * To:
 *   import { useProductUploads } from './useProductUploadsCompat';
 *
 * Everything should work exactly the same!
 */
export const useProductUploads = useProductUploadsCompat;

export default useProductUploadsCompat;
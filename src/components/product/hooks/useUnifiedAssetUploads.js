import { useState, useCallback, useEffect } from 'react';
import { apiUploadWithProgress, apiRequest } from '@/services/apiClient';
import { getApiBase } from '@/utils/api.js';
import { toast } from '@/components/ui/use-toast';

/**
 * Unified Asset Upload Hook
 *
 * Implements the standardized file reference patterns (Phase 4) as documented
 * in ludora-utils/docs/architecture/FILES_MANAGMENT_REFACTOR.md
 *
 * Key Features:
 * - Uses standardized boolean + filename pattern for all entities
 * - Robust entity ID validation prevents corrupted API calls
 * - Clear asset type classification (Marketing/Content/System layers)
 * - Automatic entity ID mapping (id vs entity_id)
 * - Consistent error handling and progress tracking
 * - Uses existing /api/assets/* endpoints (no v2 endpoints)
 * - Follows 3-layer file architecture principles
 */
// Asset Type Classification (3-Layer Architecture)
const ASSET_TYPES = {
  MARKETING: ['image', 'marketing_video'],
  CONTENT: ['document', 'content_video', 'file'],
  SYSTEM: ['logo', 'audio']
};

/**
 * Robust Entity ID Validation
 * Prevents API calls with corrupted or invalid entity IDs
 */
const isValidEntityId = (entityId) => {
  if (!entityId) return false;
  if (typeof entityId !== 'string') return false;
  if (entityId.length > 50) return false; // Reasonable length limit
  if (entityId.includes('undefined')) return false; // No undefined values
  if (entityId.includes('null')) return false; // No null values
  if (!/^[a-zA-Z0-9_-]+$/.test(entityId)) return false; // Basic format check
  if (/^\d{10,}\w+$/.test(entityId)) return false; // No long-number-plus-random-chars pattern
  return true;
};

/**
 * Get Asset Layer Classification
 * Determines which layer (Marketing/Content/System) an asset belongs to
 */
const getAssetLayer = (assetType) => {
  if (ASSET_TYPES.MARKETING.includes(assetType)) return 'marketing';
  if (ASSET_TYPES.CONTENT.includes(assetType)) return 'content';
  if (ASSET_TYPES.SYSTEM.includes(assetType)) return 'system';
  throw new Error(`Unknown asset type: ${assetType}`);
};

export const useUnifiedAssetUploads = (editingProduct = null) => {
  const [uploadStates, setUploadStates] = useState({});
  const [uploadProgress, setUploadProgress] = useState({});
  const [isDeletingAsset, setIsDeletingAsset] = useState(false);
  const [assetInfo, setAssetInfo] = useState({});

  /**
   * Get Backend-Supported Entity Type
   *
   * Maps product types to backend-supported entity types for API calls
   */
  const getBackendSupportedEntityType = useCallback((productType) => {
    // Backend supports: ["workshop","course","file","tool"]
    switch (productType) {
      case 'lesson_plan':
        return 'file'; // Map lesson_plan to file for backend support
      default:
        return productType; // Most product types are directly supported
    }
  }, []);

  /**
   * Enhanced Entity Type and ID Mapper
   *
   * Maps product types to their corresponding entity types and IDs
   * for the unified API endpoints using 3-layer architecture principles.
   *
   * Key Concept:
   * - Marketing assets (image, marketing_video): Use product.id + product_type
   * - Content assets (document, workshop_video): Use entity_id + entity_type
   * - System assets (logo, audio): Use direct entity access
   */
  const getEntityMapping = useCallback((product, assetType, originalFileType = null) => {
    console.log(`🔍 START getEntityMapping:`, {
      assetType,
      originalFileType,
      productType: product?.product_type,
      productId: product?.id,
      entityId: product?.entity_id,
      productObject: product
    });

    if (!product) {
      console.log(`❌ No product provided to getEntityMapping`);
      return null;
    }

    // Enhanced asset type classification using 3-layer architecture
    // Use originalFileType if provided (before API mapping), otherwise use assetType
    const typeForClassification = originalFileType || assetType;
    const assetLayer = getAssetLayer(typeForClassification);
    console.log(`🎯 Asset layer classification:`, { typeForClassification, assetLayer });

    let entityType;
    let entityId;

    switch (assetLayer) {
      case 'marketing':
        // Marketing assets: ALWAYS use product.id + actual product_type (NOT mapped)
        console.log(`📸 Processing MARKETING asset:`, assetType);
        entityType = product.product_type; // Use actual product_type for marketing assets
        entityId = product.id; // ALWAYS use product.id for marketing assets

        // Enhanced validation for marketing assets
        if (!isValidEntityId(entityId)) {
          throw new Error(`Invalid product ID for marketing asset: ${entityId}`);
        }

        console.log(`📸 Marketing asset result:`, {
          productType: product.product_type,
          entityType: entityType, // Uses actual product_type for marketing assets
          entityId,
          source: 'product.id'
        });
        break;

      case 'content':
        // Content assets: Use entity layer (entity_id + entity_type)
        console.log(`📄 Processing CONTENT asset:`, assetType);
        switch (product.product_type) {
          case 'file':
          case 'lesson_plan':
            entityType = 'file';
            entityId = product.entity_id;
            break;
          case 'workshop':
            entityType = 'workshop';
            entityId = product.entity_id;
            break;
          case 'course':
            entityType = 'course';
            entityId = product.entity_id;
            break;
          case 'tool':
            entityType = 'tool';
            entityId = product.entity_id || product.id;
            break;
          default:
            entityType = product.product_type;
            entityId = product.entity_id || product.id;
            break;
        }

        // Enhanced validation for content assets
        if (!isValidEntityId(entityId)) {
          throw new Error(`Invalid entity ID for content asset: ${entityId}`);
        }

        console.log(`📄 Content asset result:`, {
          entityType,
          entityId,
          source: 'product.entity_id'
        });
        break;

      case 'system':
        // System assets: Direct entity access
        console.log(`⚙️ Processing SYSTEM asset:`, assetType);
        entityType = assetType; // 'logo', 'audio', etc.
        entityId = product.entity_id || product.id;

        // Enhanced validation for system assets
        if (!isValidEntityId(entityId)) {
          throw new Error(`Invalid entity ID for system asset: ${entityId}`);
        }

        console.log(`⚙️ System asset result:`, {
          entityType,
          entityId,
          source: 'direct entity'
        });
        break;

      default:
        throw new Error(`Unsupported asset layer: ${assetLayer}`);
    }

    // Final validation
    if (!entityId) {
      const error = `Missing entity ID for ${product.product_type} product (${assetLayer} asset)`;
      console.error(`❌ ${error}`);
      throw new Error(error);
    }

    const result = { entityType, entityId, assetLayer };
    console.log(`✅ FINAL getEntityMapping result:`, {
      ...result,
      assetType,
      productType: product.product_type
    });

    return result;
  }, []); // No dependencies needed for marketing assets

  /**
   * Asset Type Mapper
   *
   * Maps legacy file types to standardized asset types
   */
  const getAssetType = useCallback((fileType, isPublic = false) => {
    switch (fileType) {
      case 'image':
        return 'image';
      case 'marketing_video':
        return 'marketing-video';
      case 'file':
      case 'document':
        return 'document';
      case 'workshop_video':
      case 'video':
        return isPublic ? 'marketing-video' : 'content-video';
      case 'material':
        return 'document'; // Course materials are treated as documents
      default:
        return fileType; // Pass through for custom asset types
    }
  }, []);

  /**
   * Check Asset Existence using Standardized Fields
   *
   * Uses the Phase 3 standardized boolean + filename pattern to check asset existence.
   * No API calls needed for most checks since standardized fields are authoritative.
   */
  const checkAssetExists = useCallback(async (product, assetType) => {
    if (!product) return { exists: false };

    try {
      // Use standardized fields directly (Phase 3 pattern)
      switch (assetType) {
        case 'image':
          // Product images: has_image + image_filename pattern
          if (product.has_image === true) {
            return {
              exists: true,
              filename: product.image_filename || 'image.jpg'
            };
          }
          return { exists: false };

        case 'marketing_video':
          // Marketing videos: existing logic works well
          if (product.marketing_video_type === 'uploaded' ||
              (product.marketing_video_type === 'youtube' && product.marketing_video_id)) {
            return {
              exists: true,
              filename: product.marketing_video_type === 'uploaded' ? 'video.mp4' : null
            };
          }
          return { exists: false };

        case 'document':
          // File documents: Only make API call if this is a FILE product with valid entity_id
          // Lesson plans have multiple files in file_configs, not a single main file
          if (product.product_type === 'file' &&
              product.entity_id &&
              isValidEntityId(product.entity_id)) { // Use enhanced validation

            // Use existing file check endpoint
            const result = await apiRequest(`/assets/check/file/${product.entity_id}?assetType=document`);

            if (result.exists === true && result.filename) {
              return {
                exists: true,
                filename: result.filename,
                size: result.size,
                url: result.url
              };
            }
          }
          return { exists: false };

        default:
          return { exists: false };
      }
    } catch (error) {
      // Handle API errors gracefully for document checks only
      if (assetType === 'document' &&
          (error.error === 'Entity not found' ||
           error.message?.includes('not found in database'))) {
        return { exists: false };
      }

      console.error(`Error checking ${assetType} existence:`, error);
      return { exists: false };
    }
  }, []);

  // Initialize asset info on mount using standardized patterns
  useEffect(() => {
    if (editingProduct && editingProduct.id) {
      // Check all relevant asset types for this product
      const assetTypes = ['image', 'marketing_video'];

      // Add document check for FILE products only
      // Lesson plans don't have File entities, so they don't need document checks
      if (editingProduct.product_type === 'file') {
        assetTypes.push('document');
      }

      // Check existence for each asset type
      assetTypes.forEach(async (assetType) => {
        try {
          const info = await checkAssetExists(editingProduct, assetType);
          setAssetInfo(prev => ({
            ...prev,
            [assetType]: info
          }));
        } catch (error) {
          console.error(`Error checking ${assetType}:`, error);
        }
      });
    }
  }, [editingProduct, checkAssetExists]);

  /**
   * Set upload state for a specific asset
   */
  const setUploadState = useCallback((assetKey, isUploading) => {
    setUploadStates(prev => ({
      ...prev,
      [assetKey]: isUploading
    }));
  }, []);

  /**
   * Set upload progress for a specific asset
   */
  const setUploadProgressValue = useCallback((assetKey, progress) => {
    setUploadProgress(prev => ({
      ...prev,
      [assetKey]: progress
    }));
  }, []);

  /**
   * Standardized Asset Upload Handler
   *
   * Uses existing /api/assets/* endpoints with standardized field updates
   */
  const handleAssetUpload = useCallback(async (event, fileType, options = {}) => {
    const file = event.target.files[0];
    if (!file) return null;

    const { moduleIndex = null, isPublic = false, description = '' } = options;
    const assetKey = moduleIndex !== null ? `${fileType}_${moduleIndex}` : fileType;

    try {
      // Validate product exists and is saved
      if (!editingProduct?.id) {
        throw new Error('מוצר חייב להישמר לפני העלאת קבצים');
      }

      // Map legacy file types to standardized asset types
      const mappedAssetType = getAssetType(fileType, isPublic);

      // Get enhanced entity mapping with validation
      console.log(`🚀 UPLOAD: About to call getEntityMapping with:`, {
        productType: editingProduct.product_type,
        productId: editingProduct.id,
        entityId: editingProduct.entity_id,
        originalFileType: fileType,
        mappedAssetType
      });

      const mapping = getEntityMapping(editingProduct, mappedAssetType, fileType);

      console.log(`📋 UPLOAD: Enhanced getEntityMapping result:`, mapping);

      if (!mapping) {
        throw new Error('לא ניתן לקבוע את סוג הישות עבור מוצר זה');
      }

      const { entityType, entityId, assetLayer } = mapping;

      // Additional validation for upload operation
      if (!entityType || !entityId) {
        throw new Error(`Missing required entity information: entityType=${entityType}, entityId=${entityId}`);
      }

      console.log(`🎯 UPLOAD: Final entity info for API call:`, { entityType, entityId, fileType });

      // Validate business rules
      if (fileType === 'file' && editingProduct.is_published && assetInfo.document?.exists) {
        throw new Error('לא ניתן להחליף קובץ במוצר מפורסם');
      }

      setUploadState(assetKey, true);
      setUploadProgressValue(assetKey, 0);

      // Create FormData
      const formData = new FormData();
      formData.append('file', file);

      if (description) {
        formData.append('description', description);
      }

      // Build endpoint using calculated mapping
      let endpoint;
      let updateData = {};

      switch (fileType) {
        case 'image':
          endpoint = `/assets/upload?entityType=${entityType}&entityId=${entityId}&assetType=image`;
          // Update to standardized fields (Phase 3)
          updateData.has_image = true;
          updateData.image_filename = 'image.jpg';
          break;

        case 'marketing_video':
          endpoint = `/assets/upload?entityType=${entityType}&entityId=${entityId}&assetType=marketing-video`;
          updateData.marketing_video_type = 'uploaded';
          updateData.marketing_video_id = editingProduct.id;
          break;

        case 'file':
        case 'document':
          endpoint = `/assets/upload?entityType=${entityType}&entityId=${entityId}&assetType=document`;
          updateData.file_extension = file.name.split('.').pop();
          updateData.file_size = Math.round(file.size / 1024);
          break;

        case 'workshop_video':
          endpoint = `/assets/upload/video/private?entityType=${entityType}&entityId=${entityId}`;
          updateData.workshop_video_url = 'UPLOADED';
          break;

        default:
          throw new Error(`סוג קובץ לא נתמך: ${fileType}`);
      }

      console.log(`📤 Standardized upload: ${endpoint}`);

      // Perform upload with progress tracking
      const result = await apiUploadWithProgress(
        endpoint,
        formData,
        (progress) => setUploadProgressValue(assetKey, progress)
      );

      if (result.success) {
        // Update local asset info
        setAssetInfo(prev => ({
          ...prev,
          [fileType]: {
            exists: true,
            filename: result.filename || file.name,
            size: result.size || file.size,
            url: result.url
          }
        }));

        // Update product in database with standardized fields
        if (Object.keys(updateData).length > 0) {
          console.log(`🔄 Updating product ${editingProduct.id} with:`, updateData);
          try {
            const updateResponse = await apiRequest(`/entities/product/${editingProduct.id}`, {
              method: 'PUT',
              body: JSON.stringify(updateData)
            });

            console.log(`📊 Database update response:`, updateResponse);

            // Check if update was successful - API returns updated product object directly
            if (!updateResponse || !updateResponse.id) {
              console.error('❌ Failed to update product after asset upload:', {
                response: updateResponse,
                updateData,
                productId: editingProduct.id
              });
              toast({
                title: "חלקי הצלחה",
                description: "הקובץ הועלה אך לא ניתן לעדכן את המוצר במסד הנתונים",
                variant: "destructive"
              });
            } else {
              console.log(`✅ Product database update successful:`, {
                productId: updateResponse.id,
                hasImage: updateResponse.has_image,
                imageFilename: updateResponse.image_filename
              });
            }
          } catch (dbError) {
            console.error('❌ Database update error after asset upload:', {
              error: dbError,
              updateData,
              productId: editingProduct.id
            });
            toast({
              title: "חלקי הצלחה",
              description: "הקובץ הועלה אך לא ניתן לעדכן את המוצר במסד הנתונים",
              variant: "destructive"
            });
          }
        } else {
          console.log(`ℹ️ No database update needed - no updateData fields`);
        }

        toast({
          title: "העלאה הושלמה",
          description: `${file.name} הועלה בהצלחה`,
          variant: "default"
        });

        return { success: true, updateData, result };
      } else {
        throw new Error(result.error || 'שגיאה בהעלאת הקובץ');
      }

    } catch (error) {
      console.error(`❌ Upload error for ${fileType}:`, error);
      toast({
        title: "שגיאה בהעלאה",
        description: error.message || 'אירעה שגיאה בהעלאת הקובץ',
        variant: "destructive"
      });
      return { success: false, error: error.message };
    } finally {
      setUploadState(assetKey, false);
      setUploadProgressValue(assetKey, 0);
    }
  }, [editingProduct, assetInfo, getEntityMapping, setUploadState, setUploadProgressValue]);

  /**
   * Standardized Asset Delete Handler
   *
   * Uses existing delete endpoints with standardized field updates
   */
  const handleAssetDelete = useCallback(async (fileType, options = {}) => {
    const { moduleIndex = null } = options;

    if (moduleIndex !== null) {
      // Handle module-specific asset deletion
      return { success: true, fileType, moduleIndex };
    }

    try {
      setIsDeletingAsset(true);

      // Validate product exists
      if (!editingProduct?.id) {
        throw new Error('מוצר לא נמצא');
      }

      // Validate business rules
      if (fileType === 'file' && editingProduct.is_published) {
        throw new Error('לא ניתן למחוק קובץ ממוצר מפורסם');
      }

      // Map legacy file types to standardized asset types
      const mappedAssetType = getAssetType(fileType, false);

      // Get enhanced entity mapping with validation
      const mapping = getEntityMapping(editingProduct, mappedAssetType, fileType);
      if (!mapping) {
        throw new Error('לא ניתן לקבוע את סוג הישות עבור מוצר זה');
      }

      const { entityType, entityId, assetLayer } = mapping;

      // Additional validation for delete operation
      if (!entityType || !entityId) {
        throw new Error(`Missing required entity information: entityType=${entityType}, entityId=${entityId}`);
      }

      // Build endpoint using calculated mapping
      let endpoint;
      let updateData = {};

      switch (fileType) {
        case 'image':
          endpoint = `/assets/${entityType}/${entityId}?assetType=image`;
          // Update to standardized fields (Phase 3)
          updateData.has_image = false;
          updateData.image_filename = null;
          break;

        case 'marketing_video':
          endpoint = `/assets/${entityType}/${entityId}?assetType=marketing-video`;
          updateData.marketing_video_type = 'youtube';
          updateData.marketing_video_id = '';
          updateData.marketing_video_title = '';
          updateData.marketing_video_duration = '';
          break;

        case 'file':
        case 'document':
          endpoint = `/assets/delete/file?entityType=${entityType}&entityId=${entityId}`;
          updateData.file_extension = '';
          updateData.file_size = '';
          break;

        case 'workshop_video':
          endpoint = `/assets/delete/video?entityType=${entityType}&entityId=${entityId}`;
          updateData.workshop_video_url = '';
          break;

        default:
          throw new Error(`סוג קובץ לא נתמך למחיקה: ${fileType}`);
      }

      console.log(`🗑️ Standardized delete: ${endpoint}`);

      const result = await apiRequest(endpoint, {
        method: 'DELETE'
      });

      // Update local asset info
      setAssetInfo(prev => ({
        ...prev,
        [fileType]: { exists: false }
      }));

      // Update product in database with standardized fields
      if (Object.keys(updateData).length > 0) {
        try {
          const updateResponse = await apiRequest(`/entities/product/${editingProduct.id}`, {
            method: 'PUT',
            body: JSON.stringify(updateData)
          });

          if (!updateResponse.success) {
            console.error('Failed to update product after asset deletion:', updateResponse.error);
          }
        } catch (dbError) {
          console.error('Database update error after asset deletion:', dbError);
        }
      }

      toast({
        title: "הקובץ נמחק",
        description: "הקובץ נמחק בהצלחה מהמערכת",
        variant: "default"
      });

      return { success: true, updateData };

    } catch (error) {
      console.error(`❌ Delete error for ${fileType}:`, error);
      toast({
        title: "שגיאה במחיקה",
        description: error.message || 'אירעה שגיאה במחיקת הקובץ',
        variant: "destructive"
      });
      return { success: false, error: error.message };
    } finally {
      setIsDeletingAsset(false);
    }
  }, [editingProduct, getEntityMapping]);

  /**
   * Check if a specific asset is currently uploading
   */
  const isUploading = useCallback((fileType, moduleIndex = null) => {
    const assetKey = moduleIndex !== null ? `${fileType}_${moduleIndex}` : fileType;
    return uploadStates[assetKey] || false;
  }, [uploadStates]);

  /**
   * Get upload progress for a specific asset
   */
  const getUploadProgress = useCallback((fileType, moduleIndex = null) => {
    const assetKey = moduleIndex !== null ? `${fileType}_${moduleIndex}` : fileType;
    return uploadProgress[assetKey] || 0;
  }, [uploadProgress]);

  /**
   * Check if an asset exists
   */
  const hasAsset = useCallback((fileType) => {
    return assetInfo[fileType]?.exists || false;
  }, [assetInfo]);

  /**
   * Get asset information
   */
  const getAssetInfo = useCallback((fileType) => {
    return assetInfo[fileType] || { exists: false };
  }, [assetInfo]);

  return {
    // Upload state management
    uploadStates,
    uploadProgress,
    isDeletingAsset,
    assetInfo,

    // Main operations (standardized)
    handleAssetUpload,
    handleAssetDelete,
    checkAssetExists,

    // Utility functions
    isUploading,
    getUploadProgress,
    hasAsset,
    getAssetInfo,
    setAssetInfo,

    // Legacy compatibility aliases (for smooth transition)
    handleFileUpload: handleAssetUpload,
    handleDeleteFile: handleAssetDelete,
    uploadedFileInfo: assetInfo.document || { exists: false },
    marketingVideoExists: assetInfo.marketing_video?.exists || false,
    hasUploadedFile: () => hasAsset('document'),
    setUploadedFileInfo: (info) => setAssetInfo(prev => ({ ...prev, document: info })),
    setMarketingVideoExists: (exists) => setAssetInfo(prev => ({
      ...prev,
      marketing_video: { ...prev.marketing_video, exists }
    }))
  };
};

export default useUnifiedAssetUploads;
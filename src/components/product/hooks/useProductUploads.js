import { useState, useCallback, useEffect } from 'react';
import { apiUploadWithProgress, apiRequest } from '@/services/apiClient';
import { getApiBase } from '@/utils/api.js';
import { toast } from '@/components/ui/use-toast';
import { useGlobalAuthErrorHandler } from '@/components/providers/AuthErrorProvider';

/**
 * Maps product types to backend-supported entity types for content assets
 * Backend supports: ["workshop", "course", "file", "tool"]
 */
const getContentEntityType = (productType) => {
  switch (productType) {
    case 'workshop':
      return 'workshop';
    case 'course':
      return 'course';
    case 'file':
      return 'file';
    case 'tool':
      return 'tool';
    case 'lesson_plan':
      return 'file'; // Lesson plan content files are stored as file entities
    case 'game':
      return 'tool'; // Game content is stored as tool entities
    default:
      return 'file'; // Default fallback for unknown types
  }
};

/**
 * Maps product types to backend-supported entity types for marketing assets (images, videos)
 * Marketing assets always belong to the Product layer and use the actual product type
 */
const getMarketingEntityType = (productType) => {
  // For marketing assets, use the actual product type as the entity type
  return productType;
};

/**
 * Custom hook for managing product file uploads
 * Handles upload states, progress tracking, and file management
 */
export const useProductUploads = (editingProduct = null) => {
  const [uploadStates, setUploadStates] = useState({});
  const [uploadProgress, setUploadProgress] = useState({});
  const [isDeletingFile, setIsDeletingFile] = useState(false);
  const [uploadedFileInfo, setUploadedFileInfo] = useState(null);
  const [marketingVideoExists, setMarketingVideoExists] = useState(false);

  // Auth error handling
  const { handleAuthError } = useGlobalAuthErrorHandler();

  // API call to check if file exists (exactly like original ProductModal)
  const checkFileUploadExists = useCallback(async (product) => {
    if (!product?.entity_id || product?.product_type !== 'file') return null;

    try {
      const result = await apiRequest(`/assets/check/file/${product.entity_id}?assetType=document`);
      console.log('📁 File check API result:', result);

      if (result.exists === true && result.filename) {
        return { exists: true, filename: result.filename };
      }
    } catch (error) {
      console.error('Error checking file upload:', error);
    }

    return null;
  }, []);

  // Check for uploaded file info on mount (for file products)
  useEffect(() => {
    if (editingProduct && editingProduct.product_type === 'file' && editingProduct.entity_id) {
      console.log('🔍 Checking file existence for entity_id:', editingProduct.entity_id);

      checkFileUploadExists(editingProduct).then(fileInfo => {
        console.log('📁 File check result:', fileInfo);
        setUploadedFileInfo(fileInfo);
      });
    }
  }, [editingProduct, checkFileUploadExists]);

  // Check for marketing video on mount
  useEffect(() => {
    if (editingProduct) {
      // Set marketing video exists if there's either uploaded video or YouTube video
      const hasUploadedVideo = editingProduct.marketing_video_type === 'uploaded';
      const hasYouTubeVideo = editingProduct.marketing_video_type === 'youtube' &&
                              editingProduct.marketing_video_id;

      setMarketingVideoExists(hasUploadedVideo || hasYouTubeVideo);
    }
  }, [editingProduct]);

  // Set upload state for a specific file type
  const setUploadState = useCallback((fileType, isUploading) => {
    setUploadStates(prev => ({
      ...prev,
      [fileType]: isUploading
    }));
  }, []);

  // Set upload progress for a specific file type
  const setUploadProgressValue = useCallback((fileType, progress) => {
    setUploadProgress(prev => ({
      ...prev,
      [fileType]: progress
    }));
  }, []);

  // Generic file upload handler
  const handleFileUpload = useCallback(async (event, fileType, moduleIndex = null) => {
    const file = event.target.files[0];
    if (!file) return null;

    const uploadKey = moduleIndex !== null ? `${fileType}_${moduleIndex}` : fileType;

    try {
      setUploadState(uploadKey, true);
      setUploadProgressValue(uploadKey, 0);

      let endpoint = '';
      let updateData = {};

      // Determine endpoint and update data based on file type
      switch (fileType) {
        case 'image':
          if (!editingProduct || !editingProduct.id) {
            throw new Error('מוצר חייב להישמר לפני העלאת תמונה');
          }

          const entityType = getMarketingEntityType(editingProduct.product_type);
          // Marketing images always belong to the Product layer, so always use Product ID
          const entityId = editingProduct.id;
          endpoint = `/assets/upload?entityType=${entityType}&entityId=${entityId}&assetType=image`;
          updateData.has_image = true;
          break;

        case 'marketing_video':
          if (!editingProduct || !editingProduct.id) {
            throw new Error('מוצר חייב להישמר לפני העלאת סרטון שיווקי');
          }
          const entityTypeVideo = getMarketingEntityType(editingProduct.product_type);
          endpoint = `/assets/upload/video/public?entityType=${entityTypeVideo}&entityId=${editingProduct.id}`;
          break;

        case 'file':
          if (!editingProduct?.entity_id) {
            throw new Error('מוצר חייב להישמר לפני העלאת קובץ');
          }
          if ((editingProduct?.is_published) && uploadedFileInfo?.exists) {
            throw new Error('לא ניתן להחליף קובץ במוצר מפורסם');
          }
          const contentEntityType = getContentEntityType(editingProduct.product_type);
          endpoint = `/assets/upload?entityType=${contentEntityType}&entityId=${editingProduct.entity_id}&assetType=document`;
          break;

        case 'workshop_video':
          if (!editingProduct?.id || !editingProduct?.product_type) {
            throw new Error('סדנה חייבת להישמר לפני העלאת סרטון');
          }
          if (!editingProduct?.entity_id) {
            throw new Error('לא נמצא מזהה ישות עבור הסדנה');
          }
          if (editingProduct?.is_published) {
            throw new Error('לא ניתן להחליף סרטון בסדנה מפורסמת');
          }
          const workshopEntityType = getContentEntityType(editingProduct.product_type);
          endpoint = `/assets/upload/video/private?entityType=${workshopEntityType}&entityId=${editingProduct.entity_id}`;
          break;

        case 'video':
          // Course module video
          const courseVideoEntityType = getContentEntityType(editingProduct.product_type);
          endpoint = `/assets/upload/video/private?entityType=${courseVideoEntityType}&entityId=${editingProduct?.entity_id}&moduleIndex=${moduleIndex}`;
          break;

        case 'material':
          // Course module material
          const courseMaterialEntityType = getContentEntityType(editingProduct.product_type);
          endpoint = `/assets/upload?entityType=${courseMaterialEntityType}&entityId=${editingProduct?.entity_id}&moduleIndex=${moduleIndex}&assetType=material`;
          break;

        default:
          throw new Error(`סוג קובץ לא נתמך: ${fileType}`);
      }

      // Create FormData object for the upload
      const formData = new FormData();
      formData.append('file', file);

      // Perform the upload
      const result = await apiUploadWithProgress(
        endpoint,
        formData,
        (progress) => setUploadProgressValue(uploadKey, progress)
      );

      if (result.success) {
        // Handle successful upload based on file type
        switch (fileType) {
          case 'image':
            // Use standardized fields (Phase 3 implementation)
            updateData.has_image = true;
            updateData.image_filename = 'image.jpg'; // Standard filename
            // Keep legacy field for backward compatibility during transition period
            updateData.image_url = 'HAS_IMAGE'; // DEPRECATED: Will be removed in Phase 4
            break;
          case 'marketing_video':
            setMarketingVideoExists(true);
            updateData.marketing_video_type = 'uploaded';
            updateData.marketing_video_id = editingProduct?.id;
            break;
          case 'file':
            setUploadedFileInfo({
              exists: true,
              filename: result.filename || file.name
            });
            updateData.file_extension = file.name.split('.').pop();
            updateData.file_size = Math.round(file.size / 1024);
            break;
        }

        // Immediately update the product in database to prevent orphaned files
        if (editingProduct?.id && Object.keys(updateData).length > 0) {
          console.log('🔄 Attempting database update:', {
            productId: editingProduct.id,
            updateData,
            fileType,
            uploadResult: result
          });

          try {
            const dbUpdateResult = await apiRequest(`/entities/product/${editingProduct.id}`, {
              method: 'PUT',
              body: JSON.stringify(updateData)
            });
            console.log('✅ Database update successful:', {
              productId: editingProduct.id,
              updateData,
              dbResult: dbUpdateResult
            });
          } catch (dbError) {
            console.error('❌ Database update error after file upload:', {
              productId: editingProduct.id,
              updateData,
              error: dbError,
              fileType,
              uploadSuccessful: result.success
            });

            // Check if this is an auth error and handle it
            const wasHandled = handleAuthError(dbError, async () => {
              // Retry the database update after successful login
              try {
                await apiRequest(`/entities/product/${editingProduct.id}`, {
                  method: 'PUT',
                  body: JSON.stringify(updateData)
                });
                toast({
                  title: "עודכן בהצלחה",
                  description: "המוצר עודכן לאחר התחברות מחדש",
                  variant: "default"
                });
              } catch (retryError) {
                console.error('Retry failed:', retryError);
                toast({
                  title: "שגיאה בעדכון",
                  description: "לא ניתן לעדכן את המוצר. הקובץ הועלה אך המוצר לא עודכן",
                  variant: "destructive"
                });
              }
            });

            if (!wasHandled) {
              // Not an auth error - show regular error message
              toast({
                title: "שגיאה בעדכון",
                description: "הקובץ הועלה בהצלחה אך לא ניתן לעדכן את המוצר",
                variant: "destructive"
              });
            }
          }
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
      setUploadState(uploadKey, false);
      setUploadProgressValue(uploadKey, 0);
    }
  }, [editingProduct, uploadedFileInfo, setUploadState, setUploadProgressValue, handleAuthError]);

  // Generic file delete handler
  const handleDeleteFile = useCallback(async (fileType, moduleIndex = null) => {
    if (moduleIndex !== null) {
      // Handle module-specific file deletion (course videos/materials)
      return { success: true, fileType, moduleIndex };
    }

    try {
      setIsDeletingFile(true);

      let endpoint = '';
      let updateData = {};

      switch (fileType) {
        case 'image':
          const deleteEntityType = getMarketingEntityType(editingProduct.product_type);
          // Marketing images always belong to the Product layer, so always use Product ID
          const deleteEntityId = editingProduct.id;
          // Backend expects: DELETE /api/assets/:entityType/:entityId?assetType=image
          endpoint = `/assets/${deleteEntityType}/${deleteEntityId}?assetType=image`;
          // Use standardized fields (Phase 3 implementation)
          updateData.has_image = false;
          updateData.image_filename = null;
          // Keep legacy field for backward compatibility during transition period
          updateData.image_url = null; // DEPRECATED: Will be removed in Phase 4
          break;
        case 'marketing_video':
          const deleteVideoEntityType = getMarketingEntityType(editingProduct.product_type);
          endpoint = `/assets/${deleteVideoEntityType}/${editingProduct?.id}?assetType=marketing-video`;
          setMarketingVideoExists(false);
          updateData.marketing_video_type = 'youtube'; // Reset to default
          updateData.marketing_video_id = '';
          updateData.marketing_video_title = '';
          updateData.marketing_video_duration = '';
          break;
        case 'file':
          if (editingProduct?.is_published) {
            throw new Error('לא ניתן למחוק קובץ ממוצר מפורסם');
          }
          const deleteFileEntityType = getContentEntityType(editingProduct.product_type);
          endpoint = `/assets/delete/file?entityType=${deleteFileEntityType}&entityId=${editingProduct?.entity_id}`;
          setUploadedFileInfo(null);
          updateData.file_extension = '';
          updateData.file_size = '';
          break;
        case 'workshop_video':
          const deleteWorkshopEntityType = getContentEntityType(editingProduct.product_type);
          endpoint = `/assets/delete/video?entityType=${deleteWorkshopEntityType}&entityId=${editingProduct?.entity_id}`;
          updateData.workshop_video_url = '';
          break;
      }

      await apiRequest(endpoint, {
        method: 'DELETE'
      });

      toast({
        title: "הקובץ נמחק",
        description: "הקובץ נמחק בהצלחה מהמערכת",
        variant: "default"
      });
      return { success: true, updateData };

    } catch (error) {
      console.error(`❌ Delete error for ${fileType}:`, error);

      // Check if this is an auth error and handle it
      const wasHandled = handleAuthError(error, async () => {
        // Retry the delete operation after successful login
        try {
          await apiRequest(endpoint, {
            method: 'DELETE'
          });
          toast({
            title: "הקובץ נמחק",
            description: "הקובץ נמחק בהצלחה לאחר התחברות מחדש",
            variant: "default"
          });
        } catch (retryError) {
          console.error('Delete retry failed:', retryError);
          toast({
            title: "שגיאה במחיקה",
            description: "לא ניתן למחוק את הקובץ גם לאחר התחברות מחדש",
            variant: "destructive"
          });
        }
      });

      if (!wasHandled) {
        // Not an auth error - show regular error message
        toast({
          title: "שגיאה במחיקה",
          description: error.message || 'אירעה שגיאה במחיקת הקובץ',
          variant: "destructive"
        });
      }
      return { success: false, error: error.message };
    } finally {
      setIsDeletingFile(false);
    }
  }, [editingProduct, handleAuthError]);

  // Check if a specific file type is currently uploading
  const isUploading = useCallback((fileType, moduleIndex = null) => {
    const uploadKey = moduleIndex !== null ? `${fileType}_${moduleIndex}` : fileType;
    return uploadStates[uploadKey] || false;
  }, [uploadStates]);

  // Get upload progress for a specific file type
  const getUploadProgress = useCallback((fileType, moduleIndex = null) => {
    const uploadKey = moduleIndex !== null ? `${fileType}_${moduleIndex}` : fileType;
    return uploadProgress[uploadKey] || 0;
  }, [uploadProgress]);

  // Check if file is uploaded (for file products)
  const hasUploadedFile = useCallback(() => {
    return uploadedFileInfo?.exists || false;
  }, [uploadedFileInfo]);

  return {
    uploadStates,
    uploadProgress,
    isDeletingFile,
    uploadedFileInfo,
    marketingVideoExists,
    setUploadedFileInfo,
    setMarketingVideoExists,
    handleFileUpload,
    handleDeleteFile,
    isUploading,
    getUploadProgress,
    hasUploadedFile,
    setHasUploadedFile: setUploadedFileInfo
  };
};
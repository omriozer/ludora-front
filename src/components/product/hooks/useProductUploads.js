import { useState, useCallback, useEffect } from 'react';
import { apiUploadWithProgress, apiRequest } from '@/services/apiClient';
import { getApiBase } from '@/utils/api.js';
import { toast } from '@/components/ui/use-toast';

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
          const entityType = editingProduct?.product_type || 'product';
          const entityId = editingProduct?.id;
          endpoint = `/assets/upload?entityType=${entityType}&entityId=${entityId}&assetType=image`;
          updateData.has_image = true;
          break;

        case 'marketing_video':
          if (!editingProduct || !editingProduct.id) {
            throw new Error('מוצר חייב להישמר לפני העלאת סרטון שיווקי');
          }
          const entityTypeVideo = editingProduct?.product_type || 'product';
          endpoint = `/assets/upload/video/public?entityType=${entityTypeVideo}&entityId=${editingProduct.id}`;
          break;

        case 'file':
          if (!editingProduct?.entity_id) {
            throw new Error('מוצר חייב להישמר לפני העלאת קובץ');
          }
          if ((editingProduct?.is_published) && uploadedFileInfo?.exists) {
            throw new Error('לא ניתן להחליף קובץ במוצר מפורסם');
          }
          endpoint = `/assets/upload?entityType=file&entityId=${editingProduct.entity_id}&assetType=document`;
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
          endpoint = `/assets/upload/video/private?entityType=workshop&entityId=${editingProduct.entity_id}`;
          break;

        case 'video':
          // Course module video
          endpoint = `/assets/upload/video/private?entityType=course&entityId=${editingProduct?.entity_id}&moduleIndex=${moduleIndex}`;
          break;

        case 'material':
          // Course module material
          endpoint = `/assets/upload?entityType=course&entityId=${editingProduct?.entity_id}&moduleIndex=${moduleIndex}&assetType=material`;
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
            updateData.has_image = true;
            updateData.image_url = 'HAS_IMAGE'; // Set image_url so UI knows image exists
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
          try {
            const updateResponse = await fetch(`${getApiBase()}/entities/product/${editingProduct.id}`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(updateData)
            });

            if (!updateResponse.ok) {
              console.error('Failed to update product after file upload:', updateResponse.statusText);
              // Note: File is already uploaded to S3, but DB update failed
              // In a production system, you'd want to implement rollback or cleanup
            }
          } catch (dbError) {
            console.error('Database update error after file upload:', dbError);
            // File uploaded but database not updated - this prevents orphaned files
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
  }, [editingProduct, uploadedFileInfo, setUploadState, setUploadProgressValue]);

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
          endpoint = `/assets/delete/image?entityType=${editingProduct?.product_type}&entityId=${editingProduct?.id}`;
          updateData.has_image = false;
          updateData.image_url = null; // Clear image_url so UI knows image is gone
          break;
        case 'marketing_video':
          // Use the same API endpoint as original modal
          endpoint = `/assets/${editingProduct?.product_type}/${editingProduct?.id}?assetType=marketing-video`;
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
          endpoint = `/assets/delete/file?entityType=file&entityId=${editingProduct?.entity_id}`;
          setUploadedFileInfo(null);
          updateData.file_extension = '';
          updateData.file_size = '';
          break;
        case 'workshop_video':
          endpoint = `/assets/delete/video?entityType=workshop&entityId=${editingProduct?.entity_id}`;
          updateData.workshop_video_url = '';
          break;
      }

      const response = await fetch(`${getApiBase()}${endpoint}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        toast({
          title: "הקובץ נמחק",
          description: "הקובץ נמחק בהצלחה מהמערכת",
          variant: "default"
        });
        return { success: true, updateData };
      } else {
        throw new Error('שגיאה במחיקת הקובץ');
      }

    } catch (error) {
      console.error(`❌ Delete error for ${fileType}:`, error);
      toast({
        title: "שגיאה במחיקה",
        description: error.message || 'אירעה שגיאה במחיקת הקובץ',
        variant: "destructive"
      });
      return { success: false, error: error.message };
    } finally {
      setIsDeletingFile(false);
    }
  }, [editingProduct]);

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
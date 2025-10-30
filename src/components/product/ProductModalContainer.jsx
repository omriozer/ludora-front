import React, { useState, useEffect } from 'react';
import { Settings, Product } from '@/services/entities';
import { apiRequest, ProductAPI } from '@/services/apiClient';
import { useProductForm } from './hooks/useProductForm';
import { useProductUploads } from './hooks/useProductUploads';
import { useProductAccess } from './hooks/useProductAccess';
import { BasicInfoSection } from './sections/BasicInfoSection';
import { ProductSpecificSection } from './sections/ProductSpecificSection';
import { MarketingSection } from './sections/MarketingSection';
import { AccessSettingsSection } from './sections/AccessSettingsSection';
import { PublishSection } from './sections/PublishSection';
import PdfFooterPreview from '../pdf/PdfFooterPreview';
import { getProductTypeName } from '@/config/productTypes';
import { toast } from '@/components/ui/use-toast';

/**
 * ProductModalContainer - Main orchestrator for product management
 * Coordinates all sections, hooks, and business logic in a UI-agnostic way
 */
export const ProductModalContainer = ({
  editingProduct = null,
  currentUser = null,
  isContentCreatorMode = false,
  onClose = () => {},
  onSave = () => {},
  LayoutComponent // Injected layout component for UI pattern flexibility
}) => {
  // State for UI components
  const [globalSettings, setGlobalSettings] = useState({});
  const [showFooterPreview, setShowFooterPreview] = useState(false);
  const [footerConfig, setFooterConfig] = useState(null);
  const [step, setStep] = useState(editingProduct ? 'form' : 'typeSelection');
  const [message, setMessage] = useState(null);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Initialize custom hooks
  const {
    formData,
    updateFormData,
    updateNestedFormData,
    addTag,
    removeTag,
    resetForm,
    hasChanges,
    isSaving,
    setIsSaving,
    saveAndContinue,
    setSaveAndContinue
  } = useProductForm(editingProduct);

  const {
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
    getUploadProgress
  } = useProductUploads(editingProduct);

  const {
    sectionAccess,
    sectionsRequiringSave,
    isSectionAccessible,
    getSectionAccess,
    shouldShowSaveAndContinue,
    validateForm,
    isFieldValid,
    getFieldError,
    canSave,
    canPublish,
    isNewProduct,
    isFileProduct,
    hasUploadedFile
  } = useProductAccess(editingProduct, formData, uploadedFileInfo, editingProduct?.id, isLoadingData);

  // Load global settings on mount
  useEffect(() => {
    const loadGlobalSettings = async () => {
      try {
        setIsLoadingData(true);
        const settingsData = await Settings.find();
        const settings = settingsData.length > 0 ? settingsData[0] : {};
        setGlobalSettings(settings);
      } catch (error) {
        console.error('Failed to load global settings:', error);
        setGlobalSettings({});
      } finally {
        setIsLoadingData(false);
      }
    };

    loadGlobalSettings();
  }, []);

  // API call to check if file exists (exactly like original ProductModal)
  const checkFileUploadExists = async (product) => {
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
  };

  // Check for uploaded file info on mount (for file products)
  useEffect(() => {
    if (editingProduct && editingProduct.product_type === 'file' && editingProduct.entity_id) {
      console.log('🔍 Checking file existence for entity_id:', editingProduct.entity_id);

      checkFileUploadExists(editingProduct).then(fileInfo => {
        console.log('📁 File check result:', fileInfo);
        setUploadedFileInfo(fileInfo);
      });
    }
  }, [editingProduct, setUploadedFileInfo]);

  // Check for marketing video on mount
  useEffect(() => {
    if (editingProduct) {
      // Set marketing video exists if there's either uploaded video or YouTube video
      const hasUploadedVideo = editingProduct.marketing_video_type === 'uploaded';
      const hasYouTubeVideo = editingProduct.marketing_video_type === 'youtube' &&
                              editingProduct.marketing_video_id;

      setMarketingVideoExists(hasUploadedVideo || hasYouTubeVideo);
    }
  }, [editingProduct, setMarketingVideoExists]);

  // Helper functions for enabled product types
  const getEnabledProductTypes = () => {
    if (!currentUser) return [];

    const isAdmin = currentUser.role === 'admin' || currentUser.role === 'sysadmin';

    if (isAdmin && !isContentCreatorMode) {
      // For admins in admin mode, check nav_*_enabled settings
      const types = [];
      if (globalSettings?.nav_files_enabled === true) types.push('file');
      if (globalSettings?.nav_games_enabled === true) types.push('game');
      if (globalSettings?.nav_workshops_enabled === true) types.push('workshop');
      if (globalSettings?.nav_courses_enabled === true) types.push('course');
      if (editingProduct && editingProduct.product_type === 'tool') types.push('tool');
      return types;
    }

    // For content creators
    const enabledTypes = [];
    if (globalSettings?.allow_content_creator_workshops === true) enabledTypes.push('workshop');
    if (globalSettings?.allow_content_creator_courses === true) enabledTypes.push('course');
    if (globalSettings?.allow_content_creator_files === true) enabledTypes.push('file');
    if (globalSettings?.allow_content_creator_games === true) enabledTypes.push('game');
    if (editingProduct && editingProduct.product_type === 'tool') enabledTypes.push('tool');

    return enabledTypes;
  };

  const canCreateProductType = (type) => {
    const enabledTypes = getEnabledProductTypes();
    return enabledTypes.includes(type);
  };

  // Enhanced file upload handler that integrates with form data
  const handleEnhancedFileUpload = async (event, fileType, moduleIndex = null) => {
    const result = await handleFileUpload(event, fileType, moduleIndex);

    if (result?.success && result.updateData) {
      updateFormData(result.updateData);
    }

    return result;
  };

  // Enhanced file delete handler that integrates with form data
  const handleEnhancedFileDelete = async (fileType, moduleIndex = null) => {
    const result = await handleDeleteFile(fileType, moduleIndex);

    if (result?.success && result.updateData) {
      updateFormData(result.updateData);
    }

    return result;
  };

  // Message display helper
  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  // Simplified save handler using unified ProductAPI
  const handleSave = async (formData, continueEditing = false) => {
    if (!formData.title?.trim() || !formData.description?.trim()) {
      showMessage('error', 'כותרת ותיאור ארוך הם שדות חובה');
      return;
    }

    if (!formData.product_type) {
      showMessage('error', 'סוג מוצר חובה');
      return;
    }

    setIsSaving(true);
    setSaveAndContinue(continueEditing);

    // Validate workshop-specific requirements
    if (formData.product_type === 'workshop') {
      if (formData.workshop_type === 'online_live') {
        if (!formData.scheduled_date || !formData.meeting_link) {
          showMessage('error', `עבור ${getProductTypeName('workshop', 'singular')} אונליין חיה נדרשים תאריך ושעה וקישור למפגש`);
          setIsSaving(false);
          return;
        }
      } else if (formData.workshop_type === 'recorded') {
        if (!formData.video_file_url) {
          showMessage('error', `עבור ${getProductTypeName('workshop', 'singular')} מוקלטת נדרש קובץ וידיאו`);
          setIsSaving(false);
          return;
        }
      }
    }

    try {
      const entityName = getProductTypeName(formData.product_type, 'singular') || 'מוצר';

      // Clean the data - prepare for API
      const cleanedData = {
        title: formData.title,
        short_description: formData.short_description,
        description: formData.description,
        category: formData.category,
        product_type: formData.product_type,
        scheduled_date: (formData.scheduled_date && formData.scheduled_date.trim()) ? formData.scheduled_date : null,
        meeting_link: formData.meeting_link || null,
        meeting_password: formData.meeting_password || null,
        meeting_platform: (formData.meeting_platform && formData.meeting_platform.trim()) ? formData.meeting_platform : null,
        video_file_url: formData.video_file_url || null,
        max_participants: formData.max_participants || null,
        duration_minutes: formData.duration_minutes || null,
        price: formData.price,
        is_published: formData.is_published,
        image_url: formData.image_url || null,
        file_type: formData.file_type || null,
        allow_preview: formData.allow_preview ?? true,
        add_copyrights_footer: formData.add_copyrights_footer ?? true,
        is_ludora_creator: formData.is_ludora_creator || false,
        tags: formData.tags?.filter(tag => tag.trim()) || [],
        target_audience: (formData.target_audience && formData.target_audience.trim()) ? formData.target_audience : null,
        type_attributes: formData.type_attributes || {},
        marketing_video_type: formData.marketing_video_type || null,
        marketing_video_id: (formData.marketing_video_id && formData.marketing_video_id.trim()) ? formData.marketing_video_id : null,
        marketing_video_title: (formData.marketing_video_title && formData.marketing_video_title.trim()) ? formData.marketing_video_title : null,
        marketing_video_duration: formData.marketing_video_duration ? parseInt(formData.marketing_video_duration) || null : null,
        access_days: (formData.access_days === null || formData.access_days === undefined || formData.access_days === "") ? null : (isNaN(parseInt(formData.access_days)) ? null : parseInt(formData.access_days)),
        course_modules: formData.product_type === 'course' ? formData.course_modules : undefined,
        total_duration_minutes: formData.total_duration_minutes,
        creator_user_id: formData.creator_user_id || null
      };

      // Add product-type specific fields
      if (formData.product_type === 'workshop') {
        cleanedData.workshop_type = formData.workshop_type;
      }

      // Add is_private flags if they exist and are relevant
      if (formData.image_is_private !== undefined) cleanedData.image_is_private = formData.image_is_private;

      if (cleanedData.course_modules) {
        cleanedData.course_modules = cleanedData.course_modules.map(module => ({
          ...module,
          video_is_private: module.video_is_private ?? false,
          material_is_private: module.material_is_private ?? false,
        }));
      }

      // Debug logging
      console.log('🔍 ProductAPI save debug:', {
        product_type: cleanedData.product_type,
        title: cleanedData.title,
        is_published: cleanedData.is_published,
        tags: cleanedData.tags
      });

      let result = null;

      if (editingProduct) {
        // Check if unpublishing a product with completed purchases
        if (editingProduct.is_published && !cleanedData.is_published) {
          try {
            const response = await apiRequest(`/api/purchase/check-product-purchases/${editingProduct.id}`);
            if (response.hasNonFreePurchases) {
              toast({
                title: "לא ניתן להסיר פרסום",
                description: `למוצר זה יש ${response.purchaseCount} רכישות שהושלמו. לא ניתן להסיר את הפרסום של מוצר שנרכש.`,
                variant: "destructive"
              });
              setIsSaving(false);
              return;
            }
          } catch (error) {
            console.error('Error checking product purchases:', error);
            // Continue with update if check fails (graceful fallback)
          }
        }

        // Update existing product (TODO: Will need update endpoint)
        await Product.update(editingProduct.id, cleanedData);
        showMessage('success', `${entityName} עודכן בהצלחה`);
        result = { id: editingProduct.id, ...cleanedData };
      } else {
        // Create new product using unified API
        result = await ProductAPI.create(cleanedData);
        console.log('📝 Created product:', result);
        showMessage('success', `${entityName} נוצר בהצלחה`);

        // For new File products without uploaded file, show message
        if (formData.product_type === 'file' && !hasUploadedFile) {
          toast({
            title: "מוצר נוצר בהצלחה",
            description: "לחץ על 'עריכה' במוצר החדש כדי להעלות את הקובץ",
            variant: "default"
          });
        }
      }

      // Handle save and continue vs save and close
      if (continueEditing && !editingProduct) {
        // If save and continue for new product, refresh with the created product data
        setTimeout(() => {
          if (onSave) onSave();
          setIsSaving(false);
          showMessage('success', `${entityName} נשמר בהצלחה! כעת ניתן להעלות תמונות, וידאו ועוד`);
        }, 500);
      } else {
        // For save and close, keep loading state until modal closes
        setTimeout(() => {
          if (onSave) onSave();
          setIsSaving(false);
          onClose();
        }, 1500);
      }

    } catch (error) {
      console.error('Save error:', error);
      showMessage('error', error.message || 'אירעה שגיאה בשמירת המוצר');
      setIsSaving(false);
      setSaveAndContinue(false);
    }
  };

  // Section definitions for the layout
  const sections = [
    {
      id: 'basicInfo',
      title: 'מידע בסיסי',
      component: BasicInfoSection,
      props: {
        formData,
        updateFormData,
        addTag,
        removeTag,
        isNewProduct,
        enabledProductTypes: getEnabledProductTypes(),
        canCreateProductType,
        onStepChange: setStep,
        isFieldValid,
        getFieldError,
        globalSettings
      },
      access: getSectionAccess('basicInfo')
    },
    {
      id: 'productContent',
      title: 'תוכן המוצר',
      component: ProductSpecificSection,
      props: {
        formData,
        updateFormData,
        updateNestedFormData,
        editingProduct,
        handleFileUpload: handleEnhancedFileUpload,
        handleDeleteFile: handleEnhancedFileDelete,
        isUploading,
        getUploadProgress,
        uploadedFileInfo,
        currentUser,
        showFooterPreview,
        setShowFooterPreview,
        isAccessible: isSectionAccessible('productContent'),
        accessReason: getSectionAccess('productContent').reason,
        isFieldValid,
        getFieldError,
        globalSettings
      },
      access: getSectionAccess('productContent')
    },
    {
      id: 'marketing',
      title: 'חומרי שיווק',
      component: MarketingSection,
      props: {
        formData,
        updateFormData,
        editingProduct,
        handleFileUpload: handleEnhancedFileUpload,
        handleDeleteFile: handleEnhancedFileDelete,
        isUploading,
        getUploadProgress,
        marketingVideoExists,
        isAccessible: isSectionAccessible('marketing'),
        accessReason: getSectionAccess('marketing').reason
      },
      access: getSectionAccess('marketing')
    },
    {
      id: 'accessSettings',
      title: 'הגדרות גישה',
      component: AccessSettingsSection,
      props: {
        formData,
        updateFormData,
        isFieldValid,
        getFieldError,
        globalSettings,
        isNewProduct
      },
      access: getSectionAccess('accessSettings')
    },
    {
      id: 'publishing',
      title: 'פרסום המוצר',
      component: PublishSection,
      props: {
        formData,
        updateFormData,
        canPublish,
        validateForm,
        isAccessible: isSectionAccessible('publishing'),
        accessReason: getSectionAccess('publishing').reason,
        editingProduct,
        isNewProduct,
        currentUser,
        hasUploadedFile
      },
      access: getSectionAccess('publishing')
    }
  ];

  // Common props to pass to the layout component
  const layoutProps = {
    editingProduct,
    formData,
    isNewProduct,
    step,
    setStep,
    sections,
    message,
    showMessage,
    isSaving,
    setIsSaving,
    saveAndContinue,
    setSaveAndContinue,
    shouldShowSaveAndContinue,
    canSave,
    canPublish,
    validateForm,
    hasChanges,
    onClose,
    onSave: handleSave, // Use our implemented save handler
    isLoadingData,
    hasUploadedFile
  };

  return (
    <>
      {/* Main Layout Component */}
      <LayoutComponent {...layoutProps} />

      {/* PDF Footer Preview Modal */}
      {formData.product_type === 'file' && editingProduct?.entity_id && (
        <PdfFooterPreview
          isOpen={showFooterPreview}
          onClose={() => setShowFooterPreview(false)}
          onSave={(config) => setFooterConfig(config)}
          fileEntityId={editingProduct.entity_id}
          userRole={currentUser?.role || 'user'}
          initialFooterConfig={footerConfig}
        />
      )}
    </>
  );
};
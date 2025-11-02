import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { User, Settings, LessonPlan } from '@/services/entities';
import { ArrowRight, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Import product modal components and logic
import { useProductForm } from '@/components/product/hooks/useProductForm';
import { useProductUploads } from '@/components/product/hooks/useProductUploadsCompat';
import { useProductAccess } from '@/components/product/hooks/useProductAccess';
import { WizardLayout } from '@/components/product/layouts/WizardLayout';
import { BasicInfoSection } from '@/components/product/sections/BasicInfoSection';
import { ProductSpecificSection } from '@/components/product/sections/ProductSpecificSection';
import { MarketingSection } from '@/components/product/sections/MarketingSection';
import { AccessSettingsSection } from '@/components/product/sections/AccessSettingsSection';
import { PublishSection } from '@/components/product/sections/PublishSection';
import { ProductAPI } from '@/services/apiClient';
import { PRODUCT_TYPES, getProductTypeName } from '@/config/productTypes';
import { clog, cerror } from '@/lib/utils';
import FeatureFlagService from '@/services/FeatureFlagService';

export default function ProductPage() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [currentUser, setCurrentUser] = useState(null);
  const [globalSettings, setGlobalSettings] = useState({});
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingLessonPlan, setEditingLessonPlan] = useState(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [step, setStep] = useState('wizard');
  const [isSaving, setIsSaving] = useState(false);
  const [saveAndContinue, setSaveAndContinue] = useState(false);
  const [message, setMessage] = useState(null);
  const [enabledProductTypes, setEnabledProductTypes] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isContentCreator, setIsContentCreator] = useState(false);
  const [isContentCreatorModeActive, setIsContentCreatorModeActive] = useState(false);
  const [contentCreatorPermissions, setContentCreatorPermissions] = useState({});
  const [showFooterPreview, setShowFooterPreview] = useState(false);

  // Product form hooks
  const {
    formData,
    updateFormData,
    hasChanges,
    resetChanges,
    validateForm: validateFormData
  } = useProductForm(editingProduct, currentUser);

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
    getUploadProgress,
    hasUploadedFile,
    setHasUploadedFile
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
    isFileProduct
  } = useProductAccess(editingProduct, formData, uploadedFileInfo, productId, isLoadingData);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, [productId]);

  const loadInitialData = async () => {
    setIsLoadingData(true);
    try {
      // Load user and settings
      const [user, settingsData] = await Promise.all([
        User.me(),
        Settings.find()
      ]);

      setCurrentUser(user);
      const settings = settingsData.length > 0 ? settingsData[0] : {};
      setGlobalSettings(settings);

      // Check access permissions
      const hasAdminAccess = user.role === 'admin' || user.role === 'sysadmin';
      const hasContentCreatorAccess = user.content_creator_agreement_sign_date;

      setIsAdmin(hasAdminAccess);
      setIsContentCreator(hasContentCreatorAccess);

      // Detect access context
      const contextParam = searchParams.get('context');
      const isInContentCreatorMode = contextParam === 'creator' && hasContentCreatorAccess;
      setIsContentCreatorModeActive(isInContentCreatorMode);

      // Load content creator permissions
      if (isInContentCreatorMode) {
        setContentCreatorPermissions({
          workshops: settings.allow_content_creator_workshops !== false,
          courses: settings.allow_content_creator_courses !== false,
          files: settings.allow_content_creator_files !== false,
          tools: settings.allow_content_creator_tools !== false,
          games: settings.allow_content_creator_games !== false,
          lesson_plans: settings.allow_content_creator_lesson_plans !== false
        });
      }

      // Load visible product types based on nav_*_visibility settings
      const productTypesToCheck = ['file', 'course', 'workshop', 'tool', 'game', 'lesson_plan'];
      const visibleTypes = [];

      for (const productType of productTypesToCheck) {
        const visibility = await FeatureFlagService.getFeatureVisibility(
          productType === 'file' ? 'files' :
          productType === 'lesson_plan' ? 'lesson_plans' :
          `${productType}s`
        );

        // Product management is admin-only regardless of public visibility
        // But we respect if something is explicitly hidden
        if (visibility !== 'hidden' && (hasAdminAccess || hasContentCreatorAccess)) {
          visibleTypes.push(productType);
        }
      }

      setEnabledProductTypes(visibleTypes);
      clog('📝 Enabled product types:', visibleTypes);

      // Load product if editing
      if (productId) {
        try {
          const product = await ProductAPI.findById(productId);
          // If this is a lesson plan product, also load the lesson plan data and integrate into formData
          if (product.product_type === 'lesson_plan') {
            clog('🔍 Product is lesson plan type, attempting to load lesson plan data for entity_id:', product.entity_id);
            try {
              clog('🔍 Calling LessonPlan.findById with entity_id:', product.entity_id);
              const lessonPlan = await LessonPlan.findById(product.entity_id);
              clog('🔍 LessonPlan.findById response:', lessonPlan);

              // Store complete lesson plan for reference but integrate file_configs into product
              setEditingLessonPlan(lessonPlan);

              if (lessonPlan) {
                // Integrate lesson plan file_configs into product data like File products do
                product.file_configs = lessonPlan.file_configs;
                product.estimated_duration = lessonPlan.estimated_duration;
                product.total_slides = lessonPlan.total_slides;
                product.teacher_notes = lessonPlan.teacher_notes;
                product.slide_configs = lessonPlan.slide_configs;
                clog('📝 Integrated lesson plan file_configs into product:', {
                  lessonPlan_file_configs: lessonPlan.file_configs,
                  product_file_configs: product.file_configs,
                  fileCount: lessonPlan.file_configs?.files?.length || 0
                });
              } else {
                clog('⚠️ No lesson plan found, file_configs will be null');
              }

              clog('📝 Loaded lesson plan data:', lessonPlan);
              if (!lessonPlan) {
                clog('⚠️ No lesson plan found for entity_id:', product.entity_id);
              }
            } catch (error) {
              cerror('❌ Failed to load lesson plan data:', error);
              // Don't fail the whole loading process, just log the error
              // Some lesson plans may not have been created yet
            }
          } else {
            clog('📝 Product is not lesson plan type:', product.product_type);
          }

          // Set editing product AFTER lesson plan integration
          setEditingProduct(product);
          clog('📝 Loaded product for editing (after integration):', product);
        } catch (error) {
          cerror('Failed to load product:', error);
          showMessage('error', 'שגיאה בטעינת המוצר');
          navigate('/products');
          return;
        }
      }
    } catch (error) {
      cerror('Error loading initial data:', error);
      showMessage('error', 'שגיאה בטעינת הנתונים');
    } finally {
      setIsLoadingData(false);
    }
  };

  // Helper function to check if a product type can be created
  const canCreateProductType = useCallback((productType) => {
    // Tools cannot be created via UI - they are defined as constants in the Tool service class
    if (productType === 'tool') {
      return false;
    }

    // If not in content creator mode (admin access), all other product types are allowed
    if (!isContentCreatorModeActive) {
      return true;
    }

    // In content creator mode, check permissions
    switch (productType) {
      case 'workshop':
        return contentCreatorPermissions.workshops;
      case 'course':
        return contentCreatorPermissions.courses;
      case 'file':
        return contentCreatorPermissions.files;
      case 'game':
        return contentCreatorPermissions.games;
      case 'lesson_plan':
        return contentCreatorPermissions.lesson_plans;
      default:
        return false;
    }
  }, [isContentCreatorModeActive, contentCreatorPermissions]);

  // Message handler
  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  // Navigation handlers
  const handleClose = () => {
    if (hasChanges()) {
      if (confirm('יש לך שינויים שלא נשמרו. האם אתה בטוח שברצונך לצאת?')) {
        navigate('/products');
      }
    } else {
      navigate('/products');
    }
  };

  const handleBackToProducts = () => {
    handleClose();
  };

  // Save handler
  const handleSave = async (data, continueEditing = false) => {
    try {
      let result;

      if (isNewProduct) {
        // Create new product
        // Transform creator_user_id to is_ludora_creator for backend compatibility
        const createData = {
          ...data,
          is_ludora_creator: data.creator_user_id === null
        };
        result = await ProductAPI.create(createData);
        clog('✅ Product created:', result);

        // Update URL to include the new product ID and transition to edit mode
        if (result.id) {
          setEditingProduct(result);
          // Use navigate replace to update URL and trigger React Router to re-parse params
          navigate(`/products/edit/${result.id}`, { replace: true });
        }

        showMessage('success', continueEditing ?
          'המוצר נוצר בהצלחה! ניתן להמשיך לערוך' :
          'המוצר נוצר בהצלחה!'
        );
      } else {
        // Update existing product
        // Transform creator_user_id to is_ludora_creator for backend compatibility
        const updateData = {
          ...data,
          is_ludora_creator: data.creator_user_id === null
        };
        result = await ProductAPI.update(productId, updateData);
        clog('✅ Product updated:', result);
        setEditingProduct(result);

        showMessage('success', continueEditing ?
          'המוצר עודכן בהצלחה! ניתן להמשיך לערוך' :
          'המוצר עודכן בהצלחה!'
        );
      }

      resetChanges();

      if (!continueEditing) {
        setTimeout(() => navigate('/products'), 1500);
      }

      return result;
    } catch (error) {
      cerror('Error saving product:', error);
      throw error;
    }
  };

  // Enhanced file upload handler that integrates with form data
  const handleEnhancedFileUpload = async (event, fileType, moduleIndex = null) => {
    const result = await handleFileUpload(event, fileType, moduleIndex);

    if (result?.success && result.updateData) {
      updateFormData(result.updateData);

      // Also update the editingProduct object so image preview works immediately
      if (editingProduct) {
        setEditingProduct(prev => ({
          ...prev,
          ...result.updateData
        }));
      }
    }

    return result;
  };

  // Enhanced file delete handler that integrates with form data
  const handleEnhancedFileDelete = async (fileType, moduleIndex = null) => {
    const result = await handleDeleteFile(fileType, moduleIndex);

    if (result?.success && result.updateData) {
      updateFormData(result.updateData);

      // Also update the editingProduct object so UI reflects deletion immediately
      if (editingProduct) {
        setEditingProduct(prev => ({
          ...prev,
          ...result.updateData
        }));
      }
    }

    return result;
  };

  // Footer settings save handler
  const handleSaveFooterSettings = async (footerConfig) => {
    try {
      if (editingProduct?.entity_id && formData.product_type === 'file') {
        // Update the file entity with footer settings
        const { File } = await import('@/services/entities');
        await File.update(editingProduct.entity_id, {
          footer_settings: footerConfig
        });

        // Update local state
        updateFormData({ footer_settings: footerConfig });

        // Update editing product
        setEditingProduct(prev => ({
          ...prev,
          footer_settings: footerConfig
        }));

        console.log('✅ Footer settings saved successfully:', footerConfig);
      }
    } catch (error) {
      console.error('❌ Error saving footer settings:', error);
      throw error;
    }
  };

  // Tag management functions
  const addTag = (tag) => {
    const currentTags = formData.tags || [];
    if (!currentTags.includes(tag)) {
      updateFormData({ tags: [...currentTags, tag] });
    }
  };

  const removeTag = (tag) => {
    const currentTags = formData.tags || [];
    updateFormData({ tags: currentTags.filter(t => t !== tag) });
  };

  // Nested form data updater
  const updateNestedFormData = (path, value) => {
    // Handle nested object updates
    const pathArray = path.split('.');
    const newData = { ...formData };
    let current = newData;

    for (let i = 0; i < pathArray.length - 1; i++) {
      if (!current[pathArray[i]]) {
        current[pathArray[i]] = {};
      }
      current = current[pathArray[i]];
    }

    current[pathArray[pathArray.length - 1]] = value;
    updateFormData(newData);
  };

  // Helper function to get marketing content counter for File products
  const getMarketingContentCounter = () => {
    if (formData.product_type !== 'file') {
      return null; // Only show counter for File products
    }

    let count = 0;
    const total = 2; // Image + Marketing Video

    // Check if product has image
    if (editingProduct?.has_image || formData.has_image) {
      count++;
    }

    // Check if product has marketing video
    if (marketingVideoExists) {
      count++;
    }

    return { count, total };
  };

  // Helper function to get marketing section title with counter
  const getMarketingSectionTitle = () => {
    const counter = getMarketingContentCounter();
    if (counter) {
      return `חומרי שיווק (${counter.count}/${counter.total})`;
    }
    return 'חומרי שיווק';
  };

  // Get sections for the wizard with real hook functions
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
        enabledProductTypes: enabledProductTypes,
        canCreateProductType,
        onStepChange: () => {},
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
        handleSaveFooterSettings,
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
      title: getMarketingSectionTitle(),
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
        hasUploadedFile: hasUploadedFile()
      },
      access: getSectionAccess('publishing')
    }
  ];

  // Page title
  const getPageTitle = () => {
    if (isNewProduct) {
      return 'יצירת מוצר חדש';
    }
    const productTypeName = getProductTypeName(formData.product_type, 'singular') || 'מוצר';
    return `עריכת ${productTypeName}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20" dir="rtl">
      <div className="max-w-full mx-auto px-0 py-2 sm:px-1 sm:py-3 lg:px-8 xl:px-16 lg:py-4">
        {/* Page Header */}
        <div className="mb-4 md:mb-6">
          <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-2xl md:rounded-3xl p-4 sm:p-6 md:p-8 border border-blue-100/50 shadow-lg backdrop-blur-sm ring-1 ring-blue-900/5">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 md:gap-6">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 md:p-3 rounded-lg md:rounded-xl shadow-lg">
                  <Package className="w-6 h-6 md:w-8 md:h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                    {getPageTitle()}
                  </h1>
                  <p className="text-gray-600 text-sm sm:text-base md:text-lg mt-1">
                    {isNewProduct ? 'צור מוצר חדש במערכת' : 'ערוך את פרטי המוצר'}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                <Button
                  onClick={handleBackToProducts}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <ArrowRight className="w-4 h-4" />
                  חזרה לרשימת המוצרים
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Product Form Content */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 overflow-hidden">
          <WizardLayout
            editingProduct={editingProduct}
            formData={formData}
            isNewProduct={isNewProduct}
            step={step}
            setStep={setStep}
            sections={sections}
            message={message}
            showMessage={showMessage}
            isSaving={isSaving}
            setIsSaving={setIsSaving}
            saveAndContinue={saveAndContinue}
            setSaveAndContinue={setSaveAndContinue}
            shouldShowSaveAndContinue={shouldShowSaveAndContinue}
            canSave={canSave}
            canPublish={canPublish}
            validateForm={validateForm}
            hasChanges={hasChanges}
            onClose={handleClose}
            onSave={handleSave}
            isLoadingData={isLoadingData}
            hasUploadedFile={hasUploadedFile()}
            isPageMode={true} // New flag to indicate page mode
          />
        </div>
      </div>
    </div>
  );
}
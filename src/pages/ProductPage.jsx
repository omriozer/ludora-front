import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { User, Settings } from '@/services/entities';
import { ArrowRight, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Import product modal components and logic
import { useProductForm } from '@/components/product/hooks/useProductForm';
import { useProductUploads } from '@/components/product/hooks/useProductUploads';
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

export default function ProductPage() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [currentUser, setCurrentUser] = useState(null);
  const [globalSettings, setGlobalSettings] = useState({});
  const [editingProduct, setEditingProduct] = useState(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [step, setStep] = useState('wizard');
  const [isSaving, setIsSaving] = useState(false);
  const [saveAndContinue, setSaveAndContinue] = useState(false);
  const [message, setMessage] = useState(null);

  // Product form hooks
  const {
    formData,
    updateFormData,
    hasChanges,
    resetChanges,
    validateForm: validateFormData
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
    isFileProduct,
    isContentCreatorMode,
    contentCreatorPermissions,
    canCreateProductType
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
      setGlobalSettings(settingsData.length > 0 ? settingsData[0] : {});

      // Load product if editing
      if (productId) {
        try {
          const product = await ProductAPI.findById(productId);
          setEditingProduct(product);
          clog('📝 Loaded product for editing:', product);
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
        result = await ProductAPI.create(data);
        clog('✅ Product created:', result);

        // Update URL to include the new product ID without reload
        if (result.id) {
          window.history.replaceState(
            {},
            '',
            `/products/edit/${result.id}`
          );
          setEditingProduct(result);
        }

        showMessage('success', continueEditing ?
          'המוצר נוצר בהצלחה! ניתן להמשיך לערוך' :
          'המוצר נוצר בהצלחה!'
        );
      } else {
        // Update existing product
        result = await ProductAPI.update(productId, data);
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
        enabledProductTypes: [], // Will be populated by ProductSpecificSection
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
        showFooterPreview: false,
        setShowFooterPreview: () => {},
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
        getFieldError
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
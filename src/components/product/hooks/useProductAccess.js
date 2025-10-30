import { useMemo, useCallback } from 'react';
import { getProductTypeName, getAttributeSchema, validateTypeAttributes } from '@/config/productTypes';

/**
 * Custom hook for managing product access control and validation
 * Determines what sections are accessible and validates form data
 */
export const useProductAccess = (editingProduct, formData, uploadedFileInfo, productId = null, isLoadingData = false) => {
  // Determine if this is a new product
  // If productId exists, we're editing (even if editingProduct is still loading)
  // If no productId, we're creating a new product
  const isNewProduct = !productId;
  const isFileProduct = formData.product_type === 'file';
  const hasUploadedFile = editingProduct && uploadedFileInfo?.exists;

  // Section availability rules
  const sectionAccess = useMemo(() => {
    // For existing products (even while loading), be more permissive
    const isEditingExisting = !isNewProduct;

    return {
      basicInfo: {
        available: true,
        required: true,
        description: 'מידע בסיסי על המוצר - שם, תיאור, מחיר וקטגוריה'
      },
      productContent: {
        // Available if: 1) product_type is selected, or 2) editing existing product (even while loading)
        available: formData.product_type || isEditingExisting,
        required: formData.product_type ? true : false,
        description: `תוכן המוצר - ${getProductTypeName(formData.product_type, 'singular') || 'קבצים וחומרים'}`,
        reason: (!formData.product_type && isNewProduct) ? 'יש לבחור סוג מוצר תחילה' : null
      },
      marketing: {
        // Available for existing products (productId exists)
        available: isEditingExisting,
        required: false,
        description: 'חומרי שיווק - תמונת מוצר וסרטון שיווקי',
        reason: isNewProduct ? 'יש לשמור את המוצר תחילה' : null
      },
      accessSettings: {
        available: true,
        required: false,
        description: 'הגדרות גישה - ימי גישה, גישה לכל החיים ותמחור מתקדם'
      },
      publishing: {
        available: true,
        required: false,
        description: 'פרסום המוצר - סטטוס פרסום ובדיקת דרישות',
        reason: null
      }
    };
  }, [isNewProduct, isFileProduct, hasUploadedFile, formData.product_type]);

  // Get sections that need product save first
  const sectionsRequiringSave = useMemo(() => {
    return Object.entries(sectionAccess)
      .filter(([_, access]) => !access.available && access.reason?.includes('שמור'))
      .map(([key, _]) => key);
  }, [sectionAccess]);

  // Check if section is accessible
  const isSectionAccessible = useCallback((sectionKey) => {
    return sectionAccess[sectionKey]?.available || false;
  }, [sectionAccess]);

  // Get section access info
  const getSectionAccess = useCallback((sectionKey) => {
    return sectionAccess[sectionKey] || {
      available: false,
      required: false,
      description: 'לא זמין',
      reason: 'סעיף לא מוכר'
    };
  }, [sectionAccess]);

  // Check if Save and Continue should be shown
  const shouldShowSaveAndContinue = useMemo(() => {
    return sectionsRequiringSave.length > 0;
  }, [sectionsRequiringSave]);

  // Form validation
  const validateForm = useCallback(() => {
    const errors = {};

    // Basic validation
    if (!formData.title?.trim()) {
      errors.title = 'כותרת המוצר חובה';
    }

    if (!formData.description?.trim()) {
      errors.description = 'תיאור המוצר חובה';
    }

    if (!formData.product_type) {
      errors.product_type = 'סוג המוצר חובה';
    }

    if (!formData.price || isNaN(formData.price) || formData.price < 0) {
      errors.price = 'מחיר חובה ויש להיות מספר חיובי';
    }

    // Validate access days if provided (allow null, undefined, empty string for lifetime access)
    if (formData.access_days !== null && formData.access_days !== undefined && formData.access_days !== "" && (isNaN(formData.access_days) || formData.access_days < 1)) {
      errors.access_days = 'ימי גישה חייבים להיות מספר חיובי';
    }

    // Product type specific validation
    if (formData.product_type) {
      const typeErrors = validateTypeAttributes(formData.product_type, formData);
      Object.assign(errors, typeErrors);
    }

    // Workshop specific validation
    if (formData.product_type === 'workshop') {
      if (!formData.total_duration_minutes || formData.total_duration_minutes < 1) {
        errors.total_duration_minutes = 'משך זמן הסדנה חובה';
      }
    }

    // Course specific validation
    if (formData.product_type === 'course') {
      if (!formData.course_modules || formData.course_modules.length === 0) {
        errors.course_modules = 'יש להגדיר לפחות מודול אחד לקורס';
      } else {
        formData.course_modules.forEach((module, index) => {
          if (!module.title?.trim()) {
            errors[`course_modules.${index}.title`] = `כותרת מודול ${index + 1} חובה`;
          }
          if (!module.description?.trim()) {
            errors[`course_modules.${index}.description`] = `תיאור מודול ${index + 1} חובה`;
          }
        });
      }
    }

    // Tool specific validation
    if (formData.product_type === 'tool') {
      if (!formData.tool_url?.trim()) {
        errors.tool_url = 'כתובת הכלי חובה';
      } else {
        try {
          new URL(formData.tool_url);
        } catch {
          errors.tool_url = 'כתובת הכלי חייבת להיות תקינה';
        }
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }, [formData]);

  // Check if specific field is valid
  const isFieldValid = useCallback((fieldName) => {
    const { errors } = validateForm();
    return !errors[fieldName];
  }, [validateForm]);

  // Get field error message
  const getFieldError = useCallback((fieldName) => {
    const { errors } = validateForm();
    return errors[fieldName] || null;
  }, [validateForm]);

  // Check if form can be saved
  const canSave = useCallback(() => {
    const { isValid } = validateForm();
    return isValid && (isNewProduct || Object.keys(formData).length > 0);
  }, [validateForm, isNewProduct, formData]);

  // Check if product can be published
  const canPublish = useCallback(() => {
    const { isValid } = validateForm();

    // Debug logging to understand why publishing might be disabled
    console.log('🔍 canPublish Debug:', {
      isValid,
      isNewProduct,
      isFileProduct,
      hasUploadedFile,
      editingProduct: !!editingProduct,
      uploadedFileInfo,
      'editingProduct.file_name': editingProduct?.file_name,
      'editingProduct.file_extension': editingProduct?.file_extension,
      'uploadedFileInfo?.exists': uploadedFileInfo?.exists
    });

    if (!isValid) {
      console.log('❌ canPublish: Form validation failed');
      return false;
    }
    if (isNewProduct) {
      console.log('❌ canPublish: Product is new (not saved yet)');
      return false;
    }
    if (isFileProduct && !hasUploadedFile) {
      console.log('❌ canPublish: File product missing uploaded file');
      return false;
    }

    console.log('✅ canPublish: All conditions passed');
    return true;
  }, [validateForm, isNewProduct, isFileProduct, hasUploadedFile, editingProduct, uploadedFileInfo]);

  return {
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
  };
};
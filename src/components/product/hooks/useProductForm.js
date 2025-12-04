import { useState, useCallback, useEffect } from 'react';

/**
 * Custom hook for managing product form data and form-related state
 * Handles form data, validation, and form submission logic
 */
export const useProductForm = (editingProduct = null, currentUser = null) => {
  // Initial form data based on editing vs creating
  const getInitialFormData = useCallback(() => {
    if (editingProduct) {
      return {
        product_type: editingProduct.product_type || '',
        title: editingProduct.title || '',
        short_description: editingProduct.short_description || '',
        description: editingProduct.description || '',
        price: editingProduct.price || '',
        is_published: editingProduct.is_published ?? false,
        category: editingProduct.category || '',
        tags: editingProduct.tags || [],
        access_days: editingProduct.access_days,
        total_duration_minutes: editingProduct.total_duration_minutes || 0,
        target_audience: editingProduct.target_audience || '',
        content_topic_id: editingProduct.content_topic_id || null,
        // Marketing fields
        has_image: editingProduct.has_image ?? false,
        image_url: editingProduct.image_url || '',
        image_filename: editingProduct.image_filename || '',
        marketing_video_type: editingProduct.marketing_video_type || '',
        marketing_video_id: editingProduct.marketing_video_id || '',
        marketing_video_title: editingProduct.marketing_video_title || '',
        marketing_video_duration: editingProduct.marketing_video_duration || '',
        // Product type attributes (for grade/subject fields, etc.)
        type_attributes: editingProduct.type_attributes || {},
        // Entity relationship
        entity_id: editingProduct.entity_id || '',
        // File specific
        file_extension: editingProduct.file_extension || '',
        file_size: editingProduct.file_size || '',
        file_type: editingProduct.file_type || 'pdf',
        target_format: editingProduct.target_format || 'pdf-a4-portrait',
        allow_preview: editingProduct.allow_preview ?? true,
        add_branding: editingProduct.add_branding ?? true,
        branding_template_id: editingProduct.branding_template_id || null,
        branding_settings: editingProduct.branding_settings || null,
        watermark_template_id: editingProduct.watermark_template_id || null,
        watermark_settings: editingProduct.watermark_settings || null,
        accessible_pages: editingProduct.accessible_pages || null,
        creator_user_id: editingProduct.creator_user_id,
        image_is_private: editingProduct.image_is_private ?? false,
        // Lesson plan specific
        file_configs: editingProduct.file_configs || null,
        estimated_duration: editingProduct.estimated_duration || '',
        total_slides: editingProduct.total_slides || '',
        teacher_notes: editingProduct.teacher_notes || '',
        slide_configs: editingProduct.slide_configs || [],
        allow_slide_preview: editingProduct.allow_slide_preview ?? true,
        accessible_slides: editingProduct.accessible_slides || null,
        // Workshop specific
        workshop_video_url: editingProduct.workshop_video_url || '',
        // Course specific
        course_modules: editingProduct.course_modules || [],
        // Tool specific
        tool_url: editingProduct.tool_url || '',
        tool_description: editingProduct.tool_description || '',
        tool_category: editingProduct.tool_category || '',
        // Dynamic attributes based on product type
        ...Object.keys(editingProduct).reduce((acc, key) => {
          if (key.startsWith('attr_')) {
            acc[key] = editingProduct[key];
          }
          return acc;
        }, {})
      };
    }

    return {
      product_type: '',
      title: '',
      short_description: '',
      description: '',
      price: '',
      is_published: false,
      category: '',
      tags: [],
      access_days: null,
      total_duration_minutes: 0,
      target_audience: '',
      content_topic_id: null,
      // Marketing fields
      has_image: false,
      image_url: '',
      image_filename: '',
      marketing_video_type: '',
      marketing_video_id: '',
      marketing_video_title: '',
      marketing_video_duration: '',
      // Product type attributes (for grade/subject fields, etc.)
      type_attributes: {},
      // Entity relationship
      entity_id: '',
      // File specific
      file_extension: '',
      file_size: '',
      file_type: 'pdf',
      target_format: 'pdf-a4-portrait',
      allow_preview: true,
      add_branding: true,
      branding_template_id: null,
      branding_settings: null,
      watermark_template_id: null,
      watermark_settings: null,
      accessible_pages: null,
      creator_user_id: (currentUser?.role === 'admin' || currentUser?.role === 'sysadmin') ? null : currentUser?.id || null, // Default to Ludora for admins, user for others
      image_is_private: false,
      // Lesson plan specific
      file_configs: null,
      estimated_duration: '',
      total_slides: '',
      teacher_notes: '',
      slide_configs: [],
      allow_slide_preview: true,
      accessible_slides: null,
      // Workshop specific
      workshop_video_url: '',
      // Course specific
      course_modules: [],
      // Tool specific
      tool_url: '',
      tool_description: '',
      tool_category: '',
    };
  }, [editingProduct, currentUser]);

  const [formData, setFormData] = useState(getInitialFormData);
  const [initialFormData, setInitialFormData] = useState(getInitialFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [saveAndContinue, setSaveAndContinue] = useState(false);

  // Update form data when editingProduct changes (only for existing products)
  // CRITICAL: We need to react to both ID changes and data loading
  // Use JSON.stringify to detect when the product data has been fully loaded
  // This ensures form gets populated with short_description and other fields
  useEffect(() => {
    // Only run this effect when editing an existing product, not for new product creation
    if (editingProduct?.id) {
      const newInitialData = getInitialFormData();
      setFormData(newInitialData);
      setInitialFormData(newInitialData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingProduct?.id, editingProduct?.short_description, editingProduct?.title]); // ✅ Re-run when key fields are loaded

  // Helper function to update form data with proper nested object merging
  const updateFormData = useCallback((updates) => {
    setFormData(prev => {
      const newData = { ...prev };

      // Handle updates object by object to ensure proper merging
      for (const [key, value] of Object.entries(updates)) {
        if (key === 'type_attributes' && typeof value === 'object' && value !== null && !Array.isArray(value)) {
          // Deep merge type_attributes to preserve existing attributes
          newData[key] = {
            ...prev[key],
            ...value
          };
        } else {
          // For all other fields, normal assignment
          newData[key] = value;
        }
      }

      return newData;
    });
  }, []);

  // Helper function to update nested form data (like arrays)
  const updateNestedFormData = useCallback((path, value) => {
    setFormData(prev => {
      const newData = { ...prev };
      const keys = path.split('.');
      let current = newData;

      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }

      current[keys[keys.length - 1]] = value;
      return newData;
    });
  }, []);

  // Handle tag management
  const addTag = useCallback((tag) => {
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
    }
  }, [formData.tags]);

  const removeTag = useCallback((tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  }, []);

  // Reset form data
  const resetForm = useCallback(() => {
    const newInitialData = getInitialFormData();
    setFormData(newInitialData);
    setInitialFormData(newInitialData);
    setIsSaving(false);
    setSaveAndContinue(false);
  }, [getInitialFormData]);

  // Reset changes (alias for resetForm for backward compatibility)
  const resetChanges = useCallback(() => {
    resetForm();
  }, [resetForm]);

  // Check if form has changes
  const hasChanges = useCallback(() => {
    return JSON.stringify(formData) !== JSON.stringify(initialFormData);
  }, [formData, initialFormData]);

  return {
    formData,
    setFormData,
    updateFormData,
    updateNestedFormData,
    addTag,
    removeTag,
    resetForm,
    resetChanges,
    hasChanges,
    isSaving,
    setIsSaving,
    saveAndContinue,
    setSaveAndContinue
  };
};
import { useState, useCallback, useEffect } from 'react';

/**
 * Custom hook for managing product form data and form-related state
 * Handles form data, validation, and form submission logic
 */
export const useProductForm = (editingProduct = null, currentUser = null) => {
  // Initial form data based on editing vs creating
  const getInitialFormData = useCallback(() => {
    if (editingProduct) {
      console.log('🔍 useProductForm initializing with editingProduct:', {
        id: editingProduct.id,
        product_type: editingProduct.product_type,
        hasFileConfigs: !!editingProduct.file_configs,
        fileConfigs: editingProduct.file_configs
      });
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
        allow_preview: editingProduct.allow_preview ?? true,
        add_copyrights_footer: editingProduct.add_copyrights_footer ?? true,
        creator_user_id: editingProduct.creator_user_id,
        image_is_private: editingProduct.image_is_private ?? false,
        // Lesson plan specific
        file_configs: editingProduct.file_configs || null,
        estimated_duration: editingProduct.estimated_duration || '',
        total_slides: editingProduct.total_slides || '',
        teacher_notes: editingProduct.teacher_notes || '',
        slide_configs: editingProduct.slide_configs || [],
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
      allow_preview: true,
      add_copyrights_footer: true,
      creator_user_id: (currentUser?.role === 'admin' || currentUser?.role === 'sysadmin') ? null : currentUser?.uid || null, // Default to Ludora for admins, user for others
      image_is_private: false,
      // Lesson plan specific
      file_configs: null,
      estimated_duration: '',
      total_slides: '',
      teacher_notes: '',
      slide_configs: [],
      // Workshop specific
      workshop_video_url: '',
      // Course specific
      course_modules: [],
      // Tool specific
      tool_url: '',
      tool_description: '',
      tool_category: ''
    };
  }, [editingProduct, currentUser]);

  const [formData, setFormData] = useState(getInitialFormData);
  const [initialFormData, setInitialFormData] = useState(getInitialFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [saveAndContinue, setSaveAndContinue] = useState(false);

  // Update form data when editingProduct changes
  useEffect(() => {
    const newInitialData = getInitialFormData();
    setFormData(newInitialData);
    setInitialFormData(newInitialData);
  }, [getInitialFormData]);

  // Helper function to update form data
  const updateFormData = useCallback((updates) => {
    // Debug logging for image-related updates
    if (updates.has_image !== undefined || updates.image_url !== undefined || updates.image_filename !== undefined) {
      console.log('🔄 FormData image update:', {
        currentHasImage: formData.has_image,
        currentImageUrl: formData.image_url,
        currentImageFilename: formData.image_filename,
        updates,
        newHasImage: updates.has_image !== undefined ? updates.has_image : formData.has_image
      });
    }
    setFormData(prev => ({ ...prev, ...updates }));
  }, [formData.has_image, formData.image_url, formData.image_filename]);

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
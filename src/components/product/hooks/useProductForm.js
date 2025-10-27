import { useState, useCallback } from 'react';

/**
 * Custom hook for managing product form data and form-related state
 * Handles form data, validation, and form submission logic
 */
export const useProductForm = (editingProduct = null) => {
  // Initial form data based on editing vs creating
  const getInitialFormData = useCallback(() => {
    if (editingProduct) {
      return {
        product_type: editingProduct.product_type || '',
        name: editingProduct.name || '',
        description: editingProduct.description || '',
        price: editingProduct.price || '',
        old_price: editingProduct.old_price || '',
        is_published: editingProduct.is_published || false,
        category_id: editingProduct.category_id || '',
        tags: editingProduct.tags || [],
        access_days: editingProduct.access_days || '',
        total_duration_minutes: editingProduct.total_duration_minutes || 0,
        target_audience: editingProduct.target_audience || '',
        has_image: editingProduct.has_image || false,
        marketing_video_title: editingProduct.marketing_video_title || '',
        marketing_video_url: editingProduct.marketing_video_url || '',
        // File specific
        file_extension: editingProduct.file_extension || '',
        file_size: editingProduct.file_size || '',
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
      name: '',
      description: '',
      price: '',
      old_price: '',
      is_published: false,
      category_id: '',
      tags: [],
      access_days: '',
      total_duration_minutes: 0,
      target_audience: '',
      has_image: false,
      marketing_video_title: '',
      marketing_video_url: '',
      file_extension: '',
      file_size: '',
      workshop_video_url: '',
      course_modules: [],
      tool_url: '',
      tool_description: '',
      tool_category: ''
    };
  }, [editingProduct]);

  const [formData, setFormData] = useState(getInitialFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [saveAndContinue, setSaveAndContinue] = useState(false);

  // Helper function to update form data
  const updateFormData = useCallback((updates) => {
    setFormData(prev => ({ ...prev, ...updates }));
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
    setFormData(getInitialFormData());
    setIsSaving(false);
    setSaveAndContinue(false);
  }, [getInitialFormData]);

  // Check if form has changes
  const hasChanges = useCallback(() => {
    const initial = getInitialFormData();
    return JSON.stringify(formData) !== JSON.stringify(initial);
  }, [formData, getInitialFormData]);

  return {
    formData,
    setFormData,
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
  };
};
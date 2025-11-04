import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Upload,
  FileText,
  Play,
  Package,
  Trash2,
  Loader2,
  AlertCircle,
  Plus,
  X,
  BookOpen,
  Volume2,
  Download,
  CheckCircle,
  Paperclip
} from 'lucide-react';
import { File, Product, apiUploadWithProgress, apiRequest } from '@/services/apiClient';
import { getApiBase } from '@/utils/api';
import { clog, cerror } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import { showConfirm } from '@/utils/messaging';
import EntitySelector from '@/components/ui/EntitySelector';
import SVGSlideManager from '../SVGSlideManager';

/**
 * LessonPlanProductSection - Handles lesson plan specific settings and file uploads
 *
 * Lesson plans consist of:
 * - Presentation files (SVG slides for the main presentation)
 * - Audio files (Background music, sound effects)
 * - Asset files (Supporting materials, handouts, resources)
 *
 * Files are uploaded as File entities with is_asset_only=true and their
 * configurations are stored in the lesson plan's file_configs JSONB field.
 */
const LessonPlanProductSection = ({
  formData,
  updateFormData,
  editingProduct,
  isFieldValid,
  getFieldError
}) => {
  const navigate = useNavigate();
  const [uploadingFiles, setUploadingFiles] = useState({});
  const [lessonPlanFiles, setLessonPlanFiles] = useState({
    presentation: [],
    audio: [],
    assets: []
  });

  // File product selector state
  const [showFileProductSelector, setShowFileProductSelector] = useState(false);
  const [currentSelectionFileRole, setCurrentSelectionFileRole] = useState(null);

  // SVG slides state
  const [svgSlides, setSvgSlides] = useState([]);

  // Initialize file configs from formData
  const initializeFileConfigs = () => {
    if (!formData.file_configs) {
      updateFormData({
        file_configs: { files: [] }
      });
    }
  };

  // Track if we've made local changes to avoid overriding them with useEffect
  const [hasLocalChanges, setHasLocalChanges] = useState(false);

  // Load existing files when editing or when form data changes
  useEffect(() => {
    clog('🔍 LessonPlanProductSection useEffect triggered:', {
      editingProduct: editingProduct?.id,
      hasFormDataFileConfigs: !!formData.file_configs,
      formDataFileConfigsLength: formData.file_configs?.files?.length || 0,
      formDataFileConfigs: formData.file_configs,
      hasLocalChanges
    });

    // If we have local changes, don't reload from props to avoid overriding user actions
    if (hasLocalChanges) {
      clog('⚠️ Skipping useEffect reload - has local changes');
      return;
    }

    // Use formData file_configs (lesson plan data is now integrated into formData)
    if (editingProduct && formData.file_configs) {
      clog('Loading existing files from formData file_configs');
      loadExistingFiles(formData.file_configs);
    } else if (editingProduct) {
      clog('Editing product but no file_configs, initializing...');
      initializeFileConfigs();
    } else {
      clog('No editing product, initializing file configs');
      initializeFileConfigs();
    }
  }, [editingProduct, formData.file_configs, hasLocalChanges]);

  // Load existing files from file_configs
  const loadExistingFiles = async (fileConfigsSource) => {
    if (!fileConfigsSource?.files) {
      clog('No file_configs found in source:', fileConfigsSource);
      return;
    }

    try {
      clog('Loading existing files from file_configs:', fileConfigsSource.files);

      const filesByRole = {
        presentation: [],
        audio: [],
        assets: []
      };

      // Group files by role - handle legacy roles gracefully
      fileConfigsSource.files.forEach(fileConfig => {
        const role = fileConfig.file_role;

        // Handle legacy roles from PPTX system
        if (role === 'opening' || role === 'body') {
          clog(`Legacy file role detected: ${role} for file ${fileConfig.filename} - skipping (use SVG presentation files instead)`);
          return; // Skip legacy files
        }

        if (filesByRole[role]) {
          filesByRole[role].push(fileConfig);
          clog(`Added file ${fileConfig.filename} to role ${role}`);
        } else {
          cerror(`Unknown file role: ${role} for file ${fileConfig.filename}`);
        }
      });

      clog('Grouped files by role:', filesByRole);
      setLessonPlanFiles(filesByRole);
    } catch (error) {
      cerror('Error loading existing files:', error);
    }
  };


  // Get file type from filename
  const getFileTypeFromName = (fileName) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf': return 'pdf';
      case 'ppt':
      case 'pptx': return 'ppt';
      case 'doc':
      case 'docx': return 'docx';
      case 'zip': return 'zip';
      default: return 'other';
    }
  };

  // Validate file types for opening and body (PPT only)
  const validateFileType = (file, fileRole) => {
    const fileName = file.name.toLowerCase();
    const allowedExtensions = {
      opening: ['.ppt', '.pptx'],
      body: ['.ppt', '.pptx'],
      audio: ['.mp3', '.wav', '.m4a'],
      assets: [] // Allow all for assets
    };

    // For assets, allow any file type
    if (fileRole === 'assets') {
      return { valid: true };
    }

    const extensions = allowedExtensions[fileRole] || [];
    const isValidType = extensions.some(ext => fileName.endsWith(ext));

    if (!isValidType) {
      const expectedTypes = extensions.join(', ');
      return {
        valid: false,
        error: `עבור ${getRoleDisplayName(fileRole)} ניתן להעלות רק קבצים מסוג: ${expectedTypes}`
      };
    }

    return { valid: true };
  };

  // Check if a section already has the maximum number of files
  const canAddMoreFiles = (fileRole) => {
    const currentFiles = lessonPlanFiles[fileRole] || [];

    // Opening and body sections can only have ONE file
    if (fileRole === 'opening' || fileRole === 'body') {
      return currentFiles.length === 0;
    }

    // Audio and assets can have multiple files
    return true;
  };

  // Validate File product for linking (PPT only for opening/body)
  const validateFileProductForLinking = (fileProduct, fileRole) => {
    // For opening and body, only allow PPT File products
    if (fileRole === 'opening' || fileRole === 'body') {
      const fileType = fileProduct.file?.file_type || fileProduct.entity?.file_type || 'other';
      if (fileType !== 'ppt') {
        return {
          valid: false,
          error: `עבור ${getRoleDisplayName(fileRole)} ניתן לקשר רק מוצרי קבצים מסוג PowerPoint (.ppt, .pptx)`
        };
      }
    }

    return { valid: true };
  };

  // Handle file upload using atomic endpoint (creates File entities with is_asset_only=true)
  const handleFileUpload = async (files, fileRole) => {
    const fileArray = Array.from(files);
    const uploadKey = fileRole;

    // Check if we have the lesson plan ID from editingProduct
    if (!editingProduct?.entity_id) {
      toast({
        title: "שגיאה בהעלאת קבצים",
        description: "לא ניתן להעלות קבצים ללא מזהה תכנית שיעור. אנא שמור את המוצר תחילה.",
        variant: "destructive"
      });
      return;
    }

    // Check if section can accept more files
    const isSingleFileSection = fileRole === 'opening' || fileRole === 'body';
    const isReplacement = editingProduct?.is_published && isSingleFileSection && lessonPlanFiles[fileRole]?.length > 0;

    if (!canAddMoreFiles(fileRole) && !isReplacement) {
      const sectionName = getRoleDisplayName(fileRole);
      toast({
        title: "מגבלת קבצים",
        description: `בקטגוריית ${sectionName} ניתן להעלות רק קובץ אחד. אנא מחק את הקובץ הקיים תחילה.`,
        variant: "destructive"
      });
      return;
    }

    // For opening/body sections, only allow one file per upload
    if ((fileRole === 'opening' || fileRole === 'body') && fileArray.length > 1) {
      const sectionName = getRoleDisplayName(fileRole);
      toast({
        title: "מגבלת קבצים",
        description: `בקטגוריית ${sectionName} ניתן להעלות רק קובץ אחד בכל פעם.`,
        variant: "destructive"
      });
      return;
    }

    // Validate file types before upload
    for (const file of fileArray) {
      const validation = validateFileType(file, fileRole);
      if (!validation.valid) {
        toast({
          title: "סוג קובץ לא תואם",
          description: validation.error,
          variant: "destructive"
        });
        return;
      }
    }

    try {
      setUploadingFiles(prev => ({ ...prev, [uploadKey]: true }));
      clog(`Starting file upload for role: ${fileRole}, files:`, fileArray.map(f => f.name));

      const uploadedFiles = [];
      let lastUploadResult = null; // Store the last upload result for total_slides

      for (const file of fileArray) {
        clog(`Uploading file: ${file.name} (${file.type}) for role: ${fileRole}`);

        // Use atomic endpoint for file upload
        const formData = new FormData();
        formData.append('file', file);
        formData.append('file_role', fileRole);
        formData.append('description', file.name);

        const endpoint = `/entities/lesson-plan/${editingProduct.entity_id}/upload-file`;

        const result = await apiUploadWithProgress(endpoint, formData);
        lastUploadResult = result; // Store for later use
        clog('Upload API response:', result);

        // Create file config from atomic endpoint response
        const fileConfig = {
          file_id: result.file.id,
          file_role: fileRole,
          filename: result.file.filename,
          file_type: getFileTypeFromName(result.file.filename),
          upload_date: result.file.upload_date,
          description: result.file.filename,
          s3_key: result.file.s3_key,
          size: result.file.size,
          mime_type: file.type,
          is_asset_only: true,
          slide_count: result.file_config?.slide_count || 0 // Include slide count from API
        };

        uploadedFiles.push(fileConfig);
        clog('File config created:', fileConfig);
      }

      // Check if this is a replacement scenario (published product + single file section + existing files)
      const isReplacementScenario = editingProduct?.is_published &&
                                   isSingleFileSection &&
                                   lessonPlanFiles[fileRole]?.length > 0;

      // Update file_configs in formData - handle replacement vs addition
      const currentFileConfigs = formData.file_configs || { files: [] };
      let updatedFiles;

      if (isReplacementScenario) {
        // For replacement: remove existing files for this role and add new ones
        const filesForOtherRoles = currentFileConfigs.files.filter(f => f.file_role !== fileRole);
        updatedFiles = [...filesForOtherRoles, ...uploadedFiles];
        clog(`🔄 FormData replacement for ${fileRole} - removed ${currentFileConfigs.files.length - filesForOtherRoles.length} old files, added ${uploadedFiles.length} new files`);
      } else {
        // For addition: add new files to existing ones
        updatedFiles = [...currentFileConfigs.files, ...uploadedFiles];
        clog(`➕ FormData addition for ${fileRole} - added ${uploadedFiles.length} files to existing ${currentFileConfigs.files.length}`);
      }

      clog('Updating formData with files:', updatedFiles);

      // Prepare formData updates
      const formDataUpdates = {
        file_configs: {
          ...currentFileConfigs,
          files: updatedFiles
        }
      };

      // Update total_slides if provided in the last upload API response
      if (lastUploadResult && lastUploadResult.total_slides !== undefined) {
        formDataUpdates.total_slides = lastUploadResult.total_slides;
        clog('Updating total_slides from API response:', lastUploadResult.total_slides);
      }

      updateFormData(formDataUpdates);

      // Update local state - handle replacement vs addition
      setLessonPlanFiles(prev => {
        let newFiles;

        if (isReplacementScenario) {
          // For replacement: replace existing files with new ones
          newFiles = uploadedFiles;
          clog(`🔄 Replacement scenario detected for ${fileRole} - replacing existing files`);
        } else {
          // For addition: add new files to existing ones
          newFiles = [...prev[fileRole], ...uploadedFiles];
          clog(`➕ Addition scenario for ${fileRole} - adding to existing files`);
        }

        const newState = {
          ...prev,
          [fileRole]: newFiles
        };
        clog('Updated lessonPlanFiles state:', newState);
        return newState;
      });

      // Mark that we have local changes to prevent useEffect override
      setHasLocalChanges(true);

      toast({
        title: "קבצים הועלו בהצלחה",
        description: `${uploadedFiles.length} קבצים הועלו לקטגוריית ${getRoleDisplayName(fileRole)}`,
        variant: "default"
      });

    } catch (error) {
      cerror('Error uploading files:', error);

      // Clear the file input on error so user can try again
      const fileInput = document.getElementById(`upload-${fileRole}`);
      if (fileInput) {
        fileInput.value = '';
      }

      toast({
        title: "שגיאה בהעלאת קבצים",
        description: error.message || "לא ניתן להעלות את הקבצים. אנא נסה שנית.",
        variant: "destructive"
      });
    } finally {
      setUploadingFiles(prev => ({ ...prev, [uploadKey]: false }));
    }
  };

  // Remove file (handles File entities properly)
  const removeFile = async (fileConfig, fileRole) => {
    try {
      // Check if lesson plan product is published - prevent deletion of opening and body files
      if (editingProduct?.is_published && (fileRole === 'opening' || fileRole === 'body')) {
        const fileTypeName = fileRole === 'opening' ? 'פתיחה' : 'גוף השיעור';
        toast({
          title: `לא ניתן למחוק קובץ ${fileTypeName}`,
          description: `לא ניתן למחוק קבצי ${fileTypeName} ממוצר תכנית שיעור מפורסם. ניתן להעלות או לקשר קובץ חדש במקום.`,
          variant: "destructive"
        });
        return;
      }

      // If this is an asset-only file, use the lesson plan specific delete endpoint
      if (fileConfig.is_asset_only) {
        if (!editingProduct?.entity_id) {
          toast({
            title: "שגיאה במחיקת קובץ",
            description: "לא ניתן למחוק קבצים ללא מזהה תכנית שיעור",
            variant: "destructive"
          });
          return;
        }

        // Use the lesson plan specific delete endpoint
        const endpoint = `/entities/lesson-plan/${editingProduct.entity_id}/file/${fileConfig.file_id}`;

        const result = await apiRequest(endpoint, {
          method: 'DELETE'
        });
        clog('Delete API response:', result);
      } else {
        // If it's a File product, call the unlink endpoint (don't delete the product)
        // The File product continues to exist independently
        if (!editingProduct?.entity_id) {
          toast({
            title: "שגיאה בהסרת קישור",
            description: "לא ניתן להסיר קישורים ללא מזהה תכנית שיעור",
            variant: "destructive"
          });
          return;
        }

        // Use the lesson plan specific unlink endpoint
        const endpoint = `/entities/lesson-plan/${editingProduct.entity_id}/unlink-file-product/${fileConfig.file_id}`;

        const result = await apiRequest(endpoint, {
          method: 'DELETE'
        });
        clog('Unlink API response:', result);
      }

      // Update local state FIRST to ensure immediate UI update
      clog('🗑️ Updating local state - removing file:', fileConfig.file_id, 'from role:', fileRole);
      setLessonPlanFiles(prev => {
        const newState = {
          ...prev,
          [fileRole]: prev[fileRole].filter(f => f.file_id !== fileConfig.file_id)
        };
        clog('🗑️ New lessonPlanFiles state after removal:', newState);
        return newState;
      });

      // Mark that we have local changes to prevent useEffect override
      setHasLocalChanges(true);

      // Then update formData (this may trigger useEffect but shouldn't override our state since the data is consistent)
      const currentFileConfigs = formData.file_configs || { files: [] };
      const updatedFiles = currentFileConfigs.files.filter(f => f.file_id !== fileConfig.file_id);

      clog('🗑️ Updating formData - old files count:', currentFileConfigs.files.length, 'new count:', updatedFiles.length);
      updateFormData({
        file_configs: {
          ...currentFileConfigs,
          files: updatedFiles
        }
      });

      const action = fileConfig.is_asset_only ? "נמחק" : "נותק";
      const actionDescription = fileConfig.is_asset_only ? "נמחק מהמערכת" : "נותק מהשיעור";
      toast({
        title: `קובץ ${action} בהצלחה`,
        description: `הקובץ ${fileConfig.filename} ${actionDescription}`,
        variant: "default"
      });

    } catch (error) {
      cerror('Error removing file:', error);
      // Even if deletion fails, remove from UI - update local state FIRST
      clog('🗑️ Error occurred, but removing from UI anyway');
      setLessonPlanFiles(prev => {
        const newState = {
          ...prev,
          [fileRole]: prev[fileRole].filter(f => f.file_id !== fileConfig.file_id)
        };
        clog('🗑️ New lessonPlanFiles state after error removal:', newState);
        return newState;
      });

      // Mark that we have local changes to prevent useEffect override
      setHasLocalChanges(true);

      // Then update formData
      const currentFileConfigs = formData.file_configs || { files: [] };
      const updatedFiles = currentFileConfigs.files.filter(f => f.file_id !== fileConfig.file_id);

      updateFormData({
        file_configs: {
          ...currentFileConfigs,
          files: updatedFiles
        }
      });

      const errorAction = fileConfig.is_asset_only ? "נמחק" : "נותק";
      toast({
        title: `קובץ ${errorAction} מהרשימה`,
        description: `הקובץ ${errorAction} מהרשימה`,
        variant: "default"
      });
    }
  };

  // Link existing File product
  const linkFileProduct = async (fileProduct, fileRole) => {
    try {
      // Check if we have the lesson plan ID from editingProduct
      if (!editingProduct?.entity_id) {
        toast({
          title: "שגיאה בקישור קובץ",
          description: "לא ניתן לקשר קבצים ללא מזהה תכנית שיעור. אנא שמור את המוצר תחילה.",
          variant: "destructive"
        });
        return;
      }

      // Check if section can accept more files
      if (!canAddMoreFiles(fileRole)) {
        const sectionName = getRoleDisplayName(fileRole);
        toast({
          title: "מגבלת קבצים",
          description: `בקטגוריית ${sectionName} ניתן לקשר רק קובץ אחד. אנא מחק את הקובץ הקיים תחילה.`,
          variant: "destructive"
        });
        return;
      }

      // Validate File product for this role
      const productValidation = validateFileProductForLinking(fileProduct, fileRole);
      if (!productValidation.valid) {
        toast({
          title: "מוצר קובץ לא תואם",
          description: productValidation.error,
          variant: "destructive"
        });
        return;
      }

      clog('🔗 Starting File product linking:', {
        fileProduct: fileProduct.id,
        entity_id: fileProduct.entity_id,
        title: fileProduct.title,
        fileRole,
        lessonPlanId: editingProduct.entity_id
      });

      // Call the new backend endpoint to link the File product
      const endpoint = `/entities/lesson-plan/${editingProduct.entity_id}/link-file-product`;

      const result = await apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          product_id: fileProduct.id,
          file_role: fileRole,
          filename: fileProduct.title,
          file_type: fileProduct.file?.file_type || 'other'
        })
      });
      clog('Link API response:', result);

      // Create file config from API response
      const fileConfig = {
        file_id: result.linked_file.file_id,
        file_role: fileRole,
        filename: result.linked_file.filename,
        file_type: fileProduct.file?.file_type || 'other',
        upload_date: new Date().toISOString(),
        description: fileProduct.title,
        is_asset_only: false, // This is a File product, not just an asset
        product_id: fileProduct.id, // Store the Product ID for reference
        slide_count: result.file_config?.slide_count || 0 // Include slide count from API
      };

      // Check if this is a replacement scenario for linking
      const isSingleFileSection = fileRole === 'opening' || fileRole === 'body';
      const isLinkingReplacementScenario = editingProduct?.is_published &&
                                          isSingleFileSection &&
                                          lessonPlanFiles[fileRole]?.length > 0;

      // Update local state FIRST to ensure immediate UI update
      clog('🔗 Updating local state - linking file:', fileConfig.file_id, 'to role:', fileRole);
      setLessonPlanFiles(prev => {
        let newFiles;

        if (isLinkingReplacementScenario) {
          // For replacement: replace existing files with new one
          newFiles = [fileConfig];
          clog(`🔄 Link replacement scenario detected for ${fileRole} - replacing existing files`);
        } else {
          // For addition: add new file to existing ones
          newFiles = [...prev[fileRole], fileConfig];
          clog(`➕ Link addition scenario for ${fileRole} - adding to existing files`);
        }

        const newState = {
          ...prev,
          [fileRole]: newFiles
        };
        clog('🔗 New lessonPlanFiles state after linking:', newState);
        return newState;
      });

      // Mark that we have local changes to prevent useEffect override
      setHasLocalChanges(true);

      // Then update formData - handle replacement vs addition
      const currentFileConfigs = formData.file_configs || { files: [] };
      let updatedFiles;

      if (isLinkingReplacementScenario) {
        // For replacement: remove existing files for this role and add new one
        const filesForOtherRoles = currentFileConfigs.files.filter(f => f.file_role !== fileRole);
        updatedFiles = [...filesForOtherRoles, fileConfig];
        clog(`🔄 FormData link replacement for ${fileRole} - removed ${currentFileConfigs.files.length - filesForOtherRoles.length} old files, added 1 new file`);
      } else {
        // For addition: add new file to existing ones
        updatedFiles = [...currentFileConfigs.files, fileConfig];
        clog(`➕ FormData link addition for ${fileRole} - added 1 file to existing ${currentFileConfigs.files.length}`);
      }

      clog('🔗 Updating formData - old files count:', currentFileConfigs.files.length, 'new count:', updatedFiles.length);

      // Prepare formData updates
      const formDataUpdates = {
        file_configs: {
          ...currentFileConfigs,
          files: updatedFiles
        }
      };

      // Update total_slides if provided in the API response
      if (result.total_slides !== undefined) {
        formDataUpdates.total_slides = result.total_slides;
        clog('🔗 Updating total_slides from link API response:', result.total_slides);
      }

      updateFormData(formDataUpdates);

      toast({
        title: "קובץ מוצר קושר בהצלחה",
        description: `המוצר "${fileProduct.title}" קושר לקטגוריית ${getRoleDisplayName(fileRole)}`,
        variant: "default"
      });

    } catch (error) {
      cerror('Error linking file product:', error);
      toast({
        title: "שגיאה בקישור קובץ",
        description: error.message || "לא ניתן לקשר את הקובץ. אנא נסה שנית.",
        variant: "destructive"
      });
    }
  };

  // Navigate to create new File product
  const createNewFileProduct = async (fileRole) => {
    const confirmed = await showConfirm(
      "יצירת מוצר קובץ חדש",
      `האם ברצונך ליצור מוצר קובץ חדש עבור קטגוריית ${getRoleDisplayName(fileRole)}?\n\nתועבר לעמוד יצירת מוצרים. לאחר יצירת המוצר תוכל לחזור לכאן ולקשר אותו לתכנית השיעור.`,
      { confirmText: "צור מוצר חדש", cancelText: "ביטול" }
    );
    if (confirmed) {
      navigate(`/products/create?type=file&returnTo=${encodeURIComponent(window.location.pathname)}&lessonPlanRole=${fileRole}`);
    }
  };

  // File product entity service for EntitySelector
  const fileProductEntityService = {
    list: async () => {
      try {
        const data = await Product.find({ product_type: 'file', limit: 100 });
        return data.results || data || [];
      } catch (error) {
        cerror('Error fetching file products:', error);
        return [];
      }
    }
  };

  // Handle selecting existing File product
  const selectExistingFileProduct = (fileRole) => {
    setCurrentSelectionFileRole(fileRole);
    setShowFileProductSelector(true);
  };

  // Handle file product selection from EntitySelector
  const handleFileProductSelection = async (productId) => {
    if (!productId || !currentSelectionFileRole) return;

    try {
      // Fetch the selected product details
      const product = await Product.findById(productId);

      // Link this File product to the lesson plan
      await linkFileProduct(product, currentSelectionFileRole);

      setShowFileProductSelector(false);
      setCurrentSelectionFileRole(null);
    } catch (error) {
      cerror('Error selecting file product:', error);
      toast({
        title: "שגיאה בבחירת מוצר",
        description: "לא ניתן לקשר את המוצר הנבחר. אנא נסה שנית.",
        variant: "destructive"
      });
    }
  };

  // Get role display name
  const getRoleDisplayName = (role) => {
    const names = {
      opening: 'פתיחה',
      body: 'גוף השיעור',
      audio: 'אודיו',
      assets: 'נכסים נוספים'
    };
    return names[role] || role;
  };

  // Initialize slide configurations if not exists
  const initializeSlideConfigs = () => {
    if (!formData.slide_configs) {
      updateFormData({
        slide_configs: []
      });
    }
  };

  const addSlideConfig = () => {
    initializeSlideConfigs();
    const newSlideConfig = {
      slide_number: (formData.slide_configs?.length || 0) + 1,
      timer_seconds: 0,
      auto_advance: false,
      notes: '',
      interactive_elements: []
    };

    const updatedSlideConfigs = [...(formData.slide_configs || []), newSlideConfig];
    updateFormData({ slide_configs: updatedSlideConfigs });
  };

  const removeSlideConfig = (index) => {
    const updatedSlideConfigs = formData.slide_configs?.filter((_, i) => i !== index) || [];
    updateFormData({ slide_configs: updatedSlideConfigs });
  };

  const updateSlideConfig = (index, field, value) => {
    const updatedSlideConfigs = [...(formData.slide_configs || [])];
    updatedSlideConfigs[index] = {
      ...updatedSlideConfigs[index],
      [field]: value
    };
    updateFormData({ slide_configs: updatedSlideConfigs });
  };

  // File upload component with three options
  const FileUploadSection = ({ title, fileRole, icon: Icon, files, description, acceptedTypes = "*" }) => {
    const canAddFiles = canAddMoreFiles(fileRole);
    const isSingleFileSection = fileRole === 'opening' || fileRole === 'body';
    const isPdfOnlySection = fileRole === 'opening' || fileRole === 'body';

    // For published products with single-file sections, allow replacement even when "full"
    const showUploadOptions = canAddFiles ||
      (editingProduct?.is_published && isSingleFileSection && files.length > 0);

    return (
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-indigo-600" />
            <h4 className="font-medium">{title}</h4>
            {isSingleFileSection && (
              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                קובץ אחד בלבד
              </span>
            )}
          </div>
          {uploadingFiles[fileRole] && (
            <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
          )}
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-sm text-gray-600">{description}</Label>
            {isSingleFileSection && (
              <p className="text-xs text-yellow-700">
                ⚠️ ניתן להעלות או לקשר קובץ אחד בלבד בקטגוריה זו
              </p>
            )}
            {isPdfOnlySection && (
              <p className="text-xs text-blue-700">
                📄 לקישור מוצרי קבצים: רק קבצי PowerPoint (.ppt, .pptx)
              </p>
            )}
          </div>

          {/* Show limitation message if section is full */}
          {!canAddFiles && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-800">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {editingProduct?.is_published && (fileRole === 'opening' || fileRole === 'body')
                    ? "הקטגוריה מלאה - ניתן להחליף את הקובץ הקיים בקובץ חדש"
                    : "הקטגוריה מלאה - מחק את הקובץ הקיים להוספת קובץ חדש"
                  }
                </span>
              </div>
            </div>
          )}

          {/* Three Options for Adding Files - show if can add files OR if can replace files */}
          {showUploadOptions && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Option 1: Upload New File (Asset Only) */}
          <div className="border border-gray-200 rounded-lg p-3 text-center">
            <Upload className="w-6 h-6 mx-auto text-gray-400 mb-2" />
            <p className="text-xs text-gray-600 mb-2">העלה קובץ חדש</p>
            <p className="text-xs text-gray-500 mb-2">(נכס בלבד)</p>

            <input
              type="file"
              accept={acceptedTypes}
              multiple
              onChange={(e) => {
                if (e.target.files?.length) {
                  handleFileUpload(e.target.files, fileRole);
                }
              }}
              className="hidden"
              id={`upload-${fileRole}`}
              disabled={uploadingFiles[fileRole] || (!canAddFiles && !showUploadOptions)}
            />

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => document.getElementById(`upload-${fileRole}`).click()}
              disabled={uploadingFiles[fileRole] || (!canAddFiles && !showUploadOptions)}
              className="w-full"
            >
              {uploadingFiles[fileRole] ? 'מעלה...' : 'העלה קובץ'}
            </Button>
          </div>

          {/* Option 2: Create New File Product */}
          <div className="border border-gray-200 rounded-lg p-3 text-center">
            <Plus className="w-6 h-6 mx-auto text-indigo-400 mb-2" />
            <p className="text-xs text-gray-600 mb-2">צור מוצר קובץ חדש</p>
            <p className="text-xs text-gray-500 mb-2">(מוצר עצמאי)</p>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => createNewFileProduct(fileRole)}
              className="w-full"
              disabled={!canAddFiles && !showUploadOptions}
            >
              צור מוצר חדש
            </Button>
          </div>

          {/* Option 3: Link Existing File Product */}
          <div className="border border-gray-200 rounded-lg p-3 text-center">
            <Package className="w-6 h-6 mx-auto text-green-400 mb-2" />
            <p className="text-xs text-gray-600 mb-2">קשר מוצר קיים</p>
            <p className="text-xs text-gray-500 mb-2">(מוצר קובץ)</p>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => selectExistingFileProduct(fileRole)}
              className="w-full"
              disabled={!canAddFiles && !showUploadOptions}
            >
              בחר מוצר
            </Button>
          </div>
        </div>
          )}

        {/* Linked Files List */}
        {files.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">קבצים מקושרים:</Label>
            {files.map((fileConfig, index) => (
              <div key={fileConfig.file_id} className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded">
                <div className="flex items-center gap-2">
                  {fileConfig.is_asset_only ? (
                    <FileText className="w-4 h-4 text-blue-600" title="נכס קובץ" />
                  ) : (
                    <Package className="w-4 h-4 text-green-600" title="מוצר קובץ" />
                  )}
                  <span className="text-sm font-medium">{fileConfig.filename}</span>
                  <span className="text-xs text-gray-500">({fileConfig.file_type})</span>
                  {/* Show slide count for PowerPoint files in opening and body sections */}
                  {(fileRole === 'opening' || fileRole === 'body') && fileConfig.slide_count && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      {fileConfig.slide_count} שקפים
                    </span>
                  )}
                  {!fileConfig.is_asset_only && (
                    <span className="text-xs bg-green-100 text-green-800 px-1 rounded">מוצר</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      // Download file - works for both File entities and File products
                      const downloadUrl = `${getApiBase()}/assets/download/file/${fileConfig.file_id}`;
                      window.open(downloadUrl, '_blank');
                    }}
                    title="הורד קובץ"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  {/* Hide delete button for opening and body files in published lesson plan products */}
                  {!(editingProduct?.is_published && (fileRole === 'opening' || fileRole === 'body')) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(fileConfig, fileRole)}
                      title={fileConfig.is_asset_only ? "מחק קובץ" : "הסר קישור"}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* File Upload Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="text-lg font-semibold text-indigo-900">קבצי מערך השיעור</h3>
        </div>

        <Tabs defaultValue="presentation" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="presentation" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span>מצגת</span>
              {svgSlides.length > 0 && (
                <span className="bg-indigo-100 text-indigo-800 text-xs px-1.5 py-0.5 rounded-full">
                  {svgSlides.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="audio" className="flex items-center gap-2">
              <Volume2 className="w-4 h-4" />
              <span>אודיו</span>
              {lessonPlanFiles.audio.length > 0 && (
                <span className="bg-purple-100 text-purple-800 text-xs px-1.5 py-0.5 rounded-full">
                  {lessonPlanFiles.audio.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="assets" className="flex items-center gap-2">
              <Paperclip className="w-4 h-4" />
              <span>נכסים נוספים</span>
              {lessonPlanFiles.assets.length > 0 && (
                <span className="bg-orange-100 text-orange-800 text-xs px-1.5 py-0.5 rounded-full">
                  {lessonPlanFiles.assets.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="presentation">
            <SVGSlideManager
              lessonPlanId={editingProduct?.entity_id}
              slides={svgSlides}
              onSlidesChange={setSvgSlides}
              isReadOnly={false}
            />
          </TabsContent>

          <TabsContent value="audio">
            <FileUploadSection
              title="קבצי אודיו"
              fileRole="audio"
              icon={Volume2}
              files={lessonPlanFiles.audio}
              description="קבצי MP3 לליווי השיעור, מוזיקת רקע ואפקטים קוליים"
              acceptedTypes=".mp3,.wav,.m4a"
            />
          </TabsContent>

          <TabsContent value="assets">
            <FileUploadSection
              title="נכסים נוספים"
              fileRole="assets"
              icon={Paperclip}
              files={lessonPlanFiles.assets}
              description="חומרי עזר, דפי עבודה, משאבים נוספים ותמיכה לשיעור"
              acceptedTypes="*"
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Slide Configurations Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="text-lg font-semibold text-indigo-900">
            הגדרות שקפים
          </h3>
          <Button type="button" variant="outline" onClick={addSlideConfig} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 ml-2" />
            הוסף הגדרת שקף
          </Button>
        </div>

        {(!formData.slide_configs || formData.slide_configs.length === 0) && (
          <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200 text-center">
            <p className="text-indigo-700">עדיין לא הוגדרו הגדרות לשקפים</p>
            <p className="text-sm text-indigo-600 mt-1">לחץ על "הוסף הגדרת שקף" כדי להתחיל</p>
          </div>
        )}

        {formData.slide_configs?.map((slideConfig, index) => (
          <Card key={index} className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
              <h4 className="font-medium">שקף {slideConfig.slide_number}</h4>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeSlideConfig(index)}
                className="self-start sm:self-center"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input
                  placeholder="מספר שקף"
                  type="number"
                  value={slideConfig.slide_number || ''}
                  onChange={(e) => updateSlideConfig(index, 'slide_number', parseInt(e.target.value) || 1)}
                />
                <Input
                  placeholder="זמן בשניות"
                  type="number"
                  value={slideConfig.timer_seconds || ''}
                  onChange={(e) => updateSlideConfig(index, 'timer_seconds', parseInt(e.target.value) || 0)}
                />
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={slideConfig.auto_advance || false}
                    onCheckedChange={(checked) => updateSlideConfig(index, 'auto_advance', checked)}
                  />
                  <Label className="text-sm">מעבר אוטומטי</Label>
                </div>
              </div>
              <Textarea
                placeholder="הערות לשקף"
                value={slideConfig.notes || ''}
                onChange={(e) => updateSlideConfig(index, 'notes', e.target.value)}
                rows={2}
              />
            </div>
          </Card>
        ))}
      </div>

      {/* Slide Count Summary */}
      {svgSlides.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-indigo-900">סיכום שקפים</h3>
          <Card className="p-4">
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <span className="text-sm font-medium text-indigo-900">שקפי SVG</span>
                  </div>
                  <div className="text-2xl font-bold text-indigo-700">
                    {svgSlides.length}
                  </div>
                  <div className="text-xs text-indigo-600">שקפים</div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-900">סטטוס</span>
                  </div>
                  <div className="text-sm font-bold text-green-700">
                    {svgSlides.length >= 1 ? 'מוכן לפרסום' : 'דרוש שקף נוסף'}
                  </div>
                  <div className="text-xs text-green-600">
                    {svgSlides.length >= 1 ? 'עומד בדרישות' : 'לפחות שקף אחד'}
                  </div>
                </div>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-600">
                  📊 כל קובץ SVG הוא שקף אחד במצגת
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* General Lesson Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-indigo-900">הגדרות כלליות</h3>
        <Card className="p-4">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>משך השיעור המוערך (דקות)</Label>
                <Input
                  type="number"
                  placeholder="60"
                  value={formData.estimated_duration || ''}
                  onChange={(e) => updateFormData({ estimated_duration: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label className="flex items-center gap-2">
                  <span>מספר שקפים כולל</span>
                  <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded">
                    מחושב אוטומטית
                  </span>
                </Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={svgSlides.length || '0'}
                  readOnly
                  className="bg-gray-50"
                  title="מספר השקפים מחושב אוטומטית מקבצי SVG במצגת"
                />
                <p className="text-xs text-gray-500 mt-1">
                  מחושב מקבצי SVG במצגת (כל קובץ SVG = שקף אחד)
                </p>
              </div>
            </div>
            <div>
              <Label>הערות למורה</Label>
              <Textarea
                placeholder="הערות והנחיות למורה המעביר את השיעור..."
                value={formData.teacher_notes || ''}
                onChange={(e) => updateFormData({ teacher_notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
        </Card>
      </div>


      {/* File Product Selector Modal */}
      {showFileProductSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" dir="rtl">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">
                  בחר מוצר קובץ עבור {getRoleDisplayName(currentSelectionFileRole)}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowFileProductSelector(false);
                    setCurrentSelectionFileRole(null);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-3">
                <EntitySelector
                  value=""
                  onValueChange={handleFileProductSelection}
                  entityService={fileProductEntityService}
                  placeholder="בחר מוצר קובץ"
                  title=""
                  searchPlaceholder="חפש..."
                  multiple={false}
                  emptyMessage="לא נמצאו מוצרי קבצים"
                  icon={Package}
                  className="compact-modal"
                  renderEntity={(entity, isSelected, onSelect) => (
                    <div
                      key={entity.id}
                      className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer border transition-colors ${
                        isSelected
                          ? 'bg-green-50 border-green-200 hover:bg-green-100'
                          : 'border-transparent hover:bg-gray-50 hover:border-gray-200'
                      }`}
                      onClick={() => onSelect(entity)}
                    >
                      <Package className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="font-medium text-gray-900 truncate">
                          {entity.title}
                        </div>
                        {entity.description && entity.description.length > 0 && (
                          <div className="text-sm text-gray-500 mt-1 overflow-hidden">
                            <div className="line-clamp-2 break-words">
                              {entity.description.length > 80
                                ? `${entity.description.substring(0, 80)}...`
                                : entity.description
                              }
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <div className="text-green-600 flex items-center">
                            <FileText className="w-4 h-4 ml-1" />
                            <span>{entity.file_type || entity.entity?.file_type || 'PDF'}</span>
                          </div>
                          {entity.price !== undefined && (
                            <div className="text-gray-600">
                              ₪{entity.price}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  filterEntities={(entities, searchTerm) => {
                    return entities.filter(entity =>
                      entity.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      entity.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      entity.file_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      entity.entity?.file_type?.toLowerCase().includes(searchTerm.toLowerCase())
                    );
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LessonPlanProductSection;
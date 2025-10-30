import React, { useState, useEffect } from 'react';
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
import { File, Product, apiUploadWithProgress } from '@/services/apiClient';
import { getApiBase } from '@/utils/api';
import { clog, cerror } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import { ProductModalV2 } from '@/components/product/ProductModalV2';
import EntitySelector from '@/components/ui/EntitySelector';

/**
 * LessonPlanProductSection - Handles lesson plan specific settings and file uploads
 *
 * Lesson plans consist of:
 * - Opening files (PPT presentations for lesson introduction)
 * - Body files (Main lesson content PPT presentations)
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
  const [uploadingFiles, setUploadingFiles] = useState({});
  const [lessonPlanFiles, setLessonPlanFiles] = useState({
    opening: [],
    body: [],
    audio: [],
    assets: []
  });

  // Product modal state
  const [showProductModal, setShowProductModal] = useState(false);
  const [currentFileRole, setCurrentFileRole] = useState(null);

  // File product selector state
  const [showFileProductSelector, setShowFileProductSelector] = useState(false);
  const [currentSelectionFileRole, setCurrentSelectionFileRole] = useState(null);

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
        opening: [],
        body: [],
        audio: [],
        assets: []
      };

      // Group files by role
      fileConfigsSource.files.forEach(fileConfig => {
        const role = fileConfig.file_role;
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
    if (!canAddMoreFiles(fileRole)) {
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

      for (const file of fileArray) {
        clog(`Uploading file: ${file.name} (${file.type}) for role: ${fileRole}`);

        // Use atomic endpoint for file upload
        const formData = new FormData();
        formData.append('file', file);
        formData.append('file_role', fileRole);
        formData.append('description', file.name);

        const endpoint = `/entities/lesson-plan/${editingProduct.entity_id}/upload-file`;

        const response = await fetch(`${getApiBase()}${endpoint}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          },
          body: formData
        });

        if (!response.ok) {
          const error = await response.json();
          cerror('Upload API error:', error);
          throw new Error(error.details || error.error || 'Upload failed');
        }

        const result = await response.json();
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
          is_asset_only: true
        };

        uploadedFiles.push(fileConfig);
        clog('File config created:', fileConfig);
      }

      // Update file_configs in formData
      const currentFileConfigs = formData.file_configs || { files: [] };
      const updatedFiles = [...currentFileConfigs.files, ...uploadedFiles];

      clog('Updating formData with files:', updatedFiles);
      updateFormData({
        file_configs: {
          ...currentFileConfigs,
          files: updatedFiles
        }
      });

      // Update local state
      setLessonPlanFiles(prev => {
        const newState = {
          ...prev,
          [fileRole]: [...prev[fileRole], ...uploadedFiles]
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

        const response = await fetch(`${getApiBase()}${endpoint}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          const error = await response.json();
          cerror('Delete API error:', error);
          throw new Error(error.details || error.error || 'Delete failed');
        }

        const result = await response.json();
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

        const response = await fetch(`${getApiBase()}${endpoint}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          const error = await response.json();
          cerror('Unlink API error:', error);
          throw new Error(error.details || error.error || 'Unlink failed');
        }

        const result = await response.json();
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

      const response = await fetch(`${getApiBase()}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          product_id: fileProduct.id,
          file_role: fileRole,
          filename: fileProduct.title,
          file_type: fileProduct.file?.file_type || 'other'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        cerror('Link API error:', error);
        throw new Error(error.details || error.error || 'Linking failed');
      }

      const result = await response.json();
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
        product_id: fileProduct.id // Store the Product ID for reference
      };

      // Update local state FIRST to ensure immediate UI update
      clog('🔗 Updating local state - adding file:', fileConfig.file_id, 'to role:', fileRole);
      setLessonPlanFiles(prev => {
        const newState = {
          ...prev,
          [fileRole]: [...prev[fileRole], fileConfig]
        };
        clog('🔗 New lessonPlanFiles state after linking:', newState);
        return newState;
      });

      // Mark that we have local changes to prevent useEffect override
      setHasLocalChanges(true);

      // Then update formData
      const currentFileConfigs = formData.file_configs || { files: [] };
      const updatedFiles = [...currentFileConfigs.files, fileConfig];

      clog('🔗 Updating formData - old files count:', currentFileConfigs.files.length, 'new count:', updatedFiles.length);
      updateFormData({
        file_configs: {
          ...currentFileConfigs,
          files: updatedFiles
        }
      });

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

  // Open product modal to create new File product
  const createNewFileProduct = (fileRole) => {
    setCurrentFileRole(fileRole);
    setShowProductModal(true);
  };

  // Handle saving new File product from modal
  const handleProductSave = async (productData, continueEditing) => {
    try {
      // The ProductModalV2 will create the product and return the saved data
      // We need to link this new File product to our lesson plan
      if (productData.product_type === 'file' && productData.entity_id && currentFileRole) {
        await linkFileProduct(productData, currentFileRole);
      }

      setShowProductModal(false);
      setCurrentFileRole(null);

      if (!continueEditing) {
        toast({
          title: "מוצר קובץ נוצר ונקשר בהצלחה",
          description: `המוצר "${productData.title}" נוצר ונקשר לקטגוריית ${getRoleDisplayName(currentFileRole)}`,
          variant: "default"
        });
      }
    } catch (error) {
      cerror('Error handling product save:', error);
      toast({
        title: "שגיאה בקישור המוצר",
        description: "המוצר נוצר אך לא ניתן לקשר אותו לתכנית השיעור",
        variant: "destructive"
      });
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
                  הקטגוריה מלאה - מחק את הקובץ הקיים להוספת קובץ חדש
                </span>
              </div>
            </div>
          )}

          {/* Three Options for Adding Files - only show if can add files */}
          {canAddFiles && (
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
              disabled={uploadingFiles[fileRole] || !canAddFiles}
            />

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => document.getElementById(`upload-${fileRole}`).click()}
              disabled={uploadingFiles[fileRole] || !canAddFiles}
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
              disabled={!canAddFiles}
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
              disabled={!canAddFiles}
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
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(fileConfig, fileRole)}
                    title={fileConfig.is_asset_only ? "מחק קובץ" : "הסר קישור"}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
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

        <Tabs defaultValue="opening" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="opening" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span>פתיחה</span>
              {lessonPlanFiles.opening.length > 0 && (
                <span className="bg-blue-100 text-blue-800 text-xs px-1.5 py-0.5 rounded-full">
                  {lessonPlanFiles.opening.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="body" className="flex items-center gap-2">
              <Play className="w-4 h-4" />
              <span>גוף השיעור</span>
              {lessonPlanFiles.body.length > 0 && (
                <span className="bg-green-100 text-green-800 text-xs px-1.5 py-0.5 rounded-full">
                  {lessonPlanFiles.body.length}
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

          <TabsContent value="opening">
            <FileUploadSection
              title="מצגות פתיחה"
              fileRole="opening"
              icon={FileText}
              files={lessonPlanFiles.opening}
              description="העלאה: קבצי PowerPoint (.ppt, .pptx) | קישור מוצרים: קבצי PDF בלבד | קובץ אחד בלבד"
              acceptedTypes=".ppt,.pptx"
            />
          </TabsContent>

          <TabsContent value="body">
            <FileUploadSection
              title="מצגות גוף השיעור"
              fileRole="body"
              icon={Play}
              files={lessonPlanFiles.body}
              description="העלאה: קבצי PowerPoint (.ppt, .pptx) | קישור מוצרים: קבצי PDF בלבד | קובץ אחד בלבד"
              acceptedTypes=".ppt,.pptx"
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
                <Label>מספר שקפים כולל</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={formData.total_slides || ''}
                  onChange={(e) => updateFormData({ total_slides: parseInt(e.target.value) || 0 })}
                />
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

      {/* Product Modal for creating new File products */}
      <ProductModalV2
        isOpen={showProductModal}
        onClose={() => {
          setShowProductModal(false);
          setCurrentFileRole(null);
        }}
        onSave={handleProductSave}
        editingProduct={{
          product_type: 'file', // Pre-select File as the product type
          title: '',
          description: '',
          file_type: 'other',
          is_asset_only: false,
          allow_preview: true,
          add_copyrights_footer: true,
          price: '',
          tags: [],
          category: '',
          access_days: '',
          target_audience: '',
          is_published: false,
          __isNewWithPresets: true // Flag to indicate this is for new product with presets
        }}
        currentUser={null} // The modal will handle getting current user
        isContentCreatorMode={false}
        layout="wizard" // Use wizard layout for File product creation
      />

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
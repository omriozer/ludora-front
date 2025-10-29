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

  // Load existing files when editing
  useEffect(() => {
    if (editingProduct && formData.file_configs) {
      loadExistingFiles();
    } else {
      initializeFileConfigs();
    }
  }, [editingProduct]);

  // Load existing files from file_configs
  const loadExistingFiles = async () => {
    if (!formData.file_configs?.files) return;

    try {
      const filesByRole = {
        opening: [],
        body: [],
        audio: [],
        assets: []
      };

      // Group files by role
      formData.file_configs.files.forEach(fileConfig => {
        const role = fileConfig.file_role;
        if (filesByRole[role]) {
          filesByRole[role].push(fileConfig);
        }
      });

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

    try {
      setUploadingFiles(prev => ({ ...prev, [uploadKey]: true }));

      const uploadedFiles = [];

      for (const file of fileArray) {
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
          throw new Error(error.details || error.error || 'Upload failed');
        }

        const result = await response.json();

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
        clog('Atomic file upload completed:', result);
      }

      // Update file_configs in formData
      const currentFileConfigs = formData.file_configs || { files: [] };
      const updatedFiles = [...currentFileConfigs.files, ...uploadedFiles];

      updateFormData({
        file_configs: {
          ...currentFileConfigs,
          files: updatedFiles
        }
      });

      // Update local state
      setLessonPlanFiles(prev => ({
        ...prev,
        [fileRole]: [...prev[fileRole], ...uploadedFiles]
      }));

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
      // If this is an asset-only file, delete the File entity completely
      if (fileConfig.is_asset_only) {
        await File.delete(fileConfig.file_id);
      } else {
        // If it's a File product, just remove the link (don't delete the product)
        // The File product continues to exist independently
      }

      // Remove from file_configs
      const currentFileConfigs = formData.file_configs || { files: [] };
      const updatedFiles = currentFileConfigs.files.filter(f => f.file_id !== fileConfig.file_id);

      updateFormData({
        file_configs: {
          ...currentFileConfigs,
          files: updatedFiles
        }
      });

      // Update local state
      setLessonPlanFiles(prev => ({
        ...prev,
        [fileRole]: prev[fileRole].filter(f => f.file_id !== fileConfig.file_id)
      }));

      const action = fileConfig.is_asset_only ? "נמחק" : "הוסר";
      toast({
        title: `קובץ ${action} בהצלחה`,
        description: `הקובץ ${fileConfig.filename} ${action} מהמערכת`,
        variant: "default"
      });

    } catch (error) {
      cerror('Error removing file:', error);
      // Even if deletion fails, remove from UI
      const currentFileConfigs = formData.file_configs || { files: [] };
      const updatedFiles = currentFileConfigs.files.filter(f => f.file_id !== fileConfig.file_id);

      updateFormData({
        file_configs: {
          ...currentFileConfigs,
          files: updatedFiles
        }
      });

      setLessonPlanFiles(prev => ({
        ...prev,
        [fileRole]: prev[fileRole].filter(f => f.file_id !== fileConfig.file_id)
      }));

      toast({
        title: "קובץ הוסר מהרשימה",
        description: "הקובץ הוסר מהרשימה",
        variant: "default"
      });
    }
  };

  // Link existing File product
  const linkFileProduct = async (fileProduct, fileRole) => {
    try {
      // Create file config for linking to existing File product
      const fileConfig = {
        file_id: fileProduct.entity_id, // Use the entity_id from the Product
        file_role: fileRole,
        filename: fileProduct.title,
        file_type: fileProduct.file?.file_type || 'other',
        upload_date: new Date().toISOString(),
        description: fileProduct.title,
        is_asset_only: false, // This is a File product, not just an asset
        product_id: fileProduct.id // Store the Product ID for reference
      };

      // Update file_configs in formData
      const currentFileConfigs = formData.file_configs || { files: [] };
      const updatedFiles = [...currentFileConfigs.files, fileConfig];

      updateFormData({
        file_configs: {
          ...currentFileConfigs,
          files: updatedFiles
        }
      });

      // Update local state
      setLessonPlanFiles(prev => ({
        ...prev,
        [fileRole]: [...prev[fileRole], fileConfig]
      }));

      toast({
        title: "קובץ מוצר קושר בהצלחה",
        description: `המוצר "${fileProduct.title}" קושר לקטגוריית ${getRoleDisplayName(fileRole)}`,
        variant: "default"
      });

    } catch (error) {
      cerror('Error linking file product:', error);
      toast({
        title: "שגיאה בקישור קובץ",
        description: "לא ניתן לקשר את הקובץ. אנא נסה שנית.",
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
  const FileUploadSection = ({ title, fileRole, icon: Icon, files, description, acceptedTypes = "*" }) => (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-indigo-600" />
          <h4 className="font-medium">{title}</h4>
        </div>
        {uploadingFiles[fileRole] && (
          <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
        )}
      </div>

      <div className="space-y-4">
        <Label className="text-sm text-gray-600">{description}</Label>

        {/* Three Options for Adding Files */}
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
              disabled={uploadingFiles[fileRole]}
            />

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => document.getElementById(`upload-${fileRole}`).click()}
              disabled={uploadingFiles[fileRole]}
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
            >
              בחר מוצר
            </Button>
          </div>
        </div>

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
              פתיחה
            </TabsTrigger>
            <TabsTrigger value="body" className="flex items-center gap-2">
              <Play className="w-4 h-4" />
              גוף השיעור
            </TabsTrigger>
            <TabsTrigger value="audio" className="flex items-center gap-2">
              <Volume2 className="w-4 h-4" />
              אודיו
            </TabsTrigger>
            <TabsTrigger value="assets" className="flex items-center gap-2">
              <Paperclip className="w-4 h-4" />
              נכסים נוספים
            </TabsTrigger>
          </TabsList>

          <TabsContent value="opening">
            <FileUploadSection
              title="מצגות פתיחה"
              fileRole="opening"
              icon={FileText}
              files={lessonPlanFiles.opening}
              description="קבצי PowerPoint לפתיחת השיעור והקדמה לנושא"
              acceptedTypes=".ppt,.pptx,.pdf"
            />
          </TabsContent>

          <TabsContent value="body">
            <FileUploadSection
              title="מצגות גוף השיעור"
              fileRole="body"
              icon={Play}
              files={lessonPlanFiles.body}
              description="מצגות PowerPoint עיקריות עם תוכן השיעור"
              acceptedTypes=".ppt,.pptx,.pdf"
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
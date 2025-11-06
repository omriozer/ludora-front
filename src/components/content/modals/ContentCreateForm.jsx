import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Save, AlertCircle, Plus, Minus, Upload, File, X, Image, Music, Video, ArrowRight, Info } from 'lucide-react';
import { getContentSchema, getVisibleMetadataFields } from '../schemas/contentMetadataSchemas';
import { GameContent } from '@/services/entities';
import { apiUploadWithProgress } from '@/services/apiClient';
import { clog, cerror } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import LudoraLoadingSpinner from '@/components/ui/LudoraLoadingSpinner';

/**
 * ContentCreateForm - Form for creating new content with metadata
 */
const ContentCreateForm = ({
  semanticType,
  onContentCreated,
  onCancel,
  initialValue = ''
}) => {
  const [formData, setFormData] = useState({
    value: initialValue,
    metadata: {}
  });
  const [errors, setErrors] = useState({});
  const [isCreating, setIsCreating] = useState(false);
  const [duplicateCheck, setDuplicateCheck] = useState(null);

  // File upload state
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  const schema = getContentSchema(semanticType);

  // Determine if this is a file-based semantic type
  const isFileType = ['image', 'audio', 'video', 'complete_card'].includes(semanticType);

  // Initialize form data
  useEffect(() => {
    if (schema) {
      const initialMetadata = {};

      // Set default values from schema, especially for required fields
      Object.entries(schema.metadata || {}).forEach(([fieldName, fieldConfig]) => {
        if (fieldConfig.defaultValue !== undefined) {
          initialMetadata[fieldName] = fieldConfig.defaultValue;
        }
      });

      setFormData({
        value: initialValue,
        metadata: initialMetadata
      });

      // Clear any existing errors when reinitializing
      setErrors({});

      clog('🔧 Form initialized with metadata:', {
        semanticType,
        initialMetadata,
        schemaMetadata: schema.metadata
      });
    }
  }, [semanticType, initialValue, schema]);

  // Get visible metadata fields based on current metadata values
  const visibleMetadataFields = getVisibleMetadataFields(semanticType, formData.metadata);

  // Debug logging
  React.useEffect(() => {
    clog('🔍 Debug ContentCreateForm:', {
      semanticType,
      schema,
      formDataMetadata: formData.metadata,
      visibleMetadataFields,
      allMetadataFields: schema?.metadata
    });
  }, [semanticType, formData.metadata, visibleMetadataFields, schema]);

  // Track errors state changes
  React.useEffect(() => {
    clog('🔍 Errors state changed:', {
      errors,
      errorCount: Object.keys(errors).length,
      buttonDisabled: Object.keys(errors).length > 0,
      isCreating
    });
  }, [errors, isCreating]);

  // Handle value change
  const handleValueChange = (newValue) => {
    setFormData(prev => ({ ...prev, value: newValue }));

    // Clear any existing validation errors when user starts typing
    if (Object.keys(errors).length > 0) {
      setErrors({});
    }

    // Check for duplicates on value change
    checkForDuplicates(newValue);
  };

  // Handle metadata change
  const handleMetadataChange = (fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        [fieldName]: value
      }
    }));

    // Clear any existing validation errors when user interacts with form
    if (Object.keys(errors).length > 0) {
      setErrors({});
    }
  };

  // Check for duplicate content
  const checkForDuplicates = async (value) => {
    if (!value.trim()) {
      setDuplicateCheck(null);
      return;
    }

    try {
      clog('🔍 Checking for duplicates:', {
        semantic_type: semanticType,
        value: value.trim()
      });

      const existing = await GameContent.find({
        semantic_type: semanticType,
        value: value.trim()
      });

      clog('🔍 Duplicate check results:', existing);

      if (existing && existing.length > 0) {
        setDuplicateCheck({
          found: true,
          content: existing[0]
        });
      } else {
        setDuplicateCheck({
          found: false
        });
      }
    } catch (error) {
      cerror('❌ Error checking duplicates:', error);
      // Don't let duplicate check errors affect the form
      setDuplicateCheck(null);
    }
  };

  // Handle file selection
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = getValidFileTypes();
    const fileType = file.type;

    if (!validTypes.some(type => fileType.startsWith(type))) {
      toast({
        title: 'סוג קובץ לא תקין',
        description: `אנא בחר קובץ מסוג: ${validTypes.join(', ')}`,
        variant: 'destructive'
      });
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast({
        title: 'קובץ גדול מדי',
        description: 'גודל הקובץ חייב להיות קטן מ-10MB',
        variant: 'destructive'
      });
      return;
    }

    setSelectedFile(file);

    // Create image preview for image files
    if ((semanticType === 'image' || semanticType === 'complete_card') && file.type.startsWith('image/')) {
      const previewUrl = URL.createObjectURL(file);
      setImagePreviewUrl(previewUrl);
    }

    // Auto-fill the name from filename if value is empty
    if (!formData.value.trim()) {
      const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, '');
      handleValueChange(nameWithoutExtension);
    }
    setErrors(prev => ({ ...prev, file: null }));
  };

  // Get valid file types for semantic type
  const getValidFileTypes = () => {
    switch (semanticType) {
      case 'image': return ['image/'];
      case 'audio': return ['audio/'];
      case 'video': return ['video/'];
      case 'complete_card': return ['image/'];
      default: return [];
    }
  };

  // Create GameContent using atomic upload endpoint
  const createGameContentAtomically = async () => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      clog('🎯 Starting atomic GameContent creation:', {
        semanticType,
        value: formData.value,
        metadata: formData.metadata,
        hasFile: !!selectedFile,
        fileName: selectedFile?.name,
        fileSize: selectedFile?.size,
        fileType: selectedFile?.type
      });

      // Prepare form data for atomic upload
      const atomicFormData = new FormData();
      atomicFormData.append('semantic_type', semanticType);
      atomicFormData.append('metadata', JSON.stringify(formData.metadata));

      // For text-based types, add the value
      if (!isFileType) {
        atomicFormData.append('value', formData.value.trim());
      }

      // For file-based types, add the file
      if (isFileType && selectedFile) {
        atomicFormData.append('file', selectedFile);
      }

      // Use the new atomic GameContent upload endpoint
      const response = await apiUploadWithProgress(
        '/entities/gamecontent/upload',
        atomicFormData,
        (progress) => {
          setUploadProgress(progress);
          clog(`📊 Atomic upload progress: ${progress}%`);
        }
      );

      clog('✅ GameContent created atomically:', response);

      if (!response.gamecontent) {
        throw new Error('No GameContent returned from atomic upload response');
      }

      return response.gamecontent;

    } catch (error) {
      cerror('❌ Atomic GameContent creation failed:', error);
      throw error;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Remove selected file
  const removeSelectedFile = () => {
    // Clean up image preview URL to prevent memory leaks
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }

    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setErrors(prev => ({ ...prev, file: null }));
  };

  // Get file type icon
  const getFileIcon = () => {
    switch (semanticType) {
      case 'image': return Image;
      case 'audio': return Music;
      case 'video': return Video;
      default: return File;
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    clog('🔍 Running validation with data:', {
      value: formData.value,
      metadata: formData.metadata,
      visibleFields: Object.keys(visibleMetadataFields),
      isFileType,
      selectedFile: !!selectedFile
    });

    // Validate main value
    if (!formData.value.trim()) {
      newErrors.value = `${schema.label} הוא שדה חובה`;
    }

    // Validate file for file types
    if (isFileType && !selectedFile) {
      newErrors.file = `יש לבחור קובץ ${schema.label}`;
    }

    // Validate metadata fields
    Object.entries(visibleMetadataFields).forEach(([fieldName, fieldConfig]) => {
      const value = formData.metadata[fieldName];

      clog(`🔍 Validating field ${fieldName}:`, {
        value,
        required: fieldConfig.required,
        type: fieldConfig.type,
        config: fieldConfig
      });

      if (fieldConfig.required && (!value || value === '')) {
        newErrors[fieldName] = `${fieldConfig.label} הוא שדה חובה`;
        clog(`❌ Required field error for ${fieldName}:`, newErrors[fieldName]);
      }

      if (fieldConfig.type === 'number' && value !== null && value !== undefined && value !== '') {
        const numValue = Number(value);
        if (isNaN(numValue)) {
          newErrors[fieldName] = `${fieldConfig.label} חייב להיות מספר`;
        } else {
          if (fieldConfig.min !== undefined && numValue < fieldConfig.min) {
            newErrors[fieldName] = `${fieldConfig.label} חייב להיות לפחות ${fieldConfig.min}`;
          }
          if (fieldConfig.max !== undefined && numValue > fieldConfig.max) {
            newErrors[fieldName] = `${fieldConfig.label} חייב להיות לכל היותר ${fieldConfig.max}`;
          }
        }
      }

      if (fieldConfig.type === 'text' && fieldConfig.maxLength && value && value.length > fieldConfig.maxLength) {
        newErrors[fieldName] = `${fieldConfig.label} חייב להיות עד ${fieldConfig.maxLength} תווים`;
      }
    });

    clog('🔍 Validation results:', {
      newErrors,
      errorCount: Object.keys(newErrors).length,
      hasErrors: Object.keys(newErrors).length > 0
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission with atomic upload
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    // Prevent creating duplicates
    if (duplicateCheck?.found) {
      toast({
        title: 'תוכן כבר קיים',
        description: 'תוכן זהה כבר קיים במערכת. נסה ערך אחר.',
        variant: 'destructive'
      });
      return;
    }

    setIsCreating(true);

    try {
      clog('🎯 Starting atomic GameContent creation:', {
        semantic_type: semanticType,
        value: formData.value,
        metadata: formData.metadata,
        hasFile: isFileType && !!selectedFile
      });

      // Use atomic upload endpoint for both file and text types
      const newContent = await createGameContentAtomically();

      clog('✅ GameContent created atomically:', newContent);

      toast({
        title: 'נוצר בהצלחה',
        description: `${schema.label} נוצר בהצלחה במערכת`,
        variant: 'default'
      });

      onContentCreated(newContent);

    } catch (error) {
      cerror('❌ Error during atomic GameContent creation:', error);

      toast({
        title: 'שגיאה ביצירה',
        description: isFileType && selectedFile
          ? 'לא ניתן להעלות את הקובץ או לשמור את התוכן. נסה שוב.'
          : 'לא ניתן ליצור את התוכן כרגע. נסה שוב.',
        variant: 'destructive'
      });
    } finally {
      setIsCreating(false);
    }
  };


  // Get all license options explanations
  const getAllLicenseExplanations = () => {
    return `• חופשי לשימוש: תמונה זמינה לשימוש חופשי ללא הגבלות זכויות יוצרים
• ברישיון: תמונה שנרכשה או התקבלה ברישיון מספק חיצוני
• בבעלות: תמונה בבעלות מלאה של המוסד - נוצרה או נרכשה ישירות`;
  };

  // Render field based on type
  const renderMetadataField = (fieldName, fieldConfig) => {
    const value = formData.metadata[fieldName] || '';
    const error = errors[fieldName];

    switch (fieldConfig.type) {
      case 'select':
        return (
          <div key={fieldName} className="space-y-3">
            <div className="flex justify-end">
              <Label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                {fieldConfig.label}
                {fieldConfig.required && <span className="text-red-500 ml-2">*</span>}
                {fieldName === 'usage_rights' && (
                  <div className="group relative">
                    <Info className="w-4 h-4 text-blue-500 cursor-help" />
                    <div className="hidden group-hover:block absolute z-50 bg-gray-900 text-white text-xs rounded-lg px-4 py-3 -top-2 left-full ml-2 w-80 shadow-lg">
                      <div className="whitespace-pre-line text-right">
                        {getAllLicenseExplanations()}
                      </div>
                    </div>
                  </div>
                )}
              </Label>
            </div>
            <Select
              value={value}
              onValueChange={(newValue) => handleMetadataChange(fieldName, newValue)}
            >
              <SelectTrigger className={`h-12 text-right ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`} dir="rtl">
                <SelectValue placeholder={`בחר ${fieldConfig.label}`} />
              </SelectTrigger>
              <SelectContent>
                {fieldConfig.options?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {error && (
              <p className="text-sm text-red-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </p>
            )}
          </div>
        );

      case 'boolean':
        return (
          <div key={fieldName} className="flex items-center space-x-3 space-x-reverse p-4 bg-gray-50 rounded-lg">
            <Checkbox
              id={fieldName}
              checked={value || false}
              onCheckedChange={(checked) => handleMetadataChange(fieldName, checked)}
              className="w-5 h-5"
            />
            <Label htmlFor={fieldName} className="text-sm font-semibold text-gray-900 cursor-pointer">
              {fieldConfig.label}
            </Label>
          </div>
        );

      case 'textarea':
        return (
          <div key={fieldName} className="space-y-3">
            <div className="flex justify-end">
              <Label className="text-sm font-semibold text-gray-900">
                {fieldConfig.label}
                {fieldConfig.required && <span className="text-red-500 ml-2">*</span>}
              </Label>
            </div>
            <Textarea
              value={value}
              onChange={(e) => handleMetadataChange(fieldName, e.target.value)}
              placeholder={fieldConfig.placeholder}
              maxLength={fieldConfig.maxLength}
              className={`min-h-[120px] text-base text-right ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
              rows={4}
              dir="rtl"
            />
            {fieldConfig.maxLength && (
              <p className="text-sm text-gray-500">
                {value.length}/{fieldConfig.maxLength} תווים
              </p>
            )}
            {error && (
              <p className="text-sm text-red-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </p>
            )}
          </div>
        );

      case 'array':
        return (
          <ArrayField
            key={fieldName}
            fieldName={fieldName}
            fieldConfig={fieldConfig}
            value={value || []}
            onChange={(newValue) => handleMetadataChange(fieldName, newValue)}
            error={error}
          />
        );

      case 'coordinates':
        return (
          <CoordinatesField
            key={fieldName}
            fieldName={fieldName}
            fieldConfig={fieldConfig}
            value={value || {}}
            onChange={(newValue) => handleMetadataChange(fieldName, newValue)}
            error={error}
          />
        );

      default: // text, number
        return (
          <div key={fieldName} className="space-y-3">
            <div className="flex justify-end">
              <Label className="text-sm font-semibold text-gray-900">
                {fieldConfig.label}
                {fieldConfig.required && <span className="text-red-500 ml-2">*</span>}
              </Label>
            </div>
            <Input
              type={fieldConfig.type === 'number' ? 'number' : 'text'}
              value={value}
              onChange={(e) => handleMetadataChange(fieldName, e.target.value)}
              placeholder={fieldConfig.placeholder}
              min={fieldConfig.min}
              max={fieldConfig.max}
              maxLength={fieldConfig.maxLength}
              className={`h-12 text-base text-right ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
              dir="rtl"
            />
            {error && (
              <p className="text-sm text-red-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </p>
            )}
          </div>
        );
    }
  };

  if (!schema) {
    return <div className="text-red-500">שגיאה: סוג תוכן לא נתמך</div>;
  }

  return (
    <div className="h-full flex flex-col" dir="rtl">
      <form onSubmit={handleSubmit} className="h-full flex flex-col">
        {/* Scrollable Form Content */}
        <ScrollArea className="flex-1 p-6 max-h-[600px]">
          <div className="space-y-6">
            {/* Main Value Field */}
            <div className="space-y-3">
              <div className="flex justify-end">
                <Label className="text-base font-semibold text-gray-900">
                  {isFileType ? `שם ${schema.label}` : schema.label}
                  <span className="text-red-500 ml-2">*</span>
                </Label>
              </div>
              <Input
                value={formData.value}
                onChange={(e) => handleValueChange(e.target.value)}
                placeholder={isFileType ? `הכנס שם עבור ${schema.label}...` : `הכנס ${schema.label}...`}
                className={`h-12 text-base text-right ${errors.value ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
                dir="rtl"
              />
              {errors.value && (
                <p className="text-sm text-red-600 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {errors.value}
                </p>
              )}
            </div>

            {/* File Upload Field for File Types */}
            {isFileType && (
              <div className="space-y-3">
                <div className="flex justify-end">
                  <Label className="text-base font-semibold text-gray-900">
                    קובץ {schema.label}
                    <span className="text-red-500 ml-2">*</span>
                  </Label>
                </div>

                {!selectedFile ? (
                  /* File Upload Area */
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-blue-400 transition-colors bg-gradient-to-br from-gray-50 to-blue-50">
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileSelect}
                      accept={getValidFileTypes().join(',')}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <div className="flex flex-col items-center space-y-6">
                        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                          {React.createElement(getFileIcon(), { className: "w-10 h-10 text-blue-600" })}
                        </div>
                        <div>
                          <p className="text-xl font-semibold text-gray-700 mb-2">לחץ לבחירת קובץ</p>
                          <p className="text-base text-gray-600 mb-3">
                            או גרור ושחרר קובץ {schema.label} כאן
                          </p>
                          <div className="bg-white rounded-lg px-4 py-2 inline-block shadow-sm border border-gray-200">
                            <p className="text-sm text-gray-500">
                              {getValidFileTypes().join(', ')} • מקסימום 10MB
                            </p>
                          </div>
                        </div>
                      </div>
                    </label>
                  </div>
                ) : (
                  /* Selected File Display */
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    {/* Image Preview */}
                    {imagePreviewUrl && (semanticType === 'image' || semanticType === 'complete_card') && (
                      <div className="mb-4">
                        <div className="bg-white rounded-lg p-3 border border-blue-200">
                          <img
                            src={imagePreviewUrl}
                            alt="תצוגה מקדימה"
                            className="w-full max-w-sm mx-auto rounded-lg shadow-sm max-h-64 object-contain"
                          />
                          <p className="text-center text-sm text-gray-600 mt-2">תצוגה מקדימה</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 space-x-reverse">
                        {React.createElement(getFileIcon(), { className: "w-8 h-8 text-blue-600" })}
                        <div>
                          <p className="font-medium text-blue-900">{selectedFile.name}</p>
                          <p className="text-sm text-blue-600">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={removeSelectedFile}
                        className="border-red-300 text-red-600 hover:bg-red-50"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Upload Progress */}
                    {isUploading && (
                      <div className="mt-4">
                        <div className="flex justify-between text-sm text-blue-600 mb-1">
                          <span>מעלה קובץ...</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <div className="w-full bg-blue-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {errors.file && (
                  <p className="text-sm text-red-600 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {errors.file}
                  </p>
                )}
              </div>
            )}

            {/* Duplicate Check Alert */}
            {duplicateCheck?.found && (
              <Alert className="border-amber-200 bg-amber-50 rounded-lg">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <AlertDescription className="text-amber-800 font-medium">
                  תוכן זהה כבר קיים במערכת. נסה ערך אחר או השתמש בתוכן הקיים.
                </AlertDescription>
              </Alert>
            )}

            {/* Metadata Fields */}
            {Object.keys(visibleMetadataFields).length > 0 ? (
              <div className="space-y-6 pt-6 border-t border-gray-200">
                <div className="flex justify-end">
                  <h4 className="text-base font-semibold text-gray-900">מידע נוסף</h4>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {Object.entries(visibleMetadataFields).map(([fieldName, fieldConfig]) =>
                    renderMetadataField(fieldName, fieldConfig)
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-6 pt-6 border-t border-gray-200">
                <h4 className="text-base font-semibold text-gray-900">מידע נוסף</h4>
                <p className="text-sm text-gray-600">
                  טוען שדות מטא-דאטה עבור {schema.label}...
                  <br />
                  <span className="text-xs">
                    Debug: {Object.keys(schema.metadata || {}).length} שדות זמינים
                  </span>
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Static Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <div className="flex justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isCreating}
              size="sm"
              className="h-8 px-4 border-gray-300 hover:bg-gray-100 flex items-center gap-1"
            >
              <ArrowRight className="w-3 h-3" />
              חזרה לחיפוש
            </Button>

            <Button
              type="submit"
              disabled={isCreating}
              size="sm"
              className="h-8 px-4 bg-green-600 hover:bg-green-700 text-white flex items-center gap-1"
              onClick={() => {
                clog('🐛 Create button clicked:', {
                  isCreating,
                  errorsCount: Object.keys(errors).length,
                  errors,
                  formData,
                  duplicateCheck,
                  buttonShouldBeDisabled: isCreating
                });
              }}
            >
              {isCreating ? (
                <LudoraLoadingSpinner size="sm" />
              ) : (
                <Save className="w-3 h-3" />
              )}
              {isCreating ? 'יוצר...' : 'צור תוכן'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

/**
 * ArrayField - Component for handling array fields (like answer_options)
 */
const ArrayField = ({ fieldName, fieldConfig, value, onChange, error }) => {
  const addItem = () => {
    onChange([...value, '']);
  };

  const removeItem = (index) => {
    const newValue = value.filter((_, i) => i !== index);
    onChange(newValue);
  };

  const updateItem = (index, newItemValue) => {
    const newValue = [...value];
    newValue[index] = newItemValue;
    onChange(newValue);
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Label className="text-sm font-semibold text-gray-900">
          {fieldConfig.label}
          {fieldConfig.required && <span className="text-red-500 ml-2">*</span>}
        </Label>
      </div>

      <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
        {value.map((item, index) => (
          <div key={index} className="flex gap-3">
            <Input
              value={item}
              onChange={(e) => updateItem(index, e.target.value)}
              placeholder={`אפשרות ${index + 1}`}
              className="flex-1 h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-right"
              dir="rtl"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => removeItem(index)}
              className="h-11 w-11 p-0 border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
            >
              <Minus className="w-4 h-4" />
            </Button>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addItem}
          className="w-full h-11 flex items-center justify-center gap-2 border-blue-300 text-blue-600 hover:bg-blue-50 hover:border-blue-400"
        >
          <Plus className="w-4 h-4" />
          הוסף אפשרות
        </Button>
      </div>

      {error && (
        <p className="text-sm text-red-600 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </p>
      )}
    </div>
  );
};

/**
 * CoordinatesField - Component for handling coordinates (lat, lng)
 */
const CoordinatesField = ({ fieldName, fieldConfig, value, onChange, error }) => {
  const updateCoordinate = (key, newValue) => {
    onChange({
      ...value,
      [key]: newValue
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Label className="text-sm font-semibold text-gray-900">
          {fieldConfig.label}
          {fieldConfig.required && <span className="text-red-500 ml-2">*</span>}
        </Label>
      </div>

      <div className="grid grid-cols-2 gap-3 bg-gray-50 p-4 rounded-lg">
        <div className="space-y-2">
          <div className="flex justify-end">
            <Label className="text-xs font-medium text-gray-600">קו רוחב</Label>
          </div>
          <Input
            type="number"
            step="any"
            value={value.lat || ''}
            onChange={(e) => updateCoordinate('lat', e.target.value)}
            placeholder="קו רוחב"
            className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-right"
            dir="rtl"
          />
        </div>
        <div className="space-y-2">
          <div className="flex justify-end">
            <Label className="text-xs font-medium text-gray-600">קו אורך</Label>
          </div>
          <Input
            type="number"
            step="any"
            value={value.lng || ''}
            onChange={(e) => updateCoordinate('lng', e.target.value)}
            placeholder="קו אורך"
            className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-right"
            dir="rtl"
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </p>
      )}
    </div>
  );
};

export default ContentCreateForm;
import React, { useState, useEffect, useCallback } from "react";
import { Workshop, Course, File, Tool, Category, User, Settings } from "@/services/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from 'date-fns';
import {
  Plus,
  Save,
  X,
  FileText,
  BookOpen,
  Calendar,
  Upload,
  AlertCircle,
  CheckCircle,
  Loader2,
  Link as LinkIcon,
  Download,
  Trash2,
  Play
} from "lucide-react";
import ProductTypeSelector from './ProductTypeSelector';
import { getProductTypeName } from '@/config/productTypes';
import { getApiBase } from '@/utils/api.js';
import { toast } from '@/components/ui/use-toast';

// Utility function to check if feature is enabled based on settings and content creator permissions
const getEnabledProductTypes = (settings, isContentCreatorMode = false, isAdmin = false) => {
  // IMPORTANT: Admins in admin mode (not content creator mode) get access to ALL product types
  // regardless of any visibility or permission settings
  if (isAdmin && !isContentCreatorMode) {
    return ['workshop', 'course', 'file', 'tool'];
  }

  // For content creators or admin in content creator mode, check content creator permissions
  const enabledTypes = [];

  if (settings?.allow_content_creator_workshops === true) {
    enabledTypes.push('workshop');
  }

  if (settings?.allow_content_creator_courses === true) {
    enabledTypes.push('course');
  }

  if (settings?.allow_content_creator_files === true) {
    enabledTypes.push('file');
  }

  if (settings?.allow_content_creator_tools === true) {
    enabledTypes.push('tool');
  }

  // If no settings found or all are enabled, return all types
  if (enabledTypes.length === 0) {
    return ['workshop', 'course', 'file', 'tool'];
  }

  return enabledTypes;
};

// Helper function to check if any product types are available for creation
const getAvailableProductTypes = (enabledTypes, canCreateProductType) => {
  if (!canCreateProductType) return enabledTypes;

  return enabledTypes.filter(type => canCreateProductType(type));
};

export default function ProductModal({
  isOpen,
  onClose,
  editingProduct = null,
  onSave,
  currentUser,
  canCreateProductType,
  isContentCreatorMode = false
}) {
  const [step, setStep] = useState(editingProduct ? 'form' : 'typeSelection');
  const [categories, setCategories] = useState([]);
  const [globalSettings, setGlobalSettings] = useState({});
  const [enabledProductTypes, setEnabledProductTypes] = useState(['workshop', 'course', 'file']);
  const [message, setMessage] = useState(null);
  const [uploadStates, setUploadStates] = useState({});
  const [uploadProgress, setUploadProgress] = useState({});
  const [selectedModuleVideoTab, setSelectedModuleVideoTab] = useState({});

  const [formData, setFormData] = useState({
    title: "",
    short_description: "",
    description: "",
    category: "",
    product_type: "workshop",
    workshop_type: "recorded",
    scheduled_date: "",
    meeting_link: "",
    meeting_password: "",
    meeting_platform: "",
    video_file_url: "",
    max_participants: 20,
    duration_minutes: 90,
    price: 0,
    is_published: false,
    image_url: "",
    file_url: "",
    preview_file_url: "",
    file_type: "pdf",
    tags: [],
    target_audience: "",
    difficulty_level: "beginner",
    access_days: null,
    is_lifetime_access: null,
    course_modules: [],
    total_duration_minutes: 0,
  });

  // Helper functions for default access settings (same as in Products.jsx)
  const getDefaultAccessDays = (productType, settings) => {
    switch (productType) {
      case 'workshop':
        return settings?.default_recording_access_days || null;
      case 'course':
        return settings?.default_course_access_days || null;
      case 'file':
        return settings?.default_tool_access_days || null;
      default:
        return null;
    }
  };

  const getDefaultLifetimeAccess = (productType, settings) => {
    switch (productType) {
      case 'workshop':
        return settings?.recording_lifetime_access || false;
      case 'course':
        return settings?.course_lifetime_access || false;
      case 'file':
        return settings?.tool_lifetime_access || false;
      default:
        return false;
    }
  };

  // Load initial data
  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (editingProduct) {
        setStep('form');
        loadEditingProduct();
      } else {
        // Check if we need type selection
        const availableTypes = getAvailableProductTypes(enabledProductTypes, canCreateProductType);
        if (availableTypes.length > 1) {
          setStep('typeSelection'); // Show type selector if multiple types available
        } else {
          setStep('form'); // Go directly to form if only one type available
        }
        resetForm();
      }
    } else {
      setStep('form');
      resetForm();
      setMessage(null);
    }
  }, [isOpen, editingProduct]);

  const loadInitialData = async () => {
    try {
      const [categoriesData, settingsData] = await Promise.all([
        Category.find({}, "name"),
        Settings.find()
      ]);
      
      setCategories(categoriesData);
      
      if (settingsData.length > 0) {
        const settings = settingsData[0];
        setGlobalSettings(settings);
        const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'sysadmin';
        setEnabledProductTypes(getEnabledProductTypes(settings, isContentCreatorMode, isAdmin));
        
        if (!editingProduct) {
          setFormData(prev => ({
            ...prev,
            access_days: prev.access_days === null ? getDefaultAccessDays(prev.product_type, settings) : prev.access_days,
            is_lifetime_access: prev.is_lifetime_access === null ? getDefaultLifetimeAccess(prev.product_type, settings) : prev.is_lifetime_access
          }));
        }
      }
    } catch (error) {
      console.error("Error loading initial data:", error);
      setMessage({ type: 'error', text: 'שגיאה בטעינת נתונים ראשוניים' });
    }
  };

  const loadEditingProduct = () => {
    const product = editingProduct;
    setFormData({
      ...product,
      short_description: product.short_description || "",
      tags: product.tags || [],
      course_modules: (product.course_modules || []).map(module => ({
        ...module,
        video_is_private: module.video_is_private ?? false,
        material_is_private: module.material_is_private ?? false,
      })),
      is_lifetime_access: product.is_lifetime_access ?? null,
      access_days: product.is_lifetime_access ? null : (product.access_days ?? null),
      preview_file_url: product.preview_file_url || "",
      workshop_type: product.workshop_type || (product.video_file_url ? "recorded" : "online_live"),
      scheduled_date: product.scheduled_date ? format(new Date(product.scheduled_date), "yyyy-MM-dd'T'HH:mm") : "",
      meeting_link: product.meeting_link || product.zoom_link || "",
      meeting_password: product.meeting_password || product.zoom_password || "",
      meeting_platform: product.meeting_platform || "zoom",
      video_file_url: product.video_file_url || product.recording_url || "",
      max_participants: product.max_participants || 20,
      duration_minutes: product.duration_minutes || 90,
      file_url: product.file_url || "",
      file_type: product.file_type || "pdf",
      image_is_private: product.image_is_private ?? false,
      preview_file_is_private: product.preview_file_is_private ?? false,
      file_is_private: product.file_is_private ?? false,
    });


    // Initialize tab selection for course module videos - all videos are uploaded (private)
    const initialModuleTabs = {};
    (product.course_modules || []).forEach((module, index) => {
      initialModuleTabs[index] = 'upload';
    });
    setSelectedModuleVideoTab(initialModuleTabs);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      short_description: "",
      description: "",
      category: "",
      product_type: "workshop",
      workshop_type: "recorded",
      scheduled_date: "",
      meeting_link: "",
      meeting_password: "",
      meeting_platform: "",
      video_file_url: "",
      max_participants: 20,
      duration_minutes: 90,
      price: 0,
      is_published: false,
      image_url: "",
      file_url: "",
      preview_file_url: "",
      file_type: "pdf",
      tags: [],
      target_audience: "",
      difficulty_level: "beginner",
      access_days: null,
      is_lifetime_access: null,
      course_modules: [],
      total_duration_minutes: 0,
    });
    setSelectedModuleVideoTab({});
  };

  const handleProductTypeSelect = async (productType) => {
    let currentSettings = globalSettings;
    if (Object.keys(currentSettings).length === 0) {
      try {
        const settingsData = await Settings.find();
        currentSettings = settingsData.length > 0 ? settingsData[0] : {};
        setGlobalSettings(currentSettings);
      } catch (error) {
        console.error("Error loading settings for product type change:", error);
      }
    }

    setFormData(prev => ({
      ...prev,
      product_type: productType,
      access_days: getDefaultAccessDays(productType, currentSettings),
      is_lifetime_access: getDefaultLifetimeAccess(productType, currentSettings)
    }));

    setStep('form');
  };

  const handleProductTypeChange = async (newType) => {
    let currentSettings = globalSettings;
    if (Object.keys(currentSettings).length === 0) {
      try {
        const settingsData = await Settings.find();
        currentSettings = settingsData.length > 0 ? settingsData[0] : {};
        setGlobalSettings(currentSettings);
      } catch (error) {
        console.error("Error loading settings for product type change:", error);
      }
    }

    setFormData(prev => ({
      ...prev,
      product_type: newType,
      access_days: getDefaultAccessDays(newType, currentSettings),
      is_lifetime_access: getDefaultLifetimeAccess(newType, currentSettings)
    }));
  };

  // File upload handler (same as in Products.jsx)
  // Function to get video duration from file on client-side
  const getVideoDuration = (file) => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };
      
      video.onerror = () => {
        console.warn('Could not detect video duration');
        resolve(null);
      };
      
      video.src = URL.createObjectURL(file);
    });
  };

  const handleFileUpload = async (event, fileType, moduleIndex = null) => {
    const file = event.target.files[0];
    if (!file) return;

    const uploadKey = moduleIndex !== null ? `module_${moduleIndex}_${fileType}` : fileType;

    // Validate file type
    if (fileType === 'image' && !file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'אנא בחר קובץ תמונה בלבד' });
      return;
    }

    if (fileType === 'video' && !file.type.startsWith('video/')) {
      setMessage({ type: 'error', text: 'אנא בחר קובץ וידיאו בלבד' });
      return;
    }

    if (fileType === 'workshop_video' && !file.type.startsWith('video/')) {
      setMessage({ type: 'error', text: 'אנא בחר קובץ וידיאו בלבד' });
      return;
    }

    if (fileType === 'preview_file' && file.type !== 'application/pdf') {
      setMessage({ type: 'error', text: 'אנא בחר קובץ PDF בלבד' });
      return;
    }

    // For File product type, allow multiple file types
    if (fileType === 'file') {
      const allowedMimeTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/zip',
        'application/x-zip-compressed'
      ];

      if (!allowedMimeTypes.includes(file.type)) {
        setMessage({ type: 'error', text: 'סוג קובץ לא נתמך. אנא בחר PDF, Word, Excel, PowerPoint, תמונה או ZIP' });
        return;
      }
    }

    if (fileType === 'material' && file.type !== 'application/pdf') {
      setMessage({ type: 'error', text: 'אנא בחר קובץ PDF בלבד' });
      return;
    }

    // Allow any file size for videos
    // Only limit non-video files to prevent abuse
    if (fileType !== 'video' && fileType !== 'workshop_video') {
      let maxSize = 50 * 1024 * 1024; // 50MB for non-video files
      if (file.size > maxSize) {
        setMessage({ type: 'error', text: 'גודל הקובץ חייב להיות קטן מ-50MB.' });
        return;
      }
    }

    setUploadStates(prev => ({ ...prev, [uploadKey]: true }));
    setUploadProgress(prev => ({ ...prev, [uploadKey]: 0 }));

    let progressIntervalId = null;

    try {
      const isVideoFile = (fileType === 'video' || fileType === 'workshop_video');
      const isFileUpload = (fileType === 'file');
      let result;

      // Detect video duration on client-side before uploading
      if (fileType === 'workshop_video') {
        const duration = await getVideoDuration(file);
        if (duration) {
          file.detectedDuration = duration; // Store detected duration on file object
          const durationMinutes = Math.round(duration / 60);
          console.log(`Detected workshop video duration: ${durationMinutes} minutes`);
        }
      }

      if (isVideoFile || isFileUpload) {
        // Use XMLHttpRequest for real progress tracking
        result = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          const formData = new FormData();
          formData.append('file', file);

          // For File product type uploads, we need to include the File entity ID
          if (isFileUpload) {
            if (!editingProduct) {
              toast({
                title: "שגיאה בהעלאת קובץ",
                description: "יש לשמור את המוצר תחילה על מנת להעלות קבצים. לחץ על 'צור מוצר' ולאחר מכן תוכל להעלות את הקובץ.",
                variant: "destructive"
              });
              return;
            }
            formData.append('fileEntityId', editingProduct.id);
          }

          // Track upload progress
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percentComplete = Math.round((event.loaded / event.total) * 100);
              setUploadProgress(prev => ({ ...prev, [uploadKey]: percentComplete }));
            }
          };

          xhr.onload = () => {
            if (xhr.status === 200) {
              try {
                const response = JSON.parse(xhr.responseText);
                resolve(response);
              } catch (e) {
                reject(new Error('Invalid response format'));
              }
            } else {
              reject(new Error(`Upload failed with status: ${xhr.status}`));
            }
          };

          xhr.onerror = () => reject(new Error('Network error during upload'));
          xhr.ontimeout = () => reject(new Error('Upload timeout'));

          // Set a longer timeout for large files (30 minutes)
          xhr.timeout = 30 * 60 * 1000;

          // Choose endpoint based on file type
          const endpoint = isFileUpload ? `${getApiBase()}/media/file/upload` : `${getApiBase()}/videos/upload`;
          xhr.open('POST', endpoint, true);
          
          // Add authentication header
          const authToken = localStorage.getItem('authToken');
          if (authToken) {
            xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
          }
          
          xhr.send(formData);
        });
      } else {
        const { UploadFile } = await import('@/services/integrations');
        result = await UploadFile({ file });
      }

      if (result) {
        // Handle different response formats: API returns data in result.data, integrations return directly
        const responseData = result.data || result;
        const fileReference = responseData.downloadUrl || responseData.s3Url || responseData.file_uri || responseData.file_url || responseData.streamUrl;

        if (fileReference) {
          if (moduleIndex !== null) {
            setFormData(prev => ({
              ...prev,
              course_modules: prev.course_modules.map((module, index) =>
                index === moduleIndex
                  ? {
                      ...module,
                      [fileType === 'video' ? 'video_url' : 'material_url']: fileReference
                    }
                  : module
              )
            }));
          } else {
            const fieldName = fileType === 'image' ? 'image_url' :
              fileType === 'video' ? 'video_url' :
              fileType === 'workshop_video' ? 'video_file_url' :
              fileType === 'preview_file' ? 'preview_file_url' : 'file_url';

            // For video files, we don't need to track private flag since all videos are private by design
            const updateData = { [fieldName]: fileReference };
            
            // Auto-set duration for workshop videos if detected on client-side
            if (fileType === 'workshop_video' && file.detectedDuration) {
              const durationMinutes = Math.round(file.detectedDuration / 60);
              updateData.duration_minutes = durationMinutes;
              console.log(`Auto-set workshop duration to ${durationMinutes} minutes from client-side detection`);
            }
            
            // Only set private flag for non-video files
            if (fileType !== 'video' && fileType !== 'workshop_video') {
              const isPrivateFile = !!(responseData.file_uri || responseData.s3Url);
              const isPrivateFieldName = fileType === 'image' ? 'image_is_private' :
                fileType === 'preview_file' ? 'preview_file_is_private' : 'file_is_private';
              updateData[isPrivateFieldName] = isPrivateFile;
            }

            setFormData(prev => ({
              ...prev,
              ...updateData
            }));
          }

          setMessage({ type: 'success', text: 'קובץ הועלה בהצלחה!' });
        } else {
          throw new Error('לא התקבל קישור לקובץ מהשרת');
        }
      } else {
        throw new Error('לא התקבלה תגובה מהשרת');
      }

    } catch (error) {
      console.error('Error uploading file:', error);
      setUploadProgress(prev => ({ ...prev, [uploadKey]: 0 }));
    } finally {
      if (progressIntervalId) {
        clearInterval(progressIntervalId);
      }
      setUploadStates(prev => ({ ...prev, [uploadKey]: false }));

      setTimeout(() => {
        setUploadProgress(prev => ({ ...prev, [uploadKey]: 0 }));
      }, 3000);
    }

    setTimeout(() => setMessage(null), 5000);
  };

  const handleDeleteFile = (fileType, moduleIndex = null) => {
    if (moduleIndex !== null) {
      setFormData(prev => ({
        ...prev,
        course_modules: prev.course_modules.map((module, index) =>
          index === moduleIndex
            ? { ...module,
                [fileType === 'video' ? 'video_url' : 'material_url']: '',
                [fileType === 'video' ? 'video_is_private' : 'material_is_private']: false
              }
            : module
        )
      }));
    } else {
      const fieldName = fileType === 'image' ? 'image_url' :
        fileType === 'video' ? 'video_url' :
        fileType === 'workshop_video' ? 'video_file_url' :
        fileType === 'preview_file' ? 'preview_file_url' : 'file_url';

      // Prepare update data
      const updateData = { [fieldName]: '' };
      
      // Only reset private flag for non-video files
      if (fileType !== 'video' && fileType !== 'workshop_video') {
        const isPrivateFieldName = fileType === 'image' ? 'image_is_private' :
          fileType === 'preview_file' ? 'preview_file_is_private' : 'file_is_private';
        updateData[isPrivateFieldName] = false;
      }

      setFormData(prev => ({
        ...prev,
        ...updateData
      }));
    }
  };

  const addModule = () => {
    setFormData(prev => ({
      ...prev,
      course_modules: [...prev.course_modules, {
        title: "",
        description: "",
        video_url: "",
        video_is_private: false,
        materials: [],
        material_url: "",
        material_is_private: false,
        duration_minutes: 0,
        order: prev.course_modules.length + 1
      }]
    }));
  };

  const updateModule = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      course_modules: prev.course_modules.map((module, i) => {
        if (i === index) {
          let updatedModule = { ...module, [field]: value };
          if (field === 'video_url') {
            updatedModule.video_is_private = !!value ? false : (module.video_is_private ?? false);
          }
          return updatedModule;
        }
        return module;
      })
    }));
  };

  const removeModule = (index) => {
    setFormData(prev => ({
      ...prev,
      course_modules: prev.course_modules.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.description.trim()) {
      setMessage({ type: 'error', text: 'כותרת ותיאור ארוך הם שדות חובה' });
      return;
    }

    // Validate workshop-specific requirements
    if (formData.product_type === 'workshop') {
      if (formData.workshop_type === 'online_live') {
        if (!formData.scheduled_date || !formData.meeting_link) {
          setMessage({ type: 'error', text: `עבור ${getProductTypeName('workshop', 'singular')} אונליין חיה נדרשים תאריך ושעה וקישור למפגש` });
          return;
        }
      } else if (formData.workshop_type === 'recorded') {
        if (!formData.video_file_url) {
          setMessage({ type: 'error', text: `עבור ${getProductTypeName('workshop', 'singular')} מוקלטת נדרש קובץ וידיאו` });
          return;
        }
      }
    }

    try {
      // Clean the data - remove built-in fields that shouldn't be sent to the API
      const baseData = {
        title: formData.title,
        short_description: formData.short_description,
        description: formData.description,
        category: formData.category,
        scheduled_date: (formData.scheduled_date && formData.scheduled_date.trim()) ? formData.scheduled_date : null,
        meeting_link: formData.meeting_link || null,
        meeting_password: formData.meeting_password || null,
        meeting_platform: (formData.meeting_platform && formData.meeting_platform.trim()) ? formData.meeting_platform : null,
        video_file_url: formData.video_file_url || null,
        max_participants: formData.max_participants || null,
        duration_minutes: formData.duration_minutes || null,
        price: formData.price,
        is_published: formData.is_published,
        image_url: formData.image_url || null,
        file_url: formData.file_url || null,
        preview_file_url: formData.preview_file_url || null,
        file_type: formData.file_type || null,
        tags: formData.tags?.filter(tag => tag.trim()) || [],
        target_audience: (formData.target_audience && formData.target_audience.trim()) ? formData.target_audience : null,
        difficulty_level: (formData.difficulty_level && formData.difficulty_level.trim()) ? formData.difficulty_level : null,
        access_days: formData.is_lifetime_access ? 0 : (formData.access_days === null ? null : formData.access_days),
        is_lifetime_access: formData.is_lifetime_access,
        course_modules: formData.product_type === 'course' ? formData.course_modules : undefined,
        total_duration_minutes: formData.total_duration_minutes
      };

      // Add is_private flags if they exist and are relevant
      if (formData.image_is_private !== undefined) baseData.image_is_private = formData.image_is_private;
      if (formData.preview_file_is_private !== undefined) baseData.preview_file_is_private = formData.preview_file_is_private;
      if (formData.file_is_private !== undefined) baseData.file_is_private = formData.file_is_private;

      if (baseData.course_modules) {
        baseData.course_modules = baseData.course_modules.map(module => ({
          ...module,
          video_is_private: module.video_is_private ?? false,
          material_is_private: module.material_is_private ?? false,
        }));
      }

      // Choose the appropriate entity service and prepare entity-specific data
      let entityService;
      let entityName;
      let cleanedData;
      
      switch (formData.product_type) {
        case 'workshop':
          entityService = Workshop;
          entityName = getProductTypeName('workshop', 'singular');
          // Remove product_type and exclude fields not relevant to workshops
          cleanedData = {
            title: baseData.title,
            short_description: baseData.short_description,
            description: baseData.description,
            category: baseData.category,
            scheduled_date: baseData.scheduled_date,
            meeting_link: baseData.meeting_link,
            meeting_password: baseData.meeting_password,
            meeting_platform: baseData.meeting_platform,
            video_file_url: baseData.video_file_url,
            max_participants: baseData.max_participants,
            duration_minutes: baseData.duration_minutes,
            price: baseData.price,
            is_published: baseData.is_published,
            image_url: baseData.image_url,
            image_is_private: baseData.image_is_private,
            tags: baseData.tags,
            target_audience: baseData.target_audience,
            difficulty_level: baseData.difficulty_level,
            access_days: baseData.access_days,
            is_lifetime_access: baseData.is_lifetime_access,
            workshop_type: formData.workshop_type
          };
          break;
        case 'course':
          entityService = Course;
          entityName = getProductTypeName('course', 'singular');
          cleanedData = { ...baseData };
          break;
        case 'file':
          entityService = File;
          entityName = getProductTypeName('file', 'singular');
          cleanedData = { ...baseData };
          break;
        case 'tool':
          entityService = Tool;
          entityName = getProductTypeName('tool', 'singular');
          cleanedData = { ...baseData };
          break;
        default:
          // For backward compatibility, use Product service for other types
          entityService = Product;
          entityName = 'מוצר';
          cleanedData = {
            ...baseData,
            product_type: formData.product_type
          };
          break;
      }

      let createdEntity = null;

      if (editingProduct) {
        await entityService.update(editingProduct.id, cleanedData);
        setMessage({ type: 'success', text: `${entityName} עודכן בהצלחה` });
        createdEntity = { id: editingProduct.id, ...cleanedData };
      } else {
        createdEntity = await entityService.create(cleanedData);
        setMessage({ type: 'success', text: `${entityName} נוצר בהצלחה` });

        // For new File products without file_url, show message but close modal
        // User will need to edit the product to upload file
        if (formData.product_type === 'file' && !cleanedData.file_url) {
          toast({
            title: "מוצר נוצר בהצלחה",
            description: "לחץ על 'עריכה' במוצר החדש כדי להעלות את הקובץ",
            variant: "default"
          });
        }
      }

      // For all other cases, close modal after delay
      setTimeout(() => {
        if (onSave) onSave();
        onClose();
      }, 1500);

    } catch (error) {
      console.error('Error saving product:', error);
      console.error('Error details:', error.message);
      
      // If it's a validation error, show more helpful message
      if (error.message === 'Validation failed') {
        console.error('Check the API Error logs above for specific validation details');
        setMessage({ type: 'error', text: 'שגיאת ולידציה - בדוק את הקונסול לפרטים' });
      } else {
        setMessage({ type: 'error', text: 'שגיאה בשמירת המוצר' });
      }
    }

    setTimeout(() => setMessage(null), 5000);
  };

  const handleCancel = () => {
    resetForm();
    setStep('typeSelection');
    onClose();
  };

  const handleBackToTypeSelection = () => {
    setStep('typeSelection');
    resetForm();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-start justify-center overflow-y-auto p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">
              {editingProduct ? 'עריכת מוצר' : 'מוצר חדש'}
            </h2>
            {step === 'form' && (
              <Badge variant="secondary" className="text-sm">
                {getProductTypeName(formData.product_type, 'singular')}
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={handleCancel}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {/* Message Alert */}
          {message && (
            <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className="mb-4">
              {message.type === 'error' ? <AlertCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          {/* No Available Product Types Alert */}
          {!editingProduct && getAvailableProductTypes(enabledProductTypes, canCreateProductType).length === 0 && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {isContentCreatorMode
                  ? 'כרגע אין לך הרשאה ליצור מוצרים חדשים. נא פנה למנהל המערכת להפעלת הרשאות יוצרי תוכן.'
                  : 'לא נמצאו סוגי מוצרים זמינים ליצירה.'
                }
              </AlertDescription>
            </Alert>
          )}

          {/* Type Selection Step */}
          {step === 'typeSelection' && !editingProduct && (
            <ProductTypeSelector
              onSelect={handleProductTypeSelect}
              enabledTypes={getAvailableProductTypes(enabledProductTypes, canCreateProductType)}
            />
          )}

          {/* Form Step */}
          {step === 'form' && (editingProduct || getAvailableProductTypes(enabledProductTypes, canCreateProductType).length > 0) && (
            <div className="space-y-6">

              {/* Common Fields Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    פרטים כלליים
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">כותרת *</Label>
                      <Input
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="כותרת המוצר"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">סוג מוצר</Label>
                      <div className="mt-1 p-2 bg-gray-100 rounded border">
                        <Badge>
                          {getProductTypeName(formData.product_type, 'singular')}
                        </Badge>
                        <span className="text-sm text-gray-500 mr-2">
                          {editingProduct ? 'לא ניתן לשנות סוג מוצר בעריכה' : 'נבחר מראש'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">תיאור קצר</Label>
                    <Textarea
                      value={formData.short_description}
                      onChange={(e) => setFormData(prev => ({ ...prev, short_description: e.target.value }))}
                      placeholder="תיאור קצר שיופיע בקטלוג המוצרים"
                      rows={2}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium">תיאור ארוך *</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="תיאור מפורט של המוצר שיופיע בדף המוצר"
                      rows={4}
                      className="mt-1"
                    />
                  </div>


                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm font-medium">קטגוריה</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="בחר קטגוריה" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.name}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">מחיר (₪)</Label>
                      <Input
                        type="number"
                        value={formData.price}
                        onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">רמת קושי</Label>
                      <Select
                        value={formData.difficulty_level}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, difficulty_level: value }))}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="beginner">מתחיל</SelectItem>
                          <SelectItem value="intermediate">בינוני</SelectItem>
                          <SelectItem value="advanced">מתקדם</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Image Upload */}
                  <div className="space-y-4">
                    <Label className="text-sm font-medium">תמונה למוצר</Label>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e, 'image')}
                          disabled={uploadStates.image}
                          className="w-full sm:w-auto"
                        />
                        {uploadStates.image && (
                          <Loader2 className="w-4 h-4 animate-spin text-blue-600 flex-shrink-0" />
                        )}
                      </div>
                      {formData.image_url && (
                        <div className="flex items-center gap-2">
                          <img src={formData.image_url} alt="תצוגה מקדימה" className="w-16 h-16 object-cover rounded flex-shrink-0" />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteFile('image')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">קהל יעד</Label>
                      <Input
                        value={formData.target_audience}
                        onChange={(e) => setFormData(prev => ({ ...prev, target_audience: e.target.value }))}
                        placeholder="מורים, רכזי חינוך..."
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">משך כולל בדקות (ל{getProductTypeName('course', 'singular')}/{getProductTypeName('workshop', 'singular')})</Label>
                      <Input
                        type="number"
                        value={formData.total_duration_minutes}
                        onChange={(e) => setFormData(prev => ({ ...prev, total_duration_minutes: parseInt(e.target.value) || 0 }))}
                        placeholder="60"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  {/* Access Settings Section */}
                  <div className="space-y-4">
                    <h3 className="text-base font-semibold">הגדרות גישה</h3>
                    <div className="p-4 border rounded-lg bg-gray-50">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                        <Label className="font-medium">גישה לכל החיים</Label>
                        <Switch
                          checked={formData.is_lifetime_access !== null ? formData.is_lifetime_access : false}
                          onCheckedChange={(checked) => {
                            setFormData(prev => ({
                              ...prev,
                              is_lifetime_access: checked,
                              access_days: checked ? null : (prev.access_days || null)
                            }));
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">ימי גישה (השאר ריק לברירת מחדל)</Label>
                        <Input
                          type="number"
                          value={formData.access_days === null ? "" : formData.access_days}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            access_days: e.target.value === "" ? null : parseInt(e.target.value) || 0
                          }))}
                          disabled={formData.is_lifetime_access}
                          placeholder="השאר ריק לברירת מחדל"
                        />
                        <p className="text-xs text-gray-500">
                          אם לא מוגדר, יתפוס ברירת מחדל מההגדרות הכלליות
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border border-blue-200 bg-blue-50 rounded-lg gap-3">
                    <div>
                      <Label className="font-bold text-blue-800">מוצר פורסם</Label>
                      <p className="text-xs text-blue-600">המוצר יופיע ללקוחות</p>
                    </div>
                    <Switch
                      checked={formData.is_published}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_published: checked }))}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Product Type Specific Sections */}
              
              {/* File-specific fields */}
              {formData.product_type === 'file' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-purple-900 flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      הגדרות {getProductTypeName('file', 'singular')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">העלאת {getProductTypeName('file', 'singular')}</Label>

                      <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Input
                              type="file"
                              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.zip"
                              onChange={(e) => handleFileUpload(e, 'file')}
                              disabled={uploadStates.file || !editingProduct}
                              className="w-full sm:w-auto"
                            />
                            {uploadStates.file && (
                              <div className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-blue-600 flex-shrink-0" />
                                <span className="text-sm font-medium text-blue-600">
                                  {uploadProgress.file || 0}%
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Progress Bar for File Upload */}
                        {uploadStates.file && uploadProgress.file < 100 && (
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">מעלה קובץ...</span>
                              <span className="text-sm font-medium text-blue-600">
                                {uploadProgress.file || 0}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                                style={{ width: `${uploadProgress.file || 0}%` }}
                              ></div>
                            </div>
                          </div>
                        )}

                        {/* Display current file URL (uploaded file) */}
                        {(formData.file_url && !uploadStates.file) && (
                          <div className="flex items-center gap-2 mt-2">
                            <Download className="w-4 h-4 text-green-600 flex-shrink-0" />
                            <span className="text-sm text-green-700">קובץ הועלה בהצלחה</span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteFile('file')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}

                        {!editingProduct && (
                          <div className="text-sm text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200 mt-2">
                            ⚠️ יש לשמור את המוצר תחילה (ללא קובץ) על מנת להעלות קבצים. לחץ על "צור מוצר", ולאחר מכן תוכל להעלות את הקובץ.
                          </div>
                        )}

                        <div className="text-xs text-gray-500 mt-2">
                          סוגי קבצים נתמכים: PDF, Word, Excel, PowerPoint, תמונות, ZIP
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">קישור לתצוגה מקדימה</Label>
                      <Input
                        value={formData.preview_file_url || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, preview_file_url: e.target.value }))}
                        placeholder="https://example.com/preview.pdf"
                        className="mt-1"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">סוג קובץ</Label>
                      <Select
                        value={formData.file_type || ''}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, file_type: value }))}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="בחר סוג קובץ" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pdf">PDF</SelectItem>
                          <SelectItem value="ppt">PowerPoint</SelectItem>
                          <SelectItem value="docx">Word</SelectItem>
                          <SelectItem value="xlsx">Excel</SelectItem>
                          <SelectItem value="image">תמונה</SelectItem>
                          <SelectItem value="zip">ZIP</SelectItem>
                          <SelectItem value="other">אחר</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Workshop specific fields */}
              {formData.product_type === 'workshop' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-blue-900 flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      הגדרות ${getProductTypeName('workshop', 'singular')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-sm font-medium">סוג ה${getProductTypeName('workshop', 'singular')}</Label>
                        <Select
                          value={formData.workshop_type}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, workshop_type: value }))}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="online_live">אונליין בזמן אמת</SelectItem>
                            <SelectItem value="recorded">מוקלט</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {formData.workshop_type === 'online_live' && (
                        <div>
                          <Label className="text-sm font-medium">מספר משתתפים מקסימלי</Label>
                          <Input
                            type="number"
                            min="1"
                            value={formData.max_participants}
                            onChange={(e) => setFormData(prev => ({ ...prev, max_participants: parseInt(e.target.value) || 20 }))}
                            className="mt-1"
                          />
                        </div>
                      )}

                      <div>
                        <Label className="text-sm font-medium">
                          משך ה${getProductTypeName('workshop', 'singular')} (דקות)
                          {formData.video_file_url && (
                            <span className="text-xs text-green-600 mr-2">(נקבע אוטומטית מהוידיאו)</span>
                          )}
                        </Label>
                        <Input
                          type="number"
                          min="15"
                          value={formData.duration_minutes}
                          onChange={(e) => setFormData(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 90 }))}
                          className="mt-1"
                          disabled={!!formData.video_file_url}
                          title={formData.video_file_url ? "משך זמן נקבע אוטומטית מהוידיאו שהועלה" : "הזן את משך הזמן בדקות"}
                        />
                      </div>
                    </div>

                    {/* Online Live Workshop Fields */}
                    {formData.workshop_type === 'online_live' && (
                      <div className="space-y-4 pt-4 border-t border-blue-200">
                        <h5 className="font-medium text-blue-800">הגדרות מפגש אונליין</h5>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium">תאריך ושעת ה${getProductTypeName('workshop', 'singular')} *</Label>
                            <Input
                              type="datetime-local"
                              value={formData.scheduled_date}
                              onChange={(e) => setFormData(prev => ({ ...prev, scheduled_date: e.target.value }))}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-sm font-medium">פלטפורמת המפגש</Label>
                            <Select
                              value={formData.meeting_platform}
                              onValueChange={(value) => setFormData(prev => ({ ...prev, meeting_platform: value }))}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="בחר פלטפורמה" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="zoom">Zoom</SelectItem>
                                <SelectItem value="google_meet">Google Meet</SelectItem>
                                <SelectItem value="teams">Microsoft Teams</SelectItem>
                                <SelectItem value="other">אחר</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium">קישור למפגש *</Label>
                            <Input
                              value={formData.meeting_link}
                              onChange={(e) => setFormData(prev => ({ ...prev, meeting_link: e.target.value }))}
                              placeholder="https://zoom.us/j/... או https://meet.google.com/..."
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-sm font-medium">סיסמת מפגש (אם נדרשת)</Label>
                            <Input
                              value={formData.meeting_password}
                              onChange={(e) => setFormData(prev => ({ ...prev, meeting_password: e.target.value }))}
                              placeholder="סיסמה אופציונלית"
                              className="mt-1"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Recorded Workshop Fields */}
                    {formData.workshop_type === 'recorded' && (
                      <div className="space-y-4 pt-4 border-t border-blue-200">
                        <h5 className="font-medium text-blue-800">הגדרות ${getProductTypeName('workshop', 'singular')} מוקלטת</h5>

                        <div className="space-y-4">
                          <Label className="text-sm font-medium">קובץ וידיאו ל${getProductTypeName('workshop', 'singular')} *</Label>

                          <div className="space-y-3">
                            {/* File Upload Input */}
                            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                              <div className="flex items-center gap-2">
                                <Input
                                  type="file"
                                  accept="video/*"
                                  onChange={(e) => handleFileUpload(e, 'workshop_video')}
                                  disabled={uploadStates.workshop_video}
                                  className="w-full sm:w-auto"
                                />
                                {uploadStates.workshop_video && (
                                  <div className="flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin text-blue-600 flex-shrink-0" />
                                    <span className="text-sm text-blue-600 font-medium">
                                      {uploadProgress.workshop_video || 0}%
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Progress Bar for Video Upload */}
                            {uploadStates.workshop_video && uploadProgress.workshop_video < 100 && (
                              <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-gray-600">מעלה קובץ וידיאו...</span>
                                  <span className="text-sm font-medium text-blue-600">
                                    {uploadProgress.workshop_video || 0}%
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                                    style={{ width: `${uploadProgress.workshop_video || 0}%` }}
                                  ></div>
                                </div>
                                <div className="text-xs text-gray-500">
                                  העלאה מתבצעת... אנא המתן
                                </div>
                              </div>
                            )}

                            {/* Display current video URL (uploaded file) */}
                            {(formData.video_file_url && !uploadStates.workshop_video) && (
                              <div className="flex items-center gap-2 mt-2">
                                <Play className="w-4 h-4 text-green-600 flex-shrink-0" />
                                <span className="text-sm text-gray-600">וידיאו הועלה</span>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteFile('workshop_video')}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            )}

                            <Alert>
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription className="text-sm">
                                <strong>העלאת וידיאו:</strong> ניתן להעלות קבצים בכל גודל.
                                <br />
                                עבור קבצים גדולים, ההעלאה עלולה לארך זמן רב יותר.
                              </AlertDescription>
                            </Alert>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Course modules */}
              {formData.product_type === 'course' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-green-900 flex items-center gap-2">
                      <BookOpen className="w-5 h-5" />
                      מודולי ה${getProductTypeName('course', 'singular')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <span className="text-lg font-semibold">מודולי ה${getProductTypeName('course', 'singular')}</span>
                      <Button type="button" variant="outline" onClick={addModule} className="w-full sm:w-auto">
                        <Plus className="w-4 h-4 ml-2" />
                        הוסף מודול
                      </Button>
                    </div>

                    {formData.course_modules.map((module, index) => (
                      <Card key={index} className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                          <h4 className="font-medium">מודול {index + 1}</h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeModule(index)}
                            className="self-start sm:self-center"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Input
                              placeholder="כותרת המודול"
                              value={module.title}
                              onChange={(e) => updateModule(index, 'title', e.target.value)}
                            />
                            <Input
                              placeholder="משך בדקות"
                              type="number"
                              value={module.duration_minutes}
                              onChange={(e) => updateModule(index, 'duration_minutes', parseInt(e.target.value) || 0)}
                            />
                          </div>
                          <Textarea
                            placeholder="תיאור המודול"
                            value={module.description}
                            onChange={(e) => updateModule(index, 'description', e.target.value)}
                            rows={2}
                          />

                          {/* Video Upload Section */}
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">וידיאו המודול</Label>
                            <Tabs
                              value={selectedModuleVideoTab[index] || 'upload'}
                              onValueChange={(value) => setSelectedModuleVideoTab(prev => ({ ...prev, [index]: value }))}
                              className="mt-4"
                            >
                              <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="upload" className="flex items-center gap-2">
                                  <Upload className="w-4 h-4" />
                                  העלאת קובץ וידיאו
                                </TabsTrigger>
                                <TabsTrigger value="link" className="flex items-center gap-2">
                                  <LinkIcon className="w-4 h-4" />
                                  קישור חיצוני
                                </TabsTrigger>
                              </TabsList>
                              <TabsContent value="upload" className="space-y-3">
                                <div className="space-y-3">
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                    <Input
                                      type="file"
                                      accept="video/*"
                                      onChange={(e) => handleFileUpload(e, 'video', index)}
                                      disabled={uploadStates[`module_${index}_video`]}
                                      className="flex-1"
                                    />
                                    {uploadStates[`module_${index}_video`] && (
                                      <div className="flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin text-blue-600 flex-shrink-0" />
                                        <span className="text-sm text-blue-600 font-medium">
                                          {uploadProgress[`module_${index}_video`] || 0}%
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Progress Bar for Module Video Upload */}
                                  {uploadStates[`module_${index}_video`] && uploadProgress[`module_${index}_video`] < 100 && (
                                    <div className="space-y-2">
                                      <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">מעלה וידיאו...</span>
                                        <span className="text-sm font-medium text-blue-600">
                                          {uploadProgress[`module_${index}_video`] || 0}%
                                        </span>
                                      </div>
                                      <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                          className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                                          style={{ width: `${uploadProgress[`module_${index}_video`] || 0}%` }}
                                        ></div>
                                      </div>
                                    </div>
                                  )}

                                  {(module.video_url && !uploadStates[`module_${index}_video`] && module.video_is_private) && (
                                    <div className="flex items-center gap-2 mt-2">
                                      <Play className="w-4 h-4 text-green-600 flex-shrink-0" />
                                      <span className="text-sm text-gray-600">וידיאו הועלה</span>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDeleteFile('video', index)}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  )}

                                  <Alert>
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription className="text-sm">
                                      <strong>העלאת וידיאו:</strong> ניתן להעלות קבצים בכל גודל. עבור קבצים גדולים, ההעלאה עלולה לארך זמן רב יותר.
                                    </AlertDescription>
                                  </Alert>
                                </div>
                              </TabsContent>
                              <TabsContent value="link" className="space-y-2 pt-2">
                                <Label className="text-sm font-medium flex items-center gap-1">
                                  <LinkIcon className="w-4 h-4 text-gray-500" />
                                  קישור חיצוני לוידיאו
                                </Label>
                                <Input
                                  type="url"
                                  value={module.video_url || ''}
                                  onChange={(e) => {
                                    updateModule(index, 'video_url', e.target.value);
                                    updateModule(index, 'video_is_private', false); // External links are not private
                                  }}
                                  placeholder="https://drive.google.com/uc?id=FILE_ID או https://vimeo.com/VIDEO_ID"
                                  className="flex-1"
                                />
                                
                                {module.video_url && (
                                  <div className="flex items-center gap-2 mt-2">
                                    <LinkIcon className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                    <span className="text-sm text-gray-600">קישור חיצוני</span>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => updateModule(index, 'video_url', '')}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                )}
                              </TabsContent>
                            </Tabs>
                          </div>

                          {/* Material Upload */}
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">${getProductTypeName('tool', 'singular')}/חומר עזר למודול</Label>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                              <Input
                                type="file"
                                onChange={(e) => handleFileUpload(e, 'material', index)}
                                disabled={uploadStates[`module_${index}_material`]}
                                className="flex-1"
                              />
                              {uploadStates[`module_${index}_material`] && (
                                <Loader2 className="w-4 h-4 animate-spin text-blue-600 flex-shrink-0" />
                              )}
                            </div>
                            {module.material_url && (
                              <div className="flex items-center gap-2">
                                <Download className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                <span className="text-sm text-gray-600">חומר הועלה</span>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteFile('material', index)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'form' && (editingProduct || getAvailableProductTypes(enabledProductTypes, canCreateProductType).length > 0) && (
          <div className="flex flex-col sm:flex-row justify-end gap-2 p-6 border-t">
            <Button variant="outline" onClick={handleCancel} className="order-2 sm:order-1">
              ביטול
            </Button>
            <Button onClick={handleSave} className="order-1 sm:order-2">
              <Save className="w-4 h-4 ml-2" />
              {editingProduct ? 'עדכן מוצר' : 'צור מוצר'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
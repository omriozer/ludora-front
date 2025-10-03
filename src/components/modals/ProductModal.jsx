import React, { useState, useEffect, useCallback } from "react";
import { Workshop, Course, File, Tool, Product, Category, User, Settings } from "@/services/entities";
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
  Play,
  Eye
} from "lucide-react";
import SecureVideoPlayer from '../SecureVideoPlayer';
import ProductTypeSelector from './ProductTypeSelector';
import { getProductTypeName } from '@/config/productTypes';
import { getApiBase } from '@/utils/api.js';
import { apiRequest, apiUploadWithProgress } from '@/services/apiClient';
import { getMarketingVideoUrl, getProductImageUrl } from '@/utils/videoUtils.js';
import { toast } from '@/components/ui/use-toast';
import LudoraLoadingSpinner from '@/components/ui/LudoraLoadingSpinner';
import PdfFooterPreview from '../pdf/PdfFooterPreview';

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
  const [enabledProductTypes, setEnabledProductTypes] = useState([]);
  const [message, setMessage] = useState(null);
  const [uploadStates, setUploadStates] = useState({});
  const [uploadProgress, setUploadProgress] = useState({});
  const [selectedModuleVideoTab, setSelectedModuleVideoTab] = useState({});
  const [marketingVideoType, setMarketingVideoType] = useState('youtube'); // 'youtube' or 'upload'
  
  // Loading states for different operations
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingFile, setIsDeletingFile] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // PDF Footer Preview state
  const [showFooterPreview, setShowFooterPreview] = useState(false);
  const [footerConfig, setFooterConfig] = useState(null);

  // Helper functions for marketing video logic
  const [marketingVideoExists, setMarketingVideoExists] = useState(false);

  // Helper state for file upload
  const [uploadedFileInfo, setUploadedFileInfo] = useState(null); // { exists: boolean, filename: string }

  const hasUploadedVideo = () => {
    // Check if marketing video exists on server (not relying on title)
    return marketingVideoExists;
  };

  const hasYouTubeVideo = () => {
    return formData.marketing_video_type === 'youtube' && formData.marketing_video_id && formData.marketing_video_id.trim() !== '';
  };

  const hasAnyMarketingVideo = () => {
    return hasUploadedVideo() || hasYouTubeVideo();
  };

  // Check if marketing video exists on server
  const checkMarketingVideoExists = async (product) => {
    if (!product?.id || !product?.product_type) return false;

    try {
      const result = await apiRequest(`/assets/check/${product.product_type}/${product.id}?assetType=marketing-video`);
      return result.exists === true;
    } catch (error) {
      console.error('Error checking marketing video:', error);
    }

    return false;
  };

  // Check if file upload exists for File products
  const checkFileUploadExists = async (product) => {
    if (!product?.entity_id || product?.product_type !== 'file') return null;

    try {
      const result = await apiRequest(`/assets/check/file/${product.entity_id}?assetType=document`);
      if (result.exists === true && result.filename) {
        return { exists: true, filename: result.filename };
      }
    } catch (error) {
      console.error('Error checking file upload:', error);
    }

    return null;
  };

  // Extract YouTube video ID from various URL formats
  const extractYouTubeId = (url) => {
    if (!url || typeof url !== 'string') return '';

    // Remove whitespace
    url = url.trim();

    // If it's already just an ID (11 characters, alphanumeric and dashes/underscores)
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
      return url;
    }

    // Various YouTube URL patterns
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/watch\?.*&v=)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return '';
  };

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
    file_type: "pdf",
    allow_preview: true,
    add_copyrights_footer: true,
    is_ludora_creator: false,
    tags: [],
    target_audience: "",
    difficulty_level: "",
    marketing_video_type: null,
    marketing_video_id: "",
    marketing_video_title: "",
    marketing_video_duration: "",
    access_days: "",
    is_lifetime_access: false,
    downloads_count: 0,
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

  const isLifetimeAccess = (accessDays) => accessDays === null || accessDays === undefined || accessDays === "";

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
        // Always show type selection for new products (better UX)
        setStep('typeSelection');
        resetForm();
      }
    } else {
      setStep('form');
      resetForm();
      setMessage(null);
    }
  }, [isOpen, editingProduct]);

  const loadInitialData = async () => {
    setIsLoadingData(true);
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
          const defaultLifetime = getDefaultLifetimeAccess('workshop', settings);
          setFormData(prev => ({
            ...prev,
            access_days: defaultLifetime ? "" : (getDefaultAccessDays(prev.product_type, settings)?.toString() || "30")
          }));
        }
      }
    } catch (error) {
      console.error("Error loading initial data:", error);
      setMessage({ type: 'error', text: 'שגיאה בטעינת נתונים ראשוניים' });
    } finally {
      setIsLoadingData(false);
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
      access_days: product.access_days === null ? "" : product.access_days?.toString() || "",
      workshop_type: product.workshop_type || (product.video_file_url ? "recorded" : "online_live"),
      scheduled_date: product.scheduled_date ? format(new Date(product.scheduled_date), "yyyy-MM-dd'T'HH:mm") : "",
      meeting_link: product.meeting_link || product.zoom_link || "",
      meeting_password: product.meeting_password || product.zoom_password || "",
      meeting_platform: product.meeting_platform || "zoom",
      video_file_url: product.video_file_url || product.recording_url || "",
      max_participants: product.max_participants || 20,
      duration_minutes: product.duration_minutes || 90,
      file_type: product.file_type || "pdf",
      allow_preview: product.allow_preview ?? true,
      add_copyrights_footer: product.add_copyrights_footer ?? true,
      is_ludora_creator: !product.creator_user_id,
      image_is_private: product.image_is_private ?? false,
      has_image: !!(product.image_url && product.image_url !== ''), // Compute has_image from image_url
    });


    // Initialize tab selection for course module videos - all videos are uploaded (private)
    const initialModuleTabs = {};
    (product.course_modules || []).forEach((module, index) => {
      initialModuleTabs[index] = 'upload';
    });
    setSelectedModuleVideoTab(initialModuleTabs);

    // Set marketing video type based on product data
    if (product.marketing_video_type) {
      setMarketingVideoType(product.marketing_video_type);
      if (product.marketing_video_type === 'uploaded') {
        setMarketingVideoExists(true);
      } else {
        setMarketingVideoExists(false);
      }
    } else {
      // No marketing video data - default to upload
      setMarketingVideoType('upload');
      setMarketingVideoExists(false);
    }

    // Check for file upload existence and load footer settings (File products only)
    if (product.product_type === 'file' && product.entity_id) {
      checkFileUploadExists(product).then(fileInfo => {
        setUploadedFileInfo(fileInfo);
      });

      // Load footer_settings from product data if available
      if (product.footer_settings) {
        setFooterConfig(product.footer_settings);
      }
    }
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
      file_type: "pdf",
      tags: [],
      target_audience: "",
      difficulty_level: "",
      marketing_video_type: null,
      marketing_video_id: "",
      marketing_video_title: "",
      marketing_video_duration: "",
      access_days: "",
      is_lifetime_access: false,
      downloads_count: 0,
      course_modules: [],
      total_duration_minutes: 0,
    });
    setSelectedModuleVideoTab({});
    setMarketingVideoType('youtube');
    setMarketingVideoExists(false);
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

    const defaultLifetime = getDefaultLifetimeAccess(productType, currentSettings);
    setFormData(prev => ({
      ...prev,
      product_type: productType,
      access_days: defaultLifetime ? "" : (getDefaultAccessDays(productType, currentSettings)?.toString() || "30")
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

    const defaultLifetime = getDefaultLifetimeAccess(newType, currentSettings);
    setFormData(prev => ({
      ...prev,
      product_type: newType,
      access_days: defaultLifetime ? "" : (getDefaultAccessDays(newType, currentSettings)?.toString() || "30")
    }));
  };

  // File type validation helpers using settings configuration
  const getFileTypeConfig = (uploadType) => {
    return globalSettings?.file_types_config?.[uploadType] || null;
  };

  const validateFileType = (file, uploadType) => {
    const config = getFileTypeConfig(uploadType);
    if (!config) {
      return { valid: false, error: 'Invalid upload type' };
    }

    if (!config.mimeTypes.includes(file.type)) {
      return {
        valid: false,
        error: `אנא בחר קובץ ${config.displayName} בלבד`
      };
    }

    const maxSize = config.maxSizeMB * 1024 * 1024;
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `גודל הקובץ חייב להיות קטן מ-${config.maxSizeMB}MB`
      };
    }

    return { valid: true };
  };

  const getAcceptAttribute = (uploadType) => {
    return getFileTypeConfig(uploadType)?.accept || '';
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

    console.log(`🔍 Frontend file upload - File type: "${file.type}", File name: "${file.name}", Upload type: "${fileType}"`);

    const uploadKey = moduleIndex !== null ? `module_${moduleIndex}_${fileType}` : fileType;

    // Validate file type using centralized configuration
    const validation = validateFileType(file, fileType);
    if (!validation.valid) {
      setMessage({ type: 'error', text: validation.error });
      return;
    }

    setUploadStates(prev => ({ ...prev, [uploadKey]: true }));
    setUploadProgress(prev => ({ ...prev, [uploadKey]: 0 }));

    let progressIntervalId = null;

    try {
      const isVideoFile = (fileType === 'video' || fileType === 'workshop_video' || fileType === 'marketing_video');
      const isFileUpload = (fileType === 'file');
      const isImageUpload = (fileType === 'image');
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

      if (fileType === 'marketing_video') {
        const duration = await getVideoDuration(file);
        if (duration) {
          file.detectedDuration = duration; // Store detected duration on file object
          const durationSeconds = Math.round(duration);
          console.log(`Detected marketing video duration: ${durationSeconds} seconds`);
        }
      }

      if (isVideoFile || isFileUpload || isImageUpload) {
        // Use apiUploadWithProgress for file/video/image uploads with progress tracking
        const uploadFormData = new FormData();
        uploadFormData.append('file', file);

        // For File product type uploads, we need to include the File entity ID
        if (isFileUpload) {
          if (!editingProduct || !editingProduct.entity_id) {
            toast({
              title: "שגיאה בהעלאת קובץ",
              description: "יש לשמור את המוצר תחילה על מנת להעלות קבצים. לחץ על 'צור מוצר' ולאחר מכן תוכל להעלות את הקובץ.",
              variant: "destructive"
            });
            return;
          }

          // If product is published and file exists, delete the old one first
          if ((editingProduct?.is_published || formData.is_published) && uploadedFileInfo?.exists) {
            try {
              console.log('🔄 Replacing existing file for published product...');
              await apiRequest(`/assets/file/${editingProduct.entity_id}?assetType=document`, {
                method: 'DELETE'
              });
              console.log('✅ Old file deleted successfully');
            } catch (error) {
              console.error('❌ Error deleting old file:', error);
              toast({
                title: "שגיאה במחיקת קובץ קיים",
                description: "לא ניתן למחוק את הקובץ הקיים. נסה שנית.",
                variant: "destructive"
              });
              setUploadStates(prev => ({ ...prev, [uploadKey]: false }));
              return;
            }
          }

          uploadFormData.append('fileEntityId', editingProduct.entity_id);
        }

        // Choose endpoint based on file type
        let endpoint;
        if (isFileUpload) {
          // Use unified upload endpoint with assetType=document for file uploads
          endpoint = `/assets/upload?entityType=file&entityId=${editingProduct.entity_id}&assetType=document`;
        } else if (isImageUpload) {
          // Use unified upload endpoint with assetType=image for image uploads
          const entityType = editingProduct?.product_type || formData.product_type || 'product';
          const entityId = editingProduct?.id || 'temp';
          endpoint = `/assets/upload?entityType=${entityType}&entityId=${entityId}&assetType=image`;
        } else if (fileType === 'marketing_video') {
          // Use new unified public video endpoint for marketing videos
          const entityType = editingProduct?.product_type || formData.product_type;
          endpoint = `/assets/upload/video/public?entityType=${entityType}&entityId=${editingProduct?.id || 'temp'}`;
        } else {
          // Use new unified private video endpoint for other videos (workshop, etc.)
          const entityType = editingProduct?.product_type || formData.product_type;
          endpoint = `/assets/upload/video/private?entityType=${entityType}&entityId=${editingProduct?.id || 'temp'}`;
        }

        // Upload with progress tracking via centralized apiClient
        result = await apiUploadWithProgress(
          endpoint,
          uploadFormData,
          (percentComplete) => {
            setUploadProgress(prev => ({ ...prev, [uploadKey]: percentComplete }));
          }
        );
      } else {
        const { UploadFile } = await import('@/services/integrations');
        result = await UploadFile({ file });
        console.log('this is the BAD endpoint:', result);
      }

      if (result) {
        // Handle different response formats: API returns data in result.data, integrations return directly
        const responseData = result.data || result;

        // For File uploads (assetType=document), the API already updated file_name in database
        // No need to store URL - downloads use /assets/download/file/{entityId}
        if (isFileUpload) {
          // File upload complete - file_name is already saved in database by API
          const fileName = responseData.filename || file.originalname || file.name || 'קובץ';
          setUploadedFileInfo({ exists: true, filename: fileName });
          setMessage({ type: 'success', text: `${fileName} הועלה בהצלחה!` });
        } else {
          // For videos and other files (but NOT file/preview_file assets), get the file reference
          let fileReference = responseData.downloadUrl || responseData.s3Url || responseData.file_uri || responseData.streamUrl;

          // For image uploads, don't store URL - use predictable paths like marketing videos

          // Marketing videos and images don't need fileReference - they use predictable paths
          const needsFileReference = fileType !== 'marketing_video' && fileType !== 'image';

          if (fileReference || !needsFileReference) {
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
              // For marketing videos and images, we don't store URL since we use predictable paths
              const fieldName = fileType === 'video' ? 'video_url' :
                fileType === 'workshop_video' ? 'video_file_url' :
                null; // No URL field needed for marketing videos, images, file assets, or preview files

              // For marketing videos and images, we don't update any URL field since we use predictable paths
              // For other file types, we update the URL field
              const updateData = fieldName ? { [fieldName]: fileReference } : {};

              // Auto-set duration for workshop videos if detected on client-side
              if (fileType === 'workshop_video' && file.detectedDuration) {
                const durationMinutes = Math.round(file.detectedDuration / 60);
                updateData.duration_minutes = durationMinutes;
              }

              // Auto-set duration for marketing videos if detected on client-side
              if (fileType === 'marketing_video') {
                if (file.detectedDuration) {
                  const durationSeconds = Math.round(file.detectedDuration);
                  updateData.marketing_video_duration = durationSeconds;
                }
                // Set marketing video type and ID for uploaded videos
                updateData.marketing_video_type = 'uploaded';
                updateData.marketing_video_id = editingProduct?.id || 'temp';

                // Set the marketing video exists flag
                setMarketingVideoExists(true);
              }

              // For image uploads, set predictable image URL (like marketing videos)
              if (fileType === 'image') {
                // Set a predictable URL that the frontend can use
                updateData.image_url = 'HAS_IMAGE'; // Flag indicating image exists at predictable path
                updateData.has_image = true; // Set flag for display logic
              }

              // Only set private flag for non-video, non-image files
              if (fileType !== 'video' && fileType !== 'workshop_video' && fileType !== 'marketing_video' && fileType !== 'image') {
                const isPrivateFile = !!(responseData.file_uri || responseData.s3Url);
                const isPrivateFieldName = fileType === 'preview_file' ? 'preview_file_is_private' : 'file_is_private';
                updateData[isPrivateFieldName] = isPrivateFile;
              }

              setFormData(prev => {
                const newFormData = {
                  ...prev,
                  ...updateData
                };
                console.log('🖼️ Image upload - formData after update:', {
                  fileType,
                  updateData,
                  oldImageUrl: prev.image_url,
                  newImageUrl: newFormData.image_url,
                  hasImageUrl: !!newFormData.image_url
                });
                return newFormData;
              });
            }

            // Extract filename from original file for better user feedback
            const fileName = file.originalname || file.name || 'קובץ';
            setMessage({ type: 'success', text: `${fileName} הועלה בהצלחה!` });
          } else {
            throw new Error('לא התקבל קישור לקובץ מהשרת');
          }
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

  const handleDeleteFile = async (fileType, moduleIndex = null) => {
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
      // Special handling for marketing video - delete from S3
      if (fileType === 'marketing_video') {
        if (!editingProduct?.id || !editingProduct?.product_type) {
          console.error('Cannot delete marketing video: Missing product ID or type');
          setMessage({ type: 'error', text: 'שגיאה: לא ניתן למחוק את הסרטון כרגע' });
          return;
        }

        setIsDeletingFile(true);
        try {
          const entityType = editingProduct.product_type;
          const entityId = editingProduct.id;

          await apiRequest(`/assets/${entityType}/${entityId}?assetType=marketing-video`, {
            method: 'DELETE'
          });

          // Clear marketing video fields and update state
          setFormData(prev => ({
            ...prev,
            marketing_video_type: null,
            marketing_video_id: '',
            marketing_video_title: '',
            marketing_video_duration: ''
          }));
          setMarketingVideoExists(false);
          setMessage({ type: 'success', text: 'סרטון השיווק נמחק בהצלחה!' });
          console.log('Marketing video deleted successfully from S3');
        } catch (error) {
          console.error('Error deleting marketing video:', error);
          setMessage({ type: 'error', text: error.message || 'שגיאה במחיקת הסרטון' });
        } finally {
          setIsDeletingFile(false);
        }
        return;
      }

      // Special handling for file uploads - delete from assets
      if (fileType === 'file') {
        if (!editingProduct?.entity_id) {
          console.error('Cannot delete file: Missing entity ID');
          setMessage({ type: 'error', text: 'שגיאה: לא ניתן למחוק את הקובץ כרגע' });
          return;
        }

        // Prevent deletion if product is published
        if (editingProduct?.is_published || formData.is_published) {
          toast({
            title: "לא ניתן למחוק קובץ",
            description: "לא ניתן למחוק קובץ ממוצר מפורסם. ניתן רק להחליף אותו בקובץ חדש.",
            variant: "destructive"
          });
          return;
        }

        setIsDeletingFile(true);
        try {
          await apiRequest(`/assets/file/${editingProduct.entity_id}?assetType=document`, {
            method: 'DELETE'
          });

          setUploadedFileInfo(null);
          setMessage({ type: 'success', text: 'הקובץ נמחק בהצלחה!' });
        } catch (error) {
          console.error('Error deleting file:', error);
          setMessage({ type: 'error', text: error.message || 'שגיאה במחיקת הקובץ' });
        } finally {
          setIsDeletingFile(false);
        }
        return;
      }

      // Special handling for image deletion - delete from S3
      if (fileType === 'image') {
        if (!editingProduct?.id || !editingProduct?.product_type) {
          console.error('Cannot delete image: Missing product ID or type');
          setMessage({ type: 'error', text: 'שגיאה: לא ניתן למחוק את התמונה כרגע' });
          return;
        }

        // If there's an image, delete from S3 (using predictable path)
        if (formData.has_image) {
          setIsDeletingFile(true);
          try {
            const entityType = editingProduct.product_type;
            const entityId = editingProduct.id;

            // Use predictable path (no filename needed - backend knows it's image.jpg)
            await apiRequest(`/assets/${entityType}/${entityId}?assetType=image`, {
              method: 'DELETE'
            });

            // Clear image fields
            setFormData(prev => ({
              ...prev,
              has_image: false
            }));
            setMessage({ type: 'success', text: 'התמונה נמחקה בהצלחה!' });
            console.log('Product image deleted successfully from S3');
          } catch (error) {
            console.error('Error deleting image:', error);
            setMessage({ type: 'error', text: error.message || 'שגיאה במחיקת התמונה' });
          } finally {
            setIsDeletingFile(false);
          }
          return;
        } else {
          // No image to delete from S3, just clear form fields
          setFormData(prev => ({
            ...prev,
            has_image: false
          }));
          return;
        }
      }

      // Handle other file types (original logic) - only for video, workshop_video
      const fieldName = fileType === 'video' ? 'video_url' :
        fileType === 'workshop_video' ? 'video_file_url' : null;

      // Prepare update data - only if there's a field to update
      const updateData = fieldName ? { [fieldName]: '' } : {};

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

    setIsSaving(true);

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
        file_type: formData.file_type || null,
        allow_preview: formData.allow_preview ?? true,
        add_copyrights_footer: formData.add_copyrights_footer ?? true,
        is_ludora_creator: formData.is_ludora_creator || false,
        tags: formData.tags?.filter(tag => tag.trim()) || [],
        target_audience: (formData.target_audience && formData.target_audience.trim()) ? formData.target_audience : null,
        difficulty_level: (formData.difficulty_level && formData.difficulty_level.trim()) ? formData.difficulty_level : null,
        marketing_video_type: formData.marketing_video_type || null,
        marketing_video_id: (formData.marketing_video_id && formData.marketing_video_id.trim()) ? formData.marketing_video_id : null,
        marketing_video_title: (formData.marketing_video_title && formData.marketing_video_title.trim()) ? formData.marketing_video_title : null,
        marketing_video_duration: formData.marketing_video_duration ? parseInt(formData.marketing_video_duration) || null : null,
        access_days: formData.access_days === "" ? null : parseInt(formData.access_days) || null,
        course_modules: formData.product_type === 'course' ? formData.course_modules : undefined,
        total_duration_minutes: formData.total_duration_minutes
      };

      // Add is_private flags if they exist and are relevant
      if (formData.image_is_private !== undefined) baseData.image_is_private = formData.image_is_private;

      if (baseData.course_modules) {
        baseData.course_modules = baseData.course_modules.map(module => ({
          ...module,
          video_is_private: module.video_is_private ?? false,
          material_is_private: module.material_is_private ?? false,
        }));
      }

      // Use appropriate entity service based on product type
      let entityService;
      switch (formData.product_type) {
        case 'file':
          entityService = File;
          break;
        case 'workshop':
          entityService = Workshop;
          break;
        case 'course':
          entityService = Course;
          break;
        case 'tool':
          entityService = Tool;
          break;
        default:
          entityService = Product; // Fallback for other types
      }
      const entityName = getProductTypeName(formData.product_type, 'singular') || 'מוצר';

      // Prepare product data with product_type included
      const cleanedData = {
        ...baseData,
        product_type: formData.product_type
      };

      // Add product-type specific fields
      if (formData.product_type === 'workshop') {
        cleanedData.workshop_type = formData.workshop_type;
      }

      let createdEntity = null;

      if (editingProduct) {
        // Check if unpublishing a product with completed purchases
        if (editingProduct.is_published && !cleanedData.is_published) {
          try {
            // Check if product has completed non-free purchases
            const response = await apiRequest(`/api/purchase/check-product-purchases/${editingProduct.id}`);

            if (response.hasNonFreePurchases) {
              toast({
                title: "לא ניתן להסיר פרסום",
                description: `למוצר זה יש ${response.purchaseCount} רכישות שהושלמו. לא ניתן להסיר את הפרסום של מוצר שנרכש.`,
                variant: "destructive"
              });
              return;
            }
          } catch (error) {
            console.error('Error checking product purchases:', error);
            // Continue with update if check fails (graceful fallback)
          }
        }

        // Split data into Product-specific and entity-specific fields
        const productData = {
          title: cleanedData.title,
          description: cleanedData.description,
          short_description: cleanedData.short_description,
          category: cleanedData.category,
          price: cleanedData.price,
          is_published: cleanedData.is_published,
          image_url: cleanedData.image_url,
          tags: cleanedData.tags,
          target_audience: cleanedData.target_audience,
          difficulty_level: cleanedData.difficulty_level,
          marketing_video_type: cleanedData.marketing_video_type,
          marketing_video_id: cleanedData.marketing_video_id,
          marketing_video_title: cleanedData.marketing_video_title,
          marketing_video_duration: cleanedData.marketing_video_duration,
          access_days: cleanedData.access_days,
          product_type: cleanedData.product_type
        };

        const entityData = {
          ...cleanedData
        };

        // Remove Product-specific fields from entity data (these belong in Product table)
        delete entityData.title;
        delete entityData.description;
        delete entityData.short_description;
        delete entityData.category;
        delete entityData.price;
        delete entityData.is_published;
        delete entityData.image_url;
        delete entityData.tags;
        delete entityData.target_audience;
        delete entityData.difficulty_level;
        delete entityData.marketing_video_type;
        delete entityData.marketing_video_id;
        delete entityData.marketing_video_title;
        delete entityData.marketing_video_duration;
        delete entityData.access_days;
        delete entityData.product_type;


        // Always update Product table with Product-specific fields (including marketing video)
        await Product.update(editingProduct.id, productData);

        // Update entity-specific table only if there are entity-specific fields
        const hasEntityFields = Object.keys(entityData).length > 0;
        if (hasEntityFields && editingProduct.entity_id) {
          await entityService.update(editingProduct.entity_id, entityData);
        }

        // For File products, also update the File entity with file-specific fields
        if (formData.product_type === 'file' && editingProduct.entity_id) {
          const { File: FileEntity } = await import('@/services/entities');

          // Prepare footer_settings WITHOUT text content (text always comes from system settings)
          const footerSettingsToSave = footerConfig ? {
            logo: {
              visible: footerConfig.logo.visible,
              position: footerConfig.logo.position,
              style: footerConfig.logo.style
            },
            text: {
              visible: footerConfig.text.visible,
              position: footerConfig.text.position,
              style: footerConfig.text.style
              // NOTE: content is excluded - text always comes from system settings
            },
            url: {
              visible: footerConfig.url.visible,
              href: footerConfig.url.href,
              position: footerConfig.url.position,
              style: footerConfig.url.style
            }
          } : null;

          await FileEntity.update(editingProduct.entity_id, {
            file_type: cleanedData.file_type || null,
            allow_preview: cleanedData.allow_preview ?? true,
            add_copyrights_footer: cleanedData.add_copyrights_footer ?? true,
            footer_settings: footerSettingsToSave
          });
        }

        setMessage({ type: 'success', text: `${entityName} עודכן בהצלחה` });
        createdEntity = { id: editingProduct.id, ...cleanedData };
      } else {
        // Split data into Product-specific and entity-specific fields for creation
        const productData = {
          title: cleanedData.title,
          description: cleanedData.description,
          short_description: cleanedData.short_description,
          category: cleanedData.category,
          price: cleanedData.price,
          is_published: cleanedData.is_published,
          image_url: cleanedData.image_url,
          tags: cleanedData.tags,
          target_audience: cleanedData.target_audience,
          difficulty_level: cleanedData.difficulty_level,
          marketing_video_type: cleanedData.marketing_video_type,
          marketing_video_id: cleanedData.marketing_video_id,
          marketing_video_title: cleanedData.marketing_video_title,
          marketing_video_duration: cleanedData.marketing_video_duration,
          access_days: cleanedData.access_days,
          product_type: cleanedData.product_type,
          // Include entity-specific fields and is_ludora_creator for creation
          ...cleanedData
        };


        // For creation, use the appropriate entity service but ensure all data is included
        createdEntity = await entityService.create(productData);
        console.log('📝 Created entity:', createdEntity);
        setMessage({ type: 'success', text: `${entityName} נוצר בהצלחה` });

        // For new File products without uploaded file, show message but close modal
        // User will need to edit the product to upload file
        if (formData.product_type === 'file' && !uploadedFileInfo?.exists) {
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
    } finally {
      setIsSaving(false);
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
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8 relative">
        {/* Loading Overlay */}
        {(isLoadingData || isSaving || isDeletingFile || Object.values(uploadStates).some(state => state.isUploading)) && (
          <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-10 rounded-lg">
            <div className="flex flex-col items-center gap-4">
              <LudoraLoadingSpinner />
              <p className="text-sm text-gray-600">
                {isLoadingData && 'טוען נתונים...'}
                {isSaving && 'שומר מוצר...'}
                {isDeletingFile && 'מוחק קובץ...'}
                {Object.values(uploadStates).some(state => state.isUploading) && 'מעלה קובץ...'}
              </p>
            </div>
          </div>
        )}
        
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

              {/* Product Fields Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    שדות מוצר - פרטים כלליים
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">כותרת *</Label>
                      <Input
                        value={formData.title || ""}
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
                    <Label className="text-sm font-medium">תיאור קצר (אופציונלי)</Label>
                    <Textarea
                      value={formData.short_description || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, short_description: e.target.value }))}
                      placeholder="תיאור קצר שיופיע בקטלוג המוצרים - עד 150 תווים"
                      rows={2}
                      className="mt-1"
                      maxLength={150}
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      {formData.short_description?.length || 0}/150 תווים
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">תיאור מפורט *</Label>
                    <Textarea
                      value={formData.description || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="תיאור מפורט של המוצר שיופיע בדף המוצר"
                      rows={4}
                      className="mt-1"
                    />
                  </div>


                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">קטגוריה</Label>
                      <Select
                        value={formData.category || ""}
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
                      <Label className="text-sm font-medium">רמת קושי</Label>
                      <Select
                        value={formData.difficulty_level || ""}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, difficulty_level: value }))}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="בחר רמת קושי" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="beginner">מתחילים</SelectItem>
                          <SelectItem value="intermediate">בינוני</SelectItem>
                          <SelectItem value="advanced">מתקדמים</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">מחיר (₪)</Label>
                    <Input
                      type="number"
                      value={formData.price || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium">קהל יעד</Label>
                    <Input
                      value={formData.target_audience || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, target_audience: e.target.value }))}
                      placeholder="מי הקהל המיועד למוצר זה?"
                      className="mt-1"
                    />
                  </div>

                  {/* Tags Input */}
                  <div>
                    <Label className="text-sm font-medium">תגיות (מופרדות בפסיק)</Label>
                    <Input
                      value={Array.isArray(formData.tags) ? formData.tags.join(', ') : ''}
                      onChange={(e) => {
                        const tags = e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
                        setFormData(prev => ({ ...prev, tags }));
                      }}
                      placeholder="תכנות, מתחילים, PDF, מדריך"
                      className="mt-1"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      הקלד תגיות מופרדות בפסיקים
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
                      {formData.has_image && editingProduct && (
                        <div className="flex items-center gap-2">
                          <img
                            src={getProductImageUrl(editingProduct)}
                            alt="תצוגה מקדימה"
                            className="w-16 h-16 object-cover rounded flex-shrink-0"
                            onLoad={() => console.log('🖼️ Image loaded successfully:', getProductImageUrl(editingProduct))}
                            onError={(e) => console.error('🖼️ Image failed to load:', getProductImageUrl(editingProduct), e)}
                          />
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

                  {/* Duration field only for workshops and courses */}
                  {(formData.product_type === 'workshop' || formData.product_type === 'course') && (
                    <div>
                      <Label className="text-sm font-medium">משך כולל בדקות</Label>
                      <Input
                        type="number"
                        value={formData.total_duration_minutes}
                        onChange={(e) => setFormData(prev => ({ ...prev, total_duration_minutes: parseInt(e.target.value) || 0 }))}
                        placeholder="60"
                        className="mt-1"
                      />
                    </div>
                  )}

                  {/* Marketing Video Section */}
                  <div className="space-y-4">
                    <h3 className="text-base font-semibold flex items-center gap-2">
                      <Play className="w-4 h-4" />
                      סרטון שיווקי (אופציונלי)
                    </h3>
                    <div className="p-4 border rounded-lg bg-blue-50">
                      {/* Show conditional tabs based on existing video content */}
                      {hasAnyMarketingVideo() ? (
                        // Show only existing video tab when video exists
                        <div className="space-y-4">
                          {hasYouTubeVideo() && (
                            <div className="p-4 border-l-4 border-blue-500 bg-blue-50">
                              <div className="flex items-center justify-between mb-2">
                                <Label className="text-sm font-medium text-blue-700">סרטון יוטיוב קיים</Label>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setFormData(prev => ({
                                      ...prev,
                                      marketing_video_type: null,
                                      marketing_video_id: "",
                                      marketing_video_title: "" // Clear title when deleting YouTube video
                                    }));
                                    setMarketingVideoType("upload");
                                  }}
                                  className="text-red-600 border-red-300 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  מחק כדי להעלות קובץ
                                </Button>
                              </div>
                              <Input
                                value={(formData.marketing_video_type === 'youtube' ? formData.marketing_video_id : '') || ""}
                                onChange={(e) => {
                                  const input = e.target.value;
                                  const extractedId = extractYouTubeId(input);
                                  setFormData(prev => ({
                                    ...prev,
                                    marketing_video_type: 'youtube',
                                    marketing_video_id: extractedId || input
                                  }));
                                }}
                                placeholder="הדבק כל קישור יוטיוב או מזהה וידיאו"
                                className="mt-1"
                              />
                              {hasYouTubeVideo() && (
                                <div className="mt-3">
                                  <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                                    <iframe
                                      src={`https://www.youtube.com/embed/${formData.marketing_video_id}`}
                                      title="YouTube Video Preview"
                                      className="w-full h-full"
                                      frameBorder="0"
                                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                      allowFullScreen
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {hasUploadedVideo() && (
                            <div className="p-4 border-l-4 border-green-500 bg-green-50">
                              <div className="flex items-center justify-between mb-2">
                                <Label className="text-sm font-medium text-green-700">סרטון שהועלה</Label>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteFile('marketing_video')}
                                  className="text-red-600 border-red-300 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  מחק כדי להוסיף יוטיוב
                                </Button>
                              </div>
                              {hasUploadedVideo() && editingProduct && (
                                <div className="mt-2">
                                  <div className="bg-white p-2 rounded border">
                                    <SecureVideoPlayer
                                      videoUrl={getMarketingVideoUrl(editingProduct)}
                                      title={formData.marketing_video_title || "Marketing Video"}
                                      className="h-48"
                                      contentType="marketing"
                                    />
                                    <div className="mt-2 text-xs text-gray-500">
                                      Marketing video: {editingProduct.product_type}/{editingProduct.id}
                                    </div>
                                    {formData.marketing_video_duration && (
                                      <p className="text-xs text-gray-500 mt-1">
                                        משך: {Math.floor(formData.marketing_video_duration / 60)}:{(formData.marketing_video_duration % 60).toString().padStart(2, '0')} דקות
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        // Show tabs for upload when no video exists
                        <Tabs value={marketingVideoType} onValueChange={setMarketingVideoType} className="w-full">
                          <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="upload" className="flex items-center gap-2">
                              <Upload className="w-4 h-4" />
                              העלאת קובץ
                            </TabsTrigger>
                            <TabsTrigger value="youtube" className="flex items-center gap-2">
                              <LinkIcon className="w-4 h-4" />
                              יוטיוב
                            </TabsTrigger>
                          </TabsList>

                          <TabsContent value="upload" className="space-y-3 mt-4">
                            <div>
                              <Label className="text-sm font-medium">העלאת קובץ וידיאו</Label>
                              <div className="mt-1 space-y-2">
                                <input
                                  type="file"
                                  accept="video/*"
                                  onChange={(e) => handleFileUpload(e, 'marketing_video')}
                                  className="hidden"
                                  id="marketing-video-upload"
                                />
                                <label
                                  htmlFor="marketing-video-upload"
                                  className="flex items-center justify-center w-full p-4 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:border-blue-400 transition-colors bg-white"
                                >
                                  {uploadStates.marketing_video ? (
                                    <div className="flex items-center gap-2 text-blue-600">
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                      מעלה... {uploadProgress.marketing_video ? `${uploadProgress.marketing_video}%` : ''}
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2 text-blue-600">
                                      <Upload className="w-4 h-4" />
                                      לחץ לבחירת קובץ וידיאו
                                    </div>
                                  )}
                                </label>
                                <div className="text-xs text-gray-500">
                                  תומך בכל פורמטי הוידיאו הנפוצים (MP4, MOV, AVI וכו')
                                </div>
                              </div>
                            </div>
                          </TabsContent>

                          <TabsContent value="youtube" className="space-y-3 mt-4">
                            <div>
                              <Label className="text-sm font-medium">מזהה סרטון יוטיוב</Label>
                              <Input
                                value={(formData.marketing_video_type === 'youtube' ? formData.marketing_video_id : '') || ""}
                                onChange={(e) => {
                                  const input = e.target.value;
                                  const extractedId = extractYouTubeId(input);
                                  setFormData(prev => ({
                                    ...prev,
                                    marketing_video_type: 'youtube',
                                    marketing_video_id: extractedId || input
                                  }));
                                }}
                                placeholder="הדבק כל קישור יוטיוב או מזהה וידיאו"
                                className="mt-1"
                              />
                              <div className="text-xs text-gray-500 mt-1">
                                הדבק כל קישור יוטיוב והמערכת תחלץ את מזהה הוידיאו אוטומטית
                              </div>
                            </div>

                            {/* YouTube Video Preview */}
                            {hasYouTubeVideo() && (
                              <div className="mt-4">
                                <Label className="text-sm font-medium text-blue-700 mb-2 block">תצוגה מקדימה:</Label>
                                <div className="bg-white p-2 rounded border">
                                  <iframe
                                    width="100%"
                                    height="200"
                                    src={`https://www.youtube.com/embed/${formData.marketing_video_id.trim()}?controls=1&showinfo=0&rel=0`}
                                    title={formData.marketing_video_title || "YouTube Video Preview"}
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    className="rounded"
                                  />
                                </div>
                              </div>
                            )}
                          </TabsContent>
                        </Tabs>
                      )}

                      {/* Video title field - Always visible outside the tabs */}
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <Label className="text-sm font-medium">כותרת הסרטון</Label>
                        <Input
                          value={formData.marketing_video_title || ""}
                          onChange={(e) => {
                            setFormData(prev => ({
                              ...prev,
                              marketing_video_title: e.target.value
                            }));
                          }}
                          placeholder="כותרת הסרטון להצגה באתר"
                          className="mt-1"
                          disabled={!hasYouTubeVideo() && !marketingVideoExists}
                        />
                        {!hasYouTubeVideo() && !marketingVideoExists && (
                          <p className="text-xs text-gray-500 mt-1">הוסף סרטון כדי להגדיר כותרת</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Access Settings Section */}
                  <div className="space-y-4">
                    <h3 className="text-base font-semibold">הגדרות גישה</h3>
                    <div className="p-4 border rounded-lg bg-gray-50">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                        <Label className="font-medium">גישה לכל החיים</Label>
                        <Switch
                          checked={isLifetimeAccess(formData.access_days)}
                          onCheckedChange={(checked) => {
                            setFormData(prev => ({
                              ...prev,
                              access_days: checked ? "" : "30"
                            }));
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">ימי גישה (השאר ריק לברירת מחדל)</Label>
                        <Input
                          type="number"
                          value={formData.access_days}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            access_days: e.target.value
                          }))}
                          disabled={isLifetimeAccess(formData.access_days)}
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
                      onCheckedChange={(checked) => {
                        console.log('📌 Publish toggle changed to:', checked);
                        setFormData(prev => ({ ...prev, is_published: checked }));
                      }}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Product Type Specific Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    שדות ספציפיים לסוג המוצר - {getProductTypeName(formData.product_type, 'singular')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
              
                    {/* File-specific fields */}
                    {formData.product_type === 'file' && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-purple-900 flex items-center gap-2">
                          <FileText className="w-5 h-5" />
                          הגדרות {getProductTypeName('file', 'singular')}
                        </h3>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">העלאת {getProductTypeName('file', 'singular')}</Label>

                      <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Input
                              type="file"
                              accept={getAcceptAttribute('file')}
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

                        {/* Display current file (uploaded file from assets) */}
                        {(uploadedFileInfo?.exists && !uploadStates.file) && (
                          <div className="flex items-center gap-2 mt-2">
                            <Download className="w-4 h-4 text-green-600 flex-shrink-0" />
                            <span className="text-sm text-green-700">
                              {uploadedFileInfo.filename && uploadedFileInfo.filename.length > 30
                                ? uploadedFileInfo.filename.substring(0, 30) + '...'
                                : uploadedFileInfo.filename || 'קובץ הועלה בהצלחה'}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteFile('file')}
                              disabled={isDeletingFile || editingProduct?.is_published || formData.is_published}
                              title={editingProduct?.is_published || formData.is_published ? "לא ניתן למחוק קובץ ממוצר מפורסם - ניתן להחליף בלבד" : "מחק קובץ"}
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
                          סוגי קבצים נתמכים: {getFileTypeConfig('file')?.displayName || 'PDF'}
                        </div>
                      </div>

                      {/* Allow Preview Toggle */}
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-medium text-gray-900">לאפשר תצוגה מקדימה</Label>
                          <p className="text-xs text-gray-500">
                            כאשר מופעל, משתמשים יוכלו לצפות בתצוגה מקדימה של הקובץ לפני הרכישה
                          </p>
                        </div>
                        <Switch
                          checked={formData.allow_preview}
                          onCheckedChange={(checked) => setFormData({ ...formData, allow_preview: checked })}
                        />
                      </div>

                      {/* Add Copyrights Footer Toggle - Admin Only */}
                      {(currentUser?.role === 'admin' || currentUser?.role === 'sysadmin') && (
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="space-y-0.5">
                            <Label className="text-sm font-medium text-gray-900">הוסף כותרת תחתונה עם זכויות יוצרים</Label>
                            <p className="text-xs text-gray-500">
                              כאשר מופעל, יוסף באופן אוטומטי כותרת תחתונה עם פרטי זכויות היוצרים של היוצר
                            </p>
                          </div>
                          <Switch
                            checked={formData.add_copyrights_footer}
                            onCheckedChange={(checked) => setFormData({ ...formData, add_copyrights_footer: checked })}
                          />
                        </div>
                      )}

                      {/* Footer Preview Button - Show if add_copyrights_footer is true and file is PDF */}
                      {formData.add_copyrights_footer &&
                       formData.file_type === 'pdf' &&
                       (currentUser?.role === 'admin' || currentUser?.role === 'sysadmin' || currentUser?.content_creator_agreement_sign_date) && (
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowFooterPreview(true)}
                            className="w-full"
                          >
                            <Eye className="w-4 h-4 ml-2" />
                            תצוגה מקדימה של כותרת תחתונה
                          </Button>
                          <p className="text-xs text-gray-600 mt-2">
                            לחץ לצפייה בתצוגה מקדימה של הקובץ עם כותרת תחתונה של זכויות יוצרים
                          </p>
                        </div>
                      )}

                      {/* Ludora Creator Toggle - Admin Only */}
                      {(currentUser?.role === 'admin' || currentUser?.role === 'sysadmin') && (
                        <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200">
                          <div className="space-y-0.5">
                            <Label className="text-sm font-medium text-purple-900">מוצר של לודורה (למנהלים בלבד)</Label>
                            <p className="text-xs text-purple-600">
                              כאשר מופעל, המוצר ישויך ללודורה ולא למשתמש הנוכחי. היוצר יוצג כ"Ludora"
                            </p>
                          </div>
                          <Switch
                            checked={formData.is_ludora_creator}
                            onCheckedChange={(checked) => setFormData({ ...formData, is_ludora_creator: checked })}
                          />
                        </div>
                      )}
                    </div>


                    {/* File type is auto-detected from uploaded file, no manual selection needed */}
                    {formData.file_type && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">סוג קובץ (זוהה אוטומטית)</Label>
                        <div className="p-2 bg-gray-50 rounded border text-sm text-gray-700">
                          {formData.file_type === 'pdf' && 'PDF'}
                          {formData.file_type === 'ppt' && 'PowerPoint'}
                          {formData.file_type === 'docx' && 'Word'}
                          {formData.file_type === 'xlsx' && 'Excel'}
                          {formData.file_type === 'image' && 'תמונה'}
                          {formData.file_type === 'zip' && 'ZIP'}
                          {formData.file_type === 'text' && 'טקסט'}
                          {formData.file_type === 'video' && 'וידיאו'}
                          {formData.file_type === 'other' && 'אחר'}
                        </div>
                      </div>
                    )}
                      </div>
                    )}

                    {/* Workshop specific fields */}
                    {formData.product_type === 'workshop' && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
                          <Calendar className="w-5 h-5" />
                          הגדרות {getProductTypeName('workshop', 'singular')}
                        </h3>
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
                                <span className="text-sm text-gray-600">
                                  וידיאו: {(() => {
                                    try {
                                      const fileName = formData.video_file_url.split('/').pop() || 'וידיאו';
                                      return fileName.length > 25 ? fileName.substring(0, 25) + '...' : fileName;
                                    } catch {
                                      return 'וידיאו הועלה';
                                    }
                                  })()}
                                </span>
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
                      </div>
                    )}

                    {/* Course modules */}
                    {formData.product_type === 'course' && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-green-900 flex items-center gap-2">
                          <BookOpen className="w-5 h-5" />
                          מודולי ה{getProductTypeName('course', 'singular')}
                        </h3>
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
                                      <span className="text-sm text-gray-600">
                                        וידיאו: {(() => {
                                          try {
                                            const fileName = module.video_url.split('/').pop() || 'וידיאו';
                                            return fileName.length > 20 ? fileName.substring(0, 20) + '...' : fileName;
                                          } catch {
                                            return 'וידיאו הועלה';
                                          }
                                        })()}
                                      </span>
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
                                <span className="text-sm text-gray-600">
                                  חומר: {(() => {
                                    try {
                                      const fileName = module.material_url.split('/').pop() || 'חומר';
                                      return fileName.length > 20 ? fileName.substring(0, 20) + '...' : fileName;
                                    } catch {
                                      return 'חומר הועלה';
                                    }
                                  })()}
                                </span>
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
                      </div>
                    )}

                    {/* Tool-specific fields */}
                    {formData.product_type === 'tool' && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-orange-900 flex items-center gap-2">
                          <FileText className="w-5 h-5" />
                          הגדרות {getProductTypeName('tool', 'singular')}
                        </h3>
                        <div className="p-4 border rounded-lg bg-orange-50">
                          <p className="text-sm text-orange-700">
                            כלים משתמשים באותם שדות כמו קבצים. ניתן להעלות קבצים, הוסיף תיאור ותמונה.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'form' && (editingProduct || getAvailableProductTypes(enabledProductTypes, canCreateProductType).length > 0) && (
          <div className="flex flex-col sm:flex-row justify-end gap-2 p-6 border-t">
            <Button variant="outline" onClick={handleCancel} className="order-2 sm:order-1">
              ביטול
            </Button>
            <Button 
              onClick={handleSave} 
              className="order-1 sm:order-2"
              disabled={isSaving || isLoadingData}
            >
              <Save className="w-4 h-4 ml-2" />
              {editingProduct ? 'עדכן מוצר' : 'צור מוצר'}
            </Button>
          </div>
        )}
      </div>

      {/* PDF Footer Preview Modal */}
      {formData.product_type === 'file' && editingProduct?.entity_id && (
        <PdfFooterPreview
          isOpen={showFooterPreview}
          onClose={() => setShowFooterPreview(false)}
          onSave={(config) => setFooterConfig(config)}
          fileEntityId={editingProduct.entity_id}
          userRole={currentUser?.role || 'user'}
          initialFooterConfig={footerConfig}
        />
      )}
    </div>
  );
}
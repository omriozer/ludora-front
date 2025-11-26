import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Play, Trash2, Loader2, Eye, UploadIcon } from 'lucide-react';
import SecureVideoPlayer from '@/components/SecureVideoPlayer';
import { getMarketingVideoUrl, getProductImageUrl } from '@/utils/videoUtils.js';
import { fixHebrewFilename } from '@/utils/fileEncodingUtils';

/**
 * MediaAssetsSection - Handles product image and marketing video uploads
 * Only available after product has been saved (has an ID)
 */
export const MediaAssetsSection = ({
  formData,
  updateFormData,
  editingProduct,
  handleFileUpload,
  handleDeleteFile,
  isUploading,
  getUploadProgress,
  marketingVideoExists,
  isAccessible = true,
  accessReason = null
}) => {
  const [marketingVideoType, setMarketingVideoType] = useState(
    formData.marketing_video_type || 'youtube'
  );

  // Track selected filenames for displaying fixed Hebrew filenames
  const [selectedImageName, setSelectedImageName] = useState('');
  const [selectedVideoName, setSelectedVideoName] = useState('');

  // Extract YouTube video ID from various URL formats
  const extractYouTubeId = (url) => {
    if (!url || typeof url !== 'string') return '';

    url = url.trim();

    // Already a video ID (11 characters, alphanumeric + underscore + hyphen)
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
      return url;
    }

    // Various YouTube URL patterns
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/watch\?.*&v=)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return '';
  };

  // Check video states
  const hasUploadedVideo = () => marketingVideoExists;
  const hasYouTubeVideo = () =>
    formData.marketing_video_type === 'youtube' &&
    formData.marketing_video_id &&
    formData.marketing_video_id.trim() !== '';
  const hasAnyMarketingVideo = () => hasUploadedVideo() || hasYouTubeVideo();

  // Handle YouTube video input
  const handleYouTubeInput = (input) => {
    const extractedId = extractYouTubeId(input);
    updateFormData({
      marketing_video_type: 'youtube',
      marketing_video_id: extractedId || input
    });
  };

  // Handle YouTube video removal
  const handleRemoveYouTubeVideo = () => {
    updateFormData({
      marketing_video_type: null,
      marketing_video_id: '',
      marketing_video_title: ''
    });
    setMarketingVideoType('upload');
  };

  // Handle image upload with error handling
  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (file) {
      // Fix Hebrew filename encoding and store for display
      const fixedName = fixHebrewFilename(file.name);
      setSelectedImageName(fixedName);
    } else {
      setSelectedImageName('');
    }

    try {
      const result = await handleFileUpload(event, 'image');
      return result;
    } catch (error) {
      console.error('Image upload error:', error);

      // Clear the file input on error so user can try again
      const fileInput = event.target;
      if (fileInput) {
        fileInput.value = '';
      }
      setSelectedImageName('');

      return { success: false, error: error.message };
    }
  };

  // Handle video upload with error handling
  const handleVideoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (file) {
      // Fix Hebrew filename encoding and store for display
      const fixedName = fixHebrewFilename(file.name);
      setSelectedVideoName(fixedName);
    } else {
      setSelectedVideoName('');
    }

    try {
      const result = await handleFileUpload(event, 'marketing_video');
      return result;
    } catch (error) {
      console.error('Video upload error:', error);

      // Clear the file input on error so user can try again
      const fileInput = document.getElementById('marketing-video-upload');
      if (fileInput) {
        fileInput.value = '';
      }
      setSelectedVideoName('');

      return { success: false, error: error.message };
    }
  };

  // Disabled section component
  const DisabledSectionMessage = ({ title, message, icon: Icon }) => (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Icon className="w-5 h-5 text-gray-400" />
        <Label className="text-sm font-medium text-gray-400">{title}</Label>
      </div>
      <div className="p-4 bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg text-center">
        <div className="flex flex-col items-center gap-2">
          <Icon className="w-8 h-8 text-gray-300" />
          <p className="text-sm text-gray-500 max-w-md">{message}</p>
        </div>
      </div>
    </div>
  );

  if (!isAccessible) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            מדיה ונכסים
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DisabledSectionMessage
            title="מדיה ונכסים"
            message={accessReason || "יש לשמור את המוצר תחילה כדי להעלות קבצי מדיה"}
            icon={Upload}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          מדיה ונכסים
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Image Upload Section */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">תמונה למוצר</Label>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex flex-col gap-2 flex-1">
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isUploading('image')}
                    className="w-full sm:w-auto"
                  />
                  {isUploading('image') && (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600 flex-shrink-0" />
                  )}
                </div>
                {/* Display fixed Hebrew filename if selected */}
                {selectedImageName && isUploading('image') && (
                  <div className="text-xs text-gray-600">
                    <span className="font-medium">תמונה נבחרה:</span> {selectedImageName}
                  </div>
                )}
              </div>

              {formData.has_image && editingProduct && (
                <div className="flex items-center gap-2">
                  <img
                    src={getProductImageUrl(editingProduct)}
                    alt="תצוגה מקדימה"
                    className="w-16 h-16 object-cover rounded flex-shrink-0"
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

          {/* Marketing Video Section */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold flex items-center gap-2">
              <Play className="w-4 h-4" />
              סרטון שיווקי (אופציונלי)
            </h3>

            <div className="p-4 border rounded-lg bg-blue-50">
              {hasAnyMarketingVideo() ? (
                // Show existing video content
                <div className="space-y-4">
                  {hasYouTubeVideo() && (
                    <div className="p-4 border-l-4 border-blue-500 bg-blue-50">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-medium text-blue-700">סרטון יוטיוב קיים</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleRemoveYouTubeVideo}
                          className="text-red-600 border-red-300 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <Input
                        value={formData.marketing_video_type === 'youtube' ? formData.marketing_video_id : ''}
                        onChange={(e) => handleYouTubeInput(e.target.value)}
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
                              style={{ border: 0 }}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {hasUploadedVideo() && editingProduct && (
                    <div className="p-4 border-l-4 border-green-500 bg-green-50">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-medium text-green-700">סרטון מועלה קיים</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteFile('marketing_video')}
                          className="text-red-600 border-red-300 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="mt-2 mb-6">
                        <div className="bg-white p-2 rounded border overflow-hidden">
                          <div className="max-w-full">
                            <SecureVideoPlayer
                              videoUrl={getMarketingVideoUrl(editingProduct)}
                              title={formData.marketing_video_title || "Marketing Video"}
                              className="max-w-full"
                              contentType="marketing"
                            />
                          </div>
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
                    </div>
                  )}
                </div>
              ) : (
                // Show upload/YouTube tabs when no video exists
                <Tabs value={marketingVideoType} onValueChange={setMarketingVideoType}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="upload">העלאת קובץ</TabsTrigger>
                    <TabsTrigger value="youtube">יוטיוב</TabsTrigger>
                  </TabsList>

                  <TabsContent value="upload" className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">העלאת סרטון</Label>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={handleVideoUpload}
                        className="hidden"
                        id="marketing-video-upload"
                      />
                      <label
                        htmlFor="marketing-video-upload"
                        className="flex items-center justify-center w-full p-4 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:border-blue-400 transition-colors bg-white"
                      >
                        {isUploading('marketing_video') ? (
                          <div className="flex items-center gap-2 text-blue-600">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            מעלה... {getUploadProgress('marketing_video') ? `${getUploadProgress('marketing_video')}%` : ''}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-blue-600">
                            <UploadIcon className="w-4 h-4" />
                            לחץ להעלאת סרטון שיווקי
                          </div>
                        )}
                      </label>
                      {/* Display fixed Hebrew filename if selected */}
                      {selectedVideoName && isUploading('marketing_video') && (
                        <div className="text-xs text-gray-600 text-center mt-2">
                          <span className="font-medium">סרטון נבחר:</span> {selectedVideoName}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="youtube" className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">מזהה סרטון יוטיוב</Label>
                      <Input
                        value={formData.marketing_video_type === 'youtube' ? formData.marketing_video_id : ''}
                        onChange={(e) => handleYouTubeInput(e.target.value)}
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
                              style={{ border: 0 }}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              )}

              {/* Video title field - Always visible when there's any video */}
              {(hasAnyMarketingVideo() || marketingVideoType) && (
                <div className="mt-8 pt-6 border-t-2 border-gray-300">
                  <Label className="text-sm font-medium">כותרת הסרטון</Label>
                  <Input
                    value={formData.marketing_video_title || ''}
                    onChange={(e) => updateFormData({ marketing_video_title: e.target.value })}
                    placeholder="כותרת הסרטון להצגה באתר"
                    className="mt-1"
                    disabled={!hasYouTubeVideo() && !marketingVideoExists}
                  />
                  {!hasYouTubeVideo() && !marketingVideoExists && (
                    <p className="text-xs text-gray-500 mt-1">הוסף סרטון כדי להגדיר כותרת</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
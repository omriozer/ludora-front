import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Image as ImageIcon,
  Video,
  Upload,
  Trash2,
  AlertCircle,
  CheckCircle,
  Loader2,
  Play,
  ExternalLink
} from 'lucide-react';
import { getMarketingVideoUrl, getProductImageUrl } from '@/utils/videoUtils.js';
import SecureVideoPlayer from '@/components/SecureVideoPlayer';

/**
 * MarketingSection - Handles all marketing materials
 * Includes product images and marketing videos (YouTube or uploaded)
 */
export const MarketingSection = ({
  formData,
  updateFormData,
  editingProduct,
  handleFileUpload,
  handleDeleteFile,
  isUploading,
  getUploadProgress,
  marketingVideoExists,
  isAccessible,
  accessReason
}) => {
  const [marketingVideoType, setMarketingVideoType] = useState(
    formData.marketing_video_type || 'youtube'
  );

  // Sync video type with form data when editing existing products
  useEffect(() => {
    if (formData.marketing_video_type && formData.marketing_video_type !== marketingVideoType) {
      setMarketingVideoType(formData.marketing_video_type);
    }
  }, [formData.marketing_video_type, marketingVideoType]);

  // Check if marketing video exists
  const hasUploadedVideo = () => {
    return marketingVideoExists;
  };

  const hasYouTubeVideo = () => {
    return formData.marketing_video_type === 'youtube' &&
           formData.marketing_video_id &&
           formData.marketing_video_id.trim() !== '';
  };

  const hasAnyMarketingVideo = () => {
    return hasUploadedVideo() || hasYouTubeVideo();
  };

  // Handle marketing video type change
  const handleMarketingVideoTypeChange = (type) => {
    setMarketingVideoType(type);
    updateFormData({
      marketing_video_type: type,
      marketing_video_id: type === 'youtube' ? formData.marketing_video_id : ''
    });
  };

  // Handle YouTube video ID change
  const handleYouTubeVideoChange = (videoId) => {
    updateFormData({
      marketing_video_id: videoId,
      marketing_video_type: 'youtube'
    });
  };

  // Handle image upload
  const handleImageUpload = async (event) => {
    try {
      const result = await handleFileUpload(event, 'image');
      return result;
    } catch (error) {
      console.error('Image upload error:', error);

      // Clear the file input on error so user can try again
      const fileInput = document.getElementById('product-image-upload');
      if (fileInput) {
        fileInput.value = '';
      }

      return { success: false, error: error.message };
    }
  };

  // Handle video upload
  const handleVideoUpload = async (event) => {
    try {
      const result = await handleFileUpload(event, 'marketing_video');
      if (result?.success) {
        updateFormData({
          marketing_video_type: 'uploaded',
          marketing_video_id: ''
        });
      }
      return result;
    } catch (error) {
      console.error('Video upload error:', error);

      // Clear the file input on error so user can try again
      const fileInput = document.getElementById('marketing-video-upload');
      if (fileInput) {
        fileInput.value = '';
      }

      return { success: false, error: error.message };
    }
  };

  // Handle video deletion
  const handleVideoDelete = async () => {
    try {
      const result = await handleDeleteFile('marketing_video');
      if (result?.success) {
        updateFormData({
          marketing_video_type: 'youtube',
          marketing_video_id: ''
        });
      }
      return result;
    } catch (error) {
      console.error('Video delete error:', error);
      return { success: false, error: error.message };
    }
  };

  if (!isAccessible) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            חומרי שיווק
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{accessReason}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="w-5 h-5" />
          חומרי שיווק
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Product Image */}
          <div>
            <Label className="text-sm font-medium">תמונת מוצר</Label>
            <p className="text-xs text-gray-500 mb-3">
              תמונה ראשית שתוצג בקטלוג המוצרים ובדף המוצר
            </p>

            <div className="space-y-3">
              {/* Current Image Preview */}
              {editingProduct?.has_image && (
                <div className="relative">
                  <img
                    src={getProductImageUrl(editingProduct)}
                    alt="תמונת מוצר נוכחית"
                    className="w-full max-w-md h-48 object-cover rounded-lg border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteFile('image')}
                    className="absolute top-2 right-2"
                    disabled={isUploading('image')}
                    title={isUploading('image') ? "לא ניתן למחוק בזמן העלאה" : "מחק תמונה"}
                  >
                    {isUploading('image') ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              )}

              {/* Upload Image */}
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="product-image-upload"
                  disabled={isUploading('image')}
                />
                <label htmlFor="product-image-upload">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isUploading('image')}
                    className={`cursor-pointer ${isUploading('image') ? 'opacity-50' : ''}`}
                    asChild
                  >
                    <span>
                      {isUploading('image') ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin ml-2" />
                          מעלה...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 ml-2" />
                          {editingProduct?.has_image ? 'החלף תמונה' : 'העלה תמונה'}
                        </>
                      )}
                    </span>
                  </Button>
                </label>
                {isUploading('image') && (
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span className="text-xs text-amber-700">
                      העלאה בתהליך - יש להמתין להשלמה
                    </span>
                  </div>
                )}

                {isUploading('image') && (
                  <div className="flex-1">
                    <div className="bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${getUploadProgress('image')}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {getUploadProgress('image')}% הועלה
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Marketing Video */}
          <div>
            <Label className="text-sm font-medium">סרטון שיווקי</Label>
            <p className="text-xs text-gray-500 mb-3">
              סרטון שיוצג ללקוחות כדי להציג את המוצר (אופציונלי)
            </p>

            <Tabs value={marketingVideoType} onValueChange={handleMarketingVideoTypeChange}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="youtube" className="flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  YouTube
                </TabsTrigger>
                <TabsTrigger value="uploaded" className="flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  העלאה ישירה
                </TabsTrigger>
              </TabsList>

              <TabsContent value="youtube" className="space-y-3">
                <div>
                  <Label className="text-sm font-medium">קישור YouTube</Label>
                  <Input
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=VIDEO_ID או רק VIDEO_ID"
                    value={formData.marketing_video_id || ''}
                    onChange={(e) => handleYouTubeVideoChange(e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    ניתן להדביק קישור מלא או רק את קוד הסרטון
                  </p>
                </div>

                {hasYouTubeVideo() && (
                  <div className="space-y-3">
                    <div className="border rounded-lg p-3 bg-green-50">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-800">סרטון YouTube מוגדר</span>
                      </div>
                      <p className="text-xs text-gray-600">
                        קוד סרטון: {formData.marketing_video_id}
                      </p>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">תצוגה מקדימה</Label>
                      <div className="mt-2 border rounded-lg overflow-hidden relative h-64">
                        <iframe
                          width="100%"
                          height="100%"
                          src={`https://www.youtube.com/embed/${formData.marketing_video_id.trim()}?controls=1&showinfo=0&rel=0`}
                          title={formData.marketing_video_title || "YouTube Video Preview"}
                          style={{ border: 0 }}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="absolute inset-0 rounded"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="uploaded" className="space-y-3">
                {hasUploadedVideo() ? (
                  <div className="space-y-3">
                    <div className="border rounded-lg p-3 bg-green-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-sm text-green-800">סרטון הועלה בהצלחה</span>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleVideoDelete}
                          disabled={isUploading('marketing_video')}
                          className={`text-red-600 border-red-300 hover:bg-red-50 ${isUploading('marketing_video') ? 'opacity-50' : ''}`}
                          title={isUploading('marketing_video') ? "לא ניתן למחוק בזמן העלאה" : "מחק סרטון כדי להוסיף יוטיוב"}
                        >
                          {isUploading('marketing_video') ? (
                            <Loader2 className="w-4 h-4 animate-spin ml-2" />
                          ) : (
                            <Trash2 className="w-4 h-4 ml-2" />
                          )}
                          מחק כדי להוסיף יוטיוב
                        </Button>
                      </div>
                    </div>

                    {editingProduct && (
                      <div>
                        <Label className="text-sm font-medium">תצוגה מקדימה</Label>
                        <div className="mt-2 mb-6">
                          <div className="bg-white p-2 rounded border overflow-hidden">
                            <div className="max-w-full">
                              <SecureVideoPlayer
                                videoUrl={getMarketingVideoUrl(editingProduct)}
                                title={formData.marketing_video_title || "סרטון שיווקי"}
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
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        accept="video/*"
                        onChange={handleVideoUpload}
                        className="hidden"
                        id="marketing-video-upload"
                        disabled={isUploading('marketing_video')}
                      />
                      <label htmlFor="marketing-video-upload">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={isUploading('marketing_video')}
                          className={`cursor-pointer ${isUploading('marketing_video') ? 'opacity-50' : ''}`}
                          asChild
                        >
                          <span>
                            {isUploading('marketing_video') ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin ml-2" />
                                מעלה...
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4 ml-2" />
                                העלה סרטון
                              </>
                            )}
                          </span>
                        </Button>
                      </label>
                      {isUploading('marketing_video') && (
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-600" />
                          <span className="text-xs text-amber-700">
                            העלאה בתהליך - יש להמתין להשלמה
                          </span>
                        </div>
                      )}

                      {isUploading('marketing_video') && (
                        <div className="flex-1">
                          <div className="bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${getUploadProgress('marketing_video')}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {getUploadProgress('marketing_video')}% הועלה
                          </p>
                        </div>
                      )}
                    </div>

                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        העלאת סרטונים עלולה לקחת זמן רב. מומלץ להשתמש ב-YouTube עבור סרטונים ארוכים.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Marketing Video Title */}
            {hasAnyMarketingVideo() && (
              <div className="mt-4">
                <Label className="text-sm font-medium">כותרת הסרטון השיווקי</Label>
                <Input
                  value={formData.marketing_video_title || ''}
                  onChange={(e) => updateFormData({ marketing_video_title: e.target.value })}
                  placeholder="כותרת שתוצג עם הסרטון השיווקי"
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  כותרת אופציונלית שתוצג ללקוחות עם הסרטון השיווקי
                </p>
              </div>
            )}
          </div>

          {/* Marketing Status Summary */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <h4 className="font-medium mb-3">סטטוס חומרי שיווק</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${editingProduct?.has_image ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-sm">
                  {editingProduct?.has_image ? 'יש תמונת מוצר' : 'אין תמונת מוצר'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${hasAnyMarketingVideo() ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-sm">
                  {hasAnyMarketingVideo() ? 'יש סרטון שיווקי' : 'אין סרטון שיווקי'}
                </span>
              </div>
            </div>

            <p className="text-xs text-gray-500 mt-2">
              חומרי שיווק משפרים את הצגת המוצר ויכולים להגדיל מכירות
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
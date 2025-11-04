import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Upload,
  FileText,
  Trash2,
  Loader2,
  AlertCircle,
  ChevronUp,
  ChevronDown,
  Eye,
  Download,
  GripVertical
} from 'lucide-react';
import { apiUploadWithProgress, apiRequest } from '@/services/apiClient';
import { getApiBase } from '@/utils/api';
import { clog, cerror } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import { showConfirm } from '@/utils/messaging';

/**
 * SVGSlideManager - Manages SVG slides for lesson plan presentations
 *
 * Features:
 * - Upload multiple SVG files
 * - Reorder slides with up/down buttons
 * - Delete individual slides
 * - Preview slides
 * - Validates minimum one slide for publishing
 */
const SVGSlideManager = ({
  lessonPlanId,
  slides = [],
  onSlidesChange,
  isReadOnly = false
}) => {
  const [uploadingSlides, setUploadingSlides] = useState(false);
  const [loadingSlides, setLoadingSlides] = useState(false);
  const [reorderingSlides, setReorderingSlides] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });

  // Load slides on mount
  useEffect(() => {
    if (lessonPlanId) {
      loadSlides();
    }
  }, [lessonPlanId]);

  // Load slides from API
  const loadSlides = async () => {
    try {
      setLoadingSlides(true);

      const result = await apiRequest(`/svg-slides/${lessonPlanId}`, {
        method: 'GET'
      });

      if (result.success) {
        onSlidesChange(result.data.slides || []);
      } else {
        throw new Error(result.message || 'Failed to load slides');
      }
    } catch (error) {
      cerror('Error loading SVG slides:', error);
      toast({
        title: "שגיאה בטעינת שקפים",
        description: error.message || "לא ניתן לטעון את השקפים",
        variant: "destructive"
      });
    } finally {
      setLoadingSlides(false);
    }
  };

  // Upload SVG slides with chunked support for large batches
  const handleSlideUpload = async (files) => {
    if (!lessonPlanId) {
      toast({
        title: "שגיאה בהעלאת שקפים",
        description: "לא ניתן להעלות שקפים ללא מזהה תכנית שיעור. אנא שמור את המוצר תחילה.",
        variant: "destructive"
      });
      return;
    }

    const fileArray = Array.from(files);

    // Validate SVG files
    const invalidFiles = fileArray.filter(file => file.type !== 'image/svg+xml');
    if (invalidFiles.length > 0) {
      toast({
        title: "סוג קובץ לא תואם",
        description: "ניתן להעלות רק קבצי SVG (.svg) בלבד",
        variant: "destructive"
      });
      return;
    }

    // Check for large files (over 50MB)
    const oversizedFiles = fileArray.filter(file => file.size > 50 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast({
        title: "קבצים גדולים מדי",
        description: `יש קבצים הגדולים מ-50MB: ${oversizedFiles.map(f => f.name).join(', ')}`,
        variant: "destructive"
      });
      return;
    }

    try {
      setUploadingSlides(true);
      setUploadProgress({ current: 0, total: fileArray.length });

      const CHUNK_SIZE = 10; // Upload in batches of 10 files
      const chunks = [];

      // Split files into chunks
      for (let i = 0; i < fileArray.length; i += CHUNK_SIZE) {
        chunks.push(fileArray.slice(i, i + CHUNK_SIZE));
      }

      const allUploadedSlides = [];
      let uploadedCount = 0;

      // Upload each chunk sequentially
      for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
        const chunk = chunks[chunkIndex];

        try {
          const formData = new FormData();
          chunk.forEach(file => {
            formData.append('slides', file);
          });

          clog(`Uploading chunk ${chunkIndex + 1}/${chunks.length} with ${chunk.length} files`);

          const result = await apiUploadWithProgress(
            `/svg-slides/${lessonPlanId}/upload`,
            formData,
            () => {}, // onProgress - could be used for progress bar later
            'POST'
          );

          if (result.success) {
            allUploadedSlides.push(...(result.data.uploadedSlides || []));
            uploadedCount += chunk.length;
            setUploadProgress({ current: uploadedCount, total: fileArray.length });

            // Small delay between chunks to prevent server overload
            if (chunkIndex < chunks.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          } else {
            throw new Error(`Chunk ${chunkIndex + 1} failed: ${result.message || 'Upload failed'}`);
          }
        } catch (chunkError) {
          cerror(`Error uploading chunk ${chunkIndex + 1}:`, chunkError);
          throw new Error(`שגיאה בהעלאת קבוצת קבצים ${chunkIndex + 1}: ${chunkError.message}`);
        }
      }

      toast({
        title: "שקפים הועלו בהצלחה",
        description: `${allUploadedSlides.length} שקפים מתוך ${fileArray.length} הועלו למצגת`,
        variant: "default"
      });

      // Reload slides to get updated list with proper order
      await loadSlides();
    } catch (error) {
      cerror('Error uploading SVG slides:', error);
      toast({
        title: "שגיאה בהעלאת שקפים",
        description: error.message || "לא ניתן להעלות את השקפים. אנא נסה שנית.",
        variant: "destructive"
      });
    } finally {
      setUploadingSlides(false);
      setUploadProgress({ current: 0, total: 0 });
    }
  };

  // Reorder slides
  const reorderSlides = async (newOrder) => {
    try {
      setReorderingSlides(true);

      const result = await apiRequest(`/svg-slides/${lessonPlanId}/reorder`, {
        method: 'PUT',
        body: JSON.stringify({
          slideOrder: newOrder
        })
      });

      if (result.success) {
        toast({
          title: "שקפים הוזנו מחדש",
          description: "סדר השקפים עודכן בהצלחה",
          variant: "default"
        });

        // Update local state with new order
        onSlidesChange(result.data.slides || []);
      } else {
        throw new Error(result.message || 'Reorder failed');
      }
    } catch (error) {
      cerror('Error reordering slides:', error);
      toast({
        title: "שגיאה בסידור שקפים",
        description: error.message || "לא ניתן לשנות את סדר השקפים",
        variant: "destructive"
      });
    } finally {
      setReorderingSlides(false);
    }
  };

  // Delete slide
  const deleteSlide = async (slideId) => {
    const confirmed = await showConfirm(
      "מחיקת שקף",
      "האם אתה בטוח שברצונך למחוק את השקף? פעולה זו לא ניתנת לביטול.",
      { confirmText: "מחק", cancelText: "ביטול" }
    );

    if (!confirmed) return;

    try {
      const result = await apiRequest(`/svg-slides/${lessonPlanId}/${slideId}`, {
        method: 'DELETE'
      });

      if (result.success) {
        toast({
          title: "שקף נמחק",
          description: "השקף נמחק בהצלחה מהמצגת",
          variant: "default"
        });

        // Update local state
        onSlidesChange(result.data.remainingSlides || []);
      } else {
        throw new Error(result.message || 'Delete failed');
      }
    } catch (error) {
      cerror('Error deleting slide:', error);
      toast({
        title: "שגיאה במחיקת שקף",
        description: error.message || "לא ניתן למחוק את השקף",
        variant: "destructive"
      });
    }
  };

  // Move slide up/down
  const moveSlide = async (slideIndex, direction) => {
    const newIndex = direction === 'up' ? slideIndex - 1 : slideIndex + 1;

    if (newIndex < 0 || newIndex >= slides.length) return;

    const newOrder = [...slides];
    const [movedSlide] = newOrder.splice(slideIndex, 1);
    newOrder.splice(newIndex, 0, movedSlide);

    const slideIds = newOrder.map(slide => slide.id);
    await reorderSlides(slideIds);
  };

  // Validate slides for publishing
  const validateSlides = () => {
    return slides.length >= 1;
  };

  if (loadingSlides) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600 ml-2" />
          <span>טוען שקפים...</span>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <CardHeader className="p-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            <span>שקפי המצגת</span>
            {slides.length > 0 && (
              <span className="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded-full">
                {slides.length} שקפים
              </span>
            )}
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0 space-y-4">
          {/* Upload Section */}
          {!isReadOnly && (
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Upload className="w-5 h-5 text-gray-400" />
                <h4 className="font-medium">העלאת שקפים</h4>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  העלה קבצי SVG שישמשו כשקפי המצגת. תומך בהעלאה של עשרות קבצים בו זמנית.
                </p>
                <p className="text-xs text-blue-700">
                  📄 נתמכים: קבצי SVG (.svg) בלבד | גודל מקסימלי: 50MB לקובץ | העלאה מקבילה של 30+ קבצים
                </p>

                {/* Upload Progress */}
                {uploadingSlides && uploadProgress.total > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>מעלה שקפים...</span>
                      <span>{uploadProgress.current} / {uploadProgress.total}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${(uploadProgress.current / uploadProgress.total) * 100}%`
                        }}
                      ></div>
                    </div>
                  </div>
                )}

                <input
                  type="file"
                  accept=".svg,image/svg+xml"
                  multiple
                  onChange={(e) => {
                    if (e.target.files?.length) {
                      handleSlideUpload(e.target.files);
                      e.target.value = ''; // Reset input
                    }
                  }}
                  className="hidden"
                  id="svg-slide-upload"
                  disabled={uploadingSlides}
                />

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('svg-slide-upload').click()}
                  disabled={uploadingSlides}
                  className="w-full"
                >
                  {uploadingSlides ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin ml-2" />
                      מעלה שקפים...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 ml-2" />
                      העלה שקפי SVG
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Validation Alert */}
          {slides.length === 0 && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertCircle className="w-4 h-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                נדרש לפחות שקף אחד כדי לפרסם את תכנית השיעור
              </AlertDescription>
            </Alert>
          )}

          {/* Slides List */}
          {slides.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">שקפים במצגת ({slides.length})</h4>
                {!validateSlides() && (
                  <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                    חסר שקף אחד לפחות
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {slides.map((slide, index) => (
                  <div
                    key={slide.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg"
                  >
                    {/* Slide Order */}
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium bg-indigo-100 text-indigo-800 px-2 py-1 rounded">
                        {index + 1}
                      </span>
                    </div>

                    {/* Slide Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium truncate">
                          {slide.title || slide.filename || 'שקף ללא שם'}
                        </span>
                        <span className="text-xs text-gray-500">SVG</span>
                      </div>
                      {slide.file_size && (
                        <div className="text-xs text-gray-500 mt-1">
                          {(slide.file_size / 1024).toFixed(1)} KB
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      {/* Preview Button */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          // Open SVG in new window for preview using slide ID
                          const downloadUrl = `${getApiBase()}/assets/download/lesson-plan-slide/${lessonPlanId}/${slide.id}`;
                          window.open(downloadUrl, '_blank');
                        }}
                        title="תצוגה מקדימה"
                      >
                        <Eye className="w-4 h-4 text-blue-600" />
                      </Button>

                      {/* Download Button */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const downloadUrl = `${getApiBase()}/assets/download/lesson-plan-slide/${lessonPlanId}/${slide.id}`;
                          const link = document.createElement('a');
                          link.href = downloadUrl;
                          link.download = slide.filename || 'slide.svg';
                          link.click();
                        }}
                        title="הורד שקף"
                      >
                        <Download className="w-4 h-4 text-green-600" />
                      </Button>

                      {/* Reorder Buttons */}
                      {!isReadOnly && (
                        <>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => moveSlide(index, 'up')}
                            disabled={index === 0 || reorderingSlides}
                            title="העבר למעלה"
                          >
                            <ChevronUp className="w-4 h-4 text-gray-600" />
                          </Button>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => moveSlide(index, 'down')}
                            disabled={index === slides.length - 1 || reorderingSlides}
                            title="העבר למטה"
                          >
                            <ChevronDown className="w-4 h-4 text-gray-600" />
                          </Button>
                        </>
                      )}

                      {/* Delete Button */}
                      {!isReadOnly && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteSlide(slide.id)}
                          title="מחק שקף"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Validation Summary */}
              <div className="text-center pt-2">
                {validateSlides() ? (
                  <div className="text-sm text-green-700 flex items-center justify-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    המצגת מוכנה לפרסום ({slides.length} שקפים)
                  </div>
                ) : (
                  <div className="text-sm text-red-700 flex items-center justify-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    נדרש לפחות שקף אחד לפרסום
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Empty State */}
          {slides.length === 0 && !uploadingSlides && (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-2">עדיין לא הועלו שקפים למצגת</p>
              <p className="text-xs text-gray-400">
                העלה קבצי SVG כדי ליצור את המצגת לתכנית השיעור
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SVGSlideManager;
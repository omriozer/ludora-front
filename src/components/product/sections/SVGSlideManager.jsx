import { useState, useEffect, useCallback } from 'react';
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
  Download
} from 'lucide-react';
import { apiRequest, apiUploadWithProgress } from '@/services/apiClient';
import { getApiBase } from '@/utils/api';
import { ludlog, luderror } from '@/lib/ludlog';
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

  // Enhanced upload state for real-time feedback
  const [uploadSession, setUploadSession] = useState({
    isActive: false,
    files: [], // { file, status: 'pending'|'uploading'|'completed'|'failed', slideData: null, error: null }
    abortController: null,
    startTime: null,
    completedFiles: [],
    failedFiles: []
  });

  // Load slides from API
  const loadSlides = useCallback(async () => {
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
      luderror.ui('Error loading SVG slides:', error);
      toast({
        title: "שגיאה בטעינת שקפים",
        description: error.message || "לא ניתן לטעון את השקפים",
        variant: "destructive"
      });
    } finally {
      setLoadingSlides(false);
    }
  }, [lessonPlanId, onSlidesChange]);

  // Load slides on mount
  useEffect(() => {
    if (lessonPlanId) {
      loadSlides();
    }
  }, [lessonPlanId, loadSlides]);

  // Enhanced upload with real-time individual file feedback and cancel functionality
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

    // Initialize upload session
    const abortController = new AbortController();
    const sessionFiles = fileArray.map(file => ({
      file,
      status: 'pending',
      slideData: null,
      error: null,
      uploadStartTime: null
    }));

    setUploadSession({
      isActive: true,
      files: sessionFiles,
      abortController,
      startTime: Date.now(),
      completedFiles: [],
      failedFiles: []
    });

    setUploadingSlides(true);
    setUploadProgress({ current: 0, total: fileArray.length });

    try {
      // Upload files one by one with real-time updates
      for (let i = 0; i < sessionFiles.length; i++) {
        // Check if upload was cancelled
        if (abortController.signal.aborted) {
          ludlog.media('Upload cancelled by user');
          break;
        }

        const fileData = sessionFiles[i];
        const { file } = fileData;

        // Update file status to uploading
        setUploadSession(prev => ({
          ...prev,
          files: prev.files.map((f, index) =>
            index === i ? { ...f, status: 'uploading', uploadStartTime: Date.now() } : f
          )
        }));

        try {
          // Create FormData for single file
          const formData = new FormData();
          formData.append('slides', file);

          ludlog.media(`Uploading file ${i + 1}/${fileArray.length}: ${file.name}`);

          // Upload individual file with abort signal using apiClient
          const result = await apiUploadWithProgress(`/svg-slides/${lessonPlanId}/upload`, formData, {
            onProgress: null, // No individual file progress callback needed
            signal: abortController.signal
          });

          if (result.success && result.data.uploadedSlides?.length > 0) {
            const slideData = result.data.uploadedSlides[0];

            // Update file status to completed and add to slides
            setUploadSession(prev => {
              const updatedFiles = prev.files.map((f, index) =>
                index === i ? { ...f, status: 'completed', slideData } : f
              );
              return {
                ...prev,
                files: updatedFiles,
                completedFiles: [...prev.completedFiles, { ...fileData, slideData }]
              };
            });

            // Add slide to main slides list immediately
            onSlidesChange(prevSlides => [...prevSlides, slideData]);

            // Update progress
            setUploadProgress({ current: i + 1, total: fileArray.length });

            ludlog.media(`File ${i + 1} uploaded successfully:`, { data: slideData.filename });

          } else {
            throw new Error(result.message || 'Upload failed');
          }

        } catch (fileError) {
          // Check if this was a cancellation
          if (fileError.name === 'AbortError') {
            ludlog.media(`Upload cancelled for file: ${file.name}`);
            break;
          }

          luderror.media(`Error uploading file ${file.name}:`, fileError);

          // Update file status to failed
          setUploadSession(prev => {
            const updatedFiles = prev.files.map((f, index) =>
              index === i ? { ...f, status: 'failed', error: fileError.message } : f
            );
            return {
              ...prev,
              files: updatedFiles,
              failedFiles: [...prev.failedFiles, { ...fileData, error: fileError.message }]
            };
          });

          // Continue with next file instead of stopping entire upload
        }

        // Small delay between files to prevent server overload
        if (i < fileArray.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      // Show completion summary
      const completedCount = uploadSession.completedFiles.length;
      const failedCount = uploadSession.failedFiles.length;

      if (completedCount > 0) {
        toast({
          title: "העלאת שקפים הושלמה",
          description: `${completedCount} שקפים הועלו בהצלחה` +
            (failedCount > 0 ? `, ${failedCount} נכשלו` : ''),
          variant: completedCount === fileArray.length ? "default" : "destructive"
        });
      }

    } catch (error) {
      // Check if this was a cancellation
      if (error.name === 'AbortError') {
        const completedCount = uploadSession.completedFiles.length;
        toast({
          title: "העלאה בוטלה",
          description: completedCount > 0 ?
            `${completedCount} שקפים הועלו לפני הביטול` :
            "לא הועלו שקפים",
          variant: "destructive"
        });
      } else {
        luderror.media('Error during SVG slides upload:', error);
        toast({
          title: "שגיאה בהעלאת שקפים",
          description: error.message || "לא ניתן להעלות את השקפים. אנא נסה שנית.",
          variant: "destructive"
        });
      }
    } finally {
      setUploadingSlides(false);
      setUploadProgress({ current: 0, total: 0 });

      // Reset upload session after a delay to show final status
      setTimeout(() => {
        setUploadSession({
          isActive: false,
          files: [],
          abortController: null,
          startTime: null,
          completedFiles: [],
          failedFiles: []
        });
      }, 3000);
    }
  };

  // Smart cancel upload with cleanup options
  const cancelUpload = async () => {
    if (!uploadSession.abortController || !uploadSession.isActive) return;

    const completedFiles = uploadSession.files.filter(f => f.status === 'completed');
    const uploadingOrPendingFiles = uploadSession.files.filter(f => f.status === 'uploading' || f.status === 'pending');

    // If no files completed yet, simple cancel
    if (completedFiles.length === 0) {
      uploadSession.abortController.abort();
      ludlog.auth('Upload cancelled - no completed files to handle');
      return;
    }

    // Show smart cleanup options dialog
    try {
      const choice = await showCancelUploadDialog(completedFiles.length, uploadingOrPendingFiles.length);

      if (choice === 'keep') {
        // Cancel remaining uploads but keep completed files
        uploadSession.abortController.abort();
        ludlog.auth(`Upload cancelled - keeping ${completedFiles.length} completed files`);

        toast({
          title: "העלאה בוטלה",
          description: `${completedFiles.length} שקפים שהועלו נשמרו, העלאת השאר בוטלה`,
          variant: "default"
        });

      } else if (choice === 'remove') {
        // Cancel uploads and remove all completed files from this session
        uploadSession.abortController.abort();

        toast({
          title: "מוחק קבצים שהועלו...",
          description: "מוחק את הקבצים שהועלו במהלך הפעילות הנוכחית",
          variant: "destructive"
        });

        await removeUploadedFiles(completedFiles);

        ludlog.media(`Upload cancelled - removed ${completedFiles.length} completed files`);

        toast({
          title: "העלאה בוטלה וקבצים נמחקו",
          description: `${completedFiles.length} שקפים שהועלו נמחקו מהמערכת`,
          variant: "destructive"
        });

        // Remove slides from UI
        const slideIds = completedFiles
          .map(f => f.slideData?.id)
          .filter(id => id);

        if (slideIds.length > 0) {
          onSlidesChange(prevSlides =>
            prevSlides.filter(slide => !slideIds.includes(slide.id))
          );
        }

      } // else choice === 'cancel' - do nothing, continue upload

    } catch (error) {
      luderror.media('Error during cancel upload:', error);
      // Fallback to simple cancel
      uploadSession.abortController.abort();
    }
  };

  // Show cancel upload options dialog
  const showCancelUploadDialog = (completedCount, remainingCount) => {
    return new Promise((resolve) => {
      const handleChoice = (choice) => {
        document.getElementById('cancel-upload-dialog').remove();
        resolve(choice);
      };

      // Create modal dialog
      const dialog = document.createElement('div');
      dialog.id = 'cancel-upload-dialog';
      dialog.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';

      dialog.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
          <div class="mb-4">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">ביטול העלאה</h3>
            <p class="text-gray-600 text-sm mb-4">
              ${completedCount} שקפים כבר הועלו בהצלחה. איך להמשיך?
            </p>
            <div class="text-xs text-gray-500 mb-4">
              • שקפים שהועלו: ${completedCount}<br>
              • שקפים שנותרו: ${remainingCount}
            </div>
          </div>

          <div class="space-y-3">
            <button
              id="keep-files-btn"
              class="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              ✅ שמור קבצים שהועלו (מומלץ)
            </button>

            <button
              id="remove-files-btn"
              class="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
            >
              🗑️ מחק את כל הקבצים שהועלו
            </button>

            <button
              id="cancel-dialog-btn"
              class="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            >
              המשך העלאה
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(dialog);

      // Add event listeners
      document.getElementById('keep-files-btn').onclick = () => handleChoice('keep');
      document.getElementById('remove-files-btn').onclick = () => handleChoice('remove');
      document.getElementById('cancel-dialog-btn').onclick = () => handleChoice('cancel');

      // Close on backdrop click
      dialog.onclick = (e) => {
        if (e.target === dialog) handleChoice('cancel');
      };
    });
  };

  // Remove uploaded files from this session
  const removeUploadedFiles = async (completedFiles) => {
    const slideIds = completedFiles
      .map(f => f.slideData?.id)
      .filter(id => id);

    if (slideIds.length === 0) return;

    try {
      // Delete files one by one
      for (const slideId of slideIds) {
        await apiRequest(`/svg-slides/${lessonPlanId}/${slideId}`, {
          method: 'DELETE'
        });
      }

      ludlog.media(`Successfully removed ${slideIds.length} uploaded files`);
    } catch (error) {
      luderror.media('Error removing uploaded files:', error);
      throw error;
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
      luderror.ui('Error reordering slides:', error);
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
      luderror.ui('Error deleting slide:', error);
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

                {/* Enhanced Upload Progress */}
                {uploadSession.isActive && (
                  <div className="space-y-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    {/* Progress Header */}
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                        <span className="font-medium text-blue-900">מעלה שקפים...</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={cancelUpload}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        בטל העלאה
                      </Button>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-blue-700">
                        <span>
                          קובץ {uploadProgress.current} מתוך {uploadProgress.total}
                          {uploadProgress.current > 0 && (
                            <span className="text-green-600 mr-2">
                              ({Math.round((uploadProgress.current / uploadProgress.total) * 100)}%)
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-gray-500">
                          {uploadSession.startTime && (
                            <>זמן עבר: {Math.floor((Date.now() - uploadSession.startTime) / 1000)}s</>
                          )}
                        </span>
                      </div>
                      <div className="w-full bg-blue-100 rounded-full h-3">
                        <div
                          className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                          style={{
                            width: uploadProgress.total > 0
                              ? `${(uploadProgress.current / uploadProgress.total) * 100}%`
                              : '0%'
                          }}
                        ></div>
                      </div>
                    </div>

                    {/* Real-time File Status */}
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {uploadSession.files.map((fileStatus, _index) => (
                        <div
                          key={`${fileStatus.file.name}-${fileStatus.file.size}-${fileStatus.file.lastModified}`}
                          className={`flex items-center gap-2 p-2 rounded text-sm ${
                            fileStatus.status === 'completed' ? 'bg-green-100 text-green-800' :
                            fileStatus.status === 'uploading' ? 'bg-yellow-100 text-yellow-800' :
                            fileStatus.status === 'failed' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {/* Status Icon */}
                          {fileStatus.status === 'completed' && <span className="text-green-600">✓</span>}
                          {fileStatus.status === 'uploading' && <Loader2 className="w-3 h-3 animate-spin text-yellow-600" />}
                          {fileStatus.status === 'failed' && <span className="text-red-600">❌</span>}
                          {fileStatus.status === 'pending' && <span className="text-gray-400">⏳</span>}

                          {/* File Name */}
                          <span className="flex-1 truncate font-medium">
                            {fileStatus.file.name}
                          </span>

                          {/* File Size */}
                          <span className="text-xs opacity-75">
                            {(fileStatus.file.size / 1024).toFixed(1)} KB
                          </span>

                          {/* Status Text */}
                          <span className="text-xs font-medium">
                            {fileStatus.status === 'completed' && 'הושלם'}
                            {fileStatus.status === 'uploading' && 'מעלה...'}
                            {fileStatus.status === 'failed' && 'נכשל'}
                            {fileStatus.status === 'pending' && 'ממתין'}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Upload Summary */}
                    {uploadSession.files.length > 0 && (
                      <div className="pt-2 border-t border-blue-200">
                        <div className="flex justify-between text-xs text-blue-600">
                          <span>
                            הושלמו: {uploadSession.files.filter(f => f.status === 'completed').length}
                          </span>
                          {uploadSession.files.some(f => f.status === 'failed') && (
                            <span className="text-red-600">
                              נכשלו: {uploadSession.files.filter(f => f.status === 'failed').length}
                            </span>
                          )}
                          <span>
                            ממתינים: {uploadSession.files.filter(f => f.status === 'pending').length}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Fallback Progress (for non-session uploads) */}
                {uploadingSlides && !uploadSession.isActive && uploadProgress.total > 0 && (
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
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, Trash2, Loader2, Eye, AlertCircle, Shield, Settings } from 'lucide-react';
import AccessControlEditor from '@/components/admin/AccessControlEditor';
import TemplateSelector from '@/components/product/TemplateSelector';
import VisualTemplateEditor from '@/components/templates/VisualTemplateEditor';

/**
 * FileProductSection - Handles file-specific settings
 * File upload, preview settings, copyright footer, etc.
 */
const FileProductSection = ({
  formData,
  updateFormData,
  editingProduct,
  handleFileUpload,
  handleDeleteFile,
  isUploading,
  getUploadProgress,
  uploadedFileInfo,
  currentUser,
  showFooterPreview,
  setShowFooterPreview
}) => {
  // Access control editor state
  const [showAccessControlEditor, setShowAccessControlEditor] = useState(false);

  const getAcceptAttribute = (fileType) => {
    switch (fileType) {
      case 'file':
        return '.pdf'; // File Products only accept PDF files
      default:
        return '*';
    }
  };

  const getFileTypeConfig = (fileType) => {
    switch (fileType) {
      case 'file':
        return { displayName: 'PDF בלבד' };
      default:
        return { displayName: 'קבצים' };
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-purple-900 flex items-center gap-2">
        העלאת קובץ
      </h3>

      <div className="space-y-2">
        <Label className="text-sm font-medium">העלאת קובץ</Label>

        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept={getAcceptAttribute('file')}
                onChange={(e) => handleFileUpload(e, 'file')}
                disabled={isUploading('file') || !editingProduct}
                className={`w-full sm:w-auto ${(isUploading('file') || !editingProduct) ? 'opacity-50' : ''}`}
                title={!editingProduct ? "יש לשמור את המוצר תחילה" : isUploading('file') ? "העלאה בתהליך" : "העלה קובץ"}
              />
              {isUploading('file') && (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600 flex-shrink-0" />
                  <span className="text-sm font-medium text-blue-600">
                    {getUploadProgress('file') || 0}%
                  </span>
                </div>
              )}
              {!editingProduct && (
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span className="text-xs text-amber-700">
                    יש לשמור המוצר תחילה
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar for File Upload */}
          {isUploading('file') && getUploadProgress('file') < 100 && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">מעלה קובץ...</span>
                <span className="text-sm font-medium text-blue-600">
                  {getUploadProgress('file') || 0}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${getUploadProgress('file') || 0}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Display current file */}
          {(uploadedFileInfo?.exists && !isUploading('file')) && (
            <div className="flex items-center gap-2 mt-2">
              <Download className="w-4 h-4 text-green-600 flex-shrink-0" />
              <span className="text-sm text-green-700">
                {uploadedFileInfo.filename && uploadedFileInfo.filename.length > 30
                  ? uploadedFileInfo.filename.substring(0, 30) + '...'
                  : uploadedFileInfo.filename || 'קובץ הועלה בהצלחה'}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteFile('file')}
                  disabled={editingProduct?.is_published || formData.is_published}
                  className={`${(editingProduct?.is_published || formData.is_published) ? 'opacity-50' : ''}`}
                  title={editingProduct?.is_published || formData.is_published ? "לא ניתן למחוק קובץ ממוצר מפורסם - ניתן להחליף בלבד" : "מחק קובץ"}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                {(editingProduct?.is_published || formData.is_published) && (
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span className="text-xs text-amber-700">
                      מוצר מפורסם - החלפה בלבד
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {!editingProduct && (
            <div className="text-sm text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200 mt-2">
              ⚠️ יש לשמור את המוצר תחילה (ללא קובץ) על מנת להעלות קבצים. לחץ על "צור מוצר", ולאחר מכן תוכל להעלות את הקובץ.
            </div>
          )}

          <div className="text-xs text-gray-500 mt-2">
            סוגי קבצים נתמכים: {getFileTypeConfig('file')?.displayName || 'PDF בלבד'}
          </div>
        </div>

        {/* Allow Preview Toggle - Only for PDF files with uploaded file */}
        {uploadedFileInfo?.exists && formData.file_type === 'pdf' && (
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium text-gray-900">לאפשר תצוגה מקדימה</Label>
              <p className="text-xs text-gray-500">
                כאשר מופעל, משתמשים יוכלו לצפות בתצוגה מקדימה של קובץ ה-PDF לפני הרכישה
              </p>
            </div>
            <Switch
              checked={formData.allow_preview}
              onCheckedChange={(checked) => {
                updateFormData({ allow_preview: checked });
                // Clear watermark settings when preview is disabled
                if (!checked) {
                  updateFormData({
                    watermark_template_id: null,
                    watermark_settings: null
                  });
                }
              }}
            />
          </div>
        )}

        {/* Preview Summary - Only for PDF files with uploaded file and when preview is enabled */}
        {uploadedFileInfo?.exists && formData.file_type === 'pdf' && formData.allow_preview && (
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <h4 className="font-medium text-yellow-900">שימו לב</h4>
            </div>
            <p className="text-sm text-yellow-800 mb-3">
              כאשר תצוגה מקדימה מופעלת, משתמשים ללא גישה יוכלו לצפות בעמודים שנבחרו בלבד.
              תוכן שמוגבל יוחלף בעמוד החלפה המציין שהתוכן מוגבל.
            </p>

            {/* Current Settings Summary */}
            <div className="space-y-2">
              <div className="text-sm">
                <span className="font-medium text-yellow-900">עמודים זמינים: </span>
                <span className="text-yellow-800">
                  {formData.accessible_pages && formData.accessible_pages.length > 0
                    ? `${formData.accessible_pages.length} עמודים (${formData.accessible_pages.join(', ')})`
                    : 'כל הקובץ זמין'
                  }
                </span>
              </div>

              {formData.watermark_template_id && (
                <div className="text-sm">
                  <span className="font-medium text-yellow-900">סימני מים: </span>
                  <span className="text-yellow-800">מופעלים לתוכן מוגבל</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Selective Access Control - Only for PDF files with uploaded file and when preview is enabled */}
        {uploadedFileInfo?.exists && formData.file_type === 'pdf' && formData.allow_preview && (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium text-purple-900 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  בקרת גישה וסימני מים
                </Label>
                <p className="text-xs text-purple-700">
                  נהל איזה דפים זמינים בתצוגה מקדימה והוסף סימני מים לתוכן מוגבל
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAccessControlEditor(!showAccessControlEditor)}
                className="border-purple-300 text-purple-700 hover:bg-purple-100"
              >
                <Settings className="w-4 h-4 ml-2" />
                {showAccessControlEditor ? 'הסתר הגדרות' : 'נהל גישה'}
              </Button>
            </div>

            {/* Access Control Editor */}
            {showAccessControlEditor && (
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                {/* Page Selection */}
                <AccessControlEditor
                  entityType="file"
                  entityId={editingProduct?.entity_id}
                  onUpdate={(updatedEntity) => {
                    // Update the form data with the new access control settings
                    updateFormData({
                      accessible_pages: updatedEntity.accessible_pages,
                      watermark_template_id: updatedEntity.watermark_template_id
                    });
                  }}
                />
              </div>
            )}

          </div>
        )}

        {/* Template Selection - For PDF files only */}
        {uploadedFileInfo?.exists && formData.file_type === 'pdf' && (
          <div className="space-y-4">
            <h4 className="text-md font-semibold text-gray-900 border-b border-gray-200 pb-2">
              עיצוב ומיתוג הקובץ
            </h4>

            {/* Branding Template */}
            <TemplateSelector
              entityType="file"
              entityId={editingProduct?.entity_id}
              templateType="branding"
              targetFormat="pdf-a4-portrait" // TODO: Detect format from file
              currentTemplateId={formData.branding_template_id}
              customTemplateData={formData.branding_settings}
              enabled={formData.add_branding || false}
              onTemplateChange={(templateId, templateData) => {
                updateFormData({ branding_template_id: templateId });
              }}
              onCustomTemplateChange={(customData) => {
                updateFormData({ branding_settings: customData });
              }}
              onEnabledChange={(enabled) => {
                updateFormData({ add_branding: enabled });
              }}
              fileExists={uploadedFileInfo?.exists}
              userRole={currentUser?.role}
            />
          </div>
        )}

        {/* File type display (auto-detected) */}
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
    </div>
  );
};

export default FileProductSection;
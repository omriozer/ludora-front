import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

        {/* Access Control and Watermarks - Only for PDF files with uploaded file and when preview is enabled */}
        {uploadedFileInfo?.exists && formData.file_type === 'pdf' && formData.allow_preview && (
          <div className="space-y-3">
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium text-purple-900 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  בקרת גישה וסימני מים
                </Label>
                <p className="text-xs text-purple-700">
                  נהל איזה דפים זמינים בתצוגה מקדימה והוסף סימני מים לתוכן מוגבל
                </p>
              </div>
            </div>

            {/* Access Control Editor - Always visible when preview is enabled */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <AccessControlEditor
                entityType="file"
                entityId={editingProduct?.entity_id}
                currentUser={currentUser} // Pass current user for email template resolution
                fileEntity={{
                  ...editingProduct,
                  target_format: formData.target_format || editingProduct?.target_format
                }} // Pass file entity for template filtering and context
                onUpdate={(updatedEntity) => {
                  // Update the form data with the new access control settings
                  updateFormData({
                    accessible_pages: updatedEntity.accessible_pages,
                    watermark_template_id: updatedEntity.watermark_template_id
                  });
                }}
              />
            </div>
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
              targetFormat={formData.target_format || 'pdf-a4-portrait'}
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
              currentUser={currentUser} // Pass full user object for email resolution
              fileEntity={{
                ...editingProduct,
                target_format: formData.target_format || editingProduct?.target_format
              }}
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

        {/* File format display (for PDFs) */}
        {formData.file_type === 'pdf' && formData.target_format && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">כיוון הקובץ (זוהה אוטומטית)</Label>
            <div className="p-2 bg-blue-50 rounded border border-blue-200 text-sm text-blue-700 flex items-center gap-2">
              {formData.target_format === 'pdf-a4-portrait' && (
                <>
                  <span className="text-lg">📄</span>
                  PDF אנכי (Portrait)
                </>
              )}
              {formData.target_format === 'pdf-a4-landscape' && (
                <>
                  <span className="text-lg">📋</span>
                  PDF אופקי (Landscape)
                </>
              )}
              {formData.target_format === 'svg-lessonplan' && (
                <>
                  <span className="text-lg">📐</span>
                  תבנית SVG למצגת
                </>
              )}
              {formData.target_format === 'unknown' && (
                <>
                  <span className="text-lg">❓</span>
                  כיוון לא זוהה
                </>
              )}
            </div>
          </div>
        )}

        {/* Manual format selection (for PDFs) */}
        {formData.file_type === 'pdf' && uploadedFileInfo?.exists && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">שינוי כיוון קובץ (ידני)</Label>
            <div className="space-y-2">
              <Select
                value={formData.target_format || 'pdf-a4-portrait'}
                onValueChange={(value) => {
                  updateFormData({ target_format: value });
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="בחר כיוון קובץ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf-a4-portrait">
                    <div className="flex items-center gap-2">
                      <span>📄</span>
                      <span>PDF אנכי (Portrait)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="pdf-a4-landscape">
                    <div className="flex items-center gap-2">
                      <span>📋</span>
                      <span>PDF אופקי (Landscape)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="svg-lessonplan">
                    <div className="flex items-center gap-2">
                      <span>📐</span>
                      <span>תבנית SVG למצגת</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="unknown">
                    <div className="flex items-center gap-2">
                      <span>❓</span>
                      <span>כיוון לא ידוע</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                שינוי הכיוון ישפיע על התבניות הזמינות במיתוג וסימני המים
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileProductSection;
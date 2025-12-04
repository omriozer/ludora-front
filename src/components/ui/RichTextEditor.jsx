import React, { useMemo } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import '@/styles/richTextEditor.css';
import { Label } from '@/components/ui/label';

/**
 * RichTextEditor - A reusable rich text editor component for product descriptions
 * Features: Bold, italic, underline, font sizes, colors, lists, links
 * Includes Hebrew RTL support and proper accessibility
 */
export const RichTextEditor = ({
  value = '',
  onChange,
  placeholder = 'הוסף תיאור מפורט...',
  className = '',
  error = false,
  disabled = false,
  label,
  required = false,
  minHeight = '150px',
  ...props
}) => {
  // Quill modules configuration
  const modules = useMemo(() => ({
    toolbar: [
      // Text formatting
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline'],

      // Text styling
      [{ 'color': [] }, { 'background': [] }],

      // Lists and alignment
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'align': [] }],

      // Links and utilities
      ['link'],
      ['clean'] // Remove formatting
    ]
  }), []);

  // Quill formats configuration
  const formats = useMemo(() => [
    'header',
    'bold', 'italic', 'underline',
    'color', 'background',
    'list', 'bullet',
    'align',
    'link'
  ], []);

  // Handle value changes
  const handleChange = (content, delta, source, editor) => {
    if (onChange) {
      // Get HTML content
      const htmlContent = editor.getHTML();
      onChange(htmlContent);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <Label className="text-sm font-medium">
          {label}
          {required && <span className="text-red-500 mr-1">*</span>}
        </Label>
      )}

      <div className={`rich-text-editor-container ${error ? 'border-red-500' : ''}`}>
        <ReactQuill
          value={value}
          onChange={handleChange}
          modules={modules}
          formats={formats}
          placeholder={placeholder}
          readOnly={disabled}
          style={{
            minHeight: minHeight,
            direction: 'rtl' // Hebrew RTL support
          }}
          theme="snow"
          {...props}
        />
      </div>
    </div>
  );
};

export default RichTextEditor;
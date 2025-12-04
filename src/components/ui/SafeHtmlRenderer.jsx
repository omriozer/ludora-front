import React from 'react';
import DOMPurify from 'dompurify';

/**
 * SafeHtmlRenderer - A secure component for rendering HTML content
 * Uses DOMPurify to sanitize HTML and prevent XSS attacks
 * Supports rich text formatting while maintaining security
 */
export const SafeHtmlRenderer = ({
  htmlContent = '',
  className = '',
  fallbackText = '',
  preserveLineBreaks = true,
  allowedTags = [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'span', 'div',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'a', 'blockquote',
    'sub', 'sup'
  ],
  allowedAttributes = {
    'a': ['href', 'title'],
    'span': ['style'],
    'div': ['style'],
    'p': ['style'],
    'strong': ['style'],
    'em': ['style'],
    'u': ['style'],
    'h1': ['style'],
    'h2': ['style'],
    'h3': ['style'],
    'h4': ['style'],
    'h5': ['style'],
    'h6': ['style']
  },
  ...props
}) => {
  // Configure DOMPurify
  const createSafeHtml = (content) => {
    if (!content || typeof content !== 'string') {
      return fallbackText;
    }

    // Handle plain text with line breaks if needed
    let processedContent = content;
    if (preserveLineBreaks && !content.includes('<')) {
      // Convert plain text line breaks to HTML
      processedContent = content.replace(/\n/g, '<br>');
    }

    // Sanitize HTML content
    const sanitized = DOMPurify.sanitize(processedContent, {
      ALLOWED_TAGS: allowedTags,
      ALLOWED_ATTR: Object.keys(allowedAttributes).reduce((acc, tag) => {
        allowedAttributes[tag].forEach(attr => {
          if (!acc.includes(attr)) acc.push(attr);
        });
        return acc;
      }, []),
      ALLOW_DATA_ATTR: false,
      FORBID_SCRIPT: true,
      FORBID_STYLE: false, // Allow style attribute for colors and formatting
      KEEP_CONTENT: true,
    });

    return sanitized;
  };

  const safeHtml = createSafeHtml(htmlContent);

  // If content is empty after sanitization, show fallback
  if (!safeHtml || safeHtml.trim() === '') {
    return fallbackText ? (
      <div className={`text-gray-500 italic ${className}`} {...props}>
        {fallbackText}
      </div>
    ) : null;
  }

  return (
    <div
      className={`rich-text-content ${className}`}
      style={{ direction: 'rtl', textAlign: 'right' }} // Hebrew RTL support
      dangerouslySetInnerHTML={{ __html: safeHtml }}
      {...props}
    />
  );
};

/**
 * Utility function to check if content has rich formatting
 */
export const hasRichContent = (content) => {
  if (!content || typeof content !== 'string') return false;
  return content.includes('<') && content.includes('>');
};

/**
 * Utility function to extract plain text from HTML content
 */
export const extractPlainText = (htmlContent) => {
  if (!htmlContent || typeof htmlContent !== 'string') return '';

  // Create a temporary div to extract text content
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = DOMPurify.sanitize(htmlContent);
  return tempDiv.textContent || tempDiv.innerText || '';
};

export default SafeHtmlRenderer;
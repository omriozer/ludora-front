/**
 * File Encoding Utilities
 *
 * Utilities for fixing filename encoding issues, particularly for Hebrew filenames
 * that are corrupted when read from browser File objects.
 *
 * CRITICAL: This matches the backend encoding fix logic in routes/entities.js
 */

import { luderror } from '@/lib/ludlog';

/**
 * Detects if a filename contains Hebrew encoding corruption
 *
 * Common corruption patterns when Hebrew UTF-8 is misinterpreted as Latin-1:
 * - × (multiplication sign)
 * - Ã (A with tilde)
 * - � (replacement character)
 * - Other Latin-1 misinterpretations of Hebrew characters
 *
 * @param {string} filename - The filename to check
 * @returns {boolean} - True if corruption is detected
 */
export function hasHebrewEncodingCorruption(filename) {
  if (!filename || typeof filename !== 'string') {
    return false;
  }

  // Check for common corruption patterns
  return (
    filename.includes('×') ||
    filename.includes('Ã') ||
    filename.includes('�') ||
    // Additional corruption patterns for Hebrew UTF-8 misread as Latin-1
    filename.includes('×') || // Common in Hebrew misencoding
    filename.includes('×™') || // Hebrew letters often appear like this
    filename.includes('×"') ||
    filename.includes('×§')
  );
}

/**
 * Fixes Hebrew filename encoding corruption
 *
 * CRITICAL: This implements the same logic as backend routes/entities.js
 *
 * When browser File object reads Hebrew filenames, they're often misinterpreted:
 * 1. Filename is UTF-8 encoded (correct Hebrew characters)
 * 2. Browser reads it as Latin-1 (Windows-1252)
 * 3. Results in corrupted display with ×, Ã, etc.
 *
 * Fix: Re-interpret the corrupted Latin-1 string as UTF-8
 *
 * @param {string} filename - The potentially corrupted filename
 * @returns {string} - Fixed filename, or original if no corruption detected
 */
export function fixHebrewFilename(filename) {
  if (!filename || typeof filename !== 'string') {
    return filename;
  }

  // Check if corruption is present
  if (!hasHebrewEncodingCorruption(filename)) {
    return filename;
  }

  try {
    // Convert string to bytes assuming Latin-1 encoding
    const bytes = new Uint8Array(filename.length);
    for (let i = 0; i < filename.length; i++) {
      bytes[i] = filename.charCodeAt(i) & 0xFF; // Extract byte value
    }

    // Decode bytes as UTF-8
    const decoder = new TextDecoder('utf-8');
    const fixedFilename = decoder.decode(bytes);

    // Verify the fix produced Hebrew characters
    // Hebrew Unicode range: U+0590 to U+05FF
    if (/[\u0590-\u05FF]/.test(fixedFilename)) {
      return fixedFilename;
    }

    // If no Hebrew characters detected, return original
    return filename;
  } catch (error) {
    luderror.file('Error fixing Hebrew filename encoding:', error);
    return filename;
  }
}

/**
 * Extracts and fixes filename from File object
 *
 * Use this function when handling file input change events to get
 * correctly encoded filenames for display.
 *
 * @param {File} file - Browser File object from input element
 * @returns {string} - Fixed filename for display
 */
export function getDisplayFilename(file) {
  if (!file || !file.name) {
    return '';
  }

  return fixHebrewFilename(file.name);
}

/**
 * Helper to extract filename without extension
 *
 * @param {string} filename - The filename
 * @returns {string} - Filename without extension
 */
export function getFilenameWithoutExtension(filename) {
  if (!filename || typeof filename !== 'string') {
    return '';
  }

  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex === -1 || lastDotIndex === 0) {
    return filename;
  }

  return filename.substring(0, lastDotIndex);
}

/**
 * Helper to extract file extension
 *
 * @param {string} filename - The filename
 * @returns {string} - File extension (including dot), or empty string
 */
export function getFileExtension(filename) {
  if (!filename || typeof filename !== 'string') {
    return '';
  }

  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex === -1 || lastDotIndex === 0) {
    return '';
  }

  return filename.substring(lastDotIndex);
}

/**
 * Test cases for Hebrew filename encoding fix
 *
 * These demonstrate common corruption patterns:
 */
export const TEST_CASES = {
  // Example corrupted filenames that should be fixed
  corrupted: [
    'שלום.pdf',                  // May appear as: '×©×œ×•×.pdf'
    'תרגיל_1.docx',              // May appear as: '×ª×¨×'×™×œ_1.docx'
    'מבחן_סופי.xlsx',            // May appear as: '×××—×_×¡×•×¤×™.xlsx'
  ],

  // Example filenames that should remain unchanged
  clean: [
    'hello.pdf',
    'document_123.docx',
    'worksheet-final.xlsx',
  ]
};

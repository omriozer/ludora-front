/**
 * Frontend timezone utilities for Israel timezone handling
 *
 * Simplified timezone handling that works with the backend's Israel timezone logic.
 * Since the backend now handles Israel timezone correctly, the frontend mainly needs
 * to display dates properly and handle browser-side comparisons correctly.
 */

import { format, parseISO } from "date-fns";
import { he } from "date-fns/locale";

const ISRAEL_TIMEZONE = 'Asia/Jerusalem';

/**
 * Get current time adjusted for Israel timezone comparison
 * @returns {Date} Current time for Israel timezone comparison
 */
export function nowInIsrael() {
  const now = new Date();

  // Get current time formatted in Israel timezone
  const israelTimeString = now.toLocaleString('sv-SE', {
    timeZone: ISRAEL_TIMEZONE
  });

  // Parse it back to a Date object
  return new Date(israelTimeString);
}

/**
 * Check if a date is expired according to Israel timezone
 * @param {Date|string} expirationDate - Date to check
 * @returns {boolean} True if expired, false otherwise
 */
export function isExpired(expirationDate) {
  if (!expirationDate) return false;

  const parsedExpiry = typeof expirationDate === 'string' ? parseISO(expirationDate) : expirationDate;
  const now = nowInIsrael();

  // Convert expiry date to Israel timezone for comparison
  const expiryIsraelString = parsedExpiry.toLocaleString('sv-SE', {
    timeZone: ISRAEL_TIMEZONE
  });
  const expiryInIsrael = new Date(expiryIsraelString);

  return expiryInIsrael < now;
}

/**
 * Format date for display using date-fns
 * @param {Date|string} date - Date to format
 * @param {string} formatString - Format string (default: 'dd/MM/yyyy')
 * @returns {string} Formatted date string
 */
export function formatForDisplay(date, formatString = 'dd/MM/yyyy') {
  if (!date) return null;
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  return format(parsedDate, formatString, { locale: he });
}

/**
 * Format date specifically in Israel timezone for display
 * @param {Date|string} date - Date to format
 * @param {string} formatString - Format string (default: 'dd/MM/yyyy')
 * @returns {string} Formatted date string in Israel timezone
 */
export function formatInIsraelTimezone(date, formatString = 'dd/MM/yyyy') {
  if (!date) return null;

  const parsedDate = typeof date === 'string' ? parseISO(date) : date;

  // Format the date in Israel timezone
  const israelDateString = parsedDate.toLocaleDateString('en-CA', {
    timeZone: ISRAEL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  // Convert to dd/MM/yyyy format for Hebrew display
  if (formatString === 'dd/MM/yyyy') {
    const [year, month, day] = israelDateString.split('-');
    return `${day}/${month}/${year}`;
  }

  // For other formats, create a Date object and use date-fns
  const israelTime = new Date(parsedDate.toLocaleString('sv-SE', {
    timeZone: ISRAEL_TIMEZONE
  }));

  return format(israelTime, formatString, { locale: he });
}

/**
 * Get timezone information for debugging
 * @returns {Object} Timezone information
 */
export function getTimezoneInfo() {
  const now = new Date();
  const nowInIsraelTz = nowInIsrael();

  return {
    browserTime: now.toISOString(),
    israelTime: nowInIsraelTz.toISOString(),
    timezone: ISRAEL_TIMEZONE,
    browserOffset: now.getTimezoneOffset(),
    israelLocalTime: now.toLocaleString('sv-SE', { timeZone: ISRAEL_TIMEZONE }),
    israelFormatted: now.toLocaleDateString('he-IL', {
      timeZone: ISRAEL_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  };
}
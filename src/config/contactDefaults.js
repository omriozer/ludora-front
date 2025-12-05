// Fallback contact information for when settings are not available
// Used primarily in maintenance pages and error scenarios
export const FALLBACK_CONTACT_EMAIL = 'support@ludora.app';
export const FALLBACK_CONTACT_PHONE = '+972529593382';

// Helper functions to validate contact information
export const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

export const isValidPhone = (phone) => {
  if (!phone || typeof phone !== 'string') return false;
  // Remove common separators and check if it contains digits
  const cleanPhone = phone.replace(/[\s\-\(\)\+]/g, '');
  return cleanPhone.length >= 10 && /^\d+$/.test(cleanPhone);
};

// Get contact information with fallbacks
export const getContactEmail = (settings) => {
  return (settings?.contact_email && isValidEmail(settings.contact_email))
    ? settings.contact_email
    : FALLBACK_CONTACT_EMAIL;
};

export const getContactPhone = (settings) => {
  return (settings?.contact_phone && isValidPhone(settings.contact_phone))
    ? settings.contact_phone
    : FALLBACK_CONTACT_PHONE;
};

// Generate WhatsApp and email URLs
export const getWhatsAppUrl = (phone, message = '') => {
  // Clean phone number by removing formatting characters
  let cleanPhone = phone.replace(/[\s\-\(\)\+]/g, '');

  // If phone starts with 0, remove it (Israeli local format)
  if (cleanPhone.startsWith('0')) {
    cleanPhone = cleanPhone.substring(1);
  }

  // Add Israel country code if not already present
  if (!cleanPhone.startsWith('972')) {
    cleanPhone = '972' + cleanPhone;
  }

  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}${message ? `?text=${encodedMessage}` : ''}`;
};

export const getEmailUrl = (email, subject = '', body = '') => {
  const params = new URLSearchParams();
  if (subject) params.append('subject', subject);
  if (body) params.append('body', body);
  const queryString = params.toString();
  return `mailto:${email}${queryString ? `?${queryString}` : ''}`;
};
// Import functions from apiClient.js (our new API client)
import {
  applyCoupon,
  updateExistingRegistrations,
  sendRegistrationEmail,
  createPayplusPaymentPage,
  processEmailTriggers,
  scheduleEmailProcessor,
  triggerEmailAutomation,
  updateExistingGames,
  uploadVerbsBulk,
  cleanupStaticTexts,
  deleteFile,
  createSignedUrl,
  initializeSystemEmailTemplates,
  updateSystemEmailTemplates,
  sendInvitationEmails
} from './apiClient.js';

// Re-export all functions
export {
  applyCoupon,
  updateExistingRegistrations,
  sendRegistrationEmail,
  createPayplusPaymentPage,
  processEmailTriggers,
  scheduleEmailProcessor,
  triggerEmailAutomation,
  updateExistingGames,
  uploadVerbsBulk,
  cleanupStaticTexts,
  deleteFile,
  createSignedUrl,
  initializeSystemEmailTemplates,
  updateSystemEmailTemplates,
  sendInvitationEmails
};


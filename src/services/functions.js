// Import functions from apiClient.js (our new API client)
import {
  testPayplusConnection,
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
  testPayplusConnection,
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


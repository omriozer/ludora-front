// src/services/apiClient.js
// REST API client for Ludora API server

import { getApiBase } from '@/utils/api.js';
import { clog, cerror } from '@/lib/utils';
import { showError } from '@/utils/messaging';

// Use centralized API base configuration
const API_BASE = getApiBase();

// Store authentication token in memory
let authToken = null;

export async function getCurrentUser() {
  return apiRequest('/auth/me');
}

export async function login({ email, password }) {
  const response = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  
  if (response.token) {
    authToken = response.token;
    localStorage.setItem('authToken', response.token);
  }
  
  return response;
}

export async function loginWithFirebase({ idToken }) {
  const response = await apiRequest('/auth/verify', {
    method: 'POST',
    body: JSON.stringify({ idToken })
  });
  
  if (response.valid && response.token) {
    authToken = response.token;
    localStorage.setItem('authToken', response.token);
  }
  
  return response;
}

export async function logout() {
  authToken = null;
  localStorage.removeItem('authToken');
  return apiRequest('/auth/logout', {
    method: 'POST'
  });
}

// Initialize auth token from localStorage on app start
if (typeof localStorage !== 'undefined') {
  authToken = localStorage.getItem('authToken');
}

// Generic API request helper with authentication
export async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;

  clog(`🌐 API Request: ${options.method || 'GET'} ${url}`);
  clog('📊 API Base:', API_BASE);
  clog('🔑 Auth Token:', authToken ? `${authToken.substring(0, 20)}...` : 'None');

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  // Add auth token if available
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const defaultOptions = {
    credentials: 'include',
    headers
  };

  clog('📤 Request headers:', headers);
  clog('📤 Request options:', { ...defaultOptions, ...options });

  try {
    const response = await fetch(url, { ...defaultOptions, ...options });
    clog(`📥 Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      cerror('❌ API Error:', error);

      // Log validation details if available
      if (error.details && Array.isArray(error.details)) {
        cerror('📋 Validation Details:', error.details);
      }

      const errorMessage = typeof error.error === 'string' ? error.error :
                        error.message ||
                        JSON.stringify(error) ||
                        `API request failed: ${response.status}`;
      throw new Error(errorMessage);
    }

    const data = await response.json();
    clog('✅ API Response:', data);
    return data;
  } catch (error) {
    cerror('🚫 API Request Failed:', error);

    // Show user-friendly error for network failures
    if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('Failed to fetch')) {
      showError(
        "בעיית חיבור",
        "לא הצלחנו להתחבר לשרת. אנא בדוק את החיבור לאינטרנט ונסה שוב."
      );
    }

    throw error;
  }
}

// File download helper - returns blob instead of JSON
export async function apiDownload(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;

  clog(`📥 API Download: ${options.method || 'GET'} ${url}`);
  clog('📊 API Base:', API_BASE);
  clog('🔑 Auth Token:', authToken ? `${authToken.substring(0, 20)}...` : 'None');

  const headers = {
    ...options.headers
  };

  // Add auth token if available
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const defaultOptions = {
    credentials: 'include',
    headers
  };

  clog('📤 Download headers:', headers);

  try {
    const response = await fetch(url, { ...defaultOptions, ...options });
    clog(`📥 Download response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      cerror('❌ Download Error:', error);

      const errorMessage = typeof error.error === 'string' ? error.error :
                        error.message ||
                        JSON.stringify(error) ||
                        `Download failed: ${response.status}`;
      throw new Error(errorMessage);
    }

    const blob = await response.blob();
    clog('✅ Download successful, blob size:', blob.size, 'type:', blob.type);
    return blob;
  } catch (error) {
    cerror('🚫 Download Failed:', error);

    // Show user-friendly error for network failures
    if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('Failed to fetch')) {
      toast({
        title: "בעיית הורדה",
        description: "לא הצלחנו להוריד את הקובץ. אנא נסה שוב.",
        variant: "destructive",
      });
    }

    throw error;
  }
}

// File/video upload with progress tracking
export async function apiUploadWithProgress(endpoint, formData, onProgress = null, options = {}) {
  const url = `${API_BASE}${endpoint}`;

  clog(`📤 API Upload with progress: POST ${url}`);
  clog('📊 API Base:', API_BASE);
  clog('🔑 Auth Token:', authToken ? `${authToken.substring(0, 20)}...` : 'None');

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track upload progress
    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          clog(`📊 Upload progress: ${percentComplete}%`);
          onProgress(percentComplete);
        }
      });
    }

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          clog('✅ Upload successful:', response);
          resolve(response);
        } catch (e) {
          cerror('❌ Invalid response format:', e);
          reject(new Error('Invalid response format'));
        }
      } else {
        cerror(`❌ Upload failed: ${xhr.status}`, xhr.responseText);
        try {
          const errorData = JSON.parse(xhr.responseText);
          const errorMessage = errorData.error || errorData.message || `Upload failed with status: ${xhr.status}`;
          reject(new Error(errorMessage));
        } catch (e) {
          reject(new Error(`Upload failed with status: ${xhr.status}`));
        }
      }
    });

    xhr.addEventListener('error', () => {
      cerror('❌ Network error during upload');
      toast({
        title: "בעיית העלאה",
        description: "שגיאת רשת במהלך העלאת הקובץ. אנא נסה שוב.",
        variant: "destructive",
      });
      reject(new Error('Network error during upload'));
    });

    xhr.addEventListener('timeout', () => {
      cerror('❌ Upload timeout');
      toast({
        title: "העלאה נכשלה",
        description: "העלאת הקובץ ארכה זמן רב מדי. אנא נסה שוב.",
        variant: "destructive",
      });
      reject(new Error('Upload timeout'));
    });

    // Set timeout (default 30 minutes for large video files)
    xhr.timeout = options.timeout || (30 * 60 * 1000);

    xhr.open('POST', url, true);

    // Add auth token
    if (authToken) {
      xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
    }

    // Add custom headers (but NOT Content-Type - let browser set it with boundary for multipart)
    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        if (key.toLowerCase() !== 'content-type') {
          xhr.setRequestHeader(key, value);
        }
      });
    }

    clog('📤 Sending upload request...');
    xhr.send(formData);
  });
}

// Entity CRUD operations class
class EntityAPI {
  constructor(entityName) {
    this.entityName = entityName;
    this.basePath = `/entities/${entityName}`;
  }

  async find(query = {}) {
    const searchParams = new URLSearchParams(query);
    const queryString = searchParams.toString();
    const endpoint = queryString ? `${this.basePath}?${queryString}` : this.basePath;
    return apiRequest(endpoint);
  }

  // Add filter method as an alias to find for compatibility
  async filter(query = {}, options = null) {
    const searchParams = new URLSearchParams(query);
    
    // Handle different option formats
    if (options) {
      if (options.order) {
        // If options has an order property, stringify it as sort parameter
        searchParams.set('sort', JSON.stringify(options.order));
      } else if (typeof options === 'string' || Array.isArray(options)) {
        // If options is a simple string or array, use it directly
        searchParams.set('sort', Array.isArray(options) ? JSON.stringify(options) : options);
      }
      
      // Handle other options like limit, offset
      if (options.limit) {
        searchParams.set('limit', options.limit.toString());
      }
      if (options.offset) {
        searchParams.set('offset', options.offset.toString());
      }
    }
    
    const queryString = searchParams.toString();
    const endpoint = queryString ? `${this.basePath}?${queryString}` : this.basePath;
    return apiRequest(endpoint);
  }

  async findById(id) {
    return apiRequest(`${this.basePath}/${id}`);
  }

  async create(data) {
    return apiRequest(this.basePath, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async update(id, data) {
    return apiRequest(`${this.basePath}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async delete(id) {
    return apiRequest(`${this.basePath}/${id}`, {
      method: 'DELETE'
    });
  }

  async bulk(operation, data) {
    return apiRequest(`${this.basePath}/bulk`, {
      method: 'POST',
      body: JSON.stringify({ operation, data })
    });
  }

  // Add list method for backward compatibility
  async list(sortOrQuery = {}) {
    // Handle legacy sort parameter (string) or query object
    if (typeof sortOrQuery === 'string') {
      // Legacy format: list('-created_date') or list('name')
      const sortField = sortOrQuery.startsWith('-') ? sortOrQuery.substring(1) : sortOrQuery;
      const sortDirection = sortOrQuery.startsWith('-') ? 'DESC' : 'ASC';

      // Map common field names
      const fieldMapping = {
        'created_date': 'created_at',
        'updated_date': 'updated_at'
      };

      const mappedField = fieldMapping[sortField] || sortField;

      return this.find({}, { order: [[mappedField, sortDirection]] });
    } else {
      // New format: list({ field: 'value' })
      return this.find(sortOrQuery);
    }
  }
}

// Entity APIs
export const Registration = new EntityAPI('registration');
export const EmailTemplate = new EntityAPI('emailtemplate');
export const Settings = new EntityAPI('settings');
export const Category = new EntityAPI('category');
export const Coupon = new EntityAPI('coupon');
export const SupportMessage = new EntityAPI('supportmessage');
export const Notification = new EntityAPI('notification');

// New dedicated entity types
export const Product = new EntityAPI('product');
export const Workshop = new EntityAPI('workshop');
export const Course = new EntityAPI('course');
export const File = new EntityAPI('file');
export const Tool = new EntityAPI('tool');

export const Purchase = new EntityAPI('purchase');
export const EmailLog = new EntityAPI('emaillog');
export const Game = new EntityAPI('game');
export const AudioFile = new EntityAPI('audiofile');
export const GameAudioSettings = new EntityAPI('gameaudiosettings');
export const Word = new EntityAPI('word');
export const WordEN = new EntityAPI('worden');
export const Image = new EntityAPI('image');
export const QA = new EntityAPI('qa');
export const Grammar = new EntityAPI('grammar');
export const ContentList = new EntityAPI('contentlist');

// Add custom method to ContentList
ContentList.getContentItems = async function(listId) {
  clog(`🔍 Attempting to load content items for list ID: ${listId}`);

  // Note: The /entities/contentlist/:id/items endpoint doesn't exist in the backend
  // So we'll throw an error immediately to trigger the relationship-based fallback
  clog(`⚠️ ContentList.getContentItems: /items endpoint not implemented, will use relationship fallback`);
  throw new Error('ContentList items endpoint not implemented - using relationship fallback');
};
export const ContentRelationship = new EntityAPI('contentrelationship');
export const SubscriptionPlan = new EntityAPI('subscriptionplan');
export const WebhookLog = new EntityAPI('webhooklog');
export const PendingSubscription = new EntityAPI('pendingsubscription');
export const SubscriptionHistory = new EntityAPI('subscriptionhistory');
export const GameSession = new EntityAPI('gamesession');
export const Attribute = new EntityAPI('attribute');
export const GameContentTag = new EntityAPI('gamecontenttag');
export const ContentTag = new EntityAPI('contenttag');
export const School = new EntityAPI('school');
export const Classroom = new EntityAPI('classroom');
export const StudentInvitation = new EntityAPI('studentinvitation');
export const ParentConsent = new EntityAPI('parentconsent');
export const ClassroomMembership = new EntityAPI('classroommembership');

// User entity API with auth methods
const UserEntityAPI = new EntityAPI('user');

// Firebase auth integration for login with redirect
async function loginWithFirebaseAuth() {
  try {
    // Import Firebase auth dynamically to avoid issues if not available
    const { initializeApp } = await import('firebase/app');
    const { getAuth, signInWithRedirect, GoogleAuthProvider, getRedirectResult } = await import('firebase/auth');
    
    // Firebase config from environment variables
    const firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID
    };

    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const provider = new GoogleAuthProvider();

    // Check for redirect result first
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      const idToken = await result.user.getIdToken();
      return await loginWithFirebase({ idToken });
    }

    // If no redirect result, trigger redirect
    await signInWithRedirect(auth, provider);
    
  } catch (error) {
    cerror('Firebase login error:', error);

    // Show user-friendly error message
    toast({
      title: "שגיאה בהתחברות",
      description: "לא הצלחנו להתחבר עם Google. אנא נסה שוב.",
      variant: "destructive",
    });

    throw new Error('שגיאה בהתחברות עם Google');
  }
}

export const User = {
  ...UserEntityAPI,
  findById: UserEntityAPI.findById.bind(UserEntityAPI), // Ensure findById is exposed
  update: UserEntityAPI.update.bind(UserEntityAPI), // Ensure update is exposed
  getCurrentUser,
  login: loginWithFirebaseAuth, // Use Firebase auth for login
  loginWithRedirect: loginWithFirebaseAuth, // Alias for compatibility
  logout,
  // Alias for compatibility
  me: getCurrentUser,
  filter: UserEntityAPI.find.bind(UserEntityAPI),
  // Add updateMyUserData method for content creator signup
  async updateMyUserData(data) {
    return apiRequest('/auth/update-profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
};

// Function APIs
export async function sendPaymentConfirmation(data) {
  return apiRequest('/functions/sendPaymentConfirmation', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function testPayplusConnection(data) {
  return apiRequest('/functions/testPayplusConnection', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function applyCoupon(data) {
  return apiRequest('/functions/applyCoupon', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updateExistingRegistrations(data) {
  return apiRequest('/functions/updateExistingRegistrations', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function sendRegistrationEmail(data) {
  return apiRequest('/functions/sendRegistrationEmail', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function handlePayplusCallback(data) {
  return apiRequest('/functions/handlePayplusCallback', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function createPayplusPaymentPage(data) {
  return apiRequest('/functions/createPayplusPaymentPage', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function checkPaymentStatus(data) {
  return apiRequest('/functions/checkPaymentStatus', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function handlePayplusProductCallback(data) {
  return apiRequest('/functions/handlePayplusProductCallback', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function processEmailTriggers(data) {
  return apiRequest('/functions/processEmailTriggers', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function scheduleEmailProcessor(data) {
  return apiRequest('/functions/scheduleEmailProcessor', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function triggerEmailAutomation(data) {
  return apiRequest('/functions/triggerEmailAutomation', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updateExistingGames(data) {
  return apiRequest('/functions/updateExistingGames', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function uploadVerbsBulk(data) {
  return apiRequest('/functions/uploadVerbsBulk', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function cleanupStaticTexts(data) {
  return apiRequest('/functions/cleanupStaticTexts', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function createPayplusSubscriptionPage(data) {
  return apiRequest('/functions/createPayplusSubscriptionPage', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function handlePayplusSubscriptionCallback(data) {
  return apiRequest('/functions/handlePayplusSubscriptionCallback', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function testCallback(data) {
  return apiRequest('/functions/testCallback', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function checkSubscriptionStatus(data) {
  return apiRequest('/functions/checkSubscriptionStatus', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function processSubscriptionCallbacks(data) {
  return apiRequest('/functions/processSubscriptionCallbacks', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function getPayplusRecurringStatus(data) {
  return apiRequest('/functions/getPayplusRecurringStatus', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function cancelPayplusRecurringSubscription(data) {
  return apiRequest('/functions/cancelPayplusRecurringSubscription', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function deleteFile(data) {
  return apiRequest('/functions/deleteFile', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function createSignedUrl(data) {
  return apiRequest('/functions/createSignedUrl', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function initializeSystemEmailTemplates(data) {
  return apiRequest('/functions/initializeSystemEmailTemplates', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updateSystemEmailTemplates(data) {
  return apiRequest('/functions/updateSystemEmailTemplates', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function sendInvitationEmails(data) {
  return apiRequest('/functions/sendInvitationEmails', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

// Integration APIs
export const Core = {
  InvokeLLM: async (data) => apiRequest('/integrations/invokeLLM', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  SendEmail: async (data) => apiRequest('/integrations/sendEmail', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  UploadFile: async (data) => {
    const formData = new FormData();
    
    // Handle file upload
    if (data.file) {
      formData.append('file', data.file);
    }
    
    // Add other form fields
    Object.keys(data).forEach(key => {
      if (key !== 'file') {
        formData.append(key, data[key]);
      }
    });
    
    return apiRequest('/integrations/uploadFile', {
      method: 'POST',
      body: formData,
      headers: {} // Remove Content-Type header to let browser set multipart boundary
    });
  },
  GenerateImage: async (data) => apiRequest('/integrations/generateImage', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  ExtractDataFromUploadedFile: async (data) => {
    const formData = new FormData();
    
    if (data.file) {
      formData.append('file', data.file);
    }
    
    Object.keys(data).forEach(key => {
      if (key !== 'file') {
        formData.append(key, data[key]);
      }
    });
    
    return apiRequest('/integrations/extractDataFromUploadedFile', {
      method: 'POST',
      body: formData,
      headers: {}
    });
  },
  CreateFileSignedUrl: async (data) => apiRequest('/integrations/createFileSignedUrl', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  UploadPrivateFile: async (data) => {
    const formData = new FormData();
    
    if (data.file) {
      formData.append('file', data.file);
    }
    
    Object.keys(data).forEach(key => {
      if (key !== 'file') {
        formData.append(key, data[key]);
      }
    });
    
    return apiRequest('/integrations/uploadPrivateFile', {
      method: 'POST',
      body: formData,
      headers: {}
    });
  }
};

export const InvokeLLM = Core.InvokeLLM;
export const SendEmail = Core.SendEmail;
export const UploadFile = Core.UploadFile;
export const GenerateImage = Core.GenerateImage;
export const ExtractDataFromUploadedFile = Core.ExtractDataFromUploadedFile;
export const CreateFileSignedUrl = Core.CreateFileSignedUrl;
export const UploadPrivateFile = Core.UploadPrivateFile;

// Add more user-related API calls as needed

// ---
// Required .env variables (example):
// VITE_API_BASE=https://api.example.com
// VITE_FIREBASE_API_KEY=...
// VITE_FIREBASE_AUTH_DOMAIN=...
// VITE_FIREBASE_PROJECT_ID=...
// VITE_FIREBASE_STORAGE_BUCKET=...
// VITE_FIREBASE_MESSAGING_SENDER_ID=...
// VITE_FIREBASE_APP_ID=...
// VITE_FIREBASE_MEASUREMENT_ID=...
// ---

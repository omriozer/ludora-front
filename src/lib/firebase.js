// Firebase configuration and initialization
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { clog, cerror } from '@/lib/utils';
import { config } from '@/config/environment';

// Debug environment variables using centralized config (development only)
if (import.meta.env.DEV) {
  clog('🔍 Environment:', config.environment);
  clog('🔍 Firebase Project ID:', config.firebase.projectId);
}

// Firebase configuration from centralized environment config
const firebaseConfig = config.firebase;

// Initialize Firebase
let app;
let auth;
let googleProvider;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();

  // Configure Google provider
  googleProvider.addScope('email');
  googleProvider.addScope('profile');

  if (import.meta.env.DEV) {
    clog('✅ Firebase initialized successfully');
  }
} catch (error) {
  cerror('❌ Firebase initialization error:', error);
  cerror('🔧 Please check your Firebase environment variables in .env.development');
}

// Firebase Auth functions
export const firebaseAuth = {
  // Sign in with Google
  signInWithGoogle: async () => {
    if (!auth || !googleProvider) {
      throw new Error('Firebase not initialized. Please check your configuration.');
    }
    
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      
      return {
        user: result.user,
        idToken,
        credential: result.credential
      };
    } catch (error) {
      cerror('Google sign-in error:', error);
      throw error;
    }
  },

  // Sign out
  signOut: async () => {
    if (!auth) {
      throw new Error('Firebase not initialized');
    }
    
    try {
      await signOut(auth);
      if (import.meta.env.DEV) {
        clog('✅ Firebase sign out successful');
      }
    } catch (error) {
      cerror('Firebase sign out error:', error);
      throw error;
    }
  },

  // Get current user's ID token
  getCurrentUserToken: async () => {
    if (!auth?.currentUser) {
      return null;
    }
    
    try {
      return await auth.currentUser.getIdToken();
    } catch (error) {
      cerror('Error getting user token:', error);
      return null;
    }
  },

  // Get current user
  getCurrentUser: () => {
    return auth?.currentUser || null;
  },

  // Listen to auth state changes
  onAuthStateChanged: (callback) => {
    if (!auth) {
      cerror('Firebase auth not initialized');
      return () => {};
    }

    return auth.onAuthStateChanged(callback);
  }
};

export { auth, googleProvider };
export default app;
// Firebase configuration and initialization
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { clog, cerror } from '@/lib/utils';

// Debug environment variables
clog('🔍 All import.meta.env:', import.meta.env);
clog('🔍 VITE_FIREBASE_API_KEY:', import.meta.env.VITE_FIREBASE_API_KEY);
clog('🔍 VITE_FIREBASE_PROJECT_ID:', import.meta.env.VITE_FIREBASE_PROJECT_ID);

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
let app;
let auth;
let googleProvider;

try {
  clog('🔥 Firebase config being used:', firebaseConfig);

  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();

  // Configure Google provider
  googleProvider.addScope('email');
  googleProvider.addScope('profile');

  clog('✅ Firebase initialized successfully');
  clog('🔑 Auth object:', auth);
  clog('🔑 Google Provider:', googleProvider);
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
      clog('✅ Firebase sign out successful');
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
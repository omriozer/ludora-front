// Firebase configuration and initialization
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

// Debug environment variables
console.log('🔍 All import.meta.env:', import.meta.env);
console.log('🔍 VITE_FIREBASE_API_KEY:', import.meta.env.VITE_FIREBASE_API_KEY);
console.log('🔍 VITE_FIREBASE_PROJECT_ID:', import.meta.env.VITE_FIREBASE_PROJECT_ID);

// Firebase configuration - temporarily hardcoded to test
const firebaseConfig = {
  apiKey: "AIzaSyCvc0KGxsYCu61pOwBSJ3tzdCs7lUT28JI",
  authDomain: "ludora-af706.firebaseapp.com",
  projectId: "ludora-af706",
  storageBucket: "ludora-af706.firebasestorage.app",
  messagingSenderId: "985814078486",
  appId: "1:985814078486:web:45bbbd97327171c94ad137",
  measurementId: "G-THZ32X92VY"
};

// Firebase configuration from environment variables (commented out for now)
// const firebaseConfig = {
//   apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
//   authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
//   projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
//   storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
//   messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
//   appId: import.meta.env.VITE_FIREBASE_APP_ID,
//   measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
// };

// Initialize Firebase
let app;
let auth;
let googleProvider;

try {
  console.log('🔥 Firebase config being used:', firebaseConfig);
  
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
  
  // Configure Google provider
  googleProvider.addScope('email');
  googleProvider.addScope('profile');
  
  console.log('✅ Firebase initialized successfully');
  console.log('🔑 Auth object:', auth);
  console.log('🔑 Google Provider:', googleProvider);
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
  console.warn('🔧 Please check your Firebase environment variables in .env.development');
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
      console.error('Google sign-in error:', error);
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
      console.log('✅ Firebase sign out successful');
    } catch (error) {
      console.error('Firebase sign out error:', error);
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
      console.error('Error getting user token:', error);
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
      console.warn('Firebase auth not initialized');
      return () => {};
    }
    
    return auth.onAuthStateChanged(callback);
  }
};

export { auth, googleProvider };
export default app;
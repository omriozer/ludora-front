import React, { createContext, useContext } from 'react';
import { useAuthErrorHandler } from '@/hooks/useAuthErrorHandler';

const AuthErrorContext = createContext();

/**
 * Global Auth Error Provider
 *
 * Provides auth error handling functionality throughout the app
 * Should be wrapped around the entire app to catch auth errors globally
 */
export function AuthErrorProvider({ children }) {
  const authErrorHandler = useAuthErrorHandler();

  return (
    <AuthErrorContext.Provider value={authErrorHandler}>
      {children}
    </AuthErrorContext.Provider>
  );
}

/**
 * Hook to use the global auth error handler
 * This allows any component to easily handle auth errors
 */
export function useGlobalAuthErrorHandler() {
  const context = useContext(AuthErrorContext);
  if (!context) {
    throw new Error('useGlobalAuthErrorHandler must be used within an AuthErrorProvider');
  }
  return context;
}

export default AuthErrorProvider;
import { useState, createContext, useContext, useRef } from 'react';
import { cerror } from '@/lib/utils';

const LoginModalContext = createContext();

export function LoginModalProvider({ children }) {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const loginCallbackRef = useRef(null);
  const [modalMessage, setModalMessage] = useState('');

  const openLoginModal = (callback, message = '') => {
    loginCallbackRef.current = callback;
    setModalMessage(message);
    setShowLoginModal(true);
  };

  const closeLoginModal = () => {
    setShowLoginModal(false);
    // DON'T clear the callback ref here - let executeCallback() handle it
    setModalMessage('');
  };

  const executeCallback = () => {
    if (loginCallbackRef.current) {
      const callback = loginCallbackRef.current;
      loginCallbackRef.current = null; // Clear it after storing locally
      try {
        callback();
      } catch (error) {
        cerror('Error executing login callback:', error);
      }
    }
  };

  return (
    <LoginModalContext.Provider value={{
      showLoginModal,
      openLoginModal,
      closeLoginModal,
      executeCallback,
      modalMessage
    }}>
      {children}
    </LoginModalContext.Provider>
  );
}

export function useLoginModal() {
  const context = useContext(LoginModalContext);
  if (!context) {
    throw new Error('useLoginModal must be used within a LoginModalProvider');
  }
  return context;
}
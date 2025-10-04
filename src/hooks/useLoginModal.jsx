import { useState, createContext, useContext } from 'react';

const LoginModalContext = createContext();

export function LoginModalProvider({ children }) {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginCallback, setLoginCallback] = useState(null);

  const openLoginModal = (callback = null) => {
    setLoginCallback(() => callback); // Wrap in function to store function reference
    setShowLoginModal(true);
  };

  const closeLoginModal = () => {
    setShowLoginModal(false);
    setLoginCallback(null);
  };

  const executeCallback = () => {
    if (loginCallback && typeof loginCallback === 'function') {
      loginCallback();
      setLoginCallback(null);
    }
  };

  return (
    <LoginModalContext.Provider value={{
      showLoginModal,
      openLoginModal,
      closeLoginModal,
      executeCallback
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
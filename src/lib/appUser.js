// utils/appUser.js
// Utility functions for user/settings logic in Layout

export async function loadSettingsWithRetry(Settings, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await Settings.find();
    } catch (error) {
      if (error.response?.status === 429 && i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      } else {
        throw error;
      }
    }
  }
  throw new Error('Failed to load settings after multiple retries.');
}

export async function handleLogout({ myApiLogout, setCurrentUser, navigate, createPageUrl }) {
  localStorage.removeItem('impersonating_user_id');
  localStorage.removeItem('impersonating_admin_id');
  await myApiLogout();
  setCurrentUser(null);
  navigate(createPageUrl("/"));
}

export async function handleLogin({ myApiLogin, getCurrentUser, setCurrentUser, setMessage }) {
  try {
    await myApiLogin();
    const user = await getCurrentUser();
    setCurrentUser(user);
  } catch (error) {
    setMessage({ type: 'error', text: 'שגיאה בכניסה. נסו שוב.' });
  }
}
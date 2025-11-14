// Utility to handle user authentication with impersonation support
import { User } from "@/services/entities";
import { clog, cerror } from "@/lib/utils";

export const getCurrentUser = async () => {
  // Check if we're in impersonation mode
  const impersonatingUserId = localStorage.getItem('impersonating_user_id');
  const impersonatingAdminId = localStorage.getItem('impersonating_admin_id');
  
  if (impersonatingUserId && impersonatingAdminId) {
    // We're impersonating - return the impersonated user
    clog('Loading impersonated user:', impersonatingUserId);
    try {
      const impersonatedUser = await User.get(impersonatingUserId);
      // Add a flag to indicate this is an impersonated session
      impersonatedUser._isImpersonated = true;
      impersonatedUser._originalAdminId = impersonatingAdminId;
      clog('Loaded impersonated user:', impersonatedUser.email);
      return impersonatedUser;
    } catch (error) {
      cerror('Error loading impersonated user, clearing impersonation:', error);
      // If we can't load the impersonated user, clear impersonation
      localStorage.removeItem('impersonating_user_id');
      localStorage.removeItem('impersonating_admin_id');
    }
  }
  
  // Normal authentication flow
  return await User.me();
};
// Centralized file access logic and utilities

import { format } from "date-fns";
import { he } from "date-fns/locale";

// Same logic as Files.jsx for checking active access
export const hasActiveAccess = (purchase) => {
  if (!purchase) return false;
  // null access_expires_at = lifetime access
  if (!purchase.access_expires_at) return true;
  // future access_expires_at = has access
  if (purchase.access_expires_at && new Date(purchase.access_expires_at) > new Date()) return true;
  return false;
};

// Get user purchase for a file - same logic as Files.jsx
export const getUserPurchaseForFile = (fileId, userPurchases) => {
  return userPurchases.find(purchase =>
    ((purchase.purchasable_type === 'file' && purchase.purchasable_id === fileId) ||
     (purchase.product_id === fileId)) && // Backwards compatibility
    (purchase.payment_status === 'completed' || purchase.payment_status === 'paid') // Support both statuses
  );
};

// Get file access status information
export const getFileAccessStatus = (userPurchase) => {
  if (!userPurchase || !hasActiveAccess(userPurchase)) {
    return {
      hasAccess: false,
      statusText: null,
      statusType: null
    };
  }

  const texts = {
    owned: "ברשותך",
    lifetimeAccess: "גישה לכל החיים",
    accessUntil: "גישה עד"
  };

  let statusText = texts.owned;
  let statusDetail = null;

  if (!userPurchase.access_expires_at) {
    statusDetail = texts.lifetimeAccess; // null = lifetime access
  } else if (userPurchase.access_expires_at) {
    statusDetail = `${texts.accessUntil} ${format(new Date(userPurchase.access_expires_at), 'dd/MM/yyyy', { locale: he })}`;
  }

  return {
    hasAccess: true,
    statusText,
    statusDetail,
    statusType: 'success'
  };
};

// Get button text based on access status
export const getFileButtonText = (hasAccess) => {
  return hasAccess ? "צפיה בקובץ" : "רכישת קובץ";
};
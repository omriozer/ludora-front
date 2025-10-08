// Centralized file access logic and utilities

import { format } from "date-fns";
import { he } from "date-fns/locale";

// Same logic as Files.jsx for checking active access
export const hasActiveAccess = (purchase) => {
  if (!purchase) return false;
  if (purchase.purchased_lifetime_access) return true;
  if (purchase.access_until && new Date(purchase.access_until) > new Date()) return true;
  if (!purchase.access_until && !purchase.purchased_lifetime_access) {
    return true; // Backwards compatibility
  }
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

  if (userPurchase.purchased_lifetime_access) {
    statusDetail = texts.lifetimeAccess;
  } else if (userPurchase.access_until) {
    statusDetail = `${texts.accessUntil} ${format(new Date(userPurchase.access_until), 'dd/MM/yyyy', { locale: he })}`;
  } else {
    statusDetail = texts.lifetimeAccess; // Backwards compatibility
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
// Centralized product access logic and utilities for all product types

import { format } from "date-fns";
import { he } from "date-fns/locale";
import { getProductTypeName } from "@/config/productTypes";

// Same logic as Files.jsx for checking active access
export const hasActiveAccess = (purchase) => {
  if (!purchase) return false;
  // null access_expires_at = lifetime access
  if (!purchase.access_expires_at) return true;
  // future access_expires_at = has access
  if (purchase.access_expires_at && new Date(purchase.access_expires_at) > new Date()) return true;
  return false;
};

// Get product access status information
export const getProductAccessStatus = (userPurchase) => {
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

// Get button text based on access status and product type
export const getProductButtonText = (hasAccess, productType = 'file') => {
  if (hasAccess) {
    switch (productType) {
      case 'file':
        return "צפיה בקובץ";
      case 'tool':
        return "פתח כלי";
      case 'workshop':
        return "צפייה בהדרכה";
      case 'course':
        return "המשך קורס";
      case 'game':
        return "שחק עכשיו";
      default:
        return `צפייה ב${getProductTypeName(productType, 'singular')}`;
    }
  } else {
    switch (productType) {
      case 'file':
        return "רכישת קובץ";
      case 'tool':
        return "רכישת כלי";
      case 'workshop':
        return "הרשמה להדרכה";
      case 'course':
        return "רכישת קורס";
      case 'game':
        return "רכישת משחק";
      default:
        return `רכישת ${getProductTypeName(productType, 'singular')}`;
    }
  }
};

// Legacy function for backward compatibility
export const getFileButtonText = (hasAccess) => {
  return getProductButtonText(hasAccess, 'file');
};

// Legacy function for backward compatibility
export const getFileAccessStatus = (userPurchase) => {
  return getProductAccessStatus(userPurchase);
};
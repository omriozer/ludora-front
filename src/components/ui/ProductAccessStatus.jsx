// ProductAccessStatus component - centralized access status display for all product types
import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle } from "lucide-react";
import { useProductAccess } from "@/hooks/useProductAccess";
import { getProductAccessStatus } from "@/utils/productAccessUtils";

export default function ProductAccessStatus({
  product,
  userPurchases = [],
  variant = "catalogCard", // "catalogCard" or "productDetails"
  className = ""
}) {
  const { hasAccess, purchase } = useProductAccess(product, userPurchases);
  const accessStatus = getProductAccessStatus(purchase);

  if (!accessStatus.hasAccess) {
    return null;
  }

  // Different styling based on variant
  const getStatusStyles = () => {
    if (variant === "productDetails") {
      return "mb-6 border-green-200 bg-green-50 max-w-2xl mx-auto";
    } else {
      return "text-sm text-green-600 bg-green-50 p-2 rounded-lg mb-3";
    }
  };

  if (variant === "productDetails") {
    return (
      <Alert className={`${getStatusStyles()} ${className}`}>
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          <div className="font-medium">{accessStatus.statusText}</div>
          <div className="text-xs mt-1">{accessStatus.statusDetail}</div>
        </AlertDescription>
      </Alert>
    );
  }

  // Catalog card styling
  return (
    <div className={`${getStatusStyles()} ${className}`}>
      <div className="font-medium">{accessStatus.statusText}</div>
      <div className="text-xs">{accessStatus.statusDetail}</div>
    </div>
  );
}
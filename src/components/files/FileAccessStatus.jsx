// FileAccessStatus component - centralized access status display
import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle } from "lucide-react";
import { useProductAccess } from "@/hooks/useProductAccess";
import { getFileAccessStatus } from "./fileAccessUtils";

export default function FileAccessStatus({
  file,
  userPurchases = [],
  variant = "files", // "files" or "productDetails"
  className = ""
}) {
  const { hasAccess, purchase } = useProductAccess({
    id: file.id,
    entity_id: file.id,
    product_type: 'file'
  }, userPurchases);
  const accessStatus = getFileAccessStatus(purchase);

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

  // Files page styling
  return (
    <div className={`${getStatusStyles()} ${className}`}>
      <div className="font-medium">{accessStatus.statusText}</div>
      <div className="text-xs">{accessStatus.statusDetail}</div>
    </div>
  );
}
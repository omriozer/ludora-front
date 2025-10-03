// GetFileButton component - centralized file access button logic
import React from "react";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import { getApiBase } from "@/utils/api";
import { apiDownload } from "@/services/apiClient";
import { hasActiveAccess, getUserPurchaseForFile, getFileButtonText } from "./fileAccessUtils";

export default function GetFileButton({
  file,
  userPurchases = [],
  currentUser,
  onPurchase,
  variant = "files", // "files" or "productDetails"
  size = "sm",
  className = ""
}) {
  // Get user purchase and access status using centralized logic
  const userPurchase = getUserPurchaseForFile(file.id, userPurchases);
  const hasAccess = hasActiveAccess(userPurchase);
  const buttonText = getFileButtonText(hasAccess);

  // Handle file access - using apiDownload for secure authenticated downloads
  const handleFileAccess = async (file) => {
    if (!file.id) return;

    try {
      // Use apiDownload to get blob with auth headers
      const blob = await apiDownload(`/assets/download/file/${file.id}`);

      // Create blob URL and trigger download
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');

      // Clean up blob URL after a delay
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  // Handle purchase redirect - same logic as Files.jsx
  const handlePurchaseClick = () => {
    if (onPurchase) {
      onPurchase(file);
    } else {
      // Default purchase logic
      const url = `/purchase?type=file&id=${file.id}`;
      window.location.href = url;
    }
  };

  // Different styling based on variant
  const getButtonStyles = () => {
    if (variant === "productDetails") {
      if (hasAccess) {
        return "w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-4 text-lg font-semibold rounded-2xl shadow-lg transform hover:scale-105 transition-all duration-300";
      } else {
        return "w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-4 text-lg font-semibold rounded-2xl shadow-lg transform hover:scale-105 transition-all duration-300";
      }
    } else {
      // Files page styling
      if (hasAccess) {
        return "bg-purple-600 hover:bg-purple-700 text-white";
      } else {
        return "bg-purple-600 hover:bg-purple-700 text-white";
      }
    }
  };

  return (
    <Button
      onClick={hasAccess ? () => handleFileAccess(file) : handlePurchaseClick}
      className={`${getButtonStyles()} ${className}`}
      size={size}
    >
      {!hasAccess && <ShoppingCart className="w-4 h-4 ml-2" />}
      {buttonText}
    </Button>
  );
}
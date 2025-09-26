import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";

export default function ProductHeader({
  product,
  category,
  productTypeIcon,
  productTypeLabel,
  onBack
}) {
  return (
    <>
      {/* Compact Back Button */}
      <div className="mb-4">
        <Button
          variant="ghost"
          onClick={onBack}
          className="text-gray-600 hover:text-gray-900 hover:bg-white/80 rounded-xl px-4 py-2 shadow-sm backdrop-blur-sm border border-white/20"
          size="sm"
        >
          <ArrowLeft className="w-4 h-4 ml-2" />
          חזור
        </Button>
      </div>

      {/* Streamlined Header - No Title/Description duplication */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <Badge className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-3 py-1.5 text-sm font-bold rounded-full shadow-md">
            <div className="flex items-center gap-1.5">
              {productTypeIcon}
              {productTypeLabel}
            </div>
          </Badge>
          {category && (
            <Badge variant="outline" className="bg-white/95 border-gray-200 font-medium px-3 py-1.5 rounded-full shadow-sm">
              {category}
            </Badge>
          )}
        </div>
      </div>
    </>
  );
}
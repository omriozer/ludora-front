import React from "react";
import { Badge } from "@/components/ui/badge";

export default function ProductImage({
  imageUrl,
  title,
  category,
  productTypeIcon,
  productTypeLabel,
  price
}) {
  if (!imageUrl) {
    return (
      <div className="h-80 lg:h-96 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl shadow-2xl flex items-center justify-center">
        <div className="text-center text-gray-400">
          <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center mx-auto mb-3">
            {productTypeIcon}
          </div>
          <p className="text-sm font-medium">אין תמונה</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="h-80 lg:h-96 overflow-hidden rounded-2xl shadow-2xl">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover hover:scale-110 transition-transform duration-700"
        />
        {/* Gradient overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/10"></div>
      </div>

      {/* Product Type Badge */}
      <div className="absolute top-4 right-4">
        <Badge className="bg-white/95 backdrop-blur-sm text-gray-800 px-3 py-2 text-sm font-bold rounded-full shadow-xl border border-white/20">
          <div className="flex items-center gap-2">
            {productTypeIcon}
            {productTypeLabel}
          </div>
        </Badge>
      </div>

      {/* Category Badge */}
      {category && (
        <div className="absolute top-4 left-4">
          <Badge variant="outline" className="bg-white/95 backdrop-blur-sm border border-white/30 font-medium px-3 py-2 rounded-full shadow-xl">
            {category}
          </Badge>
        </div>
      )}

      {/* Enhanced Price Badge */}
      <div className="absolute bottom-4 right-4">
        {price === 0 ? (
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-2xl shadow-2xl backdrop-blur-sm border border-green-400/30">
            <span className="text-base font-bold" dir="rtl">חינם!</span>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-2xl shadow-2xl backdrop-blur-sm border border-blue-400/30">
            <span className="text-base font-bold">₪{price}</span>
          </div>
        )}
      </div>
    </div>
  );
}